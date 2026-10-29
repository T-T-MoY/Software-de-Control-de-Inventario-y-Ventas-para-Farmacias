# Arquitectura multicapa del sistema

Este documento describe cómo está organizado el proyecto según el punto **13. Análisis y diseño de la arquitectura multicapa** del informe:

- **13.1 Capa de presentación:** interfaces, formularios y validaciones de entrada.
- **13.2 Capa de negocio:** reglas, algoritmos, procesos y soluciones que no requieren base de datos.
- **13.3 Capa de datos:** modelo E/R, diagrama de clases y diseño de la base de datos.

> La carpeta `database/` **no se modificó**. El modelo E/R y el diccionario de datos se documentan en [`MODELO-DATOS.md`](./MODELO-DATOS.md) a partir del esquema existente.

---

## 1. Idea central

Cada capa tiene una responsabilidad y **solo depende de la capa inferior**:

```text
┌──────────────────────────────────────────────────────────────┐
│  PRESENTACIÓN                                                │
│  Rutas HTTP, controladores, middleware, vistas, formularios  │
│  y validaciones de entrada.                                  │
└───────────────────────────┬──────────────────────────────────┘
                            │ llama a
┌───────────────────────────▼──────────────────────────────────┐
│  NEGOCIO                                                     │
│  Casos de uso, reglas, permisos, cálculos, seguridad,        │
│  errores de negocio. No conoce Express ni SQL.               │
└───────────────────────────┬──────────────────────────────────┘
                            │ llama a
┌───────────────────────────▼──────────────────────────────────┐
│  DATOS                                                       │
│  Repositorios (SQL), mapeadores, conexión y transacciones.   │
└───────────────────────────┬──────────────────────────────────┘
                            │
                    PostgreSQL (database/)
```

Reglas que se respetan en todo el código:

1. **Presentación → Negocio → Datos.** Nunca al revés.
2. Ningún controlador escribe SQL.
3. Ningún repositorio conoce `req`, `res` ni códigos HTTP.
4. Ningún servicio importa Express.
5. Los errores de negocio viajan como `ErrorAplicacion` y la presentación decide el estado HTTP.
6. El frontend replica la misma dirección: `presentation → business → data`.

---

## 2. Estructura del backend

```text
backend/
├── server.js                       # Punto de entrada y composición de Express
├── config/                         # Configuración transversal (entorno)
│   ├── env.js
│   └── parameters.js               # Margen de alerta, stock, datos de farmacia
│
├── presentation/                   # 13.1
│   ├── routes/                     # Define endpoints y aplica middleware
│   │   ├── auth.routes.js
│   │   ├── users.routes.js
│   │   ├── profile.routes.js
│   │   └── parameters.routes.js
│   ├── controllers/                # Traducen HTTP ↔ negocio
│   │   ├── auth.controller.js
│   │   ├── users.controller.js
│   │   ├── profile.controller.js
│   │   └── parameters.controller.js
│   ├── middleware/
│   │   ├── authentication.js       # Lee el token y arma req.sessionUser
│   │   ├── authorization.js        # Exige permisos por rol
│   │   └── errors.js               # 404 y manejo central de errores
│   └── validators/                 # Validaciones de entrada
│       ├── fields.js               # Correo, nombre, CI/NIT, contraseña
│       └── user.validator.js       # Formulario completo de usuario
│
├── business/                       # 13.2
│   ├── services/                   # Casos de uso
│   │   ├── auth.service.js
│   │   ├── users.service.js
│   │   ├── profile.service.js
│   │   └── parameters.service.js
│   ├── rules/
│   │   ├── permissions.js          # Matriz de permisos por rol
│   │   └── users.rules.js          # Invariantes y normalización
│   ├── security/
│   │   ├── passwords.js            # bcrypt
│   │   └── session.js              # Firma y verificación del token
│   └── errors/
│       └── app-error.js            # Error de negocio con estado HTTP
│
├── data/                           # 13.3
│   ├── connection.js               # Pool de PostgreSQL + conTransaccion()
│   ├── repositories/
│   │   ├── users.repository.js
│   │   └── roles.repository.js
│   └── mappers/
│       └── user.mapper.js          # Fila SQL → objeto de negocio
│
└── scripts/generate-hash.js
```

### 2.1 Capa de presentación (13.1)

