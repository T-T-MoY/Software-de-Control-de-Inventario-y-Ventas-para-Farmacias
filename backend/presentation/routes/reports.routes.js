const express = require('express');
const router = express.Router();

const reportesControlador = require('../controllers/reports.controller');
const { autenticarUsuario } = require('../middleware/authentication');
const { autorizar } = require('../middleware/authorization');
const { PERMISOS } = require('../../business/rules/permissions');

// Solo el Administrador genera reportes (permiso generar_reportes).
router.use(autenticarUsuario);
router.use(autorizar(PERMISOS.GENERAR_REPORTES));

// :tipo = ventas | inventario | lotes-por-vencer | lotes-vencidos
router.get('/:tipo/exportar', reportesControlador.exportarReporte);
router.get('/:tipo', reportesControlador.obtenerReporte);

module.exports = router;
