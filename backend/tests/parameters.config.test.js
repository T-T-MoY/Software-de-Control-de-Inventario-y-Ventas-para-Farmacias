/**
 * Carga una copia aislada de config/parameters con las variables indicadas.
 * Restaura el entorno al terminar para no afectar a otras suites.
 */
const cargarParametros = (variables = {}) => {
  const anteriores = {};

  Object.keys(variables).forEach((clave) => {
    anteriores[clave] = process.env[clave];
    process.env[clave] = variables[clave];
  });

  let modulo;
  jest.isolateModules(() => {
    modulo = require('../config/parameters');
  });

  Object.keys(variables).forEach((clave) => {
    if (anteriores[clave] === undefined) {
      delete process.env[clave];
    } else {
      process.env[clave] = anteriores[clave];
    }
  });

  return modulo;
};

describe('parámetros generales', () => {
  test.each([
    ['MARGEN_ALERTA_DIAS', 'margenAlertaDias', 30],
    ['STOCK_SEGURIDAD', 'stockSeguridad', 0],
    ['DIAS_REPOSICION', 'diasReposicion', 5],
    ['VENTANA_DEMANDA_DIAS', 'ventanaDemandaDias', 30],
  ])(
    'usa el valor por defecto cuando %s no es un entero válido',
    (variable, propiedad, esperado) => {
      expect(cargarParametros({ [variable]: 'abc' })[propiedad])
        .toBe(esperado);
    }
  );

  test('usa el valor por defecto cuando el entero no es positivo', () => {
    const parametros = cargarParametros({
      DIAS_REPOSICION: '0',
      VENTANA_DEMANDA_DIAS: '-5',
    });

    expect(parametros.diasReposicion).toBe(5);
    expect(parametros.ventanaDemandaDias).toBe(30);
  });

  test('lee enteros válidos del entorno', () => {
    const parametros = cargarParametros({
      MARGEN_ALERTA_DIAS: '45',
      STOCK_SEGURIDAD: '12',
      DIAS_REPOSICION: '7',
      VENTANA_DEMANDA_DIAS: '90',
      ZONA_HORARIA: 'America/Lima',
    });

    expect(parametros.margenAlertaDias).toBe(45);
    expect(parametros.stockSeguridad).toBe(12);
    expect(parametros.diasReposicion).toBe(7);
    expect(parametros.ventanaDemandaDias).toBe(90);
    expect(parametros.zonaHoraria).toBe('America/Lima');
  });

  test('usa America/La_Paz cuando la zona horaria está vacía', () => {
    expect(cargarParametros({ ZONA_HORARIA: '' }).zonaHoraria)
      .toBe('America/La_Paz');
  });

  test('recorta los datos de la farmacia del entorno', () => {
    const parametros = cargarParametros({
      FARMACIA_NOMBRE: '  Farmacia Central  ',
      FARMACIA_NIT: ' 1234567890 ',
      FARMACIA_DIRECCION: ' Av. Principal #123 ',
      FARMACIA_TELEFONO: ' 22233344 ',
    });

    expect(parametros.farmacia).toEqual({
      nombre: 'Farmacia Central',
      nit: '1234567890',
      direccion: 'Av. Principal #123',
      telefono: '22233344',
    });
  });

  describe('aplicar', () => {
    test('sin argumentos devuelve el mismo objeto sin cambios', () => {
      const parametros = cargarParametros({});
      const antes = { ...parametros };

      expect(parametros.aplicar()).toBe(parametros);
      expect(parametros.margenAlertaDias).toBe(antes.margenAlertaDias);
      expect(parametros.stockSeguridad).toBe(antes.stockSeguridad);
      expect(parametros.diasReposicion).toBe(antes.diasReposicion);
      expect(parametros.ventanaDemandaDias).toBe(antes.ventanaDemandaDias);
    });

    test('aplica enteros válidos en el objeto vivo', () => {
      const parametros = cargarParametros({});
      const resultado = parametros.aplicar({
        margenAlertaDias: 15,
        stockSeguridad: 0,
        diasReposicion: 1,
        ventanaDemandaDias: 60,
      });

      expect(resultado).toBe(parametros);
      expect(parametros.margenAlertaDias).toBe(15);
      expect(parametros.stockSeguridad).toBe(0);
      expect(parametros.diasReposicion).toBe(1);
      expect(parametros.ventanaDemandaDias).toBe(60);
    });

    test('ignora valores no enteros o fuera de rango', () => {
      const parametros = cargarParametros({});
      const antes = {
        margenAlertaDias: parametros.margenAlertaDias,
        stockSeguridad: parametros.stockSeguridad,
        diasReposicion: parametros.diasReposicion,
        ventanaDemandaDias: parametros.ventanaDemandaDias,
      };

      parametros.aplicar({
        margenAlertaDias: -1,
        stockSeguridad: 1.5,
        diasReposicion: 0,
        ventanaDemandaDias: 0,
      });

      expect(parametros.margenAlertaDias).toBe(antes.margenAlertaDias);
      expect(parametros.stockSeguridad).toBe(antes.stockSeguridad);
      expect(parametros.diasReposicion).toBe(antes.diasReposicion);
      expect(parametros.ventanaDemandaDias).toBe(antes.ventanaDemandaDias);
    });

    test('actualiza y recorta los datos de la farmacia', () => {
      const parametros = cargarParametros({});

      parametros.aplicar({
        farmacia: {
          nombre: '  Nueva Farmacia  ',
          nit: ' NIT-1 ',
          direccion: ' Calle 2 ',
          telefono: ' 1234567 ',
        },
      });

      expect(parametros.farmacia).toEqual({
        nombre: 'Nueva Farmacia',
        nit: 'NIT-1',
        direccion: 'Calle 2',
        telefono: '1234567',
      });
    });

    test('ignora una farmacia ausente o con campos que no son texto', () => {
      const parametros = cargarParametros({});
      const antes = { ...parametros.farmacia };

      parametros.aplicar({ farmacia: null });
      parametros.aplicar({ farmacia: 'texto' });
      parametros.aplicar({
        farmacia: {
          nombre: 123,
          nit: null,
          direccion: undefined,
          telefono: {},
        },
      });

      expect(parametros.farmacia).toEqual(antes);
    });
  });
});
