🐾 Huellas Conectadas

Huellas Conectadas es una plataforma web dedicada a facilitar la adopción de mascotas, conectar refugios con adoptantes responsables y permitir donaciones seguras para apoyar a organizaciones protectoras de animales.

El sistema integra notificaciones, pagos, generación de documentos y autenticación segura, brindando una experiencia moderna y confiable.

🚀 Características Principales

🐶 Publicación y visualización de mascotas disponibles para adopción

📝 Solicitudes de adopción en línea

💬 Envío de notificaciones por WhatsApp (Twilio)

📧 Envío de correos electrónicos automáticos

💳 Donaciones mediante Stripe y PayPal

📄 Generación de documentos PDF desde el frontend

🔐 Autenticación segura con JWT

👥 Gestión de usuarios (adoptantes,refugios/protectoras)

🛠️ Tecnologías Utilizadas
Frontend

⚛️ React

🟦 TypeScript

📄 Generación de PDF desde el cliente

🔐 Manejo de tokens JWT

Backend

🐘 Symfony

🔑 Autenticación JWT

📧 Mailer

💬 Twilio API (WhatsApp)

💳 Stripe API

💰 PayPal API

Base de Datos

🗄️ MySQL

🔐 Seguridad

Autenticación mediante JSON Web Tokens (JWT)

Protección de rutas y control de roles

Validaciones de datos en frontend y backend

⚙️ Instalación
Backend (Symfony)
cd backend
composer install
cp .env .env.local
php bin/console doctrine:database:create
php bin/console doctrine:migrations:migrate
php -S localhost:8000 -t public

Frontend (React)
cd frontend
npm install
npm run dev

🔑 Variables de Entorno
JWT_SECRET=
TWILIO_SID=
TWILIO_TOKEN=
STRIPE_SECRET_KEY=
PAYPAL_CLIENT_ID=
MAILER_DSN=
DATABASE_URL="mysql://user:password@127.0.0.1:3306/huellas_conectadas"

🤝 Contribuciones

Las contribuciones son bienvenidas 🐕
Abre un issue o pull request para proponer mejoras.
