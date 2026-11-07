const {
  validarDatosMedicamento,
  validarCambioEstado,
} = require('../presentation/validators/medicine.validator');

const medicamentoValido = () => ({
  codigo_barras: '7501000000011',
  nombre_comercial: 'Paracetamol 500 mg',
  dci: 'Acetaminofén',
  concentracion: '500 mg',
  forma_farmaceutica: 'Tableta',
  precio_unitario: '2.50',
  tipo_venta: 'Libre',
  stock_seguridad: '10',
  dias_reposicion: '5',
  id_categoria: 1,
});

describe('validador de medicamentos', () => {
  describe('validarDatosMedicamento', () => {
    test('acepta un medicamento válido', () => {
      expect(validarDatosMedicamento(medicamentoValido())).toBeNull();
    });

    test('acepta stock de seguridad vacío y precio entero', () => {
      expect(validarDatosMedicamento({
        ...medicamentoValido(),
        stock_seguridad: '',
        precio_unitario: 0,
      })).toBeNull();
    });

    test.each([undefined, null, '', '   '])(
      'exige el código de barras (%p)',
      (codigo_barras) => {
        expect(validarDatosMedicamento({ ...medicamentoValido(), codigo_barras }))
          .toBe('El código de barras es obligatorio.');
      }
    );

    test.each(['abc', '123', '750100000001100000000', '75010 000'])(
      'rechaza el código de barras %p',
      (codigo_barras) => {
        expect(validarDatosMedicamento({ ...medicamentoValido(), codigo_barras }))
          .toBe('El código de barras debe tener entre 4 y 20 caracteres: solo números, letras y guion.');
      }
    );

    test('exige el nombre comercial', () => {
      expect(validarDatosMedicamento({ ...medicamentoValido(), nombre_comercial: ' ' }))
        .toBe('El nombre comercial es obligatorio.');
    });

    test('limita el nombre comercial a 100 caracteres', () => {
      expect(validarDatosMedicamento({
        ...medicamentoValido(),
        nombre_comercial: 'a'.repeat(101),
      })).toBe('El nombre comercial no puede superar 100 caracteres.');
    });

    test('rechaza caracteres no permitidos en el nombre comercial', () => {
      expect(validarDatosMedicamento({
        ...medicamentoValido(),
        nombre_comercial: 'Paracetamol <500>',
      })).toBe('El nombre comercial solo admite letras, números, espacios y los signos . \' - % ( ) /.');
    });

    test('exige el principio activo', () => {
      expect(validarDatosMedicamento({ ...medicamentoValido(), dci: '' }))
        .toBe('El principio activo (DCI) es obligatorio.');
    });

    test('limita el principio activo a 100 caracteres', () => {
      expect(validarDatosMedicamento({
        ...medicamentoValido(),
        dci: 'a'.repeat(101),
      })).toBe('El principio activo (DCI) no puede superar 100 caracteres.');
    });

    test('rechaza caracteres no permitidos en el principio activo', () => {
      expect(validarDatosMedicamento({
        ...medicamentoValido(),
        dci: 'Acetaminofén <500>',
      })).toBe('El principio activo (DCI) solo admite letras, números, espacios y los signos . \' , - ( ) /.');
    });

    test('exige la concentración', () => {
      expect(validarDatosMedicamento({ ...medicamentoValido(), concentracion: '' }))
        .toBe('La concentración es obligatoria.');
    });

    test('limita la concentración a 40 caracteres', () => {
      expect(validarDatosMedicamento({
        ...medicamentoValido(),
        concentracion: 'a'.repeat(41),
      })).toBe('La concentración no puede superar 40 caracteres.');
    });

    test('rechaza caracteres no permitidos en la concentración', () => {
      expect(validarDatosMedicamento({
        ...medicamentoValido(),
        concentracion: '500 mg <oral>',
      })).toBe('La concentración solo admite letras, números, espacios y los signos . , % + - ( ) /.');
    });

    test('rechaza una forma farmacéutica desconocida', () => {
      expect(validarDatosMedicamento({
        ...medicamentoValido(),
        forma_farmaceutica: 'Supositorio',
      })).toBe('Selecciona una forma farmacéutica válida.');
    });

    test('exige el precio', () => {
      expect(validarDatosMedicamento({ ...medicamentoValido(), precio_unitario: '' }))
        .toBe('El precio es obligatorio.');
    });

    test.each(['abc', '-1', '1.234', '123456789.00'])(
      'rechaza el precio %p',
      (precio_unitario) => {
        expect(validarDatosMedicamento({ ...medicamentoValido(), precio_unitario }))
          .toBe('Ingresa un precio válido, mayor o igual a 0 y con hasta 2 decimales.');
      }
    );

    test('rechaza un tipo de venta desconocido', () => {
      expect(validarDatosMedicamento({
        ...medicamentoValido(),
        tipo_venta: 'Controlado',
      })).toBe('Selecciona un tipo de venta válido (Libre o Con receta).');
    });

    test('rechaza un stock de seguridad no entero', () => {
      expect(validarDatosMedicamento({
        ...medicamentoValido(),
        stock_seguridad: '1.5',
      })).toBe('El stock de seguridad debe ser un número entero mayor o igual a 0.');
    });

    test.each([undefined, null, ''])(
      'exige los días de reposición (%p)',
      (dias_reposicion) => {
        expect(validarDatosMedicamento({ ...medicamentoValido(), dias_reposicion }))
          .toBe('Los días de reposición son obligatorios.');
      }
    );

    test.each(['0', 'abc', '1.5'])(
      'rechaza los días de reposición %p',
      (dias_reposicion) => {
        expect(validarDatosMedicamento({ ...medicamentoValido(), dias_reposicion }))
          .toBe('Los días de reposición deben ser un número entero mayor o igual a 1.');
      }
    );

    test.each([0, -1, 'abc', 1.5])(
      'rechaza la categoría %p',
      (id_categoria) => {
        expect(validarDatosMedicamento({ ...medicamentoValido(), id_categoria }))
          .toBe('Selecciona una categoría válida.');
      }
    );
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
});