**Responsabilidad:** recibir la petición, validar su forma, delegar y responder.

| Archivo | Qué hace | Qué NO hace |
|---|---|---|
| `routes/*.routes.js` | Declara método, ruta y middleware | No valida datos ni consulta la BD |
| `controllers/*.controller.js` | Lee `req`, valida entrada, llama al servicio, responde | No contiene reglas de negocio ni SQL |
| `middleware/authentication.js` | Extrae el token y pide la sesión al negocio | No verifica firmas ni consulta SQL |
| `middleware/authorization.js` | Comprueba permisos del rol | No define la matriz de permisos |
| `middleware/errors.js` | Convierte errores en JSON y estado HTTP | No decide reglas |
| `validators/*.js` | Formato, obligatoriedad, longitudes | No decide si un usuario puede desactivarse |

Ejemplo de controlador delgado:

```js
const obtenerUsuarios = async (req, res, next) => {
    try {
        return res.json(await usuariosServicio.listar());
    } catch (error) {
        return next(error);
    }
};
```

### 2.2 Capa de negocio (13.2)

**Responsabilidad:** decidir. Aquí viven los procesos que no dependen de la base de datos y los que la coordinan.

- **Servicios:** un caso de uso por operación (`iniciarSesion`, `crear`, `actualizar`, `cambiarEstado`, `obtenerPerfil`).
- **Reglas:** matriz de permisos, invariantes (no quitarse el rol de administrador, no desactivar la propia cuenta), normalización de datos.
- **Seguridad:** hash bcrypt, firma HMAC del token, expiración.
- **Errores:** `ErrorAplicacion` con `estado` y `codigo`, para que presentación responda sin `if` dispersos.
- **Parámetros:** margen de alerta, stock de seguridad y datos de la farmacia (no requieren base de datos).

Ejemplo de regla pura:

```js
const validarDesactivacionPropia = ({ idSesion, idUsuario, activo }) => {
    if (!activo && Number(idSesion) === Number(idUsuario)) {
        throw errorValidacion('No puedes desactivar tu propia cuenta.');
    }
};
```

### 2.3 Capa de datos (13.3)

**Responsabilidad:** hablar con PostgreSQL y traducir filas a objetos.

- **Repositorios:** todo el SQL, un archivo por entidad. Devuelven datos o `null`, nunca respuestas HTTP.
- **Mapeadores:** arman objetos como `nombre_completo` o separan los campos públicos de los internos.
- **Conexión:** pool único y `conTransaccion()` para procesos que tocan varias tablas.
- **Sin lógica de negocio:** el repositorio no decide si un usuario puede desactivarse; solo ejecuta el `UPDATE`.

```js
const buscarSesionActiva = async (idUsuario) => {
    const { rows } = await db.query(
        `SELECT u.id_usuario, r.nombre_rol
         FROM usuario AS u
         JOIN rol AS r ON r.id_rol = u.id_rol
         WHERE u.id_usuario = $1
           AND u.estado_cuenta = 'Activo'`,
        [idUsuario]
    );
    return rows[0] || null;
};
```

---

## 3. Estructura del frontend

```text
frontend/src/
├── main.js
├── App.vue                          # Composición visual (sidebar + topbar)
├── assets/
├── config/distribution.js           # Datos de los módulos del equipo
│
├── presentation/                    # 13.1
│   ├── router/index.js
│   ├── views/
│   │   ├── LoginView.vue
│   │   ├── DashboardView.vue
│   │   ├── UsersView.vue
│   │   └── ProfileView.vue
│   ├── components/
│   │   ├── Sidebar.vue
│   │   ├── Topbar.vue
│   │   ├── ThemeToggle.vue
│   │   └── SaleReceipt.vue          # Comprobante de 80 mm
│   ├── validators/
│   │   ├── fields.js                # Reglas de formato
│   │   └── user.js                  # Validación del formulario de usuarios
│   └── theme.js                     # Tema claro/oscuro
│
├── business/                        # 13.2
│   ├── session.js                   # Guardar/leer/cerrar sesión, rol
│   └── format.js                    # Nombres, iniciales y fechas
│
└── data/                            # 13.3
    ├── api.js                       # Cliente HTTP (token, errores)
    └── endpoints/
        ├── auth.js
        ├── users.js
        └── profile.js
```

