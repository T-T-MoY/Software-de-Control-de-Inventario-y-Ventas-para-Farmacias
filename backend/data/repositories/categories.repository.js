/**
 * Acceso a la tabla categoria.
 * Las categorías se cargan con los datos iniciales de la base y se
 * consultan para clasificar los medicamentos del catálogo.
 */
const db = require('../connection');

const listar = async () => {
    const { rows } = await db.query(
        `SELECT id_categoria, nombre_categoria
         FROM categoria
         ORDER BY nombre_categoria`
    );
    return rows;
};

module.exports = { listar };
