<?php

namespace App\Controller;

use App\Entity\Cita;
use App\Entity\Mascotas;
use App\Entity\Usuario;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Twilio\Rest\Client as TwilioClient;

class ReservasCitasController extends AbstractController
{
    private ?TwilioClient $twilioClient = null;
    private ?string $twilioWhatsAppNumber = null;
    private EntityManagerInterface $entityManager;

    // SIDs de Plantillas Twilio (Asegúrate de que coinciden con tu consola Twilio)
    private const SID_CITA_CREADA = 'HXfa336b3c7a929d7632f69c2460d52226';
    private const SID_CITA_CONFIRMADA = 'HXeac2140f2ed7c779cbb5ccb0d70e636f';

    public function __construct(EntityManagerInterface $entityManager)
    {
        $this->entityManager = $entityManager;

        // Cargar credenciales desde .env
        $sid = $_ENV['TWILIO_SID'] ?? getenv('TWILIO_SID');
        $token = $_ENV['TWILIO_AUTH_TOKEN'] ?? getenv('TWILIO_AUTH_TOKEN');
        $number = $_ENV['TWILIO_WHATSAPP_NUMBER'] ?? getenv('TWILIO_WHATSAPP_NUMBER');

        if ($sid && $token && $number) {
            $this->twilioClient = new TwilioClient($sid, $token);
            // [CORRECCIÓN CRÍTICA] Asegurar prefijo 'whatsapp:' en el número de origen
            if (!str_starts_with($number, 'whatsapp:')) {
                $number = 'whatsapp:' . $number;
            }
            $this->twilioWhatsAppNumber = $number;
        }
    }

    /**
     * Helper centralizado para enviar WhatsApp
     */
    private function triggerWhatsappNotification(Cita $cita, string $eventType): void
    {
        if (!$this->twilioClient) return;

        /** @var Usuario $adoptante */
        $adoptante = $cita->getUsuario();
        $telefonoDestino = $adoptante->getTelefono();

        // [CORRECCIÓN] Validación y Prefijo 'whatsapp:' para el destinatario
        if (empty($telefonoDestino)) return;
        
        if (!str_starts_with($telefonoDestino, 'whatsapp:')) {
            $telefonoDestino = 'whatsapp:' . $telefonoDestino;
        }

        $templateSid = '';
        $variables = [];

        switch ($eventType) {
            case 'cita_creada':
                $templateSid = self::SID_CITA_CREADA;
                // Variables: {{1}}=Usuario, {{2}}=Mascota, {{3}}=Fecha
                $variables = [
                    '1' => $adoptante->getNombre() ?? 'Cliente',
                    '2' => $cita->getMascota()->getNombre() ?? 'Mascota',
                    '3' => $cita->getFecha() ? $cita->getFecha()->format('d/m/Y') : 'fecha pendiente',
                ];
                break;

            case 'cita_confirmada':
                $templateSid = self::SID_CITA_CONFIRMADA;
                // Variables: {{1}}=Mascota, {{2}}=Fecha, {{3}}=Hora
                $variables = [
                    '1' => $cita->getMascota()->getNombre() ?? 'Mascota',
                    '2' => $cita->getFecha() ? $cita->getFecha()->format('d/m/Y') : 'fecha',
                    '3' => $cita->getHora() ? $cita->getHora()->format('H:i') : 'hora',
                ];
                break;

            default:
                return;
        }

        try {
            $this->twilioClient->messages->create(
                $telefonoDestino,
                [
                    'from' => $this->twilioWhatsAppNumber,
                    'contentSid' => $templateSid,
                    'contentVariables' => json_encode($variables)
                ]
            );
        } catch (\Exception $e) {
            // Logs en var/log/dev.log
            error_log("Twilio Error ({$eventType}): " . $e->getMessage());
        }
    }

