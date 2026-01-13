<?php

namespace App\Form;

use App\Entity\ReservasCitas;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\DateType;
use Symfony\Component\Form\Extension\Core\Type\TimeType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

class ReservasCitasType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('fechaCita', DateType::class, [
                'widget' => 'single_text',
                'label' => 'Fecha de la cita',
            ])
            ->add('horaCita', TimeType::class, [
                'widget' => 'single_text',
                'label' => 'Hora de la cita',
            ])
            ->add('estadoCita', ChoiceType::class, [
                'choices' => [
                    'Pendiente' => 'pendiente',
                    'Confirmada' => 'confirmada',
                    'Cancelada' => 'cancelada',
                ],
                'label' => 'Estado de la cita',
            ])
            // No agregamos idProtectora al formulario para que no sea editable
        ;
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => ReservasCitas::class,
        ]);
    }
}
