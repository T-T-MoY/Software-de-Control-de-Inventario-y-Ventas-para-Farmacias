/**
 * Firma y verificación del token de sesión (capa de negocio).
 *
 * No conoce Express ni la base de datos: recibe y devuelve datos.
 * El middleware de presentación es quien lo usa.
 */
const crypto = require('crypto');
const { errorNoAutorizado } = require('../errors/app-error');

const DURACION_SEGUNDOS = 60 * 60 * 8;

const obtenerSecreto = () => {
    const secreto = process.env.SESSION_SECRET;
    if (!secreto || secreto.length < 32) {
        throw new Error('SESSION_SECRET debe tener al menos 32 caracteres.');
    }
    return secreto;
};

const firmar = (payload) => crypto
    .createHmac('sha256', obtenerSecreto())
    .update(payload)
    .digest('base64url');

const crearToken = (usuario) => {
    const payload = Buffer.from(JSON.stringify({
        sub: usuario.id_usuario,
        rol: usuario.rol,
        exp: Math.floor(Date.now() / 1000) + DURACION_SEGUNDOS,
    })).toString('base64url');

    return `${payload}.${firmar(payload)}`;
};

/**
 * Valida la firma y la vigencia del token.
 * Devuelve el payload o lanza un ErrorAplicacion 401.
 */
const verificarToken = (token) => {
    const [payload, firma] = String(token || '').split('.');
    if (!payload || !firma) {
        throw errorNoAutorizado('La sesión no es válida.');
    }

    const firmaEsperada = firmar(payload);
    const firmaRecibida = Buffer.from(firma);
    const firmaCalculada = Buffer.from(firmaEsperada);

    if (
        firmaRecibida.length !== firmaCalculada.length
        || !crypto.timingSafeEqual(firmaRecibida, firmaCalculada)
    ) {
        throw errorNoAutorizado('La sesión no es válida.');
    }

    let sesion;
    try {
        sesion = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    } catch (error) {
        throw errorNoAutorizado('La sesión no es válida.');
    }

    if (!Number.isInteger(sesion.sub)) {
        throw errorNoAutorizado('La sesión no es válida.');
    }
    if (sesion.exp <= Math.floor(Date.now() / 1000)) {
        throw errorNoAutorizado('La sesión venció.');
    }

    return sesion;
};

module.exports = { crearToken, verificarToken };
