import { afterEach, describe, expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import { RouterLinkStub } from './helpers/stubs'

const { routeState, routerMock, sessionMock } = vi.hoisted(() => ({
  routeState: { fullPath: '/panel' },
  routerMock: { replace: vi.fn() },
  sessionMock: {
    obtenerSesion: vi.fn(() => ({ nombre: 'Ana Pérez', rol: 'Administrador' })),
    cerrarSesion: vi.fn()
  }
}))

vi.mock('vue-router', () => ({
  useRoute: () => routeState,
  useRouter: () => routerMock
}))

vi.mock('../src/business/session', () => sessionMock)

const Topbar = (await import('../src/presentation/components/Topbar.vue')).default

const ThemeToggleStub = {
  name: 'ThemeToggle',
  render: () => h('button', { class: 'theme-toggle-stub' })
}

const montar = (props = {}) => mount(Topbar, {
  props: { sidebarOpen: false, ...props },
  attachTo: document.body,
  global: {
    stubs: {
      RouterLink: RouterLinkStub,
      ThemeToggle: ThemeToggleStub
    }
  }
})

describe('barra superior', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  test('carga los datos de la sesión al montarse', async () => {
    const wrapper = montar()
    await nextTick()

    expect(wrapper.text()).toContain('Ana Pérez')
    expect(wrapper.text()).toContain('Administrador')
    expect(wrapper.get('.avatar').text()).toBe('AP')
    expect(wrapper.find('.theme-toggle-stub').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Manual de usuario"]').exists()).toBe(true)
    wrapper.unmount()
  })

  test('usa Usuario y Sesión activa cuando la sesión está vacía', async () => {
    sessionMock.obtenerSesion.mockReturnValueOnce({})
    const wrapper = montar()
    await nextTick()

    expect(wrapper.text()).toContain('Usuario')
    expect(wrapper.text()).toContain('Sesión activa')

    wrapper.unmount()
  })

  test('oculta el manual para roles que no son administrador', async () => {
    sessionMock.obtenerSesion.mockReturnValueOnce({
      nombre: 'Luis Ventas',
      rol: 'Ventas'
    })
    const wrapper = montar()
    await nextTick()

    expect(wrapper.find('[aria-label="Manual de usuario"]').exists()).toBe(false)

    wrapper.unmount()
  })

  test('refleja el estado del menú lateral', async () => {
    const cerrado = montar({ sidebarOpen: false })
    expect(cerrado.get('button[aria-controls="sidebar"]').attributes('aria-label'))
      .toBe('Abrir menú')
    expect(cerrado.get('button[aria-controls="sidebar"]').attributes('aria-expanded'))
      .toBe('false')
    cerrado.unmount()

    const abierto = montar({ sidebarOpen: true })
    expect(abierto.get('button[aria-controls="sidebar"]').attributes('aria-label'))
      .toBe('Cerrar menú')
    expect(abierto.get('button[aria-controls="sidebar"]').attributes('aria-expanded'))
      .toBe('true')
    abierto.unmount()
  })

  test('emite toggle-sidebar al pulsar el botón del menú', async () => {
    const wrapper = montar()

    await wrapper.get('button[aria-controls="sidebar"]').trigger('click')

    expect(wrapper.emitted('toggle-sidebar')).toHaveLength(1)
    wrapper.unmount()
  })

  test('abre y cierra el menú de usuario emitiendo el estado', async () => {
    const wrapper = montar()
    const boton = wrapper.get('button[aria-haspopup="menu"]')

    await boton.trigger('click')

    expect(wrapper.find('#profile-menu-dropdown').exists()).toBe(true)
    expect(wrapper.emitted('profile-menu-toggle')).toEqual([[true]])

    await boton.trigger('click')

    expect(wrapper.find('#profile-menu-dropdown').exists()).toBe(false)
    expect(wrapper.emitted('profile-menu-toggle')).toEqual([[true], [false]])
    wrapper.unmount()
  })

  test('cierra el menú al presionar Escape', async () => {
    const wrapper = montar()

    await wrapper.get('button[aria-haspopup="menu"]').trigger('click')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()

    expect(wrapper.find('#profile-menu-dropdown').exists()).toBe(false)
    expect(wrapper.emitted('profile-menu-toggle').at(-1)).toEqual([false])
    wrapper.unmount()
  })

  test('cierra el menú al hacer clic fuera', async () => {
    const wrapper = montar()

    await wrapper.get('button[aria-haspopup="menu"]').trigger('click')
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()

    expect(wrapper.find('#profile-menu-dropdown').exists()).toBe(false)
    wrapper.unmount()
  })

  test('cierra la sesión y vuelve al login', async () => {
    const wrapper = montar()

    await wrapper.get('button[aria-haspopup="menu"]').trigger('click')
    const salir = wrapper.findAll('button')
      .find((nodo) => nodo.text().includes('Cerrar sesión'))
    await salir.trigger('click')
    await Promise.resolve()

    expect(sessionMock.cerrarSesion).toHaveBeenCalledTimes(1)
    expect(routerMock.replace).toHaveBeenCalledWith({ name: 'login' })
    wrapper.unmount()
  })

  test('quita los escuchadores del documento al desmontarse', () => {
    const quitar = vi.spyOn(document, 'removeEventListener')
    const wrapper = montar()

    wrapper.unmount()

    expect(quitar).toHaveBeenCalledWith('click', expect.any(Function))
    expect(quitar).toHaveBeenCalledWith('keydown', expect.any(Function))
    quitar.mockRestore()
  })
})
