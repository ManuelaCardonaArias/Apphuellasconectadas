<?php

namespace App\Controller;

use App\Entity\Usuario;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/profile')]
class ProfileController extends AbstractController
{
    private EntityManagerInterface $entityManager;
    private UserPasswordHasherInterface $passwordHasher;

    public function __construct(EntityManagerInterface $entityManager, UserPasswordHasherInterface $passwordHasher)
    {
        $this->entityManager = $entityManager;
        $this->passwordHasher = $passwordHasher;
    }

    #[Route('', name: 'api_profile_get', methods: ['GET'])]
    public function getProfile(): Response
    {
        $user = $this->getUser();

        if (!$user instanceof Usuario) {
            return $this->json(['message' => 'Usuari no autenticat o no vàlid.'], Response::HTTP_UNAUTHORIZED);
        }

        return $this->json($user, Response::HTTP_OK, [], [
            'groups' => ['profile_read']
        ]);
    }

    #[Route('', name: 'api_profile_update', methods: ['PATCH'])]
    public function updateProfile(Request $request, SerializerInterface $serializer, ValidatorInterface $validator): Response
    {
        $user = $this->getUser();

        if (!$user instanceof Usuario) {
            return $this->json(['message' => 'Usuari no autenticat.'], Response::HTTP_UNAUTHORIZED);
        }

        try {
            $serializer->deserialize($request->getContent(), Usuario::class, 'json', [
                'object_to_populate' => $user,
                'groups' => ['profile_write']
            ]);
        } catch (\Throwable $e) {
            return $this->json(['message' => 'Dades JSON invàlides.'], Response::HTTP_BAD_REQUEST);
        }

        $errors = $validator->validate($user, null, ['profile_write']);

        if (count($errors) > 0) {
            $errorMessages = [];

            foreach ($errors as $error) {
                $errorMessages[$error->getPropertyPath()] = $error->getMessage();
            }

            return $this->json(['errors' => $errorMessages], Response::HTTP_BAD_REQUEST);
        }

        $this->entityManager->flush();

        return $this->json(['message' => 'Perfil actualitzat amb èxit.'], Response::HTTP_OK);
    }

    #[Route('/change-password', name: 'api_profile_change_password', methods: ['POST'])]
    public function changePassword(Request $request): Response
    {
        $user = $this->getUser();

        if (!$user instanceof Usuario) {
            return $this->json(['message' => 'Usuari no autenticat.'], Response::HTTP_UNAUTHORIZED);
        }

        $data = json_decode($request->getContent(), true);

        $currentPassword = $data['currentPassword'] ?? null;
        $newPassword = $data['newPassword'] ?? null;

        if (empty($currentPassword) || empty($newPassword)) {
            return $this->json(['message' => 'Falten dades.'], Response::HTTP_BAD_REQUEST);
        }

        if (!$this->passwordHasher->isPasswordValid($user, $currentPassword)) {
            return $this->json(['message' => 'Contrasenya actual incorrecta.'], Response::HTTP_UNAUTHORIZED);
        }

        if (strlen($newPassword) < 6) {
            return $this->json(['message' => 'La nova contrasenya ha de tenir almenys 6 caràcters.'], Response::HTTP_BAD_REQUEST);
        }

        $user->setPassword(
            $this->passwordHasher->hashPassword($user, $newPassword)
        );

        $this->entityManager->flush();

        return $this->json(['message' => 'Contrasenya canviada amb èxit.']);
    }

    /**
     * [NUEVO] Método para eliminar la cuenta del usuario actual.
     * Corresponde a la llamada api.delete(ENDPOINTS.PROFILE)
     */
    #[Route('', name: 'api_profile_delete', methods: ['DELETE'])]
    public function deleteProfile(): Response
    {
        $user = $this->getUser();

        if (!$user instanceof Usuario) {
            return $this->json(['message' => 'Usuari no autenticat.'], Response::HTTP_UNAUTHORIZED);
        }

        try {
            // Eliminar el usuario. 
            // NOTA: Asegúrate de que las relaciones (Mascotas, Citas) en la entidad Usuario 
            // tengan cascade={"remove"} o orphanRemoval=true si quieres que se borre todo automáticamente.
            // De lo contrario, podrías necesitar borrar manualmente las dependencias aquí.
            
            $this->entityManager->remove($user);
            $this->entityManager->flush();
            
            // Opcional: Invalidar sesión si usas sesiones de servidor (Symfony)
            // $this->container->get('security.token_storage')->setToken(null);
            
        } catch (\Exception $e) {
            return $this->json(['message' => 'Error al eliminar el compte: ' . $e->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        return $this->json(['message' => 'Compte eliminat correctament.'], Response::HTTP_OK);
    }
}