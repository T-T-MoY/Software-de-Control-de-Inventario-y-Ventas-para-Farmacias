import { beforeEach, describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ThemeToggle from '../src/presentation/components/ThemeToggle.vue'
import { currentTheme } from '../src/presentation/theme'

describe('selector de tema', () => {
  beforeEach(() => {
    localStorage.clear()
    currentTheme.value = 'light'
    document.documentElement.removeAttribute('data-theme')
  })

  test('en modo claro ofrece cambiar a oscuro y muestra la luna', () => {
    const wrapper = mount(ThemeToggle)

    expect(wrapper.get('button').attributes('title')).toBe('Cambiar a modo oscuro')
    expect(wrapper.get('button').attributes('aria-label')).toBe('Cambiar a modo oscuro')
    expect(wrapper.get('path').attributes('d')).toContain('M20.354')
  })

  test('al pulsar aplica el tema oscuro', async () => {
    const wrapper = mount(ThemeToggle)

    await wrapper.get('button').trigger('click')

    expect(currentTheme.value).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  test('en modo oscuro ofrece cambiar a claro y muestra el sol', async () => {
    currentTheme.value = 'dark'
    const wrapper = mount(ThemeToggle)

    expect(wrapper.get('button').attributes('title')).toBe('Cambiar a modo claro')
    expect(wrapper.get('path').attributes('d')).toContain('M12 3v1')

    await wrapper.get('button').trigger('click')

    expect(currentTheme.value).toBe('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  test('reacciona a los cambios externos del tema', async () => {
    const wrapper = mount(ThemeToggle)

    currentTheme.value = 'dark'
    await nextTick()

    expect(wrapper.get('button').attributes('title')).toBe('Cambiar a modo claro')
  })
})
