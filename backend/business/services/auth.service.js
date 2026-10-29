/**
 * Casos de uso de autenticación.
 * Orquesta reglas de negocio, seguridad y repositorios; no conoce Express.
 */
const usuariosRepositorio = require('../../data/repositories/users.repository');
const { aSesion } = require('../../data/mappers/user.mapper');
const { verifyPassword } = require('../security/passwords');
const { crearToken } = require('../security/session');
const { obtenerPermisos } = require('../rules/permissions');
const { errorNoAutorizado, errorProhibido } = require('../errors/app-error');

const iniciarSesion = async ({ correo, contrasena }) => {
    const fila = await usuariosRepositorio.buscarPorCorreo(correo);
    const contrasenaValida = fila
        ? await verifyPassword(contrasena, fila.contrasena_hash)
        : false;

    if (!fila || fila.estado_cuenta !== 'Activo' || !contrasenaValida) {
        throw errorNoAutorizado('Correo o contraseña incorrectos.');
    }

    const usuario = {
        ...aSesion(fila),
        permisos: obtenerPermisos(fila.nombre_rol),
    };

    return { token: crearToken(usuario), usuario };
};

/**
 * Devuelve la sesión vigente de una cuenta activa.
 * Se usa en cada petición autenticada para reflejar cambios de rol o estado.
 */
const obtenerSesionActiva = async (idUsuario) => {
    const fila = await usuariosRepositorio.buscarSesionActiva(idUsuario);
    if (!fila) {
        throw errorProhibido('Se requiere una cuenta activa.');
    }
    return { id_usuario: fila.id_usuario, rol: fila.nombre_rol };
};

module.exports = { iniciarSesion, obtenerSesionActiva };
