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
│   ├── 03_datos_iniciales.sql
│   └── 04_actualizar_contrasenas.sql
├── backend/
│   ├── config/
│   │   ├── db.js
│   │   └── password.js
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── scripts/generar-hash.js
│   └── server.js
└── frontend/
    └── src/
        ├── components/
        ├── router/
        └── views/
```

## Credenciales de acceso (solo desarrollo)

Las tres cuentas de demostración comparten la misma contraseña.

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@farmacia.bo` | `Passw123` |
| Encargado de inventario | `inventario@farmacia.bo` | `Passw123` |
| Ventas (Personal de atención) | `ventas@farmacia.bo` | `Passw123` |

Direcciones del sistema cuando está en marcha:

| Servicio | URL |
|---|---|
| Frontend | <http://localhost:5173> |
| API (estado) | <http://localhost:3000/api/health> |
| pgAdmin | <http://localhost:5050> |

Las contraseñas se guardan como hash bcrypt (coste 12). Cámbialas y no reutilices estas credenciales fuera de un entorno local.

## Trabajo con Git

### Clonar el repositorio (solo la primera vez)

```sh
git clone <URL-DEL-REPOSITORIO>
cd <carpeta-del-repositorio>
cp .env.example .env        # en Windows: copy .env.example .env
```

Edita `.env`: cambia las contraseñas y `SESSION_SECRET` (mínimo 32 caracteres). El archivo `.env` nunca se sube a Git.

### Descargar los cambios de los demás

Hazlo siempre antes de empezar a trabajar y antes de subir tus cambios:

```sh
git pull
```

Después del `git pull`, revisa qué cambió:

| Si cambió... | Ejecuta |
|---|---|
| `package.json` de `backend/` o `frontend/` | `npm install` dentro de esa carpeta |
| Algún archivo de `database/` | `docker compose down -v` y luego `docker compose up -d db` (recrea la base y **borra los datos locales**) |
| `docker-compose.yml` o un `Dockerfile` | `docker compose up -d --build` |

### Subir tus cambios

```sh
git status                                  # revisa qué modificaste
git add .
git commit -m "RF2: búsqueda de medicamentos por código de barras"
git push
```

Si `git push` es rechazado, es porque alguien subió antes que tú: ejecuta `git pull` y vuelve a hacer `git push`.

### Si hay un conflicto

1. Git marca los archivos en conflicto con `<<<<<<<`, `=======` y `>>>>>>>`.
2. Abre cada archivo, deja la versión correcta y borra las marcas.
3. Ejecuta `git add .`, luego `git commit` y `git push`.

### Reglas del equipo

- Escribe los mensajes de commit con el requisito: `RF1: ...`, `RF3: ...`.
- Cada integrante trabaja sobre los archivos de su módulo. Avisa antes de tocar archivos compartidos: `docker-compose.yml`, `database/01_init.sql`, `server.js` y `router/index.js`.
- No subas `.env`, `credenciales.txt` ni `node_modules`.
- Sube tus cambios antes de pasar la tarea a "En pruebas" en el tablero.

## Modo de trabajo

### 1. Solo la base de datos

Levanta únicamente PostgreSQL (puerto 5432):

```sh
docker compose up -d db
```

Con pgAdmin (administrador web de la base de datos):

```sh
docker compose up -d db pgadmin
```

