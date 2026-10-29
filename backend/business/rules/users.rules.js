/**
 * Reglas de negocio de usuarios que no dependen de la base de datos.
 * Se aplican después de la validación de entrada y antes de persistir.
 */
const { errorValidacion } = require('../errors/app-error');

const ROL_ADMINISTRADOR = 'Administrador';

/**
 * Un administrador no puede quitarse a sí mismo el rol.
 * Evita dejar el sistema sin ninguna cuenta administradora activa.
 */
const validarCambioRolPropio = ({ idSesion, idUsuario, rolNuevo }) => {
    if (Number(idSesion) !== Number(idUsuario)) return;
    if (rolNuevo !== ROL_ADMINISTRADOR) {
        throw errorValidacion('No puedes quitarte el rol de administrador.');
    }
};

/** Una cuenta no puede desactivarse a sí misma. */
const validarDesactivacionPropia = ({ idSesion, idUsuario, activo }) => {
    if (!activo && Number(idSesion) === Number(idUsuario)) {
        throw errorValidacion('No puedes desactivar tu propia cuenta.');
    }
};

/** Normaliza los datos que llegan de la interfaz antes de persistirlos. */
const normalizarDatosUsuario = (datos) => ({
    nombres: datos.nombres.trim(),
    apellido_paterno: datos.apellido_paterno.trim(),
    apellido_materno: datos.apellido_materno?.trim() || null,
    fecha_nacimiento: datos.fecha_nacimiento,
    correo: datos.correo.trim().toLowerCase(),
    ci_nit: datos.ci_nit.trim(),
    id_rol: Number(datos.id_rol),
    contrasena: datos.contrasena,
});

module.exports = {
    ROL_ADMINISTRADOR,
    validarCambioRolPropio,
    validarDesactivacionPropia,
    normalizarDatosUsuario,
};
