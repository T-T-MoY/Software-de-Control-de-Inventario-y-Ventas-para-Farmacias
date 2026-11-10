/**
 * Conexión única a PostgreSQL (capa de datos).
 *
 * Los repositorios reciben este pool y ejecutan el SQL. Ninguna capa
 * superior escribe consultas: solo llama a los repositorios.
 */
const { Pool } = require('pg');
require('../config/env');

// Los proveedores en la nube (Neon, Render) exigen SSL. Si se usa
// DATABASE_URL se activa por defecto; DB_SSL=false lo desactiva y DB_SSL=true
// lo fuerza. En local, con el PostgreSQL de Docker, queda desactivado.
const usarSsl = process.env.DB_SSL === 'true'
    || (Boolean(process.env.DATABASE_URL) && process.env.DB_SSL !== 'false');
const ssl = usarSsl ? { rejectUnauthorized: false } : false;

// DATABASE_URL permite pegar directamente la cadena de conexión del
// proveedor. Si no existe, se usan las variables DB_* por separado.
const configuracion = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl }
    : {
        user: process.env.DB_USER || process.env.POSTGRES_USER || 'admin',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || process.env.POSTGRES_DB || 'control_farmacia',
        password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD,
        port: Number(process.env.DB_PORT || 5432),
        ssl,
    };

const pool = new Pool(configuracion);

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