    /**
     * Endpoint para crear una nueva cita (solicitud)
     */
    #[Route('/api/citas', name: 'api_crear_cita', methods: ['POST'])]
    #[IsGranted('IS_AUTHENTICATED_FULLY')]
    public function crear(Request $request): JsonResponse
    {
        /** @var Usuario $usuario */
        $usuario = $this->getUser();
        $data = json_decode($request->getContent(), true);

        if (!isset($data['mascotaId'], $data['fecha'], $data['hora'])) {
            return new JsonResponse(['message' => 'Faltan datos obligatorios.'], Response::HTTP_BAD_REQUEST);
        }

        $mascota = $this->entityManager->getRepository(Mascotas::class)->find($data['mascotaId']);
        if (!$mascota) {
            return new JsonResponse(['message' => 'Mascota no encontrada.'], Response::HTTP_NOT_FOUND);
        }

        // VALIDACIÓN: Verificar si el usuario ya tiene una cita activa para esta mascota
        $existingCita = $this->entityManager->getRepository(Cita::class)->createQueryBuilder('c')
            ->where('c.usuario = :usuario')
            ->andWhere('c.mascota = :mascota')
            ->andWhere('c.estado IN (:estadosActivos)')
            ->setParameter('usuario', $usuario)
            ->setParameter('mascota', $mascota)
            ->setParameter('estadosActivos', ['Pendiente', 'Confirmada'])
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();

        if ($existingCita) {
            return new JsonResponse([
                'message' => 'Ya tienes una solicitud activa para esta mascota. Debes cancelar la anterior si deseas solicitar una nueva fecha.'
            ], Response::HTTP_CONFLICT);
        }

        if ($mascota->getEstadoMascota() === 'Reservado' || $mascota->getEstadoMascota() === 'Adoptado') {
            return new JsonResponse(['message' => 'Esta mascota ya no está disponible.'], Response::HTTP_CONFLICT);
        }

        $cita = new Cita();
        $cita->setUsuario($usuario);
        $cita->setMascota($mascota);
        $cita->setEstado('Pendiente');

        $protectora = $mascota->getIdUsuario();
        if (!$protectora) {
            return new JsonResponse(['message' => 'La mascota no tiene protectora asociada.'], Response::HTTP_BAD_REQUEST);
        }
        $cita->setIdProtectora($protectora);

        try {
            $cita->setFecha(new \DateTime($data['fecha']));
            $cita->setHora(new \DateTime($data['hora']));

            $this->entityManager->persist($cita);
            $this->entityManager->flush();

            // [TWILIO] Notificar Cita Creada
            $this->triggerWhatsappNotification($cita, 'cita_creada');

        } catch (\Exception $e) {
            return new JsonResponse(['message' => 'Error al guardar la cita: ' . $e->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        return new JsonResponse(['message' => 'Cita creada con éxito', 'id' => $cita->getId()], Response::HTTP_CREATED);
    }

    /**
     * Endpoint para unirse a la COLA de espera
     */
    #[Route('/api/citas/queue', name: 'api_crear_cola_cita', methods: ['POST'])]
    #[IsGranted('IS_AUTHENTICATED_FULLY')]
    public function crearCola(Request $request): JsonResponse
    {
        /** @var Usuario $usuario */
        $usuario = $this->getUser();
        $data = json_decode($request->getContent(), true);

        if (!isset($data['mascotaId'])) {
            return new JsonResponse(['message' => 'Falta el ID de la mascota.'], Response::HTTP_BAD_REQUEST);
        }

        $mascota = $this->entityManager->getRepository(Mascotas::class)->find($data['mascotaId']);
        if (!$mascota) {
            return new JsonResponse(['message' => 'Mascota no encontrada.'], Response::HTTP_NOT_FOUND);
        }

        // Verificar si ya está en la cola
        $existingQueue = $this->entityManager->getRepository(Cita::class)->findOneBy([
            'usuario' => $usuario,
            'mascota' => $mascota,
            'estado' => 'Cola'
        ]);

        if ($existingQueue) {
            return new JsonResponse(['message' => 'Ya estás en la cola de espera para esta mascota.', 'id' => $existingQueue->getId()], Response::HTTP_CONFLICT);
        }

        $cita = new Cita();
        $cita->setUsuario($usuario);
        $cita->setMascota($mascota);
        $cita->setEstado('Cola');

        // Fecha de referencia (aunque sea cola)
        try {
            $cita->setFecha(new \DateTime());
            $cita->setHora(new \DateTime());
        } catch (\Exception $e) {}

        $protectora = $mascota->getIdUsuario();
        if (!$protectora) {
            return new JsonResponse(['message' => 'La mascota no tiene protectora asociada.'], Response::HTTP_BAD_REQUEST);
        }
        $cita->setIdProtectora($protectora);

        $queueOrder = 0;
        try {
            $this->entityManager->persist($cita);
            $this->entityManager->flush();

            // Calcular posición en la cola
            $queueOrder = $this->entityManager->getRepository(Cita::class)->count(['mascota' => $mascota, 'estado' => 'Cola']);

        } catch (\Exception $e) {
            return new JsonResponse(['message' => 'Error al unirse a la cola: ' . $e->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        return new JsonResponse([
            'message' => 'Añadido a la cola con éxito',
            'id' => $cita->getId(),
            'queueOrder' => $queueOrder
        ], Response::HTTP_CREATED);
    }

    /**
     * Listar citas del USUARIO
     */
    #[Route('/api/citas/usuario', name: 'api_listar_citas_usuario', methods: ['GET'])]
    #[IsGranted('IS_AUTHENTICATED_FULLY')]
    public function listUserAppointments(): JsonResponse
    {
        /** @var Usuario $usuario */
        $usuario = $this->getUser();
        $citas = $this->entityManager->getRepository(Cita::class)->findBy(['usuario' => $usuario], ['fecha' => 'DESC', 'hora' => 'DESC']);
        return $this->formatAppointmentsResponse($citas, 'adoptante');
    }

    /**
     * Listar citas de la PROTECTORA
     */
    #[Route('/api/citas/protectora', name: 'api_listar_citas_protectora', methods: ['GET'])]
    #[IsGranted('IS_AUTHENTICATED_FULLY')]
    public function listShelterAppointments(): JsonResponse
    {
        /** @var Usuario $usuario */
        $usuario = $this->getUser();
        $citas = $this->entityManager->getRepository(Cita::class)->findBy(['idProtectora' => $usuario], ['fecha' => 'DESC', 'hora' => 'DESC']);
        return $this->formatAppointmentsResponse($citas, 'protectora');
    }

    /**
     * Cambiar estado de cita (Confirmar, Rechazar, Cancelar)
     */
    #[Route('/api/citas/{id}/estado', name: 'api_cambiar_estado_cita', methods: ['PATCH'])]
    #[IsGranted('IS_AUTHENTICATED_FULLY')]
    public function cambiarEstado(int $id, Request $request): JsonResponse
    {
        $usuario = $this->getUser();
        $cita = $this->entityManager->getRepository(Cita::class)->find($id);

        if (!$cita) {
            return new JsonResponse(['message' => 'Cita no encontrada.'], Response::HTTP_NOT_FOUND);
        }

        // Permisos
        if ($cita->getIdProtectora() !== $usuario && $cita->getUsuario() !== $usuario) {
            return new JsonResponse(['message' => 'No tienes permiso.'], Response::HTTP_FORBIDDEN);
        }

        $data = json_decode($request->getContent(), true);
        $nuevoEstado = $data['estado'] ?? null;
        $mascota = $cita->getMascota();

        $estadoBD = match ($nuevoEstado) {
            'confirmed' => 'Confirmada',
            'rejected' => 'Rechazada',
            'removed' => 'Cancelada',
            default => null
        };

        if (!$estadoBD) {
            return new JsonResponse(['message' => 'Estado inválido.'], Response::HTTP_BAD_REQUEST);
        }

        // CASO 1: Confirmación (Twilio + Estado Mascota)
        if ($cita->getEstado() === 'Pendiente' && $nuevoEstado === 'confirmed') {
            $cita->setEstado('Confirmada');
            if ($mascota) {
                $mascota->setEstadoMascota('Reservado');
                $this->entityManager->persist($mascota);
            }
            $this->entityManager->persist($cita);
            $this->entityManager->flush();

            // [TWILIO] Notificar Confirmación
            $this->triggerWhatsappNotification($cita, 'cita_confirmada');

            return new JsonResponse(['message' => 'Cita confirmada y notificada.'], Response::HTTP_OK);
        }

        // CASO 2: Cancelación/Rechazo de una cita CONFIRMADA -> Promoción de COLA
        if ($cita->getEstado() === 'Confirmada' && in_array($nuevoEstado, ['rejected', 'removed'])) {
            $cita->setEstado($estadoBD);
            $this->entityManager->persist($cita);

            // Buscar siguiente en la cola
            $nextInQueue = $this->entityManager->getRepository(Cita::class)->createQueryBuilder('c')
                ->where('c.mascota = :mascota')
                ->andWhere('c.estado = :cola')
                ->setParameter('mascota', $mascota)
                ->setParameter('cola', 'Cola')
                ->orderBy('c.id', 'ASC') // FIFO
                ->setMaxResults(1)
                ->getQuery()
                ->getOneOrNullResult();

            $message = 'Reserva cancelada.';

            if ($nextInQueue) {
                /** @var Cita $nextInQueue */
                $nextInQueue->setEstado('Pendiente');
                $this->entityManager->persist($nextInQueue);
                // Mascota sigue 'Reservado' (por el nuevo pendiente)
                $message .= ' Adoptante de cola promovido a Pendiente.';
            } else {
                // Nadie en cola, liberar mascota
                $mascota->setEstadoMascota('Disponible');
                $message .= ' Mascota liberada.';
            }

            $this->entityManager->persist($mascota);
            $this->entityManager->flush();

            return new JsonResponse(['message' => $message, 'nuevo_estado_cita' => $estadoBD], Response::HTTP_OK);
        }

        // CASO 3: Cancelar estando en COLA
        if ($cita->getEstado() === 'Cola' && $estadoBD === 'Cancelada') {
            $this->entityManager->remove($cita);
            $this->entityManager->flush();
            return new JsonResponse(['message' => 'Solicitud de cola eliminada.'], Response::HTTP_OK);
        }

        // CASO 4: Otros cambios simples (incluye cancelar una Pendiente)
        $cita->setEstado($estadoBD);
        $this->entityManager->flush();

        return new JsonResponse(['message' => 'Estado actualizado.', 'nuevo_estado_cita' => $estadoBD], Response::HTTP_OK);
    }

    /**
     * Endpoint para ELIMINAR una cita
     */
    #[Route('/api/citas/{id}', name: 'api_borrar_cita', methods: ['DELETE'])]
    #[IsGranted('IS_AUTHENTICATED_FULLY')]
    public function borrar(int $id): JsonResponse
    {
        $usuario = $this->getUser();
        $cita = $this->entityManager->getRepository(Cita::class)->find($id);

        if (!$cita) {
            return new JsonResponse(['message' => 'Cita no encontrada.'], Response::HTTP_NOT_FOUND);
        }

        if ($cita->getUsuario() !== $usuario && $cita->getIdProtectora() !== $usuario) {
            return new JsonResponse(['message' => 'No tienes permiso para eliminar esta cita.'], Response::HTTP_FORBIDDEN);
        }

        $mascota = $cita->getMascota();
        $message = 'Cita eliminada correctamente.';

        // Lógica de promoción al borrar una confirmada
        if ($cita->getEstado() === 'Confirmada' && $mascota) {
            $nextInQueue = $this->entityManager->getRepository(Cita::class)->createQueryBuilder('c')
                ->where('c.mascota = :mascota')
                ->andWhere('c.estado = :cola')
                ->setParameter('mascota', $mascota)
                ->setParameter('cola', 'Cola')
                ->orderBy('c.id', 'ASC')
                ->setMaxResults(1)
                ->getQuery()
                ->getOneOrNullResult();

            if ($nextInQueue) {
                /** @var Cita $nextInQueue */
                $nextInQueue->setEstado('Pendiente');
                $this->entityManager->persist($nextInQueue);
                $message = 'Reserva eliminada. Adoptante en cola promovido.';
            } else {
                $mascota->setEstadoMascota('Disponible');
                $this->entityManager->persist($mascota);
                $message = 'Reserva eliminada. Mascota liberada.';
            }
        }

        try {
            $this->entityManager->remove($cita);
            $this->entityManager->flush();
        } catch (\Exception $e) {
            return new JsonResponse(['message' => 'Error al eliminar: ' . $e->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        return new JsonResponse(['message' => $message], Response::HTTP_OK);
    }

    /**
     * Helper para formatear respuesta JSON
     */
    private function formatAppointmentsResponse(array $citas, string $modo): JsonResponse
    {
        $data = [];
        foreach ($citas as $cita) {
            /** @var Mascotas $mascota */
            $mascota = $cita->getMascota();
            $protectora = $cita->getIdProtectora();
            $adoptante = $cita->getUsuario();

            $estadoBD = $cita->getEstado();
            $statusKey = match(strtolower($estadoBD)) {
                'confirmada', 'confirmed' => 'confirmed',
                'rechazada', 'rejected' => 'rejected',
                'cancelada', 'cancelled' => 'cancelled',
                'cola' => 'queue',
                default => 'pending'
            };

            $fechaHora = ($cita->getFecha() && $cita->getHora())
                ? $cita->getFecha()->format('Y-m-d') . 'T' . $cita->getHora()->format('H:i:s')
                : null;

            // Calcular orden en cola si aplica
            $queueOrder = null;
            if ($statusKey === 'queue' && $mascota) {
                $queueCitas = $this->entityManager->getRepository(Cita::class)->createQueryBuilder('c')
                    ->where('c.mascota = :mascota')
                    ->andWhere('c.estado = :cola')
                    ->setParameter('mascota', $mascota)
                    ->setParameter('cola', 'Cola')
                    ->orderBy('c.id', 'ASC')
                    ->getQuery()
                    ->getResult();

                foreach ($queueCitas as $index => $queueCita) {
                    if ($queueCita->getId() === $cita->getId()) {
                        $queueOrder = $index + 1;
                        break;
                    }
                }
            }

            $item = [
                'id' => $cita->getId(),
                'mascotaId' => $mascota ? $mascota->getId() : null,
                'fecha_hora' => $fechaHora,
                'estado' => $statusKey,
                'lugar_cita' => $protectora ? $protectora->getDireccion() : 'Sin dirección',
                'mascota' => [
                    'id' => $mascota ? $mascota->getId() : null,
                    'nombre' => $mascota ? $mascota->getNombre() : 'Desconocido',
                    'imagen' => $mascota && !empty($mascota->getImagenes()) ? $mascota->getImagenes()[0] : null
                ],
                'protectora' => [
                    'nombre' => $protectora ? $protectora->getNombre() : 'Desconocida',
                ],
                'queueOrder' => $queueOrder
            ];

            if ($modo === 'protectora') {
                $item['adoptante'] = [
                    'nombre' => $adoptante ? $adoptante->getNombre() . ' ' . $adoptante->getApellido() : 'Usuario Eliminado',
                    'email' => $adoptante ? $adoptante->getEmail() : '',
                    'telefono' => $adoptante ? $adoptante->getTelefono() : ''
                ];
            }

            $data[] = $item;
        }

        return new JsonResponse($data, Response::HTTP_OK);
    }
}