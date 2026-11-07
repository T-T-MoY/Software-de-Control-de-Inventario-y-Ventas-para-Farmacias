const {
  validarDatosUsuario,
  validarCambioEstado,
  validarCambioContrasena,
} = require('../presentation/validators/user.validator');

const usuarioValido = () => ({
  nombres: 'Ana',
  apellido_paterno: 'Pérez',
  apellido_materno: 'Gómez',
  fecha_nacimiento: '1990-01-01',
  correo: 'ana@farmacia.test',
  ci: '123456',
  id_rol: 2,
});

describe('validador de usuarios', () => {
  describe('validarDatosUsuario', () => {
    test('acepta un usuario válido sin contraseña', () => {
      expect(validarDatosUsuario(usuarioValido())).toBeNull();
    });

    test('acepta un usuario con contraseña cuando es obligatoria', () => {
      expect(validarDatosUsuario({
        ...usuarioValido(),
        contrasena: 'Clave123',
      }, { requiereContrasena: true })).toBeNull();
    });

    test('acepta una contraseña opcional válida al editar', () => {
      expect(validarDatosUsuario({
        ...usuarioValido(),
        contrasena: 'Nueva123',
      })).toBeNull();
    });

    test('acepta un apellido materno ausente', () => {
      expect(validarDatosUsuario({
        ...usuarioValido(),
        apellido_materno: '',
      })).toBeNull();
    });

    test.each([
      'nombres',
      'apellido_paterno',
      'fecha_nacimiento',
      'correo',
      'ci',
    ])('exige el campo %s', (campo) => {
      const datos = usuarioValido();
      delete datos[campo];
      expect(validarDatosUsuario(datos))
        .toBe('Completa todos los campos obligatorios.');
    });

    test('rechaza campos obligatorios que no son texto o están vacíos', () => {
      expect(validarDatosUsuario({ ...usuarioValido(), nombres: 123 }))
        .toBe('Completa todos los campos obligatorios.');
      expect(validarDatosUsuario({ ...usuarioValido(), correo: '   ' }))
        .toBe('Completa todos los campos obligatorios.');
    });

    test.each([undefined, null, ''])('exige el rol (%p)', (id_rol) => {
      expect(validarDatosUsuario({ ...usuarioValido(), id_rol }))
        .toBe('Selecciona un rol válido.');
    });

    test('rechaza un nombre inválido', () => {
      expect(validarDatosUsuario({ ...usuarioValido(), nombres: 'Ana <x>' }))
        .toBe('El nombre solo admite letras, espacios, apóstrofes, puntos y guiones.');
    });

    test('rechaza un apellido paterno inválido', () => {
      expect(validarDatosUsuario({
        ...usuarioValido(),
        apellido_paterno: 'a'.repeat(61),
      })).toBe('El apellido paterno no puede superar 60 caracteres.');
    });

    test('rechaza un apellido materno inválido', () => {
      expect(validarDatosUsuario({
        ...usuarioValido(),
        apellido_materno: 'Gómez <x>',
      })).toBe('El apellido materno solo admite letras, espacios, apóstrofes, puntos y guiones.');
    });

    test('rechaza un correo inválido', () => {
      expect(validarDatosUsuario({ ...usuarioValido(), correo: 'ana@test' }))
        .toBe('Ingresa un correo válido.');
    });

    test('rechaza un CI inválido', () => {
      expect(validarDatosUsuario({ ...usuarioValido(), ci: '12' }))
        .toBe('El CI/NIT debe tener entre 5 y 20 caracteres: solo números, letras y guion.');
    });

    test.each(['1990/01/01', '2026-02-31', '2999-01-01'])(
      'rechaza la fecha de nacimiento %p',
      (fecha_nacimiento) => {
        expect(validarDatosUsuario({ ...usuarioValido(), fecha_nacimiento }))
          .toBe('Ingresa una fecha de nacimiento válida.');
      }
    );

    test.each([0, 1.5, 'abc'])('rechaza el rol %p', (id_rol) => {
      expect(validarDatosUsuario({ ...usuarioValido(), id_rol }))
        .toBe('Selecciona un rol válido.');
    });

    test('exige la contraseña cuando es obligatoria', () => {
      expect(validarDatosUsuario(usuarioValido(), { requiereContrasena: true }))
        .toBe('La contraseña es obligatoria.');
    });

    test('valida la contraseña obligatoria', () => {
      expect(validarDatosUsuario({
        ...usuarioValido(),
        contrasena: 'corta',
      }, { requiereContrasena: true }))
        .toBe('La contraseña debe tener al menos 6 caracteres.');
    });

    test('valida la nueva contraseña opcional', () => {
      expect(validarDatosUsuario({
        ...usuarioValido(),
        contrasena: 'sinnumero',
      })).toBe('La nueva contraseña debe incluir al menos una letra y un número.');
    });

    test('ignora una contraseña vacía al editar', () => {
      expect(validarDatosUsuario({
        ...usuarioValido(),
        contrasena: '',
      })).toBeNull();
    });
  });

  describe('validarCambioEstado', () => {
    test.each([true, false])('acepta el booleano %p', (activo) => {
      expect(validarCambioEstado({ activo })).toBeNull();
    });

    test.each([undefined, 'true', 1, null])(
      'rechaza el estado %p',
      (activo) => {
        expect(validarCambioEstado({ activo }))
          .toBe('El estado debe ser activo o inactivo.');
      }
    );
  });

  describe('validarCambioContrasena', () => {
    test.each([undefined, null, '', 123])(
      'exige la contraseña actual (%p)',
      (contrasena_actual) => {
        expect(validarCambioContrasena({
          contrasena_actual,
          contrasena_nueva: 'Nueva123',
        })).toBe('Ingresa tu contraseña actual.');
      }
    );

    test('valida la nueva contraseña', () => {
      expect(validarCambioContrasena({
        contrasena_actual: 'Actual123',
        contrasena_nueva: 'corta',
      })).toBe('La nueva contraseña debe tener al menos 6 caracteres.');
    });

    test('rechaza una nueva contraseña igual a la actual', () => {
      expect(validarCambioContrasena({
        contrasena_actual: 'Actual123',
        contrasena_nueva: 'Actual123',
      })).toBe('La nueva contraseña debe ser diferente a la actual.');
    });

    test('acepta un cambio válido', () => {
      expect(validarCambioContrasena({
        contrasena_actual: 'Actual123',
        contrasena_nueva: 'Nueva123',
      })).toBeNull();
    });
  });
});
