jest.mock('../data/repositories/alerts.repository', () => ({
  listarLotesPorVencer: jest.fn(),
  listarLotesVencidos: jest.fn(),
  contarLotesPorVencer: jest.fn(),
  contarLotesVencidos: jest.fn(),
  listarDatosReorden: jest.fn(),
}));

jest.mock('../business/rules/inventory.rules', () => ({
  evaluarReorden: jest.fn(),
}));

jest.mock('../config/parameters', () => ({
  margenAlertaDias: 30,
}));

const alertasRepositorio = require('../data/repositories/alerts.repository');
const { evaluarReorden } = require('../business/rules/inventory.rules');
const {
  listarLotesPorVencer,
  listarLotesVencidos,
  listarMedicamentosPorReponer,
  obtenerContadoresAlertas,
  obtenerResumenAlertas,
} = require('../business/services/inventory.service');

describe('servicio de inventario', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const filaLotePorVencer = {
    id_lote: 11,
    lote_numero: 'L-2026-01',
    id_medicamento: 7,
    medicamento: 'Paracetamol',
    codigo_barras: '7501000000011',
    id_proveedor: 3,
    proveedor: 'Distribuidora Andina',
    fecha_vencimiento: '2026-11-20',
    cantidad_stock: 25,
    dias_para_vencer: 14,
  };

  const filaLoteVencido = {
    id_lote: 12,
    lote_numero: 'L-2025-09',
    id_medicamento: 8,
    medicamento: 'Ibuprofeno',
    codigo_barras: '7501000000012',
    id_proveedor: 4,
    proveedor: 'Farmacéutica Sur',
    fecha_vencimiento: '2026-10-01',
    cantidad_stock: 5,
    dias_vencido: 36,
  };

  const filaReorden = {
    id_medicamento: 7,
    codigo_barras: '7501000000011',
    nombre_comercial: 'Paracetamol',
    concentracion: '500 mg',
    stock_seguridad: '10',
    dias_reposicion: '5',
    stock_actual: '12',
    unidades_vendidas: '40',
    demanda_diaria: '1.3333',
  };

  describe('listarLotesPorVencer', () => {
    test('devuelve los lotes del repositorio sin parámetros', async () => {
      alertasRepositorio.listarLotesPorVencer.mockResolvedValue([
        filaLotePorVencer,
      ]);

      await expect(listarLotesPorVencer()).resolves.toEqual([
        filaLotePorVencer,
      ]);

      expect(alertasRepositorio.listarLotesPorVencer).toHaveBeenCalledWith();
    });

    test('devuelve un arreglo vacío cuando no hay lotes por vencer', async () => {
      alertasRepositorio.listarLotesPorVencer.mockResolvedValue([]);

      await expect(listarLotesPorVencer()).resolves.toEqual([]);

      expect(alertasRepositorio.listarLotesPorVencer).toHaveBeenCalledTimes(1);
    });

    test('propaga los errores del repositorio', async () => {
      const error = new Error('Error de base de datos');
      alertasRepositorio.listarLotesPorVencer.mockRejectedValue(error);

      await expect(listarLotesPorVencer()).rejects.toBe(error);

      expect(alertasRepositorio.listarLotesPorVencer).toHaveBeenCalledWith();
    });
  });

  describe('listarLotesVencidos', () => {
    test('devuelve los lotes vencidos del repositorio sin parámetros', async () => {
      alertasRepositorio.listarLotesVencidos.mockResolvedValue([
        filaLoteVencido,
      ]);

      await expect(listarLotesVencidos()).resolves.toEqual([filaLoteVencido]);

      expect(alertasRepositorio.listarLotesVencidos).toHaveBeenCalledWith();
    });

    test('devuelve un arreglo vacío cuando no hay lotes vencidos', async () => {
      alertasRepositorio.listarLotesVencidos.mockResolvedValue([]);

      await expect(listarLotesVencidos()).resolves.toEqual([]);

      expect(alertasRepositorio.listarLotesVencidos).toHaveBeenCalledTimes(1);
    });

    test('propaga los errores del repositorio', async () => {
      const error = new Error('Error de base de datos');
      alertasRepositorio.listarLotesVencidos.mockRejectedValue(error);

      await expect(listarLotesVencidos()).rejects.toBe(error);

      expect(alertasRepositorio.listarLotesVencidos).toHaveBeenCalledWith();
    });
  });

  describe('listarMedicamentosPorReponer', () => {
    test('convierte los datos, calcula el reorden y devuelve solo los que requieren reposición', async () => {
      const filaSinReposicion = {
        ...filaReorden,
        id_medicamento: 9,
        codigo_barras: '7501000000013',
        nombre_comercial: 'Amoxicilina',
        concentracion: '250 mg',
        stock_seguridad: '5',
        dias_reposicion: '3',
        stock_actual: '80',
        unidades_vendidas: '10',
        demanda_diaria: '0.3333',
      };

      alertasRepositorio.listarDatosReorden.mockResolvedValue([
        filaReorden,
        filaSinReposicion,
      ]);
      evaluarReorden
        .mockReturnValueOnce({ puntoReorden: 17, alerta: true })
        .mockReturnValueOnce({ puntoReorden: 6, alerta: false });

      const resultado = await listarMedicamentosPorReponer();

      expect(resultado).toEqual([
        {
          id_medicamento: 7,
          codigo_barras: '7501000000011',
          nombre_comercial: 'Paracetamol',
          concentracion: '500 mg',
          stock_actual: 12,
          unidades_vendidas: 40,
          demanda_diaria: 1.3333,
          dias_reposicion: 5,
          stock_seguridad: 10,
          punto_reorden: 17,
          requiere_reposicion: true,
        },
      ]);

      expect(alertasRepositorio.listarDatosReorden).toHaveBeenCalledWith();
      expect(evaluarReorden).toHaveBeenNthCalledWith(1, {
        stockActual: 12,
        demandaDiaria: 1.3333,
        diasReposicion: 5,
        stockSeguridad: 10,
      });
      expect(evaluarReorden).toHaveBeenNthCalledWith(2, {
        stockActual: 80,
        demandaDiaria: 0.3333,
        diasReposicion: 3,
        stockSeguridad: 5,
      });
    });

    test('convierte valores nulos o vacíos en cero antes de evaluar el reorden', async () => {
      alertasRepositorio.listarDatosReorden.mockResolvedValue([
        {
          id_medicamento: 15,
          codigo_barras: null,
          nombre_comercial: 'Suero oral',
          concentracion: null,
          stock_seguridad: null,
          dias_reposicion: '',
          stock_actual: null,
          unidades_vendidas: null,
          demanda_diaria: '',
        },
      ]);
      evaluarReorden.mockReturnValue({ puntoReorden: 0, alerta: true });

      const resultado = await listarMedicamentosPorReponer();

      expect(resultado).toEqual([
        {
          id_medicamento: 15,
          codigo_barras: null,
          nombre_comercial: 'Suero oral',
          concentracion: null,
          stock_actual: 0,
          unidades_vendidas: 0,
          demanda_diaria: 0,
          dias_reposicion: 0,
          stock_seguridad: 0,
          punto_reorden: 0,
          requiere_reposicion: true,
        },
      ]);

      expect(evaluarReorden).toHaveBeenCalledWith({
        stockActual: 0,
        demandaDiaria: 0,
        diasReposicion: 0,
        stockSeguridad: 0,
      });
    });

    test('devuelve un arreglo vacío y no evalúa reorden sin medicamentos', async () => {
      alertasRepositorio.listarDatosReorden.mockResolvedValue([]);

      await expect(listarMedicamentosPorReponer()).resolves.toEqual([]);

      expect(alertasRepositorio.listarDatosReorden).toHaveBeenCalledWith();
      expect(evaluarReorden).not.toHaveBeenCalled();
    });

    test('propaga los errores del repositorio sin evaluar el reorden', async () => {
      const error = new Error('Error de base de datos');
      alertasRepositorio.listarDatosReorden.mockRejectedValue(error);

      await expect(listarMedicamentosPorReponer()).rejects.toBe(error);

      expect(alertasRepositorio.listarDatosReorden).toHaveBeenCalledWith();
      expect(evaluarReorden).not.toHaveBeenCalled();
    });

    test('propaga los errores de la regla de reorden', async () => {
      const error = new Error('La demanda diaria debe ser un número finito mayor o igual a 0.');
      alertasRepositorio.listarDatosReorden.mockResolvedValue([filaReorden]);
      evaluarReorden.mockImplementation(() => {
        throw error;
      });

      await expect(listarMedicamentosPorReponer()).rejects.toBe(error);

      expect(evaluarReorden).toHaveBeenCalledWith({
        stockActual: 12,
        demandaDiaria: 1.3333,
        diasReposicion: 5,
        stockSeguridad: 10,
      });
    });
  });

  describe('obtenerContadoresAlertas', () => {
    test('devuelve el resumen de contadores y el total general', async () => {
      alertasRepositorio.contarLotesPorVencer.mockResolvedValue(2);
      alertasRepositorio.contarLotesVencidos.mockResolvedValue(3);
      alertasRepositorio.listarDatosReorden.mockResolvedValue([
        filaReorden,
        { ...filaReorden, id_medicamento: 9 },
      ]);
      evaluarReorden
        .mockReturnValueOnce({ puntoReorden: 17, alerta: true })
        .mockReturnValueOnce({ puntoReorden: 17, alerta: true });

      await expect(obtenerContadoresAlertas()).resolves.toEqual({
        margen_alerta_dias: 30,
        resumen: {
          total_lotes_por_vencer: 2,
          total_lotes_vencidos: 3,
          total_medicamentos_por_reponer: 2,
        },
        total: 7,
      });

      expect(alertasRepositorio.contarLotesPorVencer).toHaveBeenCalledWith();
      expect(alertasRepositorio.contarLotesVencidos).toHaveBeenCalledWith();
      expect(alertasRepositorio.listarDatosReorden).toHaveBeenCalledWith();
    });

    test('devuelve contadores en cero cuando no hay alertas', async () => {
      alertasRepositorio.contarLotesPorVencer.mockResolvedValue(0);
      alertasRepositorio.contarLotesVencidos.mockResolvedValue(0);
      alertasRepositorio.listarDatosReorden.mockResolvedValue([]);

      await expect(obtenerContadoresAlertas()).resolves.toEqual({
        margen_alerta_dias: 30,
        resumen: {
          total_lotes_por_vencer: 0,
          total_lotes_vencidos: 0,
          total_medicamentos_por_reponer: 0,
        },
        total: 0,
      });

      expect(evaluarReorden).not.toHaveBeenCalled();
    });

    test('propaga el error de conteo de lotes por vencer', async () => {
      const error = new Error('Error de base de datos');
      alertasRepositorio.contarLotesPorVencer.mockRejectedValue(error);
      alertasRepositorio.contarLotesVencidos.mockResolvedValue(0);
      alertasRepositorio.listarDatosReorden.mockResolvedValue([]);

      await expect(obtenerContadoresAlertas()).rejects.toBe(error);

      expect(alertasRepositorio.contarLotesPorVencer).toHaveBeenCalledWith();
    });

    test('propaga el error al calcular los medicamentos por reponer', async () => {
      const error = new Error('Error al consultar el reorden');
      alertasRepositorio.contarLotesPorVencer.mockResolvedValue(1);
      alertasRepositorio.contarLotesVencidos.mockResolvedValue(1);
      alertasRepositorio.listarDatosReorden.mockRejectedValue(error);

      await expect(obtenerContadoresAlertas()).rejects.toBe(error);

      expect(alertasRepositorio.listarDatosReorden).toHaveBeenCalledWith();
    });
  });

  describe('obtenerResumenAlertas', () => {
    test('devuelve las listas completas y sus totales', async () => {
      alertasRepositorio.listarLotesPorVencer.mockResolvedValue([
        filaLotePorVencer,
      ]);
      alertasRepositorio.listarLotesVencidos.mockResolvedValue([filaLoteVencido]);
      alertasRepositorio.listarDatosReorden.mockResolvedValue([filaReorden]);
      evaluarReorden.mockReturnValue({ puntoReorden: 17, alerta: true });

      await expect(obtenerResumenAlertas()).resolves.toEqual({
        margen_alerta_dias: 30,
        resumen: {
          total_lotes_por_vencer: 1,
          total_lotes_vencidos: 1,
          total_medicamentos_por_reponer: 1,
        },
        lotes_por_vencer: [filaLotePorVencer],
        lotes_vencidos: [filaLoteVencido],
        medicamentos_por_reponer: [
          {
            id_medicamento: 7,
            codigo_barras: '7501000000011',
            nombre_comercial: 'Paracetamol',
            concentracion: '500 mg',
            stock_actual: 12,
            unidades_vendidas: 40,
            demanda_diaria: 1.3333,
            dias_reposicion: 5,
            stock_seguridad: 10,
            punto_reorden: 17,
            requiere_reposicion: true,
          },
        ],
      });

      expect(alertasRepositorio.listarLotesPorVencer).toHaveBeenCalledWith();
      expect(alertasRepositorio.listarLotesVencidos).toHaveBeenCalledWith();
      expect(alertasRepositorio.listarDatosReorden).toHaveBeenCalledWith();
    });

    test('devuelve listas vacías y totales en cero cuando no hay alertas', async () => {
      alertasRepositorio.listarLotesPorVencer.mockResolvedValue([]);
      alertasRepositorio.listarLotesVencidos.mockResolvedValue([]);
      alertasRepositorio.listarDatosReorden.mockResolvedValue([]);

      await expect(obtenerResumenAlertas()).resolves.toEqual({
        margen_alerta_dias: 30,
        resumen: {
          total_lotes_por_vencer: 0,
          total_lotes_vencidos: 0,
          total_medicamentos_por_reponer: 0,
        },
        lotes_por_vencer: [],
        lotes_vencidos: [],
        medicamentos_por_reponer: [],
      });

      expect(evaluarReorden).not.toHaveBeenCalled();
    });

    test('propaga el error al listar los lotes por vencer', async () => {
      const error = new Error('Error de base de datos');
      alertasRepositorio.listarLotesPorVencer.mockRejectedValue(error);
      alertasRepositorio.listarLotesVencidos.mockResolvedValue([]);
      alertasRepositorio.listarDatosReorden.mockResolvedValue([]);

      await expect(obtenerResumenAlertas()).rejects.toBe(error);

      expect(alertasRepositorio.listarLotesPorVencer).toHaveBeenCalledWith();
    });

    test('propaga el error al listar los lotes vencidos', async () => {
      const error = new Error('Error de base de datos');
      alertasRepositorio.listarLotesPorVencer.mockResolvedValue([]);
      alertasRepositorio.listarLotesVencidos.mockRejectedValue(error);
      alertasRepositorio.listarDatosReorden.mockResolvedValue([]);

      await expect(obtenerResumenAlertas()).rejects.toBe(error);

      expect(alertasRepositorio.listarLotesVencidos).toHaveBeenCalledWith();
    });
  });
});
