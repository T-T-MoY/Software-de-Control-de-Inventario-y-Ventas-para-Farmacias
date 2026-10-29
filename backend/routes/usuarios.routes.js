const express = require('express');
const usuariosController = require('../controllers/usuarios.controller');
const { autenticarUsuario } = require('../middleware/auth');
const { autorizar } = require('../middleware/permisos');
const { PERMISOS } = require('../config/permisos');

const router = express.Router();

router.use(autenticarUsuario);
router.use(autorizar(PERMISOS.ADMINISTRAR_USUARIOS));
router.get('/', usuariosController.obtenerUsuarios);
router.get('/roles', usuariosController.obtenerRoles);
router.post('/', usuariosController.crearUsuario);
router.put('/:id', usuariosController.actualizarUsuario);
router.patch('/:id/estado', usuariosController.cambiarEstado);

module.exports = router;
