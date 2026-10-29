const db = require('../config/db');
const { verifyPassword } = require('../config/password');
const { crearToken } = require('../middleware/auth');
const { obtenerPermisos } = require('../config/permisos');

const login = async (req, res) => {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!email || !password) {
        return res.status(400).json({ success: false, mensaje: 'Ingresa correo y contraseña.' });
    }

    try {
        const result = await db.query(
            `SELECT u.id_usuario, u.nombres, u.apellido_paterno, u.apellido_materno,
                    u.correo, u.ci_nit, u.contrasena_hash, u.estado_cuenta,
                    r.nombre_rol
             FROM usuario AS u
             JOIN rol AS r ON r.id_rol = u.id_rol
             WHERE LOWER(u.correo) = $1`,
            [email]
        );

        const user = result.rows[0];
        const passwordIsValid = user
            ? await verifyPassword(password, user.contrasena_hash)
            : false;

        if (!user || user.estado_cuenta !== 'Activo' || !passwordIsValid) {
            return res.status(401).json({
                success: false,
                mensaje: 'Correo o contraseña incorrectos.',
            });
        }

        const usuario = {
            id_usuario: user.id_usuario,
            nombres: user.nombres,
            apellido_paterno: user.apellido_paterno,
            apellido_materno: user.apellido_materno || '',
            nombre_completo: [user.nombres, user.apellido_paterno, user.apellido_materno]
                .filter(Boolean)
                .join(' '),
            correo: user.correo,
            ci_nit: user.ci_nit,
            rol: user.nombre_rol,
            permisos: obtenerPermisos(user.nombre_rol),
        };

        return res.json({
            success: true,
            token: crearToken(usuario),
            usuario,
        });
    } catch (error) {
        console.error('Error en el login:', error);
        return res.status(500).json({ success: false, mensaje: 'No se pudo iniciar sesión.' });
    }
};

module.exports = { login };