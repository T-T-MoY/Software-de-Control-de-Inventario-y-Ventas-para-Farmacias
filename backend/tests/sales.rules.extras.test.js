const {
  esEnteroPositivo,
  normalizarDatosVenta,
  calcularTotales,
  validarReceta,
} = require('../business/rules/sales.rules');

const ventaValida = () => ({
  id_cliente: '1',
  items: [
    { id_medicamento: '10', cantidad: '2' },
    { id_medicamento: 11, cantidad: 1 },
  ],
  descuento_porcentaje: '10.50',
  monto_recibido: '50.00',
  tipo_comprobante: 'Factura',
  formato_impresion: 'Impreso',
  receta: {
    paciente: ' Ana ',
    medico: ' Dr. Pérez ',
    matricula: ' MED-123 ',
  },
});

const capturar = (fn) => {
  try {
    fn();
    return null;
  } catch (error) {
    return error;
  }
};

describe('reglas de ventas: ramas adicionales', () => {
  describe('esEnteroPositivo', () => {
    test.each([1, '1', 2147483647])('acepta %p', (valor) => {
      expect(esEnteroPositivo(valor)).toBe(true);
    });

    test.each([0, -1, 1.5, 'abc', '', null, undefined, 2147483648])(
      'rechaza %p',
      (valor) => {
        expect(esEnteroPositivo(valor)).toBe(false);
      }
    );
  });

  describe('normalizarDatosVenta', () => {
    test('normaliza textos, números y la receta', () => {
      expect(normalizarDatosVenta(ventaValida())).toEqual({
        id_cliente: 1,
        items: [
          { id_medicamento: 10, cantidad: 2 },
          { id_medicamento: 11, cantidad: 1 },
        ],
        descuento_porcentaje: 10.5,
        monto_recibido: 50,
        tipo_comprobante: 'Factura',
        formato_impresion: 'Impreso',
        receta: {
          paciente: 'Ana',
          medico: 'Dr. Pérez',
          matricula: 'MED-123',
        },
      });
    });

    test('aplica los valores por defecto y descarta una receta no válida', () => {
      expect(normalizarDatosVenta({
        id_cliente: 1,
        items: [{ id_medicamento: 10, cantidad: 1 }],
        monto_recibido: 10,
        receta: 'texto',
      })).toEqual({
        id_cliente: 1,
        items: [{ id_medicamento: 10, cantidad: 1 }],
        descuento_porcentaje: 0,
        monto_recibido: 10,
        tipo_comprobante: 'Nota de venta',
        formato_impresion: 'Pantalla',
        receta: null,
      });
    });

    test('convierte una receta con campos ausentes en cadenas vacías', () => {
      expect(normalizarDatosVenta({
        id_cliente: 1,
        items: [{ id_medicamento: 10, cantidad: 1 }],
        monto_recibido: 10,
        receta: {},
      }).receta).toEqual({
        paciente: '',
        medico: '',
        matricula: '',
      });
    });

    test.each([null, undefined, 'texto', []])(
      'rechaza un cuerpo inválido (%p)',
      (datos) => {
        expect(capturar(() => normalizarDatosVenta(datos))).toMatchObject({
          message: 'Los datos de la venta son obligatorios.',
        });
      }
    );

    test.each([0, 'abc', null, undefined, 2147483648])(
      'rechaza el cliente %p',
      (id_cliente) => {
        expect(capturar(() => normalizarDatosVenta({
          ...ventaValida(),
          id_cliente,
        }))).toMatchObject({
          message: 'Selecciona un cliente válido.',
        });
      }
    );

    test.each([
      ['no es arreglo', 'items'],
      ['vacío', []],
      ['demasiados', new Array(101).fill({ id_medicamento: 1, cantidad: 1 })],
    ])('rechaza el detalle cuando %s', (_caso, items) => {
      expect(capturar(() => normalizarDatosVenta({
        ...ventaValida(),
        items,
      }))).toMatchObject({
        message: 'Agrega entre 1 y 100 productos a la venta.',
      });
    });

    test.each([null, 'texto', 5, []])(
      'rechaza un producto inválido (%p)',
      (item) => {
        expect(capturar(() => normalizarDatosVenta({
          ...ventaValida(),
          items: [item],
        }))).toMatchObject({
          message: 'Uno de los productos de la venta no es válido.',
        });
      }
    );

    test.each([0, 'abc', null, 2147483648])(
      'rechaza el medicamento %p',
      (id_medicamento) => {
        expect(capturar(() => normalizarDatosVenta({
          ...ventaValida(),
          items: [{ id_medicamento, cantidad: 1 }],
        }))).toMatchObject({
          message: 'Selecciona un medicamento válido.',
        });
      }
    );

    test.each([0, -1, '1.5', 'abc', null])(
      'rechaza la cantidad %p',
      (cantidad) => {
        expect(capturar(() => normalizarDatosVenta({
          ...ventaValida(),
          items: [{ id_medicamento: 10, cantidad }],
        }))).toMatchObject({
          message: 'Cada cantidad debe ser un entero mayor que cero.',
        });
      }
    );

    test('rechaza medicamentos repetidos', () => {
      expect(capturar(() => normalizarDatosVenta({
        ...ventaValida(),
        items: [
          { id_medicamento: 10, cantidad: 1 },
          { id_medicamento: '10', cantidad: 2 },
        ],
      }))).toMatchObject({
        message: 'No repitas medicamentos en el detalle de la venta.',
      });
    });

    test.each(['abc', '1.234', '-1', '1000', ''])(
      'rechaza el formato del descuento %p',
      (descuento_porcentaje) => {
        expect(capturar(() => normalizarDatosVenta({
          ...ventaValida(),
          descuento_porcentaje,
        }))).toMatchObject({
          message: 'El descuento debe ser un porcentaje con hasta dos decimales.',
        });
      }
    );

    test('rechaza un descuento mayor a 100', () => {
      expect(capturar(() => normalizarDatosVenta({
        ...ventaValida(),
        descuento_porcentaje: '100.01',
      }))).toMatchObject({
        message: 'El descuento debe estar entre 0 y 100 por ciento.',
      });
    });

    test.each(['', 'abc', '1.234', '-1', '123456789.00'])(
      'rechaza el monto recibido %p',
      (monto_recibido) => {
        expect(capturar(() => normalizarDatosVenta({
          ...ventaValida(),
          monto_recibido,
        }))).toMatchObject({
          message: 'El monto recibido debe tener hasta dos decimales.',
        });
      }
    );

    test('rechaza tipos de comprobante y formatos desconocidos', () => {
      expect(capturar(() => normalizarDatosVenta({
        ...ventaValida(),
        tipo_comprobante: 'Boleta',
      }))).toMatchObject({
        message: 'Selecciona un tipo de comprobante válido.',
      });

      expect(capturar(() => normalizarDatosVenta({
        ...ventaValida(),
        formato_impresion: 'Correo',
      }))).toMatchObject({
        message: 'Selecciona un formato de comprobante válido.',
      });
    });
  });

  describe('calcularTotales', () => {
    test('rechaza importes negativos o no numéricos', () => {
      expect(capturar(() => calcularTotales({
        items: [{ precio_unitario: '-1', cantidad: 1 }],
        descuentoPorcentaje: 0,
        montoRecibido: 0,
      }))).toMatchObject({
        message: 'Uno de los importes de la venta no es válido.',
      });

      expect(capturar(() => calcularTotales({
        items: [{ precio_unitario: 'abc', cantidad: 1 }],
        descuentoPorcentaje: 0,
        montoRecibido: 0,
      }))).toMatchObject({
        message: 'Uno de los importes de la venta no es válido.',
      });
    });

    test('rechaza un monto recibido insuficiente', () => {
      expect(capturar(() => calcularTotales({
        items: [{ precio_unitario: '10.00', cantidad: 1 }],
        descuentoPorcentaje: 0,
        montoRecibido: '9.99',
      }))).toMatchObject({
        message: 'El monto recibido no cubre el total de la venta.',
      });
    });

    test('rechaza importes que superan el límite permitido', () => {
      expect(capturar(() => calcularTotales({
        items: [{ precio_unitario: '100000000.00', cantidad: 1 }],
        descuentoPorcentaje: 0,
        montoRecibido: '100000000.00',
      }))).toMatchObject({
        message: 'El subtotal, total o monto recibido supera el límite permitido.',
      });
    });

    test('calcula el redondeo del descuento al centavo', () => {
      expect(calcularTotales({
        items: [{ precio_unitario: '10.00', cantidad: 1 }],
        descuentoPorcentaje: '33.33',
        montoRecibido: 10,
      })).toEqual({
        subtotal: 10,
        descuento_monto: 3.33,
        total: 6.67,
        cambio: 3.33,
      });
    });
  });

  describe('validarReceta', () => {
    test.each([
      [null],
      [{}],
      [{ paciente: 'Ana' }],
      [{ paciente: 'Ana', medico: 'Dr. Pérez' }],
      [{ paciente: '', medico: 'Dr. Pérez', matricula: 'MED-1' }],
      [{ paciente: 'Ana', medico: '', matricula: 'MED-1' }],
      [{ paciente: 'Ana', medico: 'Dr. Pérez', matricula: '' }],
    ])('rechaza una receta incompleta (%p)', (receta) => {
      expect(capturar(() => validarReceta(receta))).toMatchObject({
        message: 'Para vender medicamentos con receta, ingresa el nombre del paciente, del médico y su matrícula.',
      });
    });

    test('rechaza datos que superan la longitud permitida', () => {
      expect(capturar(() => validarReceta({
        paciente: 'a'.repeat(161),
        medico: 'Dr. Pérez',
        matricula: 'MED-1',
      }))).toMatchObject({
        message: 'Los datos de la receta superan la longitud permitida.',
      });

      expect(capturar(() => validarReceta({
        paciente: 'Ana',
        medico: 'a'.repeat(161),
        matricula: 'MED-1',
      }))).toMatchObject({
        message: 'Los datos de la receta superan la longitud permitida.',
      });

      expect(capturar(() => validarReceta({
        paciente: 'Ana',
        medico: 'Dr. Pérez',
        matricula: 'M'.repeat(41),
      }))).toMatchObject({
        message: 'Los datos de la receta superan la longitud permitida.',
      });
    });

    test('acepta los límites exactos', () => {
      expect(capturar(() => validarReceta({
        paciente: 'a'.repeat(160),
        medico: 'b'.repeat(160),
        matricula: 'c'.repeat(40),
      }))).toBeNull();
    });
  });
});
