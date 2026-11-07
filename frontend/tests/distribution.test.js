import { describe, expect, test } from 'vitest'
import { MODULOS, modulosVisibles } from '../src/config/distribution'

describe('distribución de módulos por rol', () => {
  test('define los módulos implementados', () => {
    expect(MODULOS.map((modulo) => modulo.name)).toEqual([
      'Medicamentos',
      'Usuarios',
      'Lotes',
      'Proveedores',
      'Ventas',
      'Clientes',
      'Alertas',
      'Reportes',
      'Historial',
      'Configuración',
    ])
    expect(MODULOS.every((modulo) => modulo.icon && modulo.to)).toBe(true)
  })

  test('el administrador ve todos los módulos', () => {
    expect(modulosVisibles('Administrador')).toHaveLength(MODULOS.length)
  })

  test('el encargado de inventario ve solo sus módulos', () => {
    const visibles = modulosVisibles('Encargado de inventario')
      .map((modulo) => modulo.name)

    expect(visibles).toEqual([
      'Medicamentos',
      'Lotes',
      'Proveedores',
      'Alertas',
    ])
  })

  test('ventas ve catálogo, ventas y alertas', () => {
    expect(modulosVisibles('Ventas').map((modulo) => modulo.name))
      .toEqual(['Medicamentos', 'Ventas', 'Alertas'])
  })

  test('un rol desconocido no ve módulos', () => {
    expect(modulosVisibles('Invitado')).toEqual([])
    expect(modulosVisibles(undefined)).toEqual([])
  })
})
