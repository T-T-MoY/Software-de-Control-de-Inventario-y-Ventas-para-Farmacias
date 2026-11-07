import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { RouterLinkStub } from './helpers/stubs'

const { sessionMock } = vi.hoisted(() => ({
  sessionMock: {
    obtenerSesion: vi.fn(),
    consumirBienvenida: vi.fn(),
    finalizarBienvenida: vi.fn()
  }
}))

vi.mock('../src/business/session', () => sessionMock)

const DashboardView = (await import('../src/presentation/views/DashboardView.vue')).default

const montar = () => mount(DashboardView, {
  global: { stubs: { RouterLink: RouterLinkStub } }
})

const sesionAdmin = {
  nombre: 'Ana Pérez',
  nombrePila: 'Ana',
  rol: 'Administrador'
}

describe('vista del panel principal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionMock.obtenerSesion.mockReturnValue(sesionAdmin)
    sessionMock.consumirBienvenida.mockReturnValue(false)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('saluda y muestra los datos de la sesión', () => {
    const wrapper = montar()

    expect(wrapper.text()).toContain('Hola, Ana')
    expect(wrapper.text()).toContain('Sesión activa')
    expect(wrapper.text()).toContain('Administrador')
    expect(wrapper.text()).toContain('Permisos aplicados')
    expect(wrapper.findAll('.stat-card')).toHaveLength(4)
  })

  test('el administrador ve todos los accesos y módulos', () => {
    const wrapper = montar()

    expect(wrapper.text()).toContain('Gestionar usuarios')
    expect(wrapper.text()).toContain('Ir a ventas')
    expect(wrapper.text()).toContain('10 módulos disponibles')
    expect(wrapper.findAll('.module-card')).toHaveLength(10)
  })

  test('un rol de ventas no ve la gestión de usuarios', () => {
    sessionMock.obtenerSesion.mockReturnValue({
      nombre: 'Luis Ventas',
      nombrePila: 'Luis',
      rol: 'Ventas'
    })
    const wrapper = montar()

    expect(wrapper.text()).not.toContain('Gestionar usuarios')
    expect(wrapper.text()).toContain('Ir a ventas')
    expect(wrapper.text()).toContain('3 módulos disponibles')
  })

  test('usa valores por defecto cuando la sesión está vacía', () => {
    sessionMock.obtenerSesion.mockReturnValue({})
    const wrapper = montar()

    expect(wrapper.text()).toContain('Hola, Usuario')
    expect(wrapper.text()).toContain('Módulos disponibles')
  })

  test('muestra la pantalla de bienvenida y la cierra sola', async () => {
    vi.useFakeTimers()
    sessionMock.consumirBienvenida.mockReturnValue(true)
    const wrapper = montar()

    await nextTick()
    expect(wrapper.find('.login-welcome').exists()).toBe(true)
    expect(wrapper.text()).toContain('¡Bienvenido, Ana!')

    await vi.advanceTimersByTimeAsync(2800)
    await nextTick()

    expect(wrapper.find('.login-welcome').exists()).toBe(false)
  })

  test('finaliza la bienvenida al desmontarse si seguía activa', async () => {
    vi.useFakeTimers()
    sessionMock.consumirBienvenida.mockReturnValue(true)
    const wrapper = montar()

    await nextTick()
    wrapper.unmount()

    expect(sessionMock.finalizarBienvenida).toHaveBeenCalledTimes(1)
  })

  test('no muestra la bienvenida si no corresponde', () => {
    const wrapper = montar()

    expect(wrapper.find('.login-welcome').exists()).toBe(false)
    expect(sessionMock.finalizarBienvenida).not.toHaveBeenCalled()
  })
})
