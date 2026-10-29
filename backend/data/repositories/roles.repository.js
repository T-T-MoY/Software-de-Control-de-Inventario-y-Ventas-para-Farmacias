/**
 * Acceso a la tabla rol.
 */
const db = require('../connection');

const listar = async () => {
    const { rows } = await db.query(
        'SELECT id_rol, nombre_rol FROM rol ORDER BY id_rol'
    );
    return rows;
};

const buscarPorId = async (idRol) => {
    const { rows } = await db.query(
        'SELECT id_rol, nombre_rol FROM rol WHERE id_rol = $1',
        [idRol]
    );
    return rows[0] || null;
};

module.exports = { listar, buscarPorId };
