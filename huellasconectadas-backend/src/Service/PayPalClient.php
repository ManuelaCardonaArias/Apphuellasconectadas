<?php

namespace App\Service;

use PayPalCheckoutSdk\Core\PayPalEnvironment;
use PayPalCheckoutSdk\Core\ProductionEnvironment;
use PayPalCheckoutSdk\Core\SandboxEnvironment;
use PayPalCheckoutSdk\Core\PayPalHttpClient;

class PayPalClient
{
    private PayPalHttpClient $client;

    public function __construct(string $clientId, string $secret, string $env)
    {
        // 1. Configurar el entorno (Sandbox o Live)
        if ($env === 'sandbox') {
            $environment = new SandboxEnvironment($clientId, $secret);
        } else {
            $environment = new ProductionEnvironment($clientId, $secret);
        }

        // 2. Crear el cliente HTTP
        $this->client = new PayPalHttpClient($environment);
    }

    public function getClient(): PayPalHttpClient
    {
        return $this->client;
    }
}