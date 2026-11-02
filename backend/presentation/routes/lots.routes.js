
/**
 * Rutas HTTP para la gestión de lotes.
 */

const express = require('express');

const lotesControlador = require(
    '../controllers/lots.controller'
);

const {
    autenticarUsuario,
} = require('../middleware/authentication');

const {
    autorizar,
} = require('../middleware/authorization');

const {
    PERMISOS,
} = require('../../business/rules/permissions');

const router = express.Router();

// Todas las rutas necesitan una sesión activa.
router.use(autenticarUsuario);

// Consultar lotes: Administrador, Inventario y Ventas.
router.get(
    '/',
    autorizar(PERMISOS.CONSULTAR_CATALOGO),
    lotesControlador.obtenerLotes
);

router.get(
    '/:id',
    autorizar(PERMISOS.CONSULTAR_CATALOGO),
    lotesControlador.obtenerLote
);

// Registrar recepciones: Administrador y Encargado de inventario.
// Se reutiliza el permiso existente de gestión de proveedores.
router.post(
    '/recepciones',
    autorizar(PERMISOS.GESTIONAR_PROVEEDORES),
    lotesControlador.registrarRecepcion
);

// Dar de baja lotes vencidos: exclusivamente Administrador.
router.patch(
    '/:id/baja',
    autorizar(PERMISOS.DAR_BAJA_LOTES),
    lotesControlador.darBajaLote
);

module.exports = router;
