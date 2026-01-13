<?php

namespace App\Entity;

use App\Repository\AdopcionesRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;
use App\Entity\Mascotas;
use App\Entity\Usuario;

#[ORM\Entity(repositoryClass: AdopcionesRepository::class)]
class Adopciones
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['adopciones','adopciones:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['adopciones:read'])]  
    private ?string $contrato = null;

    #[ORM\Column(type: Types::DATE_MUTABLE, nullable: true)]
    #[Groups(['adopciones','adopciones:read'])]
    private ?\DateTime $fechaAdopcion = null;

    #[ORM\Column(length: 255)]
    #[Groups(['adopciones','adopciones:read'])]
    private ?string $estadoAdopcion = null;

    #[ORM\ManyToOne(inversedBy: 'adopciones')]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['adopciones','adopciones:read'])]
    private ?Mascotas $idMascota = null;

    #[ORM\ManyToOne(inversedBy: 'usuarioAdopcion')]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['adopciones','adopciones:read'])]
    private ?Usuario $idUsuario = null;


    public function getId(): ?int
    {
        return $this->id;
    }
public function getContrato(): ?string
    {
        return $this->contrato;
    }

    public function setContrato(?string $contrato): static
    {
        $this->contrato = $contrato;
        return $this;
    }
    
    
    public function getFechaAdopcion(): ?\DateTime
    {
        return $this->fechaAdopcion;
    }

    public function setFechaAdopcion(?\DateTime $fechaAdopcion): static
    {
        $this->fechaAdopcion = $fechaAdopcion;

        return $this;
    }

    public function getEstadoAdopcion(): ?string
    {
        return $this->estadoAdopcion;
    }

    public function setEstadoAdopcion(string $estadoAdopcion): static
    {
        $this->estadoAdopcion = $estadoAdopcion;

        return $this;
    }

    public function getIdMascota(): ?Mascotas
    {
        return $this->idMascota;
    }

    public function setIdMascota(?Mascotas $idMascota): static
    {
        $this->idMascota = $idMascota;

        return $this;
    }

    public function getIdUsuario(): ?Usuario
    {
        return $this->idUsuario;
    }

    public function setIdUsuario(?Usuario $idUsuario): static
    {
        $this->idUsuario = $idUsuario;

        return $this;
    }
}
