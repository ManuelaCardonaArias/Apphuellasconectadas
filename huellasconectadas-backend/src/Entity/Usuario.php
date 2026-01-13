<?php

namespace App\Entity;

use App\Repository\UsuarioRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Component\Serializer\Annotation\SerializedName; 
use Symfony\Component\Serializer\Annotation\Ignore; // <--- IMPORTANTE AÑADIR ESTO ARRIBA

// Importación de entidades relacionadas
use App\Entity\Cita; 
use App\Entity\Mascotas;
use App\Entity\Adopciones;

#[ORM\Entity(repositoryClass: UsuarioRepository::class)]
#[ORM\UniqueConstraint(name: 'UNIQ_IDENTIFIER_EMAIL', fields: ['email'])]
#[UniqueEntity(fields: ['email'], message: 'There is already an account with this email')]
class Usuario implements UserInterface, PasswordAuthenticatedUserInterface
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['adopciones', 'usuarios', 'profile_read','adopciones:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 180)]
    #[Groups(['usuarios', 'adopciones', 'profile_read','adopciones:read'])]
    private ?string $email = null;

    #[ORM\Column]
    #[Groups(['profile_read'])]
    private array $roles = [];

    #[ORM\Column]
    private ?string $password = null;

    #[ORM\Column(length: 50, nullable: true)]
    #[Groups(['usuarios', 'adopciones', 'profile_read'])]
    private ?string $identificacion = null;

    #[ORM\Column(length: 100)]
    #[Groups(['usuarios', 'adopciones', 'profile_read', 'profile_write','adopciones:read'])]
    private ?string $nombre = null;

    #[ORM\Column(length: 100, nullable: true)]
    #[Groups(['usuarios', 'adopciones', 'profile_read', 'profile_write','adopciones:read'])]
    private ?string $apellido = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['usuarios', 'profile_read', 'profile_write'])]
    private ?string $direccion = null;

    #[ORM\Column(length: 20, nullable: true)]
    #[Groups(['usuarios', 'profile_read', 'profile_write','adopciones:read'])]
    private ?string $telefono = null;

    #[ORM\Column(type: 'date', nullable: true)]
    #[Groups(['usuarios', 'profile_read'])]
    private ?\DateTimeInterface $fecha_nacimiento = null;

    #[ORM\Column(type: 'date', nullable: true)]
    #[Groups(['usuarios', 'profile_read'])]
    private ?\DateTimeInterface $fecha_registro = null;

    #[ORM\Column(type: 'text', nullable: true)]
    #[Groups(['usuarios', 'profile_read', 'profile_write'])]
    #[SerializedName('biografia')]
    private ?string $descripcion_protectora = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['usuarios', 'profile_read', 'profile_write'])]
    #[SerializedName('tipo_vivienda')]
    private ?string $tipoVivienda = null;

    #[ORM\Column(type: 'boolean', nullable: true)]
    #[Groups(['usuarios', 'profile_read'])]
    private ?bool $tieneMascotas = null;

    // --- RELACIONES ---

    /** @var Collection<int, Mascotas> */
    #[ORM\OneToMany(targetEntity: Mascotas::class, mappedBy: 'id_usuario', orphanRemoval: true)]
    private Collection $mascotas;

    /** @var Collection<int, Adopciones> */
    #[ORM\OneToMany(targetEntity: Adopciones::class, mappedBy: 'idUsuario')]
    #[Ignore] // <--- AÑÁDELO AQUÍ TAMBIÉN
    private Collection $adopciones;

    /** @var Collection<int, Adopciones> */
    #[ORM\OneToMany(targetEntity: Adopciones::class, mappedBy: 'idUsuario')]
    private Collection $usuarioAdopcion;

    /**
     * Citas realizadas por este usuario (el adoptante).
     * @var Collection<int, Cita>
     */
    #[ORM\OneToMany(targetEntity: Cita::class, mappedBy: 'usuario')]
    private Collection $citasUsuario;

    /**
     * Citas recibidas por la protectora (el usuario que gestiona las citas).
     * @var Collection<int, Cita>
     */
    #[ORM\OneToMany(targetEntity: Cita::class, mappedBy: 'idProtectora')]
    private Collection $citasProtectoraRecibidas;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $resetToken = null;

    #[ORM\Column(nullable: true)]
    private ?\DateTime $resetTokenExpiresAt = null; 

    public function __construct()
    {
        $this->mascotas = new ArrayCollection();
        $this->adopciones = new ArrayCollection();
        $this->usuarioAdopcion = new ArrayCollection();
        $this->citasUsuario = new ArrayCollection(); 
        $this->citasProtectoraRecibidas = new ArrayCollection(); 
    }

    // ----------------- SEGURIDAD -----------------

    public function getUserIdentifier(): string 
    { 
        return (string) $this->email; 
    }

    public function getRoles(): array 
    { 
        $roles = $this->roles; 
        $roles[] = 'ROLE_USER'; 
        return array_unique($roles); 
    }

    public function setRoles(array $roles): static 
    { 
        $this->roles = $roles; 
        return $this; 
    }

    public function getPassword(): ?string 
    { 
        return $this->password; 
    }

    public function setPassword(string $password): static 
    { 
        $this->password = $password; 
        return $this; 
    }

    public function eraseCredentials(): void {}

    // ----------------- GETTERS Y SETTERS -----------------

    public function getId(): ?int { return $this->id; }

    public function getEmail(): ?string { return $this->email; }
    public function setEmail(string $email): static { $this->email = $email; return $this; }

    public function getIdentificacion(): ?string { return $this->identificacion; }
    public function setIdentificacion(?string $identificacion): static { $this->identificacion = $identificacion; return $this; }

    public function getNombre(): ?string { return $this->nombre; }
    public function setNombre(string $nombre): static { $this->nombre = $nombre; return $this; }

    public function getApellido(): ?string { return $this->apellido; }
    public function setApellido(?string $apellido): static { $this->apellido = $apellido; return $this; }

    public function getDireccion(): ?string { return $this->direccion; }
    public function setDireccion(?string $direccion): static { $this->direccion = $direccion; return $this; }

    public function getTelefono(): ?string { return $this->telefono; }
    public function setTelefono(?string $telefono): static { $this->telefono = $telefono; return $this; }

    public function getFechaNacimiento(): ?\DateTimeInterface { return $this->fecha_nacimiento; }
    public function setFechaNacimiento(?\DateTimeInterface $fecha_nacimiento): static { $this->fecha_nacimiento = $fecha_nacimiento; return $this; }

    public function getFechaRegistro(): ?\DateTimeInterface { return $this->fecha_registro; }
    public function setFechaRegistro(?\DateTimeInterface $fecha_registro): static { $this->fecha_registro = $fecha_registro; return $this; }

    public function getDescripcionProtectora(): ?string { return $this->descripcion_protectora; }
    public function setDescripcionProtectora(?string $descripcion_protectora): static { $this->descripcion_protectora = $descripcion_protectora; return $this; }

    public function getTipoVivienda(): ?string { return $this->tipoVivienda; }
    public function setTipoVivienda(?string $tipoVivienda): static { $this->tipoVivienda = $tipoVivienda; return $this; }

    public function getNombreCompleto(): string
    {
        // Combina el nombre y el apellido. Se asegura de que no haya espacios extra si uno es null.
        return trim($this->nombre . ' ' . $this->apellido);
    }

    public function isTieneMascotas(): ?bool { return $this->tieneMascotas; }
    public function setTieneMascotas(?bool $tieneMascotas): static { $this->tieneMascotas = $tieneMascotas; return $this; }

    // ----------------- MÉTODOS DE COLECCIONES -----------------

    /**
     * @return Collection<int, Mascotas>
     */
    public function getMascotas(): Collection
    {
        return $this->mascotas;
    }

    public function addMascota(Mascotas $mascota): static
    {
        if (!$this->mascotas->contains($mascota)) {
            $this->mascotas->add($mascota);
            $mascota->setIdUsuario($this);
        }
        return $this;
    }

    public function removeMascota(Mascotas $mascota): static
    {
        if ($this->mascotas->removeElement($mascota)) {
            if ($mascota->getIdUsuario() === $this) {
                $mascota->setIdUsuario(null);
            }
        }
        return $this;
    }

    /**
     * @return Collection<int, Adopciones>
     */
    public function getAdopciones(): Collection
    {
        return $this->adopciones;
    }

    public function addAdopcione(Adopciones $adopcione): static
    {
        if (!$this->adopciones->contains($adopcione)) {
            $this->adopciones->add($adopcione);
            $adopcione->setIdUsuario($this);
        }
        return $this;
    }

    public function removeAdopcione(Adopciones $adopcione): static
    {
        if ($this->adopciones->removeElement($adopcione)) {
            if ($adopcione->getIdUsuario() === $this) {
                $adopcione->setIdUsuario(null);
            }
        }
        return $this;
    }

    /**
     * @return Collection<int, Cita>
     */
    public function getCitasUsuario(): Collection
    {
        return $this->citasUsuario;
    }

    public function addCitasUsuario(Cita $cita): static
    {
        if (!$this->citasUsuario->contains($cita)) {
            $this->citasUsuario->add($cita);
            $cita->setUsuario($this); 
        }
        return $this;
    }

    public function removeCitasUsuario(Cita $cita): static
    {
        if ($this->citasUsuario->removeElement($cita)) {
            if ($cita->getUsuario() === $this) {
                $cita->setUsuario(null);
            }
        }
        return $this;
    }

    /**
     * @return Collection<int, Cita>
     */
    public function getCitasProtectoraRecibidas(): Collection
    {
        return $this->citasProtectoraRecibidas;
    }

    public function addCitasProtectoraRecibida(Cita $cita): static
    {
        if (!$this->citasProtectoraRecibidas->contains($cita)) {
            $this->citasProtectoraRecibidas->add($cita);
            $cita->setIdProtectora($this);
        }
        return $this;
    }
    
    public function removeCitasProtectoraRecibida(Cita $cita): static
    {
        if ($this->citasProtectoraRecibidas->removeElement($cita)) {
            if ($cita->getIdProtectora() === $this) { 
                $cita->setIdProtectora(null);
            }
        }
        return $this;
    }

    public function getResetToken(): ?string
    {
        return $this->resetToken;
    }

    public function setResetToken(?string $resetToken): static
    {
        $this->resetToken = $resetToken;

        return $this;
    }

    public function getResetTokenExpiresAt(): ?\DateTime
    {
        return $this->resetTokenExpiresAt;
    }

    public function setResetTokenExpiresAt(?\DateTime $resetTokenExpiresAt): static
    {
        $this->resetTokenExpiresAt = $resetTokenExpiresAt;

        return $this;
    }
}