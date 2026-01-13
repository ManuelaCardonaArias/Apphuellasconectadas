<?php

namespace App\Service;

use Symfony\Component\Mailer\MailerInterface;
use Symfony\Bridge\Twig\Mime\TemplatedEmail;
use Symfony\Component\Mime\Address;

class EmailService
{
    private MailerInterface $mailer;
    private string $senderEmail;
    private string $senderName;

    public function __construct(
        MailerInterface $mailer,
        string $senderEmail = 'no-reply@huellasconectadas.com', // Cambia esto por tu remitente verificado
        string $senderName = 'Huellas Conectadas'
    ) {
        $this->mailer = $mailer;
        $this->senderEmail = $senderEmail;
        $this->senderName = $senderName;
    }

    public function sendEmail(string $to, string $subject, string $template, array $context = []): void
    {
        try {
            $email = (new TemplatedEmail())
                ->from(new Address($this->senderEmail, $this->senderName))
                ->to($to)
                ->subject($subject)
                ->htmlTemplate($template)
                ->context($context);

            $this->mailer->send($email);
        } catch (\Exception $e) {
            // Puedes loguear el error aquí si lo deseas
            error_log("Error enviando email a $to: " . $e->getMessage());
        }
    }
}