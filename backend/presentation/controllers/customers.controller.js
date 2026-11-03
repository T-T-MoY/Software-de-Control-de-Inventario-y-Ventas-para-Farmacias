/**
 * Controlador HTTP de clientes.
 */
const clientesServicio = require('../../business/services/customers.service');
const {
    esIdValido,
    validarDatosCliente,
} = require('../validators/sales.validator');

const obtenerClientes = async (req, res, next) => {
    try {
        const buscar = typeof req.query.buscar === 'string'
            ? req.query.buscar.trim()
            : '';
        return res.json(await clientesServicio.listar(buscar));
    } catch (error) {
        return next(error);
    }
};

const obtenerCliente = async (req, res, next) => {
    if (!esIdValido(req.params.id)) {
        return res.status(400).json({ error: 'Identificador de cliente inválido.' });
    }
    try {
        return res.json(await clientesServicio.obtener(Number(req.params.id)));
    } catch (error) {
        return next(error);
    }
};

const crearCliente = async (req, res, next) => {
    const errorValidacion = validarDatosCliente(req.body);
    if (errorValidacion) {
        return res.status(400).json({ error: errorValidacion });
    }
    try {
        const cliente = await clientesServicio.crear(req.body);
        return res.status(201).json({
            message: 'Cliente registrado correctamente.',
            cliente,
        });
    } catch (error) {
        return next(error);
    }
};

const actualizarCliente = async (req, res, next) => {
    if (!esIdValido(req.params.id)) {
        return res.status(400).json({ error: 'Identificador de cliente inválido.' });
    }
    const errorValidacion = validarDatosCliente(req.body);
    if (errorValidacion) {
        return res.status(400).json({ error: errorValidacion });
    }
    try {
        const cliente = await clientesServicio.actualizar(
            Number(req.params.id),
            req.body
        );
        return res.json({
            message: 'Cliente actualizado correctamente.',
            cliente,
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    obtenerClientes,
    obtenerCliente,
    crearCliente,
    actualizarCliente,
};
