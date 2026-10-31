# Pruebas de cierre — Sprint 2

| Campo | Valor |
|---|---|
| **Proyecto** | Sistema de Control de Inventario y Ventas para Farmacias |
| **Sprint** | 2 — Catálogo de medicamentos (RF2) |
| **Casos de prueba** | CP-02 y CP-12 |
| **Resultado** | **12/12 aserciones de API aprobadas**; compilación y búsqueda en interfaz verificadas |
| **Entorno** | API local, PostgreSQL en Docker y frontend Vue/Vite |

## Alcance verificado

- Registro de medicamentos con DCI, concentración, forma farmacéutica, categoría, precio, tipo de venta y código de barras.
- Rechazo de códigos de barras duplicados.
- Actualización y búsqueda del medicamento actualizado.
- Búsqueda por principio activo y filtros por categoría y estado.
- Consulta de categorías y visualización del precio y stock vigente.
- Consulta del catálogo para los tres roles, rechazo sin sesión (401) y rechazo de escritura para Ventas (403).
- Activación y desactivación lógica de un medicamento.
- Búsqueda desde la interfaz iniciada con el rol Ventas: «Dolofin» redujo el catálogo a un resultado y mostró precio y stock.

## Resultados

| Verificación | Esperado | Resultado |
|---|---|---|
| Inicio de sesión como Administrador, Encargado de inventario y Ventas | Tres sesiones válidas | Aprobado |
| Consulta del catálogo sin sesión | 401 | Aprobado |
| Catálogo y categorías iniciales | Registros disponibles | Aprobado |
| Búsqueda por DCI | Coincidencia correspondiente | Aprobado |
| Registro y duplicado de código de barras | 201 y luego 409 | Aprobado |
| Edición y búsqueda por código | Datos actualizados | Aprobado |
| Filtro por categoría | Solo medicamentos de la categoría | Aprobado |
| Consulta y escritura con rol Ventas | Lectura permitida; escritura 403 | Aprobado |
| Cambio de estado y filtro por Inactivo | Medicamento incluido en el filtro | Aprobado |
| Búsqueda visual como Ventas | Un resultado con precio y stock | Aprobado |
| Compilación de producción del frontend | `npm --prefix frontend run build` exitoso | Aprobado |

El medicamento temporal utilizado para probar alta, edición y estado se eliminó de la base al terminar; no se modificaron los datos de ejemplo.
