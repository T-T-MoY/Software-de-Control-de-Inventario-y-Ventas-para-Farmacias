# Pruebas Sprint 4 — Ventas (RF5)

## Resultado de ejecución

| Métrica | Resultado |
|---|---:|
| Solicitudes ejecutadas | 13 |
| Solicitudes con fallos | 0 |
| Resultado | **Aprobado — todas las pruebas pasaron** |

Ejecución reportada desde Postman Collection Runner. Los rechazos esperados de pago insuficiente, stock y receta también pasaron.

## Importar y ejecutar

Importa en Postman:

- Colección: [`Sprint 4 - Ventas`](pruebas/POSTMAN/Sprint4/Sprint%204%20-%20Ventas.postman_collection.json)
- Entorno: [`Sprint 4 - Local`](pruebas/POSTMAN/Sprint4/Sprint%204%20-%20Local.postman_environment.json)

Para repetir la prueba, usa `http://localhost:3000` como `baseUrl`, escribe la contraseña local de las cuentas demo en `passwordDemo` y ejecuta la colección completa en orden. Requiere medicamentos activos con stock para venta libre y con receta.

## Cobertura automatizada

| Caso | Verificación |
|---|---|
| CP-05 | Rechazar pago insuficiente y cantidad mayor al stock. |
| CP-05 | Registrar venta con descuento, verificar subtotal, descuento, total, cambio y serie de nota de venta. |
| CP-05 | Verificar que la venta descuenta una unidad del stock disponible. |
| CP-08 | Registrar en una petición una venta con tres productos y comprobar que la respuesta demora menos de tres minutos. |
| CP-14 | Rechazar medicamento con receta sin datos médicos; aceptar receta y comprobar factura y comprobante. |
| Permisos | El Encargado de inventario no puede registrar ventas. |

La prueba CP-08 mide una operación de tres productos, no una prueba de concurrencia con usuarios simulados.

## Datos que deja la prueba

La colección crea un cliente de prueba y registra ventas válidas para verificar cálculos, receta, comprobante e inventario. Esas ventas generan movimientos de auditoría y no se eliminan al terminar.
