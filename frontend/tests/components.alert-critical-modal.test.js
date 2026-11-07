import { describe, expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AlertCriticalModal from '../src/presentation/components/AlertCriticalModal.vue'

const montar = (totalVencidos = 2) => mount(AlertCriticalModal, {
  props: { totalVencidos }
})

describe('modal de alerta crítica', () => {
  test('muestra el total y el plural de lotes vencidos', () => {
    const wrapper = montar(3)

    expect(wrapper.text()).toContain('Medicamentos vencidos pendientes de baja')
    expect(wrapper.text()).toContain('3')
    expect(wrapper.text()).toContain('lotes vencidos')
    expect(wrapper.get('[role="dialog"]').attributes('aria-modal')).toBe('true')
  })

  test('usa el singular cuando solo hay un lote vencido', () => {
    const wrapper = montar(1)

    expect(wrapper.text()).toContain('1')
    expect(wrapper.text()).toContain('lote vencido')
    expect(wrapper.text()).not.toContain('lotes vencidos')
  })

  test('emite cerrar al pulsar el botón de la cabecera', async () => {
    const wrapper = montar()

    await wrapper.get('[aria-label="Cerrar"]').trigger('click')

    expect(wrapper.emitted('cerrar')).toHaveLength(1)
  })

  test('emite cerrar al pulsar Recordar después', async () => {
    const wrapper = montar()

    const boton = wrapper.findAll('button')
      .find((nodo) => nodo.text() === 'Recordar después')
    await boton.trigger('click')

    expect(wrapper.emitted('cerrar')).toHaveLength(1)
  })

  test('emite ver al pulsar Ver alertas', async () => {
    const wrapper = montar()

    const boton = wrapper.findAll('button')
      .find((nodo) => nodo.text().includes('Ver alertas'))
    await boton.trigger('click')

    expect(wrapper.emitted('ver')).toHaveLength(1)
    expect(wrapper.emitted('cerrar')).toBeUndefined()
  })

  test('emite cerrar al hacer clic en el fondo', async () => {
    const wrapper = montar()

    await wrapper.trigger('click')

    expect(wrapper.emitted('cerrar')).toHaveLength(1)
  })

  test('emite cerrar al presionar Escape', async () => {
    const wrapper = montar()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    expect(wrapper.emitted('cerrar')).toHaveLength(1)
  })

  test('ignora otras teclas', () => {
    const wrapper = montar()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))

    expect(wrapper.emitted('cerrar')).toBeUndefined()
  })

  test('deja de escuchar el teclado después de desmontarse', () => {
    const quitar = vi.spyOn(document, 'removeEventListener')
    const wrapper = montar()

    wrapper.unmount()

    expect(quitar).toHaveBeenCalledWith('keydown', expect.any(Function))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(wrapper.emitted('cerrar')).toBeUndefined()
    quitar.mockRestore()
  })
})
