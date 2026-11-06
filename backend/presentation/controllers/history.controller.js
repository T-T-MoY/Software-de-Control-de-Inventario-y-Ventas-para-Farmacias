/**
 * Controlador del historial de operaciones (solo lectura).
 */
const reportesServicio = require('../../business/services/reports.service');

// GET /api/historial?fechaInicio&fechaFin&tipo&idUsuario&pagina&limite
const listarHistorial = async (req, res, next) => {
    try {
        const historial = await reportesServicio.consultarHistorial(req.query);

        return res.json(historial);
    } catch (error) {
        return next(error);
    }
};

// GET /api/historial/usuarios
const listarUsuarios = async (req, res, next) => {
    try {
        const usuarios = await reportesServicio.listarUsuariosHistorial();

        return res.json(usuarios);
    } catch (error) {
        return next(error);
    }
};

// Cualquier método distinto de GET: el historial no se modifica ni se elimina.
const rechazarModificacion = (req, res) => res
    .status(405)
    .set('Allow', 'GET')
    .json({
        error: 'El historial de operaciones es de solo lectura: no se puede modificar ni eliminar.',
    });

module.exports = {
    listarHistorial,
    listarUsuarios,
    rechazarModificacion,
};
