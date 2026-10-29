// backend/business/rules/permissions.js
// Matriz de permisos por rol (RF1 / RNF1).
// Los nombres de rol deben coincidir con los de la tabla rol.
const PERMISOS = Object.freeze({
    ADMINISTRAR_USUARIOS: 'administrar_usuarios',
    ADMINISTRAR_PARAMETROS: 'administrar_parametros',
    GESTIONAR_CATALOGO: 'gestionar_catalogo',
    CONSULTAR_CATALOGO: 'consultar_catalogo',
    GESTIONAR_PROVEEDORES: 'gestionar_proveedores',
    DAR_BAJA_LOTES: 'dar_baja_lotes',
    PROCESAR_VENTAS: 'procesar_ventas',
    GENERAR_REPORTES: 'generar_reportes',
});

const PERMISOS_POR_ROL = Object.freeze({
    Administrador: Object.values(PERMISOS),
    'Encargado de inventario': [
        PERMISOS.GESTIONAR_CATALOGO,
        PERMISOS.CONSULTAR_CATALOGO,
        PERMISOS.GESTIONAR_PROVEEDORES,
    ],
    Ventas: [
        PERMISOS.CONSULTAR_CATALOGO,
        PERMISOS.PROCESAR_VENTAS,
    ],
});

const obtenerPermisos = (rol) => PERMISOS_POR_ROL[rol] || [];

const tienePermiso = (rol, permiso) => obtenerPermisos(rol).includes(permiso);

module.exports = {
    PERMISOS,
    PERMISOS_POR_ROL,
    obtenerPermisos,
    tienePermiso,
};
