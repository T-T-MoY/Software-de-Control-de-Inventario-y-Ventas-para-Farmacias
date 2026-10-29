# Sistema de Control de Inventario y Ventas para Farmacias

Plantilla de trabajo grupal para administrar el acceso de usuarios y preparar los módulos de farmacia. Están implementados el inicio de sesión, la gestión de usuarios y roles, el perfil del usuario, el middleware de permisos por rol y los parámetros generales del sistema; los demás módulos se muestran como pendientes para que cada integrante los desarrolle.

## Reparto del equipo

| Persona | Sección / módulo | En pocas palabras (qué y dónde) |
|---|---|---|
| Persona 1 (Moisés) | Seguridad y administración | (login, usuarios, roles y permisos) |
| Persona 2 (Bryan) | Gestión de inventario | (medicamentos, lotes, proveedores y alertas) |
| Persona 3 (Rodrigo) | Ventas y atención al cliente | (ventas, clientes, recetas y comprobante) |
| Persona 4 (Víctor) | Analítica y reportes | (reportes, historial y exportaciones) |

Cada persona trabaja en su módulo. Las tablas, pantallas y pruebas de cada uno están detalladas en **Módulos del sistema**. Antes de tocar archivos compartidos (`server.js`, `router/index.js`, `database/` o `docker-compose.yml`), avisa al equipo.

## Tecnologías

- Frontend: Vue 3, Vue Router, Vite y Tailwind CSS 4.
- Backend: Node.js, Express, PostgreSQL y bcrypt.
- Base de datos: PostgreSQL 15; esquema, procesos y datos iniciales en `database/`.
- Entorno local: Docker Compose y pgAdmin.

## Estructura del proyecto

Esta es la estructura real con la que trabaja el equipo. Los nombres de carpetas y archivos dentro de `backend/` y `frontend/` están en inglés; los identificadores, mensajes y textos de la interfaz siguen en español.

```text
.
├── .env.example
├── .gitignore
├── docker-compose.yml
├── readme.md
│
├── docs/
│   ├── ARQUITECTURA-MULTICAPA.md
│   └── MODELO-DATOS.md
│
├── database/                       # esquema y datos iniciales
│   ├── 01_init.sql                 # tablas
│   ├── 02_inserts.sql              # datos de ejemplo
│   └── 03_estado_cuenta_eliminado.sql  # estado 'Eliminado' para usuarios
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── server.js                   # arranque y registro de rutas
│   ├── config/
│   │   ├── env.js                  # carga del .env
│   │   └── parameters.js           # margen de 30 días y datos de la farmacia
│   ├── presentation/               # Capa 13.1
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── users.routes.js
│   │   │   ├── profile.routes.js
│   │   │   └── parameters.routes.js
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── users.controller.js
│   │   │   ├── profile.controller.js
│   │   │   └── parameters.controller.js
│   │   ├── middleware/
│   │   │   ├── authentication.js
│   │   │   ├── authorization.js
│   │   │   └── errors.js
│   │   └── validators/
│   │       ├── fields.js
│   │       └── user.validator.js
│   ├── business/                   # Capa 13.2
│   │   ├── services/
│   │   │   ├── auth.service.js
│   │   │   ├── users.service.js
│   │   │   ├── profile.service.js
│   │   │   └── parameters.service.js
│   │   ├── rules/
│   │   │   ├── permissions.js
│   │   │   └── users.rules.js
│   │   ├── security/
│   │   │   ├── passwords.js
│   │   │   └── session.js
│   │   └── errors/
│   │       └── app-error.js
│   ├── data/                       # Capa 13.3
│   │   ├── connection.js           # pool de PostgreSQL + conTransaccion()
│   │   ├── repositories/
│   │   │   ├── users.repository.js
│   │   │   └── roles.repository.js
│   │   └── mappers/
│   │       └── user.mapper.js
│   ├── scripts/
│   │   └── generate-hash.js
│   └── uploads/
│
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── public/
    │   └── favicon.svg
    └── src/
        ├── main.js
        ├── App.vue
        ├── assets/
        │   ├── css/
        │   │   ├── tailwind.css
        │   │   └── style.css
        │   └── img/
        │       └── hero.png
        ├── config/
        │   └── distribution.js   # módulos y responsables del equipo
        ├── data/                 # Capa 13.3
        │   ├── api.js
        │   └── endpoints/
        │       ├── auth.js
        │       ├── users.js
        │       └── profile.js
        ├── business/             # Capa 13.2
        │   ├── format.js
        │   └── session.js
        └── presentation/         # Capa 13.1
            ├── theme.js
            ├── components/
            │   ├── Sidebar.vue
            │   ├── Topbar.vue
            │   ├── ThemeToggle.vue
            │   └── SaleReceipt.vue   # comprobante de 80 mm (nuevo)
            ├── router/
            │   └── index.js
            ├── validators/
            │   ├── fields.js
            │   └── user.js
            └── views/
                ├── DashboardView.vue
                ├── LoginView.vue
                ├── ProfileView.vue
                └── UsersView.vue
```

