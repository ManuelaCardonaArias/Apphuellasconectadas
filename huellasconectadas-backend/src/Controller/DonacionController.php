<?php

namespace App\Controller;

use App\Entity\Donaciones;
use App\Entity\Usuario;
use Doctrine\ORM\EntityManagerInterface;
use Stripe\Stripe;
use Stripe\PaymentIntent;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;
use PayPalCheckoutSdk\Orders\OrdersCreateRequest;
use PayPalCheckoutSdk\Orders\OrdersCaptureRequest; // Necesario para la captura
use App\Service\PayPalClient;
use DateTimeImmutable;

use Symfony\Component\HttpFoundation\Response;
//correo
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;

class DonacionController extends AbstractController
{
    //correo
    private MailerInterface $mailer;
    private string $stripeSecretKey;
    // Usamos el constructor para inyectar la clave y configurar Stripe
    public function __construct(string $stripeSecretKey, MailerInterface $mailer)
    {
        // 🔑 IMPORTANTE: Inicializar Stripe API Key al inicio
        Stripe::setApiKey($stripeSecretKey);
        $this->mailer = $mailer; // Guardamos el Mailer en la propiedad
    }


    // =======================================================================
    // 1. RUTA INICIAL: Crear la Intención de Pago (Stripe) o la Orden (PayPal)
    // =======================================================================
    #[Route('/donar', name: 'app_donacion_init', methods: ['POST'])]
    public function donar(Request $request, PayPalClient $payPalClient): JsonResponse
    {
        try {
            $data = json_decode($request->getContent(), true);

            if (!$data || !isset($data['monto'], $data['metodoPago'])) {
                return $this->json(['error' => 'Monto y método de pago requeridos'], 400);
            }

            $monto = floatval($data['monto']);
            $metodoPago = $data['metodoPago'];

            if ($monto <= 0) {
                return $this->json(['error' => 'Monto inválido'], 400);
            }

            if ($metodoPago === 'paypal') {
                return $this->handlePayPalOrderCreation($monto, $payPalClient);
            }

            if ($metodoPago === 'card') {
                return $this->handleStripePaymentIntent($monto);
            }

            return $this->json(['error' => 'Método de pago no soportado'], 400);
        } catch (\Exception $e) {
            // Captura errores de la API de Stripe o PayPal
            return $this->json(['error' => $e->getMessage()], 400);
        }
    }

    // =======================================================================
    // NUEVA FUNCIÓN: Envía el correo después del éxito
    // =======================================================================
    private function sendReceiptEmail(string $recipientEmail, float $monto, string $metodoPago, string $nombreDonante): void
    {
        $subject = '🎉 Gracias por tu Donación de ' . number_format($monto, 2) . '€';

        $body = $this->renderView(
            // ✅ Usar una plantilla Twig para un diseño profesional (ver 3.2)
            'emails/comprobante_donacion.html.twig',
            [
                'monto' => $monto,
                'metodoPago' => $metodoPago,
                'nombreDonante' => $nombreDonante
            ]
        );

        $email = (new Email())
            ->from('huellasconectadases@gmail.com') // 📧 DEBE ser un correo válido de tu dominio/SMTP
            ->to($recipientEmail)
            ->subject($subject)
            ->html($body);

        $this->mailer->send($email);
    }

