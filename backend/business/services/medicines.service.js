/**
 * Casos de uso del catálogo de medicamentos (RF2).
 * Orquesta repositorios y reglas; no conoce Express.
 */
const medicamentosRepositorio = require('../../data/repositories/medicines.repository');
const categoriasRepositorio = require('../../data/repositories/categories.repository');
const { normalizarDatosMedicamento } = require('../rules/medicines.rules');
const { diasReposicion, stockSeguridad } = require('../../config/parameters');
const {
    errorConflicto,
    errorValidacion,
    errorNoEncontrado,
} = require('../errors/app-error');

const listar = (filtros) => medicamentosRepositorio.listar(filtros);

const listarCategorias = () => categoriasRepositorio.listar();

/** Traduce las violaciones de integridad de PostgreSQL a errores de negocio. */
const traducirErrorPostgres = (error) => {
    if (error.code === '23505') {
        return errorConflicto('El código de barras ya está registrado.');
    }
    if (error.code === '23503') {
        return errorValidacion('La categoría seleccionada no existe.');
    }
    if (error.code === '23514') {
        return errorValidacion(
            'Los datos del medicamento no cumplen las reglas del sistema.'
        );
    }
    if (error.code === '22001' || error.code === '22P02') {
        return errorValidacion('Uno de los campos tiene un valor no válido.');
    }
    return null;
};

const crear = async (datos) => {
    const medicamento = normalizarDatosMedicamento(datos);

    // El stock de seguridad inicial sale de la configuración del sistema;
    // cada medicamento puede sobrescribirlo después.
    if (medicamento.stock_seguridad === undefined) {
        medicamento.stock_seguridad = stockSeguridad;
    }
    if (medicamento.dias_reposicion === undefined) {
        medicamento.dias_reposicion = diasReposicion;
    }

    try {
        return await medicamentosRepositorio.crear(medicamento);
    } catch (error) {
        throw traducirErrorPostgres(error) || error;
    }
};

const actualizar = async (idMedicamento, datos) => {
    const medicamento = normalizarDatosMedicamento(datos);
    if (!Number.isSafeInteger(medicamento.dias_reposicion)
        || medicamento.dias_reposicion < 1) {
        throw errorValidacion('Los días de reposición deben ser un número entero mayor o igual a 1.');
    }

    try {
        const actualizados = await medicamentosRepositorio.actualizar(
            idMedicamento,
            medicamento
        );
        if (!actualizados) {
            throw errorNoEncontrado('Medicamento no encontrado.');
        }
        return actualizados;
    } catch (error) {
        throw traducirErrorPostgres(error) || error;
    }
};

const cambiarEstado = async (idMedicamento, activo) => {
    const actualizados = await medicamentosRepositorio.cambiarEstado(
        idMedicamento,
        activo
    );
    if (!actualizados) {
        throw errorNoEncontrado('Medicamento no encontrado.');
    }
    return actualizados;
};

const eliminarLogicamente = async (idMedicamento) => {
    const actualizados = await medicamentosRepositorio.eliminarLogicamente(idMedicamento);
    if (!actualizados) {
        throw errorNoEncontrado('Medicamento no encontrado o ya eliminado.');
    }
    return actualizados;
};

module.exports = {
    listar,
    listarCategorias,
    crear,
    actualizar,
    cambiarEstado,
    eliminarLogicamente,
};
