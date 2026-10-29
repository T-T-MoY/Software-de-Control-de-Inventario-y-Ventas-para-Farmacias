/**
 * Controlador de autenticación (capa de presentación).
 * Solo traduce HTTP: valida la forma de la petición y delega en el servicio.
 */
const { iniciarSesion } = require('../../business/services/auth.service');
const { validarCorreo } = require('../validators/fields');

const login = async (req, res) => {
    const email = typeof req.body.email === 'string'
        ? req.body.email.trim().toLowerCase()
        : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            mensaje: 'Ingresa correo y contraseña.',
        });
    }

    const errorCorreo = validarCorreo(email);
    if (errorCorreo) {
        return res.status(400).json({ success: false, mensaje: errorCorreo });
    }

    try {
        const { token, usuario } = await iniciarSesion({
            correo: email,
            contrasena: password,
        });
        return res.json({ success: true, token, usuario });
    } catch (error) {
        // El login conserva su contrato { success, mensaje }.
        if (error.estado && error.estado < 500) {
            return res.status(error.estado).json({
                success: false,
                mensaje: error.message,
            });
        }
        console.error('Error en el login:', error);
        return res.status(500).json({
            success: false,
            mensaje: 'No se pudo iniciar sesión.',
        });
    }
};

module.exports = { login };
