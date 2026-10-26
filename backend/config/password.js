const bcrypt = require('bcrypt');

/**
 * Coste de bcrypt para todo el sistema.
 * Debe coincidir con el coste del hash inicial definido en database/03_datos_iniciales.sql.
 */
const BCRYPT_ROUNDS = 12;

const hashPassword = (password) => bcrypt.hash(password, BCRYPT_ROUNDS);

const verifyPassword = (password, hash) => bcrypt.compare(password, hash);

module.exports = { BCRYPT_ROUNDS, hashPassword, verifyPassword };
