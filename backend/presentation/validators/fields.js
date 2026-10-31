/**
 * Validaciones de entrada (capa de presentación).
 *
 * Comprueban formato y obligatoriedad de los campos antes de llegar a la
 * capa de negocio. El frontend replica estas reglas en
 * frontend/src/presentation/validators/fields.js.
 */

const REGEX_CORREO = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z]{2,63})+$/;
const REGEX_NOMBRE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]+$/;
const REGEX_CI = /^[0-9A-Za-z-]{5,20}$/;
const REGEX_CONTRASENA = /^[A-Za-z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]+$/;
const CARACTERES = 120
const BYTES = 72

const validarCorreo = (valor) => {
    const correo = String(valor ?? '').trim();
    if (!correo) return 'El correo es obligatorio.';
    if (correo.length > CARACTERES) return `El correo no puede superar ${CARACTERES} caracteres.`;
    if (/\s/.test(correo) || !REGEX_CORREO.test(correo)) {
        return 'Ingresa un correo válido.';
    }
    return null;
};

const validarNombre = (valor, etiqueta, { requerido = true, max = 80 } = {}) => {
    const nombre = String(valor ?? '').trim();
    if (!nombre) return requerido ? `${etiqueta} es obligatorio.` : null;
    if (nombre.length > max) return `${etiqueta} no puede superar ${max} caracteres.`;
    if (!REGEX_NOMBRE.test(nombre)) {
        return `${etiqueta} solo admite letras, espacios, apóstrofes, puntos y guiones.`;
    }
    return null;
};

const validarCi = (valor) => {
    const ci = String(valor ?? '').trim();
    if (!ci) return 'El CI/NIT es obligatorio.';
    if (!REGEX_CI.test(ci)) {
        return 'El CI/NIT debe tener entre 5 y 20 caracteres: solo números, letras y guion.';
    }
    return null;
};

const validarContrasena = (valor, { etiqueta = 'La contraseña', min = 6 } = {}) => {
    const contrasena = String(valor ?? '');
    if (!contrasena) return `${etiqueta} es obligatoria.`;
    if (contrasena.length < min) return `${etiqueta} debe tener al menos ${min} caracteres.`;
    if (Buffer.byteLength(contrasena, 'utf8') > BYTES) {
        return `${etiqueta} no puede superar ${BYTES} bytes.`;
    }
    if (/\s/.test(contrasena) || !REGEX_CONTRASENA.test(contrasena)) {
        return `${etiqueta} solo admite letras, números y símbolos como ! @ # $ % & * (sin espacios, acentos ni emojis).`;
    }
    if (!/[A-Za-z]/.test(contrasena) || !/\d/.test(contrasena)) {
        return `${etiqueta} debe incluir al menos una letra y un número.`;
    }
    return null;
};

module.exports = {
    REGEX_CORREO,
    REGEX_NOMBRE,
    REGEX_CI,
    REGEX_CONTRASENA,
    validarCorreo,
    validarNombre,
    validarCi,
    validarContrasena,
};