## Arquitectura multicapa

El proyecto está separado en tres capas y las dependencias siempre apuntan hacia abajo: **presentation → business → data**. Ninguna capa superior se salta a la inferior y ninguna capa inferior conoce a la superior.

```text
┌──────────────────────────────────────────────────────────────┐
│ PRESENTATION (13.1)                                          │
│ Rutas, controladores, middleware, vistas, formularios        │
│ y validaciones de entrada.                                   │
└───────────────────────────┬──────────────────────────────────┘
                            │ llama a
┌───────────────────────────▼──────────────────────────────────┐
│ BUSINESS (13.2)                                              │
│ Casos de uso, reglas, permisos, cálculos y seguridad.        │
│ No conoce Express ni SQL.                                    │
└───────────────────────────┬──────────────────────────────────┘
                            │ llama a
┌───────────────────────────▼──────────────────────────────────┐
│ DATA (13.3)                                                  │
│ Repositorios con SQL, mapeadores, conexión y transacciones.  │
└───────────────────────────┬──────────────────────────────────┘
                            │
                    PostgreSQL (database/)
```

| Capa | Backend | Frontend | Responsabilidad |
|---|---|---|---|
| Presentación (13.1) | `presentation/` | `presentation/` | Rutas, controladores, middleware, vistas, componentes, formularios y validaciones de entrada |
| Negocio (13.2) | `business/` | `business/` | Reglas, permisos, cálculos, casos de uso y seguridad; no conoce Express ni SQL |
| Datos (13.3) | `data/` | `data/` | Repositorios con SQL, mapeadores, conexión, transacciones y cliente HTTP |

Reglas que todos deben respetar:

1. **Presentation → Business → Data.** Nunca al revés.
2. Ningún controlador escribe SQL: llama a un servicio.
3. Ningún repositorio conoce `req`, `res` ni códigos HTTP.
4. Ningún servicio importa Express.
5. Los errores de negocio se lanzan como `ErrorAplicacion` (`business/errors/app-error.js`) y la capa de presentación decide el estado HTTP.
6. En el frontend, las vistas no arman `fetch` ni escriben claves de `localStorage`: usan `data/endpoints/*` y `business/session.js`.

### Qué hace cada carpeta del backend

| Carpeta | Qué va aquí | Qué NO va aquí |
|---|---|---|
| `config/` | Variables de entorno y parámetros generales | Reglas de negocio ni SQL |
| `presentation/routes/` | Declaración de endpoints y middleware | Validaciones ni consultas |
| `presentation/controllers/` | Leer `req`, validar forma, llamar al servicio y responder | SQL ni reglas de negocio |
| `presentation/middleware/` | Autenticación, autorización y manejo de errores | Matriz de permisos ni acceso a datos |
| `presentation/validators/` | Formato, obligatoriedad y longitudes de los campos | Decidir si una operación está permitida |
| `business/services/` | Un caso de uso por operación (`crear`, `actualizar`, `registrarVenta`, etc.) | HTTP ni SQL |
| `business/rules/` | Reglas e invariantes del dominio y matriz de permisos | Consultas a la base |
| `business/security/` | Hash de contraseñas y firma/verificación del token | Express ni SQL |
| `business/errors/` | `ErrorAplicacion` y fábricas de errores | Respuestas HTTP |
| `data/repositories/` | Todo el SQL, un archivo por entidad | `req`, `res` ni reglas |
| `data/mappers/` | Convertir filas SQL en objetos de negocio | Consultas |
| `data/connection.js` | Pool y `conTransaccion()` | Lógica de negocio |

### Qué hace cada carpeta del frontend

