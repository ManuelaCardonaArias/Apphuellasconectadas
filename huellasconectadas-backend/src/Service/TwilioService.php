<?php

namespace App\Service;

use Twilio\Rest\Client;
use Psr\Log\LoggerInterface;

class TwilioService
{
    private string $twilioSid;
    private string $twilioToken;
    private string $twilioWhatsappFrom;
    private LoggerInterface $logger;

    public function __construct(
        string $twilioSid,
        string $twilioToken,
        string $twilioWhatsappFrom,
        LoggerInterface $logger
    ) {
        $this->twilioSid = $twilioSid;
        $this->twilioToken = $twilioToken;
        $this->twilioWhatsappFrom = $twilioWhatsappFrom;
        $this->logger = $logger;
    }

    /**
     * Envia un missatge de WhatsApp a un número de telèfon.
     * @param string $toPhoneNumber El número de WhatsApp del destinatari (format E.164, p.ex., "+346XXXXXXXX").
     * @param string $message El cos del missatge.
     * @return bool True si l'enviament ha estat reeixit.
     */
    public function sendWhatsappMessage(string $toPhoneNumber, string $message): bool
    {
        // 1. Validació del format
        if (!preg_match('/^\+[1-9]\d{1,14}$/', $toPhoneNumber)) {
            $this->logger->error("Twilio: Número de telèfon invàlid o sense codi de país: {$toPhoneNumber}");
            return false;
        }

        try {
            $twilio = new Client($this->twilioSid, $this->twilioToken);

            $twilio->messages->create(
                "whatsapp:{$toPhoneNumber}", // Enviar per WhatsApp
                [
                    'from' => "whatsapp:{$this->twilioWhatsappFrom}",
                    'body' => $message,
                ]
            );

            $this->logger->info("Twilio: Missatge enviat a {$toPhoneNumber}");
            return true;
        } catch (\Exception $e) {
            $this->logger->error("Twilio Error: No s'ha pogut enviar el missatge a {$toPhoneNumber}. Error: {$e->getMessage()}");
            return false;
        }
    }
}