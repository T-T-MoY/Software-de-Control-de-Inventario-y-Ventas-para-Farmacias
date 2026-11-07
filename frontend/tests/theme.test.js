import { beforeEach, describe, expect, test } from 'vitest'
import {
  currentTheme,
  getStoredTheme,
  applyTheme,
  toggleTheme,
} from '../src/presentation/theme'

describe('tema visual', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    document.head.innerHTML = ''
  })

  test('lee el tema guardado', () => {
    expect(getStoredTheme()).toBe('light')

    localStorage.setItem('theme', 'dark')

    expect(getStoredTheme()).toBe('dark')

    localStorage.setItem('theme', 'otro')

    expect(getStoredTheme()).toBe('light')
  })

  test('aplica el tema oscuro al documento y a la meta', () => {
    const meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    document.head.appendChild(meta)

    expect(applyTheme('dark')).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
    expect(currentTheme.value).toBe('dark')
    expect(meta.getAttribute('content')).toBe('#05102D')
  })

  test('aplica el tema claro para cualquier valor distinto de dark', () => {
    const meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    document.head.appendChild(meta)

    expect(applyTheme('claro')).toBe('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(localStorage.getItem('theme')).toBe('light')
    expect(currentTheme.value).toBe('light')
    expect(meta.getAttribute('content')).toBe('#FFF7E3')
  })

  test('funciona sin la meta theme-color', () => {
    expect(() => applyTheme('dark')).not.toThrow()
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  test('alterna entre oscuro y claro', () => {
    expect(toggleTheme('dark')).toBe('light')
    expect(toggleTheme('light')).toBe('dark')
    expect(toggleTheme(undefined)).toBe('dark')
  })
})
