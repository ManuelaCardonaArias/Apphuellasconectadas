<?php

namespace App\Entity;

use App\Repository\ReservasCitasRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ReservasCitasRepository::class)]
class Cita
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(type: Types::DATE_MUTABLE)]
    private ?\DateTimeInterface $fecha = null;

    #[ORM\Column(type: Types::TIME_MUTABLE)]
    private ?\DateTimeInterface $hora = null;

    #[ORM\Column(length: 255)]
    private ?string $estado = 'Pendiente';

    // Relació 1: L'usuari que fa la reserva (l'adoptant)
    #[ORM\ManyToOne(targetEntity: Usuario::class, inversedBy: 'citasUsuario')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Usuario $usuario = null;

    // Relació 2: La mascota per la qual es reserva
    #[ORM\ManyToOne(targetEntity: Mascotas::class, inversedBy: 'citas')] 
    #[ORM\JoinColumn(nullable: false)]
    private ?Mascotas $mascota = null;

    // Relació 3: La protectora propietària de la mascota (per a la vista de gestió)
    // Utilitzem l'inversedBy definit a Usuario.php
    #[ORM\ManyToOne(targetEntity: Usuario::class, inversedBy: 'citasProtectoraRecibidas')] 
    #[ORM\JoinColumn(nullable: true)] // Pot ser nul si no s'assigna automàticament
    private ?Usuario $idProtectora = null; 


    public function getId(): ?int
    {
        return $this->id;
    }

    public function getFecha(): ?\DateTimeInterface
    {
        return $this->fecha;
    }

    public function setFecha(\DateTimeInterface $fecha): static
    {
        $this->fecha = $fecha;
        return $this;
    }

    public function getHora(): ?\DateTimeInterface
    {
        return $this->hora;
    }

    public function setHora(\DateTimeInterface $hora): static
    {
        $this->hora = $hora;
        return $this;
    }

    public function getEstado(): ?string
    {
        return $this->estado;
    }

    public function setEstado(string $estado): static
    {
        $this->estado = $estado;
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

    public function getMascota(): ?Mascotas
    {
        return $this->mascota;
    }

    public function setMascota(?Mascotas $mascota): static
    {
        $this->mascota = $mascota;
        return $this;
    }

    // Mètodes que faltaven per a la relació de Protectora:
    public function getIdProtectora(): ?Usuario
    {
        return $this->idProtectora;
    }

    public function setIdProtectora(?Usuario $idProtectora): static
    {
        $this->idProtectora = $idProtectora;
        return $this;
    }
}