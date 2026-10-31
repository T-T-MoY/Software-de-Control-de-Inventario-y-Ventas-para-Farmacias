/**
 * Acceso a la tabla medicamento.
 * Todo el SQL del catálogo vive aquí; el stock vigente se calcula
 * sumando los lotes disponibles (sin baja y no vencidos).
 */
const db = require('../connection');

const CAMPOS_MEDICAMENTO = `
    m.id_medicamento,
    m.codigo_barras,
    m.nombre_comercial,
    m.dci,
    m.concentracion,
    m.forma_farmaceutica,
    m.precio_unitario::float8 AS precio_unitario,
    m.tipo_venta,
    m.stock_seguridad,
    m.dias_reposicion,
    m.estado_medicamento,
    m.foto_url,
    m.id_categoria,
    c.nombre_categoria,
    COALESCE((
        SELECT SUM(l.cantidad_stock)
        FROM lote AS l
        WHERE l.id_medicamento = m.id_medicamento
          AND l.fecha_baja IS NULL
          AND l.fecha_vencimiento >= CURRENT_DATE
    ), 0)::int AS stock_vigente
`;

/**
 * Lista el catálogo. Los filtros son opcionales y se combinan entre sí.
 * `buscar` cubre nombre comercial, DCI, categoría y código de barras.
 */
const listar = async ({ buscar, idCategoria, estado } = {}) => {
    const filtros = [];
    const valores = [];

    if (buscar) {
        valores.push(`%${buscar}%`);
        filtros.push(`(
            m.nombre_comercial ILIKE $${valores.length}
            OR m.dci ILIKE $${valores.length}
            OR m.codigo_barras ILIKE $${valores.length}
            OR c.nombre_categoria ILIKE $${valores.length}
        )`);
    }

    if (idCategoria) {
        valores.push(idCategoria);
        filtros.push(`m.id_categoria = $${valores.length}`);
    }

    if (estado) {
        valores.push(estado);
        filtros.push(`m.estado_medicamento = $${valores.length}`);
    }

    filtros.push(`m.estado_medicamento <> 'Eliminado'`);
    const where = `WHERE ${filtros.join(' AND ')}`;

    const { rows } = await db.query(
        `SELECT ${CAMPOS_MEDICAMENTO}
         FROM medicamento AS m
         JOIN categoria AS c ON c.id_categoria = m.id_categoria
         ${where}
         ORDER BY m.nombre_comercial`,
        valores
    );
    return rows;
};

const buscarPorId = async (idMedicamento) => {
    const { rows } = await db.query(
        `SELECT ${CAMPOS_MEDICAMENTO}
         FROM medicamento AS m
         JOIN categoria AS c ON c.id_categoria = m.id_categoria
         WHERE m.id_medicamento = $1
           AND m.estado_medicamento <> 'Eliminado'`,
        [idMedicamento]
    );
    return rows[0] || null;
};

const crear = async ({
    codigo_barras,
    nombre_comercial,
    dci,
    concentracion,
    forma_farmaceutica,
    precio_unitario,
    tipo_venta,
    stock_seguridad,
    dias_reposicion,
    id_categoria,
}) => {
    const { rows } = await db.query(
        `INSERT INTO medicamento (
            codigo_barras, nombre_comercial, dci, concentracion,
            forma_farmaceutica, precio_unitario, tipo_venta,
            stock_seguridad, dias_reposicion, id_categoria
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id_medicamento`,
        [
            codigo_barras,
            nombre_comercial,
            dci,
            concentracion,
            forma_farmaceutica,
            precio_unitario,
            tipo_venta,
            stock_seguridad,
            dias_reposicion,
            id_categoria,
        ]
    );
    return rows[0].id_medicamento;
};

/**
 * Actualiza los datos del medicamento sin tocar su estado.
 * Si stock_seguridad o dias_reposicion llegan nulos, se conserva el valor
 * actual (COALESCE), para que una edición parcial no los reinicie.
 */
const actualizar = async (idMedicamento, {
    codigo_barras,
    nombre_comercial,
    dci,
    concentracion,
    forma_farmaceutica,
    precio_unitario,
    tipo_venta,
    stock_seguridad,
    dias_reposicion,
    id_categoria,
}) => {
    const { rowCount } = await db.query(
        `UPDATE medicamento
         SET codigo_barras = $1,
             nombre_comercial = $2,
             dci = $3,
             concentracion = $4,
             forma_farmaceutica = $5,
             precio_unitario = $6,
             tipo_venta = $7,
             stock_seguridad = COALESCE($8, stock_seguridad),
             dias_reposicion = COALESCE($9, dias_reposicion),
             id_categoria = $10
         WHERE id_medicamento = $11
           AND estado_medicamento <> 'Eliminado'`,
        [
            codigo_barras,
            nombre_comercial,
            dci,
            concentracion,
            forma_farmaceutica,
            precio_unitario,
            tipo_venta,
            stock_seguridad ?? null,
            dias_reposicion ?? null,
            id_categoria,
            idMedicamento,
        ]
    );
    return rowCount;
};

/** Activa o desactiva medicamentos que no hayan sido eliminados. */
const cambiarEstado = async (idMedicamento, activo) => {
    const { rowCount } = await db.query(
        `UPDATE medicamento
         SET estado_medicamento = $1
         WHERE id_medicamento = $2
           AND estado_medicamento <> 'Eliminado'`,
        [activo ? 'Activo' : 'Inactivo', idMedicamento]
    );
    return rowCount;
};

/** Baja lógica: conserva el medicamento y todos los registros relacionados. */
const eliminarLogicamente = async (idMedicamento) => {
    const { rowCount } = await db.query(
        `UPDATE medicamento
         SET estado_medicamento = 'Eliminado'
         WHERE id_medicamento = $1
           AND estado_medicamento <> 'Eliminado'`,
        [idMedicamento]
    );
    return rowCount;
};

const obtenerFoto = async (idMedicamento) => {
    const { rows } = await db.query(
        `SELECT foto_url
         FROM medicamento
         WHERE id_medicamento = $1`,
        [idMedicamento]
    );
    return rows[0] || null;
};

const actualizarFoto = async (idMedicamento, fotoUrl) => {
    const { rowCount } = await db.query(
        `UPDATE medicamento
         SET foto_url = $1
         WHERE id_medicamento = $2
           AND estado_medicamento <> 'Eliminado'`,
        [fotoUrl, idMedicamento]
    );
    return rowCount;
};

module.exports = {
    listar,
    buscarPorId,
    crear,
    actualizar,
    cambiarEstado,
    eliminarLogicamente,
    obtenerFoto,
    actualizarFoto,
};
