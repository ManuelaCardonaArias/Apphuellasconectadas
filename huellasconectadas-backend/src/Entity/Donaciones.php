<?php

namespace App\Entity;

use App\Repository\DonacionesRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: DonacionesRepository::class)]
class Donaciones
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column]
    private ?float $monto = null;

    #[ORM\Column(length: 255)]
    private ?string $metodoPago = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $stripePaymentId = null;

    #[ORM\Column(length: 255, nullable: true)] // <-- ¡Añadir este campo!
    private ?string $paypalOrderId = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $fecha = null;

    // Relación con Usuario
    #[ORM\ManyToOne(targetEntity: Usuario::class, inversedBy: 'donaciones')]
    #[ORM\JoinColumn(nullable: true)]
    private ?Usuario $usuario = null;

    // Nuevo campo para el nombre del donante (Anónimo o el nombre del usuario)
    #[ORM\Column(length: 255, nullable: true)]
    private ?string $nombreDonante = null;

    // --- GETTERS & SETTERS (NECESARIOS PARA EL CONTROLADOR) ---

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getMonto(): ?float
    {
        return $this->monto;
    }

    public function setMonto(float $monto): static
    {
        $this->monto = $monto;

        return $this;
    }

    public function getMetodoPago(): ?string
    {
        return $this->metodoPago;
    }

    public function setMetodoPago(string $metodoPago): static
    {
        $this->metodoPago = $metodoPago;

        return $this;
    }

    public function getStripePaymentId(): ?string
    {
        return $this->stripePaymentId;
    }

    public function setStripePaymentId(string $stripePaymentId): static
    {
        $this->stripePaymentId = $stripePaymentId;

        return $this;
    }

    public function getPaypalOrderId(): ?string
    {
        return $this->paypalOrderId;
    }

    public function setPaypalOrderId(?string $paypalOrderId): static
    {
        $this->paypalOrderId = $paypalOrderId;

        return $this;
    }

    public function getFecha(): ?\DateTimeInterface
    {
        // Convertir a DateTimeImmutable si es necesario, o cambiar la propiedad a \DateTime
        if ($this->fecha instanceof \DateTimeImmutable) {
            return \DateTime::createFromImmutable($this->fecha);
        }
        return $this->fecha;
    }

    public function setFecha(\DateTimeInterface $fecha): static
    {
        $this->fecha = $fecha instanceof \DateTimeImmutable ? $fecha : \DateTimeImmutable::createFromMutable($fecha);

        return $this;
    }

    public function getUsuario(): ?Usuario
    {
        return $this->usuario;
    }

    public function setUsuario(?Usuario $usuario): static
    {
        $this->usuario = $usuario;

        return $this;
    }

    public function getNombreDonante(): ?string
    {
        return $this->nombreDonante;
    }

    public function setNombreDonante(?string $nombreDonante): static
    {
        $this->nombreDonante = $nombreDonante;

        return $this;
    }
}
