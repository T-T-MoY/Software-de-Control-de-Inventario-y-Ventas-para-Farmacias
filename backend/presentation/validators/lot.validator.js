
/**
 * Validaciones de entrada para la gestión de lotes.
 * Comprueba formato, obligatoriedad y longitud.
 */

const esIdValido = (valor) => (
    /^\d+$/.test(String(valor ?? '').trim())
    && Number.isSafeInteger(Number(valor))
    && Number(valor) >= 1
    && Number(valor) <= 2147483647
);

const esFechaValida = (valor) => {
    const fecha = String(valor ?? '').trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return false;
    }

    const [anio, mes, dia] = fecha.split('-').map(Number);
    const fechaComprobada = new Date(Date.UTC(anio, mes - 1, dia));

    return (
        fechaComprobada.getUTCFullYear() === anio
        && fechaComprobada.getUTCMonth() === mes - 1
        && fechaComprobada.getUTCDate() === dia
    );
};

const validarDatosRecepcion = (body) => {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return 'Los datos de la recepción son obligatorios.';
    }

    if (!esIdValido(body.id_medicamento)) {
        return 'Selecciona un medicamento válido.';
    }

    if (!esIdValido(body.id_proveedor)) {
        return 'Selecciona un proveedor válido.';
    }

    const numeroLote = String(body.lote_numero ?? '').trim();

    if (!numeroLote) {
        return 'El número de lote es obligatorio.';
    }

    if (numeroLote.length > 40) {
        return 'El número de lote no puede superar 40 caracteres.';
    }

    if (!esFechaValida(body.fecha_vencimiento)) {
        return 'Ingresa una fecha de vencimiento válida.';
    }

    const costo = String(body.costo_unitario ?? '').trim();

    if (!/^\d{1,8}(\.\d{1,2})?$/.test(costo)) {
        return 'El costo unitario debe ser un número válido con hasta dos decimales.';
    }

    const cantidad = String(body.cantidad_stock ?? '').trim();

    if (!/^\d+$/.test(cantidad)) {
        return 'La cantidad debe ser un número entero positivo.';
    }

    const cantidadNumerica = Number(cantidad);

    if (
        !Number.isSafeInteger(cantidadNumerica)
        || cantidadNumerica < 1
        || cantidadNumerica > 2147483647
    ) {
        return 'La cantidad recibida está fuera del rango permitido.';
    }

    return null;
};

module.exports = {
    validarDatosRecepcion,
    esIdValido,
};
