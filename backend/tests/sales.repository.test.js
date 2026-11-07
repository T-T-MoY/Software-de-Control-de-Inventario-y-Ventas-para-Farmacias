jest.mock('../data/connection', () => ({
  query: jest.fn(),
  conTransaccion: jest.fn(),
}));

jest.mock('../config/parameters', () => ({
  margenAlertaDias: 30,
}));

const db = require('../data/connection');
const {
  listarCatalogo,
  buscarMedicamentos,
  crear,
} = require('../data/repositories/sales.repository');

const ventaBase = {
  id_cliente: 1,
  items: [
    {
      id_medicamento: 2,
      nombre_comercial: 'Ibuprofeno',
      cantidad: 1,
      precio_unitario: '5.00',
      subtotal: 5,
    },
    {
      id_medicamento: 1,
      nombre_comercial: 'Paracetamol',
      cantidad: 3,
      precio_unitario: '2.50',
      subtotal: 7.5,
    },
  ],
  descuento_porcentaje: 0,
  monto_recibido: 20,
  tipo_comprobante: 'Factura',
  formato_impresion: 'Impreso',
  subtotal: 12.5,
  descuento_monto: 0,
  total: 12.5,
  cambio: 7.5,
};

const clienteFila = {
  nombres: 'Ana',
  apellido_paterno: 'Pérez',
  apellido_materno: null,
};

const crearClienteTransaccion = () => {
  const cliente = {
    query: jest.fn(async (sql, params) => {
      if (sql.includes('FROM cliente')) {
        return { rows: [clienteFila] };
      }

      if (sql.includes('FROM medicamento') && sql.includes('FOR SHARE')) {
        const id = params[0];
        return {
          rows: [{
            id_medicamento: id,
            nombre_comercial: id === 1 ? 'Paracetamol' : 'Ibuprofeno',
            precio_unitario: id === 1 ? '2.50' : '5.00',
            estado_medicamento: 'Activo',
          }],
        };
      }

      if (sql.includes('FROM lote') && sql.includes('FOR UPDATE')) {
        if (params[0] === 1) {
          return {
            rows: [
              { id_lote: 10, cantidad_stock: 2, por_vencer: true },
              { id_lote: 11, cantidad_stock: 5, por_vencer: false },
            ],
          };
        }
        return {
          rows: [{ id_lote: 20, cantidad_stock: 4, por_vencer: false }],
        };
      }

      if (sql.includes('INSERT INTO venta')) {
        return {
          rows: [{ id_venta: 100, fecha_hora_venta: '2026-11-06T10:00:00' }],
        };
      }

      if (sql.includes('INSERT INTO comprobante_venta')) {
        return {
          rows: [{
            tipo_comprobante: 'Factura',
            num_serie: 'F-2026-000100',
            fecha_emision: '2026-11-06',
          }],
        };
      }

      return { rows: [], rowCount: 1 };
    }),
  };

  db.conTransaccion.mockImplementation(async (callback) => callback(cliente));
  return cliente;
};

