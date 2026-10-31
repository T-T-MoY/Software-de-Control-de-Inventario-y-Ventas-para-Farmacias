/**
 * Controlador del perfil propio (capa de presentación).
 */
const perfilServicio = require('../../business/services/profile.service');
const { validarCambioContrasena } = require('../validators/user.validator');

const obtenerPerfil = async (req, res, next) => {
    try {
        const perfil = await perfilServicio.obtenerPerfil(req.sessionUser.id_usuario);
        return res.json(perfil);
    } catch (error) {
        return next(error);
    }
};

const cambiarContrasena = async (req, res, next) => {
    const errorValidacion = validarCambioContrasena(req.body);
    if (errorValidacion) {
        return res.status(400).json({ error: errorValidacion });
    }

    try {
        await perfilServicio.cambiarContrasena(req.sessionUser.id_usuario, {
            contrasenaActual: req.body.contrasena_actual,
            contrasenaNueva: req.body.contrasena_nueva,
        });
        return res.json({ message: 'Contraseña actualizada correctamente.' });
    } catch (error) {
        return next(error);
    }
};

module.exports = { obtenerPerfil, cambiarContrasena };
