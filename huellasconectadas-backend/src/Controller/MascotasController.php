<?php

namespace App\Controller;

use App\Entity\Mascotas;
use App\Repository\MascotasRepository;
use Doctrine\ORM\EntityManagerInterface; 
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request; 
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted; 
use App\Entity\Usuario;
use App\Message\NewPetNotification;
use Symfony\Component\Messenger\MessageBusInterface; 
use Symfony\Component\HttpFoundation\File\Exception\FileException;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use App\Entity\Cita; // Importamos la entidad Cita

class MascotasController extends AbstractController
{
    // Ruta para obtener el listado de mascotas
    #[Route('/mascotas', name: 'mascotas', methods: ['GET'])]
    public function listMascotas(MascotasRepository $mascotasRepository): JsonResponse
    {
        $mascotas = $mascotasRepository->createQueryBuilder('m')
            ->where('m.especie = :perro')
            ->orWhere('m.especie = :gato')
            ->setParameter('perro', 'Perro') 
            ->setParameter('gato', 'Gato')   
            ->getQuery()
            ->getResult();

        $data = [];
        foreach ($mascotas as $mascota) {
            $item = $mascota->jsonSerialize();
            // [CORRECCIÓN CRÍTICA] Aseguramos que el estado se envía al frontend
            $item['estadoMascota'] = $mascota->getEstadoMascota() ?? 'Disponible';
            $data[] = $item;
        }

        return new JsonResponse($data);
    }
    
