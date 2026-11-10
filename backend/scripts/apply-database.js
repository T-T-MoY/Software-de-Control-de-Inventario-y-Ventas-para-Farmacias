/**
 * Aplica en orden los scripts de `database/` sobre la base configurada.
 *
 * Usa `DATABASE_URL_UNPOOLED` (conexión directa, recomendada para DDL) o
 * `DATABASE_URL` como respaldo. Si la base ya tiene el esquema (tabla `rol`),
 * no hace nada para evitar errores por ejecutar los scripts dos veces.
 *
 *   npm run db:apply
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('../config/env');

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!connectionString) {
    console.error(
        'Falta DATABASE_URL_UNPOOLED o DATABASE_URL. ' +
        'Ejecuta `neon env pull` o configura la conexión en .env.'
    );
    process.exit(1);
}

const directorio = path.resolve(__dirname, '..', '..', 'database');
const archivos = fs.readdirSync(directorio)
    .filter((archivo) => archivo.endsWith('.sql'))
    .sort();

const cliente = new Client({
    connectionString,
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
});

const main = async () => {
    await cliente.connect();

    const { rows } = await cliente.query("SELECT to_regclass('public.rol') AS tabla");
    if (rows[0].tabla) {
        console.log('La base ya tiene el esquema (tabla rol). No se aplican cambios.');
        return;
    }

    for (const archivo of archivos) {
        const sql = fs.readFileSync(path.join(directorio, archivo), 'utf8');
        process.stdout.write(`→ ${archivo} ... `);
        await cliente.query(sql);
        console.log('OK');
    }

    console.log(`Esquema y datos iniciales aplicados (${archivos.length} scripts).`);
};

main()
    .catch((error) => {
        console.error('\nNo se pudo aplicar el esquema:', error.message);
        process.exitCode = 1;
    })
    .finally(() => cliente.end());
