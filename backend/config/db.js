// backend/config/db.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'admin',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'control_farmacia',
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT || 5432),
});

module.exports = pool;