/**
 * Consultas y transacciones del módulo de ventas.
 */
const db = require('../connection');
const { margenAlertaDias } = require('../../config/parameters');

const listarCatalogo = async (buscar = '') => {
    const termino = String(buscar || '').trim();
    const { rows } = await db.query(
        `SELECT
            m.id_medicamento,
            m.codigo_barras,
            m.nombre_comercial,
            m.dci,
            m.concentracion,
            m.forma_farmaceutica,
            m.foto_url AS imagen_url,
            m.precio_unitario::text AS precio_unitario,
            m.tipo_venta,
            COALESCE(stock.disponible, 0)::bigint AS stock_disponible,
            COALESCE(stock.lotes_por_vencer, 0)::bigint AS lotes_por_vencer
         FROM medicamento AS m
         LEFT JOIN LATERAL (
            SELECT
                SUM(l.cantidad_stock) AS disponible,
                COUNT(*) FILTER (
                    WHERE l.fecha_vencimiento <= CURRENT_DATE + $1::integer
                ) AS lotes_por_vencer
            FROM lote AS l
            WHERE l.id_medicamento = m.id_medicamento
              AND l.fecha_baja IS NULL
              AND l.fecha_vencimiento >= CURRENT_DATE
              AND l.cantidad_stock > 0
         ) AS stock ON TRUE
         WHERE m.estado_medicamento = 'Activo'
           AND COALESCE(stock.disponible, 0) > 0
           AND (
                $2 = ''
                OR m.nombre_comercial ILIKE $3
                OR m.dci ILIKE $3
                OR m.codigo_barras ILIKE $3
                OR m.concentracion ILIKE $3
           )
         ORDER BY m.nombre_comercial`,
        [margenAlertaDias, termino, `%${termino}%`]
    );
    return rows;
};

const buscarMedicamentos = async (ids) => {
    const { rows } = await db.query(
        `SELECT
            m.id_medicamento,
            m.nombre_comercial,
            m.precio_unitario::text AS precio_unitario,
            m.tipo_venta,
            m.estado_medicamento,
            COALESCE((
                SELECT SUM(l.cantidad_stock)
                FROM lote AS l
                WHERE l.id_medicamento = m.id_medicamento
                  AND l.fecha_baja IS NULL
                  AND l.fecha_vencimiento >= CURRENT_DATE
                  AND l.cantidad_stock > 0
            ), 0)::bigint AS stock_disponible
         FROM medicamento AS m
         WHERE m.id_medicamento = ANY($1::int[])`,
        [ids]
    );
    return rows;
};

