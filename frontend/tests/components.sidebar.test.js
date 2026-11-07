import { describe, expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { RouterLinkStub } from './helpers/stubs'

const { routeState, sessionMock, monitorMock } = vi.hoisted(() => ({
  routeState: { path: '/' },
  sessionMock: {
    obtenerSesion: vi.fn(() => ({ rol: 'Administrador' }))
  },
  monitorMock: {
    totales: { value: { total: 0 } }
  }
}))

vi.mock('vue-router', () => ({
  useRoute: () => routeState
}))

vi.mock('../src/business/session', () => sessionMock)

vi.mock('../src/presentation/composables/useAlertMonitor', () => ({
  useAlertMonitor: () => monitorMock
}))

const Sidebar = (await import('../src/presentation/components/Sidebar.vue')).default

const montar = (props = {}) => mount(Sidebar, {
  props: { isOpen: false, ...props },
  global: {
    stubs: { RouterLink: RouterLinkStub }
  }
})

const nombresVisibles = (wrapper) => wrapper.findAll('li.nav-item span')
  .map((nodo) => nodo.text())
  .filter(Boolean)

describe('menú lateral', () => {
  test('el administrador ve todos los módulos del sistema', () => {
    const wrapper = montar()

    expect(nombresVisibles(wrapper)).toEqual([
      'Panel principal',
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
    expect(wrapper.text()).toContain('v1.0')
  })

  test('el rol Ventas solo ve los módulos permitidos', () => {
    sessionMock.obtenerSesion.mockReturnValueOnce({ rol: 'Ventas' })
    const wrapper = montar()

    expect(nombresVisibles(wrapper)).toEqual([
      'Panel principal',
      'Medicamentos',
      'Ventas',
      'Alertas',
    ])
  })

  test('un rol desconocido solo ve el panel principal', () => {
    sessionMock.obtenerSesion.mockReturnValueOnce({ rol: 'Invitado' })
    const wrapper = montar()

    expect(nombresVisibles(wrapper)).toEqual(['Panel principal'])
  })

  test('muestra el indicador de alertas cuando el total es mayor que cero', () => {
    monitorMock.totales.value = { total: 4 }
    const wrapper = montar()

    const indicador = wrapper.get('[title="4 alertas de inventario"]')
    expect(indicador.attributes('aria-label')).toBe('4 alertas de inventario')

    monitorMock.totales.value = { total: 0 }
  })

  test('oculta el indicador cuando no hay alertas', () => {
    monitorMock.totales.value = { total: 0 }
    const wrapper = montar()

    expect(wrapper.find('[title$="alertas de inventario"]').exists()).toBe(false)
  })

  test('aplica la clase de apertura según isOpen', () => {
    expect(montar({ isOpen: false }).get('#sidebar').classes())
      .not.toContain('translate-x-0')
    expect(montar({ isOpen: true }).get('#sidebar').classes())
      .toContain('translate-x-0')
  })

  test('marca el panel principal como ruta actual', () => {
    routeState.path = '/'
    const wrapper = montar()

    const panel = wrapper.findAll('a')
      .find((nodo) => nodo.text().includes('Panel principal'))
    expect(panel.classes()).toContain('border-l-[#3d6ac1]')
  })

  test('no marca el panel principal cuando la ruta es distinta', () => {
    routeState.path = '/medicamentos'
    const wrapper = montar()

    const panel = wrapper.findAll('a')
      .find((nodo) => nodo.text().includes('Panel principal'))
    expect(panel.classes()).not.toContain('border-l-[#3d6ac1]')
    routeState.path = '/'
  })

  test('emite close desde el botón de cerrar', async () => {
    const wrapper = montar()

    await wrapper.get('[aria-label="Cerrar menú de navegación"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  test('emite close al navegar desde un enlace', async () => {
    const wrapper = montar()

    const enlace = wrapper.findAll('li.nav-item a')
      .find((nodo) => nodo.classes().includes('sidebar-link') && nodo.text().includes('Medicamentos'))
    await enlace.trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  test('emite close al pulsar el logotipo', async () => {
    const wrapper = montar()

    await wrapper.get('[aria-label="Ir al panel principal"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
