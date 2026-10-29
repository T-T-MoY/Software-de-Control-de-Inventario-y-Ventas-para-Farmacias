/**
 * Error de negocio con estado HTTP asociado.
 *
 * La capa de negocio lanza estos errores y la capa de presentación
 * (middleware de errores) decide cómo responder al cliente. Así los
 * servicios no conocen Express ni códigos de estado sueltos.
 */
class ErrorAplicacion extends Error {
    constructor(mensaje, { estado = 400, codigo = 'ERROR_APLICACION' } = {}) {
        super(mensaje);
        this.name = 'ErrorAplicacion';
        this.estado = estado;
        this.codigo = codigo;
    }
}

const errorValidacion = (mensaje) => new ErrorAplicacion(mensaje, {
    estado: 400,
    codigo: 'VALIDACION',
});

const errorNoAutorizado = (mensaje) => new ErrorAplicacion(mensaje, {
    estado: 401,
    codigo: 'NO_AUTORIZADO',
});

const errorProhibido = (mensaje) => new ErrorAplicacion(mensaje, {
    estado: 403,
    codigo: 'PROHIBIDO',
});

const errorNoEncontrado = (mensaje) => new ErrorAplicacion(mensaje, {
    estado: 404,
    codigo: 'NO_ENCONTRADO',
});

const errorConflicto = (mensaje) => new ErrorAplicacion(mensaje, {
    estado: 409,
    codigo: 'CONFLICTO',
});

module.exports = {
    ErrorAplicacion,
    errorValidacion,
    errorNoAutorizado,
    errorProhibido,
    errorNoEncontrado,
    errorConflicto,
};
