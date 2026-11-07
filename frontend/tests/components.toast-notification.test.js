import { afterEach, describe, expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ToastNotification from '../src/presentation/components/ToastNotification.vue'

const montar = (props = {}) => mount(ToastNotification, {
  props: {
    message: 'Cambios guardados',
    ...props
  }
})

describe('notificación flotante', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  test('muestra el mensaje con el icono de éxito por defecto', () => {
    const wrapper = montar()

    expect(wrapper.text()).toContain('Cambios guardados')
    expect(wrapper.get('.toast-item').classes()).toContain('is-success')
    expect(wrapper.get('i').classes()).toContain('fa-circle-check')
  })

  test.each([
    ['error', 'fa-circle-exclamation', 'is-error'],
    ['warning', 'fa-triangle-exclamation', 'is-warning'],
  ])('usa el icono y tono %s', (tone, icono, clase) => {
    const wrapper = montar({ tone })

    expect(wrapper.get('.toast-item').classes()).toContain(clase)
    expect(wrapper.get('i').classes()).toContain(icono)
  })

  test('no renderiza nada si no hay mensaje', () => {
    const wrapper = montar({ message: '' })

    expect(wrapper.find('.toast-item').exists()).toBe(false)
  })

  test('se cierra solo después de la duración indicada', async () => {
    vi.useFakeTimers()
    const wrapper = montar({ duration: 1000 })

    await vi.advanceTimersByTimeAsync(999)
    expect(wrapper.emitted('close')).toBeUndefined()

    await vi.advanceTimersByTimeAsync(1)
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  test('reinicia el temporizador cuando cambia el mensaje', async () => {
    vi.useFakeTimers()
    const wrapper = montar({ duration: 1000 })

    await vi.advanceTimersByTimeAsync(600)
    await wrapper.setProps({ message: 'Nuevo aviso' })
    await vi.advanceTimersByTimeAsync(600)

    expect(wrapper.emitted('close')).toBeUndefined()

    await vi.advanceTimersByTimeAsync(400)
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  test('no programa cierre si el mensaje se vacía', async () => {
    vi.useFakeTimers()
    const wrapper = montar({ duration: 1000 })

    await wrapper.setProps({ message: '' })
    await vi.advanceTimersByTimeAsync(2000)

    expect(wrapper.emitted('close')).toBeUndefined()
  })

  test('cancela el temporizador al desmontarse', async () => {
    vi.useFakeTimers()
    const wrapper = montar({ duration: 1000 })

    wrapper.unmount()
    await vi.advanceTimersByTimeAsync(2000)

    expect(wrapper.emitted('close')).toBeUndefined()
  })
})
