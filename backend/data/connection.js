/**
 * Conexión única a PostgreSQL (capa de datos).
 *
 * Los repositorios reciben este pool y ejecutan el SQL. Ninguna capa
 * superior escribe consultas: solo llama a los repositorios.
 */
const { Pool } = require('pg');
require('../config/env');

const pool = new Pool({
    user: process.env.DB_USER || process.env.POSTGRES_USER || 'admin',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || process.env.POSTGRES_DB || 'control_farmacia',
    password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD,
    port: Number(process.env.DB_PORT || 5432),
});

/**
 * Ejecuta varias operaciones dentro de una transacción.
 *
 * Se usará en los procesos que modifican más de una tabla a la vez
 * (por ejemplo, registrar una venta: venta + dispensa + descuento de stock).
 *
 *   await conTransaccion((cliente) => { ... });
 */
const conTransaccion = async (operacion) => {
    const cliente = await pool.connect();
    try {
        await cliente.query('BEGIN');
        const resultado = await operacion(cliente);
        await cliente.query('COMMIT');
        return resultado;
    } catch (error) {
        await cliente.query('ROLLBACK');
        throw error;
    } finally {
        cliente.release();
    }
};

module.exports = pool;
module.exports.conTransaccion = conTransaccion;
