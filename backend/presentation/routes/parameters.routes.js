const express = require('express');
const parametrosControlador = require('../controllers/parameters.controller');
const { autenticarUsuario } = require('../middleware/authentication');
const { autorizar } = require('../middleware/authorization');
const { PERMISOS } = require('../../business/rules/permissions');

const router = express.Router();

router.use(autenticarUsuario);

// Consulta: cualquier rol con acceso al catálogo.
router.get(
    '/',
    autorizar(PERMISOS.CONSULTAR_CATALOGO),
    parametrosControlador.obtenerParametros
);

// Edición: solo el Administrador.
router.put(
    '/',
    autorizar(PERMISOS.ADMINISTRAR_PARAMETROS),
    parametrosControlador.actualizarParametros
);

module.exports = router;
