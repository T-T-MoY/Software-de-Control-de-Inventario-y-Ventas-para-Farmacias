/**
 * Middleware de autorización por permisos (capa de presentación).
 * La matriz de permisos es una regla de negocio: business/rules/permissions.js.
 */
const { obtenerPermisos } = require('../../business/rules/permissions');

/**
 * Exige una sesión válida (req.sessionUser) y al menos uno de los permisos
 * indicados. Se usa después de autenticarUsuario:
 *
 *   router.use(autenticarUsuario);
 *   router.use(autorizar(PERMISOS.GESTIONAR_CATALOGO));
 */
const autorizar = (...permisosRequeridos) => (req, res, next) => {
    if (!req.sessionUser) {
        return res.status(401).json({ error: 'Debes iniciar sesión.' });
    }

    const permisosAsignados = obtenerPermisos(req.sessionUser.rol);
    const autorizado = permisosRequeridos.some((permiso) => (
        permisosAsignados.includes(permiso)
    ));

    if (!autorizado) {
        return res.status(403).json({
            error: 'No tienes permiso para realizar esta acción.',
        });
    }

    return next();
};

// Variante para rutas que dependen directamente del nombre del rol.
const autorizarRoles = (...rolesPermitidos) => (req, res, next) => {
    if (!req.sessionUser) {
        return res.status(401).json({ error: 'Debes iniciar sesión.' });
    }

    if (!rolesPermitidos.includes(req.sessionUser.rol)) {
        return res.status(403).json({
            error: 'No tienes permiso para realizar esta acción.',
        });
    }

    return next();
};

module.exports = { autorizar, autorizarRoles };
