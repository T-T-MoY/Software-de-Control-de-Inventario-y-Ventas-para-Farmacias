const {
  nombreCompleto,
  aSesion,
  aPerfil,
} = require('../data/mappers/user.mapper');

const fila = () => ({
  id_usuario: 5,
  nombres: 'Ana',
  apellido_paterno: 'Pérez',
  apellido_materno: 'Gómez',
  fecha_nacimiento: '1990-01-01',
  correo: 'ana@farmacia.test',
  ci: '123456',
  estado_cuenta: 'Activo',
  fecha_registro: '2026-01-01',
  nombre_rol: 'Administrador',
});

describe('mapper de usuarios', () => {
  describe('nombreCompleto', () => {
    test('une nombres y apellidos', () => {
      expect(nombreCompleto(fila())).toBe('Ana Pérez Gómez');
    });

    test('omite los apellidos ausentes o vacíos', () => {
      expect(nombreCompleto({
        nombres: 'Ana',
        apellido_paterno: 'Pérez',
        apellido_materno: '',
      })).toBe('Ana Pérez');
      expect(nombreCompleto({
        nombres: 'Ana',
        apellido_paterno: null,
        apellido_materno: undefined,
      })).toBe('Ana');
    });

    test('devuelve cadena vacía sin nombres', () => {
      expect(nombreCompleto({})).toBe('');
    });
  });

  describe('aSesion', () => {
    test('arma los datos públicos del login', () => {
      expect(aSesion(fila())).toEqual({
        id_usuario: 5,
        nombres: 'Ana',
        apellido_paterno: 'Pérez',
        apellido_materno: 'Gómez',
        nombre_completo: 'Ana Pérez Gómez',
        correo: 'ana@farmacia.test',
        ci: '123456',
        rol: 'Administrador',
      });
    });

    test('usa cadena vacía cuando falta el apellido materno', () => {
      expect(aSesion({
        ...fila(),
        apellido_materno: null,
      }).apellido_materno).toBe('');
    });
  });

  describe('aPerfil', () => {
    test('incluye los datos completos del perfil', () => {
      expect(aPerfil(fila())).toEqual({
        id_usuario: 5,
        nombres: 'Ana',
        apellido_paterno: 'Pérez',
        apellido_materno: 'Gómez',
        nombre_completo: 'Ana Pérez Gómez',
        fecha_nacimiento: '1990-01-01',
        correo: 'ana@farmacia.test',
        ci: '123456',
        estado_cuenta: 'Activo',
        fecha_registro: '2026-01-01',
        nombre_rol: 'Administrador',
      });
    });

    test('usa cadena vacía cuando falta el apellido materno', () => {
      expect(aPerfil({
        ...fila(),
        apellido_materno: undefined,
      }).apellido_materno).toBe('');
    });
  });
});
