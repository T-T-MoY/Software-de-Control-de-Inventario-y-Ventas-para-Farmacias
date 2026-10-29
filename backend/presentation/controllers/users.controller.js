/**
 * Controlador de usuarios (capa de presentación).
 * Valida la entrada y delega los casos de uso en business/services.
 */
const usuariosServicio = require('../../business/services/users.service');
const {
    validarDatosUsuario,
    validarCambioEstado,
} = require('../validators/user.validator');

const obtenerUsuarios = async (req, res, next) => {
    try {
        const usuarios = await usuariosServicio.listar();
        return res.json(usuarios);
    } catch (error) {
        return next(error);
    }
};

const obtenerRoles = async (req, res, next) => {
    try {
        const roles = await usuariosServicio.listarRoles();
        return res.json(roles);
    } catch (error) {
        return next(error);
    }
};

const crearUsuario = async (req, res, next) => {
    const errorValidacion = validarDatosUsuario(req.body, {
        requiereContrasena: true,
    });
    if (errorValidacion) {
        return res.status(400).json({ error: errorValidacion });
    }

    try {
        const idUsuario = await usuariosServicio.crear(req.body);
        return res.status(201).json({ id_usuario: idUsuario });
    } catch (error) {
        return next(error);
    }
};

const actualizarUsuario = async (req, res, next) => {
    const errorValidacion = validarDatosUsuario(req.body);
    if (errorValidacion) {
        return res.status(400).json({ error: errorValidacion });
    }

    try {
        await usuariosServicio.actualizar(
            req.params.id,
            req.body,
            req.sessionUser.id_usuario
        );
        return res.json({ message: 'Usuario actualizado correctamente.' });
    } catch (error) {
        return next(error);
    }
};

const cambiarEstado = async (req, res, next) => {
    const errorValidacion = validarCambioEstado(req.body);
    if (errorValidacion) {
        return res.status(400).json({ error: errorValidacion });
    }

    try {
        await usuariosServicio.cambiarEstado(
            req.params.id,
            req.body.activo,
            req.sessionUser.id_usuario
        );
        return res.json({ message: 'Estado de usuario actualizado.' });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    obtenerUsuarios,
    obtenerRoles,
    crearUsuario,
    actualizarUsuario,
    cambiarEstado,
};
