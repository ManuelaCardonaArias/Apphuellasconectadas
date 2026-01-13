<?php

namespace App\DataFixtures;

use App\Entity\Usuario;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Faker\Factory;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class UsuarioFixtures extends Fixture
{
    private UserPasswordHasherInterface $passwordHasher;

    public function __construct(UserPasswordHasherInterface $passwordHasher)
    {
        $this->passwordHasher = $passwordHasher;
    }

    public function load(ObjectManager $manager): void
    {
        $faker = Factory::create('es_ES');

        for ($i = 0; $i < 10; $i++) {
            $usuario = new Usuario();
            $usuario->setEmail($faker->unique()->safeEmail);

            $roles = rand(0, 1) ? ['ROLE_PROTECTORA'] : ['ROLE_USER'];
            $usuario->setRoles($roles);

            $usuario->setPassword(
                $this->passwordHasher->hashPassword($usuario, 'password123')
            );

            $usuario->setIdentificacion($faker->numerify('##########'));
            $usuario->setNombre($faker->firstName);
            $usuario->setApellido($faker->lastName);
            $usuario->setDireccion($faker->address);
            $usuario->setTelefono($faker->phoneNumber);

            $usuario->setFechaRegistro($faker->dateTime());
            $usuario->setFechaNacimiento($faker->dateTimeBetween('-40 years', '-18 years'));
            $usuario->setDescripcionProtectora($faker->text(150));

            // Campo obligatorio añadido
            $usuario->setTipoVivienda(
                $faker->randomElement(['casa', 'apartamento', 'finca', 'habitacion'])
            );
$usuario->setTieneMascotas($faker->boolean());

            $manager->persist($usuario);
        }

        $manager->flush();
    }
}
