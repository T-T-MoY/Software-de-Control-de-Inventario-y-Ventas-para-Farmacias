
/**
 * Validaciones de entrada para proveedores.
 * Solo comprueba formato, obligatoriedad y longitud.
 */

const {
    REGEX_CORREO,
    REGEX_CI,
} = require('./fields');

const REGEX_NOMBRE_COMERCIAL =
    /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9&' .(),/-]+$/;

const REGEX_TELEFONO = /^[0-9+()\s-]{7,20}$/;

const validarDatosProveedor = (body) => {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return 'Los datos del proveedor son obligatorios.';
    }

    const nombre = String(body.nombre_comercial ?? '').trim();
    const rucNit = String(body.ruc_nit ?? '').trim();
    const telefono = String(body.telefono ?? '').trim();
    const correo = String(body.correo_electronico ?? '').trim();
    const direccion = String(body.direccion ?? '').trim();

    // Nombre comercial.
    if (!nombre) {
        return 'El nombre comercial es obligatorio.';
    }

    if (nombre.length > 100) {
        return 'El nombre comercial no puede superar 100 caracteres.';
    }

    if (!REGEX_NOMBRE_COMERCIAL.test(nombre)) {
        return 'El nombre comercial contiene caracteres no permitidos.';
    }

    // RUC/NIT.
    if (!rucNit) {
        return 'El RUC/NIT es obligatorio.';
    }

    if (!REGEX_CI.test(rucNit)) {
        return 'El RUC/NIT debe tener entre 5 y 20 caracteres: solo números, letras y guion.';
    }

    // Teléfono: opcional.
    if (telefono.length > 20) {
        return 'El teléfono no puede superar 20 caracteres.';
    }

    if (telefono && !REGEX_TELEFONO.test(telefono)) {
        return 'Ingresa un teléfono válido.';
    }

    // Correo electrónico: opcional.
    if (correo.length > 120) {
        return 'El correo no puede superar 120 caracteres.';
    }

    if (correo && !REGEX_CORREO.test(correo)) {
        return 'Ingresa un correo electrónico válido.';
    }

    // Dirección: opcional.
    if (direccion.length > 150) {
        return 'La dirección no puede superar 150 caracteres.';
    }

    return null;
};

module.exports = {
    validarDatosProveedor,
};
