/**
 * Middleware de autenticación (capa de presentación).
 *
 * Lee el token, delega la validación en la capa de negocio y adjunta
 * la sesión a req.sessionUser. No escribe SQL.
 */
const { verificarToken } = require('../../business/security/session');
const { obtenerSesionActiva } = require('../../business/services/auth.service');
const {
    errorNoAutorizado,
    errorProhibido,
} = require('../../business/errors/app-error');

const leerSesion = async (req) => {
    const authorization = req.get('authorization') || '';
    const [esquema, token] = authorization.split(' ');

    if (esquema !== 'Bearer' || !token) {
        throw errorNoAutorizado('Debes iniciar sesión.');
    }

    const payload = verificarToken(token);
    return obtenerSesionActiva(payload.sub);
};

const autenticarUsuario = async (req, res, next) => {
    try {
        req.sessionUser = await leerSesion(req);
        return next();
    } catch (error) {
        return next(error);
    }
};

const autenticarAdministrador = async (req, res, next) => {
    try {
        const sesion = await leerSesion(req);
        if (sesion.rol !== 'Administrador') {
            throw errorProhibido('Se requiere una cuenta administradora activa.');
        }
        req.sessionUser = sesion;
        return next();
    } catch (error) {
        return next(error);
    }
};

module.exports = { autenticarUsuario, autenticarAdministrador };
