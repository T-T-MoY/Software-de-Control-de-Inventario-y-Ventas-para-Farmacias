/**
 * Traduce filas de PostgreSQL a objetos que consume la capa de negocio.
 * Evita repetir el armado de nombre_completo en cada servicio.
 */
const nombreCompleto = (usuario) => [
    usuario.nombres,
    usuario.apellido_paterno,
    usuario.apellido_materno,
].filter(Boolean).join(' ');

/** Datos públicos del usuario para la respuesta del login. */
const aSesion = (fila) => ({
    id_usuario: fila.id_usuario,
    nombres: fila.nombres,
    apellido_paterno: fila.apellido_paterno,
    apellido_materno: fila.apellido_materno || '',
    nombre_completo: nombreCompleto(fila),
    correo: fila.correo,
    ci_nit: fila.ci_nit,
    rol: fila.nombre_rol,
});

/** Datos del perfil propio (incluye fecha de registro y estado). */
const aPerfil = (fila) => ({
    id_usuario: fila.id_usuario,
    nombres: fila.nombres,
    apellido_paterno: fila.apellido_paterno,
    apellido_materno: fila.apellido_materno || '',
    nombre_completo: nombreCompleto(fila),
    fecha_nacimiento: fila.fecha_nacimiento,
    correo: fila.correo,
    ci_nit: fila.ci_nit,
    estado_cuenta: fila.estado_cuenta,
    fecha_registro: fila.fecha_registro,
    nombre_rol: fila.nombre_rol,
});

module.exports = { nombreCompleto, aSesion, aPerfil };
