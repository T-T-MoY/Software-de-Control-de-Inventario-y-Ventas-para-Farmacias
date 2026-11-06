/**
 * Casos de uso para clientes.
 */
const clientesRepositorio = require('../../data/repositories/customers.repository');
const { errorConflicto, errorNoEncontrado, errorValidacion } = require('../errors/app-error');

const normalizarDatos = (datos) => {
    if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
        throw errorValidacion('Los datos del cliente son obligatorios.');
    }
    return {
        nombres: String(datos.nombres ?? '').trim(),
        apellido_paterno: String(datos.apellido_paterno ?? '').trim() || null,
        apellido_materno: String(datos.apellido_materno ?? '').trim() || null,
        ci_nit: String(datos.ci_nit ?? '').trim(),
    };
};

const traducirError = (error) => {
    if (error.code === '23505') {
        return errorConflicto('Ya existe un cliente registrado con ese CI/NIT.');
    }
    if (error.code === '22001' || error.code === '23514') {
        return errorValidacion('Uno de los datos del cliente no cumple el formato permitido.');
    }
    return null;
};

const listar = (buscar = '') => clientesRepositorio.listar(buscar);

const obtener = async (idCliente) => {
    const cliente = await clientesRepositorio.buscarPorId(idCliente);
    if (!cliente) throw errorNoEncontrado('Cliente no encontrado.');
    return cliente;
};

const crear = async (datos) => {
    try {
        return await clientesRepositorio.crear(normalizarDatos(datos));
    } catch (error) {
        throw traducirError(error) || error;
    }
};

const actualizar = async (idCliente, datos) => {
    try {
        const cliente = await clientesRepositorio.actualizar(
            idCliente,
            normalizarDatos(datos)
        );
        if (!cliente) throw errorNoEncontrado('Cliente no encontrado.');
        return cliente;
    } catch (error) {
        if (error.name === 'ErrorAplicacion') throw error;
        throw traducirError(error) || error;
    }
};

module.exports = {
    listar,
    obtener,
    crear,
    actualizar,
};
