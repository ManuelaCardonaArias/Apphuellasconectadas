<?php

namespace App\Entity;

use App\Repository\MascotasRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use App\Entity\Usuario;
use Symfony\Component\Serializer\Annotation\Groups; // <-- Asegúrate de tener este use
use Symfony\Component\Serializer\Annotation\Ignore; // <--- IMPORTANTE AÑADIR ESTO ARRIBA
#[ORM\Entity(repositoryClass: MascotasRepository::class)]
class Mascotas implements \JsonSerializable // Afegim JsonSerializable
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'mascotas')]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['adopciones:read'])] // <-- Añadir grupo
    private ?Usuario $id_usuario = null; // Manté la teva definició: id_usuario

    #[ORM\Column(length: 255)]
    #[Groups(['adopciones:read'])] // <-- Añadir grupo
    private ?string $nombre = null;

    #[ORM\Column(length: 255)]
    private ?string $especie = null; // 'Perro', 'Gato', etc.

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['adopciones:read'])] // <-- Añadir grupo
    private ?string $raza = null;

    #[ORM\Column(nullable: true)]
    private ?int $edad = null;

    #[ORM\Column(type: 'text', length: 500, nullable: true)]
    private ?string $descripcion = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $tamano = null; // 'Pequeño', 'Mediano', 'Grande'

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $estadoMascota = null; // 'Disponible', 'Adoptado', 'Reservado'

    #[ORM\Column(type: 'json', nullable: true)]
    private array $imagenes = [];

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $temperamento = null;
    
    /**
     * @var Collection<int, Adopciones>
     */
    #[ORM\OneToMany(targetEntity: Adopciones::class, mappedBy: 'idMascota')]
    #[Ignore] // <--- ESTO CORTA EL BUCLE INFINITO
    private Collection $adopciones;


    public function __construct()
    {
        $this->adopciones = new ArrayCollection();
    }
    
    // --- Getters i Setters ---

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getIdUsuario(): ?Usuario
    {
        return $this->id_usuario;
    }

    public function setIdUsuario(?Usuario $id_usuario): static
    {
        $this->id_usuario = $id_usuario;

        return $this;
    }

    public function getNombre(): ?string
    {
        return $this->nombre;
    }

    public function setNombre(string $nombre): static
    {
        $this->nombre = $nombre;

        return $this;
    }

    public function getEspecie(): ?string
    {
        return $this->especie;
    }

    public function setEspecie(string $especie): static
    {
        $this->especie = $especie;

        return $this;
    }

    public function getRaza(): ?string
    {
        return $this->raza;
    }

    // Hem canviat la signatura per permetre null
    public function setRaza(?string $raza): static
    {
        $this->raza = $raza;

        return $this;
    }

    public function getEdad(): ?int
    {
        return $this->edad;
    }

    // Hem canviat la signatura per permetre null
    public function setEdad(?int $edad): static
    {
        $this->edad = $edad;

        return $this;
    }

    public function getDescripcion(): ?string
    {
        return $this->descripcion;
    }

    public function setDescripcion(?string $descripcion): static
    {
        $this->descripcion = $descripcion;

        return $this;
    }

    public function getTamano(): ?string
    {
        return $this->tamano;
    }

    // Hem canviat la signatura per permetre null
    public function setTamano(?string $tamano): static
    {
        $this->tamano = $tamano;

        return $this;
    }

    public function getEstadoMascota(): ?string
    {
        return $this->estadoMascota;
    }

    // Hem canviat la signatura per permetre null
    public function setEstadoMascota(?string $estadoMascota): static
    {
        $this->estadoMascota = $estadoMascota;

        return $this;
    }

    public function getImagenes(): array
    {
        return $this->imagenes;
    }

    // Hem canviat la signatura per permetre null
    public function setImagenes(?array $imagenes): static
    {
        $this->imagenes = $imagenes ?? [];
        return $this;
    }

    public function getTemperamento(): ?string
    {
        return $this->temperamento;
    }

    public function setTemperamento(?string $temperamento): static
    {
        $this->temperamento = $temperamento;
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
            $adopcione->setIdMascota($this);
        }

        return $this;
    }

    public function removeAdopcione(Adopciones $adopcione): static
    {
        if ($this->adopciones->removeElement($adopcione)) {
            // set the owning side to null (unless already changed)
            if ($adopcione->getIdMascota() === $this) {
                $adopcione->setIdMascota(null);
            }
        }

        return $this;
    }

    // Mètode per serialitzar a JSON (per a l'API)
    public function jsonSerialize(): array
    {
        return [
            'id' => $this->getId(),
            'nombre' => $this->getNombre(),
            'especie' => $this->getEspecie(),
            'raza' => $this->getRaza(),
            'edad' => $this->getEdad(),
            'descripcion' => $this->getDescripcion(),
            'tamano' => $this->getTamano(),
            'estado_mascota' => $this->getEstadoMascota(),
            'imagenes' => $this->getImagenes(),
            'temperamento' => $this->getTemperamento(),
            // CRUCIAL: Utilitzar id_usuario, que és la propietat de l'entitat
            'id_usuario_id' => $this->getIdUsuario() ? $this->getIdUsuario()->getId() : null, 
        ];
    }
}