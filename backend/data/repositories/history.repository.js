/**
 * Repositorio del historial de operaciones (capa de datos).
 *
 * Solo lectura: historial_operacion es una tabla de solo inserción
 * (las inserciones las hacen los repositorios de ventas y lotes dentro de
 * la misma transacción de la operación). Aquí no hay UPDATE ni DELETE.
 */

const db = require('../connection');

// Filtros comunes. La fecha se compara en la zona horaria de la farmacia
// (ver nota en reports.repository.js). Parámetros:
// $1 fechaInicio, $2 fechaFin, $3 tipo, $4 idUsuario, $5 zona horaria.
const CONDICIONES = `
    ($1::date IS NULL OR (
        h.fecha_hora AT TIME ZONE current_setting('TimeZone') AT TIME ZONE $5
    )::date >= $1::date)
    AND ($2::date IS NULL OR (
        h.fecha_hora AT TIME ZONE current_setting('TimeZone') AT TIME ZONE $5
    )::date <= $2::date)
    AND ($3::varchar IS NULL OR h.tipo_operacion = $3::varchar)
    AND ($4::int IS NULL OR h.id_usuario = $4::int)`;

/**
 * Página del historial con el detalle de cada operación:
 * - VENTA: comprobante, cliente y total.
 * - RECEPCION / BAJA: lote, medicamento y proveedor.
 */
const listarHistorial = async (filtros, zonaHoraria) => {
    const base = [
        filtros.fechaInicio,
        filtros.fechaFin,
        filtros.tipo,
        filtros.idUsuario,
        zonaHoraria,
    ];

    const { rows } = await db.query(
        `SELECT
            h.id_historial,
            h.tipo_operacion,
            h.id_registro,
            h.fecha_hora,
            u.id_usuario,
            CONCAT_WS(' ', u.nombres, u.apellido_paterno, u.apellido_materno)
                AS usuario,
            r.nombre_rol AS rol,
            CASE h.tipo_operacion
                WHEN 'VENTA' THEN cv.num_serie
                ELSE l.lote_numero
            END AS referencia,
            CASE h.tipo_operacion
                WHEN 'VENTA' THEN CONCAT_WS(' ', c.nombres, c.apellido_paterno,
                                            c.apellido_materno)
                ELSE p.nombre_comercial
            END AS contraparte,
            m.nombre_comercial AS medicamento,
            CASE h.tipo_operacion
                WHEN 'VENTA' THEN ROUND(
                    COALESCE(dv.subtotal, 0) * (1 - v.descuento_porcentaje / 100), 2
                )::numeric(12,2)
            END AS monto
         FROM historial_operacion h
         INNER JOIN usuario u ON u.id_usuario = h.id_usuario
         INNER JOIN rol r ON r.id_rol = u.id_rol
         LEFT JOIN venta v
            ON h.tipo_operacion = 'VENTA' AND v.id_venta = h.id_registro
         LEFT JOIN comprobante_venta cv ON cv.id_venta = v.id_venta
         LEFT JOIN cliente c ON c.id_cliente = v.id_cliente
         LEFT JOIN (
            SELECT id_venta, SUM(cantidad * precio_venta) AS subtotal
            FROM dispensa
            GROUP BY id_venta
         ) dv ON dv.id_venta = v.id_venta
         LEFT JOIN lote l
            ON h.tipo_operacion IN ('RECEPCION', 'BAJA')
           AND l.id_lote = h.id_registro
         LEFT JOIN medicamento m ON m.id_medicamento = l.id_medicamento
         LEFT JOIN proveedor p ON p.id_proveedor = l.id_proveedor
         WHERE ${CONDICIONES}
         ORDER BY h.fecha_hora DESC, h.id_historial DESC
         LIMIT $6 OFFSET $7`,
        [...base, filtros.limite, (filtros.pagina - 1) * filtros.limite]
    );

    return rows;
};

/** Cantidad de operaciones por tipo con los mismos filtros. */
const contarPorTipo = async (filtros, zonaHoraria) => {
    const { rows } = await db.query(
        `SELECT h.tipo_operacion, COUNT(*)::int AS cantidad
         FROM historial_operacion h
         WHERE ${CONDICIONES}
         GROUP BY h.tipo_operacion`,
        [
            filtros.fechaInicio,
            filtros.fechaFin,
            filtros.tipo,
            filtros.idUsuario,
            zonaHoraria,
        ]
    );

    return rows;
};

/** Usuarios que aparecen en el historial (para el filtro de la pantalla). */
const listarUsuariosConOperaciones = async () => {
    const { rows } = await db.query(
        `SELECT
            u.id_usuario,
            CONCAT_WS(' ', u.nombres, u.apellido_paterno, u.apellido_materno)
                AS usuario
         FROM usuario u
         WHERE EXISTS (
            SELECT 1 FROM historial_operacion h WHERE h.id_usuario = u.id_usuario
         )
         ORDER BY usuario ASC`
    );

    return rows;
};

module.exports = {
    listarHistorial,
    contarPorTipo,
    listarUsuariosConOperaciones,
};
