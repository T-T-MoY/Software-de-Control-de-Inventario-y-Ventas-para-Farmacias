jest.mock('../data/repositories/medicines.repository', () => ({
  listar: jest.fn(),
  crear: jest.fn(),
  actualizar: jest.fn(),
  cambiarEstado: jest.fn(),
  eliminarLogicamente: jest.fn(),
}));

jest.mock('../data/repositories/categories.repository', () => ({
  listar: jest.fn(),
}));

jest.mock('../business/rules/medicines.rules', () => ({
  normalizarDatosMedicamento: jest.fn(),
}));

jest.mock('../config/parameters', () => ({
  stockSeguridad: 10,
  diasReposicion: 5,
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
    errorConflicto: jest.fn((mensaje) => new ErrorAplicacion(mensaje, {
      estado: 409,
      codigo: 'CONFLICTO',
    })),
    errorValidacion: jest.fn((mensaje) => new ErrorAplicacion(mensaje, {
      estado: 400,
      codigo: 'VALIDACION',
    })),
    errorNoEncontrado: jest.fn((mensaje) => new ErrorAplicacion(mensaje, {
      estado: 404,
      codigo: 'NO_ENCONTRADO',
    })),
  };
});

const medicamentosRepositorio = require('../data/repositories/medicines.repository');
const categoriasRepositorio = require('../data/repositories/categories.repository');
const { normalizarDatosMedicamento } = require('../business/rules/medicines.rules');
const {
  errorConflicto,
  errorValidacion,
  errorNoEncontrado,
} = require('../business/errors/app-error');
const {
  listar,
  listarCategorias,
  crear,
  actualizar,
  cambiarEstado,
  eliminarLogicamente,
} = require('../business/services/medicines.service');

