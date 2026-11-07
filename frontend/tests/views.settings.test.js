import { beforeEach, describe, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const { parametersMock } = vi.hoisted(() => ({
  parametersMock: {
    obtenerParametros: vi.fn(),
    actualizarParametros: vi.fn()
  }
}))

vi.mock('../src/data/endpoints/parameters', () => parametersMock)

const SettingsView = (await import('../src/presentation/views/SettingsView.vue')).default

const parametros = () => ({
  margenAlertaDias: 30,
  stockSeguridad: 10,
  diasReposicion: 5,
  ventanaDemandaDias: 30,
  farmacia: {
    nombre: 'Farmacia Central',
    nit: '1234567890',
    direccion: 'Av. Principal #123',
    telefono: '22233344'
  }
})

const montar = () => mount(SettingsView)

const guardar = async (wrapper) => {
  const boton = wrapper.findAll('button')
    .find((nodo) => nodo.text().includes('Guardar cambios'))
  await boton.trigger('click')
  await flushPromises()
}

describe('vista de configuración', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    parametersMock.obtenerParametros.mockResolvedValue(parametros())
    parametersMock.actualizarParametros.mockImplementation(async (datos) => datos)
  })

  test('carga los parámetros y los pone en el formulario', async () => {
    const wrapper = montar()

    expect(wrapper.text()).toContain('Cargando configuración…')
    await flushPromises()

    expect(wrapper.get('#config-nombre').element.value).toBe('Farmacia Central')
    expect(wrapper.get('#config-nit').element.value).toBe('1234567890')
    expect(wrapper.get('#config-telefono').element.value).toBe('22233344')
    expect(wrapper.get('#config-margen').element.value).toBe('30')
    expect(wrapper.get('#config-stock').element.value).toBe('10')
    expect(wrapper.get('#config-ventana').element.value).toBe('30')
  })

  test('guarda los parámetros con los tipos numéricos correctos', async () => {
    const wrapper = montar()
    await flushPromises()

    await wrapper.get('#config-nombre').setValue('  Farmacia Nueva  ')
    await wrapper.get('#config-telefono').setValue(' 777-12345 ')
    await wrapper.get('#config-margen').setValue('45')
    await guardar(wrapper)

    expect(parametersMock.actualizarParametros).toHaveBeenCalledWith({
      margenAlertaDias: 45,
      stockSeguridad: 10,
      diasReposicion: 5,
      ventanaDemandaDias: 30,
      farmacia: {
        nombre: 'Farmacia Nueva',
        nit: '1234567890',
        direccion: 'Av. Principal #123',
        telefono: '777-12345'
      }
    })
    expect(wrapper.text()).toContain('Configuración guardada. Los cambios ya están activos.')
    expect(wrapper.text()).not.toContain('Revisa los campos marcados')
  })

  test('no guarda si el nombre está vacío o el teléfono es inválido', async () => {
    const wrapper = montar()
    await flushPromises()

    await wrapper.get('#config-nombre').setValue('')
    await wrapper.get('#config-telefono').setValue('abc')
    await guardar(wrapper)

    expect(parametersMock.actualizarParametros).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Revisa los campos marcados antes de guardar.')
    expect(wrapper.text()).toContain('Ingresa el nombre de la farmacia.')
    expect(wrapper.text()).toContain('Ingresa un teléfono válido')
  })

  test('valida los rangos de los parámetros numéricos', async () => {
    const wrapper = montar()
    await flushPromises()

    await wrapper.get('#config-margen').setValue('400')
    await wrapper.get('#config-stock').setValue('-1')
    await wrapper.get('#config-ventana').setValue('0')
    await guardar(wrapper)

    expect(parametersMock.actualizarParametros).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Usa un entero entre 0 y 365 días.')
    expect(wrapper.text()).toContain('Usa un entero entre 0 y 100000.')
    expect(wrapper.text()).toContain('Usa un entero entre 1 y 365 días.')
  })

  test('descarta los cambios recargando la configuración', async () => {
    const wrapper = montar()
    await flushPromises()
    await wrapper.get('#config-nombre').setValue('Otro nombre')

    const descartar = wrapper.findAll('button')
      .find((nodo) => nodo.text().includes('Descartar cambios'))
    await descartar.trigger('click')
    await flushPromises()

    expect(parametersMock.obtenerParametros).toHaveBeenCalledTimes(2)
    expect(wrapper.get('#config-nombre').element.value).toBe('Farmacia Central')
  })

  test('muestra el error de carga', async () => {
    parametersMock.obtenerParametros.mockRejectedValue({ message: 'Sin conexión' })
    const wrapper = montar()
    await flushPromises()

    expect(wrapper.text()).toContain('Sin conexión')
  })

  test('muestra el error al guardar', async () => {
    parametersMock.actualizarParametros.mockRejectedValue({ message: 'No autorizado' })
    const wrapper = montar()
    await flushPromises()

    await guardar(wrapper)

    expect(wrapper.text()).toContain('No autorizado')
    expect(wrapper.get('.toast-item').classes()).toContain('is-error')
  })
})
