
/**
 * Rutas HTTP para las alertas de inventario.
 *
 * Todos los roles pueden consultar las alertas,
 * mediante el permiso CONSULTAR_CATALOGO.
 */

const express = require('express');

const alertasControlador = require(
    '../controllers/alerts.controller'
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

// Requiere una sesión activa.
router.use(autenticarUsuario);

// Administrador, Encargado de inventario y Ventas
// pueden consultar las alertas.
router.use(autorizar(PERMISOS.CONSULTAR_CATALOGO));

// Resumen general.
router.get(
    '/resumen',
    alertasControlador.obtenerResumen
);

// Lotes próximos a vencer.
router.get(
    '/vencimientos/proximos',
    alertasControlador.obtenerLotesPorVencer
);

// Lotes vencidos.
router.get(
    '/vencimientos/vencidos',
    alertasControlador.obtenerLotesVencidos
);

// Medicamentos que requieren reposición.
router.get(
    '/reorden',
    alertasControlador.obtenerMedicamentosPorReponer
);

module.exports = router;
