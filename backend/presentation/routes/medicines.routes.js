const express = require('express');
const medicamentosControlador = require('../controllers/medicines.controller');
const { autenticarUsuario } = require('../middleware/authentication');
const { autorizar } = require('../middleware/authorization');
const { PERMISOS } = require('../../business/rules/permissions');
const { procesarFotoMedicamento } = require('../middleware/medicine-photo-upload');

const router = express.Router();

router.use(autenticarUsuario);

// Consulta: cualquier rol con consultar_catalogo.
router.get(
    '/',
    autorizar(PERMISOS.CONSULTAR_CATALOGO),
    medicamentosControlador.obtenerMedicamentos
);
router.get(
    '/categorias',
    autorizar(PERMISOS.CONSULTAR_CATALOGO),
    medicamentosControlador.obtenerCategorias
);

// Gestión: Administrador y Encargado de inventario.
router.post(
    '/',
    autorizar(PERMISOS.GESTIONAR_CATALOGO),
    medicamentosControlador.crearMedicamento
);
router.put(
    '/:id',
    autorizar(PERMISOS.GESTIONAR_CATALOGO),
    medicamentosControlador.actualizarMedicamento
);
router.patch(
    '/:id/estado',
    autorizar(PERMISOS.GESTIONAR_CATALOGO),
    medicamentosControlador.cambiarEstado
);
router.delete(
    '/:id',
    autorizar(PERMISOS.GESTIONAR_CATALOGO),
    medicamentosControlador.eliminarMedicamento
);
router.post(
    '/:id/foto',
    autorizar(PERMISOS.GESTIONAR_CATALOGO),
    procesarFotoMedicamento,
    medicamentosControlador.subirFoto
);
router.delete(
    '/:id/foto',
    autorizar(PERMISOS.GESTIONAR_CATALOGO),
    medicamentosControlador.quitarFoto
);

module.exports = router;
