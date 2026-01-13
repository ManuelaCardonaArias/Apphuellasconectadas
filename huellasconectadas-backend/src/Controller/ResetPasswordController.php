<?php

namespace App\Controller;

use App\Repository\UsuarioRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;
// Importación necesaria para hashear la nueva contraseña
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class ResetPasswordController extends AbstractController
{
    #[Route('/api/reset-password-request', name: 'api_reset_password_request', methods: ['POST'])]
    public function request(
        Request $request, 
        UsuarioRepository $userRepository, 
        EntityManagerInterface $entityManager,
        MailerInterface $mailer 
    ): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $email = $data['email'] ?? '';

        if (empty($email)) {
            return $this->json(['message' => 'El email es obligatorio'], 400);
        }

        $user = $userRepository->findOneBy(['email' => $email]);

        // Por seguridad, no decimos si el usuario existe o no, pero procesamos si existe.
        if ($user) {
            // 1. Generar token único
            $resetToken = bin2hex(random_bytes(32));
            
            // 2. Guardar token y expiración (ej. 1 hora) en el usuario
            $user->setResetToken($resetToken);
            $user->setResetTokenExpiresAt(new \DateTime('+1 hour'));
            
            $entityManager->flush();

            // 3. Enviar Email (Ejemplo básico)
            // En un entorno real, descomenta y configura el Mailer
            
            $emailMessage = (new Email())
                ->from('huellasconectadases@gmail.com')
                ->to($user->getEmail())
                ->subject('Recuperación de contraseña')
                ->html('<p>Haz clic aquí para resetear tu password: <a href="http://localhost:5173/reset-password/'.$resetToken.'">Recuperar</a></p>');

            $mailer->send($emailMessage);
            
            
            // PARA DESARROLLO SOLAMENTE: Devolvemos el token para que puedas probar sin enviar emails reales
            // Elimina la línea 'debug_token' en producción
            return $this->json([
                'message' => 'Si el correo existe, se han enviado las instrucciones.',
                'debug_token' => $resetToken 
            ]);
        }

        // Retornamos éxito falso para despistar a posibles atacantes (timing attacks aparte)
        return $this->json(['message' => 'Si el correo existe, se han enviado las instrucciones.']);
    }

    #[Route('/api/reset-password/{token}', name: 'api_reset_password_verify', methods: ['POST'])]
    public function reset(
        string $token, 
        Request $request, 
        UsuarioRepository $userRepository, 
        EntityManagerInterface $entityManager, 
        UserPasswordHasherInterface $passwordHasher
    ): JsonResponse
    {
        $user = $userRepository->findOneBy(['resetToken' => $token]);

        if (!$user) {
            return $this->json(['message' => 'Token inválido o usuario no encontrado.'], 404);
        }

        // Verificar expiración
        if ($user->getResetTokenExpiresAt() < new \DateTime()) {
            return $this->json(['message' => 'El enlace ha expirado.'], 400);
        }

        $data = json_decode($request->getContent(), true);
        $newPassword = $data['password'] ?? '';

        if (empty($newPassword)) {
            return $this->json(['message' => 'La contraseña es obligatoria.'], 400);
        }

        // --- VALIDACIÓN AGREGADA: Verificar que no sea igual a la anterior ---
        if ($passwordHasher->isPasswordValid($user, $newPassword)) {
            return $this->json(['message' => 'La contraseña no puede ser igual a la anterior.'], 400);
        }
        // ---------------------------------------------------------------------

        // Hashear y guardar nueva contraseña
        $encodedPassword = $passwordHasher->hashPassword($user, $newPassword);
        $user->setPassword($encodedPassword);

        // Limpiar el token para que no se pueda volver a usar
        $user->setResetToken(null);
        $user->setResetTokenExpiresAt(null);

        $entityManager->flush();

        return $this->json(['message' => 'Contraseña actualizada correctamente.']);
    }
}