
/**
 * Rutas HTTP para gestión de proveedores.
 */

const express = require('express');

const proveedoresControlador = require(
    '../controllers/suppliers.controller'
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

// Todas las rutas necesitan una sesión válida.
router.use(autenticarUsuario);

// Solo Administrador y Encargado de inventario
// tienen el permiso GESTIONAR_PROVEEDORES.
router.use(autorizar(PERMISOS.GESTIONAR_PROVEEDORES));

router.get('/', proveedoresControlador.obtenerProveedores);

router.get('/:id', proveedoresControlador.obtenerProveedor);

router.post('/', proveedoresControlador.crearProveedor);

router.put('/:id', proveedoresControlador.actualizarProveedor);

module.exports = router;