describe('servicio de medicamentos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const medicamentoNormalizado = {
    codigo_barras: '7501000000011',
    nombre_comercial: 'Paracetamol',
    dci: 'Acetaminofén',
    concentracion: '500 mg',
    forma_farmaceutica: 'Tableta',
    precio_unitario: 2.5,
    tipo_venta: 'Libre',
    stock_seguridad: undefined,
    dias_reposicion: undefined,
    id_categoria: 1,
  };

  describe('listar', () => {
    test('envía los filtros al repositorio y devuelve su resultado', async () => {
      const medicamentos = [{ id_medicamento: 1 }];
      const filtros = { buscar: 'para', idCategoria: 2, estado: 'Activo' };
      medicamentosRepositorio.listar.mockResolvedValue(medicamentos);

      await expect(listar(filtros)).resolves.toBe(medicamentos);

      expect(medicamentosRepositorio.listar).toHaveBeenCalledWith(filtros);
    });

    test('acepta filtros vacíos o ausentes', async () => {
      medicamentosRepositorio.listar.mockResolvedValue([]);

      await expect(listar()).resolves.toEqual([]);

      expect(medicamentosRepositorio.listar).toHaveBeenCalledWith(undefined);
    });

    test('propaga el error del repositorio', async () => {
      const error = new Error('Error de base de datos');
      medicamentosRepositorio.listar.mockRejectedValue(error);

      await expect(listar({})).rejects.toBe(error);
    });
  });

  describe('listarCategorias', () => {
    test('devuelve las categorías del repositorio', async () => {
      const categorias = [{ id_categoria: 1, nombre: 'Analgésicos' }];
      categoriasRepositorio.listar.mockResolvedValue(categorias);

      await expect(listarCategorias()).resolves.toBe(categorias);

      expect(categoriasRepositorio.listar).toHaveBeenCalledWith();
    });

    test('propaga el error del repositorio', async () => {
      const error = new Error('Error de base de datos');
      categoriasRepositorio.listar.mockRejectedValue(error);

      await expect(listarCategorias()).rejects.toBe(error);
    });
  });

  describe('crear', () => {
    test('aplica los valores de configuración cuando faltan stock y días de reposición', async () => {
      const creado = { id_medicamento: 12 };
      normalizarDatosMedicamento.mockReturnValue({ ...medicamentoNormalizado });
      medicamentosRepositorio.crear.mockResolvedValue(creado);

      await expect(crear({ codigo_barras: '7501000000011' })).resolves.toBe(creado);

      expect(normalizarDatosMedicamento).toHaveBeenCalledWith({
        codigo_barras: '7501000000011',
      });
      expect(medicamentosRepositorio.crear).toHaveBeenCalledWith({
        ...medicamentoNormalizado,
        stock_seguridad: 10,
        dias_reposicion: 5,
      });
    });

    test('conserva stock y días de reposición cuando ya vienen informados', async () => {
      normalizarDatosMedicamento.mockReturnValue({
        ...medicamentoNormalizado,
        stock_seguridad: 0,
        dias_reposicion: 2,
      });
      medicamentosRepositorio.crear.mockResolvedValue({ id_medicamento: 13 });

      await crear({});

      expect(medicamentosRepositorio.crear).toHaveBeenCalledWith({
        ...medicamentoNormalizado,
        stock_seguridad: 0,
        dias_reposicion: 2,
      });
    });

    test.each([
      ['23505', 409, 'CONFLICTO', 'El código de barras ya está registrado.'],
      ['23503', 400, 'VALIDACION', 'La categoría seleccionada no existe.'],
      ['23514', 400, 'VALIDACION', 'Los datos del medicamento no cumplen las reglas del sistema.'],
      ['22001', 400, 'VALIDACION', 'Uno de los campos tiene un valor no válido.'],
      ['22P02', 400, 'VALIDACION', 'Uno de los campos tiene un valor no válido.'],
    ])('traduce el código PostgreSQL %s al crear', async (code, estado, codigo, mensaje) => {
      normalizarDatosMedicamento.mockReturnValue({ ...medicamentoNormalizado });
      medicamentosRepositorio.crear.mockRejectedValue({ code });

      await expect(crear({})).rejects.toMatchObject({ estado, codigo, message: mensaje });

      expect(medicamentosRepositorio.crear).toHaveBeenCalledTimes(1);
    });

    test('propaga errores no reconocidos al crear', async () => {
      const error = new Error('Error inesperado');
      normalizarDatosMedicamento.mockReturnValue({ ...medicamentoNormalizado });
      medicamentosRepositorio.crear.mockRejectedValue(error);

      await expect(crear({})).rejects.toBe(error);
    });

    test('propaga el error de normalización sin llamar al repositorio', async () => {
      const error = new Error('Datos inválidos');
      normalizarDatosMedicamento.mockImplementation(() => {
        throw error;
      });

      await expect(crear(null)).rejects.toBe(error);

      expect(medicamentosRepositorio.crear).not.toHaveBeenCalled();
    });
  });

  describe('actualizar', () => {
    test('actualiza el medicamento con los datos normalizados', async () => {
      const actualizado = { id_medicamento: 1, nombre_comercial: 'Paracetamol' };
      normalizarDatosMedicamento.mockReturnValue({
        ...medicamentoNormalizado,
        dias_reposicion: 7,
      });
      medicamentosRepositorio.actualizar.mockResolvedValue(actualizado);

      await expect(actualizar(1, { nombre_comercial: 'Paracetamol' }))
        .resolves.toBe(actualizado);

      expect(medicamentosRepositorio.actualizar).toHaveBeenCalledWith(1, {
        ...medicamentoNormalizado,
        dias_reposicion: 7,
      });
    });

    test.each([0, -1, 1.5, NaN, undefined, null])(
      'rechaza días de reposición inválidos (%p)',
      async (dias) => {
        normalizarDatosMedicamento.mockReturnValue({
          ...medicamentoNormalizado,
          dias_reposicion: dias,
        });

        await expect(actualizar(1, {})).rejects.toMatchObject({
          estado: 400,
          codigo: 'VALIDACION',
          message: 'Los días de reposición deben ser un número entero mayor o igual a 1.',
        });

        expect(errorValidacion).toHaveBeenCalledWith(
          'Los días de reposición deben ser un número entero mayor o igual a 1.'
        );
        expect(medicamentosRepositorio.actualizar).not.toHaveBeenCalled();
      }
    );

    test('rechaza un medicamento inexistente', async () => {
      normalizarDatosMedicamento.mockReturnValue({
        ...medicamentoNormalizado,
        dias_reposicion: 5,
      });
      medicamentosRepositorio.actualizar.mockResolvedValue(null);

      await expect(actualizar(99, {})).rejects.toMatchObject({
        estado: 404,
        codigo: 'NO_ENCONTRADO',
        message: 'Medicamento no encontrado.',
      });

      expect(errorNoEncontrado).toHaveBeenCalledWith('Medicamento no encontrado.');
    });

    test.each([
      ['23505', 409, 'CONFLICTO', 'El código de barras ya está registrado.'],
      ['23503', 400, 'VALIDACION', 'La categoría seleccionada no existe.'],
      ['23514', 400, 'VALIDACION', 'Los datos del medicamento no cumplen las reglas del sistema.'],
      ['22001', 400, 'VALIDACION', 'Uno de los campos tiene un valor no válido.'],
      ['22P02', 400, 'VALIDACION', 'Uno de los campos tiene un valor no válido.'],
    ])('traduce el código PostgreSQL %s al actualizar', async (code, estado, codigo, mensaje) => {
      normalizarDatosMedicamento.mockReturnValue({
        ...medicamentoNormalizado,
        dias_reposicion: 5,
      });
      medicamentosRepositorio.actualizar.mockRejectedValue({ code });

      await expect(actualizar(1, {})).rejects.toMatchObject({ estado, codigo, message: mensaje });
    });

    test('propaga errores no reconocidos al actualizar', async () => {
      const error = new Error('Error inesperado');
      normalizarDatosMedicamento.mockReturnValue({
        ...medicamentoNormalizado,
        dias_reposicion: 5,
      });
      medicamentosRepositorio.actualizar.mockRejectedValue(error);

      await expect(actualizar(1, {})).rejects.toBe(error);
    });

    test('propaga el error de normalización sin llamar al repositorio', async () => {
      const error = new Error('Datos inválidos');
      normalizarDatosMedicamento.mockImplementation(() => {
        throw error;
      });

      await expect(actualizar(1, null)).rejects.toBe(error);

      expect(medicamentosRepositorio.actualizar).not.toHaveBeenCalled();
    });
  });

  describe('cambiarEstado', () => {
    test('cambia el estado y devuelve el medicamento actualizado', async () => {
      const actualizado = { id_medicamento: 1, estado_medicamento: 'Inactivo' };
      medicamentosRepositorio.cambiarEstado.mockResolvedValue(actualizado);

      await expect(cambiarEstado(1, false)).resolves.toBe(actualizado);

      expect(medicamentosRepositorio.cambiarEstado).toHaveBeenCalledWith(1, false);
    });

    test('rechaza un medicamento inexistente', async () => {
      medicamentosRepositorio.cambiarEstado.mockResolvedValue(null);

      await expect(cambiarEstado(99, true)).rejects.toMatchObject({
        estado: 404,
        codigo: 'NO_ENCONTRADO',
        message: 'Medicamento no encontrado.',
      });
    });

    test('propaga el error del repositorio', async () => {
      const error = new Error('Error de base de datos');
      medicamentosRepositorio.cambiarEstado.mockRejectedValue(error);

      await expect(cambiarEstado(1, true)).rejects.toBe(error);
    });
  });

  describe('eliminarLogicamente', () => {
    test('elimina el medicamento y devuelve el registro', async () => {
      const eliminado = { id_medicamento: 1, estado_medicamento: 'Eliminado' };
      medicamentosRepositorio.eliminarLogicamente.mockResolvedValue(eliminado);

      await expect(eliminarLogicamente(1)).resolves.toBe(eliminado);

      expect(medicamentosRepositorio.eliminarLogicamente).toHaveBeenCalledWith(1);
    });

    test('rechaza un medicamento inexistente o ya eliminado', async () => {
      medicamentosRepositorio.eliminarLogicamente.mockResolvedValue(null);

      await expect(eliminarLogicamente(99)).rejects.toMatchObject({
        estado: 404,
        codigo: 'NO_ENCONTRADO',
        message: 'Medicamento no encontrado o ya eliminado.',
      });

      expect(errorNoEncontrado).toHaveBeenCalledWith(
        'Medicamento no encontrado o ya eliminado.'
      );
    });

    test('propaga el error del repositorio', async () => {
      const error = new Error('Error de base de datos');
      medicamentosRepositorio.eliminarLogicamente.mockRejectedValue(error);

      await expect(eliminarLogicamente(1)).rejects.toBe(error);
    });
  });
});
