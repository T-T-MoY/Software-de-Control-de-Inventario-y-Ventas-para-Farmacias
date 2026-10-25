const crypto = require('crypto');
const db = require('../config/db');

const tokenDurationSeconds = 60 * 60 * 8;

const getSecret = () => {
    const secret = process.env.SESSION_SECRET;
    if (!secret || secret.length < 32) {
        throw new Error('SESSION_SECRET debe tener al menos 32 caracteres.');
    }
    return secret;
};

const firmar = (payload) => crypto
    .createHmac('sha256', getSecret())
    .update(payload)
    .digest('base64url');

const crearToken = (usuario) => {
    const payload = Buffer.from(JSON.stringify({
        sub: usuario.id_usuario,
        rol: usuario.rol,
        exp: Math.floor(Date.now() / 1000) + tokenDurationSeconds,
    })).toString('base64url');

    return `${payload}.${firmar(payload)}`;
};

const autenticarAdministrador = async (req, res, next) => {
    const authorization = req.get('authorization') || '';
    const [scheme, token] = authorization.split(' ');
    const [payload, signature] = (token || '').split('.');

    if (scheme !== 'Bearer' || !payload || !signature) {
        return res.status(401).json({ error: 'Debes iniciar sesión.' });
    }

    try {
        const expectedSignature = firmar(payload);
        const actualBuffer = Buffer.from(signature);
        const expectedBuffer = Buffer.from(expectedSignature);

        if (
            actualBuffer.length !== expectedBuffer.length
            || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
        ) {
            return res.status(401).json({ error: 'La sesión no es válida.' });
        }

        const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        if (!Number.isInteger(session.sub) || session.exp <= Math.floor(Date.now() / 1000)) {
            return res.status(401).json({ error: 'La sesión venció.' });
        }

        const result = await db.query(
            `SELECT u.id_usuario
             FROM usuario AS u
             JOIN rol AS r ON r.id_rol = u.id_rol
             WHERE u.id_usuario = $1
               AND u.estado_cuenta = 'Activo'
               AND r.nombre_rol = 'Administrador'`,
            [session.sub]
        );
        if (result.rowCount === 0) {
            return res.status(403).json({ error: 'Se requiere una cuenta administradora activa.' });
        }

        req.sessionUser = { id_usuario: Number(session.sub) };
        return next();
    } catch (error) {
        if (error.message.startsWith('SESSION_SECRET')) {
            return next(error);
        }
        if (error instanceof SyntaxError || error instanceof TypeError) {
            return res.status(401).json({ error: 'La sesión no es válida.' });
        }
        return next(error);
    }
};

module.exports = { autenticarAdministrador, crearToken };
