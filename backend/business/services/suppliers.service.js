
/**
 * Casos de uso para la gestión de proveedores.
 * Orquesta las reglas de negocio y el repositorio.
 * No conoce Express ni ejecuta SQL directamente.
 */

const proveedoresRepositorio = require(
    '../../data/repositories/suppliers.repository'
);

const {
    normalizarDatosProveedor,
} = require('../rules/suppliers.rules');

const {
    errorConflicto,
    errorValidacion,
    errorNoEncontrado,
} = require('../errors/app-error');

/**
 * Traduce errores de PostgreSQL a errores de negocio.
 */
const traducirErrorPostgres = (error) => {
    // RUC/NIT duplicado.
    if (error.code === '23505') {
        return errorConflicto(
            'Ya existe un proveedor registrado con ese RUC/NIT.'
        );
    }

    // Campos que exceden las longitudes permitidas.
    if (error.code === '22001') {
        return errorValidacion(
            'Uno de los campos supera la longitud permitida.'
        );
    }

    // Violación de una restricción CHECK.
    if (error.code === '23514') {
        return errorValidacion(
            'Los datos del proveedor no cumplen las reglas del sistema.'
        );
    }

    return null;
};

/**
 * Listar proveedores.
 * Puede recibir un término de búsqueda.
 */
const listar = async (buscar = '') => {
    return proveedoresRepositorio.listar(buscar);
};

/**
 * Obtener un proveedor por su identificador.
 */
const obtener = async (idProveedor) => {
    const proveedor = await proveedoresRepositorio.buscarPorId(
        idProveedor
    );

    if (!proveedor) {
        throw errorNoEncontrado('Proveedor no encontrado.');
    }

    return proveedor;
};

/**
 * Registrar un nuevo proveedor.
 */
const crear = async (datos) => {
    const proveedor = normalizarDatosProveedor(datos);

    try {
        return await proveedoresRepositorio.crear(proveedor);
    } catch (error) {
        throw traducirErrorPostgres(error) || error;
    }
};

/**
 * Actualizar los datos de un proveedor existente.
 */
const actualizar = async (idProveedor, datos) => {
    const proveedor = normalizarDatosProveedor(datos);

    try {
        const actualizado = await proveedoresRepositorio.actualizar(
            idProveedor,
            proveedor
        );

        if (!actualizado) {
            throw errorNoEncontrado('Proveedor no encontrado.');
        }

        return actualizado;
    } catch (error) {
        // No convertir los errores de negocio ya identificados.
        if (error.name === 'ErrorAplicacion') {
            throw error;
        }

        throw traducirErrorPostgres(error) || error;
    }
};

module.exports = {
    listar,
    obtener,
    crear,
    actualizar,
};
