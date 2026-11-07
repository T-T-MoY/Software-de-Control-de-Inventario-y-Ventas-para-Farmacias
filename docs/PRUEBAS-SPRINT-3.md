# Pruebas Sprint 3 — Inventario y alertas (RF3 / RF4)

## Resultado de ejecución

| Métrica | Resultado |
|---|---:|
| Solicitudes ejecutadas | 18 |
| Solicitudes con fallos | 0 |
| Resultado | **Aprobado — todas las pruebas pasaron** |

Ejecución reportada desde Postman Collection Runner. Los casos negativos también pasaron al recibir la respuesta de error esperada.

## Importar y ejecutar

Importa en Postman:

- Colección: [`Sprint 3 - Inventario y alertas`](pruebas/POSTMAN/Sprint3/Sprint%203%20-%20Inventario%20y%20alertas.postman_collection.json)
- Entorno: [`Sprint 3 - Local`](pruebas/POSTMAN/Sprint3/Sprint%203%20-%20Local.postman_environment.json)

Para repetir la prueba, usa `http://localhost:3000` como `baseUrl`, escribe la contraseña local de las cuentas demo en `passwordDemo` y ejecuta la colección completa en orden. Requiere la base de datos inicializada con los datos de `database/02_inserts.sql`, incluido el lote vencido `MON-2025-B`.

## Cobertura automatizada

| Caso | Verificación |
|---|---|
| CP-03 | Crear proveedor de prueba, buscarlo y registrar una recepción válida. |
| CP-03 | Rechazar una recepción con fecha inválida; consultar el lote recibido y comprobar que la recepción quedó auditada. |
| CP-04 | Confirmar que el lote recién recibido, con vencimiento próximo, aparece en alertas. |
| CP-11 | Listar vencidos y comprobar que el medicamento cuyo único stock está vencido no se puede vender. |
| CP-13 | Consultar la lista de medicamentos que requieren reposición y validar la marca `requiere_reposicion`. El cálculo exacto también se cubre en `backend/tests/inventory.rules.test.js`. |
| Permisos | Ventas no puede consultar proveedores y el Encargado de inventario no puede dar de baja lotes. |

La colección no da de baja lotes existentes para evitar alterar los datos semilla.

## Datos que deja la prueba

La ejecución crea un proveedor, un lote con stock de prueba y sus eventos de auditoría. No existe una operación de borrado para esos movimientos; quedan en la base local y pueden revisarse en el historial.
