<?php

namespace App\Command;

use App\Entity\Cita;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Twilio\Rest\Client as TwilioClient;

#[AsCommand(
    name: 'app:send-reminders',
    description: 'Envía recordatorios de WhatsApp para citas de mañana.',
)]
class SendRemindersCommand extends Command
{
    private EntityManagerInterface $entityManager;
    private ?TwilioClient $twilioClient = null;
    private ?string $twilioWhatsAppNumber = null;

    // SID para la plantilla 'cita_recordatorio'
    private const TEMPLATE_SID_RECORDATORIO = 'HX6b760fcecf4533aac217a3b318e27718'; 

    public function __construct(EntityManagerInterface $entityManager)
    {
        parent::__construct();
        $this->entityManager = $entityManager;
        
        // Cargar credenciales desde .env
        $sid = $_ENV['TWILIO_SID'] ?? getenv('TWILIO_SID');
        $token = $_ENV['TWILIO_AUTH_TOKEN'] ?? getenv('TWILIO_AUTH_TOKEN');
        $number = $_ENV['TWILIO_WHATSAPP_NUMBER'] ?? getenv('TWILIO_WHATSAPP_NUMBER');

        if ($sid && $token && $number) {
            $this->twilioClient = new TwilioClient($sid, $token);
            $this->twilioWhatsAppNumber = $number;
        }
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        if (!$this->twilioClient) {
            $output->writeln('Error: Credenciales Twilio no configuradas en .env');
            return Command::FAILURE;
        }

        $output->writeln('Buscando citas confirmadas para mañana...');

        // 1. Calcular la fecha de mañana
        $manana = new \DateTime();
        $manana->modify('+1 day');
        $fechaString = $manana->format('Y-m-d'); 

        // 2. Buscar citas en BD que sean para mañana y estén Confirmadas
        $citas = $this->entityManager->getRepository(Cita::class)->createQueryBuilder('c')
            ->where('c.estado = :estado')
            ->andWhere('c.fecha = :fecha')
            ->setParameter('estado', 'Confirmada')
            ->setParameter('fecha', $fechaString)
            ->getQuery()
            ->getResult();

        $count = count($citas);
        $output->writeln("Se encontraron {$count} citas para recordar.");

        foreach ($citas as $cita) {
            $this->enviarRecordatorio($cita, $output);
        }

        return Command::SUCCESS;
    }

    private function enviarRecordatorio(Cita $cita, OutputInterface $output): void
    {
        $usuario = $cita->getUsuario();
        $telefono = $usuario->getTelefono();
        
        // Validación básica
        if (empty($telefono)) {
            $output->writeln("Saltando usuario {$usuario->getId()}: Sin teléfono.");
            return;
        }

        // [CORRECCIÓN CRÍTICA] Asegurar prefijo 'whatsapp:'
        // Si el número es "+34666..." Twilio piensa que es SMS. Debe ser "whatsapp:+34666..."
        if (!str_starts_with($telefono, 'whatsapp:')) {
            $telefono = 'whatsapp:' . $telefono;
        }

        try {
            // Estructura simplificada para Twilio Content API (Soluciona el Error 400)
            // Variables de la plantilla: {{1}} Nombre Mascota, {{2}} Hora
            $variables = [
                '1' => $cita->getMascota()->getNombre(),
                '2' => $cita->getHora()->format('H:i')
            ];

            $this->twilioClient->messages->create(
                $telefono,
                [
                    'from' => $this->twilioWhatsAppNumber,
                    'contentSid' => self::TEMPLATE_SID_RECORDATORIO,
                    'contentVariables' => json_encode($variables)
                ]
            );
            $output->writeln("Recordatorio enviado a {$usuario->getEmail()}");
            
        } catch (\Exception $e) {
            $output->writeln("Error enviando a {$usuario->getEmail()}: " . $e->getMessage());
        }
    }
}