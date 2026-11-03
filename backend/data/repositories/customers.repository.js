/**
 * Consultas de clientes.
 */
const db = require('../connection');

const CAMPOS_CLIENTE = `
    id_cliente,
    nombres,
    apellido_paterno,
    apellido_materno,
    ci_nit,
    telefono,
    domicilio
`;

const listar = async (buscar = '') => {
    const termino = String(buscar || '').trim();
    const { rows } = await db.query(
        `SELECT ${CAMPOS_CLIENTE}
         FROM cliente
         WHERE $1 = ''
            OR nombres ILIKE $2
            OR apellido_paterno ILIKE $2
            OR apellido_materno ILIKE $2
            OR ci_nit ILIKE $2
            OR telefono ILIKE $2
         ORDER BY nombres, apellido_paterno, ci_nit`,
        [termino, `%${termino}%`]
    );
    return rows;
};

const buscarPorId = async (idCliente) => {
    const { rows } = await db.query(
        `SELECT ${CAMPOS_CLIENTE}
         FROM cliente
         WHERE id_cliente = $1`,
        [idCliente]
    );
    return rows[0] || null;
};

const crear = async (datos) => {
    const { rows } = await db.query(
        `INSERT INTO cliente (
            nombres, apellido_paterno, apellido_materno,
            ci_nit, telefono, domicilio
         )
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING ${CAMPOS_CLIENTE}`,
        [
            datos.nombres,
            datos.apellido_paterno,
            datos.apellido_materno,
            datos.ci_nit,
            datos.telefono,
            datos.domicilio,
        ]
    );
    return rows[0];
};

const actualizar = async (idCliente, datos) => {
    const { rows } = await db.query(
        `UPDATE cliente
         SET nombres = $1,
             apellido_paterno = $2,
             apellido_materno = $3,
             ci_nit = $4,
             telefono = $5,
             domicilio = $6
         WHERE id_cliente = $7
         RETURNING ${CAMPOS_CLIENTE}`,
        [
            datos.nombres,
            datos.apellido_paterno,
            datos.apellido_materno,
            datos.ci_nit,
            datos.telefono,
            datos.domicilio,
            idCliente,
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