| Carpeta | Qué va aquí | Qué NO va aquí |
|---|---|---|
| `presentation/views/` | Pantallas completas de cada módulo | Llamadas HTTP directas |
| `presentation/components/` | Componentes reutilizables (sidebar, topbar, comprobante) | Reglas de negocio |
| `presentation/router/` | Rutas y guardas de navegación | Acceso a datos |
| `presentation/validators/` | Validación y limpieza de formularios | Llamadas a la API |
| `presentation/theme.js` | Tema claro/oscuro | Datos de sesión |
| `business/session.js` | Guardar, leer y cerrar sesión; rol actual | DOM ni `fetch` |
| `business/format.js` | Nombres, iniciales y fechas | Red ni `localStorage` |
| `data/api.js` | Cliente HTTP, token y errores | Reglas de presentación |
| `data/endpoints/` | Una función por endpoint del backend | JSX, HTML ni estado de Vue |

### Dónde trabaja cada integrante

| Persona | Módulo | Backend | Frontend |
|---|---|---|---|
| Moisés | Seguridad y administración | `presentation/*auth*`, `presentation/*users*`, `business/*auth*`, `business/*users*`, `business/rules/permissions.js`, `data/repositories/*users*` | `views/LoginView.vue`, `views/UsersView.vue`, `views/ProfileView.vue`, `business/session.js` |
| Bryan | Inventario | Crear `presentation/*medicines*`, `presentation/*lots*`, `presentation/*suppliers*`; `business/services/*inventory*`; `business/rules/*inventory*`; `data/repositories/*medicines*`, `*lots*`, `*suppliers*` | `views/MedicinesView.vue`, `views/LotsView.vue`, `views/SuppliersView.vue`, `views/AlertsView.vue` y sus `data/endpoints/*` |
| Rodrigo | Ventas | Crear `presentation/*sales*`, `presentation/*customers*`; `business/services/sales.service.js`; `business/rules/sales.rules.js`; `data/repositories/*sales*`, `*customers*` | `views/SalesView.vue`, `views/CustomersView.vue`, `components/SaleReceipt.vue` y `data/endpoints/sales.js` |
| Víctor | Reportes | Crear `presentation/*reports*`, `presentation/*history*`; `business/services/reports.service.js`; `data/repositories/*reports*`, `*history*` | `views/ReportsView.vue`, `views/HistoryView.vue` y `data/endpoints/reports.js` |

Cada integrante crea sus archivos siguiendo el mismo patrón: **repositorio → servicio → validador → controlador → ruta → endpoint → vista**. Antes de tocar archivos compartidos (`backend/server.js`, `frontend/src/presentation/router/index.js`, `backend/business/rules/permissions.js`, `database/` o `docker-compose.yml`), avisa al equipo.

### Checklist para agregar un módulo nuevo

1. **Datos:** crear `<entidad>.repository.js` con el SQL y, si hace falta, `<entidad>.mapper.js`.
2. **Negocio:** crear `<entidad>.service.js` con los casos de uso y `<entidad>.rules.js` con las invariantes.
3. **Presentación:** crear `<entidad>.validator.js`, `<entidad>.controller.js` y `<entidad>.routes.js`.
4. **Composición:** registrar la ruta en `backend/server.js`.
5. **Frontend:** crear `frontend/src/data/endpoints/<entidad>.js`, la vista en `frontend/src/presentation/views/` y la ruta en `frontend/src/presentation/router/index.js`.
6. **Permisos:** proteger la ruta con `autorizar(PERMISOS.X)`.

Detalle completo, flujos y ejemplos: [`docs/ARQUITECTURA-MULTICAPA.md`](docs/ARQUITECTURA-MULTICAPA.md).
Modelo E/R, diagrama de clases y diccionario de datos: [`docs/MODELO-DATOS.md`](docs/MODELO-DATOS.md).

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

`npm install` solo hace falta la primera vez y cuando cambie `package.json`. Cuando el backend corre fuera de Docker, usa `DB_HOST=localhost` (dentro de Docker Compose el host es `db`). Variables necesarias: `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME` y `SESSION_SECRET`. Los parámetros generales (`MARGEN_ALERTA_DIAS`, `STOCK_SEGURIDAD`, `FARMACIA_NOMBRE`, `FARMACIA_NIT`, `FARMACIA_DIRECCION`, `FARMACIA_TELEFONO`) también se leen desde `.env`.

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

1. Crea una base PostgreSQL y ejecuta en orden `database/01_init.sql`, `database/02_inserts.sql` y `database/03_estado_cuenta_eliminado.sql`.
2. Configura las variables del backend indicadas arriba.
3. Ejecuta backend y frontend con `npm install` y `npm run dev`.

