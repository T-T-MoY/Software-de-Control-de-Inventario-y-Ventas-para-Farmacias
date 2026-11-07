jest.mock('../data/repositories/reports.repository', () => ({
  listarVentas: jest.fn(),
  listarInventario: jest.fn(),
  listarLotesPorVencer: jest.fn(),
  listarLotesVencidos: jest.fn(),
}));

jest.mock('../data/repositories/history.repository', () => ({
  listarHistorial: jest.fn(),
  contarPorTipo: jest.fn(),
  listarUsuariosConOperaciones: jest.fn(),
}));

jest.mock('../business/services/profile.service', () => ({
  obtenerPerfil: jest.fn(),
}));

jest.mock('../business/services/report-export.service', () => ({
  generarPdf: jest.fn(),
  generarExcel: jest.fn(),
  fechaLocalISO: jest.fn(),
}));

jest.mock('../config/parameters', () => ({
  margenAlertaDias: 30,
  zonaHoraria: 'America/La_Paz',
  farmacia: {
    nombre: 'Farmacia Central',
    nit: '123456',
    direccion: 'Calle 1',
    telefono: '70000000',
  },
}));

jest.mock('../business/rules/reports.rules', () => ({
  TIPOS_OPERACION: ['VENTA', 'RECEPCION', 'BAJA'],
  ETIQUETAS_OPERACION: {
    VENTA: 'Venta',
    RECEPCION: 'Recepción de lote',
    BAJA: 'Baja de lote',
  },
  obtenerDefinicion: jest.fn(),
  normalizarFiltrosReporte: jest.fn(),
  normalizarFiltrosHistorial: jest.fn(),
  validarFormato: jest.fn(),
  calcularTotales: jest.fn(),
  describirOperacion: jest.fn(),
}));

const reportesRepositorio = require('../data/repositories/reports.repository');
const historialRepositorio = require('../data/repositories/history.repository');
const perfilServicio = require('../business/services/profile.service');
const exportador = require('../business/services/report-export.service');
const {
  obtenerDefinicion,
  normalizarFiltrosReporte,
  normalizarFiltrosHistorial,
  validarFormato,
  calcularTotales,
  describirOperacion,
  ETIQUETAS_OPERACION,
} = require('../business/rules/reports.rules');
const {
  obtenerReporte,
  exportarReporte,
  consultarHistorial,
  listarUsuariosHistorial,
} = require('../business/services/reports.service');

