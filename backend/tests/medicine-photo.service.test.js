jest.mock('crypto', () => ({
  randomUUID: jest.fn(),
}));

jest.mock('fs/promises', () => ({
  mkdir: jest.fn(),
  writeFile: jest.fn(),
  unlink: jest.fn(),
}));

jest.mock('../data/repositories/medicines.repository', () => ({
  obtenerFoto: jest.fn(),
  actualizarFoto: jest.fn(),
}));

jest.mock('../business/errors/app-error', () => {
  class ErrorAplicacion extends Error {
    constructor(mensaje, { estado = 400, codigo = 'ERROR_APLICACION' } = {}) {
      super(mensaje);
      this.name = 'ErrorAplicacion';
      this.estado = estado;
      this.codigo = codigo;
    }
  }

  return {
    ErrorAplicacion,
    errorNoEncontrado: jest.fn((mensaje) => new ErrorAplicacion(mensaje, {
      estado: 404,
      codigo: 'NO_ENCONTRADO',
    })),
    errorValidacion: jest.fn((mensaje) => new ErrorAplicacion(mensaje, {
      estado: 400,
      codigo: 'VALIDACION',
    })),
  };
});

const path = require('path');
const { randomUUID } = require('crypto');
const fs = require('fs/promises');
const medicamentosRepositorio = require('../data/repositories/medicines.repository');
const {
  errorNoEncontrado,
  errorValidacion,
} = require('../business/errors/app-error');
const { subir, quitar } = require('../business/services/medicine-photo.service');

const DIRECTORIO_FOTOS = path.resolve(__dirname, '../uploads/medicamentos');
const RUTA_PUBLICA = '/uploads/medicamentos/';

const bufferJpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
const bufferPng = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
]);
const bufferWebp = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([0x00, 0x00, 0x00, 0x00]),
  Buffer.from('WEBP'),
]);

