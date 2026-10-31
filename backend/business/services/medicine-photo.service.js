const { randomUUID } = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const medicamentosRepositorio = require('../../data/repositories/medicines.repository');
const { errorNoEncontrado, errorValidacion } = require('../errors/app-error');

const DIRECTORIO_FOTOS = path.resolve(__dirname, '../../uploads/medicamentos');
const RUTA_PUBLICA_FOTOS = '/uploads/medicamentos/';

const formatosImagen = [
    {
        mime: 'image/jpeg',
        extension: '.jpg',
        reconocer: (buffer) => (
            buffer.length >= 3
            && buffer[0] === 0xff
            && buffer[1] === 0xd8
            && buffer[2] === 0xff
        ),
    },
    {
        mime: 'image/png',
        extension: '.png',
        reconocer: (buffer) => (
            buffer.length >= 8
            && buffer.subarray(0, 8).equals(
                Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
            )
        ),
    },
    {
        mime: 'image/webp',
        extension: '.webp',
        reconocer: (buffer) => (
            buffer.length >= 12
            && buffer.toString('ascii', 0, 4) === 'RIFF'
            && buffer.toString('ascii', 8, 12) === 'WEBP'
        ),
    },
];

const resolverRutaFoto = (fotoUrl) => {
    if (typeof fotoUrl !== 'string' || !fotoUrl.startsWith(RUTA_PUBLICA_FOTOS)) {
        return null;
    }

    const nombreArchivo = fotoUrl.slice(RUTA_PUBLICA_FOTOS.length);
    if (!nombreArchivo || path.basename(nombreArchivo) !== nombreArchivo) {
        return null;
    }

    return path.join(DIRECTORIO_FOTOS, nombreArchivo);
};

const eliminarArchivoFoto = async (fotoUrl) => {
    const ruta = resolverRutaFoto(fotoUrl);
    if (!ruta) return;

    try {
        await fs.unlink(ruta);
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }
};

const registrarFalloLimpieza = (error, idMedicamento) => {
    console.error(
        `No se pudo eliminar el archivo de foto anterior del medicamento ${idMedicamento}:`,
        error
    );
};

const subir = async (idMedicamento, archivo) => {
    if (!archivo?.buffer) {
        throw errorValidacion('Selecciona una imagen para el medicamento.');
    }

    const formato = formatosImagen.find((opcion) => (
        opcion.mime === archivo.mimetype && opcion.reconocer(archivo.buffer)
    ));
    if (!formato) {
        throw errorValidacion('El archivo no contiene una imagen JPEG, PNG o WebP válida.');
    }

    const medicamento = await medicamentosRepositorio.obtenerFoto(idMedicamento);
    if (!medicamento) {
        throw errorNoEncontrado('Medicamento no encontrado.');
    }

    await fs.mkdir(DIRECTORIO_FOTOS, { recursive: true });

    const nombreArchivo = `${randomUUID()}${formato.extension}`;
    const rutaArchivo = path.join(DIRECTORIO_FOTOS, nombreArchivo);
    const fotoUrl = `${RUTA_PUBLICA_FOTOS}${nombreArchivo}`;

    await fs.writeFile(rutaArchivo, archivo.buffer, { flag: 'wx' });

    try {
        const actualizados = await medicamentosRepositorio.actualizarFoto(
            idMedicamento,
            fotoUrl
        );
        if (!actualizados) {
            throw errorNoEncontrado('Medicamento no encontrado.');
        }
    } catch (error) {
        await fs.unlink(rutaArchivo);
        throw error;
    }

    if (medicamento.foto_url) {
        try {
            await eliminarArchivoFoto(medicamento.foto_url);
        } catch (error) {
            registrarFalloLimpieza(error, idMedicamento);
        }
    }

    return fotoUrl;
};

const quitar = async (idMedicamento) => {
    const medicamento = await medicamentosRepositorio.obtenerFoto(idMedicamento);
    if (!medicamento) {
        throw errorNoEncontrado('Medicamento no encontrado.');
    }

    if (!medicamento.foto_url) return;

    await medicamentosRepositorio.actualizarFoto(idMedicamento, null);
    try {
        await eliminarArchivoFoto(medicamento.foto_url);
    } catch (error) {
        registrarFalloLimpieza(error, idMedicamento);
    }
};

module.exports = { subir, quitar };
