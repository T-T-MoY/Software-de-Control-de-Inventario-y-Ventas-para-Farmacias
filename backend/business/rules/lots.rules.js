
/**
 * Reglas de negocio para la gestión de lotes.
 *
 * Normaliza los datos de las recepciones antes
 * de enviarlos al repositorio.
 */

const { errorValidacion } = require('../errors/app-error');

const esEnteroPositivo = (valor) => (
    /^\d+$/.test(String(valor ?? '').trim())
    && Number.isSafeInteger(Number(valor))
    && Number(valor) > 0
);

const esFechaValida = (valor) => {
    const fecha = String(valor ?? '').trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return false;
    }

    const [anio, mes, dia] = fecha.split('-').map(Number);
    const comprobacion = new Date(Date.UTC(anio, mes - 1, dia));

    return (
        comprobacion.getUTCFullYear() === anio
        && comprobacion.getUTCMonth() === mes - 1
        && comprobacion.getUTCDate() === dia
    );
};

/**
 * Normaliza los datos de una recepción.
 */
const normalizarDatosLote = (datos) => {
    if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
        throw errorValidacion('Los datos de la recepción son obligatorios.');
    }

    const idMedicamento = datos.id_medicamento;
    const idProveedor = datos.id_proveedor;

    if (!esEnteroPositivo(idMedicamento)) {
        throw errorValidacion('Selecciona un medicamento válido.');
    }

    if (!esEnteroPositivo(idProveedor)) {
        throw errorValidacion('Selecciona un proveedor válido.');
    }

    const loteNumero = String(datos.lote_numero ?? '').trim();

    if (!loteNumero) {
        throw errorValidacion('El número de lote es obligatorio.');
    }

    if (loteNumero.length > 40) {
        throw errorValidacion(
            'El número de lote no puede superar 40 caracteres.'
        );
    }

    if (!esFechaValida(datos.fecha_vencimiento)) {
        throw errorValidacion('Ingresa una fecha de vencimiento válida.');
    }

    const costoTexto = String(datos.costo_unitario ?? '').trim();

    if (!/^\d{1,8}(\.\d{1,2})?$/.test(costoTexto)) {
        throw errorValidacion(
            'El costo unitario debe ser un número positivo con hasta dos decimales.'
        );
    }

    const costoUnitario = Number(costoTexto);

    if (!Number.isFinite(costoUnitario) || costoUnitario < 0) {
        throw errorValidacion('El costo unitario no es válido.');
    }

    if (!esEnteroPositivo(datos.cantidad_stock)) {
        throw errorValidacion(
            'La cantidad recibida debe ser un número entero mayor que cero.'
        );
    }

    return {
        id_medicamento: Number(idMedicamento),
        id_proveedor: Number(idProveedor),
        lote_numero: loteNumero,
        fecha_vencimiento: String(datos.fecha_vencimiento).trim(),
        costo_unitario: costoUnitario,
        cantidad_stock: Number(datos.cantidad_stock),
    };
};

module.exports = {
    normalizarDatosLote,
};
