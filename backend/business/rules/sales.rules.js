/**
 * Reglas de negocio y normalización de ventas.
 */
const { errorValidacion } = require('../errors/app-error');

const esEnteroPositivo = (valor) => (
    /^\d+$/.test(String(valor ?? '').trim())
    && Number.isSafeInteger(Number(valor))
    && Number(valor) > 0
    && Number(valor) <= 2147483647
);

const aCentavos = (valor) => {
    const numero = Number(valor);
    if (!Number.isFinite(numero) || numero < 0) {
        throw errorValidacion('Uno de los importes de la venta no es válido.');
    }
    return BigInt(Math.round(numero * 100));
};

const desdeCentavos = (centavos) => Number(centavos) / 100;

const calcularTotales = ({ items, descuentoPorcentaje, montoRecibido }) => {
    const subtotalCentavos = items.reduce(
        (total, item) => total + aCentavos(item.precio_unitario) * BigInt(item.cantidad),
        0n
    );
    const porcentajeCentavos = BigInt(
        Math.round(Number(descuentoPorcentaje) * 100)
    );
    const descuentoCentavos = (
        subtotalCentavos * porcentajeCentavos + 5000n
    ) / 10000n;
    const totalCentavos = subtotalCentavos - descuentoCentavos;
    const recibidoCentavos = aCentavos(montoRecibido);

    if (recibidoCentavos < totalCentavos) {
        throw errorValidacion('El monto recibido no cubre el total de la venta.');
    }

    if (
        subtotalCentavos > 9999999999n
        || totalCentavos > 9999999999n
        || recibidoCentavos > 9999999999n
    ) {
        throw errorValidacion('El subtotal, total o monto recibido supera el límite permitido.');
    }

    return {
        subtotal: desdeCentavos(subtotalCentavos),
        descuento_monto: desdeCentavos(descuentoCentavos),
        total: desdeCentavos(totalCentavos),
        cambio: desdeCentavos(recibidoCentavos - totalCentavos),
    };
};

const normalizarDatosVenta = (datos) => {
    if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
        throw errorValidacion('Los datos de la venta son obligatorios.');
    }

    if (!esEnteroPositivo(datos.id_cliente)) {
        throw errorValidacion('Selecciona un cliente válido.');
    }

    if (!Array.isArray(datos.items) || datos.items.length === 0 || datos.items.length > 100) {
        throw errorValidacion('Agrega entre 1 y 100 productos a la venta.');
    }

    const ids = new Set();
    const items = datos.items.map((item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
            throw errorValidacion('Uno de los productos de la venta no es válido.');
        }
        if (!esEnteroPositivo(item.id_medicamento)) {
            throw errorValidacion('Selecciona un medicamento válido.');
        }
        if (!esEnteroPositivo(item.cantidad)) {
            throw errorValidacion('Cada cantidad debe ser un entero mayor que cero.');
        }
        const idMedicamento = Number(item.id_medicamento);
        if (ids.has(idMedicamento)) {
            throw errorValidacion('No repitas medicamentos en el detalle de la venta.');
        }
        ids.add(idMedicamento);
        return {
            id_medicamento: idMedicamento,
            cantidad: Number(item.cantidad),
        };
    });

    const porcentajeTexto = String(datos.descuento_porcentaje ?? '0').trim();
    if (!/^\d{1,3}(\.\d{1,2})?$/.test(porcentajeTexto)) {
        throw errorValidacion('El descuento debe ser un porcentaje con hasta dos decimales.');
    }
    const descuentoPorcentaje = Number(porcentajeTexto);
    if (descuentoPorcentaje < 0 || descuentoPorcentaje > 100) {
        throw errorValidacion('El descuento debe estar entre 0 y 100 por ciento.');
    }

    const recibidoTexto = String(datos.monto_recibido ?? '').trim();
    if (!/^\d{1,8}(\.\d{1,2})?$/.test(recibidoTexto)) {
        throw errorValidacion('El monto recibido debe tener hasta dos decimales.');
    }

    const tipoComprobante = datos.tipo_comprobante ?? 'Nota de venta';
    if (!['Nota de venta', 'Factura'].includes(tipoComprobante)) {
        throw errorValidacion('Selecciona un tipo de comprobante válido.');
    }
    const formatoImpresion = datos.formato_impresion ?? 'Pantalla';
    if (!['Pantalla', 'Impreso'].includes(formatoImpresion)) {
        throw errorValidacion('Selecciona un formato de comprobante válido.');
    }

    return {
        id_cliente: Number(datos.id_cliente),
        items,
        descuento_porcentaje: descuentoPorcentaje,
        monto_recibido: Number(recibidoTexto),
        tipo_comprobante: tipoComprobante,
        formato_impresion: formatoImpresion,
        receta: datos.receta && typeof datos.receta === 'object'
            ? {
                paciente: String(datos.receta.paciente ?? '').trim(),
                medico: String(datos.receta.medico ?? '').trim(),
                matricula: String(datos.receta.matricula ?? '').trim(),
            }
            : null,
    };
};

const validarReceta = (receta) => {
    if (!receta || !receta.paciente || !receta.medico || !receta.matricula) {
        throw errorValidacion(
            'Para vender medicamentos con receta, ingresa el nombre del paciente, del médico y su matrícula.'
        );
    }
    if (
        receta.paciente.length > 160
        || receta.medico.length > 160
        || receta.matricula.length > 40
    ) {
        throw errorValidacion('Los datos de la receta superan la longitud permitida.');
    }
};

// El cliente genérico (CI/NIT 00000) no sirve para trazabilidad de recetas.
const esClienteConsumidorFinal = (cliente) => (
    String(cliente?.ci_nit ?? '').trim() === '00000'
);

module.exports = {
    esEnteroPositivo,
    normalizarDatosVenta,
    calcularTotales,
    validarReceta,
    esClienteConsumidorFinal,
};
