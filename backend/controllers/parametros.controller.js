const parametros = require('../config/parametros');

// Lectura de los parámetros generales. Los módulos de inventario y ventas
// los consumen desde backend/config/parametros.js; este endpoint los expone
// a la interfaz sin agregar tablas ni permisos nuevos.
const obtenerParametros = (req, res) => res.json({
    margenAlertaDias: parametros.margenAlertaDias,
    stockSeguridad: parametros.stockSeguridad,
    farmacia: parametros.farmacia,
});

module.exports = { obtenerParametros };
