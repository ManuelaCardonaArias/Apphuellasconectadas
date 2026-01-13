<?php
namespace App\Form;

use App\Entity\Adopciones;
use App\Entity\Mascotas;
use App\Entity\Usuario;
use Symfony\Bridge\Doctrine\Form\Type\EntityType;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
use Doctrine\ORM\EntityRepository;

class AdopcionesType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        // 👇 recogemos la opción que viene del controlador
        $usuarios = $options['usuariosConRolUser'];

        $builder
            ->add('fechaSolicitud')
            ->add('fechaAdopcion')
            ->add('estadoAdopcion')
            ->add('idMascota', EntityType::class, [
                'class' => Mascotas::class,
                'choice_label' => function ($mascota) {
                    return $mascota->getNombre() . ' - ' . $mascota->getEspecie();
                },
                'query_builder' => function (EntityRepository $er) {
                    return $er->createQueryBuilder('m')
                        ->where('m.estadoMascota = :disponible')
                        ->setParameter('disponible', 'disponible')
                        ->orderBy('m.nombre', 'ASC');
                },
            ])
            ->add('idUsuario', EntityType::class, [
                'class' => Usuario::class,
                'choices' => $usuarios, // 👈 ahora sí definido
                'choice_label' => fn(Usuario $usuario) => $usuario->getNombre() . ' ' . $usuario->getApellido(),
            ]);
    }

   public function configureOptions(OptionsResolver $resolver): void
{
    $resolver->setDefaults([
        'data_class' => Adopciones::class,
        'usuariosConRolUser' => [], // 👈 opción personalizada con valor por defecto
    ]);
}

}