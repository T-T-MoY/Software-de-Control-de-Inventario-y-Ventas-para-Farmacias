/**
 * Controlador de parámetros generales (capa de presentación).
 */
const parametrosServicio = require('../../business/services/parameters.service');
const {
    validarDatosParametros,
    normalizarDatosParametros,
} = require('../validators/parameters.validator');

const obtenerParametros = (req, res) => res.json(parametrosServicio.obtener());

const actualizarParametros = async (req, res, next) => {
    const errorValidacion = validarDatosParametros(req.body);
    if (errorValidacion) {
        return res.status(400).json({ error: errorValidacion });
    }

    try {
        const parametros = await parametrosServicio.actualizar(
            normalizarDatosParametros(req.body)
        );

        return res.json(parametros);
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    obtenerParametros,
    actualizarParametros,
};
