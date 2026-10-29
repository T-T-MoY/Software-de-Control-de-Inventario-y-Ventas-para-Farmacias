/**
 * Acceso a la tabla usuario.
 * Todo el SQL del módulo de seguridad vive aquí.
 */
const db = require('../connection');

const CAMPOS_USUARIO = `
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

const listar = async () => {
    const { rows } = await db.query(
        `SELECT ${CAMPOS_USUARIO}
         FROM usuario AS u
         JOIN rol AS r ON r.id_rol = u.id_rol
         ORDER BY u.apellido_paterno, u.nombres`
    );
    return rows;
};

const buscarPorCorreo = async (correo) => {
    const { rows } = await db.query(
        `SELECT u.id_usuario, u.nombres, u.apellido_paterno, u.apellido_materno,
                u.correo, u.ci_nit, u.contrasena_hash, u.estado_cuenta,
                r.nombre_rol
         FROM usuario AS u
         JOIN rol AS r ON r.id_rol = u.id_rol
         WHERE LOWER(u.correo) = $1`,
        [correo]
    );
    return rows[0] || null;
};

const buscarSesionActiva = async (idUsuario) => {
    const { rows } = await db.query(
        `SELECT u.id_usuario, r.nombre_rol
         FROM usuario AS u
         JOIN rol AS r ON r.id_rol = u.id_rol
         WHERE u.id_usuario = $1
           AND u.estado_cuenta = 'Activo'`,
        [idUsuario]
    );
    return rows[0] || null;
};

const buscarPorId = async (idUsuario) => {
    const { rows } = await db.query(
        `SELECT u.id_usuario, u.nombres, u.apellido_paterno, u.apellido_materno,
                u.fecha_nacimiento, u.correo, u.ci_nit, u.estado_cuenta,
                u.fecha_registro, r.nombre_rol
         FROM usuario AS u
         JOIN rol AS r ON r.id_rol = u.id_rol
         WHERE u.id_usuario = $1`,
        [idUsuario]
    );
    return rows[0] || null;
};

const crear = async ({
    nombres,
    apellido_paterno,
    apellido_materno,
    fecha_nacimiento,
    correo,
    ci_nit,
    contrasenaHash,
    id_rol,
}) => {
    const { rows } = await db.query(
        `INSERT INTO usuario (
            nombres, apellido_paterno, apellido_materno, fecha_nacimiento,
            correo, ci_nit, contrasena_hash, id_rol
         )
         VALUES ($1, $2, $3, $4, LOWER($5), $6, $7, $8)
         RETURNING id_usuario`,
        [
            nombres,
            apellido_paterno,
            apellido_materno,
            fecha_nacimiento,
            correo,
            ci_nit,
            contrasenaHash,
            id_rol,
        ]
    );
    return rows[0].id_usuario;
};

const actualizar = async (idUsuario, {
    nombres,
    apellido_paterno,
    apellido_materno,
    fecha_nacimiento,
    correo,
    ci_nit,
    id_rol,
    contrasenaHash,
}) => {
    const { rowCount } = await db.query(
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
            nombres,
            apellido_paterno,
            apellido_materno,
            fecha_nacimiento,
            correo,
            ci_nit,
            id_rol,
            contrasenaHash,
            idUsuario,
        ]
    );
    return rowCount;
};

const cambiarEstado = async (idUsuario, activo) => {
    const { rowCount } = await db.query(
        `UPDATE usuario
         SET estado_cuenta = $1
         WHERE id_usuario = $2`,
        [activo ? 'Activo' : 'Inactivo', idUsuario]
    );
    return rowCount;
};

module.exports = {
    listar,
    buscarPorCorreo,
    buscarSesionActiva,
    buscarPorId,
    crear,
    actualizar,
    cambiarEstado,
};
