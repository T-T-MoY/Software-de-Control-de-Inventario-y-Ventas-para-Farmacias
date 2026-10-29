const express = require('express');
const authControlador = require('../controllers/auth.controller');

const router = express.Router();

router.post('/login', authControlador.login);

module.exports = router;
