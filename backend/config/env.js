// backend/config/env.js
// Carga única del .env de la raíz del repositorio. Sin esto, al ejecutar
// `npm run dev` desde backend/ dotenv buscaría backend/.env y no lo hallaría.
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

module.exports = process.env;
