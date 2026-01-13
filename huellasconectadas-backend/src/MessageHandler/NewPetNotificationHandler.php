<?php

namespace App\MessageHandler;

use App\Message\NewPetNotification;
use App\Repository\MascotasRepository;
use App\Repository\UsuarioRepository;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;
use Symfony\Component\Mime\Email;
use Twig\Environment; 
use App\Entity\Usuario;
use App\Entity\Mascotas;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Este Handler se ejecuta ahora síncronamente (al instante)
 * pero mantiene la lógica de envío masivo.
 */
#[AsMessageHandler]
final class NewPetNotificationHandler
{
    private $mascotasRepository;
    private $usuarioRepository;
    private $mailer;
    private $twig;
    private $projectDir;

    public function __construct(
        MascotasRepository $mascotasRepository,
        UsuarioRepository $usuarioRepository,
        MailerInterface $mailer,
        Environment $twig,
        // Inyectamos la ruta de la carpeta del proyecto para buscar las imágenes
        #[Autowire('%kernel.project_dir%')] string $projectDir
    ) {
        $this->mascotasRepository = $mascotasRepository;
        $this->usuarioRepository = $usuarioRepository;
        $this->mailer = $mailer;
        $this->twig = $twig;
        $this->projectDir = $projectDir;
    }

    public function __invoke(NewPetNotification $message)
    {
        // 1. Obtener la Mascota
        $mascota = $this->mascotasRepository->find($message->getMascotaId());
        
        if (!$mascota) {
            error_log("Messenger Error: Mascota con ID " . $message->getMascotaId() . " no encontrada.");
            return;
        }

        // --- LÓGICA DE IMAGEN ADJUNTA ---
        $localImagePath = null;
        $imagenes = $mascota->getImagenes();
        $imageFilename = null;

        // Detectar si imágenes es array o JSON string y obtener la primera
        if (is_array($imagenes) && count($imagenes) > 0) {
            $imageFilename = basename($imagenes[0]);
        } elseif (is_string($imagenes)) {
             $decoded = json_decode($imagenes, true);
             if ($decoded && count($decoded) > 0) {
                 $imageFilename = basename($decoded[0]);
             }
        }

        // Construir ruta local si tenemos nombre de archivo
        if ($imageFilename) {
            // Asumimos que se guardan en /public/uploads/
            $potentialPath = $this->projectDir . '/public/uploads/' . $imageFilename;
            if (file_exists($potentialPath)) {
                $localImagePath = $potentialPath;
            }
        }
        // -------------------------------

        // 2. Obtener usuarios
        $allUsers = $this->usuarioRepository->findAll();
        $fromEmail = 'xavigutierrez5@gmail.com'; 
        $petLink = 'http://localhost:8000/mascotas/' . $mascota->getId();

        foreach ($allUsers as $user) {
            /** @var Usuario $user */
            
            // Filtros de usuario
            if (!$user->getEmail() || 
                $user->getId() === $mascota->getIdUsuario()->getId() || 
                !in_array('ROLE_USER', $user->getRoles()) 
            ) {
                continue;
            }

            // 3. Renderizar plantilla
            // Pasamos 'cid_image' solo si hemos encontrado la imagen local
            try {
                $htmlBody = $this->twig->render('emails/nueva_mascota.html.twig', [
                    'mascota' => $mascota,
                    'usuario' => $user,
                    'petLink' => $petLink,
                    'cid_image' => $localImagePath ? 'pet_photo_cid' : null 
                ]);
            } catch (\Exception $e) {
                error_log("Error render: " . $e->getMessage());
                continue; 
            }

            // 4. Crear correo
            $email = (new Email())
                ->from($fromEmail)
                ->to($user->getEmail())
                ->subject('🐶 ¡Nueva Mascota en Adopción: ' . $mascota->getNombre() . '!')
                ->html($htmlBody);

            // 5. INCRUSTAR IMAGEN (Si existe)
            if ($localImagePath) {
                // Esto adjunta la imagen y permite usarla con cid:pet_photo_cid
                $email->embedFromPath($localImagePath, 'pet_photo_cid');
            }

            // Enviar
            try {
                $this->mailer->send($email);
            } catch (\Exception $e) {
                error_log('Error enviando email a ' . $user->getEmail() . ': ' . $e->getMessage());
            }
        }
    }
}