/**
 * Rutas protegidas para la gestión de clientes.
 */
const express = require('express');
const clientesControlador = require('../controllers/customers.controller');
const { autenticarUsuario } = require('../middleware/authentication');
const { autorizar } = require('../middleware/authorization');
const { PERMISOS } = require('../../business/rules/permissions');

const router = express.Router();
router.use(autenticarUsuario);
router.use(autorizar(PERMISOS.PROCESAR_VENTAS));

router.get('/', clientesControlador.obtenerClientes);
router.get('/:id', clientesControlador.obtenerCliente);
router.post('/', clientesControlador.crearCliente);
router.put('/:id', clientesControlador.actualizarCliente);

module.exports = router;
