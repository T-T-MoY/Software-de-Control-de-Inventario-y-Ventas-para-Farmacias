
/**
 * Controlador de lotes.
 * Recibe las peticiones HTTP y delega en la capa de negocio.
 */

const lotesServicio = require(
    '../../business/services/lots.service'
);

const {
    validarDatosRecepcion,
    esIdValido,
} = require('../validators/lot.validator');

// GET /api/lotes
const obtenerLotes = async (req, res, next) => {
    try {
        const buscar = typeof req.query.buscar === 'string'
            ? req.query.buscar.trim()
            : '';

        const lotes = await lotesServicio.listar(buscar);

        return res.json(lotes);
    } catch (error) {
        return next(error);
    }
};

// GET /api/lotes/:id
const obtenerLote = async (req, res, next) => {
    if (!esIdValido(req.params.id)) {
        return res.status(400).json({
            error: 'Identificador de lote inválido.',
        });
    }

    try {
        const lote = await lotesServicio.obtener(
            Number(req.params.id)
        );

        return res.json(lote);
    } catch (error) {
        return next(error);
    }
};

// POST /api/lotes/recepciones
const registrarRecepcion = async (req, res, next) => {
    const errorValidacion = validarDatosRecepcion(req.body);

    if (errorValidacion) {
        return res.status(400).json({
            error: errorValidacion,
        });
    }

    try {
        const lote = await lotesServicio.registrarRecepcion(
            req.body,
            req.sessionUser.id_usuario
        );

        return res.status(201).json({
            message: 'Recepción registrada correctamente.',
            lote,
        });
    } catch (error) {
        return next(error);
    }
};

// PATCH /api/lotes/:id/baja
const darBajaLote = async (req, res, next) => {
    if (!esIdValido(req.params.id)) {
        return res.status(400).json({
            error: 'Identificador de lote inválido.',
        });
    }

    try {
        const lote = await lotesServicio.darBajaVencido(
            Number(req.params.id),
            req.sessionUser.id_usuario
        );

        return res.json({
            message: 'Lote dado de baja correctamente.',
            lote,
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    obtenerLotes,
    obtenerLote,
    registrarRecepcion,
    darBajaLote,
};
