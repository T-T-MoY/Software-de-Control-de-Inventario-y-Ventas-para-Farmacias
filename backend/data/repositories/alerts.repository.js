
/**
 * Repositorio de alertas de inventario.
 *
 * Contiene las consultas SQL para:
 * - Lotes próximos a vencer.
 * - Lotes vencidos.
 * - Existencias y demanda para calcular el punto de reorden.
 */

const db = require('../connection');

const parametros = require('../../config/parameters');

/**
 * Consultar lotes próximos a vencer.
 *
 * Se incluyen lotes con existencias y sin baja,
 * cuyo vencimiento está entre hoy y el margen configurado.
 */
const listarLotesPorVencer = async () => {
    const { rows } = await db.query(
        `SELECT
            l.id_lote,
            l.lote_numero,
            l.id_medicamento,
            m.nombre_comercial AS medicamento,
            m.codigo_barras,
            l.id_proveedor,
            p.nombre_comercial AS proveedor,
            l.fecha_vencimiento,
            l.cantidad_stock,
            (l.fecha_vencimiento - CURRENT_DATE)::int
                AS dias_para_vencer
         FROM lote l
         INNER JOIN medicamento m
            ON m.id_medicamento = l.id_medicamento
         INNER JOIN proveedor p
            ON p.id_proveedor = l.id_proveedor
         WHERE l.fecha_baja IS NULL
           AND l.cantidad_stock > 0
           AND l.fecha_vencimiento >= CURRENT_DATE
           AND l.fecha_vencimiento <=
               CURRENT_DATE + $1::integer
         ORDER BY l.fecha_vencimiento ASC`,
        [parametros.margenAlertaDias]
    );

    return rows;
};

/**
 * Contar lotes próximos a vencer sin traer las filas completas.
 *
 * Se usa para el badge del menú, que consulta el resumen
 * cada minuto y solo necesita el número.
 */
const contarLotesPorVencer = async () => {
    const { rows } = await db.query(
        `SELECT COUNT(*)::integer AS total
         FROM lote l
         WHERE l.fecha_baja IS NULL
           AND l.cantidad_stock > 0
           AND l.fecha_vencimiento >= CURRENT_DATE
           AND l.fecha_vencimiento <=
               CURRENT_DATE + $1::integer`,
        [parametros.margenAlertaDias]
    );

    return rows[0].total;
};

/**
 * Consultar lotes vencidos que todavía tienen existencias
 * y no han sido dados de baja.
 */
const listarLotesVencidos = async () => {
    const { rows } = await db.query(
        `SELECT
            l.id_lote,
            l.lote_numero,
            l.id_medicamento,
            m.nombre_comercial AS medicamento,
            m.codigo_barras,
            l.id_proveedor,
            p.nombre_comercial AS proveedor,
            l.fecha_vencimiento,
            l.cantidad_stock,
            (CURRENT_DATE - l.fecha_vencimiento)::int
                AS dias_vencido
         FROM lote l
         INNER JOIN medicamento m
            ON m.id_medicamento = l.id_medicamento
         INNER JOIN proveedor p
            ON p.id_proveedor = l.id_proveedor
         WHERE l.fecha_baja IS NULL
           AND l.cantidad_stock > 0
           AND l.fecha_vencimiento < CURRENT_DATE
         ORDER BY l.fecha_vencimiento ASC`,
        []
    );

    return rows;
};

/**
 * Obtener información para calcular el punto de reorden.
 *
 * Demanda diaria =
 * unidades dispensadas durante la ventana / días de la ventana.
 *
 * Se incluyen todos los días del periodo, también los días
 * sin ventas. El stock considera únicamente lotes disponibles,
 * no vencidos y sin baja.
 */
const listarDatosReorden = async () => {
    const { rows } = await db.query(
        `WITH demanda_ventana AS (
            SELECT
                l.id_medicamento,
                SUM(d.cantidad)::integer AS unidades_vendidas
            FROM dispensa d
            INNER JOIN venta v
                ON v.id_venta = d.id_venta
            INNER JOIN lote l
                ON l.id_lote = d.id_lote
            WHERE v.fecha_hora_venta >=
                    CURRENT_DATE - ($1::integer - 1)
              AND v.fecha_hora_venta <
                    CURRENT_DATE + INTERVAL '1 day'
            GROUP BY l.id_medicamento
         ),
         stock_actual AS (
            SELECT
                l.id_medicamento,
                SUM(l.cantidad_stock)::integer AS stock_actual
            FROM lote l
            WHERE l.fecha_baja IS NULL
              AND l.fecha_vencimiento >= CURRENT_DATE
            GROUP BY l.id_medicamento
         )
         SELECT
            m.id_medicamento,
            m.codigo_barras,
            m.nombre_comercial,
            m.concentracion,
            m.stock_seguridad,
            CASE
                WHEN m.dias_reposicion >= 1
                THEN m.dias_reposicion
                ELSE $2::integer
            END AS dias_reposicion,
            COALESCE(s.stock_actual, 0)::integer
                AS stock_actual,
            COALESCE(d.unidades_vendidas, 0)::integer
                AS unidades_vendidas,
            (
                COALESCE(d.unidades_vendidas, 0)::numeric
                / $1::integer
            )::float8 AS demanda_diaria
         FROM medicamento m
         LEFT JOIN stock_actual s
            ON s.id_medicamento = m.id_medicamento
         LEFT JOIN demanda_ventana d
            ON d.id_medicamento = m.id_medicamento
         WHERE m.estado_medicamento = 'Activo'
         ORDER BY m.nombre_comercial`,
        [parametros.ventanaDemandaDias, parametros.diasReposicion]
    );

    return rows;
};

/**
 * Contar lotes vencidos con existencias pendientes de baja.
 */
const contarLotesVencidos = async () => {
    const { rows } = await db.query(
        `SELECT COUNT(*)::integer AS total
         FROM lote l
         WHERE l.fecha_baja IS NULL
           AND l.cantidad_stock > 0
           AND l.fecha_vencimiento < CURRENT_DATE`,
        []
    );

    return rows[0].total;
};

module.exports = {
    listarLotesPorVencer,
    contarLotesPorVencer,
    listarLotesVencidos,
    contarLotesVencidos,
    listarDatosReorden,
};
