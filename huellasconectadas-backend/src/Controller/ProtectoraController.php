<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class ProtectoraController extends AbstractController
{
    #[Route('/api/protectora', name: 'app_protectora', methods: ['GET'])]
    public function index(): Response
    {
        return $this->json([
            'message' => 'Bienvenida a la API de Protectora 🐾',
            'controller' => 'ProtectoraController',
            'status' => 'ok'
        ]);
    }
}
