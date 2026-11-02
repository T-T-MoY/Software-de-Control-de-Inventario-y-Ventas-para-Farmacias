
/**
 * Controlador de proveedores.
 * Valida las peticiones HTTP y delega las operaciones
 * a la capa de negocio.
 */

const proveedoresServicio = require(
    '../../business/services/suppliers.service'
);

const {
    validarDatosProveedor,
} = require('../validators/supplier.validator');

const esIdValido = (id) => (
    /^\d+$/.test(String(id)) && Number(id) > 0
);

// GET /api/proveedores
const obtenerProveedores = async (req, res, next) => {
    try {
        const buscar = typeof req.query.buscar === 'string'
            ? req.query.buscar.trim()
            : '';

        const proveedores = await proveedoresServicio.listar(buscar);

        return res.json(proveedores);
    } catch (error) {
        return next(error);
    }
};

// GET /api/proveedores/:id
const obtenerProveedor = async (req, res, next) => {
    if (!esIdValido(req.params.id)) {
        return res.status(400).json({
            error: 'Identificador de proveedor inválido.',
        });
    }

    try {
        const proveedor = await proveedoresServicio.obtener(
            Number(req.params.id)
        );

        return res.json(proveedor);
    } catch (error) {
        return next(error);
    }
};

// POST /api/proveedores
const crearProveedor = async (req, res, next) => {
    const errorValidacion = validarDatosProveedor(req.body);

    if (errorValidacion) {
        return res.status(400).json({
            error: errorValidacion,
        });
    }

    try {
        const proveedor = await proveedoresServicio.crear(req.body);

        return res.status(201).json({
            message: 'Proveedor registrado correctamente.',
            proveedor,
        });
    } catch (error) {
        return next(error);
    }
};

// PUT /api/proveedores/:id
const actualizarProveedor = async (req, res, next) => {
    if (!esIdValido(req.params.id)) {
        return res.status(400).json({
            error: 'Identificador de proveedor inválido.',
        });
    }

    const errorValidacion = validarDatosProveedor(req.body);

    if (errorValidacion) {
        return res.status(400).json({
            error: errorValidacion,
        });
    }

    try {
        const proveedor = await proveedoresServicio.actualizar(
            Number(req.params.id),
            req.body
        );

        return res.json({
            message: 'Proveedor actualizado correctamente.',
            proveedor,
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    obtenerProveedores,
    obtenerProveedor,
    crearProveedor,
    actualizarProveedor,
};
