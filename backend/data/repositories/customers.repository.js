/**
 * Consultas de clientes.
 */
const db = require('../connection');

const CAMPOS_CLIENTE = `
    id_cliente,
    nombres,
    apellido_paterno,
    apellido_materno,
    ci_nit
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
            nombres, apellido_paterno, apellido_materno, ci_nit
         )
         VALUES ($1, $2, $3, $4)
         RETURNING ${CAMPOS_CLIENTE}`,
        [
            datos.nombres,
            datos.apellido_paterno,
            datos.apellido_materno,
            datos.ci_nit,
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
             ci_nit = $4
         WHERE id_cliente = $5
         RETURNING ${CAMPOS_CLIENTE}`,
        [
            datos.nombres,
            datos.apellido_paterno,
            datos.apellido_materno,
            datos.ci_nit,
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
