/**
 * Controlador HTTP de ventas.
 */
const ventasServicio = require('../../business/services/sales.service');
const parametros = require('../../config/parameters');
const { validarDatosVenta } = require('../validators/sales.validator');

const obtenerCatalogo = async (req, res, next) => {
    try {
        const buscar = typeof req.query.buscar === 'string'
            ? req.query.buscar.trim()
            : '';
        return res.json(await ventasServicio.listarCatalogo(buscar));
    } catch (error) {
        return next(error);
    }
};

const crearVenta = async (req, res, next) => {
    const errorValidacion = validarDatosVenta(req.body);
    if (errorValidacion) {
        return res.status(400).json({ error: errorValidacion });
    }
    try {
        const venta = await ventasServicio.crear(
            req.body,
            req.sessionUser.id_usuario
        );
        return res.status(201).json({
            message: 'Venta registrada correctamente.',
            venta,
            farmacia: { ...parametros.farmacia },
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    obtenerCatalogo,
    crearVenta,
};