    // =======================================================================
    // 2. RUTA DE CONFIRMACIÓN: Guardar la donación en la base de datos (Stripe)
    // =======================================================================
    // Esta ruta se llama desde el frontend *después* de que Stripe confirma el pago.
    #[Route('/donar/confirmar', name: 'app_donacion_confirmar', methods: ['POST'])]
    public function confirmarDonacionStripe(Request $request, EntityManagerInterface $em): JsonResponse
    {
        try {
            $data = json_decode($request->getContent(), true);

            // Validar datos de entrada...
            if (!isset($data['paymentId'], $data['monto'])) {
                return $this->json(['error' => 'Datos de confirmación inválidos (paymentId y monto requeridos)'], 400);
            }

            $monto = floatval($data['monto']);
            $paymentId = $data['paymentId'];
            $metodoPago = $data['metodoPago'] ?? 'card';

            if ($monto <= 0) {
                return $this->json(['error' => 'Monto inválido o no numérico'], 400);
            }

            // Llamada al método auxiliar de persistencia
            $resultado = $this->registrarDonacionEnBD($em, $monto, $metodoPago, $paymentId, $data['isAnonymous'] ?? false);

            // 🟢 Envío del correo después del registro (CORREGIDO PARA STRIPE)

            $usuarioLogueado = $this->getUser();
            $isAnonymous = $data['isAnonymous'] ?? false;

            // Solo se envía el email si el usuario está logueado y no solicitó anonimato.
            // (Asumimos que tu entidad Usuario tiene el método getEmail())
            $donorEmail = ($usuarioLogueado instanceof Usuario && !$isAnonymous)
                ? $usuarioLogueado->getEmail()
                : null;

            if ($donorEmail) {
                // Usamos $metodoPago (que será 'card') y el email del usuario logueado.
                $this->sendReceiptEmail($donorEmail, $monto, $metodoPago, $resultado['nombreDonante']);
            }

            // FIN DE CORRECCIÓN

            return $this->json($resultado, 200);
        } catch (\Exception $e) {
            return $this->json(['error' => 'Error interno al registrar la donación: ' . $e->getMessage()], 500);
        }
    }

// =======================================================================
    // 3. RUTA DE CALLBACK: Captura la Orden de PayPal después del Redirect
    // =======================================================================
    #[Route('/paypal/capturar', name: 'app_paypal_capturar', methods: ['GET'])]
    public function capturarPayPal(
        Request $request,
        PayPalClient $payPalClient,
        EntityManagerInterface $em
    ): Response {
        $orderId = $request->query->get('token');

        if (!$orderId) {
            return $this->json(['error' => 'ID de orden de PayPal no encontrado o incompleto'], 400);
        }

        try {
            // 1. 🟢 FALTAB ESTO: Crear la solicitud de captura a PayPal
            $requestPayPal = new OrdersCaptureRequest($orderId);
            $requestPayPal->prefer('return=representation');

            // 2. Ejecutar la llamada a la API
            $response = $payPalClient->getClient()->execute($requestPayPal);

            // 3. Obtener los detalles de la captura
            // (La estructura de la respuesta de PayPal suele ser esta)
            $capture = $response->result->purchase_units[0]->payments->captures[0];

            if ($capture->status !== 'COMPLETED') {
                 // Si no está completado, lanzamos error o redirigimos a fallo
                throw new \Exception("La captura de PayPal no se completó. Estado: " . $capture->status);
            }

            // Datos del monto y pagador
            $monto = floatval($capture->amount->value);
            $payer = $response->result->payer;

            // 🔑 Obtener el nombre del pagador de PayPal (Nombre + Apellido)
            $paypalPayerName = trim(
                ($payer->name->given_name ?? '') . ' ' . ($payer->name->surname ?? '')
            );

            // Determinar qué nombre enviar a la BD
            $nameForDatabase = !empty($paypalPayerName) ? $paypalPayerName : 'Donante PayPal';

            // 4. Registrar la donación en la BD
            $resultado = $this->registrarDonacionEnBD(
                $em,
                $monto,
                'paypal',
                $orderId, // Guardamos el OrderID de PayPal como referencia
                false,
                null,
                $nameForDatabase // PASAMOS EL NOMBRE DE PAYPAL AQUÍ
            );

            // 5. Envío del correo
            $donorEmail = $payer->email_address ?? 'correo_por_defecto@ejemplo.com';
            
            // Usamos el nombre que se guardó en la BD ($resultado['nombreDonante'])
            $this->sendReceiptEmail($donorEmail, $monto, 'PayPal', $resultado['nombreDonante']);

            // 6. ✅ AHORA SÍ: Redirección final al éxito
            // Nota: Asegúrate de que el puerto 5173 es donde corre tu frontend (Vite/React/Vue)
            return $this->redirect('http://localhost:5173/donacionExitosa');

        } catch (\Exception $e) {
            // En caso de error, podrías redirigir a una página de error del frontend
            // return $this->redirect('http://localhost:5173/donacionFallida?error=' . urlencode($e->getMessage()));
            
            return $this->json([
                'error' => 'Fallo al capturar el pago de PayPal: ' . $e->getMessage()
            ], 400);
        }
    }

    #[Route('/donar/info/{orderId}', name: 'app_donacion_info', methods: ['GET'])]
    public function getDonationInfo(string $orderId, EntityManagerInterface $em): JsonResponse
    {
        // Asume que la donación ya fue registrada en /paypal/capturar
        $donacion = $em->getRepository(Donaciones::class)->findOneBy([
            'paypalOrderId' => $orderId
        ]);

        if (!$donacion) {
            return $this->json(['error' => 'Donación no encontrada'], 404);
        }

        // Devuelve los datos necesarios para el frontend
        return $this->json([
            'mensaje' => 'Información de donación obtenida',
            'datos' => [
                'donacionId' => $donacion->getId(),
                'monto' => $donacion->getMonto(),
                'nombreDonante' => $donacion->getNombreDonante(),
                'usuarioAsignadoId' => $donacion->getUsuario() ? $donacion->getUsuario()->getId() : null,
                'metodoPago' => $donacion->getMetodoPago()
            ]
        ]);
    }

    // =======================================================================
    // --- MÉTODOS AUXILIARES ---
    // =======================================================================

