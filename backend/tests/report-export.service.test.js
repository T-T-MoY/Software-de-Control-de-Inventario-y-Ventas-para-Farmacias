const ExcelJS = require('exceljs');
const {
  generarExcel,
  generarPdf,
  fechaLocalISO,
  formatearNumero,
  formatearFecha,
  formatearFechaHora,
} = require('../business/services/report-export.service');

const META = {
  farmacia: {
    nombre: 'Farmacia Central',
    nit: '123456789',
    direccion: 'Av. Principal 123',
    telefono: '22112233',
  },
  usuario: 'Administrador',
  generadoEn: '2026-11-06T15:30:45.000Z',
  zonaHoraria: 'America/La_Paz',
};

const COLUMNAS = [
  { clave: 'producto', titulo: 'Producto', tipo: 'texto', ancho: 24 },
  { clave: 'precio', titulo: 'Precio', tipo: 'moneda', ancho: 12 },
  { clave: 'demanda', titulo: 'Demanda', tipo: 'decimal', ancho: 12 },
  { clave: 'stock', titulo: 'Stock', tipo: 'entero', ancho: 10 },
  { clave: 'vencimiento', titulo: 'Vencimiento', tipo: 'fecha', ancho: 14 },
  { clave: 'actualizado', titulo: 'Actualizado', tipo: 'fechahora', ancho: 20 },
];

const REPORTE = {
  definicion: {
    clave: 'ventas',
    titulo: 'Reporte de ventas',
    descripcionRango: 'Periodo',
  },
  columnas: COLUMNAS,
  filas: [{
    producto: 'Medicamento de prueba',
    precio: 1234.5,
    demanda: 2.75,
    stock: 1200,
    vencimiento: '2026-12-31',
    actualizado: '2026-11-06T15:30:45.000Z',
  }],
  totales: { precio: 1234.5, demanda: 2.75, stock: 1200 },
  filtros: { fechaInicio: '2026-11-01', fechaFin: '2026-11-30' },
};

describe('helpers de formato del exportador', () => {
  test.each([
    [null, ''],
    ['', ''],
    ['2026-02-03', '03/02/2026'],
  ])('formatearFecha(%p)', (valor, esperado) => {
    expect(formatearFecha(valor)).toBe(esperado);
  });

  test('formatea fechas y horas según la zona horaria', () => {
    expect(fechaLocalISO('2026-11-06T02:30:00.000Z', 'America/La_Paz'))
      .toBe('2026-11-05');
    expect(formatearFechaHora('2026-11-06T02:30:00.000Z', 'America/La_Paz'))
      .toBe('05/11/2026 22:30');
    expect(formatearFechaHora(null, 'America/La_Paz')).toBe('');
  });

  test('devuelve vacío para valores no numéricos', () => {
    expect(formatearNumero('no-numérico', 2)).toBe('');
    expect(formatearNumero(Number.NaN, 2)).toBe('');
  });
});

