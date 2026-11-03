/**
 * Validaciones HTTP para las operaciones de ventas.
 */
const { REGEX_CI, REGEX_NOMBRE } = require('./fields');

const esIdValido = (valor) => (
    /^\d+$/.test(String(valor ?? '').trim())
    && Number.isSafeInteger(Number(valor))
    && Number(valor) >= 1
    && Number(valor) <= 2147483647
);

const validarDatosVenta = (body) => {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return 'Los datos de la venta son obligatorios.';
    }
    if (!esIdValido(body.id_cliente)) {
        return 'Selecciona un cliente válido.';
    }
    if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 100) {
        return 'Agrega entre 1 y 100 productos a la venta.';
    }
    const ids = new Set();
    for (const item of body.items) {
        if (!item || !esIdValido(item.id_medicamento)) {
            return 'Selecciona medicamentos válidos.';
        }
        const id = Number(item.id_medicamento);
        if (ids.has(id)) return 'No repitas medicamentos en el detalle de la venta.';
        ids.add(id);
        const cantidadTexto = String(item.cantidad ?? '').trim();
        if (!/^\d+$/.test(cantidadTexto)
            || !Number.isSafeInteger(Number(cantidadTexto))
            || Number(cantidadTexto) < 1
            || Number(cantidadTexto) > 2147483647) {
            return 'Cada cantidad debe ser un entero positivo.';
        }
    }
    const descuento = String(body.descuento_porcentaje ?? '0').trim();
    if (!/^\d{1,3}(\.\d{1,2})?$/.test(descuento)
        || Number(descuento) < 0
        || Number(descuento) > 100) {
        return 'El descuento debe estar entre 0 y 100 por ciento.';
    }
    if (!/^\d{1,8}(\.\d{1,2})?$/.test(String(body.monto_recibido ?? '').trim())) {
        return 'El monto recibido debe tener hasta dos decimales.';
    }
    if (body.tipo_comprobante !== undefined
        && !['Nota de venta', 'Factura'].includes(body.tipo_comprobante)) {
        return 'Selecciona un tipo de comprobante válido.';
    }
    if (body.formato_impresion !== undefined
        && !['Pantalla', 'Impreso'].includes(body.formato_impresion)) {
        return 'Selecciona un formato de comprobante válido.';
    }
    if (body.receta !== undefined
        && (!body.receta || typeof body.receta !== 'object' || Array.isArray(body.receta))) {
        return 'Los datos de la receta no son válidos.';
    }
    return null;
};

const validarDatosCliente = (body) => {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return 'Los datos del cliente son obligatorios.';
    }
    const nombres = String(body.nombres ?? '').trim();
    const paterno = String(body.apellido_paterno ?? '').trim();
    const materno = String(body.apellido_materno ?? '').trim();
    const ciNit = String(body.ci_nit ?? '').trim();
    const telefono = String(body.telefono ?? '').trim();
    const domicilio = String(body.domicilio ?? '').trim();

    if (!nombres || nombres.length > 80 || !REGEX_NOMBRE.test(nombres)) {
        return 'Ingresa los nombres del cliente (máximo 80 caracteres).';
    }
    if (!paterno || paterno.length > 60 || !REGEX_NOMBRE.test(paterno)) {
        return 'Ingresa el apellido paterno (máximo 60 caracteres).';
    }
    if (materno.length > 60 || (materno && !REGEX_NOMBRE.test(materno))) {
        return 'El apellido materno contiene caracteres no válidos o supera 60 caracteres.';
    }
    if (!REGEX_CI.test(ciNit)) {
        return 'El CI/NIT debe tener entre 5 y 20 caracteres: solo números, letras y guion.';
    }
    if (telefono.length > 20 || (telefono && !/^[0-9+()\s-]{7,20}$/.test(telefono))) {
        return 'Ingresa un teléfono válido de hasta 20 caracteres.';
    }
    if (domicilio.length > 150) {
        return 'El domicilio no puede superar 150 caracteres.';
    }
    return null;
};

module.exports = {
    esIdValido,
    validarDatosVenta,
    validarDatosCliente,
};