    // RUTA PARA AÑADIR UNA NUEVA MASCOTA
    #[Route('/api/add', name: 'add_mascota', methods: ['POST'])]
    #[IsGranted('ROLE_PROTECTORA')]
    public function addMascota(
        Request $request, 
        EntityManagerInterface $entityManager,
        MessageBusInterface $messageBus 
    ): JsonResponse
    {
        /** @var Usuario $protectora */
        $protectora = $this->getUser();

        if (!$protectora || !in_array('ROLE_PROTECTORA', $protectora->getRoles())) {
            return new JsonResponse(['message' => 'Acceso denegado.'], Response::HTTP_FORBIDDEN);
        }
        
        $nombre = $request->request->get('nombre');
        $especie = $request->request->get('especie');
        $raza = $request->request->get('raza');
        $edad = $request->request->get('edad');

        if (!$nombre || !$especie || !$raza || $edad === null) {
            return new JsonResponse(['message' => 'Faltan datos obligatorios.'], Response::HTTP_BAD_REQUEST);
        }

        $mascota = new Mascotas();
        $mascota->setIdUsuario($protectora); 
        $mascota->setNombre($nombre);
        $mascota->setEspecie($especie);
        $mascota->setRaza($raza);
        $mascota->setEdad((int)$edad);
        $mascota->setDescripcion($request->request->get('descripcion'));
        $mascota->setTamano($request->request->get('tamano') ?? 'Mediano');
        $mascota->setEstadoMascota($request->request->get('estadoMascota') ?? 'Disponible'); 
        $mascota->setTemperamento($request->request->get('temperamento'));

        /** @var UploadedFile $imagenFile */
        $imagenFile = $request->files->get('imagen');
        $imagenesPaths = [];

        if ($imagenFile) {
            $destination = $this->getParameter('kernel.project_dir').'/public/uploads';
            $extension = $imagenFile->getClientOriginalExtension() ?: 'bin';
            $newFilename = uniqid() . '.' . $extension;

            try {
                $imagenFile->move($destination, $newFilename);
                $imagenesPaths[] = 'http://localhost:8000/uploads/' . $newFilename; 
            } catch (FileException $e) {
                return new JsonResponse(['message' => 'Error al subir la imagen.'], Response::HTTP_INTERNAL_SERVER_ERROR);
            }
        }
        
        $mascota->setImagenes($imagenesPaths);

        try {
            $entityManager->persist($mascota);
            $entityManager->flush();
            
            $notificationMessage = new NewPetNotification($mascota->getId(), $protectora->getId());
            $messageBus->dispatch($notificationMessage);

        } catch (\Exception $e) {
            return new JsonResponse(['message' => 'Error al guardar: ' . $e->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        return new JsonResponse(['message' => 'Mascota registrada correctamente.', 'id' => $mascota->getId()], Response::HTTP_CREATED);
    }
    
    #[Route('/api/mascotas/{id}', name: 'get_mascota_details', methods: ['GET'])] 
    public function getMascotaDetails(Mascotas $mascota): JsonResponse
    {
        $data = $mascota->jsonSerialize();
        
        // [CORRECCIÓN CRÍTICA] Forzamos la inclusión del estado
        $data['estadoMascota'] = $mascota->getEstadoMascota() ?? 'Disponible';
        
        /** @var Usuario $protectora */
        $protectora = $mascota->getIdUsuario();

        if ($protectora) {
            $data['protectora'] = [
                'id' => $protectora->getId(),
                'nombre' => $protectora->getNombre(), 
                'email' => $protectora->getEmail(),
                'direccion' => $protectora->getDireccion(),
                'telefono' => $protectora->getTelefono(),
                'descripcion_protectora' => $protectora->getDescripcionProtectora(),
            ];
        }

        return new JsonResponse($data);
    }
    
    /**
     * [NUEVO ENDPOINT] Obtener citas y colas para una mascota específica.
     */
    #[Route('/api/mascotas/{id}/citas', name: 'get_mascota_appointments', methods: ['GET'])]
    #[IsGranted('ROLE_PROTECTORA')]
    public function getMascotaAppointments(Mascotas $mascota, EntityManagerInterface $entityManager): JsonResponse
    {
        /** @var Usuario $protectora */
        $protectora = $this->getUser();

        // Verificar si la protectora es dueña de la mascota
        if ($mascota->getIdUsuario()->getId() !== $protectora->getId()) {
            return new JsonResponse(['message' => 'No tienes permiso para ver estas solicitudes.'], Response::HTTP_FORBIDDEN);
        }

        // Obtener todas las citas activas (Pendientes, Confirmadas, Cola) para esta mascota
        $citas = $entityManager->getRepository(Cita::class)->createQueryBuilder('c')
            ->where('c.mascota = :mascota')
            ->andWhere('c.estado IN (:estadosActivos)')
            ->setParameter('mascota', $mascota)
            ->setParameter('estadosActivos', ['Pendiente', 'Confirmada', 'Cola'])
            ->orderBy('c.estado', 'DESC') // Prioriza confirmada > pendiente > cola
            ->addOrderBy('c.fecha', 'ASC')
            ->addOrderBy('c.id', 'ASC')
            ->getQuery()
            ->getResult();
            
        $data = [];
        foreach ($citas as $cita) {
             /** @var Cita $cita */
            $adoptante = $cita->getUsuario();
            $estadoBD = $cita->getEstado();
            
            // Lógica de mapeo de estado a clave de frontend
            $statusKey = match(strtolower($estadoBD)) {
                'confirmada' => 'confirmed',
                'cola' => 'queue',
                default => 'pending' // Incluye 'Pendiente'
            };

            // Cálculo del orden de cola (solo si es estado 'Cola')
            $queueOrder = null;
            if ($statusKey === 'queue') {
                $queueCitas = $entityManager->getRepository(Cita::class)->createQueryBuilder('c')
                    ->select('c.id')
                    ->where('c.mascota = :mascota')
                    ->andWhere('c.estado = :cola')
                    ->setParameter('mascota', $mascota)
                    ->setParameter('cola', 'Cola')
                    ->orderBy('c.id', 'ASC')
                    ->getQuery()
                    ->getArrayResult();
                
                // Encontrar la posición del ID de la cita actual
                foreach ($queueCitas as $index => $queueCita) {
                    if ($queueCita['id'] === $cita->getId()) {
                        $queueOrder = $index + 1;
                        break;
                    }
                }
            }

            $item = [
                'id' => $cita->getId(),
                'estado' => $statusKey,
                'queueOrder' => $queueOrder,
                'fecha_hora' => ($cita->getFecha() && $cita->getHora()) ? $cita->getFecha()->format('Y-m-d') . 'T' . $cita->getHora()->format('H:i:s') : null,
                'adoptante' => [
                    'nombre' => $adoptante ? $adoptante->getNombre() . ' ' . $adoptante->getApellido() : 'Usuario Eliminado',
                    'email' => $adoptante ? $adoptante->getEmail() : '',
                    'telefono' => $adoptante ? $adoptante->getTelefono() : ''
                ],
            ];
            $data[] = $item;
        }

        return new JsonResponse($data, Response::HTTP_OK);
    }
    
    #[Route('/api/mascotas/{id}', name: 'edit_mascota', methods: ['POST', 'PUT', 'PATCH'])]
    #[IsGranted('ROLE_PROTECTORA')]
    public function editMascota(Mascotas $mascota, Request $request, EntityManagerInterface $entityManager): JsonResponse
    {
        /** @var Usuario $protectora */
        $protectora = $this->getUser();
        
        if (!$protectora || $mascota->getIdUsuario()->getId() !== $protectora->getId()) {
            return new JsonResponse(['message' => 'No tienes permiso para editar esta mascota.'], Response::HTTP_FORBIDDEN);
        }

        $nombre = $request->request->get('nombre');
        if ($nombre) $mascota->setNombre($nombre);

        $especie = $request->request->get('especie');
        if ($especie) $mascota->setEspecie($especie);

        $raza = $request->request->get('raza');
        if ($raza) $mascota->setRaza($raza);

        $edad = $request->request->get('edad');
        if ($edad !== null) $mascota->setEdad((int)$edad);

        $descripcion = $request->request->get('descripcion');
        if ($descripcion) $mascota->setDescripcion($descripcion);

        $tamano = $request->request->get('tamano');
        if ($tamano) $mascota->setTamano($tamano);

        // [IMPORTANTE] Actualización del estado
        $estado = $request->request->get('estadoMascota');
        if ($estado) $mascota->setEstadoMascota($estado);

        $temperamento = $request->request->get('temperamento');
        if ($temperamento) $mascota->setTemperamento($temperamento);

        /** @var UploadedFile $imagenFile */
        $imagenFile = $request->files->get('imagen');
        
        if ($imagenFile) {
            $destination = $this->getParameter('kernel.project_dir').'/public/uploads';
            $extension = $imagenFile->getClientOriginalExtension() ?: 'bin';
            $newFilename = uniqid() . '.' . $extension;

            try {
                $imagenFile->move($destination, $newFilename);
                $mascota->setImagenes(['http://localhost:8000/uploads/' . $newFilename]);
            } catch (FileException $e) {
                return new JsonResponse(['message' => 'Error al subir la nueva imagen.'], Response::HTTP_INTERNAL_SERVER_ERROR);
            }
        }

        try {
            $entityManager->flush();
        } catch (\Exception $e) {
            return new JsonResponse(['message' => 'Error al guardar la edición: ' . $e->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        return new JsonResponse(['message' => 'Mascota actualizada con éxito', 'id' => $mascota->getId()], Response::HTTP_OK);
    }
    
    #[Route('/api/mascotas/{id}', name: 'delete_mascota', methods: ['DELETE'])]
    #[IsGranted('ROLE_PROTECTORA')]
    public function deleteMascota(Mascotas $mascota, EntityManagerInterface $entityManager): JsonResponse
    {
        /** @var Usuario $protectora */
        $protectora = $this->getUser();

        if (!$protectora || $mascota->getIdUsuario()->getId() !== $protectora->getId()) {
            return new JsonResponse(['message' => 'No tienes permiso para eliminar esta mascota.'], Response::HTTP_FORBIDDEN);
        }

        try {
            $entityManager->remove($mascota);
            $entityManager->flush();
        } catch (\Exception $e) {
            return new JsonResponse(['message' => 'Error al eliminar la mascota: ' . $e->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        return new JsonResponse(['message' => 'Mascota eliminada con éxito', 'id' => $mascota->getId()], Response::HTTP_OK);
    }
}