describe('repositorio de ventas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listarCatalogo', () => {
    test('usa búsqueda vacía por defecto', async () => {
      const filas = [{ id_medicamento: 1 }];
      db.query.mockResolvedValue({ rows: filas });

      await expect(listarCatalogo()).resolves.toBe(filas);

      expect(db.query.mock.calls[0][1]).toEqual([30, '', '']);
    });

    test('recorta el término y arma el patrón ILIKE', async () => {
      db.query.mockResolvedValue({ rows: [] });

      await listarCatalogo('  para  ');

      expect(db.query.mock.calls[0][1]).toEqual([30, 'para', 'para']);
    });

    test('trata un valor nulo como búsqueda vacía', async () => {
      db.query.mockResolvedValue({ rows: [] });

      await listarCatalogo(null);

      expect(db.query.mock.calls[0][1]).toEqual([30, '', '']);
    });

    test('propaga el error de la base de datos', async () => {
      const error = new Error('Error de base de datos');
      db.query.mockRejectedValue(error);

      await expect(listarCatalogo('x')).rejects.toBe(error);
    });
  });

  describe('buscarMedicamentos', () => {
    test('consulta los medicamentos por sus identificadores', async () => {
      const filas = [{ id_medicamento: 1 }];
      db.query.mockResolvedValue({ rows: filas });

      await expect(buscarMedicamentos([1, 2])).resolves.toBe(filas);

      expect(db.query.mock.calls[0][1]).toEqual([[1, 2]]);
    });

    test('propaga el error de la base de datos', async () => {
      const error = new Error('Error de base de datos');
      db.query.mockRejectedValue(error);

      await expect(buscarMedicamentos([1])).rejects.toBe(error);
    });
  });

  describe('crear', () => {
    test('registra la venta completa y reparte el stock entre lotes', async () => {
      const cliente = crearClienteTransaccion();

      const resultado = await crear(ventaBase, 8);

      expect(resultado).toEqual({
        id_venta: 100,
        fecha_hora_venta: '2026-11-06T10:00:00',
        cliente: 'Ana Pérez',
        tipo_comprobante: 'Factura',
        num_serie: 'F-2026-000100',
        fecha_emision: '2026-11-06',
        items: [
          {
            id_medicamento: 2,
            descripcion: 'Ibuprofeno',
            cantidad: 1,
            precio_unitario: 5,
            subtotal: 5,
          },
          {
            id_medicamento: 1,
            descripcion: 'Paracetamol',
            cantidad: 3,
            precio_unitario: 2.5,
            subtotal: 7.5,
          },
        ],
        subtotal: 12.5,
        descuento_monto: 0,
        total: 12.5,
        monto_recibido: 20,
        cambio: 7.5,
        lotes_por_vencer: [10],
      });

      const llamadas = cliente.query.mock.calls;
      const actualizacionesLote = llamadas.filter(
        ([sql]) => sql.includes('UPDATE lote')
      );
      expect(actualizacionesLote.map(([, params]) => params)).toEqual([
        [2, 10],
        [1, 11],
        [1, 20],
      ]);

      const dispensas = llamadas.filter(
        ([sql]) => sql.includes('INSERT INTO dispensa')
      );
      expect(dispensas.map(([, params]) => params)).toEqual([
        [100, 10, 2, '2.50'],
        [100, 11, 1, '2.50'],
        [100, 20, 1, '5.00'],
      ]);

      const comprobante = llamadas.find(
        ([sql]) => sql.includes('INSERT INTO comprobante_venta')
      );
      expect(comprobante[1]).toEqual([100, 'Factura', 'F', 'Impreso']);

      const historial = llamadas.find(
        ([sql]) => sql.includes("'VENTA'")
      );
      expect(historial[1]).toEqual([8, 100]);

      const venta = llamadas.find(
        ([sql]) => sql.includes('INSERT INTO venta')
      );
      expect(venta[1]).toEqual([1, 8, 0, 20]);
    });

    test('usa el prefijo NV para una nota de venta', async () => {
      const cliente = crearClienteTransaccion();

      await crear({
        ...ventaBase,
        items: [ventaBase.items[1]],
        tipo_comprobante: 'Nota de venta',
      }, 8);

      const comprobante = cliente.query.mock.calls.find(
        ([sql]) => sql.includes('INSERT INTO comprobante_venta')
      );
      expect(comprobante[1][2]).toBe('NV');
    });

    test('no actualiza lotes posteriores cuando la cantidad ya se cubrió', async () => {
      const cliente = {
        query: jest.fn(async (sql, params) => {
          if (sql.includes('FROM cliente')) return { rows: [clienteFila] };
          if (sql.includes('FROM medicamento') && sql.includes('FOR SHARE')) {
            return {
              rows: [{
                id_medicamento: 1,
                precio_unitario: '2.50',
                estado_medicamento: 'Activo',
              }],
            };
          }
          if (sql.includes('FROM lote') && sql.includes('FOR UPDATE')) {
            return {
              rows: [
                { id_lote: 10, cantidad_stock: 10, por_vencer: false },
                { id_lote: 11, cantidad_stock: 10, por_vencer: false },
              ],
            };
          }
          if (sql.includes('INSERT INTO venta')) {
            return {
              rows: [{ id_venta: 100, fecha_hora_venta: '2026-11-06T10:00:00' }],
            };
          }
          if (sql.includes('INSERT INTO comprobante_venta')) {
            return {
              rows: [{
                tipo_comprobante: 'Nota de venta',
                num_serie: 'NV-2026-000100',
                fecha_emision: '2026-11-06',
              }],
            };
          }
          return { rows: [], rowCount: 1 };
        }),
      };
      db.conTransaccion.mockImplementation(async (callback) => callback(cliente));

      await crear({
        ...ventaBase,
        items: [ventaBase.items[1]],
        tipo_comprobante: 'Nota de venta',
      }, 8);

      const actualizaciones = cliente.query.mock.calls.filter(
        ([sql]) => sql.includes('UPDATE lote')
      );
      expect(actualizaciones.map(([, params]) => params)).toEqual([[3, 10]]);
    });

    test('rechaza cuando el cliente no existe', async () => {
      const cliente = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
      };
      db.conTransaccion.mockImplementation(async (callback) => callback(cliente));

      await expect(crear(ventaBase, 8)).rejects.toMatchObject({
        code: 'CLIENTE_NO_ENCONTRADO',
        message: 'El cliente no existe.',
      });
    });

    test.each([
      ['inexistente', []],
      ['inactivo', [{
        id_medicamento: 1,
        precio_unitario: '2.50',
        estado_medicamento: 'Inactivo',
      }]],
    ])('rechaza un medicamento %s', async (_caso, filasMedicamento) => {
      const cliente = {
        query: jest.fn(async (sql) => {
          if (sql.includes('FROM cliente')) return { rows: [clienteFila] };
          if (sql.includes('FROM medicamento')) {
            return { rows: filasMedicamento };
          }
          return { rows: [] };
        }),
      };
      db.conTransaccion.mockImplementation(async (callback) => callback(cliente));

      await expect(crear({
        ...ventaBase,
        items: [ventaBase.items[1]],
      }, 8)).rejects.toMatchObject({
        code: 'MEDICAMENTO_NO_DISPONIBLE',
        message: 'El medicamento ya no está disponible.',
      });
    });

    test('rechaza cuando el precio del catálogo cambió', async () => {
      const cliente = {
        query: jest.fn(async (sql) => {
          if (sql.includes('FROM cliente')) return { rows: [clienteFila] };
          if (sql.includes('FROM medicamento')) {
            return {
              rows: [{
                id_medicamento: 1,
                precio_unitario: '3.00',
                estado_medicamento: 'Activo',
              }],
            };
          }
          return { rows: [] };
        }),
      };
      db.conTransaccion.mockImplementation(async (callback) => callback(cliente));

      await expect(crear({
        ...ventaBase,
        items: [ventaBase.items[1]],
      }, 8)).rejects.toMatchObject({
        code: 'PRECIO_ACTUALIZADO',
        message: 'El precio del catálogo cambió; revisa el carrito.',
      });
    });

    test('rechaza cuando no hay stock suficiente', async () => {
      const cliente = {
        query: jest.fn(async (sql) => {
          if (sql.includes('FROM cliente')) return { rows: [clienteFila] };
          if (sql.includes('FROM medicamento')) {
            return {
              rows: [{
                id_medicamento: 1,
                precio_unitario: '2.50',
                estado_medicamento: 'Activo',
              }],
            };
          }
          if (sql.includes('FROM lote')) {
            return { rows: [{ id_lote: 10, cantidad_stock: 1, por_vencer: false }] };
          }
          return { rows: [] };
        }),
      };
      db.conTransaccion.mockImplementation(async (callback) => callback(cliente));

      await expect(crear({
        ...ventaBase,
        items: [ventaBase.items[1]],
      }, 8)).rejects.toMatchObject({
        code: 'STOCK_INSUFICIENTE',
        message: 'La cantidad solicitada supera el stock disponible.',
      });
    });

    test('propaga el error de la transacción', async () => {
      const error = new Error('Error de conexión');
      db.conTransaccion.mockRejectedValue(error);

      await expect(crear(ventaBase, 8)).rejects.toBe(error);
    });
  });
});
