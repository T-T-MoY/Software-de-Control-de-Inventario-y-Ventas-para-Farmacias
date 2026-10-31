const multer = require('multer');
const { errorValidacion } = require('../../business/errors/app-error');

const TIPOS_IMAGEN_PERMITIDOS = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
]);

const cargarFotoMedicamento = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
    },
    fileFilter: (req, archivo, callback) => {
        if (!TIPOS_IMAGEN_PERMITIDOS.has(archivo.mimetype)) {
            return callback(errorValidacion('La foto debe ser JPEG, PNG o WebP.'));
        }
        return callback(null, true);
    },
}).single('foto');

const procesarFotoMedicamento = (req, res, next) => {
    cargarFotoMedicamento(req, res, (error) => {
        if (!error) return next();

        if (error instanceof multer.MulterError) {
            const mensaje = error.code === 'LIMIT_FILE_SIZE'
                ? 'La foto no puede superar 5 MB.'
                : 'No se pudo procesar la foto seleccionada.';
            return next(errorValidacion(mensaje));
        }

        return next(error);
    });
};

module.exports = { procesarFotoMedicamento };
