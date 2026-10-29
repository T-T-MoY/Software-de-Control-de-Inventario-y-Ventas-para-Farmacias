const express = require('express');
const usuariosControlador = require('../controllers/users.controller');
const { autenticarUsuario } = require('../middleware/authentication');
const { autorizar } = require('../middleware/authorization');
const { PERMISOS } = require('../../business/rules/permissions');

const router = express.Router();

router.use(autenticarUsuario);
router.use(autorizar(PERMISOS.ADMINISTRAR_USUARIOS));
router.get('/', usuariosControlador.obtenerUsuarios);
router.get('/roles', usuariosControlador.obtenerRoles);
router.post('/', usuariosControlador.crearUsuario);
router.put('/:id', usuariosControlador.actualizarUsuario);
router.patch('/:id/estado', usuariosControlador.cambiarEstado);

module.exports = router;
