const { normalizarDatosProveedor } = require('../business/rules/suppliers.rules');
const { ErrorAplicacion } = require('../business/errors/app-error');

const proveedorValido = () => ({
  nombre_comercial: '  Distribuidora Andina S.A.  ',
  ruc_nit: ' 123456789 ',
  telefono: ' 70000000 ',
  correo_electronico: ' Ventas@Andina.TEST ',
  direccion: ' Calle 1 #123 ',
});

const capturar = (datos) => {
  try {
    normalizarDatosProveedor(datos);
    return null;
  } catch (error) {
    return error;
  }
};

describe('reglas de proveedores', () => {
  test('normaliza y recorta todos los campos', () => {
    expect(normalizarDatosProveedor(proveedorValido())).toEqual({
      nombre_comercial: 'Distribuidora Andina S.A.',
      ruc_nit: '123456789',
      telefono: '70000000',
      correo_electronico: 'ventas@andina.test',
      direccion: 'Calle 1 #123',
    });
  });

  test('convierte los campos opcionales vacíos en null', () => {
    expect(normalizarDatosProveedor({
      nombre_comercial: 'Distribuidora',
      ruc_nit: '123',
      telefono: '',
      correo_electronico: '   ',
      direccion: null,
    })).toEqual({
      nombre_comercial: 'Distribuidora',
      ruc_nit: '123',
      telefono: null,
      correo_electronico: null,
      direccion: null,
    });
  });

  test.each([null, undefined, 'texto', [], 5])(
    'rechaza un cuerpo inválido (%p)',
    (datos) => {
      expect(capturar(datos)).toMatchObject({
        message: 'Los datos del proveedor son obligatorios.',
        estado: 400,
      });
    }
  );

  test.each(['', '   ', null, undefined])(
    'exige el nombre comercial (%p)',
    (nombre_comercial) => {
      expect(capturar({
        ...proveedorValido(),
        nombre_comercial,
      })).toMatchObject({
        message: 'El nombre comercial es obligatorio.',
      });
    }
  );

  test.each(['', '   ', null, undefined])(
    'exige el RUC/NIT (%p)',
    (ruc_nit) => {
      expect(capturar({
        ...proveedorValido(),
        ruc_nit,
      })).toMatchObject({
        message: 'El RUC/NIT es obligatorio.',
      });
    }
  );

  test('el error es una instancia de ErrorAplicacion', () => {
    expect(capturar({})).toBeInstanceOf(ErrorAplicacion);
  });
});
