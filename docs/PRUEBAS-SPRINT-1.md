# Pruebas de cierre — Sprint 1

| Campo | Valor |
|---|---|
| **Proyecto** | Software de Control de Inventario y Ventas para Farmacias |
| **Sprint** | 1 — Seguridad y administración (RF1) |
| **Casos de prueba** | CP-01, CP-07 y cambio de contraseña desde el perfil |
| **Responsable** | Moisés Pérez |
| **Fecha de ejecución** | 31/10/2026, 10:25 (hora local) |
| **Commit probado** | `10fff53` |
| **Herramienta** | Postman 12.34.4 — Collection Runner |
| **Entorno** | `http://localhost:3000`, PostgreSQL 16 en Docker, backend Node.js |
| **Resultado** | **36/36 assertions aprobadas, 0 fallos** (2 s 879 ms, 101 ms de respuesta promedio) |

## 1. Alcance

Se validó el módulo de seguridad del Sprint 1 sobre la API real:

- **CP-01 — Inicio de sesión:** acceso con credenciales válidas para los tres roles, rechazo de credenciales inválidas y de cuentas desactivadas.
- **CP-07 — Control de acceso y contraseñas:** rutas protegidas por rol (403), rutas sin sesión (401) y contraseñas almacenadas con bcrypt sin exponerse en las respuestas.
- **Cambio de contraseña desde el perfil:** caso exitoso, casos negativos y restauración de la contraseña original.

No se incluyen pruebas de rendimiento ni de calidad estática: corresponden a RNF3 y RNF5 del Sprint 5 (JMeter y SonarQube).

## 2. Datos y configuración

- **Cuentas demo:** `admin@farmacia.bo`, `inventario@farmacia.bo` y `ventas@farmacia.bo`, todas con contraseña `Passw123`.
- **Usuario de prueba:** se crea dentro de la ejecución con correo y CI generados por un *pre-request script* (`prueba.sprint1.<timestamp>@farmacia.bo`), por lo que la colección se puede volver a ejecutar sin limpiar la base.
- **Entorno de Postman:** se versiona con `baseUrl` y `passwordAdmin` vacíos. Antes de ejecutar hay que completarlos localmente (`http://localhost:3000` y `Passw123`); los tokens se llenan solos con los tests.
- **Orden de ejecución:** las carpetas de la colección están numeradas y deben correrse en orden, porque los tokens y el `idUsuarioPrueba` se encadenan entre requests.

## 3. Resultado global

| Métrica | Valor |
|---|---|
| Requests ejecutados | 22 |
| Assertions ejecutadas | 36 |
| Aprobadas | 36 |
| Fallidas | 0 |
| Errores | 0 |
| Duración | 2 s 879 ms |
| Tiempo de respuesta promedio | 101 ms |

## 4. Resultados detallados

### 4.1 CP-01 — Inicio de sesión

| # | Caso | Petición | Esperado | Obtenido | Estado |
|---|---|---|---|---|---|
| 1 | Login administrador | `POST /api/login` | 200 + token + rol Administrador | 200 + token + rol Administrador | ✅ |
| 2 | Login encargado de inventario | `POST /api/login` | 200 + token + rol Encargado de inventario | 200 + token + rol Encargado de inventario | ✅ |
| 3 | Login ventas | `POST /api/login` | 200 + token + rol Ventas | 200 + token + rol Ventas | ✅ |
| 4 | Contraseña incorrecta | `POST /api/login` | 401 y mensaje genérico | 401 y mensaje genérico | ✅ |
| 5 | Correo inexistente | `POST /api/login` | 401 y mensaje genérico | 401 y mensaje genérico | ✅ |
| 6 | Campos vacíos | `POST /api/login` | 400 | 400 | ✅ |
| 7 | Perfil con token | `GET /api/perfil` | 200 | 200 | ✅ |
| 8 | Perfil sin token | `GET /api/perfil` | 401 | 401 | ✅ |

### 4.2 CP-01 — Cuenta desactivada

| # | Caso | Petición | Esperado | Obtenido | Estado |
|---|---|---|---|---|---|
| 9 | Crear usuario de prueba | `POST /api/usuarios` | 201 + `id_usuario` | 201 + `id_usuario` | ✅ |
| 10 | Desactivar usuario | `PATCH /api/usuarios/{{idUsuarioPrueba}}/estado` | 200 | 200 | ✅ |
| 11 | Login de cuenta desactivada | `POST /api/login` | 403, cuenta inhabilitada | 403, cuenta inhabilitada | ✅ |
| 12 | Baja lógica del usuario de prueba | `DELETE /api/usuarios/{{idUsuarioPrueba}}` | 200 | 200 | ✅ |

> La cuenta desactivada responde **403** (`CUENTA_INHABILITADA`), no 401. El 401 queda reservado para credenciales incorrectas, de modo que el sistema no revela si el correo existe.

### 4.3 CP-07 — Permisos y contraseña cifrada

