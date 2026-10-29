const { BCRYPT_ROUNDS, hashPassword } = require('../business/security/passwords');

const password = process.argv[2];

if (!password) {
    console.error('Uso: npm run hash -- "mi-contraseña"');
    process.exit(1);
}

if (Buffer.byteLength(password, 'utf8') > 72) {
    console.error('La contraseña no puede superar 72 bytes en UTF-8.');
    process.exit(1);
}

hashPassword(password)
    .then((hash) => {
        console.log(`Hash bcrypt (coste ${BCRYPT_ROUNDS}):`);
        console.log(hash);
    })
    .catch((error) => {
        console.error('No se pudo generar el hash:', error);
        process.exit(1);
    });