En pgAdmin (<http://localhost:5050>) registra el servidor con host `db`, puerto `5432` y el usuario y la contraseña definidos en `.env`.

### 2. Desarrollo de backend y frontend

Con la base de datos en marcha, ejecuta cada parte en su propia terminal:

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

`npm install` solo hace falta la primera vez y cuando cambie `package.json`. Cuando el backend corre fuera de Docker, usa `DB_HOST=localhost` (dentro de Docker Compose el host es `db`). Variables necesarias: `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME` y `SESSION_SECRET`.

### 3. Despliegue del sistema completo

Levanta base de datos, pgAdmin, backend y frontend:

```sh
docker compose up -d
```

Comandos útiles:

```sh
docker compose up -d --build      # reconstruye las imágenes tras cambiar código o dependencias
docker compose logs -f backend    # ver los registros del backend
docker compose ps                 # estado de los servicios
docker compose down               # detiene todo y conserva los datos
docker compose down -v            # detiene todo y BORRA la base de datos
```

Los scripts de `database/` se ejecutan automáticamente **solo cuando PostgreSQL crea un volumen vacío**. Para conservar los datos al reiniciar, usa `docker compose down` (sin `-v`).

### Ejecución manual (sin Docker)

1. Crea una base PostgreSQL y ejecuta en orden `database/01_init.sql`, `database/02_procesos.sql`, `database/03_datos_iniciales.sql` y `database/04_actualizar_contrasenas.sql`.
2. Configura las variables del backend indicadas arriba.
3. Ejecuta backend y frontend con `npm install` y `npm run dev`.

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

La administración de usuarios requiere una sesión válida de un administrador activo. Las contraseñas se almacenan con bcrypt (coste 12) mediante `backend/config/password.js`; nunca se guardan en texto plano.

### Contraseñas y bcrypt

Para generar un hash nuevo:

```sh
cd backend
npm run hash -- "NuevaClaveSegura123*"
```

El hash resultante puede colocarse en `database/03_datos_iniciales.sql` o aplicarse a todas las cuentas existentes con `database/04_actualizar_contrasenas.sql`. Este último script unifica la contraseña de todos los usuarios y debe ejecutarse una sola vez en una base existente.

## Módulos del sistema

El sistema tiene 4 módulos, definidos en el informe de requisitos (RF1 a RF6, RNF y reglas de dominio RD).

| Módulo | Responsable | Requisitos |
|---|---|---|
| Seguridad y administración | Moisés | RF1, RNF1 |
| Gestión de inventario | Bryan | RF2, RF3, RF4, RD1, RD3, RD4 |
| Ventas y atención al cliente | Rodrigo | RF5, RD5, RNF2 |
| Analítica y reportes | Víctor | RF6, RNF1 (historial) |

### 1. Seguridad y administración (Moisés)

**Qué abarca**
- Inicio de sesión: solo con credenciales válidas y cuenta activa.
- Administración de cuentas: crear, modificar y desactivar usuarios, y asignar roles.
- Parámetros generales: margen de alerta de vencimiento (30 días por defecto) y stock de seguridad. Los usa el módulo de inventario.
- Control de acceso por rol en toda la API, según la matriz de permisos.
- Contraseñas cifradas (bcrypt).

**Matriz de permisos**

| Función | Administrador | Encargado de inventario | Personal de atención |
|---|:---:|:---:|:---:|
| Iniciar sesión | Sí | Sí | Sí |
| Administrar usuarios y parámetros | Sí | No | No |
| Gestionar el catálogo de medicamentos | Sí | Sí | No |
| Consultar catálogo, stock y alertas | Sí | Sí | Sí |
| Registrar proveedores y recepcionar lotes | Sí | Sí | No |
| Dar de baja lotes vencidos | Sí | No | No |
| Procesar ventas y registrar clientes | Sí | No | Sí |
| Generar reportes y consultar el historial | Sí | No | No |

**Tablas:** `rol`, `usuario`, `parametro_sistema`. **Pantallas:** `LoginView`, `UsuariosView`, `ConfiguracionView`, `PerfilView`.
**Pruebas:** CP-01 (acceso válido, inválido y cuenta desactivada) y CP-07 (rol sin permiso rechazado, contraseña cifrada).

### 2. Gestión de inventario (Bryan)

**Qué abarca**
- **Catálogo (RF2):** registrar y actualizar medicamentos con nombre comercial, DCI, concentración, forma farmacéutica, categoría, precio, tipo de venta (libre o con receta) y código de barras. Búsqueda por nombre, principio activo, categoría o código de barras, mostrando precio y stock vigente.
- **Proveedores y recepción de lotes (RF3):** registrar proveedores y recepcionar entregas exigiendo proveedor, número de lote, fecha de vencimiento y costo. La recepción suma al stock y la venta lo descuenta, sin permitir stock negativo.
- **Reorden (RD4):** calcular el punto de reorden `ROP = (D × L) + SS` y alertar cuando el stock sea menor o igual a ese valor.
- **Baja de lotes vencidos (RF3):** solo el Administrador.
- **Vencimientos (RF4):** alerta 30 días antes (margen configurable), advertencia en caja y bloqueo de la venta de lotes vencidos.
- Conservar lote y proveedor en cada entrada y salida (RD1).

**Tablas:** `categoria`, `forma_farmaceutica`, `medicamento`, `proveedor`, `lote`. **Pantallas:** `MedicamentosView`, `LotesView`, `ProveedoresView`, `AlertasView`.
**Pruebas:** CP-02, CP-12 (catálogo); CP-03, CP-10, CP-13 (lotes, stock y reorden); CP-04, CP-11 (vencimientos).

### 3. Ventas y atención al cliente (Rodrigo)

**Qué abarca**
- Carrito de venta: agregar productos buscándolos en el catálogo, con subtotal, total y cambio en bolivianos (Bs) con dos decimales, y descuento porcentual.
- Cliente: exigir nombre completo y CI/NIT, y guardar sus datos de contacto.
- Medicamentos con receta (RD5): exigir datos del paciente, del médico y su matrícula. Sin ellos no se confirma la venta.
- Pago en efectivo (la pasarela de pago queda para una versión posterior).
- Comprobante: nota de venta o factura, en pantalla o impreso (no se envía por correo).
- Al confirmar: descontar el stock del lote, advertir si está en margen de alerta, bloquear lotes vencidos y rechazar cantidades mayores al stock.
- Registrar en el historial quién hizo la venta.

**Tablas:** `persona`, `cliente`, `medico`, `venta`, `detalle_venta`, `comprobante_venta`. **Pantallas:** `VentasView`, `ClientesView`, `ComprobanteVenta.vue`.
**Pruebas:** CP-05 (cálculo, cambio y rechazos), CP-14 (receta), CP-08 (venta de 3 productos en 3 minutos).

### 4. Analítica y reportes (Víctor)

**Qué abarca**
- Reportes de ventas, inventario, lotes por vencer y lotes vencidos, filtrados por fecha y exportables a PDF o Excel. Solo el Administrador.
- Historial de ventas, recepciones y bajas: quién realizó cada operación y cuándo. No se puede modificar ni eliminar.

**Tablas:** `historial_operacion` (y lectura de `venta`, `detalle_venta` y `lote`). **Pantallas:** `ReportesView`, `HistorialView`.
**Pruebas:** CP-06 (generar y exportar los 4 reportes, consultar el historial) y CP-07 (historial sin edición).

## Planificación por sprint

Son 2 sprints. Los módulos que no tienen entregable en un sprint pasan al siguiente.

### Sprint 1: 20/10 al 30/10 (RF1 y RF2)

Objetivo de la revisión: inicio de sesión, gestión de cuentas y búsqueda de medicamentos por nombre o código.

| Módulo | Responsable | Debe quedar implementado |
|---|---|---|
| Seguridad y administración | Moisés | Inicio de sesión, usuarios y roles (ya implementado en la plantilla). Middleware de permisos por rol. Parámetros del sistema (margen de alerta y stock de seguridad), que deben estar listos a más tardar al iniciar el Sprint 2 porque el inventario los usa. |
| Gestión de inventario | Bryan | Solo el catálogo (RF2): categorías, formas farmacéuticas y medicamentos con alta, edición y búsqueda por nombre, principio activo, categoría y código de barras. Registro con DCI, concentración y forma (RD3). |
| Ventas y atención al cliente | Rodrigo | Sin entregable en este sprint. Pasa al Sprint 2. |
| Analítica y reportes | Víctor | Sin entregable en este sprint. Pasa al Sprint 2. |

Pruebas: CP-01, CP-02 y CP-12. Revisión y retrospectiva: 29/10 y 30/10.

### Sprint 2: 02/11 al 10/11 (RF3, RF4, RF5 y RF6)

Objetivo de la revisión: recepción de lotes, actualización de stock, alertas, bloqueo de vencidos, venta básica y revisión inicial de reportes.

| Módulo | Responsable | Debe quedar implementado |
|---|---|---|
| Seguridad y administración | Moisés | Aplicar la matriz de permisos a las rutas de todos los módulos (CP-07). Apoyo en la integración y en la prueba con 5 usuarios. |
| Gestión de inventario | Bryan | Proveedores, recepción de lotes y actualización de stock (RF3). Alerta de reorden (RD4). Baja de lotes vencidos. Alerta de 30 días y bloqueo de vencidos (RF4). |
| Ventas y atención al cliente | Rodrigo | Flujo básico de venta (RF5): carrito, total, cambio, cliente, receta, comprobante y descuento de stock. Empieza con los lotes de prueba de `03_datos_iniciales.sql` mientras inventario termina la recepción. |
| Analítica y reportes | Víctor | Reporte esencial (se sugiere el de ventas) e historial de operaciones. Después, completar los 4 reportes con exportación a PDF y Excel. |

Pruebas: CP-03 a CP-11, CP-13 y CP-14. Integración y pruebas de todo el equipo el 09/11, incluida la prueba de rendimiento con 5 usuarios (CP-09, RNF3). Validación final y entrega el 10/11.