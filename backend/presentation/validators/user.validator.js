/**
 * Validación de entrada del formulario de usuarios.
 *
 * Solo comprueba forma y obligatoriedad (capa de presentación).
 * Las reglas de negocio (por ejemplo, no quitarse el rol de administrador)
 * viven en backend/business/rules/users.rules.js.
 */
const {
    validarCorreo,
    validarNombre,
    validarCi,
    validarContrasena,
} = require('./fields');

const CAMPOS_OBLIGATORIOS = [
    'nombres',
    'apellido_paterno',
    'fecha_nacimiento',
    'correo',
    'ci',
];

const validarDatosUsuario = (body, { requiereContrasena = false } = {}) => {
    const faltante = CAMPOS_OBLIGATORIOS.some((campo) => (
        typeof body[campo] !== 'string' || !body[campo].trim()
    ));
    if (faltante) {
        return 'Completa todos los campos obligatorios.';
    }

    if (body.id_rol === undefined || body.id_rol === null || String(body.id_rol).trim() === '') {
        return 'Selecciona un rol válido.';
    }

    const errorNombre = validarNombre(body.nombres, 'El nombre', { max: 80 })
        || validarNombre(body.apellido_paterno, 'El apellido paterno', { max: 60 })
        || validarNombre(body.apellido_materno, 'El apellido materno', {
            requerido: false,
            max: 60,
        });
    if (errorNombre) return errorNombre;

    const errorCorreo = validarCorreo(body.correo);
    if (errorCorreo) return errorCorreo;

    const errorCi = validarCi(body.ci);
    if (errorCi) return errorCi;

    const fechaNacimiento = body.fecha_nacimiento;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaNacimiento)) {
        return 'Ingresa una fecha de nacimiento válida.';
    }
    const [year, month, day] = fechaNacimiento.split('-').map(Number);
    const fechaValida = new Date(0);
    fechaValida.setUTCHours(0, 0, 0, 0);
    fechaValida.setUTCFullYear(year, month - 1, day);
    if (
        fechaValida.getUTCFullYear() !== year
        || fechaValida.getUTCMonth() !== month - 1
        || fechaValida.getUTCDate() !== day
        || fechaValida > new Date()
    ) {
        return 'Ingresa una fecha de nacimiento válida.';
    }

    if (!Number.isInteger(Number(body.id_rol)) || Number(body.id_rol) < 1) {
        return 'Selecciona un rol válido.';
    }

    const cambiaContrasena = body.contrasena !== undefined
        && body.contrasena !== null
        && body.contrasena !== '';

    if (requiereContrasena) {
        const errorContrasena = validarContrasena(body.contrasena);
        if (errorContrasena) return errorContrasena;
    } else if (cambiaContrasena) {
        const errorContrasena = validarContrasena(body.contrasena, {
            etiqueta: 'La nueva contraseña',
        });
        if (errorContrasena) return errorContrasena;
    }

    return null;
};

const validarCambioEstado = (body) => (
    typeof body.activo === 'boolean'
        ? null
        : 'El estado debe ser activo o inactivo.'
);

module.exports = { validarDatosUsuario, validarCambioEstado };
