const express = require('express');
const parametrosController = require('../controllers/parametros.controller');
const { autenticarUsuario } = require('../middleware/auth');
const { autorizar } = require('../middleware/permisos');
const { PERMISOS } = require('../config/permisos');

const router = express.Router();

router.use(autenticarUsuario);
router.get('/', autorizar(PERMISOS.CONSULTAR_CATALOGO), parametrosController.obtenerParametros);

module.exports = router;
