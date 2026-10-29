/**
 * Controlador de parámetros generales (capa de presentación).
 */
const parametrosServicio = require('../../business/services/parameters.service');

const obtenerParametros = (req, res) => res.json(parametrosServicio.obtener());

module.exports = { obtenerParametros };
