
/**
 * Repositorio de lotes.
 *
 * Contiene las consultas SQL del módulo de inventario.
 * Las recepciones y bajas se ejecutan mediante transacciones.
 */

const db = require('../connection');
const { coincidePalabraPorPrefijo } = require('./search');
const parametros = require('../../config/parameters');

const CAMPOS_LOTE = `
    l.id_lote,
    l.id_medicamento,
    m.nombre_comercial AS medicamento,
    m.codigo_barras,
    m.dci,
    l.id_proveedor,
    p.nombre_comercial AS proveedor,
    l.lote_numero,
    l.fecha_recepcion,
    l.fecha_vencimiento,
    l.costo_unitario::float8 AS costo_unitario,
    l.cantidad_stock,
    l.fecha_baja,
    (l.fecha_vencimiento - CURRENT_DATE)::int AS dias_para_vencer,
    CASE
        WHEN l.fecha_baja IS NOT NULL THEN 'Baja'
        WHEN l.fecha_vencimiento < CURRENT_DATE THEN 'Vencido'
        WHEN l.fecha_vencimiento <= CURRENT_DATE + $1::integer
            THEN 'Por vencer'
        ELSE 'Vigente'
    END AS estado_lote
`;

const TABLAS_LOTE = `
    FROM lote l
    INNER JOIN medicamento m
        ON m.id_medicamento = l.id_medicamento
    INNER JOIN proveedor p
        ON p.id_proveedor = l.id_proveedor
`;

/**
 * Listar lotes.
 * Permite buscar por medicamento, proveedor,
 * código de barras o número de lote.
 */
const listar = async (buscar = '') => {
    const termino = String(buscar || '').trim();

    const { rows } = await db.query(
        `SELECT ${CAMPOS_LOTE}
         ${TABLAS_LOTE}
         WHERE
            $2 = ''
            OR ${coincidePalabraPorPrefijo('m.nombre_comercial', '$3')}
            OR ${coincidePalabraPorPrefijo('m.codigo_barras', '$3')}
            OR ${coincidePalabraPorPrefijo('p.nombre_comercial', '$3')}
            OR ${coincidePalabraPorPrefijo('l.lote_numero', '$3')}
         ORDER BY
            CASE WHEN l.fecha_baja IS NOT NULL THEN 1 ELSE 0 END,
            l.fecha_vencimiento ASC,
            m.nombre_comercial ASC`,
        [
            parametros.margenAlertaDias,
            termino,
            termino
        ]
    );

    return rows;
};

/**
 * Buscar lote por identificador.
 */
const buscarPorId = async (idLote) => {
    const { rows } = await db.query(
        `SELECT ${CAMPOS_LOTE}
         ${TABLAS_LOTE}
         WHERE l.id_lote = $2`,
        [parametros.margenAlertaDias, idLote]
    );

    return rows[0] || null;
};

/**
 * Registrar una recepción.
 *
 * Se realizan dos operaciones dentro de una transacción:
 * 1. Insertar el lote recibido.
 * 2. Registrar la recepción en el historial.
 *
 * Si cualquiera falla, ambas operaciones se revierten.
 */
const registrarRecepcion = async (datos, idUsuario) => {
    return db.conTransaccion(async (cliente) => {

        const { rows } = await cliente.query(
            `INSERT INTO lote (
                id_medicamento,
                id_proveedor,
                lote_numero,
                fecha_vencimiento,
                costo_unitario,
                cantidad_stock
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id_lote, fecha_recepcion`,
            [
                datos.id_medicamento,
                datos.id_proveedor,
                datos.lote_numero,
                datos.fecha_vencimiento,
                datos.costo_unitario,
                datos.cantidad_stock
            ]
        );

        const lote = rows[0];

        await cliente.query(
            `INSERT INTO historial_operacion (
                id_usuario,
                tipo_operacion,
                id_registro
            )
            VALUES ($1, 'RECEPCION', $2)`,
            [
                idUsuario,
                lote.id_lote
            ]
        );

        return lote;
    });
};

/**
 * Dar de baja un lote vencido.
 *
 * Solo se actualizan lotes vencidos que todavía
 * no tengan registrada una baja.
 *
 * La cantidad restante pasa a cero y se conserva
 * el registro histórico.
 */
const darBajaVencido = async (idLote, idUsuario) => {
    return db.conTransaccion(async (cliente) => {

        const { rows } = await cliente.query(
            `UPDATE lote
             SET
                fecha_baja = CURRENT_DATE,
                cantidad_stock = 0
             WHERE id_lote = $1
               AND fecha_baja IS NULL
               AND fecha_vencimiento < CURRENT_DATE
             RETURNING id_lote`,
            [idLote]
        );

        if (rows.length === 0) {
            return null;
        }

        const lote = rows[0];

        await cliente.query(
            `INSERT INTO historial_operacion (
                id_usuario,
                tipo_operacion,
                id_registro
            )
            VALUES ($1, 'BAJA', $2)`,
            [
                idUsuario,
                lote.id_lote
            ]
        );

        return lote;
    });
};

module.exports = {
    listar,
    buscarPorId,
    registrarRecepcion,
    darBajaVencido
};