| Capa | Qué contiene | Ejemplo |
|---|---|---|
| Presentación | Pantallas, componentes, router, validación de formularios | `LoginView` valida el correo antes de enviar |
| Negocio | Estado y cálculos del cliente, sin red ni DOM | `session.js` decide qué es "administrador" |
| Datos | Llamadas HTTP y manejo del token | `endpoints/users.js` |

Las vistas ya no conocen URLs ni claves de `localStorage`:

```js
// Antes: la vista armaba el fetch y escribía 9 claves
// Ahora:
const data = await iniciarSesion({ email, password });
guardarSesion(data.token, data.usuario);
```

---

## 4. Flujo de una petición

### Login

```text
LoginView
  └─ data/endpoints/auth.js        POST /api/login
       └─ presentation/routes/auth.routes.js
            └─ presentation/controllers/auth.controller.js   valida formato
                 └─ business/services/auth.service.js           decide
                      ├─ data/repositories/users.repository.js  SELECT
                      ├─ business/security/passwords.js            bcrypt.compare
                      └─ business/security/session.js                 firma el token
```

### Crear usuario

```text
UsersView
  └─ data/endpoints/users.js
       └─ users.routes.js → autenticar → autorizar(administrar_usuarios)
            └─ users.controller.js          valida campos
                 └─ users.service.js        normaliza + hash + traduce errores
                      └─ users.repository.js INSERT
```

### Venta (módulo futuro)

El servicio de ventas será quien abra la transacción; el controlador solo recibe el carrito:

```js
// business/services/sales.service.js
const registrarVenta = async (datos, idUsuario) => conTransaccion(async (cliente) => {
    const lote = await lotesRepositorio.buscarConStock(cliente, datos.idLote);
    if (!lote) throw errorConflicto('No hay stock suficiente.');
    if (estaVencido(lote)) throw errorValidacion('El lote está vencido.');

    const total = calcularTotal(datos.items, datos.descuento);
    const idVenta = await ventasRepositorio.crear(cliente, { ...datos, total, idUsuario });
    await lotesRepositorio.descontar(cliente, lote.id_lote, datos.cantidad);
    return idVenta;
});
```

`conTransaccion()` ya existe en `data/connection.js`.

---

## 5. Dónde va cada cosa

| Necesidad | Capa | Ubicación |
|---|---|---|
| Nueva ruta HTTP | Presentación | `presentation/routes/` |
| Validar un campo del formulario | Presentación | `presentation/validators/` (backend y frontend) |
| Regla "no vender lotes vencidos" | Negocio | `business/rules/` |
| Calcular total, cambio o ROP | Negocio | `business/services/` o `business/rules/` |
| Consulta SQL | Datos | `data/repositories/` |
| Varias tablas en una operación | Datos | `conTransaccion()` |
| Texto de error para el usuario | Presentación | Controlador o `ErrorAplicacion` |
| Permiso por rol | Negocio | `business/rules/permissions.js` |

### Checklist para agregar un módulo

1. **Datos:** crear `<entidad>.repository.js` con el SQL y, si hace falta, `<entidad>.mapper.js`.
2. **Negocio:** crear `<entidad>.service.js` con los casos de uso y `<entidad>.rules.js` con las invariantes.
3. **Presentación:** crear `<entidad>.validator.js`, `<entidad>.controller.js` y `<entidad>.routes.js`.
4. **Composición:** registrar la ruta en `server.js`.
5. **Frontend:** agregar `data/endpoints/<entidad>.js`, la vista en `presentation/views/` y la ruta en `presentation/router/index.js`.
6. **Permisos:** proteger la ruta con `autorizar(PERMISOS.X)`.

---

## 6. Verificación

- `node --check` sobre todos los archivos del backend.
- `npm run build` en `frontend/` para comprobar que todos los imports resuelven.
- Prueba manual: login, listado de usuarios, alta, edición, cambio de estado, baja lógica y perfil.

Comandos:

```sh
cd backend && npm run dev
cd frontend && npm run dev
```

---

## 7. Qué se conservó

- Los **endpoints y respuestas JSON** no cambiaron: la interfaz actual sigue funcionando.
- Las **reglas de validación** son las mismas, solo se movieron a la capa de presentación.
- La **matriz de permisos** y el **hash bcrypt (coste 12)** se mantienen.
- El **esquema de la base de datos** no se tocó.