describe('servicio de fotos de medicamentos', () => {
  let consoleError;

  beforeEach(() => {
    jest.clearAllMocks();
    randomUUID.mockReturnValue('uuid-123');
    fs.mkdir.mockResolvedValue(undefined);
    fs.writeFile.mockResolvedValue(undefined);
    fs.unlink.mockResolvedValue(undefined);
    medicamentosRepositorio.actualizarFoto.mockResolvedValue(true);
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  describe('subir', () => {
    test.each([
      ['sin archivo', undefined],
      ['sin buffer', {}],
      ['buffer nulo', { buffer: null }],
    ])('rechaza %s', async (_caso, archivo) => {
      await expect(subir(1, archivo)).rejects.toMatchObject({
        estado: 400,
        codigo: 'VALIDACION',
        message: 'Selecciona una imagen para el medicamento.',
      });

      expect(errorValidacion)
        .toHaveBeenCalledWith('Selecciona una imagen para el medicamento.');
      expect(medicamentosRepositorio.obtenerFoto).not.toHaveBeenCalled();
      expect(fs.mkdir).not.toHaveBeenCalled();
    });

    test.each([
      ['JPEG demasiado corto', 'image/jpeg', Buffer.from([0xff, 0xd8])],
      ['PNG demasiado corto', 'image/png', Buffer.from([0x89, 0x50])],
      ['WebP demasiado corto', 'image/webp', Buffer.from('RIFF')],
      ['MIME incorrecto para JPEG', 'image/png', bufferJpeg],
      ['MIME incorrecto para PNG', 'image/jpeg', bufferPng],
      ['contenido distinto de imagen', 'image/jpeg', Buffer.from('texto')],
    ])('rechaza %s', async (_caso, mimetype, buffer) => {
      await expect(subir(1, { mimetype, buffer })).rejects.toMatchObject({
        estado: 400,
        codigo: 'VALIDACION',
        message: 'El archivo no contiene una imagen JPEG, PNG o WebP válida.',
      });

      expect(medicamentosRepositorio.obtenerFoto).not.toHaveBeenCalled();
      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    test.each([
      ['JPEG', 'image/jpeg', bufferJpeg, '.jpg'],
      ['PNG', 'image/png', bufferPng, '.png'],
      ['WebP', 'image/webp', bufferWebp, '.webp'],
    ])('guarda una imagen %s y actualiza la foto del medicamento', async (
      _caso,
      mimetype,
      buffer,
      extension
    ) => {
      medicamentosRepositorio.obtenerFoto.mockResolvedValue({
        id_medicamento: 1,
        foto_url: null,
      });

      const resultado = await subir(1, { mimetype, buffer });

      const nombreArchivo = `uuid-123${extension}`;
      const rutaArchivo = path.join(DIRECTORIO_FOTOS, nombreArchivo);
      const fotoUrl = `${RUTA_PUBLICA}${nombreArchivo}`;

      expect(resultado).toBe(fotoUrl);
      expect(medicamentosRepositorio.obtenerFoto).toHaveBeenCalledWith(1);
      expect(randomUUID).toHaveBeenCalledWith();
      expect(fs.mkdir).toHaveBeenCalledWith(DIRECTORIO_FOTOS, { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledWith(rutaArchivo, buffer, { flag: 'wx' });
      expect(medicamentosRepositorio.actualizarFoto)
        .toHaveBeenCalledWith(1, fotoUrl);
      expect(fs.unlink).not.toHaveBeenCalled();
    });

    test('rechaza un medicamento inexistente', async () => {
      medicamentosRepositorio.obtenerFoto.mockResolvedValue(null);

      await expect(subir(99, {
        mimetype: 'image/jpeg',
        buffer: bufferJpeg,
      })).rejects.toMatchObject({
        estado: 404,
        codigo: 'NO_ENCONTRADO',
        message: 'Medicamento no encontrado.',
      });

      expect(errorNoEncontrado).toHaveBeenCalledWith('Medicamento no encontrado.');
      expect(fs.mkdir).not.toHaveBeenCalled();
      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    test('elimina el archivo nuevo si el medicamento desaparece al actualizar', async () => {
      medicamentosRepositorio.obtenerFoto.mockResolvedValue({ foto_url: null });
      medicamentosRepositorio.actualizarFoto.mockResolvedValue(null);

      await expect(subir(1, {
        mimetype: 'image/jpeg',
        buffer: bufferJpeg,
      })).rejects.toMatchObject({
        estado: 404,
        codigo: 'NO_ENCONTRADO',
        message: 'Medicamento no encontrado.',
      });

      expect(fs.unlink).toHaveBeenCalledWith(
        path.join(DIRECTORIO_FOTOS, 'uuid-123.jpg')
      );
    });

    test('elimina el archivo nuevo si falla la actualización', async () => {
      const error = new Error('Error de base de datos');
      medicamentosRepositorio.obtenerFoto.mockResolvedValue({ foto_url: null });
      medicamentosRepositorio.actualizarFoto.mockRejectedValue(error);

      await expect(subir(1, {
        mimetype: 'image/png',
        buffer: bufferPng,
      })).rejects.toBe(error);

      expect(fs.unlink).toHaveBeenCalledWith(
        path.join(DIRECTORIO_FOTOS, 'uuid-123.png')
      );
    });

    test('elimina la foto anterior cuando existe', async () => {
      medicamentosRepositorio.obtenerFoto.mockResolvedValue({
        foto_url: `${RUTA_PUBLICA}foto-anterior.jpg`,
      });

      const resultado = await subir(1, {
        mimetype: 'image/jpeg',
        buffer: bufferJpeg,
      });

      expect(resultado).toBe(`${RUTA_PUBLICA}uuid-123.jpg`);
      expect(fs.unlink).toHaveBeenCalledWith(
        path.join(DIRECTORIO_FOTOS, 'foto-anterior.jpg')
      );
    });

    test.each([
      ['URL externa', 'https://ejemplo.test/foto.jpg'],
      ['sin nombre de archivo', RUTA_PUBLICA],
      ['intento de recorrido', `${RUTA_PUBLICA}../foto.jpg`],
      ['subdirectorio', `${RUTA_PUBLICA}sub/foto.jpg`],
      ['valor no textual', 123],
    ])('no elimina archivos para una URL %s', async (_caso, fotoUrl) => {
      medicamentosRepositorio.obtenerFoto.mockResolvedValue({ foto_url: fotoUrl });

      await subir(1, {
        mimetype: 'image/jpeg',
        buffer: bufferJpeg,
      });

      expect(fs.unlink).not.toHaveBeenCalled();
    });

    test('registra el fallo de limpieza sin interrumpir la subida', async () => {
      const error = new Error('Permiso denegado');
      medicamentosRepositorio.obtenerFoto.mockResolvedValue({
        foto_url: `${RUTA_PUBLICA}anterior.jpg`,
      });
      fs.unlink.mockRejectedValue(error);

      await expect(subir(1, {
        mimetype: 'image/jpeg',
        buffer: bufferJpeg,
      })).resolves.toBe(`${RUTA_PUBLICA}uuid-123.jpg`);

      expect(consoleError).toHaveBeenCalledWith(
        'No se pudo eliminar el archivo de foto anterior del medicamento 1:',
        error
      );
    });

    test('ignora el error ENOENT al eliminar la foto anterior', async () => {
      const error = new Error('No existe');
      error.code = 'ENOENT';
      medicamentosRepositorio.obtenerFoto.mockResolvedValue({
        foto_url: `${RUTA_PUBLICA}anterior.jpg`,
      });
      fs.unlink.mockRejectedValue(error);

      await expect(subir(1, {
        mimetype: 'image/jpeg',
        buffer: bufferJpeg,
      })).resolves.toBe(`${RUTA_PUBLICA}uuid-123.jpg`);

      expect(consoleError).not.toHaveBeenCalled();
    });

    test('propaga el error al crear el directorio', async () => {
      const error = new Error('No se pudo crear el directorio');
      medicamentosRepositorio.obtenerFoto.mockResolvedValue({ foto_url: null });
      fs.mkdir.mockRejectedValue(error);

      await expect(subir(1, {
        mimetype: 'image/jpeg',
        buffer: bufferJpeg,
      })).rejects.toBe(error);

      expect(fs.writeFile).not.toHaveBeenCalled();
      expect(medicamentosRepositorio.actualizarFoto).not.toHaveBeenCalled();
    });

    test('propaga el error al escribir el archivo', async () => {
      const error = new Error('No se pudo escribir');
      medicamentosRepositorio.obtenerFoto.mockResolvedValue({ foto_url: null });
      fs.writeFile.mockRejectedValue(error);

      await expect(subir(1, {
        mimetype: 'image/jpeg',
        buffer: bufferJpeg,
      })).rejects.toBe(error);

      expect(medicamentosRepositorio.actualizarFoto).not.toHaveBeenCalled();
    });
  });

  describe('quitar', () => {
    test('rechaza un medicamento inexistente', async () => {
      medicamentosRepositorio.obtenerFoto.mockResolvedValue(null);

      await expect(quitar(99)).rejects.toMatchObject({
        estado: 404,
        codigo: 'NO_ENCONTRADO',
        message: 'Medicamento no encontrado.',
      });

      expect(medicamentosRepositorio.actualizarFoto).not.toHaveBeenCalled();
      expect(fs.unlink).not.toHaveBeenCalled();
    });

    test('no hace nada si el medicamento no tiene foto', async () => {
      medicamentosRepositorio.obtenerFoto.mockResolvedValue({
        id_medicamento: 1,
        foto_url: null,
      });

      await expect(quitar(1)).resolves.toBeUndefined();

      expect(medicamentosRepositorio.actualizarFoto).not.toHaveBeenCalled();
      expect(fs.unlink).not.toHaveBeenCalled();
    });

    test('limpia la foto y elimina el archivo asociado', async () => {
      medicamentosRepositorio.obtenerFoto.mockResolvedValue({
        id_medicamento: 1,
        foto_url: `${RUTA_PUBLICA}foto.jpg`,
      });

      await expect(quitar(1)).resolves.toBeUndefined();

      expect(medicamentosRepositorio.actualizarFoto).toHaveBeenCalledWith(1, null);
      expect(fs.unlink).toHaveBeenCalledWith(
        path.join(DIRECTORIO_FOTOS, 'foto.jpg')
      );
    });

    test('no elimina archivos para una URL no gestionada', async () => {
      medicamentosRepositorio.obtenerFoto.mockResolvedValue({
        foto_url: 'https://ejemplo.test/foto.jpg',
      });

      await quitar(1);

      expect(medicamentosRepositorio.actualizarFoto).toHaveBeenCalledWith(1, null);
      expect(fs.unlink).not.toHaveBeenCalled();
    });

    test('propaga el error al actualizar la foto', async () => {
      const error = new Error('Error de base de datos');
      medicamentosRepositorio.obtenerFoto.mockResolvedValue({
        foto_url: `${RUTA_PUBLICA}foto.jpg`,
      });
      medicamentosRepositorio.actualizarFoto.mockRejectedValue(error);

      await expect(quitar(1)).rejects.toBe(error);

      expect(fs.unlink).not.toHaveBeenCalled();
    });

    test('registra el fallo de limpieza sin interrumpir la operación', async () => {
      const error = new Error('Permiso denegado');
      medicamentosRepositorio.obtenerFoto.mockResolvedValue({
        foto_url: `${RUTA_PUBLICA}foto.jpg`,
      });
      fs.unlink.mockRejectedValue(error);

      await expect(quitar(1)).resolves.toBeUndefined();

      expect(consoleError).toHaveBeenCalledWith(
        'No se pudo eliminar el archivo de foto anterior del medicamento 1:',
        error
      );
    });

    test('ignora el error ENOENT al eliminar el archivo', async () => {
      const error = new Error('No existe');
      error.code = 'ENOENT';
      medicamentosRepositorio.obtenerFoto.mockResolvedValue({
        foto_url: `${RUTA_PUBLICA}foto.jpg`,
      });
      fs.unlink.mockRejectedValue(error);

      await expect(quitar(1)).resolves.toBeUndefined();

      expect(consoleError).not.toHaveBeenCalled();
    });

    test('propaga el error al consultar el medicamento', async () => {
      const error = new Error('Error de base de datos');
      medicamentosRepositorio.obtenerFoto.mockRejectedValue(error);

      await expect(quitar(1)).rejects.toBe(error);
    });
  });
});
