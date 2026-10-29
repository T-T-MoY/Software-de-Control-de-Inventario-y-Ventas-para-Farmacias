const express = require('express');
const perfilControlador = require('../controllers/profile.controller');
const { autenticarUsuario } = require('../middleware/authentication');

const router = express.Router();

router.use(autenticarUsuario);
router.get('/', perfilControlador.obtenerPerfil);

module.exports = router;
