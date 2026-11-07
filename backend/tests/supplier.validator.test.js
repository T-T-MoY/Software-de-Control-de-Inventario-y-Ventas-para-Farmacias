const { validarDatosProveedor } = require('../presentation/validators/supplier.validator');

const proveedorValido = () => ({
  nombre_comercial: 'Distribuidora Andina S.A.',
  ruc_nit: '123456789',
  telefono: '70000000',
  correo_electronico: 'ventas@andina.test',
  direccion: 'Calle 1 #123',
});

describe('validador de proveedores', () => {
  test('acepta un proveedor completo', () => {
    expect(validarDatosProveedor(proveedorValido())).toBeNull();
  });

  test('acepta los campos opcionales vacíos', () => {
    expect(validarDatosProveedor({
      nombre_comercial: 'Distribuidora Andina',
      ruc_nit: '123456789',
      telefono: '',
      correo_electronico: '',
      direccion: '',
    })).toBeNull();
  });

  test.each([null, undefined, 'texto', []])(
    'rechaza un cuerpo inválido (%p)',
    (body) => {
      expect(validarDatosProveedor(body))
        .toBe('Los datos del proveedor son obligatorios.');
    }
  );

  test('exige el nombre comercial', () => {
    expect(validarDatosProveedor({
      ...proveedorValido(),
      nombre_comercial: ' ',
    })).toBe('El nombre comercial es obligatorio.');
  });

  test('limita el nombre comercial a 100 caracteres', () => {
    expect(validarDatosProveedor({
      ...proveedorValido(),
      nombre_comercial: 'a'.repeat(101),
    })).toBe('El nombre comercial no puede superar 100 caracteres.');
  });

  test('rechaza caracteres no permitidos en el nombre comercial', () => {
    expect(validarDatosProveedor({
      ...proveedorValido(),
      nombre_comercial: 'Andina <S.A.>',
    })).toBe('El nombre comercial contiene caracteres no permitidos.');
  });

  test('exige el RUC/NIT', () => {
    expect(validarDatosProveedor({
      ...proveedorValido(),
      ruc_nit: '',
    })).toBe('El RUC/NIT es obligatorio.');
  });

  test.each(['1234', '123456789012345678901', '123 456'])(
    'rechaza el RUC/NIT %p',
    (ruc_nit) => {
      expect(validarDatosProveedor({ ...proveedorValido(), ruc_nit }))
        .toBe('El RUC/NIT debe tener entre 5 y 20 caracteres: solo números, letras y guion.');
    }
  );

  test('limita el teléfono a 20 caracteres', () => {
    expect(validarDatosProveedor({
      ...proveedorValido(),
      telefono: '1'.repeat(21),
    })).toBe('El teléfono no puede superar 20 caracteres.');
  });

  test('rechaza un teléfono con formato inválido', () => {
    expect(validarDatosProveedor({
      ...proveedorValido(),
      telefono: 'abc',
    })).toBe('Ingresa un teléfono válido.');
  });

  test('limita el correo a 120 caracteres', () => {
    expect(validarDatosProveedor({
      ...proveedorValido(),
      correo_electronico: `${'a'.repeat(112)}@test.com`,
    })).toBe('El correo no puede superar 120 caracteres.');
  });

  test('rechaza un correo inválido', () => {
    expect(validarDatosProveedor({
      ...proveedorValido(),
      correo_electronico: 'correo-invalido',
    })).toBe('Ingresa un correo electrónico válido.');
  });

  test('limita la dirección a 150 caracteres', () => {
    expect(validarDatosProveedor({
      ...proveedorValido(),
      direccion: 'a'.repeat(151),
    })).toBe('La dirección no puede superar 150 caracteres.');
  });
});
