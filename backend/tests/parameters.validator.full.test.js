const {
  validarDatosParametros,
  normalizarDatosParametros,
} = require('../presentation/validators/parameters.validator');

const parametrosValidos = () => ({
  margenAlertaDias: 30,
  stockSeguridad: 10,
  diasReposicion: 5,
  ventanaDemandaDias: 30,
  farmacia: {
    nombre: 'Farmacia Central',
    nit: '1234567890',
    direccion: 'Av. Principal #123, La Paz',
    telefono: '22233344',
  },
});

describe('validador de parámetros', () => {
  describe('validarDatosParametros', () => {
    test.each([null, undefined, 'texto', []])(
      'rechaza un cuerpo inválido (%p)',
      (body) => {
        expect(validarDatosParametros(body)).toBe('Los parámetros son obligatorios.');
      }
    );

    test.each([-1, 366, 1.5, 'abc'])(
      'rechaza el margen %p',
      (margenAlertaDias) => {
        expect(validarDatosParametros({ ...parametrosValidos(), margenAlertaDias }))
          .toBe('El margen de alerta debe ser un entero entre 0 y 365 días.');
      }
    );

    test.each([-1, 100001, 1.5, 'abc'])(
      'rechaza el stock de seguridad %p',
      (stockSeguridad) => {
        expect(validarDatosParametros({ ...parametrosValidos(), stockSeguridad }))
          .toBe('El stock de seguridad debe ser un entero entre 0 y 100000.');
      }
    );

    test.each([0, 366, 1.5, 'abc'])(
      'rechaza los días de reposición %p',
      (diasReposicion) => {
        expect(validarDatosParametros({ ...parametrosValidos(), diasReposicion }))
          .toBe('Los días de reposición deben ser un entero entre 1 y 365.');
      }
    );

    test.each([0, 366, 1.5, 'abc'])(
      'rechaza la ventana de demanda %p',
      (ventanaDemandaDias) => {
        expect(validarDatosParametros({ ...parametrosValidos(), ventanaDemandaDias }))
          .toBe('La ventana de demanda debe ser un entero entre 1 y 365 días.');
      }
    );

    test.each([undefined, null, 'texto', []])(
      'exige los datos de la farmacia (%p)',
      (farmacia) => {
        expect(validarDatosParametros({ ...parametrosValidos(), farmacia }))
          .toBe('Los datos de la farmacia son obligatorios.');
      }
    );

    test('exige el nombre de la farmacia', () => {
      const datos = parametrosValidos();
      datos.farmacia.nombre = ' ';
      expect(validarDatosParametros(datos))
        .toBe('El nombre de la farmacia es obligatorio.');
    });

    test('limita el nombre de la farmacia a 120 caracteres', () => {
      const datos = parametrosValidos();
      datos.farmacia.nombre = 'a'.repeat(121);
      expect(validarDatosParametros(datos))
        .toBe('El nombre de la farmacia no puede superar 120 caracteres.');
    });

    test('rechaza caracteres no permitidos en el nombre de la farmacia', () => {
      const datos = parametrosValidos();
      datos.farmacia.nombre = 'Farmacia <Central>';
      expect(validarDatosParametros(datos))
        .toBe('El nombre de la farmacia contiene caracteres no permitidos.');
    });

    test('limita el NIT a 30 caracteres', () => {
      const datos = parametrosValidos();
      datos.farmacia.nit = '1'.repeat(31);
      expect(validarDatosParametros(datos))
        .toBe('El NIT no puede superar 30 caracteres.');
    });

    test('limita la dirección a 150 caracteres', () => {
      const datos = parametrosValidos();
      datos.farmacia.direccion = 'a'.repeat(151);
      expect(validarDatosParametros(datos))
        .toBe('La dirección no puede superar 150 caracteres.');
    });

    test('limita el teléfono a 20 caracteres', () => {
      const datos = parametrosValidos();
      datos.farmacia.telefono = '1'.repeat(21);
      expect(validarDatosParametros(datos))
        .toBe('El teléfono no puede superar 20 caracteres.');
    });

    test('rechaza un teléfono con formato inválido', () => {
      const datos = parametrosValidos();
      datos.farmacia.telefono = 'abc';
      expect(validarDatosParametros(datos))
        .toBe('Ingresa un teléfono válido de hasta 20 caracteres.');
    });

    test('acepta parámetros completos dentro de rango', () => {
      expect(validarDatosParametros(parametrosValidos())).toBeNull();
    });

    test('acepta los límites inferior y superior', () => {
      expect(validarDatosParametros({
        ...parametrosValidos(),
        margenAlertaDias: 0,
        stockSeguridad: 100000,
        diasReposicion: 365,
        ventanaDemandaDias: 1,
      })).toBeNull();
    });

    test('acepta campos opcionales de la farmacia vacíos', () => {
      expect(validarDatosParametros({
        ...parametrosValidos(),
        farmacia: {
          nombre: 'Farmacia Central',
          nit: '',
          direccion: '',
          telefono: '',
        },
      })).toBeNull();
    });
  });

  describe('normalizarDatosParametros', () => {
    test('convierte números y recorta textos', () => {
      expect(normalizarDatosParametros({
        margenAlertaDias: '45',
        stockSeguridad: '12',
        diasReposicion: '6',
        ventanaDemandaDias: '31',
        farmacia: {
          nombre: '  Farmacia Central  ',
          nit: ' 1234567890 ',
          direccion: ' Av. Principal #123 ',
          telefono: ' 22233344 ',
        },
      })).toEqual({
        margenAlertaDias: 45,
        stockSeguridad: 12,
        diasReposicion: 6,
        ventanaDemandaDias: 31,
        farmacia: {
          nombre: 'Farmacia Central',
          nit: '1234567890',
          direccion: 'Av. Principal #123',
          telefono: '22233344',
        },
      });
    });

    test('usa cadena vacía cuando faltan datos de la farmacia', () => {
      expect(normalizarDatosParametros({
        margenAlertaDias: 1,
        stockSeguridad: 0,
        diasReposicion: 1,
        ventanaDemandaDias: 1,
        farmacia: {},
      })).toEqual({
        margenAlertaDias: 1,
        stockSeguridad: 0,
        diasReposicion: 1,
        ventanaDemandaDias: 1,
        farmacia: {
          nombre: '',
          nit: '',
          direccion: '',
          telefono: '',
        },
      });
    });
  });
});
