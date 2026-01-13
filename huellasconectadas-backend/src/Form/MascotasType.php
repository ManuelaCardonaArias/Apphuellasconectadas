<?php

namespace App\Form;

use App\Entity\Mascotas;
use App\Entity\Usuario;
use Symfony\Bridge\Doctrine\Form\Type\EntityType;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;
//importaciones adicionales
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\FileType;


class MascotasType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('nombre')
            ->add('especie')
            ->add('raza')
            ->add('edad')
            ->add('descripcion')
            ->add('tamano', ChoiceType::class, [
    'choices' => [
        'Grande' => 'grande',
        'Mediano' => 'mediano',
        'Pequeño' => 'pequeño'
    ]
])

            ->add('estadoMascota', ChoiceType::class, [
    'choices' => [
        'Disponible' => 'disponible',
        'Adoptado' => 'adoptado',
        'En proceso' => 'en_proceso'
    ]
])

          ->add('imagenesFiles', FileType::class, [
            'label' => 'Imágenes',
            'mapped' => false,
            'required' => false,
            'multiple' => true,
            'attr' => ['accept' => 'image/*'],
        ])

            ->add('temperamento')
 
        ;
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => Mascotas::class,
        ]);
    }
}
