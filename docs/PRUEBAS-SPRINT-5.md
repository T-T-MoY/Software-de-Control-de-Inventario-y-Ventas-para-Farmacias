# Pruebas Sprint 5 – Reportes e historial (RF6)

Todas las rutas requieren sesión de **Administrador** (`generar_reportes`).
Base: `http://localhost:3000`. Cabecera: `Authorization: Bearer <token>`.

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/reportes/ventas?fechaInicio&fechaFin` | Ventas del rango (ambas fechas obligatorias) |
| GET | `/api/reportes/inventario` | Stock vigente, valor a costo y a venta |
| GET | `/api/reportes/lotes-por-vencer[?fechaInicio&fechaFin]` | Por defecto: hoy + margen de alerta |
| GET | `/api/reportes/lotes-vencidos[?fechaInicio&fechaFin]` | Pendientes de baja y dados de baja |
| GET | `/api/reportes/:tipo/exportar?formato=pdf\|excel` | Mismos filtros; descarga el archivo |
| GET | `/api/historial?fechaInicio&fechaFin&tipo&idUsuario&pagina&limite` | Historial paginado (limite máx. 100) |
| GET | `/api/historial/usuarios` | Usuarios con operaciones (filtro de la pantalla) |

Fechas en formato `AAAA-MM-DD`. Tipos de operación: `VENTA`, `RECEPCION`, `BAJA`.
El día de una venta se calcula en la zona horaria `ZONA_HORARIA` (por defecto `America/La_Paz`).

## Casos

| Caso | Prueba | Resultado esperado |
|---|---|---|
| CP-06 | Reporte de ventas con rango válido | 200, filas, totales y columnas |
| CP-06 | Ventas sin fechas / fecha irreal / inicio > fin | 400 con mensaje |
| CP-06 | Exportar PDF y Excel de los 4 reportes | Archivo descargado con los mismos totales |
| CP-06 | Rango sin ventas | 200, `filas: []`; el PDF/Excel indican "Sin registros" |
| CP-07 | Listar historial y filtrar por tipo, fecha y usuario | Solo operaciones que cumplen el filtro |
| CP-07 | `PUT`/`DELETE`/`PATCH`/`POST` a `/api/historial` | 405 |
| CP-07 | `UPDATE`/`DELETE`/`TRUNCATE` en `historial_operacion` por SQL | Error de la base (trigger) |
| Seguridad | Sin token / rol Ventas / rol Inventario | 401 / 403 / 403 |

Pruebas unitarias: `cd backend && npm test` (`tests/reports.rules.test.js`).

## Notas de despliegue

- Dependencias nuevas (`pdfkit`, `exceljs`): `docker compose up -d --build -V`
  (el volumen anónimo de `node_modules` conserva las anteriores si no se usa `-V`).
- El trigger de inmutabilidad vive en `database/03_historial_inmutable.sql` y solo
  corre al crear la base: `docker compose down -v` y volver a levantar.
