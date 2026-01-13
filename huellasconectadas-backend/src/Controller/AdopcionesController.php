<?php

namespace App\Controller;

use App\Entity\Adopciones;
use App\Repository\AdopcionesRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use App\Repository\UsuarioRepository;
use Symfony\Component\HttpFoundation\JsonResponse;
use App\Entity\Usuario;
use App\Repository\MascotasRepository;
use App\Entity\Mascotas;
use Symfony\Component\String\Slugger\SluggerInterface;
use Symfony\Component\HttpFoundation\File\Exception\FileException;

#[Route('/api/adopciones')]
// ELIMINADO: #[IsGranted('ROLE_PROTECTORA')] a nivel de clase para permitir acceso a usuarios
final class AdopcionesController extends AbstractController
{
    // --- 1. ENDPOINTS DE LECTURA (DISPONIBLES SEGÚN ROL) ---

    // Admin o Debug: Ver todas
    #[Route('', name: 'app_adopciones_index', methods: ['GET'])]
    public function index(AdopcionesRepository $adopcionesRepository): JsonResponse
    {
        return $this->json(
            $adopcionesRepository->findAll(),
            200,
            [],
            ['groups' => 'adopciones:read']
        );
    }

    // LISTA PARA EL ADOPTANTE
    #[Route('/adoptante', name: 'app_adopciones_user_list', methods: ['GET'])]
    public function getAdoptionsForUser(AdopcionesRepository $adopcionesRepository): JsonResponse
    {
        $user = $this->getUser();
        
        if (!$user) {
            return $this->json(['message' => 'Acceso denegado'], 403);
        }

        // Busca adopciones donde el usuario actual es el 'idUsuario' (el adoptante)
        $adopciones = $adopcionesRepository->findBy(['idUsuario' => $user], ['fechaAdopcion' => 'DESC']);

        return $this->json($adopciones, 200, [], ['groups' => 'adopciones:read']);
    }

    // LISTA PARA LA PROTECTORA
    #[Route('/protectora', name: 'app_adopciones_protectora_list', methods: ['GET'])]
    #[IsGranted('ROLE_PROTECTORA')]
    public function getAdoptionsForShelter(AdopcionesRepository $adopcionesRepository): JsonResponse 
    {
        /** @var Usuario|null $shelter */
        $shelter = $this->getUser(); 
        
        if (!$shelter) {
            return $this->json(['message' => 'Usuario no encontrado'], 404);
        }

        try {
            // Consulta optimizada: Adopciones -> Mascota -> Usuario (Dueño original/Protectora)
           $qb = $adopcionesRepository->createQueryBuilder('a')
                ->innerJoin('a.idMascota', 'm') 
                // CORRECCIÓN: Usamos 'id_usuario' (snake_case) que parece ser el nombre real de la propiedad
                ->where('m.id_usuario = :shelter') 
                ->setParameter('shelter', $shelter)
                ->orderBy('a.fechaAdopcion', 'DESC');

            $adopciones = $qb->getQuery()->getResult();
            
            return $this->json($adopciones, 200, [], ['groups' => 'adopciones:read']);
            
        } catch (\Exception $e) {
            return $this->json([
                'success' => false, 
                'message' => 'Error al obtener adopciones: ' . $e->getMessage()
            ], 500);
        }
    }

    // --- 2. DATOS AUXILIARES (SOLO PROTECTORA) ---

    #[Route('/perfil-contrato', name: 'app_adopciones_shelter_profile', methods: ['GET'])]
    #[IsGranted('ROLE_PROTECTORA')]
    public function getShelterContractDetails(): JsonResponse
    {
        /** @var Usuario $shelter */
        $shelter = $this->getUser();

        return $this->json([
            'nombre' => $shelter->getNombre(),
            'direccion' => $shelter->getDireccion() ?? 'Dirección no registrada',
            'telefono' => $shelter->getTelefono() ?? 'Teléfono no registrado',
            'email' => $shelter->getEmail()
        ]);
    }

    #[Route('/listas/mascotas', name: 'app_adopciones_listas_mascotas', methods: ['GET'])]
    #[IsGranted('ROLE_PROTECTORA')]
    public function getMascotasList(MascotasRepository $mascotasRepository): JsonResponse
    {
        /** @var Usuario $shelter */
        $shelter = $this->getUser();
        
        // CORRECCIÓN: Revertimos a 'id_usuario' para coincidir con la entidad
        $mascotas = $mascotasRepository->findBy([
            'id_usuario' => $shelter, 
            'estadoMascota' => ['Reservado']
        ]);

        $data = [];
        foreach ($mascotas as $mascota) {
            $edadTexto = $mascota->getEdad() ? $mascota->getEdad() . " años/meses" : 'Edad desconocida';

            $data[] = [
                'id' => $mascota->getId(),
                'nombre' => $mascota->getNombre(),
                'especie' => $mascota->getEspecie() ?? 'No especificada',
                'edad' => $edadTexto,
                'raza' => $mascota->getRaza() ?? 'Mestizo'
            ];
        }
        return $this->json($data);
    }

