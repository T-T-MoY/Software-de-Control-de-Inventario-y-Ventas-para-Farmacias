const db = require('../config/db');
const { obtenerPermisos } = require('../config/permisos');

const obtenerPerfil = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT u.id_usuario, u.nombres, u.apellido_paterno, u.apellido_materno,
                    u.fecha_nacimiento, u.correo, u.ci_nit, u.estado_cuenta,
                    u.fecha_registro, r.nombre_rol
             FROM usuario AS u
             JOIN rol AS r ON r.id_rol = u.id_rol
             WHERE u.id_usuario = $1`,
            [req.sessionUser.id_usuario]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        const usuario = result.rows[0];
        return res.json({
            ...usuario,
            nombre_completo: [
                usuario.nombres,
                usuario.apellido_paterno,
                usuario.apellido_materno,
            ].filter(Boolean).join(' '),
            permisos: obtenerPermisos(usuario.nombre_rol),
        });
    } catch (error) {
        console.error('Error al obtener el perfil:', error);
        return res.status(500).json({ error: 'No se pudo cargar el perfil.' });
    }
};

module.exports = { obtenerPerfil };
