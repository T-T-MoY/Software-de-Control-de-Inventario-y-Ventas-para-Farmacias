# Despliegue en línea (Neon + Render + Vercel)

Guía para publicar el sistema en internet sin pagar nada. La arquitectura queda así:

```text
Navegador → Vercel (frontend Vue) → Render (API Express) → Neon (PostgreSQL)
```

Todo se despliega desde la rama `test_online`, que contiene los cambios
necesarios para producción. Cuando la demo esté validada, esa rama se puede
fusionar con `main`.

## Cambios que ya incluye la rama

| Archivo | Cambio |
|---|---|
| `backend/data/connection.js` | Activa SSL cuando `DB_SSL=true` y acepta `DATABASE_URL` como alternativa a las variables `DB_*`. |
| `backend/server.js` | `FRONTEND_ORIGIN` admite varias URLs separadas por comas (producción y previews de Vercel). |
| `frontend/vercel.json` | Reescribe todas las rutas a `index.html` para que recargar `/medicamentos` no devuelva 404. |
| `frontend/.env.example` | Documenta `VITE_API_URL`. |
| `.env.example` | Documenta las variables de la nube. |

## Paso 1 — Base de datos en Neon

1. Entra a <https://neon.tech> e inicia sesión con GitHub.
2. **Create project** → nombre `farmacia-test` → región **US West (Oregon)**.
3. Pulsa **Connect** y copia la cadena de conexión:

   ```text
   postgresql://neondb_owner:CLAVE@ep-xxx.us-west-2.aws.neon.tech/neondb?sslmode=require
   ```

4. Abre **SQL Editor** y ejecuta los scripts **en orden y una sola vez**:

   ```text
   01_init.sql
   02_inserts.sql
   03_historial_inmutable.sql
   04_configuracion.sql
   05_receta_venta.sql
   ```

   Están en la carpeta `database/`. Si un script se ejecuta dos veces, fallará
   porque las tablas ya existen; eso es normal.

> Guarda la cadena de conexión: se usa en el paso 2.

## Paso 2 — Backend en Render

1. Entra a <https://render.com> e inicia sesión con GitHub.
2. **New +** → **Web Service** → selecciona el repositorio.
3. Configura:

   | Campo | Valor |
   |---|---|
   | Branch | `test_online` |
   | Root Directory | `backend` |
   | Build Command | `npm install` |
   | Start Command | `npm start` |
   | Instance Type | Free |
   | Health Check Path | `/api/health` |

4. En **Environment**, agrega las variables. La forma más simple es pegar la
   cadena completa de Neon:

   ```text
   NODE_VERSION=22
   DATABASE_URL=postgresql://neondb_owner:CLAVE@ep-xxx.neon.tech/neondb?sslmode=require
   DB_SSL=true
   SESSION_SECRET=<64 caracteres aleatorios>
   FRONTEND_ORIGIN=https://tu-app.vercel.app
   FARMACIA_NOMBRE=Farmacia Demo
   MARGEN_ALERTA_DIAS=30
   STOCK_SEGURIDAD=10
   DIAS_REPOSICION=5
   VENTANA_DEMANDA_DIAS=30
   ```

   También se puede separar la conexión (si no se define `DATABASE_URL`):

   ```text
   DB_HOST=ep-xxx.neon.tech
   DB_PORT=5432
   DB_NAME=neondb
   DB_USER=neondb_owner
   DB_PASSWORD=CLAVE
   DB_SSL=true
   ```

   Genera `SESSION_SECRET` con:

   ```sh
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

5. Crea el servicio y espera el despliegue. Abre:

   ```text
   https://tu-api.onrender.com/api/health
   ```

   Debe responder `{"status":"ok","database":"connected"}`. Si devuelve 503,
   revisa `DB_SSL`, el host y la contraseña de Neon.

## Paso 3 — Frontend en Vercel

1. Entra a <https://vercel.com> e inicia sesión con GitHub.
2. **Add New** → **Project** → importa el mismo repositorio.
3. Configura:

   | Campo | Valor |
   |---|---|
   | Branch | `test_online` |
   | Root Directory | `frontend` |
   | Framework Preset | Vite |
   | Build Command | `npm run build` |
   | Output Directory | `dist` |

4. En **Environment Variables** agrega:

   ```text
   VITE_API_URL=https://tu-api.onrender.com
   ```

   Sin barra final.

5. Despliega y copia la URL pública, por ejemplo
   `https://farmacia-test.vercel.app`.

## Paso 4 — Conectar frontend y backend

1. En Render, abre el servicio → **Environment**.
2. Edita `FRONTEND_ORIGIN` con la URL de Vercel:

   ```text
   FRONTEND_ORIGIN=https://farmacia-test.vercel.app
   ```

3. **Manual Deploy** → **Restart**.
4. Entra a la URL de Vercel y prueba con:

   ```text
   admin@farmacia.bo
   Passw123
   ```

## Checklist de aceptación

- [ ] `/api/health` responde `status: ok` y `database: connected`.
- [ ] El login funciona desde la URL de Vercel.
- [ ] Se ven medicamentos y ventas de ejemplo.
- [ ] Recargar una ruta interna (por ejemplo `/medicamentos`) no da 404.
- [ ] La descarga de PDF y Excel funciona.
- [ ] El backend aparece sin errores en los logs de Render.

## Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `/api/health` devuelve 503 | SSL desactivado o credenciales incorrectas | `DB_SSL=true` y revisar host, usuario y clave de Neon |
| Error de CORS en el navegador | `FRONTEND_ORIGIN` no coincide | Pegar la URL exacta de Vercel, sin barra final |
| 404 al recargar una ruta | Falta el rewrite del SPA | Confirmar que `frontend/vercel.json` está desplegado |
| El primer acceso tarda ~50 s | El plan gratuito de Render duerme el servicio | Entrar un minuto antes de la presentación |
| Las fotos desaparecen tras reiniciar | El disco de Render Free es efímero | Aceptable para una entrega académica; se pueden volver a subir |
| Error `relation ... already exists` | Los scripts SQL ya se ejecutaron | No volver a ejecutarlos |

## Notas del plan gratuito

- Render duerme el backend tras 15 minutos sin tráfico.
- Neon suspende la base de datos tras un periodo de inactividad; despierta al
  recibir la primera consulta.
- Los archivos subidos a `backend/uploads` no son persistentes en Render Free.
- Para una entrega, deja la rama `test_online` desplegada y, si todo funciona,
  fusiona con `main`.
