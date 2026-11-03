/**
 * Casos de uso para las ventas.
 */
const ventasRepositorio = require('../../data/repositories/sales.repository');
const {
    calcularTotales,
    normalizarDatosVenta,
    validarReceta,
} = require('../rules/sales.rules');
const {
    errorConflicto,
    errorNoEncontrado,
    errorValidacion,
} = require('../errors/app-error');

const listarCatalogo = async (buscar = '') => (
    ventasRepositorio.listarCatalogo(buscar)
);

const traducirErrorPostgres = (error) => {
    if (error.code === 'STOCK_INSUFICIENTE') {
        return errorConflicto(error.message);
    }
    if (error.code === 'PRECIO_ACTUALIZADO') {
        return errorConflicto(error.message);
    }
    if (error.code === 'MEDICAMENTO_NO_DISPONIBLE') {
        return errorConflicto(error.message);
    }
    if (error.code === 'CLIENTE_NO_ENCONTRADO') {
        return errorNoEncontrado(error.message);
    }
    if (error.code === '23503') {
        return errorValidacion('El cliente o usuario seleccionado no es válido.');
    }
    if (error.code === '23514' || error.code === '22003' || error.code === '22001') {
        return errorValidacion('Los datos de la venta superan los límites permitidos.');
    }
    return null;
};

const crear = async (datos, idUsuario) => {
    const venta = normalizarDatosVenta(datos);
    if (!Number.isSafeInteger(Number(idUsuario)) || Number(idUsuario) < 1) {
        throw errorValidacion('El usuario que registra la venta no es válido.');
    }

    const medicamentos = await ventasRepositorio.buscarMedicamentos(
        venta.items.map((item) => item.id_medicamento)
    );
    if (medicamentos.length !== venta.items.length) {
        throw errorNoEncontrado('Uno de los medicamentos seleccionados no existe.');
    }

    const porId = new Map(medicamentos.map((medicamento) => [
        medicamento.id_medicamento,
        medicamento,
    ]));
    const items = venta.items.map((item) => {
        const medicamento = porId.get(item.id_medicamento);
        if (medicamento.estado_medicamento !== 'Activo') {
            throw errorValidacion(
                `${medicamento.nombre_comercial} no está activo y no se puede vender.`
            );
        }
        if (Number(medicamento.stock_disponible) < item.cantidad) {
            throw errorConflicto(
                `Stock insuficiente para ${medicamento.nombre_comercial}.`
            );
        }
        return {
            ...item,
            nombre_comercial: medicamento.nombre_comercial,
            precio_unitario: medicamento.precio_unitario,
            tipo_venta: medicamento.tipo_venta,
            subtotal: Number(
                (Number(medicamento.precio_unitario) * item.cantidad).toFixed(2)
            ),
        };
    });

    if (items.some((item) => item.tipo_venta === 'Con receta')) {
        validarReceta(venta.receta);
    }

    const totales = calcularTotales({
        items,
        descuentoPorcentaje: venta.descuento_porcentaje,
        montoRecibido: venta.monto_recibido,
    });

    try {
        const resultado = await ventasRepositorio.crear({
            ...venta,
            items,
            ...totales,
        }, Number(idUsuario));
        return {
            ...resultado,
            descuento: resultado.descuento_monto,
            montoRecibido: resultado.monto_recibido,
            tipoComprobante: resultado.tipo_comprobante,
            numSerie: resultado.num_serie,
            fecha: resultado.fecha_emision,
            items: resultado.items.map((item) => ({
                ...item,
                precioUnitario: item.precio_unitario,
            })),
        };
    } catch (error) {
        throw traducirErrorPostgres(error) || error;
    }
};

module.exports = {
    listarCatalogo,
    crear,
};
