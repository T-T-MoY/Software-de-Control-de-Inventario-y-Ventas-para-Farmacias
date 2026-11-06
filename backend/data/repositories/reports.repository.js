/**
 * Repositorio de reportes (capa de datos).
 *
 * Contiene el SQL de los cuatro reportes de RF6: ventas, inventario,
 * lotes por vencer y lotes vencidos. No conoce req, res ni reglas.
 *
 * Las fechas de vencimiento salen como texto AAAA-MM-DD para que no
 * dependan de la zona horaria del servidor ni del navegador.
 */

const db = require('../connection');

/**
 * Ventas dentro de un rango de fechas (inclusive).
 *
 * La fecha de la venta se compara en la zona horaria de la farmacia:
 * fecha_hora_venta es TIMESTAMP sin zona, así que primero se recupera el
 * instante real (con la zona de la sesión de PostgreSQL, que fue la que
 * lo escribió) y luego se pasa a la hora local. Sin esto, una venta de
 * las 21:00 en La Paz cae en el día siguiente (UTC).
 */
const listarVentas = async (fechaInicio, fechaFin, zonaHoraria) => {
    const { rows } = await db.query(
        `WITH detalle_ventas AS (
            SELECT
                d.id_venta,
                SUM(d.cantidad * d.precio_venta) AS subtotal
            FROM dispensa d
            GROUP BY d.id_venta
         )
         SELECT
            v.id_venta,
            cv.num_serie AS comprobante,
            v.fecha_hora_venta,
            CONCAT_WS(' ', c.nombres, c.apellido_paterno, c.apellido_materno)
                AS cliente,
            CONCAT_WS(' ', u.nombres, u.apellido_paterno, u.apellido_materno)
                AS usuario,
            COALESCE(dv.subtotal, 0)::numeric(12,2) AS subtotal,
            v.descuento_porcentaje,
            ROUND(
                COALESCE(dv.subtotal, 0) * v.descuento_porcentaje / 100, 2
            )::numeric(12,2) AS descuento_monto,
            ROUND(
                COALESCE(dv.subtotal, 0) * (1 - v.descuento_porcentaje / 100), 2
            )::numeric(12,2) AS total
         FROM venta v
         INNER JOIN cliente c ON c.id_cliente = v.id_cliente
         INNER JOIN usuario u ON u.id_usuario = v.id_usuario
         LEFT JOIN comprobante_venta cv ON cv.id_venta = v.id_venta
         LEFT JOIN detalle_ventas dv ON dv.id_venta = v.id_venta
         WHERE (
                v.fecha_hora_venta
                AT TIME ZONE current_setting('TimeZone')
                AT TIME ZONE $3
               )::date BETWEEN $1::date AND $2::date
         ORDER BY v.fecha_hora_venta DESC, v.id_venta DESC`,
        [fechaInicio, fechaFin, zonaHoraria]
    );

    return rows;
};

/**
 * Inventario actual: stock vigente (lotes sin baja, no vencidos y con
 * existencias) y su valor a costo y a precio de venta.
 */
const listarInventario = async () => {
    const { rows } = await db.query(
        `SELECT
            m.id_medicamento,
            m.codigo_barras,
            m.nombre_comercial,
            m.concentracion,
            cat.nombre_categoria AS categoria,
            m.precio_unitario,
            COALESCE(SUM(l.cantidad_stock), 0)::integer AS stock_actual,
            COALESCE(SUM(l.cantidad_stock * l.costo_unitario), 0)::numeric(12,2)
                AS valor_stock_costo,
            (COALESCE(SUM(l.cantidad_stock), 0) * m.precio_unitario)::numeric(12,2)
                AS valor_stock_venta
         FROM medicamento m
         INNER JOIN categoria cat ON cat.id_categoria = m.id_categoria
         LEFT JOIN lote l
            ON l.id_medicamento = m.id_medicamento
           AND l.fecha_baja IS NULL
           AND l.fecha_vencimiento >= CURRENT_DATE
           AND l.cantidad_stock > 0
         WHERE m.estado_medicamento = 'Activo'
         GROUP BY
            m.id_medicamento, m.codigo_barras, m.nombre_comercial,
            m.concentracion, cat.nombre_categoria, m.precio_unitario
         ORDER BY m.nombre_comercial ASC`
    );

    return rows;
};

/**
 * Lotes por vencer: con existencias, sin baja y con vencimiento desde hoy.
 * Sin fechas, usa el margen de alerta configurado (hoy + margen).
 */
const listarLotesPorVencer = async (fechaInicio, fechaFin, margenAlertaDias) => {
    const { rows } = await db.query(
        `SELECT
            l.id_lote,
            m.nombre_comercial AS medicamento,
            l.lote_numero,
            p.nombre_comercial AS proveedor,
            to_char(l.fecha_vencimiento, 'YYYY-MM-DD') AS fecha_vencimiento,
            (l.fecha_vencimiento - CURRENT_DATE)::int AS dias_para_vencer,
            l.cantidad_stock,
            (l.cantidad_stock * l.costo_unitario)::numeric(12,2) AS valor_costo
         FROM lote l
         INNER JOIN medicamento m ON m.id_medicamento = l.id_medicamento
         INNER JOIN proveedor p ON p.id_proveedor = l.id_proveedor
         WHERE l.fecha_baja IS NULL
           AND l.cantidad_stock > 0
           AND l.fecha_vencimiento >= CURRENT_DATE
           AND l.fecha_vencimiento >= COALESCE($1::date, CURRENT_DATE)
           AND l.fecha_vencimiento <= COALESCE($2::date, CURRENT_DATE + $3::int)
         ORDER BY l.fecha_vencimiento ASC, m.nombre_comercial ASC`,
        [fechaInicio, fechaFin, margenAlertaDias]
    );

    return rows;
};

/**
 * Lotes vencidos: pendientes de baja (con existencias) y ya dados de baja.
 * Los lotes vencidos que se agotaron sin baja no tienen nada que reportar.
 */
const listarLotesVencidos = async (fechaInicio, fechaFin) => {
    const { rows } = await db.query(
        `SELECT
            l.id_lote,
            m.nombre_comercial AS medicamento,
            l.lote_numero,
            p.nombre_comercial AS proveedor,
            to_char(l.fecha_vencimiento, 'YYYY-MM-DD') AS fecha_vencimiento,
            (CURRENT_DATE - l.fecha_vencimiento)::int AS dias_vencido,
            l.cantidad_stock,
            (l.cantidad_stock * l.costo_unitario)::numeric(12,2) AS valor_costo,
            CASE WHEN l.fecha_baja IS NULL
                 THEN 'Pendiente de baja'
                 ELSE 'Dado de baja'
            END AS estado_lote
         FROM lote l
         INNER JOIN medicamento m ON m.id_medicamento = l.id_medicamento
         INNER JOIN proveedor p ON p.id_proveedor = l.id_proveedor
         WHERE l.fecha_vencimiento < CURRENT_DATE
           AND (l.fecha_baja IS NOT NULL OR l.cantidad_stock > 0)
           AND ($1::date IS NULL OR l.fecha_vencimiento >= $1::date)
           AND ($2::date IS NULL OR l.fecha_vencimiento <= $2::date)
         ORDER BY l.fecha_vencimiento ASC, m.nombre_comercial ASC`,
        [fechaInicio, fechaFin]
    );

    return rows;
};

module.exports = {
    listarVentas,
    listarInventario,
    listarLotesPorVencer,
    listarLotesVencidos,
};
