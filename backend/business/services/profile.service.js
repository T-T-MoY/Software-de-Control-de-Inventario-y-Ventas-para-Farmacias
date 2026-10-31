/**
 * Caso de uso: consultar el perfil del usuario con sesión activa.
 */
const usuariosRepositorio = require('../../data/repositories/users.repository');
const { aPerfil } = require('../../data/mappers/user.mapper');
const { obtenerPermisos } = require('../rules/permissions');
const { hashPassword, verifyPassword } = require('../security/passwords');
const { errorNoEncontrado, errorValidacion } = require('../errors/app-error');

const obtenerPerfil = async (idUsuario) => {
    const fila = await usuariosRepositorio.buscarPorId(idUsuario);
    if (!fila) {
        throw errorNoEncontrado('Usuario no encontrado.');
    }

    return {
        ...aPerfil(fila),
        permisos: obtenerPermisos(fila.nombre_rol),
    };
};

/**
 * Cambia la contraseña del usuario con sesión activa.
 * Exige la contraseña actual y vuelve a cifrar la nueva con bcrypt.
 */
const cambiarContrasena = async (idUsuario, { contrasenaActual, contrasenaNueva }) => {
    const fila = await usuariosRepositorio.buscarHashPorId(idUsuario);
    if (!fila) {
        throw errorNoEncontrado('Usuario no encontrado.');
    }

    const actualValida = await verifyPassword(contrasenaActual, fila.contrasena_hash);
    if (!actualValida) {
        throw errorValidacion('La contraseña actual no es correcta.');
    }

    const contrasenaHash = await hashPassword(contrasenaNueva);
    const actualizados = await usuariosRepositorio.actualizarContrasena(
        idUsuario,
        contrasenaHash
    );
    if (!actualizados) {
        throw errorNoEncontrado('Usuario no encontrado.');
    }

    return actualizados;
};

module.exports = { obtenerPerfil, cambiarContrasena };
