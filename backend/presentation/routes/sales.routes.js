/**
 * Rutas protegidas para el catálogo de venta y su confirmación.
 */
const express = require('express');
const ventasControlador = require('../controllers/sales.controller');
const { autenticarUsuario } = require('../middleware/authentication');
const { autorizar } = require('../middleware/authorization');
const { PERMISOS } = require('../../business/rules/permissions');

const router = express.Router();
router.use(autenticarUsuario);
router.use(autorizar(PERMISOS.PROCESAR_VENTAS));

router.get('/catalogo', ventasControlador.obtenerCatalogo);
router.post('/', ventasControlador.crearVenta);

module.exports = router;
