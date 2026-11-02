
/**
 * Repositorio de proveedores.
 * Contiene exclusivamente las consultas SQL.
 */

const db = require('../connection');

const CAMPOS_PROVEEDOR = `
    id_proveedor,
    nombre_comercial,
    ruc_nit,
    telefono,
    correo_electronico,
    direccion
`;

/**
 * Listar proveedores.
 * Permite buscar por nombre, RUC/NIT, teléfono o correo.
 */
const listar = async (buscar = '') => {
    const termino = String(buscar || '').trim();

    const { rows } = await db.query(
        `SELECT ${CAMPOS_PROVEEDOR}
         FROM proveedor
         WHERE
            $1 = ''
            OR nombre_comercial ILIKE $2
            OR ruc_nit ILIKE $2
            OR COALESCE(telefono, '') ILIKE $2
            OR COALESCE(correo_electronico, '') ILIKE $2
         ORDER BY nombre_comercial ASC`,
        [termino, `%${termino}%`]
    );

    return rows;
};

/**
 * Buscar proveedor por su identificador.
 */
const buscarPorId = async (idProveedor) => {
    const { rows } = await db.query(
        `SELECT ${CAMPOS_PROVEEDOR}
         FROM proveedor
         WHERE id_proveedor = $1`,
        [idProveedor]
    );

    return rows[0] || null;
};

/**
 * Registrar un proveedor.
 */
const crear = async ({
    nombre_comercial,
    ruc_nit,
    telefono,
    correo_electronico,
    direccion,
}) => {
    const { rows } = await db.query(
        `INSERT INTO proveedor (
            nombre_comercial,
            ruc_nit,
            telefono,
            correo_electronico,
            direccion
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING ${CAMPOS_PROVEEDOR}`,
        [
            nombre_comercial,
            ruc_nit,
            telefono,
            correo_electronico,
            direccion,
        ]
    );

    return rows[0];
};

/**
 * Actualizar proveedor.
 */
const actualizar = async (
    idProveedor,
    {
        nombre_comercial,
        ruc_nit,
        telefono,
        correo_electronico,
        direccion,
    }
) => {
    const { rows } = await db.query(
        `UPDATE proveedor
         SET
            nombre_comercial = $1,
            ruc_nit = $2,
            telefono = $3,
            correo_electronico = $4,
            direccion = $5
         WHERE id_proveedor = $6
         RETURNING ${CAMPOS_PROVEEDOR}`,
        [
            nombre_comercial,
            ruc_nit,
            telefono,
            correo_electronico,
            direccion,
            idProveedor,
        ]
    );

    return rows[0] || null;
};

module.exports = {
    listar,
    buscarPorId,
    crear,
    actualizar,
};
