/**
 * Repositorio de configuración del sistema.
 *
 * Guarda pares clave/valor en la tabla `configuracion`. Los valores
 * ausentes se resuelven en el servicio con los del entorno (.env).
 */
const db = require('../connection');

/**
 * Listar todas las claves guardadas.
 */
const listar = async () => {
    const { rows } = await db.query(
        `SELECT clave, valor
         FROM configuracion
         ORDER BY clave`
    );

    return rows;
};

/**
 * Guardar o actualizar varias claves dentro de una transacción.
 */
const guardar = async (valores) => {
    const entradas = Object.entries(valores);

    await db.conTransaccion(async (cliente) => {
        for (const [clave, valor] of entradas) {
            await cliente.query(
                `INSERT INTO configuracion (clave, valor, actualizado)
                 VALUES ($1, $2, CURRENT_TIMESTAMP)
                 ON CONFLICT (clave) DO UPDATE
                 SET valor = EXCLUDED.valor,
                     actualizado = CURRENT_TIMESTAMP`,
                [clave, valor === null ? null : String(valor)]
            );
        }
    });
};

module.exports = {
    listar,
    guardar,
};
