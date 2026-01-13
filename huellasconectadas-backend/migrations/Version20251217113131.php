<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20251217113131 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE adopciones (id INT AUTO_INCREMENT NOT NULL, contrato VARCHAR(255) DEFAULT NULL, fecha_adopcion DATE DEFAULT NULL, estado_adopcion VARCHAR(255) NOT NULL, id_mascota_id INT NOT NULL, id_usuario_id INT NOT NULL, INDEX IDX_D34B637F5EEA4549 (id_mascota_id), INDEX IDX_D34B637F7EB2C349 (id_usuario_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci`');
        $this->addSql('CREATE TABLE cita (id INT AUTO_INCREMENT NOT NULL, fecha DATE NOT NULL, hora TIME NOT NULL, estado VARCHAR(255) NOT NULL, usuario_id INT NOT NULL, mascota_id INT NOT NULL, id_protectora_id INT DEFAULT NULL, INDEX IDX_3E379A62DB38439E (usuario_id), INDEX IDX_3E379A62FB60C59E (mascota_id), INDEX IDX_3E379A62CFCAA6FB (id_protectora_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci`');
        $this->addSql('CREATE TABLE donaciones (id INT AUTO_INCREMENT NOT NULL, monto DOUBLE PRECISION NOT NULL, metodo_pago VARCHAR(255) NOT NULL, stripe_payment_id VARCHAR(255) DEFAULT NULL, paypal_order_id VARCHAR(255) DEFAULT NULL, fecha DATETIME NOT NULL, nombre_donante VARCHAR(255) DEFAULT NULL, usuario_id INT DEFAULT NULL, INDEX IDX_BA34A102DB38439E (usuario_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci`');
        $this->addSql('CREATE TABLE mascotas (id INT AUTO_INCREMENT NOT NULL, nombre VARCHAR(255) NOT NULL, especie VARCHAR(255) NOT NULL, raza VARCHAR(255) DEFAULT NULL, edad INT DEFAULT NULL, descripcion TEXT DEFAULT NULL, tamano VARCHAR(255) DEFAULT NULL, estado_mascota VARCHAR(255) DEFAULT NULL, imagenes JSON DEFAULT NULL, temperamento VARCHAR(255) DEFAULT NULL, id_usuario_id INT NOT NULL, INDEX IDX_D57E02197EB2C349 (id_usuario_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci`');
        $this->addSql('CREATE TABLE usuario (id INT AUTO_INCREMENT NOT NULL, email VARCHAR(180) NOT NULL, roles JSON NOT NULL, password VARCHAR(255) NOT NULL, identificacion VARCHAR(50) DEFAULT NULL, nombre VARCHAR(100) NOT NULL, apellido VARCHAR(100) DEFAULT NULL, direccion VARCHAR(255) DEFAULT NULL, telefono VARCHAR(20) DEFAULT NULL, fecha_nacimiento DATE DEFAULT NULL, fecha_registro DATE DEFAULT NULL, descripcion_protectora LONGTEXT DEFAULT NULL, tipo_vivienda VARCHAR(255) DEFAULT NULL, tiene_mascotas TINYINT DEFAULT NULL, reset_token VARCHAR(255) DEFAULT NULL, reset_token_expires_at DATETIME DEFAULT NULL, UNIQUE INDEX UNIQ_IDENTIFIER_EMAIL (email), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci`');
        $this->addSql('CREATE TABLE messenger_messages (id BIGINT AUTO_INCREMENT NOT NULL, body LONGTEXT NOT NULL, headers LONGTEXT NOT NULL, queue_name VARCHAR(190) NOT NULL, created_at DATETIME NOT NULL, available_at DATETIME NOT NULL, delivered_at DATETIME DEFAULT NULL, INDEX IDX_75EA56E0FB7336F0 (queue_name), INDEX IDX_75EA56E0E3BD61CE (available_at), INDEX IDX_75EA56E016BA31DB (delivered_at), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_unicode_ci`');
        $this->addSql('ALTER TABLE adopciones ADD CONSTRAINT FK_D34B637F5EEA4549 FOREIGN KEY (id_mascota_id) REFERENCES mascotas (id)');
        $this->addSql('ALTER TABLE adopciones ADD CONSTRAINT FK_D34B637F7EB2C349 FOREIGN KEY (id_usuario_id) REFERENCES usuario (id)');
        $this->addSql('ALTER TABLE cita ADD CONSTRAINT FK_3E379A62DB38439E FOREIGN KEY (usuario_id) REFERENCES usuario (id)');
        $this->addSql('ALTER TABLE cita ADD CONSTRAINT FK_3E379A62FB60C59E FOREIGN KEY (mascota_id) REFERENCES mascotas (id)');
        $this->addSql('ALTER TABLE cita ADD CONSTRAINT FK_3E379A62CFCAA6FB FOREIGN KEY (id_protectora_id) REFERENCES usuario (id)');
        $this->addSql('ALTER TABLE donaciones ADD CONSTRAINT FK_BA34A102DB38439E FOREIGN KEY (usuario_id) REFERENCES usuario (id)');
        $this->addSql('ALTER TABLE mascotas ADD CONSTRAINT FK_D57E02197EB2C349 FOREIGN KEY (id_usuario_id) REFERENCES usuario (id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE adopciones DROP FOREIGN KEY FK_D34B637F5EEA4549');
        $this->addSql('ALTER TABLE adopciones DROP FOREIGN KEY FK_D34B637F7EB2C349');
        $this->addSql('ALTER TABLE cita DROP FOREIGN KEY FK_3E379A62DB38439E');
        $this->addSql('ALTER TABLE cita DROP FOREIGN KEY FK_3E379A62FB60C59E');
        $this->addSql('ALTER TABLE cita DROP FOREIGN KEY FK_3E379A62CFCAA6FB');
        $this->addSql('ALTER TABLE donaciones DROP FOREIGN KEY FK_BA34A102DB38439E');
        $this->addSql('ALTER TABLE mascotas DROP FOREIGN KEY FK_D57E02197EB2C349');
        $this->addSql('DROP TABLE adopciones');
        $this->addSql('DROP TABLE cita');
        $this->addSql('DROP TABLE donaciones');
        $this->addSql('DROP TABLE mascotas');
        $this->addSql('DROP TABLE usuario');
        $this->addSql('DROP TABLE messenger_messages');
    }
}
