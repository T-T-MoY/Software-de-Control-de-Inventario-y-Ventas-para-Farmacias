const db = require('../config/db');
const { hashPassword } = require('../config/password');

const camposUsuario = `
    u.id_usuario,
    u.nombres,
    u.apellido_paterno,
    u.apellido_materno,
    u.fecha_nacimiento,
    u.correo,
    u.ci_nit,
    u.estado_cuenta,
    u.id_rol,
    r.nombre_rol
`;

const obtenerUsuarios = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT ${camposUsuario}
             FROM usuario AS u
             JOIN rol AS r ON r.id_rol = u.id_rol
             ORDER BY u.apellido_paterno, u.nombres`
        );
        return res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        return res.status(500).json({ error: 'No se pudieron cargar los usuarios.' });
    }
};

const obtenerRoles = async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id_rol, nombre_rol FROM rol ORDER BY id_rol'
        );
        return res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener roles:', error);
        return res.status(500).json({ error: 'No se pudieron cargar los roles.' });
    }
};

const validarUsuario = (body, necesitaContrasena) => {
    const required = [
        'nombres',
        'apellido_paterno',
        'fecha_nacimiento',
        'correo',
        'ci_nit',
    ];

    if (required.some((field) => (
        typeof body[field] !== 'string' || !body[field].trim()
    ))) {
        return 'Completa todos los campos obligatorios.';
    }
    if (body.id_rol === undefined || body.id_rol === null || String(body.id_rol).trim() === '') {
        return 'Selecciona un rol válido.';
    }
    if (!/^\S+@\S+\.\S+$/.test(body.correo.trim())) {
        return 'Ingresa un correo válido.';
    }
    if (
        body.nombres.trim().length > 80
        || body.apellido_paterno.trim().length > 60
        || (body.apellido_materno != null && typeof body.apellido_materno !== 'string')
        || (body.apellido_materno?.trim().length || 0) > 60
        || body.correo.trim().length > 120
        || body.ci_nit.trim().length > 20
    ) {
        return 'Uno o más campos exceden la longitud permitida.';
    }
    const fechaNacimiento = body.fecha_nacimiento;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaNacimiento)) {
        return 'Ingresa una fecha de nacimiento válida.';
    }
    const [year, month, day] = fechaNacimiento.split('-').map(Number);
    const fechaValida = new Date(0);
    fechaValida.setUTCHours(0, 0, 0, 0);
    fechaValida.setUTCFullYear(year, month - 1, day);
    if (
        fechaValida.getUTCFullYear() !== year
        || fechaValida.getUTCMonth() !== month - 1
        || fechaValida.getUTCDate() !== day
        || fechaValida > new Date()
    ) {
        return 'Ingresa una fecha de nacimiento válida.';
    }
    if (!Number.isInteger(Number(body.id_rol)) || Number(body.id_rol) < 1) {
        return 'Selecciona un rol válido.';
    }
    if (necesitaContrasena && (
        typeof body.contrasena !== 'string' || body.contrasena.length < 8
    )) {
        return 'La contraseña debe tener al menos 8 caracteres.';
    }
    const cambiaContrasena = body.contrasena !== undefined
        && body.contrasena !== null
        && body.contrasena !== '';
    if (!necesitaContrasena && cambiaContrasena && (
        typeof body.contrasena !== 'string' || body.contrasena.length < 8
    )) {
        return 'La nueva contraseña debe tener al menos 8 caracteres.';
    }
    if (cambiaContrasena && Buffer.byteLength(body.contrasena, 'utf8') > 72) {
        return 'La contraseña no puede superar 72 bytes.';
    }
    return null;
};

const crearUsuario = async (req, res) => {
    const errorValidacion = validarUsuario(req.body, true);
    if (errorValidacion) {
        return res.status(400).json({ error: errorValidacion });
    }

    try {
        const passwordHash = await hashPassword(req.body.contrasena);
        const result = await db.query(
            `INSERT INTO usuario (
                nombres, apellido_paterno, apellido_materno, fecha_nacimiento,
                correo, ci_nit, contrasena_hash, id_rol
             )
             VALUES ($1, $2, $3, $4, LOWER($5), $6, $7, $8)
             RETURNING id_usuario`,
            [
                req.body.nombres.trim(),
                req.body.apellido_paterno.trim(),
                req.body.apellido_materno?.trim() || null,
                req.body.fecha_nacimiento,
                req.body.correo.trim(),
                req.body.ci_nit.trim(),
                passwordHash,
                Number(req.body.id_rol),
            ]
        );
        return res.status(201).json({ id_usuario: result.rows[0].id_usuario });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'El correo o CI/NIT ya está registrado.' });
        }
        if (error.code === '23503') {
            return res.status(400).json({ error: 'El rol seleccionado no existe.' });
        }
        console.error('Error al crear usuario:', error);
        return res.status(500).json({ error: 'No se pudo crear el usuario.' });
    }
};

const actualizarUsuario = async (req, res) => {
    const errorValidacion = validarUsuario(req.body, false);
    if (errorValidacion) {
        return res.status(400).json({ error: errorValidacion });
    }

    try {
        const passwordHash = req.body.contrasena
            ? await hashPassword(req.body.contrasena)
            : null;
        if (Number(req.params.id) === req.sessionUser.id_usuario) {
            const roleResult = await db.query(
                'SELECT nombre_rol FROM rol WHERE id_rol = $1',
                [Number(req.body.id_rol)]
            );
            if (roleResult.rows[0]?.nombre_rol !== 'Administrador') {
                return res.status(400).json({ error: 'No puedes quitarte el rol de administrador.' });
            }
        }

        const result = await db.query(
            `UPDATE usuario
             SET nombres = $1,
                 apellido_paterno = $2,
                 apellido_materno = $3,
                 fecha_nacimiento = $4,
                 correo = LOWER($5),
                 ci_nit = $6,
                 id_rol = $7,
                 contrasena_hash = COALESCE($8, contrasena_hash)
             WHERE id_usuario = $9`,
            [
                req.body.nombres.trim(),
                req.body.apellido_paterno.trim(),
                req.body.apellido_materno?.trim() || null,
                req.body.fecha_nacimiento,
                req.body.correo.trim(),
                req.body.ci_nit.trim(),
                Number(req.body.id_rol),
                passwordHash,
                req.params.id,
            ]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }
        return res.json({ message: 'Usuario actualizado correctamente.' });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'El correo o CI/NIT ya está registrado.' });
        }
        if (error.code === '23503') {
            return res.status(400).json({ error: 'El rol seleccionado no existe.' });
        }
        console.error('Error al actualizar usuario:', error);
        return res.status(500).json({ error: 'No se pudo actualizar el usuario.' });
    }
};

const cambiarEstado = async (req, res) => {
    const activo = req.body.activo;
    if (typeof activo !== 'boolean') {
        return res.status(400).json({ error: 'El estado debe ser activo o inactivo.' });
    }
    if (!activo && Number(req.params.id) === req.sessionUser.id_usuario) {
        return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta.' });
    }

    try {
        const result = await db.query(
            `UPDATE usuario
             SET estado_cuenta = $1
             WHERE id_usuario = $2`,
            [activo ? 'Activo' : 'Inactivo', req.params.id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }
        return res.json({ message: 'Estado de usuario actualizado.' });
    } catch (error) {
        console.error('Error al cambiar el estado del usuario:', error);
        return res.status(500).json({ error: 'No se pudo actualizar el estado.' });
    }
};

module.exports = { obtenerUsuarios, obtenerRoles, crearUsuario, actualizarUsuario, cambiarEstado };
