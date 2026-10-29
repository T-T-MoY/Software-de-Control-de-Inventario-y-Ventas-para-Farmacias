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
    validarEliminacionPropia,
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

/**
 * Informa cuántos registros dependen del usuario antes de darlo de baja.
 * El frontend usa este dato para decidir entre desactivar o eliminar.
 */
const obtenerImpacto = async (idUsuario) => {
    const usuario = await usuariosRepositorio.buscarPorId(idUsuario);
    if (!usuario || usuario.estado_cuenta === 'Eliminado') {
        throw errorNoEncontrado('Usuario no encontrado.');
    }

    const { ventas, historial } = await usuariosRepositorio.contarImpacto(idUsuario);
    return {
        ventas,
        historial,
        total: ventas + historial,
    };
};

/** Baja lógica: la cuenta pasa a 'Eliminado' y conserva su historial. */
const eliminarLogicamente = async (idUsuario, idSesion) => {
    validarEliminacionPropia({ idSesion, idUsuario });

    const actualizados = await usuariosRepositorio.eliminarLogicamente(idUsuario);
    if (!actualizados) {
        throw errorNoEncontrado('Usuario no encontrado.');
    }
    return actualizados;
};

module.exports = {
    listar,
    listarRoles,
    crear,
    actualizar,
    cambiarEstado,
    obtenerImpacto,
    eliminarLogicamente,
};
