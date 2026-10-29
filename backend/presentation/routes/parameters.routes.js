const express = require('express');
const parametrosControlador = require('../controllers/parameters.controller');
const { autenticarUsuario } = require('../middleware/authentication');
const { autorizar } = require('../middleware/authorization');
const { PERMISOS } = require('../../business/rules/permissions');

const router = express.Router();

router.use(autenticarUsuario);
router.get(
    '/',
    autorizar(PERMISOS.CONSULTAR_CATALOGO),
    parametrosControlador.obtenerParametros
);

module.exports = router;
