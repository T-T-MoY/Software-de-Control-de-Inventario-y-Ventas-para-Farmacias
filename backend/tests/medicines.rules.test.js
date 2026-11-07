const {
  FORMAS_FARMACEUTICAS,
  TIPOS_VENTA,
  normalizarDatosMedicamento,
} = require('../business/rules/medicines.rules');

describe('reglas de medicamentos', () => {
  test('expone los valores permitidos por el esquema', () => {
    expect(FORMAS_FARMACEUTICAS).toEqual([
      'Tableta',
      'Cápsula',
      'Jarabe',
      'Suspensión',
      'Crema',
      'Gel',
      'Inyectable',
      'Gotas',
    ]);
    expect(TIPOS_VENTA).toEqual(['Libre', 'Con receta']);
    expect(Object.isFrozen(FORMAS_FARMACEUTICAS)).toBe(true);
    expect(Object.isFrozen(TIPOS_VENTA)).toBe(true);
  });

  test('normaliza textos, números y recorta espacios', () => {
    expect(normalizarDatosMedicamento({
      codigo_barras: ' 7501000000011 ',
      nombre_comercial: ' Paracetamol ',
      dci: ' Acetaminofén ',
      concentracion: ' 500 mg ',
      forma_farmaceutica: ' Tableta ',
      precio_unitario: '2.50',
      tipo_venta: ' Con receta ',
      stock_seguridad: '10',
      dias_reposicion: '5',
      id_categoria: '2',
    })).toEqual({
      codigo_barras: '7501000000011',
      nombre_comercial: 'Paracetamol',
      dci: 'Acetaminofén',
      concentracion: '500 mg',
      forma_farmaceutica: 'Tableta',
      precio_unitario: 2.5,
      tipo_venta: 'Con receta',
      stock_seguridad: 10,
      dias_reposicion: 5,
      id_categoria: 2,
    });
  });

  test('aplica los valores por defecto y conserva el stock cero', () => {
    expect(normalizarDatosMedicamento({
      precio_unitario: '0',
      id_categoria: 1,
      stock_seguridad: 0,
      dias_reposicion: null,
    })).toEqual({
      codigo_barras: '',
      nombre_comercial: '',
      dci: '',
      concentracion: '',
      forma_farmaceutica: '',
      precio_unitario: 0,
      tipo_venta: 'Libre',
      stock_seguridad: 0,
      dias_reposicion: undefined,
      id_categoria: 1,
    });
  });

  test('convierte cadenas vacías de campos opcionales en undefined', () => {
    const resultado = normalizarDatosMedicamento({
      stock_seguridad: '',
      dias_reposicion: '',
      precio_unitario: 1,
      id_categoria: 1,
    });

    expect(resultado.stock_seguridad).toBeUndefined();
    expect(resultado.dias_reposicion).toBeUndefined();
  });

  test('tolera un objeto sin campos', () => {
    expect(normalizarDatosMedicamento({})).toEqual({
      codigo_barras: '',
      nombre_comercial: '',
      dci: '',
      concentracion: '',
      forma_farmaceutica: '',
      precio_unitario: NaN,
      tipo_venta: 'Libre',
      stock_seguridad: undefined,
      dias_reposicion: undefined,
      id_categoria: NaN,
    });
  });
});
