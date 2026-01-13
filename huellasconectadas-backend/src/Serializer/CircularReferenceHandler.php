<?php
namespace App\Serializer;

class CircularReferenceHandler
{
    public static function handle($object)
    {
        return $object->getId(); // devuelve el ID en lugar de seguir la relación
    }
}