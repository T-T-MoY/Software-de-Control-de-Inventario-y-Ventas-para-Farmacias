const {
  REGEX_CORREO,
  REGEX_NOMBRE,
  REGEX_CI,
  REGEX_CONTRASENA,
  validarCorreo,
  validarNombre,
  validarCi,
  validarContrasena,
} = require('../presentation/validators/fields');

describe('validadores de campos', () => {
  test('exporta las expresiones regulares del contrato', () => {
    expect(REGEX_CORREO.test('ana@farmacia.test')).toBe(true);
    expect(REGEX_NOMBRE.test('Ana Pérez')).toBe(true);
    expect(REGEX_CI.test('123456')).toBe(true);
    expect(REGEX_CONTRASENA.test('Clave123')).toBe(true);
  });

  describe('validarCorreo', () => {
    test.each([undefined, null, '', '   '])(
      'exige el correo cuando el valor es %p',
      (valor) => {
        expect(validarCorreo(valor)).toBe('El correo es obligatorio.');
      }
    );

    test('limita la longitud a 120 caracteres', () => {
      const correo = `${'a'.repeat(112)}@test.com`;
      expect(validarCorreo(correo))
        .toBe('El correo no puede superar 120 caracteres.');
    });

    test('rechaza correos con espacios o formato inválido', () => {
      expect(validarCorreo('ana perez@test.com')).toBe('Ingresa un correo válido.');
      expect(validarCorreo('ana@test')).toBe('Ingresa un correo válido.');
      expect(validarCorreo('@test.com')).toBe('Ingresa un correo válido.');
    });

    test('acepta un correo válido y recorta espacios', () => {
      expect(validarCorreo('  ana@farmacia.test  ')).toBeNull();
      expect(validarCorreo('ana.perez+demo@farmacia.test')).toBeNull();
    });
  });

  describe('validarNombre', () => {
    test('exige el nombre por defecto', () => {
      expect(validarNombre('', 'El nombre')).toBe('El nombre es obligatorio.');
      expect(validarNombre(undefined, 'El nombre')).toBe('El nombre es obligatorio.');
    });

    test('permite vacío cuando no es requerido', () => {
      expect(validarNombre('', 'El apellido materno', { requerido: false }))
        .toBeNull();
    });

    test('limita la longitud al máximo indicado', () => {
      expect(validarNombre('a'.repeat(81), 'El nombre', { max: 80 }))
        .toBe('El nombre no puede superar 80 caracteres.');
    });

    test('rechaza caracteres no permitidos', () => {
      expect(validarNombre('Ana <script>', 'El nombre'))
        .toBe('El nombre solo admite letras, espacios, apóstrofes, puntos y guiones.');
    });

    test('acepta nombres con acentos, apóstrofes, puntos y guiones', () => {
      expect(validarNombre("María José O'Neil-Díaz", 'El nombre')).toBeNull();
      expect(validarNombre('  Ana  ', 'El nombre')).toBeNull();
    });
  });

  describe('validarCi', () => {
    test.each([undefined, null, '', '   '])('exige el CI/NIT (%p)', (valor) => {
      expect(validarCi(valor)).toBe('El CI/NIT es obligatorio.');
    });

    test('rechaza longitudes o caracteres inválidos', () => {
      expect(validarCi('1234')).toBe(
        'El CI/NIT debe tener entre 5 y 20 caracteres: solo números, letras y guion.'
      );
      expect(validarCi('123456789012345678901')).toBe(
        'El CI/NIT debe tener entre 5 y 20 caracteres: solo números, letras y guion.'
      );
      expect(validarCi('123 456')).toBe(
        'El CI/NIT debe tener entre 5 y 20 caracteres: solo números, letras y guion.'
      );
    });

    test('acepta un CI/NIT válido', () => {
      expect(validarCi(' 123456-7A ')).toBeNull();
    });
  });

  describe('validarContrasena', () => {
    test('exige la contraseña', () => {
      expect(validarContrasena(undefined)).toBe('La contraseña es obligatoria.');
      expect(validarContrasena('')).toBe('La contraseña es obligatoria.');
    });

    test('respeta el mínimo configurado', () => {
      expect(validarContrasena('Ab1', { min: 6 }))
        .toBe('La contraseña debe tener al menos 6 caracteres.');
      expect(validarContrasena('Ab1', { etiqueta: 'La nueva contraseña', min: 8 }))
        .toBe('La nueva contraseña debe tener al menos 8 caracteres.');
    });

    test('limita el tamaño a 72 bytes', () => {
      expect(validarContrasena(`a1${'x'.repeat(71)}`))
        .toBe('La contraseña no puede superar 72 bytes.');
    });

    test('rechaza espacios, acentos y emojis', () => {
      expect(validarContrasena('Clave 123')).toBe(
        'La contraseña solo admite letras, números y símbolos como ! @ # $ % & * (sin espacios, acentos ni emojis).'
      );
      expect(validarContrasena('Clavé123')).toBe(
        'La contraseña solo admite letras, números y símbolos como ! @ # $ % & * (sin espacios, acentos ni emojis).'
      );
    });

    test('exige al menos una letra y un número', () => {
      expect(validarContrasena('abcdef')).toBe(
        'La contraseña debe incluir al menos una letra y un número.'
      );
      expect(validarContrasena('123456')).toBe(
        'La contraseña debe incluir al menos una letra y un número.'
      );
    });

    test('acepta una contraseña válida con símbolos', () => {
      expect(validarContrasena('Clave123!@#')).toBeNull();
    });
  });
});