describe('servicio de reportes', () => {
  const definicionVentas = {
    clave: 'ventas',
    titulo: 'Reporte de ventas',
    requiereRango: true,
    columnas: [{ clave: 'total', titulo: 'Total', tipo: 'moneda' }],
    totales: ['total'],
  };
  const filtros = { fechaInicio: '2026-01-01', fechaFin: '2026-01-31' };

  beforeEach(() => {
    jest.clearAllMocks();
    obtenerDefinicion.mockReturnValue(definicionVentas);
    normalizarFiltrosReporte.mockReturnValue(filtros);
    calcularTotales.mockReturnValue({ total: 10 });
    validarFormato.mockReturnValue('pdf');
    exportador.fechaLocalISO.mockReturnValue('2026-05-10');
    perfilServicio.obtenerPerfil.mockResolvedValue({
      nombre_completo: 'Ana Pérez',
    });
  });

  describe('obtenerReporte', () => {
    test('genera el reporte de ventas con filtros, filas y totales', async () => {
      const filas = [{ total: 10 }];
      reportesRepositorio.listarVentas.mockResolvedValue(filas);

      const resultado = await obtenerReporte('ventas', { fechaInicio: '2026-01-01' });

      expect(resultado).toEqual({
        tipo: 'ventas',
        titulo: 'Reporte de ventas',
        filtros,
        columnas: definicionVentas.columnas,
        filas,
        totales: { total: 10 },
        total_filas: 1,
        generado_en: expect.any(String),
      });
      expect(resultado).not.toHaveProperty('definicion');
      expect(obtenerDefinicion).toHaveBeenCalledWith('ventas');
      expect(normalizarFiltrosReporte).toHaveBeenCalledWith(
        definicionVentas,
        { fechaInicio: '2026-01-01' }
      );
      expect(reportesRepositorio.listarVentas)
        .toHaveBeenCalledWith('2026-01-01', '2026-01-31', 'America/La_Paz');
      expect(calcularTotales).toHaveBeenCalledWith(definicionVentas, filas);
    });

    test('genera el reporte de inventario sin rango de fechas', async () => {
      obtenerDefinicion.mockReturnValue({
        clave: 'inventario',
        titulo: 'Reporte de inventario',
        columnas: [],
        totales: [],
      });
      reportesRepositorio.listarInventario.mockResolvedValue([]);

      const resultado = await obtenerReporte('inventario', {});

      expect(resultado.tipo).toBe('inventario');
      expect(resultado.total_filas).toBe(0);
      expect(reportesRepositorio.listarInventario).toHaveBeenCalledWith();
    });

    test('genera el reporte de lotes por vencer con el margen configurado', async () => {
      obtenerDefinicion.mockReturnValue({
        clave: 'lotes-por-vencer',
        titulo: 'Reporte de lotes por vencer',
        columnas: [],
        totales: [],
      });
      normalizarFiltrosReporte.mockReturnValue({
        fechaInicio: '2026-01-01',
        fechaFin: '2026-01-31',
      });
      reportesRepositorio.listarLotesPorVencer.mockResolvedValue([]);

      await obtenerReporte('lotes-por-vencer', {});

      expect(reportesRepositorio.listarLotesPorVencer)
        .toHaveBeenCalledWith('2026-01-01', '2026-01-31', 30);
    });

    test('genera el reporte de lotes vencidos por defecto', async () => {
      obtenerDefinicion.mockReturnValue({
        clave: 'lotes-vencidos',
        titulo: 'Reporte de lotes vencidos',
        columnas: [],
        totales: [],
      });
      normalizarFiltrosReporte.mockReturnValue({
        fechaInicio: null,
        fechaFin: null,
      });
      reportesRepositorio.listarLotesVencidos.mockResolvedValue([]);

      await obtenerReporte('lotes-vencidos', {});

      expect(reportesRepositorio.listarLotesVencidos)
        .toHaveBeenCalledWith(null, null);
    });

    test('propaga el error cuando el reporte no existe', async () => {
      const error = new Error('El reporte solicitado no existe.');
      obtenerDefinicion.mockImplementation(() => {
        throw error;
      });

      await expect(obtenerReporte('desconocido', {})).rejects.toBe(error);

      expect(normalizarFiltrosReporte).not.toHaveBeenCalled();
      expect(reportesRepositorio.listarVentas).not.toHaveBeenCalled();
    });

    test('propaga el error de validación de filtros', async () => {
      const error = new Error('Debe proporcionar ambas fechas.');
      normalizarFiltrosReporte.mockImplementation(() => {
        throw error;
      });

      await expect(obtenerReporte('ventas', {})).rejects.toBe(error);

      expect(reportesRepositorio.listarVentas).not.toHaveBeenCalled();
    });

    test('propaga el error del repositorio de reportes', async () => {
      const error = new Error('Error de base de datos');
      reportesRepositorio.listarVentas.mockRejectedValue(error);

      await expect(obtenerReporte('ventas', {})).rejects.toBe(error);

      expect(calcularTotales).not.toHaveBeenCalled();
    });
  });

  describe('exportarReporte', () => {
    test('genera un PDF con el nombre basado en el rango de fechas', async () => {
      const filas = [{ total: 10 }];
      const buffer = Buffer.from('pdf');
      reportesRepositorio.listarVentas.mockResolvedValue(filas);
      exportador.generarPdf.mockResolvedValue(buffer);

      const resultado = await exportarReporte('ventas', 'pdf', {}, 8);

      expect(resultado).toEqual({
        buffer,
        contentType: 'application/pdf',
        nombreArchivo: 'reporte-ventas-2026-01-01_a_2026-01-31.pdf',
      });

      expect(validarFormato).toHaveBeenCalledWith('pdf');
      expect(perfilServicio.obtenerPerfil).toHaveBeenCalledWith(8);
      expect(exportador.generarPdf).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: 'ventas',
          filtros,
          filas,
          totales: { total: 10 },
          total_filas: 1,
        }),
        {
          usuario: 'Ana Pérez',
          generadoEn: expect.any(String),
          zonaHoraria: 'America/La_Paz',
          farmacia: {
            nombre: 'Farmacia Central',
            nit: '123456',
            direccion: 'Calle 1',
            telefono: '70000000',
          },
        }
      );
      expect(exportador.generarExcel).not.toHaveBeenCalled();
    });

    test('genera un Excel con la fecha local cuando no hay rango', async () => {
      const buffer = Buffer.from('xlsx');
      normalizarFiltrosReporte.mockReturnValue({
        fechaInicio: null,
        fechaFin: null,
      });
      reportesRepositorio.listarVentas.mockResolvedValue([]);
      exportador.generarExcel.mockResolvedValue(buffer);

      const resultado = await exportarReporte('ventas', 'excel', {}, 8);

      expect(resultado).toEqual({
        buffer,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        nombreArchivo: 'reporte-ventas-2026-05-10.xlsx',
      });

      expect(validarFormato).toHaveBeenCalledWith('excel');
      expect(exportador.fechaLocalISO)
        .toHaveBeenCalledWith(expect.any(String), 'America/La_Paz');
      expect(exportador.generarExcel).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: 'ventas' }),
        expect.objectContaining({ usuario: 'Ana Pérez' })
      );
      expect(exportador.generarPdf).not.toHaveBeenCalled();
    });

    test('rechaza un formato inválido sin generar el reporte', async () => {
      const error = new Error('El formato de exportación debe ser: pdf o excel.');
      validarFormato.mockImplementation(() => {
        throw error;
      });

      await expect(exportarReporte('ventas', 'csv', {}, 8)).rejects.toBe(error);

      expect(obtenerDefinicion).not.toHaveBeenCalled();
      expect(perfilServicio.obtenerPerfil).not.toHaveBeenCalled();
      expect(exportador.generarPdf).not.toHaveBeenCalled();
      expect(exportador.generarExcel).not.toHaveBeenCalled();
    });

    test('propaga el error al obtener el perfil', async () => {
      const error = new Error('Usuario no encontrado.');
      reportesRepositorio.listarVentas.mockResolvedValue([]);
      perfilServicio.obtenerPerfil.mockRejectedValue(error);

      await expect(exportarReporte('ventas', 'pdf', {}, 8)).rejects.toBe(error);

      expect(exportador.generarPdf).not.toHaveBeenCalled();
    });

    test('propaga el error del exportador', async () => {
      const error = new Error('No se pudo generar el PDF');
      reportesRepositorio.listarVentas.mockResolvedValue([]);
      exportador.generarPdf.mockRejectedValue(error);

      await expect(exportarReporte('ventas', 'pdf', {}, 8)).rejects.toBe(error);
    });
  });

  describe('consultarHistorial', () => {
    const filtrosHistorial = {
      fechaInicio: null,
      fechaFin: null,
      tipo: null,
      idUsuario: null,
      pagina: 2,
      limite: 2,
    };

    beforeEach(() => {
      normalizarFiltrosHistorial.mockReturnValue(filtrosHistorial);
      describirOperacion.mockReturnValue('descripción de prueba');
    });

    test('devuelve la página, el resumen por tipo y los registros descritos', async () => {
      const filas = [
        { tipo_operacion: 'VENTA', referencia: 'V-1' },
        { tipo_operacion: 'BAJA', referencia: 'L-1' },
      ];
      historialRepositorio.listarHistorial.mockResolvedValue(filas);
      historialRepositorio.contarPorTipo.mockResolvedValue([
        { tipo_operacion: 'VENTA', cantidad: 3 },
        { tipo_operacion: 'RECEPCION', cantidad: 2 },
      ]);

      const resultado = await consultarHistorial({ pagina: '2', limite: '2' });

      expect(resultado).toEqual({
        filtros: filtrosHistorial,
        pagina: 2,
        limite: 2,
        total: 5,
        total_paginas: 3,
        resumen: {
          VENTA: 3,
          RECEPCION: 2,
          BAJA: 0,
        },
        registros: [
          {
            tipo_operacion: 'VENTA',
            referencia: 'V-1',
            etiqueta_operacion: ETIQUETAS_OPERACION.VENTA,
            descripcion: 'descripción de prueba',
          },
          {
            tipo_operacion: 'BAJA',
            referencia: 'L-1',
            etiqueta_operacion: ETIQUETAS_OPERACION.BAJA,
            descripcion: 'descripción de prueba',
          },
        ],
      });

      expect(normalizarFiltrosHistorial)
        .toHaveBeenCalledWith({ pagina: '2', limite: '2' });
      expect(historialRepositorio.listarHistorial)
        .toHaveBeenCalledWith(filtrosHistorial, 'America/La_Paz');
      expect(historialRepositorio.contarPorTipo)
        .toHaveBeenCalledWith(filtrosHistorial, 'America/La_Paz');
      expect(describirOperacion).toHaveBeenCalledTimes(2);
    });

    test('devuelve una página vacía con totales en cero', async () => {
      historialRepositorio.listarHistorial.mockResolvedValue([]);
      historialRepositorio.contarPorTipo.mockResolvedValue([]);

      const resultado = await consultarHistorial({});

      expect(resultado).toEqual({
        filtros: filtrosHistorial,
        pagina: 2,
        limite: 2,
        total: 0,
        total_paginas: 1,
        resumen: {
          VENTA: 0,
          RECEPCION: 0,
          BAJA: 0,
        },
        registros: [],
      });

      expect(describirOperacion).not.toHaveBeenCalled();
    });

    test('incluye en el total los tipos de operación desconocidos', async () => {
      historialRepositorio.listarHistorial.mockResolvedValue([]);
      historialRepositorio.contarPorTipo.mockResolvedValue([
        { tipo_operacion: 'AJUSTE', cantidad: 4 },
      ]);

      const resultado = await consultarHistorial({});

      expect(resultado.total).toBe(4);
      expect(resultado.resumen.AJUSTE).toBe(4);
    });

    test('propaga el error de validación de filtros', async () => {
      const error = new Error('El límite máximo es de 100 registros por página.');
      normalizarFiltrosHistorial.mockImplementation(() => {
        throw error;
      });

      await expect(consultarHistorial({})).rejects.toBe(error);

      expect(historialRepositorio.listarHistorial).not.toHaveBeenCalled();
      expect(historialRepositorio.contarPorTipo).not.toHaveBeenCalled();
    });

    test('propaga el error del repositorio de historial', async () => {
      const error = new Error('Error de base de datos');
      historialRepositorio.listarHistorial.mockRejectedValue(error);
      historialRepositorio.contarPorTipo.mockResolvedValue([]);

      await expect(consultarHistorial({})).rejects.toBe(error);
    });
  });

  describe('listarUsuariosHistorial', () => {
    test('devuelve los usuarios con operaciones', async () => {
      const usuarios = [{ id_usuario: 1, nombre_completo: 'Ana Pérez' }];
      historialRepositorio.listarUsuariosConOperaciones.mockResolvedValue(usuarios);

      await expect(listarUsuariosHistorial()).resolves.toBe(usuarios);

      expect(historialRepositorio.listarUsuariosConOperaciones)
        .toHaveBeenCalledWith();
    });

    test('propaga el error del repositorio', async () => {
      const error = new Error('Error de base de datos');
      historialRepositorio.listarUsuariosConOperaciones.mockRejectedValue(error);

      await expect(listarUsuariosHistorial()).rejects.toBe(error);
    });
  });
});