describe('generarExcel', () => {
  test('genera un libro con metadatos, formatos, filas, totales y filtro', async () => {
    const buffer = await generarExcel(REPORTE, META);
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(buffer);

    const hoja = libro.getWorksheet('Reporte de ventas');
    expect(hoja.getCell('A1').value).toBe('Farmacia Central');
    expect(hoja.getCell('A2').value).toBe('Reporte de ventas');
    expect(hoja.getCell('A3').value).toBe('Periodo: del 01/11/2026 al 30/11/2026');
    expect(hoja.getCell('A4').value).toContain('Generado por Administrador');
    expect(hoja.getCell('B7').value).toBe(1234.5);
    expect(hoja.getCell('B7').numFmt).toBe('#,##0.00');
    expect(hoja.getCell('C7').value).toBe(2.75);
    expect(hoja.getCell('D7').value).toBe(1200);
    expect(hoja.getCell('E7').value).toEqual(new Date('2026-12-31T00:00:00.000Z'));
    expect(hoja.getCell('F7').value).toEqual(new Date('2026-11-06T11:30:45.000Z'));
    expect(hoja.getCell('A8').value).toBe('TOTAL');
    expect(hoja.getCell('B8').value).toBe(1234.5);
    expect(hoja.autoFilter).toBe('A6:F7');
  });

  test('usa nombres por defecto, omite fechas nulas y representa reportes sin rango', async () => {
    const reporte = {
      definicion: {
        clave: 'inventario',
        titulo: 'I'.repeat(35),
        sinRango: true,
      },
      columnas: [{ clave: 'nombre', titulo: 'Nombre', tipo: 'texto', ancho: 20 }],
      filas: [],
      totales: {},
      filtros: { fechaInicio: null, fechaFin: null },
    };
    const meta = {
      farmacia: { nombre: '' },
      usuario: 'Admin',
      generadoEn: '2026-11-06T15:30:45.000Z',
      zonaHoraria: 'America/La_Paz',
    };
    const buffer = await generarExcel(reporte, meta);
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(buffer);

    const hoja = libro.worksheets[0];
    expect(hoja.name).toBe('I'.repeat(31));
    expect(hoja.getCell('A1').value).toBe('Farmacia');
    expect(hoja.getCell('A3').value).toBe('Existencias vigentes al día de la emisión');
    expect(hoja.getCell('A7').value).toBe('Sin registros para los filtros seleccionados.');
    expect(hoja.autoFilter).toBeUndefined();
  });

  test.each([
    [{ fechaInicio: '2026-11-01' }, 'Periodo: desde el 01/11/2026'],
    [{ fechaFin: '2026-11-30' }, 'Periodo: hasta el 30/11/2026'],
    [{}, 'Periodo: todos'],
  ])('formatea filtros parciales %#', async (filtros, esperado) => {
    const buffer = await generarExcel({ ...REPORTE, filtros }, META);
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(buffer);
    expect(libro.worksheets[0].getCell('A3').value).toBe(esperado);
  });

  test('usa el margen por defecto para lotes próximos y convierte valores de texto y nulos', async () => {
    const reporte = {
      definicion: {
        clave: 'lotes-por-vencer',
        titulo: 'Lotes próximos',
      },
      columnas: [
        { clave: 'texto', titulo: 'Texto', tipo: 'texto', ancho: 15 },
        { clave: 'vacio', titulo: 'Vacío', tipo: 'texto', ancho: 10 },
      ],
      filas: [{ texto: 25, vacio: null }],
      totales: {},
      filtros: {},
    };
    const buffer = await generarExcel(reporte, META);
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(buffer);

    const hoja = libro.worksheets[0];
    expect(hoja.getCell('A3').value).toBe('Fecha: dentro del margen de alerta');
    expect(hoja.getCell('A7').value).toBe('25');
    expect(hoja.getCell('B7').value).toBeNull();
    expect(hoja.getCell('A8').value).toBe('TOTAL');
  });
});

describe('generarPdf', () => {
  test('genera un PDF con encabezado, datos de farmacia, filas y totales', async () => {
    const buffer = await generarPdf(REPORTE, META);

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buffer.length).toBeGreaterThan(500);
  });

  test('genera un PDF vacío sin datos opcionales de farmacia ni filtros', async () => {
    const reporte = {
      definicion: { clave: 'inventario', titulo: 'Inventario', sinRango: true },
      columnas: [{ clave: 'nombre', titulo: 'Nombre', tipo: 'texto', ancho: 20 }],
      filas: [],
      totales: {},
      filtros: {},
    };
    const meta = {
      farmacia: {},
      usuario: 'Administrador',
      generadoEn: '2026-11-06T15:30:45.000Z',
      zonaHoraria: 'America/La_Paz',
    };
    const buffer = await generarPdf(reporte, meta);

    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buffer.length).toBeGreaterThan(300);
  });

  test.each([
    [{ fechaInicio: '2026-11-01' }, 'periodo parcial desde'],
    [{ fechaFin: '2026-11-30' }, 'periodo parcial hasta'],
    [{}, 'periodo sin filtros'],
  ])('genera PDF para %s', async (filtros) => {
    const buffer = await generarPdf({ ...REPORTE, filtros }, META);
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });

  test('pagina tablas largas y añade la numeración de páginas', async () => {
    const filas = Array.from({ length: 60 }, (_, indice) => ({
      producto: `Producto ${indice + 1} ${'detalle '.repeat(18)}`,
      precio: indice + 1,
      demanda: 1.25,
      stock: 100,
      vencimiento: '2026-12-31',
      actualizado: '2026-11-06T15:30:45.000Z',
    }));
    const buffer = await generarPdf({ ...REPORTE, filas }, META);

    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buffer.length).toBeGreaterThan(5000);
  });
});