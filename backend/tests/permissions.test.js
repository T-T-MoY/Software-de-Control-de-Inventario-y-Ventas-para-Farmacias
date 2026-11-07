const { PERMISOS, PERMISOS_POR_ROL, obtenerPermisos, tienePermiso } = require('../business/rules/permissions');

describe('Matriz de permisos por rol (RF1 / RNF1)', () => {
  test('PU-PER-01 Administrador tiene todos los permisos', () => {
    const todos = Object.values(PERMISOS);
    expect(obtenerPermisos('Administrador')).toHaveLength(todos.length);
    expect(obtenerPermisos('Administrador')).toEqual(expect.arrayContaining(todos));
  });

  test.each([
    ['Encargado de inventario', PERMISOS.GESTIONAR_CATALOGO, true],
    ['Encargado de inventario', PERMISOS.CONSULTAR_CATALOGO, true],
    ['Encargado de inventario', PERMISOS.GESTIONAR_PROVEEDORES, true],
    ['Encargado de inventario', PERMISOS.ADMINISTRAR_USUARIOS, false],
    ['Encargado de inventario', PERMISOS.PROCESAR_VENTAS, false],
    ['Encargado de inventario', PERMISOS.GENERAR_REPORTES, false],
    ['Ventas', PERMISOS.PROCESAR_VENTAS, true],
    ['Ventas', PERMISOS.CONSULTAR_CATALOGO, true],
    ['Ventas', PERMISOS.ADMINISTRAR_USUARIOS, false],
    ['Ventas', PERMISOS.GESTIONAR_CATALOGO, false],
    ['Ventas', PERMISOS.DAR_BAJA_LOTES, false],
  ])('PU-PER-02 %s / %s -> %s', (rol, permiso, esperado) => {
    expect(tienePermiso(rol, permiso)).toBe(esperado);
  });

  test('PU-PER-03 un rol inexistente no tiene ningún permiso', () => {
    expect(obtenerPermisos('Invitado')).toEqual([]);
    expect(tienePermiso('Invitado', PERMISOS.CONSULTAR_CATALOGO)).toBe(false);
  });

  test('PU-PER-04 el nombre del rol distingue mayúsculas (debe coincidir con la tabla rol)', () => {
    expect(tienePermiso('administrador', PERMISOS.ADMINISTRAR_USUARIOS)).toBe(false);
  });

  test('PU-PER-05 rol undefined o null no tiene permisos', () => {
    expect(obtenerPermisos(undefined)).toEqual([]);
    expect(obtenerPermisos(null)).toEqual([]);
  });

  test('PU-PER-06 todo permiso asignado a un rol existe en el catálogo PERMISOS', () => {
    const validos = new Set(Object.values(PERMISOS));
    Object.values(PERMISOS_POR_ROL).flat().forEach((p) => expect(validos.has(p)).toBe(true));
  });

  test('PU-PER-07 el catálogo de permisos está congelado', () => {
    expect(Object.isFrozen(PERMISOS)).toBe(true);
    expect(Object.isFrozen(PERMISOS_POR_ROL)).toBe(true);
  });
});