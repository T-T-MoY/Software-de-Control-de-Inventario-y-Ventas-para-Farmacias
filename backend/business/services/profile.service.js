/**
 * Caso de uso: consultar el perfil del usuario con sesión activa.
 */
const usuariosRepositorio = require('../../data/repositories/users.repository');
const { aPerfil } = require('../../data/mappers/user.mapper');
const { obtenerPermisos } = require('../rules/permissions');
const { errorNoEncontrado } = require('../errors/app-error');

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

module.exports = { obtenerPerfil };