    #[Route('/listas/adoptantes', name: 'app_adopciones_listas_adoptantes', methods: ['GET'])]
    #[IsGranted('ROLE_PROTECTORA')]
    public function getAdoptantesList(UsuarioRepository $usuarioRepository): JsonResponse
    {
        $allUsers = $usuarioRepository->findAll();
        $adoptantes = [];
        
        foreach ($allUsers as $user) {
            $roles = $user->getRoles();
            $esStaff = in_array('ROLE_PROTECTORA', $roles) || in_array('ROLE_ADMIN', $roles);
            
            if (!$esStaff) {
                $adoptantes[] = [
                    'id' => $user->getId(),
                    'nombre' => $user->getNombre() . ' ' . $user->getApellido(), 
                    'dni' => $user->getIdentificacion() ?? 'Sin DNI',
                    'telefono' => $user->getTelefono() ?? 'No registrado',
                    'direccion' => $user->getDireccion() ?? 'No registrada',
                    'email' => $user->getEmail()
                ];
            }
        }
        return $this->json(array_values($adoptantes));
    }

    // --- 3. CREACIÓN Y ELIMINACIÓN (SOLO PROTECTORA) ---

    #[Route('', name: 'app_adopciones_new', methods: ['POST'])]
    #[IsGranted('ROLE_PROTECTORA')]
    public function new(
        Request $request,
        EntityManagerInterface $entityManager,
        UsuarioRepository $usuarioRepository,
        MascotasRepository $mascotasRepository,
        SluggerInterface $slugger
    ): JsonResponse {
        /** @var Usuario|null $user */
        $user = $this->getUser(); 
        
        if (!$user) {
            return $this->json(['success' => false, 'message' => 'Usuario no autenticado'], 401);
        }

        $idUsuario = $request->request->get('idUsuario');
        $idMascota = $request->request->get('idMascota');
        $fechaAdopcionStr = $request->request->get('fechaAdopcion');
        $estadoAdopcion = $request->request->get('estadoAdopcion') ?? 'Adoptada';
        $uploadedFile = $request->files->get('contrato'); 

        if (!$idUsuario || !$idMascota || !$fechaAdopcionStr) {
             return $this->json(['success' => false, 'message' => 'Faltan datos obligatorios.'], 400);
        }

        $usuarioAdoptante = $usuarioRepository->find($idUsuario);
        if (!$usuarioAdoptante) return $this->json(['success' => false, 'message' => 'Usuario adoptante no encontrado.'], 404);

        $mascota = $mascotasRepository->find($idMascota);
        if (!$mascota) return $this->json(['success' => false, 'message' => 'Mascota no encontrada.'], 404);

        // CORRECCIÓN: Usamos el getter estándar. Si la propiedad es id_usuario, el getter suele ser getIdUsuario() de todas formas.
        $duenoMascota = $mascota->getIdUsuario(); 

        // Verificamos: 1. Que exista el dueño, 2. Que el dueño seas tú
        if (!$duenoMascota || $duenoMascota->getId() !== $user->getId()) {
            return $this->json(['success' => false, 'message' => 'No tienes permiso para gestionar esta mascota o no te pertenece.'], 403);
        }
        
        if ($mascota->getEstadoMascota() === 'Adoptado') {
            return $this->json(['success' => false, 'message' => 'Esta mascota ya figura como adoptada.'], 400);
        }
        
        $adopcion = new Adopciones();
        $adopcion->setIdUsuario($usuarioAdoptante);
        $adopcion->setIdMascota($mascota);
        $adopcion->setEstadoAdopcion($estadoAdopcion);

        try {
            $adopcion->setFechaAdopcion(new \DateTime($fechaAdopcionStr));
        } catch (\Exception $e) {
            return $this->json(['success' => false, 'message' => 'Formato de fecha inválido.'], 400);
        }

        if ($uploadedFile) {
            $originalFilename = pathinfo($uploadedFile->getClientOriginalName(), PATHINFO_FILENAME);
            $safeFilename = $slugger->slug($originalFilename);
            $newFilename = $safeFilename.'-'.uniqid().'.'.$uploadedFile->guessExtension();

            try {
                $destination = $this->getParameter('kernel.project_dir').'/public/uploads/contratos';
                $uploadedFile->move($destination, $newFilename);
                $adopcion->setContrato($newFilename);
            } catch (FileException $e) {
                return $this->json(['success' => false, 'message' => 'Error al guardar contrato.'], 500);
            }
        }

        try {
            $mascota->setEstadoMascota('Adoptado');
            $entityManager->persist($mascota);
            $entityManager->persist($adopcion);
            $entityManager->flush();
        } catch (\Exception $e) {
            return $this->json(['success' => false, 'message' => 'Error BD: ' . $e->getMessage()], 500);
        }

        return $this->json([
            'success' => true,
            'message' => 'Adopción registrada con éxito.',
            'data' => $adopcion
        ], 201, [], ['groups' => 'adopciones:read']);
    }

    #[Route('/{id}', name: 'app_adopciones_delete', methods: ['DELETE'])]
    #[IsGranted('ROLE_PROTECTORA')]
    public function delete(Adopciones $adopcion, EntityManagerInterface $entityManager): JsonResponse
    {
        /** @var Usuario|null $shelter */
        $shelter = $this->getUser();

        if (!$shelter) {
            return $this->json(['success' => false, 'message' => 'Usuario no autenticado'], 401);
        }

        $mascota = $adopcion->getIdMascota();

        if (!$mascota || !$mascota->getIdUsuario() || $mascota->getIdUsuario()->getId() !== $shelter->getId()) {
             return $this->json(['success' => false, 'message' => 'No tienes permiso para eliminar esta adopción.'], 403);
        }

        $mascota->setEstadoMascota('Disponible'); 
        $entityManager->persist($mascota);

        $entityManager->remove($adopcion);
        $entityManager->flush();

        return $this->json(['success' => true, 'message' => 'Adopción eliminada.']);
    }
}