    /**
     * Crea la intención de pago de Stripe y devuelve el Client Secret.
     */
    private function handleStripePaymentIntent(float $monto): JsonResponse
    {
        $paymentIntent = PaymentIntent::create([
            'amount' => intval($monto * 100), // En céntimos
            'currency' => 'eur',
            'payment_method_types' => ['card'],
        ]);

        return $this->json([
            'clientSecret' => $paymentIntent->client_secret,
            'metodoPago' => 'card'
        ]);
    }

    /**
     * Crea la orden de PayPal y devuelve la URL de redirección.
     */
    private function handlePayPalOrderCreation(float $monto, PayPalClient $payPalClient): JsonResponse
    {
        // Obtener el ID del usuario logueado (si existe)
        $usuarioLogueado = $this->getUser();
        $customId = $usuarioLogueado instanceof Usuario ? $usuarioLogueado->getId() : null;

        $request = new OrdersCreateRequest();
        $request->prefer('return=representation');
        $montoString = number_format($monto, 2, '.', '');

        $request->body = [
            'intent' => 'CAPTURE',
            'purchase_units' => [[
                'reference_id' => uniqid('DONATION_'),
                'amount' => [
                    'currency_code' => 'EUR',
                    'value' => $montoString
                ],
                // 🔑 NUEVO: Incluir el ID de usuario en custom_id si está logueado
                'custom_id' => $customId,
            ]],
            'application_context' => [
                // ... (resto del application_context)
                'return_url' => $_ENV['PAYPAL_RETURN_URL'],
                'cancel_url' => $_ENV['PAYPAL_CANCEL_URL'],
                'brand_name' => 'Nombre de tu Asociación',
                'user_action' => 'PAY_NOW',
            ]
        ];

        $response = $payPalClient->getClient()->execute($request);

        $redirectUrl = null;
        foreach ($response->result->links as $link) {
            if ($link->rel === 'approve') {
                $redirectUrl = $link->href;
                break;
            }
        }

        if (!$redirectUrl) {
            throw new \Exception("No se encontró el enlace de aprobación de PayPal.");
        }

        return $this->json([
            'orderId' => $response->result->id,
            'redirectUrl' => $redirectUrl,
            'metodoPago' => 'paypal'
        ], 200);
    }


    /**
     * Persiste la donación en la base de datos (lógica compartida).
     */
    // ... dentro de DonacionController.php

    /**
     * Persiste la donación en la base de datos (lógica compartida).
     *
     * @param string $donorNameOverride Nombre opcional para forzar (usado por PayPal)
     */
    private function registrarDonacionEnBD(
        EntityManagerInterface $em,
        float $monto,
        string $metodoPago,
        string $paymentId,
        bool $isAnonymousRequested = false,
        ?Usuario $usuarioForced = null,
        // 🔑 NUEVO PARÁMETRO: Permite forzar el nombre de registro
        ?string $donorNameOverride = null
    ): array {
        // 1. Determinación del Usuario y Nombre
        $usuarioLogueado = $usuarioForced ?? $this->getUser();
        $nombreDonante = 'Anónimo'; // Valor por defecto
        $usuarioAsignado = null;

        if ($usuarioLogueado instanceof Usuario && !$isAnonymousRequested) {
            // Lógica para usuarios de Symfony (usada por Stripe y si la sesión sobrevive)
            $usuarioAsignado = $usuarioLogueado;
            if (method_exists($usuarioLogueado, 'getNombreCompleto')) {
                $nombreDonante = $usuarioLogueado->getNombreCompleto();
            } else {
                $nombreDonante = $usuarioLogueado->getNombre();
            }
        } elseif ($donorNameOverride) {
            // 🔑 Lógica para PayPal: Usamos el nombre que nos forzaron
            $nombreDonante = $donorNameOverride;
        }


        // 2. Creación de la entidad Donaciones
        $donacion = new Donaciones();
        $donacion->setMonto($monto);
        $donacion->setMetodoPago($metodoPago);
        $donacion->setFecha(new DateTimeImmutable());

        // Asignación del ID de pago
        if ($metodoPago === 'card') {
            $donacion->setStripePaymentId($paymentId);
        } elseif ($metodoPago === 'paypal') {
            $donacion->setPaypalOrderId($paymentId);
        }

        $donacion->setUsuario($usuarioAsignado);
        $donacion->setNombreDonante($nombreDonante); // 🔑 Aquí se guarda el nombre

        // 3. Persistencia
        $em->persist($donacion);
        $em->flush();

        // 4. Devolver resultado para el JSON
        return [
            'mensaje' => 'Donación registrada exitosamente',
            'donacionId' => $donacion->getId(),
            'nombreDonante' => $donacion->getNombreDonante(),
            'usuarioAsignadoId' => $usuarioAsignado ? $usuarioAsignado->getId() : null,
            'metodoPago' => $metodoPago
        ];
    }

}

