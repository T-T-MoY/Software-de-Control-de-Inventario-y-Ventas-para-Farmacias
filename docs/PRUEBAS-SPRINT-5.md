# Pruebas Sprint 5 — Reportes e historial (RF6)

Todas las rutas requieren sesión de **Administrador** (`generar_reportes`).
Base local: `http://localhost:3000`. La colección obtiene los tokens iniciando sesión con las cuentas demo.

## Resultado de ejecución

| Métrica | Resultado |
|---|---:|
| Solicitudes ejecutadas | 27 |
| Solicitudes con fallos | 0 |
| Resultado | **Aprobado — todas las pruebas pasaron** |

Ejecución reportada desde Postman Collection Runner. Las respuestas negativas esperadas para fechas o formatos inválidos y permisos restringidos también pasaron.

## Importar y repetir la ejecución

- Colección: [`Sprint 5 - Reportes e historial`](pruebas/POSTMAN/Sprint5/Sprint%205%20-%20Reportes%20e%20historial.postman_collection.json)
- Entorno: [`Sprint 5 - Local`](pruebas/POSTMAN/Sprint5/Sprint%205%20-%20Local.postman_environment.json)

Importa ambos archivos, escribe la contraseña local en `passwordDemo`, selecciona el entorno y ejecuta la colección completa para repetir la prueba.

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

La colección Postman cubre las rutas HTTP. La inmutabilidad directa del trigger SQL y las pruebas RNF3, RNF4 y RNF5 (rendimiento/concurrencia, disponibilidad y análisis estático) requieren validaciones aparte; no se consideran aprobadas por ejecutar esta colección.

Pruebas unitarias: `cd backend && npm test` (`tests/reports.rules.test.js`).

## Notas de despliegue

- Dependencias nuevas (`pdfkit`, `exceljs`): `docker compose up -d --build -V`
  (el volumen anónimo de `node_modules` conserva las anteriores si no se usa `-V`).
- El trigger de inmutabilidad vive en `database/03_historial_inmutable.sql` y solo
  corre al crear la base: `docker compose down -v` y volver a levantar.
