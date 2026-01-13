<?php

namespace App\Controller;

use App\Entity\Usuario;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
// Eliminem l'ús de DateTimeImmutable ja que no és acceptat per la teva configuració de BBDD
// use DateTimeImmutable; 

class RegistrationController extends AbstractController
{
    // RUTA PER A L'API: ACCEPTA NOMÉS POST I RETORNA JSON
    #[Route('/registro', name: 'app_register_api', methods: ['POST'])]
    public function registerApi(
        Request $request, 
        UserPasswordHasherInterface $userPasswordHasher, 
        EntityManagerInterface $entityManager
    ): JsonResponse {
        // 1. Decodificar el cos JSON de la sol·licitud (enviat des de React)
        $content = $request->getContent();
        $data = json_decode($content, true);

        // Verificació essencial de dades
        if (!$data || !isset($data['email'], $data['password'], $data['nombre'], $data['roles'])) {
            return new JsonResponse(['message' => 'Falten dades essencials (email, password, nombre o roles) per al registre.'], Response::HTTP_BAD_REQUEST);
        }

        $user = new Usuario();

        // 2. Mapeig de camps del JSON (React) a la Entitat (Symfony)
        $user->setEmail($data['email']);
        
        // IMPORTANT: Hasheo de la contrasenya
        $user->setPassword(
            $userPasswordHasher->hashPassword($user, $data['password'])
        );
        
        // Mapeig de camps comuns
        $user->setRoles($data['roles']);
        // CORRECCIÓ CLAU: Utilitzar la classe \DateTime (que la teva BBDD espera)
        $user->setFechaRegistro(new \DateTime($data['fecha_registro']));
        
        $user->setNombre($data['nombre']); 
        $user->setIdentificacion($data['identificacion']); 
        $user->setDireccion($data['direccion']); 
        $user->setTelefono($data['telefono']); 

        // 3. Mapeig condicional per a Adoptant (ROLE_USER)
        if (in_array('ROLE_USER', $data['roles'])) {
            
            // Camps de Adoptant
            $user->setApellido($data['apellido']);
            $user->setTipoVivienda($data['tipo_vivienda']);
            $user->setTieneMascotas((bool)$data['tiene_mascotas']);
            
            // Les dates són obligatòries
            // CORRECCIÓ CLAU: Utilitzar la classe \DateTime
            $user->setFechaNacimiento(new \DateTime($data['fecha_nacimiento'])); 
            $user->setDescripcionProtectora(null);
            
        } 
        // 4. Mapeig condicional per a Protectora (ROLE_PROTECTORA)
        elseif (in_array('ROLE_PROTECTORA', $data['roles'])) {
            
            // Camps nuls o per defecte per a Protectora
            $user->setApellido(''); 
            $user->setTipoVivienda(''); 
            $user->setTieneMascotas(false); 
            
            // Si la data de naixement és obligatòria, usem una data fictícia o la de registre.
            // CORRECCIÓ CLAU: Utilitzar la classe \DateTime
            $user->setFechaNacimiento(new \DateTime(date('Y-m-d', strtotime('-30 years'))));
            $user->setDescripcionProtectora($data['descripcion_protectora'] ?? 'Registro pendiente de verificación.');
        }

        // 5. Persistir i guardar
        try {
            $entityManager->persist($user);
            $entityManager->flush();
        } catch (\Exception $e) {
            // Captura errors com email duplicat
            return new JsonResponse(['message' => 'Error al guardar el usuario: ' . $e->getMessage()], Response::HTTP_CONFLICT);
        }

        // 6. Retornar una resposta JSON d'èxit
        return new JsonResponse(['message' => 'Usuario registrado exitosamente', 'userId' => $user->getId()], Response::HTTP_CREATED);
    }
}