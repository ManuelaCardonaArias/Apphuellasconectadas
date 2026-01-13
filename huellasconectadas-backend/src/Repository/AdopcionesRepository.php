<?php

namespace App\Repository;

use App\Entity\Adopciones;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use App\Entity\Usuario; // Importar la entidad Usuario
/**
 * @extends ServiceEntityRepository<Adopciones>
 */
class AdopcionesRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Adopciones::class);
    }

public function findByShelter(Usuario $shelter): array
    {
        // Alias: a -> Adopciones, m -> Mascotas
        return $this->createQueryBuilder('a')
            // ASUMIMOS que Adopciones tiene un campo idMascota que se une con Mascotas (m)
            ->join('a.idMascota', 'm') 
            
            // ASUMIMOS que Mascotas tiene un campo idProtectora que es la entidad Usuario (el dueño)
            ->andWhere('m.id_usuario = :shelterId') 
            ->setParameter('shelterId', $shelter->getId())
            
            // Opcional: ordenar por fecha de solicitud (más reciente primero)
            ->orderBy('a.fechaSolicitud', 'DESC')
            ->getQuery()
            ->getResult()
        ;
    }
    //    /**
    //     * @return Adopciones[] Returns an array of Adopciones objects
    //     */
    //    public function findByExampleField($value): array
    //    {
    //        return $this->createQueryBuilder('a')
    //            ->andWhere('a.exampleField = :val')
    //            ->setParameter('val', $value)
    //            ->orderBy('a.id', 'ASC')
    //            ->setMaxResults(10)
    //            ->getQuery()
    //            ->getResult()
    //        ;
    //    }

    //    public function findOneBySomeField($value): ?Adopciones
    //    {
    //        return $this->createQueryBuilder('a')
    //            ->andWhere('a.exampleField = :val')
    //            ->setParameter('val', $value)
    //            ->getQuery()
    //            ->getOneOrNullResult()
    //        ;
    //    }
}
