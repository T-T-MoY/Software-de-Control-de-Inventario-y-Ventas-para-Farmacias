jest.mock('../business/services/medicines.service', () => ({
  listar: jest.fn(),
  listarCategorias: jest.fn(),
  crear: jest.fn(),
  actualizar: jest.fn(),
  cambiarEstado: jest.fn(),
  eliminarLogicamente: jest.fn(),
}));

jest.mock('../business/services/medicine-photo.service', () => ({
  subir: jest.fn(),
  quitar: jest.fn(),
}));

jest.mock('../presentation/validators/medicine.validator', () => ({
  validarDatosMedicamento: jest.fn(),
  validarCambioEstado: jest.fn(),
}));

jest.mock('../config/parameters', () => ({
  diasReposicion: 7,
}));

const medicamentosServicio = require('../business/services/medicines.service');
const fotoMedicamentoServicio = require('../business/services/medicine-photo.service');
const {
  validarDatosMedicamento,
  validarCambioEstado,
} = require('../presentation/validators/medicine.validator');
const {
  obtenerMedicamentos,
  obtenerCategorias,
  crearMedicamento,
  actualizarMedicamento,
  cambiarEstado,
  eliminarMedicamento,
  subirFoto,
  quitarFoto,
} = require('../presentation/controllers/medicines.controller');

const crearRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('controlador de medicamentos', () => {
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    res = crearRes();
    next = jest.fn();
    validarDatosMedicamento.mockReturnValue(null);
    validarCambioEstado.mockReturnValue(null);
  });

  describe('obtenerMedicamentos', () => {
    test('construye los filtros con búsqueda, categoría y estado', async () => {
      const medicamentos = [{ id_medicamento: 1 }];
      medicamentosServicio.listar.mockResolvedValue(medicamentos);

      await obtenerMedicamentos({
        query: { buscar: ' para ', categoria: '2', estado: 'Activo' },
      }, res, next);

      expect(medicamentosServicio.listar).toHaveBeenCalledWith({
        buscar: 'para',
        idCategoria: 2,
        estado: 'Activo',
      });
      expect(res.json).toHaveBeenCalledWith(medicamentos);
    });

    test.each([
      ['sin query', {}],
      ['búsqueda en blanco', { buscar: '   ' }],
      ['búsqueda no textual', { buscar: 123 }],
      ['categoría cero', { categoria: '0' }],
      ['categoría no numérica', { categoria: 'abc' }],
      ['categoría decimal', { categoria: '1.5' }],
      ['estado desconocido', { estado: 'Eliminado' }],
    ])('ignora filtros inválidos %s', async (_caso, query) => {
      medicamentosServicio.listar.mockResolvedValue([]);

      await obtenerMedicamentos({ query }, res, next);

      expect(medicamentosServicio.listar).toHaveBeenCalledWith({});
    });

    test('delega el error en next', async () => {
      const error = new Error('Error de base de datos');
      medicamentosServicio.listar.mockRejectedValue(error);

      await obtenerMedicamentos({ query: {} }, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('obtenerCategorias', () => {
    test('devuelve las categorías', async () => {
      const categorias = [{ id_categoria: 1 }];
      medicamentosServicio.listarCategorias.mockResolvedValue(categorias);

      await obtenerCategorias({}, res, next);

      expect(medicamentosServicio.listarCategorias).toHaveBeenCalledWith();
      expect(res.json).toHaveBeenCalledWith(categorias);
    });

    test('delega el error en next', async () => {
      const error = new Error('Error de base de datos');
      medicamentosServicio.listarCategorias.mockRejectedValue(error);

      await obtenerCategorias({}, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('crearMedicamento', () => {
    test('completa los días de reposición con la configuración para validar', async () => {
      const body = { nombre_comercial: 'Paracetamol' };
      medicamentosServicio.crear.mockResolvedValue(14);

      await crearMedicamento({ body }, res, next);

      expect(validarDatosMedicamento).toHaveBeenCalledWith({
        ...body,
        dias_reposicion: 7,
      });
      expect(medicamentosServicio.crear).toHaveBeenCalledWith(body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id_medicamento: 14 });
    });

    test('respeta los días de reposición enviados', async () => {
      const body = { nombre_comercial: 'Paracetamol', dias_reposicion: 0 };
      medicamentosServicio.crear.mockResolvedValue(15);

      await crearMedicamento({ body }, res, next);

      expect(validarDatosMedicamento).toHaveBeenCalledWith({
        nombre_comercial: 'Paracetamol',
        dias_reposicion: 0,
      });
    });

    test('rechaza datos inválidos sin llamar al servicio', async () => {
      validarDatosMedicamento.mockReturnValue('El nombre es obligatorio.');

      await crearMedicamento({ body: {} }, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'El nombre es obligatorio.' });
      expect(medicamentosServicio.crear).not.toHaveBeenCalled();
    });

    test('delega el error en next', async () => {
      const error = new Error('El código de barras ya está registrado.');
      medicamentosServicio.crear.mockRejectedValue(error);

      await crearMedicamento({ body: { nombre_comercial: 'Paracetamol' } }, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('actualizarMedicamento', () => {
    test('valida y actualiza el medicamento', async () => {
      const body = { nombre_comercial: 'Paracetamol' };
      medicamentosServicio.actualizar.mockResolvedValue({ id_medicamento: 5 });

      await actualizarMedicamento({ params: { id: '5' }, body }, res, next);

      expect(validarDatosMedicamento).toHaveBeenCalledWith(body);
      expect(medicamentosServicio.actualizar).toHaveBeenCalledWith('5', body);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Medicamento actualizado correctamente.',
      });
    });

    test.each(['0', 'abc', '1.5', '', '-1'])(
      'rechaza el identificador inválido %p',
      async (id) => {
        await actualizarMedicamento({
          params: { id },
          body: {},
        }, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Identificador de medicamento inválido.',
        });
        expect(validarDatosMedicamento).not.toHaveBeenCalled();
        expect(medicamentosServicio.actualizar).not.toHaveBeenCalled();
      }
    );

    test('rechaza datos inválidos', async () => {
      validarDatosMedicamento.mockReturnValue('Datos inválidos.');

      await actualizarMedicamento({
        params: { id: '5' },
        body: {},
      }, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(medicamentosServicio.actualizar).not.toHaveBeenCalled();
    });

    test('delega el error en next', async () => {
      const error = new Error('Medicamento no encontrado.');
      medicamentosServicio.actualizar.mockRejectedValue(error);

      await actualizarMedicamento({
        params: { id: '5' },
        body: { nombre_comercial: 'Paracetamol' },
      }, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('cambiarEstado', () => {
    test('valida el cuerpo y cambia el estado', async () => {
      const body = { activo: false };
      medicamentosServicio.cambiarEstado.mockResolvedValue({ id_medicamento: 5 });

      await cambiarEstado({ params: { id: '5' }, body }, res, next);

      expect(validarCambioEstado).toHaveBeenCalledWith(body);
      expect(medicamentosServicio.cambiarEstado).toHaveBeenCalledWith('5', false);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Estado del medicamento actualizado.',
      });
    });

    test('rechaza un identificador inválido', async () => {
      await cambiarEstado({ params: { id: 'abc' }, body: { activo: true } }, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(validarCambioEstado).not.toHaveBeenCalled();
      expect(medicamentosServicio.cambiarEstado).not.toHaveBeenCalled();
    });

    test('rechaza un cuerpo inválido', async () => {
      validarCambioEstado.mockReturnValue('El estado es obligatorio.');

      await cambiarEstado({ params: { id: '5' }, body: {} }, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(medicamentosServicio.cambiarEstado).not.toHaveBeenCalled();
    });

    test('delega el error en next', async () => {
      const error = new Error('Medicamento no encontrado.');
      medicamentosServicio.cambiarEstado.mockRejectedValue(error);

      await cambiarEstado({ params: { id: '5' }, body: { activo: true } }, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('eliminarMedicamento', () => {
    test('elimina lógicamente el medicamento', async () => {
      medicamentosServicio.eliminarLogicamente.mockResolvedValue({ id_medicamento: 5 });

      await eliminarMedicamento({ params: { id: '5' } }, res, next);

      expect(medicamentosServicio.eliminarLogicamente).toHaveBeenCalledWith('5');
      expect(res.json).toHaveBeenCalledWith({
        message: 'Medicamento eliminado correctamente.',
      });
    });

    test('rechaza un identificador inválido', async () => {
      await eliminarMedicamento({ params: { id: 'abc' } }, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(medicamentosServicio.eliminarLogicamente).not.toHaveBeenCalled();
    });

    test('delega el error en next', async () => {
      const error = new Error('Medicamento no encontrado o ya eliminado.');
      medicamentosServicio.eliminarLogicamente.mockRejectedValue(error);

      await eliminarMedicamento({ params: { id: '5' } }, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('subirFoto', () => {
    test('sube la foto y devuelve su URL', async () => {
      const file = { buffer: Buffer.from('imagen') };
      fotoMedicamentoServicio.subir.mockResolvedValue('/uploads/medicamentos/foto.jpg');

      await subirFoto({ params: { id: '5' }, file }, res, next);

      expect(fotoMedicamentoServicio.subir).toHaveBeenCalledWith(5, file);
      expect(res.json).toHaveBeenCalledWith({
        foto_url: '/uploads/medicamentos/foto.jpg',
      });
    });

    test('rechaza un identificador inválido', async () => {
      await subirFoto({ params: { id: '0' }, file: {} }, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(fotoMedicamentoServicio.subir).not.toHaveBeenCalled();
    });

    test('delega el error en next', async () => {
      const error = new Error('El archivo no contiene una imagen válida.');
      fotoMedicamentoServicio.subir.mockRejectedValue(error);

      await subirFoto({ params: { id: '5' }, file: {} }, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('quitarFoto', () => {
    test('quita la foto del medicamento', async () => {
      fotoMedicamentoServicio.quitar.mockResolvedValue(undefined);

      await quitarFoto({ params: { id: '5' } }, res, next);

      expect(fotoMedicamentoServicio.quitar).toHaveBeenCalledWith(5);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Foto del medicamento eliminada correctamente.',
      });
    });

    test('rechaza un identificador inválido', async () => {
      await quitarFoto({ params: { id: 'abc' } }, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(fotoMedicamentoServicio.quitar).not.toHaveBeenCalled();
    });

    test('delega el error en next', async () => {
      const error = new Error('Medicamento no encontrado.');
      fotoMedicamentoServicio.quitar.mockRejectedValue(error);

      await quitarFoto({ params: { id: '5' } }, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