| # | Caso | Petición | Esperado | Obtenido | Estado |
|---|---|---|---|---|---|
| 13 | Administrador consulta usuarios | `GET /api/usuarios` | 200 | 200 | ✅ |
| 14 | Ventas consulta usuarios | `GET /api/usuarios` | 403 sin permiso | 403 sin permiso | ✅ |
| 15 | Inventario consulta usuarios | `GET /api/usuarios` | 403 sin permiso | 403 sin permiso | ✅ |
| 16 | Sin token consulta usuarios | `GET /api/usuarios` | 401 | 401 | ✅ |
| 17 | El perfil no expone el hash | `GET /api/perfil` | Sin `contrasena_hash` | Sin `contrasena_hash` | ✅ |
| 18 | Contraseña cifrada | Login + esquema de BD | Hash bcrypt (`$2a$12$`), nunca texto plano | Login valida con bcrypt; la API no devuelve el hash | ✅ |

> **Sobre el punto 18:** la contraseña se guarda con bcrypt (coste 12) según `database/01_init.sql` y `database/02_inserts.sql`, y el login la valida con `bcrypt.compare`. La comprobación se hizo a nivel de API (el hash nunca viaja en las respuestas); el equipo decidió no incluir captura de pgAdmin.

### 4.4 Cambio de contraseña desde el perfil

| # | Caso | Petición | Esperado | Obtenido | Estado |
|---|---|---|---|---|---|
| 19 | Cambio exitoso | `PATCH /api/perfil/contrasena` | 200 | 200 | ✅ |
| 20 | Login con la contraseña nueva | `POST /api/login` | 200 + token | 200 + token | ✅ |
| 21 | Restaurar contraseña original | `PATCH /api/perfil/contrasena` | 200 | 200 | ✅ |
| 22 | Contraseña actual incorrecta | `PATCH /api/perfil/contrasena` | 400 | 400 | ✅ |
| 23 | Nueva contraseña con menos de 6 caracteres | `PATCH /api/perfil/contrasena` | 400 | 400 | ✅ |
| 24 | Nueva contraseña igual a la actual | `PATCH /api/perfil/contrasena` | 400 | 400 | ✅ |

## 5. Evidencias

**Colección y entorno**

- [Colección Postman — Sprint 1](pruebas/POSTMAN/Sprint%201%20-%20Seguridad%20%28CP-01%20-%20CP-07%29.postman_collection.json)
- [Entorno Postman — Sprint 1 Local](pruebas/POSTMAN/Sprint%201%20-%20Local.postman_environment.json)

**Capturas del Collection Runner (36/36 aprobadas)**

1. [Login válido de los tres roles](pruebas/POSTMAN/Capturas/01-cp01-login-valido.png)
2. [Credenciales inválidas y perfil con token](pruebas/POSTMAN/Capturas/02-cp01-login-invalido.png)
3. [Permisos por rol (200/403/401)](pruebas/POSTMAN/Capturas/03-cp07-permisos.png)
4. [Creación, desactivación y baja del usuario de prueba](pruebas/POSTMAN/Capturas/04-cp01-cuenta-desactivada.png)
5. [Cambio de contraseña y restauración](pruebas/POSTMAN/Capturas/05-cambio-contrasena.png)
6. [Casos negativos del cambio de contraseña](pruebas/POSTMAN/Capturas/06-cambio-contrasena-negativos.png)

## 6. Observaciones

- No se detectaron defectos bloqueantes durante la ejecución.
- El usuario de prueba se creó, desactivó y eliminó lógicamente dentro de la misma ejecución; no se alteraron las cuentas demo.
- La contraseña de la cuenta administradora se cambió a `Nueva12345` y se restauró a `Passw123` al finalizar. Las credenciales demo siguen vigentes.
- La colección usa `{{idUsuarioPrueba}}` en las rutas de desactivación y baja, y genera correo/CI únicos en cada ejecución, por lo que es reutilizable.
- Los valores sensibles del entorno no se versionan: solo se guardan vacíos.

## 7. Cómo reproducir

1. Levantar la base de datos y el backend:

   ```powershell
   docker compose up -d db
   cd backend
   npm run dev
   ```

2. Verificar que la API responde:

   ```powershell
   Invoke-RestMethod http://localhost:3000/api/health
   ```

3. Importar en Postman la colección y el entorno de `docs/pruebas/POSTMAN/`.
4. Seleccionar el entorno **Sprint 1 - Local** y completar:
   - `baseUrl` = `http://localhost:3000`
   - `passwordAdmin` = `Passw123`
5. Abrir la colección → **Run** → ejecutar las 4 carpetas en orden.
6. Confirmar el resumen: **36 assertions, 0 fallos**.

## 8. Conclusión

CP-01 y CP-07 se cumplen: el acceso válido funciona para los tres roles, las credenciales inválidas y las cuentas desactivadas se rechazan, las rutas administrativas responden 403 a los roles sin permiso y 401 sin sesión, y las contraseñas se almacenan y validan con bcrypt sin exponerse en la API. El cambio de contraseña desde el perfil también quedó verificado, incluidos sus casos negativos.

**Sprint 1 cerrado.**
