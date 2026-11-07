const {
  validarCambioRolPropio, validarDesactivacionPropia,
  validarEliminacionPropia, normalizarDatosUsuario,
} = require('../business/rules/users.rules');

describe('Autoprotección del administrador', () => {
  test('PU-USR-01 no puede quitarse a sí mismo el rol de administrador', () => {
    expect(() => validarCambioRolPropio({ idSesion: 1, idUsuario: 1, rolNuevo: 'Ventas' }))
      .toThrow(/rol de administrador/);
  });

  test('PU-USR-02 puede conservar su rol de administrador', () => {
    expect(() => validarCambioRolPropio({ idSesion: 1, idUsuario: 1, rolNuevo: 'Administrador' })).not.toThrow();
  });

  test('PU-USR-03 puede cambiar el rol de otro usuario', () => {
    expect(() => validarCambioRolPropio({ idSesion: 1, idUsuario: 2, rolNuevo: 'Ventas' })).not.toThrow();
  });

  test('PU-USR-04 compara los ids aunque uno llegue como texto', () => {
    expect(() => validarCambioRolPropio({ idSesion: '1', idUsuario: 1, rolNuevo: 'Ventas' })).toThrow();
  });

  test('PU-USR-05 no puede desactivar su propia cuenta', () => {
    expect(() => validarDesactivacionPropia({ idSesion: 1, idUsuario: 1, activo: false }))
      .toThrow(/desactivar tu propia cuenta/);
  });

  test.each([
    ['activar su propia cuenta', { idSesion: 1, idUsuario: 1, activo: true }],
    ['desactivar a otro usuario', { idSesion: 1, idUsuario: 2, activo: false }],
  ])('PU-USR-06 permite %s', (_n, datos) => {
    expect(() => validarDesactivacionPropia(datos)).not.toThrow();
  });

  test('PU-USR-07 no puede eliminar su propia cuenta', () => {
    expect(() => validarEliminacionPropia({ idSesion: 3, idUsuario: 3 })).toThrow(/eliminar tu propia cuenta/);
  });

  test('PU-USR-08 puede eliminar a otro usuario', () => {
    expect(() => validarEliminacionPropia({ idSesion: 3, idUsuario: 4 })).not.toThrow();
  });
});

describe('normalizarDatosUsuario', () => {
  const base = {
    nombres: '  Ana María ', apellido_paterno: ' Quispe ', apellido_materno: ' Mamani ',
    fecha_nacimiento: '1999-05-20', correo: '  ANA@Correo.COM ', ci: ' 1234567 ',
    id_rol: '2', contrasena: 'Clave#2026',
  };

  test('PU-USR-09 recorta espacios, pasa el correo a minúsculas y convierte id_rol a número', () => {
    expect(normalizarDatosUsuario(base)).toEqual({
      nombres: 'Ana María', apellido_paterno: 'Quispe', apellido_materno: 'Mamani',
      fecha_nacimiento: '1999-05-20', correo: 'ana@correo.com', ci: '1234567',
      id_rol: 2, contrasena: 'Clave#2026',
    });
  });

  test.each([undefined, null, '', '   '])('PU-USR-10 apellido materno %p se guarda como null', (valor) => {
    expect(normalizarDatosUsuario({ ...base, apellido_materno: valor }).apellido_materno).toBeNull();
  });

  test('PU-USR-11 la contraseña no se recorta ni se modifica', () => {
    expect(normalizarDatosUsuario({ ...base, contrasena: ' Ab 12 ' }).contrasena).toBe(' Ab 12 ');
  });
});