const crear = async (datos, idUsuario) => db.conTransaccion(async (cliente) => {
    const clienteResult = await cliente.query(
        `SELECT nombres, apellido_paterno, apellido_materno
         FROM cliente
         WHERE id_cliente = $1`,
        [datos.id_cliente]
    );

    if (clienteResult.rows.length === 0) {
        const error = new Error('El cliente no existe.');
        error.code = 'CLIENTE_NO_ENCONTRADO';
        throw error;
    }

    const asignaciones = [];
    for (const item of [...datos.items].sort(
        (a, b) => a.id_medicamento - b.id_medicamento
    )) {
        const medicamentoResult = await cliente.query(
            `SELECT id_medicamento, nombre_comercial,
                    precio_unitario::text AS precio_unitario,
                    estado_medicamento
             FROM medicamento
             WHERE id_medicamento = $1
             FOR SHARE`,
            [item.id_medicamento]
        );
        const medicamento = medicamentoResult.rows[0];

        if (!medicamento || medicamento.estado_medicamento !== 'Activo') {
            const error = new Error('El medicamento ya no está disponible.');
            error.code = 'MEDICAMENTO_NO_DISPONIBLE';
            throw error;
        }

        if (Number(medicamento.precio_unitario) !== Number(item.precio_unitario)) {
            const error = new Error('El precio del catálogo cambió; revisa el carrito.');
            error.code = 'PRECIO_ACTUALIZADO';
            throw error;
        }

        let pendiente = item.cantidad;
        const lotesResult = await cliente.query(
            `SELECT
                id_lote,
                cantidad_stock,
                (fecha_vencimiento <= CURRENT_DATE + $2::integer) AS por_vencer
             FROM lote
             WHERE id_medicamento = $1
               AND fecha_baja IS NULL
               AND fecha_vencimiento >= CURRENT_DATE
               AND cantidad_stock > 0
             ORDER BY fecha_vencimiento, id_lote
             FOR UPDATE`,
            [item.id_medicamento, margenAlertaDias]
        );

        for (const lote of lotesResult.rows) {
            if (pendiente === 0) break;
            const cantidad = Math.min(pendiente, lote.cantidad_stock);
            await cliente.query(
                `UPDATE lote
                 SET cantidad_stock = cantidad_stock - $1
                 WHERE id_lote = $2`,
                [cantidad, lote.id_lote]
            );
            asignaciones.push({
                id_medicamento: item.id_medicamento,
                id_lote: lote.id_lote,
                cantidad,
                precio_venta: item.precio_unitario,
                por_vencer: lote.por_vencer,
            });
            pendiente -= cantidad;
        }

        if (pendiente > 0) {
            const error = new Error('La cantidad solicitada supera el stock disponible.');
            error.code = 'STOCK_INSUFICIENTE';
            throw error;
        }
    }

    const ventaResult = await cliente.query(
        `INSERT INTO venta (
            id_cliente, id_usuario, descuento_porcentaje, monto_recibido
         )
         VALUES ($1, $2, $3, $4)
         RETURNING id_venta, fecha_hora_venta`,
        [
            datos.id_cliente,
            idUsuario,
            datos.descuento_porcentaje,
            datos.monto_recibido,
        ]
    );
    const venta = ventaResult.rows[0];

    for (const asignacion of asignaciones) {
        await cliente.query(
            `INSERT INTO dispensa (
                id_venta, id_lote, cantidad, precio_venta
             )
             VALUES ($1, $2, $3, $4)`,
            [
                venta.id_venta,
                asignacion.id_lote,
                asignacion.cantidad,
                asignacion.precio_venta,
            ]
        );
    }

    const prefijo = datos.tipo_comprobante === 'Factura' ? 'F' : 'NV';
    const comprobanteResult = await cliente.query(
        `INSERT INTO comprobante_venta (
            id_venta, tipo_comprobante, num_serie, formato_impresion
         )
         SELECT
            id_venta,
            $2,
            $3 || '-' || to_char(fecha_hora_venta, 'YYYY') || '-'
                || lpad(id_venta::text, 6, '0'),
            $4
         FROM venta
         WHERE id_venta = $1
         RETURNING tipo_comprobante, num_serie, fecha_emision`,
        [
            venta.id_venta,
            datos.tipo_comprobante,
            prefijo,
            datos.formato_impresion,
        ]
    );

    await cliente.query(
        `INSERT INTO historial_operacion (
            id_usuario, tipo_operacion, id_registro
         )
         VALUES ($1, 'VENTA', $2)`,
        [idUsuario, venta.id_venta]
    );

    const clienteVenta = clienteResult.rows[0];
    const itemsVenta = datos.items.map((item) => ({
        id_medicamento: item.id_medicamento,
        descripcion: item.nombre_comercial,
        cantidad: item.cantidad,
        precio_unitario: Number(item.precio_unitario),
        subtotal: item.subtotal,
    }));

    return {
        id_venta: venta.id_venta,
        fecha_hora_venta: venta.fecha_hora_venta,
        cliente: [
            clienteVenta.nombres,
            clienteVenta.apellido_paterno,
            clienteVenta.apellido_materno,
        ].filter(Boolean).join(' '),
        ...comprobanteResult.rows[0],
        items: itemsVenta,
        subtotal: datos.subtotal,
        descuento_monto: datos.descuento_monto,
        total: datos.total,
        monto_recibido: Number(datos.monto_recibido),
        cambio: datos.cambio,
        lotes_por_vencer: asignaciones
            .filter((asignacion) => asignacion.por_vencer)
            .map((asignacion) => asignacion.id_lote),
    };
});

module.exports = {
    listarCatalogo,
    buscarMedicamentos,
    crear,
};
