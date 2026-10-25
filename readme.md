# Sistema de Control de Inventario y Ventas para Farmacias

Plantilla de trabajo grupal para administrar el acceso de usuarios y preparar los módulos de farmacia. En esta versión solo están implementados el inicio de sesión y la gestión de usuarios; los demás módulos se muestran como pendientes para que cada integrante los desarrolle.

## Tecnologías

- Frontend: Vue 3, Vue Router, Vite y Tailwind CSS 4.
- Backend: Node.js, Express, PostgreSQL y bcrypt.
- Base de datos: PostgreSQL 15; esquema, procesos y datos iniciales en `database/`.
- Entorno local: Docker Compose y pgAdmin.

## Estructura

```text
.
├── .env.example
├── .gitignore
├── docker-compose.yml
├── database/
│   ├── 01_init.sql
│   ├── 02_procesos.sql
│   └── 03_datos_iniciales.sql
├── backend/
│   ├── config/db.js
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   └── server.js
└── frontend/
    └── src/
        ├── components/
        ├── router/
        └── views/
```

## Inicio rápido con Docker

1. Copia `.env.example` como `.env` y cambia las contraseñas y `SESSION_SECRET`. El secreto de sesión debe tener al menos 32 caracteres.
2. Inicia los servicios:

   ```sh
   docker compose up --build
   ```

3. Abre la aplicación y accede con la cuenta de administrador inicial:

   - Frontend: <http://localhost:5173>
   - API: <http://localhost:3000/api/health>
   - pgAdmin: <http://localhost:5050>
   - Correo inicial: `admin@farmacia.bo`
   - Contraseña inicial: `Admin123*`

Cambia la contraseña inicial y no reutilices las credenciales de desarrollo fuera de un entorno local. Los scripts de `database/` se ejecutan automáticamente solo cuando PostgreSQL crea un volumen vacío. Para conservar los datos al reiniciar, usa `docker compose down` (no agregues `-v`).

## Ejecución manual

1. Crea una base PostgreSQL y ejecuta en orden `database/01_init.sql`, `database/02_procesos.sql` y `database/03_datos_iniciales.sql`.
2. Configura las variables `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME` y `SESSION_SECRET` en el entorno del backend.
3. Instala y ejecuta backend y frontend:

   ```sh
   cd backend
   npm install
   npm run dev
   ```

   ```sh
   cd frontend
   npm install
   npm run dev
   ```

## API implementada

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/health` | Estado de la API y PostgreSQL |
| `POST` | `/api/login` | Inicio de sesión |
| `GET` | `/api/usuarios` | Lista de usuarios activos e inactivos |
| `GET` | `/api/usuarios/roles` | Lista de roles |
| `POST` | `/api/usuarios` | Crea un usuario |
| `PUT` | `/api/usuarios/:id` | Actualiza los datos y el rol; opcionalmente restablece la contraseña |
| `PATCH` | `/api/usuarios/:id/estado` | Activa o desactiva una cuenta |

La administración de usuarios requiere una sesión válida de un administrador activo. Las contraseñas se almacenan con bcrypt; nunca se guardan en texto plano.

## Módulos para el trabajo grupal

Medicamentos, lotes, proveedores, ventas, clientes, alertas, reportes, historial y configuración aparecen en la navegación como módulos en desarrollo. Sus pantallas y API deben implementarse contra el esquema de `database/01_init.sql`.