## API implementada

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/health` | Estado de la API y PostgreSQL |
| `POST` | `/api/login` | Inicio de sesión |
| `GET` | `/api/perfil` | Datos y permisos del usuario con sesión activa (cualquier rol) |
| `GET` | `/api/parametros` | Margen de alerta, stock de seguridad por defecto y datos de la farmacia |
| `GET` | `/api/usuarios` | Lista de usuarios activos e inactivos |
| `GET` | `/api/usuarios/roles` | Lista de roles |
| `GET` | `/api/usuarios/:id/impacto` | Cuenta ventas y movimientos de historial asociados al usuario |
| `POST` | `/api/usuarios` | Crea un usuario |
| `PUT` | `/api/usuarios/:id` | Actualiza los datos y el rol; opcionalmente restablece la contraseña |
| `PATCH` | `/api/usuarios/:id/estado` | Activa o desactiva una cuenta |
| `DELETE` | `/api/usuarios/:id` | Borrado lógico: marca la cuenta como `Eliminado` y deja de listarse |

La administración de usuarios requiere el permiso `administrar_usuarios`, que solo tiene el rol Administrador. Las contraseñas se almacenan con bcrypt (coste 12) mediante `backend/business/security/passwords.js`; nunca se guardan en texto plano.

### Permisos por rol

La matriz de permisos vive en `backend/business/rules/permissions.js` y se aplica con `backend/presentation/middleware/authorization.js`.

| Permiso | Administrador | Encargado de inventario | Ventas |
|---|:---:|:---:|:---:|
| `administrar_usuarios` | Sí | No | No |
| `administrar_parametros` | Sí | No | No |
| `gestionar_catalogo` | Sí | Sí | No |
| `consultar_catalogo` | Sí | Sí | Sí |
| `gestionar_proveedores` | Sí | Sí | No |
| `dar_baja_lotes` | Sí | No | No |
| `procesar_ventas` | Sí | No | Sí |
| `generar_reportes` | Sí | No | No |

Para proteger una ruta nueva, primero se valida la sesión y luego el permiso. El siguiente ejemplo va en un archivo de `backend/presentation/routes/`:

```js
const { autenticarUsuario } = require('../middleware/authentication');
const { autorizar } = require('../middleware/authorization');
const { PERMISOS } = require('../../business/rules/permissions');

router.use(autenticarUsuario);
router.get('/', autorizar(PERMISOS.CONSULTAR_CATALOGO), controlador.listar);
```

`autorizar()` acepta uno o varios permisos y permite el acceso si el rol tiene al menos uno. También está disponible `autorizarRoles('Administrador')` para rutas que dependan directamente del nombre del rol.

### Contraseñas y bcrypt

Para generar un hash nuevo:

```sh
cd backend
npm run hash -- "NuevaClaveSegura123*"
```

El hash resultante puede colocarse en `database/02_inserts.sql` o aplicarse a las cuentas existentes con un `UPDATE` puntual.

### Parámetros generales

Los parámetros que antes vivían en una tabla se leen ahora desde `.env` en un solo módulo, `backend/config/parameters.js`:

| Variable | Uso |
|---|---|
| `MARGEN_ALERTA_DIAS` | Días de anticipación para la alerta de vencimiento (30 por defecto) |
| `STOCK_SEGURIDAD` | Stock de seguridad por defecto para nuevos medicamentos (cada medicamento puede sobrescribirlo) |
| `FARMACIA_NOMBRE` | Nombre que se imprime en el comprobante |
| `FARMACIA_NIT` | NIT de la farmacia para el comprobante |
| `FARMACIA_DIRECCION` | Dirección de la farmacia para el comprobante |
| `FARMACIA_TELEFONO` | Teléfono de la farmacia para el comprobante |

El módulo de alertas debe comparar con `fecha_vencimiento <= CURRENT_DATE + margen`, y el de ventas debe incluir `margenAlertaDias` y `farmacia` en la respuesta del comprobante. El inventario consume `stockSeguridad` como valor inicial al registrar un medicamento. `GET /api/parametros` expone estos valores a cualquier rol con `consultar_catalogo`. No requiere tablas ni pantallas nuevas.

### Formularios: estilo y validación

Todos los formularios del frontend comparten el estilo de campos definido en `frontend/src/assets/css/style.css`. Para que un campo se vea igual que el del login:

- Usa `form-label` en la etiqueta y agrega `<span class="req">*</span>` si el campo es obligatorio.
- Usa `form-input` (o `form-control` / `form-select` de Bootstrap) en el campo.
- Usa `custom-input-group` cuando el campo lleve un icono dentro (por ejemplo, un buscador o la contraseña).
- Marca el error con `has-error` / `is-invalid` y muestra el mensaje con `error-text`.

Las reglas de validación están en `frontend/src/presentation/validators/fields.js` y se replican en el servidor en `backend/presentation/validators/fields.js`. Reutiliza los validadores y limpiadores antes de enviar el formulario:

```js
import { limpiarCorreo, validarCorreo, validarContrasena } from '../validators/fields'

