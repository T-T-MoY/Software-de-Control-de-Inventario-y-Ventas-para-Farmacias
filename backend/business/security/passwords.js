/**
 * Hashing de contraseñas (capa de negocio / seguridad).
 * bcrypt es un detalle de infraestructura, pero la política de costo
 * pertenece a las reglas de seguridad del sistema.
 */
const bcrypt = require('bcrypt');

/**
 * Coste de bcrypt para todo el sistema.
 * Debe coincidir con el coste del hash inicial definido en database/02_inserts.sql.
 */
const BCRYPT_ROUNDS = 12;

const hashPassword = (password) => bcrypt.hash(password, BCRYPT_ROUNDS);

const verifyPassword = (password, hash) => bcrypt.compare(password, hash);

module.exports = { BCRYPT_ROUNDS, hashPassword, verifyPassword };
