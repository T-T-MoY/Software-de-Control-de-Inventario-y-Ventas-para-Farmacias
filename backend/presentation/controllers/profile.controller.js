/**
 * Controlador del perfil propio (capa de presentación).
 */
const perfilServicio = require('../../business/services/profile.service');

const obtenerPerfil = async (req, res, next) => {
    try {
        const perfil = await perfilServicio.obtenerPerfil(req.sessionUser.id_usuario);
        return res.json(perfil);
    } catch (error) {
        return next(error);
    }
};

module.exports = { obtenerPerfil };
