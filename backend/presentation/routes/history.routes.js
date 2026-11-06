const express = require('express');
const router = express.Router();

const historialControlador = require('../controllers/history.controller');
const { autenticarUsuario } = require('../middleware/authentication');
const { autorizar } = require('../middleware/authorization');
const { PERMISOS } = require('../../business/rules/permissions');

// Consultar el historial requiere el mismo permiso que los reportes.
router.use(autenticarUsuario);
router.use(autorizar(PERMISOS.GENERAR_REPORTES));

router.get('/usuarios', historialControlador.listarUsuarios);
router.get('/', historialControlador.listarHistorial);

// RF6 / CP-07: sin edición ni borrado.
router.all('*', historialControlador.rechazarModificacion);

module.exports = router;
