const express = require('express');
const perfilController = require('../controllers/perfil.controller');
const { autenticarUsuario } = require('../middleware/auth');

const router = express.Router();

router.use(autenticarUsuario);
router.get('/', perfilController.obtenerPerfil);

module.exports = router;
