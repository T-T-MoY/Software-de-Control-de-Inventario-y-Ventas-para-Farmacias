import { describe, expect, test } from 'vitest'
import { coincidePorPrefijo } from '../src/business/search'

describe('coincidePorPrefijo', () => {
  test('solo coincide desde el inicio del valor', () => {
    expect(coincidePorPrefijo('Aspirina', 'as')).toBe(true)
    expect(coincidePorPrefijo('Paracetamol', 'as')).toBe(false)
    expect(coincidePorPrefijo('Paracetamol', 'acetam')).toBe(false)
  })

  test('coincide con palabras que empiezan igual dentro de un texto', () => {
    expect(coincidePorPrefijo('Distribuidora Andina', 'and')).toBe(true)
  })

  test('coincide con varias palabras por sus prefijos', () => {
    expect(coincidePorPrefijo('Luis Alberto Gómez', 'luis alb')).toBe(true)
    expect(coincidePorPrefijo('Luis Alberto Gómez', 'luis alberto')).toBe(true)
    expect(coincidePorPrefijo('Luis Alberto Gómez', 'luis xyz')).toBe(false)
  })

  test('ignora mayúsculas y espacios externos', () => {
    expect(coincidePorPrefijo('  Aspirina', ' AS ')).toBe(true)
  })

  test('una consulta vacía no filtra resultados', () => {
    expect(coincidePorPrefijo('Aspirina', '')).toBe(true)
  })
})
