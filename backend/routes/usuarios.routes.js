const express = require('express');
const usuariosController = require('../controllers/usuarios.controller');
const { autenticarAdministrador } = require('../middleware/auth');

const router = express.Router();

router.use(autenticarAdministrador);
router.get('/', usuariosController.obtenerUsuarios);
router.get('/roles', usuariosController.obtenerRoles);
router.post('/', usuariosController.crearUsuario);
router.put('/:id', usuariosController.actualizarUsuario);
router.patch('/:id/estado', usuariosController.cambiarEstado);

module.exports = router;
