<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class InicioController extends AbstractController
{
    #[Route('/api/inicio', name: 'app_inicio')]
    public function index(): Response
    {
        return $this->json([
            'message' => 'Bienvenida a la API de Huellas Conectadas 🐾',
            'controller' => 'InicioController',
        ]);
    }
}
