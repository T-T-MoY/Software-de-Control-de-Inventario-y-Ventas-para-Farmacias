
/**
 * Casos de uso para la gestión de lotes.
 *
 * Orquesta repositorios y reglas de negocio.
 * No conoce Express ni contiene consultas SQL.
 */

const lotesRepositorio = require(
    '../../data/repositories/lots.repository'
);

const medicamentosRepositorio = require(
    '../../data/repositories/medicines.repository'
);

const proveedoresRepositorio = require(
    '../../data/repositories/suppliers.repository'
);

const {
    normalizarDatosLote,
} = require('../rules/lots.rules');

const {
    errorValidacion,
    errorNoEncontrado,
    errorConflicto,
} = require('../errors/app-error');

/**
 * Traduce errores de PostgreSQL a errores de negocio.
 */
const traducirErrorPostgres = (error) => {
    if (error.code === '23505') {
        return errorConflicto(
            'Ya existe un lote con ese número para el medicamento seleccionado.'
        );
    }

    if (error.code === '23503') {
        return errorValidacion(
            'El medicamento o proveedor seleccionado no existe.'
        );
    }

    if (error.code === '23514') {
        return errorValidacion(
            'Los datos de la recepción no cumplen las reglas del sistema. Comprueba la fecha, el costo y la cantidad.'
        );
    }

    if (
        error.code === '22001'
        || error.code === '22P02'
        || error.code === '22003'
    ) {
        return errorValidacion(
            'Uno de los campos contiene un valor no válido.'
        );
    }

    return null;
};

/**
 * Listar lotes y permitir búsquedas.
 */
const listar = async (buscar = '') => {
    return lotesRepositorio.listar(buscar);
};

/**
 * Obtener un lote por su identificador.
 */
const obtener = async (idLote) => {
    const lote = await lotesRepositorio.buscarPorId(idLote);

    if (!lote) {
        throw errorNoEncontrado('Lote no encontrado.');
    }

    return lote;
};

/**
 * Registrar una recepción de medicamentos.
 *
 * Comprueba que el medicamento y el proveedor existan.
 * No permite recepcionar medicamentos inactivos o eliminados.
 */
const registrarRecepcion = async (datos, idUsuario) => {
    const lote = normalizarDatosLote(datos);

    if (!Number.isSafeInteger(Number(idUsuario))
        || Number(idUsuario) < 1) {
        throw errorValidacion('El usuario de la recepción no es válido.');
    }

    const medicamento = await medicamentosRepositorio.buscarPorId(
        lote.id_medicamento
    );

    if (!medicamento) {
        throw errorNoEncontrado('El medicamento seleccionado no existe.');
    }

    if (medicamento.estado_medicamento !== 'Activo') {
        throw errorValidacion(
            'No se pueden recibir lotes de medicamentos inactivos.'
        );
    }

    const proveedor = await proveedoresRepositorio.buscarPorId(
        lote.id_proveedor
    );

    if (!proveedor) {
        throw errorNoEncontrado('El proveedor seleccionado no existe.');
    }

    try {
        const resultado = await lotesRepositorio.registrarRecepcion(
            lote,
            Number(idUsuario)
        );

        return lotesRepositorio.buscarPorId(resultado.id_lote);
    } catch (error) {
        throw traducirErrorPostgres(error) || error;
    }
};

/**
 * Dar de baja un lote vencido.
 *
 * El permiso DAR_BAJA_LOTES se comprobará
 * posteriormente en las rutas.
 */
const darBajaVencido = async (idLote, idUsuario) => {
    if (!Number.isSafeInteger(Number(idUsuario))
        || Number(idUsuario) < 1) {
        throw errorValidacion('El usuario que registra la baja no es válido.');
    }

    const lote = await lotesRepositorio.buscarPorId(idLote);

    if (!lote) {
        throw errorNoEncontrado('Lote no encontrado.');
    }

    if (lote.fecha_baja) {
        throw errorConflicto('Este lote ya fue dado de baja.');
    }

    if (lote.estado_lote !== 'Vencido') {
        throw errorValidacion(
            'Solamente se pueden dar de baja lotes vencidos.'
        );
    }

    try {
        const resultado = await lotesRepositorio.darBajaVencido(
            idLote,
            Number(idUsuario)
        );

        if (!resultado) {
            throw errorConflicto(
                'El lote ya fue modificado. Actualiza la información.'
            );
        }

        return lotesRepositorio.buscarPorId(resultado.id_lote);
    } catch (error) {
        if (error.name === 'ErrorAplicacion') {
            throw error;
        }

        throw traducirErrorPostgres(error) || error;
    }
};

module.exports = {
    listar,
    obtener,
    registrarRecepcion,
    darBajaVencido,
};
