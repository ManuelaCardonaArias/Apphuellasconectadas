# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
 #  React - Frontend
Después de clonar el repositorio hay que instalar:

npm install --save-dev vite
npm run dev   # Iniciar servidor
# Dependencia para generar pdf
npm install jspdf

#Iniciar servicio de correo(terminal diferente a symfony serve)
php bin/console messenger:consume async -vv

# Symfony - Backend

# Instalar dependencias
composer install

# Instalar bundles necesarios
composer require nelmio/cors-bundle
composer require lexik/jwt-authentication-bundle

# Generar claves JWT
mkdir -p config/jwt
openssl genrsa -out config/jwt/private.pem -aes256 4096
# pass phrase: huellas
openssl rsa -pubout -in config/jwt/private.pem -out config/jwt/public.pem
# pass phrase: huellas

# Iniciar servidor Symfony
symfony server:start

# Uso de Stripe para pagar con tarjeta
composer require stripe/stripe-php symfony/http-client symfony/dom-crawler

# Limpiar cache
php bin/console cache:clear

#instalar componentes para paypal
composer require paypal/paypal-checkout-sdk
#intalar dependencias react
npm install @stripe/stripe-js @stripe/react-stripe-js
#Modificar php.ini para paypal
https://www.php.net/manual/en/curl.configuration.php
https://curl.se/docs/caextract.html(descargar)
curl.cainfo = "/ruta/completa/a/tu/certificado_root.pem"
# PDF
composer require dompdf/dompdf