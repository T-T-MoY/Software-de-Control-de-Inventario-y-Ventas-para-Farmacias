const {
  esIdValido,
  validarDatosVenta,
  validarDatosCliente,
} = require('../presentation/validators/sales.validator');

const ventaValida = () => ({
  id_cliente: 1,
  items: [
    { id_medicamento: 10, cantidad: 2 },
    { id_medicamento: 11, cantidad: 1 },
  ],
  descuento_porcentaje: '10.5',
  monto_recibido: '50.00',
  tipo_comprobante: 'Factura',
  formato_impresion: 'Impreso',
  receta: {
    paciente: 'Ana',
    medico: 'Dr. Pérez',
    matricula: 'MED-123',
  },
});

describe('validador de ventas', () => {
  describe('esIdValido', () => {
    test.each([1, '1', 2147483647])('acepta %p', (valor) => {
      expect(esIdValido(valor)).toBe(true);
    });

    test.each([0, -1, 1.5, 'abc', '', null, undefined, 2147483648])(
      'rechaza %p',
      (valor) => {
        expect(esIdValido(valor)).toBe(false);
      }
    );
  });

  describe('validarDatosVenta', () => {
    test('acepta una venta completa', () => {
      expect(validarDatosVenta(ventaValida())).toBeNull();
    });

    test('acepta una venta mínima y aplica los valores por defecto', () => {
      expect(validarDatosVenta({
        id_cliente: 1,
        items: [{ id_medicamento: 10, cantidad: 1 }],
        monto_recibido: 10,
      })).toBeNull();
    });

    test.each([null, undefined, 'texto', []])(
      'rechaza un cuerpo inválido (%p)',
      (body) => {
        expect(validarDatosVenta(body)).toBe('Los datos de la venta son obligatorios.');
      }
    );

    test.each([0, 'abc', null])('rechaza el cliente %p', (id_cliente) => {
      expect(validarDatosVenta({ ...ventaValida(), id_cliente }))
        .toBe('Selecciona un cliente válido.');
    });

    test.each([
      ['no es arreglo', 'items'],
      ['vacío', []],
      ['demasiados', new Array(101).fill({ id_medicamento: 1, cantidad: 1 })],
    ])('rechaza el detalle cuando %s', (_caso, items) => {
      expect(validarDatosVenta({ ...ventaValida(), items }))
        .toBe('Agrega entre 1 y 100 productos a la venta.');
    });

    test('rechaza un producto nulo o con medicamento inválido', () => {
      expect(validarDatosVenta({ ...ventaValida(), items: [null] }))
        .toBe('Selecciona medicamentos válidos.');
      expect(validarDatosVenta({
        ...ventaValida(),
        items: [{ id_medicamento: 0, cantidad: 1 }],
      })).toBe('Selecciona medicamentos válidos.');
    });

    test('rechaza medicamentos repetidos', () => {
      expect(validarDatosVenta({
        ...ventaValida(),
        items: [
          { id_medicamento: 10, cantidad: 1 },
          { id_medicamento: 10, cantidad: 2 },
        ],
      })).toBe('No repitas medicamentos en el detalle de la venta.');
    });

    test.each(['0', '-1', '1.5', 'abc', '2147483648', ''])(
      'rechaza la cantidad %p',
      (cantidad) => {
        expect(validarDatosVenta({
          ...ventaValida(),
          items: [{ id_medicamento: 10, cantidad }],
        })).toBe('Cada cantidad debe ser un entero positivo.');
      }
    );

    test.each(['abc', '1.234', '-1', '101', '100.5'])(
      'rechaza el descuento %p',
      (descuento_porcentaje) => {
        expect(validarDatosVenta({ ...ventaValida(), descuento_porcentaje }))
          .toBe('El descuento debe estar entre 0 y 100 por ciento.');
      }
    );

    test.each(['', 'abc', '1.234', '-1', '123456789.00'])(
      'rechaza el monto recibido %p',
      (monto_recibido) => {
        expect(validarDatosVenta({ ...ventaValida(), monto_recibido }))
          .toBe('El monto recibido debe tener hasta dos decimales.');
      }
    );

    test('rechaza un tipo de comprobante desconocido', () => {
      expect(validarDatosVenta({
        ...ventaValida(),
        tipo_comprobante: 'Boleta',
      })).toBe('Selecciona un tipo de comprobante válido.');
    });

    test('rechaza un formato de impresión desconocido', () => {
      expect(validarDatosVenta({
        ...ventaValida(),
        formato_impresion: 'Correo',
      })).toBe('Selecciona un formato de comprobante válido.');
    });

    test.each([null, 'texto', []])(
      'rechaza una receta inválida (%p)',
      (receta) => {
        expect(validarDatosVenta({ ...ventaValida(), receta }))
          .toBe('Los datos de la receta no son válidos.');
      }
    );

    test('acepta la ausencia de receta', () => {
      expect(validarDatosVenta({ ...ventaValida(), receta: undefined })).toBeNull();
    });
  });

  describe('validarDatosCliente', () => {
    const clienteValido = () => ({
      nombres: 'Ana',
      apellido_paterno: 'Pérez',
      apellido_materno: 'Gómez',
      ci_nit: '12345678',
    });

    test('acepta un cliente válido', () => {
      expect(validarDatosCliente(clienteValido())).toBeNull();
    });

    test('acepta una razón social sin apellidos', () => {
      expect(validarDatosCliente({
        nombres: 'Farmacia San Juan',
        apellido_paterno: '',
        apellido_materno: '',
        ci_nit: '12345678',
      })).toBeNull();
    });

    test.each([null, undefined, 'texto', []])(
      'rechaza un cuerpo inválido (%p)',
      (body) => {
        expect(validarDatosCliente(body))
          .toBe('Los datos del cliente son obligatorios.');
      }
    );

    test.each([
      ['', '12345678'],
      ['a'.repeat(81), '12345678'],
      ['Farmacia <script>', '12345678'],
    ])('rechaza los nombres %p', (nombres, ci_nit) => {
      expect(validarDatosCliente({
        nombres,
        apellido_paterno: '',
        apellido_materno: '',
        ci_nit,
      })).toBe('Ingresa los nombres del cliente (máximo 80 caracteres).');
    });

    test('rechaza un apellido paterno inválido', () => {
      expect(validarDatosCliente({
        ...clienteValido(),
        apellido_paterno: 'a'.repeat(61),
      })).toBe('El apellido paterno contiene caracteres no válidos o supera 60 caracteres.');
      expect(validarDatosCliente({
        ...clienteValido(),
        apellido_paterno: 'Pérez <x>',
      })).toBe('El apellido paterno contiene caracteres no válidos o supera 60 caracteres.');
    });

    test('rechaza un apellido materno inválido', () => {
      expect(validarDatosCliente({
        ...clienteValido(),
        apellido_materno: 'a'.repeat(61),
      })).toBe('El apellido materno contiene caracteres no válidos o supera 60 caracteres.');
      expect(validarDatosCliente({
        ...clienteValido(),
        apellido_materno: 'Gómez <x>',
      })).toBe('El apellido materno contiene caracteres no válidos o supera 60 caracteres.');
    });

    test.each(['12', '', '123456789012345678901'])(
      'rechaza el CI/NIT %p',
      (ci_nit) => {
        expect(validarDatosCliente({ ...clienteValido(), ci_nit }))
          .toBe('El CI/NIT debe tener entre 5 y 20 caracteres: solo números, letras y guion.');
      }
    );
  });
});
