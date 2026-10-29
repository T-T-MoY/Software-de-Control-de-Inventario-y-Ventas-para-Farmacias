// backend/config/db.js
const { Pool } = require('pg');
require('./env');

const pool = new Pool({
    user: process.env.DB_USER || process.env.POSTGRES_USER || 'admin',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || process.env.POSTGRES_DB || 'control_farmacia',
    password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD,
    port: Number(process.env.DB_PORT || 5432),
});

module.exports = pool;