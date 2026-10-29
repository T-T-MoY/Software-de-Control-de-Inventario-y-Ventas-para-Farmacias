/**
 * Caso de uso: parámetros generales del sistema.
 * No requiere base de datos: se leen del entorno en config/parameters.js.
 */
const parametros = require('../../config/parameters');

const obtener = () => ({
    margenAlertaDias: parametros.margenAlertaDias,
    stockSeguridad: parametros.stockSeguridad,
    farmacia: parametros.farmacia,
});

module.exports = { obtener };