const errores = ref({})
const validarFormulario = () => {
  errores.value.correo = validarCorreo(form.correo)
  errores.value.contrasena = validarContrasena(form.contrasena)
  return !Object.values(errores.value).some(Boolean)
}
```

Reglas aplicadas:

- **Correo:** formato `nombre@dominio.com`, máximo 120 caracteres y sin espacios.
- **Contraseña:** entre 8 y 72 caracteres (6 en el login), solo letras, números y símbolos seguros; sin espacios, acentos ni emojis. Al registrar una cuenta debe incluir al menos una letra y un número.
- **Nombre y apellidos:** solo letras, espacios, apóstrofes, puntos y guiones.
- **CI / NIT:** entre 5 y 20 caracteres, solo números, letras y guion.
- **Fecha de nacimiento:** fecha real, no futura y posterior a 1900.

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
- Parámetros generales: margen de alerta de vencimiento (30 días por defecto) y datos de la farmacia para el comprobante, leídos desde `.env` mediante `backend/config/parameters.js`. Los usa el módulo de inventario y el de ventas.
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

**Tablas:** `rol`, `usuario`. **Pantallas:** `LoginView`, `UsersView`, `ProfileView`.
**Pruebas:** CP-01 (acceso válido, inválido y cuenta desactivada) y CP-07 (rol sin permiso rechazado, contraseña cifrada).

### 2. Gestión de inventario (Bryan)

**Qué abarca**
- **Catálogo (RF2):** registrar y actualizar medicamentos con nombre comercial, DCI, concentración, forma farmacéutica, categoría, precio, tipo de venta (libre o con receta) y código de barras. Búsqueda por nombre, principio activo, categoría o código de barras, mostrando precio y stock vigente.
- **Proveedores y recepción de lotes (RF3):** registrar proveedores y recepcionar entregas exigiendo proveedor, número de lote, fecha de vencimiento y costo. La recepción suma al stock y la venta lo descuenta, sin permitir stock negativo.
- **Reorden (RD4):** calcular el punto de reorden `ROP = (D × L) + SS` y alertar cuando el stock sea menor o igual a ese valor.
- **Baja de lotes vencidos (RF3):** solo el Administrador.
- **Vencimientos (RF4):** alerta 30 días antes (margen configurable), advertencia en caja y bloqueo de la venta de lotes vencidos.
- Conservar lote y proveedor en cada entrada y salida (RD1).

**Tablas:** `categoria`, `medicamento`, `proveedor`, `lote`. **Pantallas:** `MedicinesView`, `LotsView`, `SuppliersView`, `AlertsView`.
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

**Tablas:** `cliente`, `venta`, `dispensa`, `comprobante_venta`. **Pantallas:** `SalesView`, `CustomersView`, `SaleReceipt.vue`.
**Pruebas:** CP-05 (cálculo, cambio y rechazos), CP-14 (receta), CP-08 (venta de 3 productos en 3 minutos).

### 4. Analítica y reportes (Víctor)

**Qué abarca**
- Reportes de ventas, inventario, lotes por vencer y lotes vencidos, filtrados por fecha y exportables a PDF o Excel. Solo el Administrador.
- Historial de ventas, recepciones y bajas: quién realizó cada operación y cuándo. No se puede modificar ni eliminar.

**Tablas:** `historial_operacion` (y lectura de `venta`, `dispensa` y `lote`). **Pantallas:** `ReportsView`, `HistoryView`.
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
| Ventas y atención al cliente | Rodrigo | Flujo básico de venta (RF5): carrito, total, cambio, cliente, receta, comprobante y descuento de stock. Empieza con los lotes de prueba de `02_inserts.sql` mientras inventario termina la recepción. |
| Analítica y reportes | Víctor | Reporte esencial (se sugiere el de ventas) e historial de operaciones. Después, completar los 4 reportes con exportación a PDF y Excel. |

Pruebas: CP-03 a CP-11, CP-13 y CP-14. Integración y pruebas de todo el equipo el 09/11, incluida la prueba de rendimiento con 5 usuarios (CP-09, RNF3). Validación final y entrega el 10/11.