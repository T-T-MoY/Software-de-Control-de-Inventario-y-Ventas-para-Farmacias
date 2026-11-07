jest.mock('../config/parameters', () => ({
  margenAlertaDias: 30,
  stockSeguridad: 5,
  diasReposicion: 7,
  ventanaDemandaDias: 45,
  farmacia: {
    nombre: 'Farmacia Base',
    nit: '900000',
    direccion: 'Calle 1',
    telefono: '70000000',
  },
  aplicar: jest.fn(),
}));

jest.mock('../data/repositories/parameters.repository', () => ({
  listar: jest.fn(),
  guardar: jest.fn(),
}));

const parametros = require('../config/parameters');
const parametrosRepositorio = require('../data/repositories/parameters.repository');
const {
  obtener,
  cargar,
  actualizar,
} = require('../business/services/parameters.service');

describe('servicio de parámetros', () => {
  const valoresIniciales = {
    margenAlertaDias: 30,
    stockSeguridad: 5,
    diasReposicion: 7,
    ventanaDemandaDias: 45,
    farmacia: {
      nombre: 'Farmacia Base',
      nit: '900000',
      direccion: 'Calle 1',
      telefono: '70000000',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(parametros, {
      ...valoresIniciales,
      farmacia: { ...valoresIniciales.farmacia },
    });
    parametros.aplicar.mockImplementation((valores) => {
      Object.assign(parametros, valores);
      return parametros;
    });
  });

  describe('obtener', () => {
    test('devuelve una instantánea de los parámetros vigentes', () => {
      expect(obtener()).toEqual(valoresIniciales);
    });

    test('devuelve una copia de la farmacia que no altera el estado interno', () => {
      const resultado = obtener();
      resultado.farmacia.nombre = 'Modificada';

      expect(parametros.farmacia.nombre).toBe('Farmacia Base');
    });
  });

  describe('cargar', () => {
    test('aplica los valores guardados y devuelve la instantánea actualizada', async () => {
      parametrosRepositorio.listar.mockResolvedValue([
        { clave: 'margen_alerta_dias', valor: '45' },
        { clave: 'stock_seguridad', valor: '8' },
        { clave: 'dias_reposicion', valor: '6' },
        { clave: 'ventana_demanda_dias', valor: '15' },
        { clave: 'farmacia_nombre', valor: 'Farmacia Central' },
        { clave: 'farmacia_nit', valor: '123456' },
        { clave: 'farmacia_direccion', valor: 'Av. Siempre Viva' },
        { clave: 'farmacia_telefono', valor: '77777777' },
      ]);

      await expect(cargar()).resolves.toEqual({
        margenAlertaDias: 45,
        stockSeguridad: 8,
        diasReposicion: 6,
        ventanaDemandaDias: 15,
        farmacia: {
          nombre: 'Farmacia Central',
          nit: '123456',
          direccion: 'Av. Siempre Viva',
          telefono: '77777777',
        },
      });

      expect(parametrosRepositorio.listar).toHaveBeenCalledWith();
      expect(parametros.aplicar).toHaveBeenCalledWith({
        margenAlertaDias: 45,
        stockSeguridad: 8,
        diasReposicion: 6,
        ventanaDemandaDias: 15,
        farmacia: {
          nombre: 'Farmacia Central',
          nit: '123456',
          direccion: 'Av. Siempre Viva',
          telefono: '77777777',
        },
      });
    });

    test.each([
      ['valores vacíos', '', {
        nombre: '', nit: '', direccion: '', telefono: '',
      }],
      ['valores no numéricos', 'abc', {
        nombre: 'abc', nit: 'abc', direccion: 'abc', telefono: 'abc',
      }],
      ['valores decimales', '1.5', {
        nombre: '1.5', nit: '1.5', direccion: '1.5', telefono: '1.5',
      }],
      ['valores nulos', null, {
        nombre: 'Farmacia Base',
        nit: '900000',
        direccion: 'Calle 1',
        telefono: '70000000',
      }],
    ])('conserva los valores actuales ante %s', async (_caso, valor, farmaciaEsperada) => {
      parametrosRepositorio.listar.mockResolvedValue([
        { clave: 'margen_alerta_dias', valor },
        { clave: 'stock_seguridad', valor },
        { clave: 'dias_reposicion', valor },
        { clave: 'ventana_demanda_dias', valor },
        { clave: 'farmacia_nombre', valor },
        { clave: 'farmacia_nit', valor },
        { clave: 'farmacia_direccion', valor },
        { clave: 'farmacia_telefono', valor },
      ]);

      await expect(cargar()).resolves.toEqual({
        margenAlertaDias: 30,
        stockSeguridad: 5,
        diasReposicion: 7,
        ventanaDemandaDias: 45,
        farmacia: farmaciaEsperada,
      });

      expect(parametros.aplicar).toHaveBeenCalledWith({
        margenAlertaDias: 30,
        stockSeguridad: 5,
        diasReposicion: 7,
        ventanaDemandaDias: 45,
        farmacia: farmaciaEsperada,
      });
    });

    test('usa los valores actuales cuando la tabla está vacía', async () => {
      parametrosRepositorio.listar.mockResolvedValue([]);

      await expect(cargar()).resolves.toEqual(valoresIniciales);

      expect(parametros.aplicar).toHaveBeenCalledWith({
        margenAlertaDias: 30,
        stockSeguridad: 5,
        diasReposicion: 7,
        ventanaDemandaDias: 45,
        farmacia: {
          nombre: 'Farmacia Base',
          nit: '900000',
          direccion: 'Calle 1',
          telefono: '70000000',
        },
      });
    });

    test('ignora claves desconocidas', async () => {
      parametrosRepositorio.listar.mockResolvedValue([
        { clave: 'otra_clave', valor: '99' },
      ]);

      await expect(cargar()).resolves.toEqual(valoresIniciales);
    });

    test('propaga el error del repositorio y no aplica cambios', async () => {
      const error = new Error('Error de base de datos');
      parametrosRepositorio.listar.mockRejectedValue(error);

      await expect(cargar()).rejects.toBe(error);

      expect(parametros.aplicar).not.toHaveBeenCalled();
    });
  });

  describe('actualizar', () => {
    const datos = {
      margenAlertaDias: 20,
      stockSeguridad: 3,
      diasReposicion: 4,
      ventanaDemandaDias: 10,
      farmacia: {
        nombre: 'Farmacia Nueva',
        nit: '555555',
        direccion: 'Calle 9',
        telefono: '71111111',
      },
    };

    test('guarda las claves de configuración y aplica los cambios en memoria', async () => {
      parametrosRepositorio.guardar.mockResolvedValue(undefined);

      await expect(actualizar(datos)).resolves.toEqual(datos);

      expect(parametrosRepositorio.guardar).toHaveBeenCalledWith({
        margen_alerta_dias: 20,
        stock_seguridad: 3,
        dias_reposicion: 4,
        ventana_demanda_dias: 10,
        farmacia_nombre: 'Farmacia Nueva',
        farmacia_nit: '555555',
        farmacia_direccion: 'Calle 9',
        farmacia_telefono: '71111111',
      });
      expect(parametros.aplicar).toHaveBeenCalledWith(datos);
    });

    test('permite guardar valores nulos y los envía tal cual', async () => {
      const datosNulos = {
        ...datos,
        margenAlertaDias: null,
        stockSeguridad: null,
        farmacia: {
          nombre: null,
          nit: null,
          direccion: null,
          telefono: null,
        },
      };
      parametrosRepositorio.guardar.mockResolvedValue(undefined);

      await actualizar(datosNulos);

      expect(parametrosRepositorio.guardar).toHaveBeenCalledWith({
        margen_alerta_dias: null,
        stock_seguridad: null,
        dias_reposicion: 4,
        ventana_demanda_dias: 10,
        farmacia_nombre: null,
        farmacia_nit: null,
        farmacia_direccion: null,
        farmacia_telefono: null,
      });
    });

    test('propaga el error del repositorio y no aplica cambios', async () => {
      const error = new Error('Error de base de datos');
      parametrosRepositorio.guardar.mockRejectedValue(error);

      await expect(actualizar(datos)).rejects.toBe(error);

      expect(parametrosRepositorio.guardar).toHaveBeenCalledTimes(1);
      expect(parametros.aplicar).not.toHaveBeenCalled();
    });
  });
});
