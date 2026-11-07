import { describe, expect, test } from 'vitest'
import {
  nombreCompleto,
  iniciales,
  inicialesDeNombre,
  formatearPrecio,
  formatearFecha,
} from '../src/business/format'

describe('formato del frontend', () => {
  describe('nombreCompleto', () => {
    test('une nombres y apellidos', () => {
      expect(nombreCompleto({
        nombres: 'Ana',
        apellido_paterno: 'Pérez',
        apellido_materno: 'Gómez',
      })).toBe('Ana Pérez Gómez')
    })

    test('omite los valores ausentes', () => {
      expect(nombreCompleto({
        nombres: 'Ana',
        apellido_paterno: null,
        apellido_materno: undefined,
      })).toBe('Ana')
    })

    test('tolera null y undefined', () => {
      expect(nombreCompleto(null)).toBe('')
      expect(nombreCompleto(undefined)).toBe('')
    })
  })

  describe('iniciales', () => {
    test('usa la primera letra de nombres y apellido paterno', () => {
      expect(iniciales({
        nombres: 'ana',
        apellido_paterno: 'pérez',
      })).toBe('AP')
    })

    test('devuelve U cuando no hay datos', () => {
      expect(iniciales({})).toBe('U')
      expect(iniciales(null)).toBe('U')
    })

    test('funciona con un solo dato', () => {
      expect(iniciales({ nombres: 'Ana' })).toBe('A')
    })
  })

  describe('inicialesDeNombre', () => {
    test('toma las dos primeras palabras', () => {
      expect(inicialesDeNombre('  ana maría pérez  ')).toBe('AM')
    })

    test('devuelve U para texto vacío', () => {
      expect(inicialesDeNombre('')).toBe('U')
      expect(inicialesDeNombre('   ')).toBe('U')
      expect(inicialesDeNombre(null)).toBe('U')
    })

    test('toma una sola inicial cuando hay una palabra', () => {
      expect(inicialesDeNombre('ana')).toBe('A')
    })
  })

  describe('formatearPrecio', () => {
    test('formatea con dos decimales y prefijo Bs', () => {
      expect(formatearPrecio(12.5)).toBe('Bs 12,50')
      expect(formatearPrecio('1234.5')).toBe('Bs 1.234,50')
      expect(formatearPrecio(0)).toBe('Bs 0,00')
    })

    test('devuelve Bs 0,00 para valores no numéricos', () => {
      expect(formatearPrecio('abc')).toBe('Bs 0,00')
      expect(formatearPrecio(undefined)).toBe('Bs 0,00')
      expect(formatearPrecio(Infinity)).toBe('Bs 0,00')
    })
  })

  describe('formatearFecha', () => {
    test('devuelve No registrada para valores vacíos', () => {
      expect(formatearFecha('')).toBe('No registrada')
      expect(formatearFecha(null)).toBe('No registrada')
      expect(formatearFecha(undefined)).toBe('No registrada')
    })

    test('formatea una fecha ISO sin hora', () => {
      const texto = formatearFecha('2026-11-05')
      expect(texto).toContain('2026')
      expect(texto).toContain('noviembre')
    })

    test('incluye la hora cuando se solicita', () => {
      const texto = formatearFecha('2026-11-05T14:30:00', true)
      expect(texto).toContain('2026')
      expect(texto).toMatch(/\d{1,2}:\d{2}/)
    })

    test('devuelve el texto original si la fecha es inválida', () => {
      expect(formatearFecha('no-es-fecha')).toBe('no-es-fecha')
    })
  })
})
