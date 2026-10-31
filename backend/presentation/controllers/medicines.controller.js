/**
 * Controlador del catálogo de medicamentos (capa de presentación).
 * Valida la entrada y delega los casos de uso en business/services.
 */
const medicamentosServicio = require('../../business/services/medicines.service');
const fotoMedicamentoServicio = require('../../business/services/medicine-photo.service');
const {
    validarDatosMedicamento,
    validarCambioEstado,
} = require('../validators/medicine.validator');

const esIdValido = (id) => /^\d+$/.test(String(id)) && Number(id) > 0;

const obtenerMedicamentos = async (req, res, next) => {
    try {
        const filtros = {};
        const { buscar, categoria, estado } = req.query;

        if (typeof buscar === 'string' && buscar.trim()) {
            filtros.buscar = buscar.trim();
        }
        if (categoria !== undefined && esIdValido(categoria)) {
            filtros.idCategoria = Number(categoria);
        }
        if (estado === 'Activo' || estado === 'Inactivo') {
            filtros.estado = estado;
        }

        const medicamentos = await medicamentosServicio.listar(filtros);
        return res.json(medicamentos);
    } catch (error) {
        return next(error);
    }
};

const obtenerCategorias = async (req, res, next) => {
    try {
        const categorias = await medicamentosServicio.listarCategorias();
        return res.json(categorias);
    } catch (error) {
        return next(error);
    }
};

const crearMedicamento = async (req, res, next) => {
    const errorValidacion = validarDatosMedicamento(req.body);
    if (errorValidacion) {
        return res.status(400).json({ error: errorValidacion });
    }

    try {
        const idMedicamento = await medicamentosServicio.crear(req.body);
        return res.status(201).json({ id_medicamento: idMedicamento });
    } catch (error) {
        return next(error);
    }
};

const actualizarMedicamento = async (req, res, next) => {
    if (!esIdValido(req.params.id)) {
        return res.status(400).json({ error: 'Identificador de medicamento inválido.' });
    }

    const errorValidacion = validarDatosMedicamento(req.body);
    if (errorValidacion) {
        return res.status(400).json({ error: errorValidacion });
    }

    try {
        await medicamentosServicio.actualizar(req.params.id, req.body);
        return res.json({ message: 'Medicamento actualizado correctamente.' });
    } catch (error) {
        return next(error);
    }
};

const cambiarEstado = async (req, res, next) => {
    if (!esIdValido(req.params.id)) {
        return res.status(400).json({ error: 'Identificador de medicamento inválido.' });
    }

    const errorValidacion = validarCambioEstado(req.body);
    if (errorValidacion) {
        return res.status(400).json({ error: errorValidacion });
    }

    try {
        await medicamentosServicio.cambiarEstado(req.params.id, req.body.activo);
        return res.json({ message: 'Estado del medicamento actualizado.' });
    } catch (error) {
        return next(error);
    }
};

const subirFoto = async (req, res, next) => {
    if (!esIdValido(req.params.id)) {
        return res.status(400).json({ error: 'Identificador de medicamento inválido.' });
    }

    try {
        const fotoUrl = await fotoMedicamentoServicio.subir(
            Number(req.params.id),
            req.file
        );
        return res.json({ foto_url: fotoUrl });
    } catch (error) {
        return next(error);
    }
};

const quitarFoto = async (req, res, next) => {
    if (!esIdValido(req.params.id)) {
        return res.status(400).json({ error: 'Identificador de medicamento inválido.' });
    }

    try {
        await fotoMedicamentoServicio.quitar(Number(req.params.id));
        return res.json({ message: 'Foto del medicamento eliminada correctamente.' });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    obtenerMedicamentos,
    obtenerCategorias,
    crearMedicamento,
    actualizarMedicamento,
    cambiarEstado,
    subirFoto,
    quitarFoto,
};
