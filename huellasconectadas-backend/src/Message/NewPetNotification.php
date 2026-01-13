<?php

namespace App\Message;

/**
 * Representa el mensaje (la tarea) que se enviará al bus de Messenger 
 * para notificar a los usuarios sobre una nueva mascota.
 */
final class NewPetNotification
{
    private $mascotaId;
    private $protectoraId;

    public function __construct(int $mascotaId, int $protectoraId)
    {
        $this->mascotaId = $mascotaId;
        $this->protectoraId = $protectoraId;
    }

    public function getMascotaId(): int
    {
        return $this->mascotaId;
    }

    public function getProtectoraId(): int
    {
        return $this->protectoraId;
    }
}