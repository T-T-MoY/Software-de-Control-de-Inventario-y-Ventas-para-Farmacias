jest.mock('../business/services/reports.service', () => ({
  obtenerReporte: jest.fn(),
  exportarReporte: jest.fn(),
}));

const reportesServicio = require('../business/services/reports.service');
const {
  obtenerReporte,
  exportarReporte,
} = require('../presentation/controllers/reports.controller');

const crearRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

describe('controlador de reportes', () => {
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    res = crearRes();
    next = jest.fn();
  });

  describe('obtenerReporte', () => {
    test('delega el tipo y los filtros en el servicio', async () => {
      const reporte = { tipo: 'ventas', filas: [] };
      const query = { fechaInicio: '2026-01-01', fechaFin: '2026-01-31' };
      reportesServicio.obtenerReporte.mockResolvedValue(reporte);

      await obtenerReporte({ params: { tipo: 'ventas' }, query }, res, next);

      expect(reportesServicio.obtenerReporte).toHaveBeenCalledWith('ventas', query);
      expect(res.json).toHaveBeenCalledWith(reporte);
      expect(next).not.toHaveBeenCalled();
    });

    test('delega el error en next', async () => {
      const error = new Error('El reporte solicitado no existe.');
      reportesServicio.obtenerReporte.mockRejectedValue(error);

      await obtenerReporte({ params: { tipo: 'otro' }, query: {} }, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('exportarReporte', () => {
    test('envía el archivo con las cabeceras de descarga', async () => {
      const buffer = Buffer.from('contenido');
      const archivo = {
        buffer,
        contentType: 'application/pdf',
        nombreArchivo: 'reporte-ventas.pdf',
      };
      const query = { formato: 'pdf', fechaInicio: '2026-01-01' };
      reportesServicio.exportarReporte.mockResolvedValue(archivo);

      await exportarReporte({
        params: { tipo: 'ventas' },
        query,
        sessionUser: { id_usuario: 8 },
      }, res, next);

      expect(reportesServicio.exportarReporte)
        .toHaveBeenCalledWith('ventas', 'pdf', query, 8);
      expect(res.set).toHaveBeenCalledWith({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="reporte-ventas.pdf"',
        'Content-Length': buffer.length,
        'Cache-Control': 'no-store',
      });
      expect(res.send).toHaveBeenCalledWith(buffer);
      expect(next).not.toHaveBeenCalled();
    });

    test('usa una cadena vacía cuando el formato no es textual', async () => {
      const archivo = {
        buffer: Buffer.from('x'),
        contentType: 'text/csv',
        nombreArchivo: 'reporte.csv',
      };
      reportesServicio.exportarReporte.mockResolvedValue(archivo);

      await exportarReporte({
        params: { tipo: 'ventas' },
        query: { formato: 123 },
        sessionUser: { id_usuario: 8 },
      }, res, next);

      expect(reportesServicio.exportarReporte)
        .toHaveBeenCalledWith('ventas', '', { formato: 123 }, 8);
    });

    test('propaga el error del servicio sin enviar el archivo', async () => {
      const error = new Error('El formato de exportación debe ser: pdf o excel.');
      reportesServicio.exportarReporte.mockRejectedValue(error);

      await exportarReporte({
        params: { tipo: 'ventas' },
        query: { formato: 'csv' },
        sessionUser: { id_usuario: 8 },
      }, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.set).not.toHaveBeenCalled();
      expect(res.send).not.toHaveBeenCalled();
    });
  });
});
