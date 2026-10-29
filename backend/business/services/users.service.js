/**
 * Casos de uso de administración de usuarios.
 * Toda la lógica vive aquí; los controladores solo traducen HTTP.
 */
const usuariosRepositorio = require('../../data/repositories/users.repository');
const rolesRepositorio = require('../../data/repositories/roles.repository');
const { hashPassword } = require('../security/passwords');
const {
    validarCambioRolPropio,
    validarDesactivacionPropia,
    normalizarDatosUsuario,
} = require('../rules/users.rules');
const {
    errorConflicto,
    errorValidacion,
    errorNoEncontrado,
} = require('../errors/app-error');

const listar = () => usuariosRepositorio.listar();

const listarRoles = () => rolesRepositorio.listar();

/** Traduce las violaciones de integridad de PostgreSQL a errores de negocio. */
const traducirErrorPostgres = (error) => {
    if (error.code === '23505') {
        return errorConflicto('El correo o CI/NIT ya está registrado.');
    }
    if (error.code === '23503') {
        return errorValidacion('El rol seleccionado no existe.');
    }
    return null;
};

const crear = async (datos) => {
    const usuario = normalizarDatosUsuario(datos);
    const contrasenaHash = await hashPassword(usuario.contrasena);

    try {
        return await usuariosRepositorio.crear({ ...usuario, contrasenaHash });
    } catch (error) {
        throw traducirErrorPostgres(error) || error;
    }
};

const actualizar = async (idUsuario, datos, idSesion) => {
    const usuario = normalizarDatosUsuario(datos);

    if (Number(idUsuario) === Number(idSesion)) {
        const rol = await rolesRepositorio.buscarPorId(usuario.id_rol);
        validarCambioRolPropio({
            idSesion,
            idUsuario,
            rolNuevo: rol?.nombre_rol,
        });
    }

    const contrasenaHash = usuario.contrasena
        ? await hashPassword(usuario.contrasena)
        : null;

    try {
        const actualizados = await usuariosRepositorio.actualizar(idUsuario, {
            ...usuario,
            contrasenaHash,
        });
        if (!actualizados) {
            throw errorNoEncontrado('Usuario no encontrado.');
        }
        return actualizados;
    } catch (error) {
        throw traducirErrorPostgres(error) || error;
    }
};

const cambiarEstado = async (idUsuario, activo, idSesion) => {
    validarDesactivacionPropia({ idSesion, idUsuario, activo });

    const actualizados = await usuariosRepositorio.cambiarEstado(idUsuario, activo);
    if (!actualizados) {
        throw errorNoEncontrado('Usuario no encontrado.');
    }
    return actualizados;
};

module.exports = { listar, listarRoles, crear, actualizar, cambiarEstado };
