import { beforeEach, describe, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const { alertsMock, monitorMock } = vi.hoisted(() => ({
  alertsMock: { obtenerResumenAlertas: vi.fn() },
  monitorMock: { sincronizarConResumen: vi.fn() }
}))

vi.mock('../src/data/endpoints/alerts', () => alertsMock)
vi.mock('../src/presentation/composables/useAlertMonitor', () => ({
  useAlertMonitor: () => monitorMock
}))

const AlertsView = (await import('../src/presentation/views/AlertsView.vue')).default

const resumenCompleto = () => ({
  margen_alerta_dias: 30,
  resumen: {
    total_lotes_por_vencer: 1,
    total_lotes_vencidos: 1,
    total_medicamentos_por_reponer: 1
  },
  lotes_por_vencer: [
    {
      id_lote: 1,
      medicamento: 'Paracetamol',
      lote_numero: 'L-1',
      proveedor: 'Proveedor Uno',
      fecha_vencimiento: '2026-12-31',
      dias_para_vencer: 12,
      cantidad_stock: 20
    }
  ],
  lotes_vencidos: [
    {
      id_lote: 2,
      medicamento: 'Ibuprofeno',
      lote_numero: 'L-2',
      proveedor: 'Proveedor Dos',
      fecha_vencimiento: '2026-01-01',
      dias_vencido: 8,
      cantidad_stock: 5
    }
  ],
  medicamentos_por_reponer: [
    {
      id_medicamento: 3,
      nombre_comercial: 'Zinc',
      concentracion: '20 mg',
      stock_actual: 2,
      demanda_diaria: '0.5',
      dias_reposicion: 5,
      stock_seguridad: 3,
      punto_reorden: 6
    }
  ]
})

describe('vista de alertas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('muestra el estado de carga y luego el resumen', async () => {
    alertsMock.obtenerResumenAlertas.mockResolvedValue(resumenCompleto())
    const wrapper = mount(AlertsView)

    expect(wrapper.text()).toContain('Consultando alertas...')

    await flushPromises()

    expect(wrapper.text()).toContain('Total de alertas')
    expect(wrapper.text()).toContain('3')
    expect(wrapper.text()).toContain('Paracetamol')
    expect(wrapper.text()).toContain('Ibuprofeno')
    expect(wrapper.text()).toContain('Zinc')
    expect(wrapper.text()).toContain('0.50')
    expect(wrapper.text()).toContain('12 días')
    expect(wrapper.text()).toContain('8 días')
    expect(monitorMock.sincronizarConResumen).toHaveBeenCalledWith(resumenCompleto())
  })

  test('muestra los estados vacíos y el margen configurado', async () => {
    alertsMock.obtenerResumenAlertas.mockResolvedValue({
      margen_alerta_dias: 45,
      resumen: {
        total_lotes_por_vencer: 0,
        total_lotes_vencidos: 0,
        total_medicamentos_por_reponer: 0
      },
      lotes_por_vencer: [],
      lotes_vencidos: [],
      medicamentos_por_reponer: []
    })
    const wrapper = mount(AlertsView)

    await flushPromises()

    expect(wrapper.text()).toContain('Margen: 45 días')
    expect(wrapper.text()).toContain('No existen lotes próximos a vencer.')
    expect(wrapper.text()).toContain('No existen lotes vencidos pendientes de baja.')
    expect(wrapper.text()).toContain('No hay medicamentos que requieran reposición.')
  })

  test.each([
    [401, 'Tu sesión expiró. Inicia sesión nuevamente.'],
    [403, 'No tienes permiso para consultar las alertas.'],
    [500, 'No se pudieron cargar las alertas.'],
  ])('traduce el error %s', async (status, mensaje) => {
    alertsMock.obtenerResumenAlertas.mockRejectedValue({
      status,
      message: status === 500 ? 'No se pudieron cargar las alertas.' : 'otro'
    })
    const wrapper = mount(AlertsView)

    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain(mensaje)
  })

  test('usa el mensaje del error cuando no hay estado', async () => {
    alertsMock.obtenerResumenAlertas.mockRejectedValue({ message: 'Fallo de red' })
    const wrapper = mount(AlertsView)

    await flushPromises()

    expect(wrapper.text()).toContain('Fallo de red')
  })

  test('recarga las alertas al pulsar actualizar', async () => {
    alertsMock.obtenerResumenAlertas.mockResolvedValue(resumenCompleto())
    const wrapper = mount(AlertsView)
    await flushPromises()
    expect(alertsMock.obtenerResumenAlertas).toHaveBeenCalledTimes(1)

    const actualizar = wrapper.findAll('button')
      .find((boton) => boton.text().includes('Actualizar alertas'))
    await actualizar.trigger('click')
    await flushPromises()

    expect(alertsMock.obtenerResumenAlertas).toHaveBeenCalledTimes(2)
  })

  test('formatea una fecha ausente como no disponible', async () => {
    const datos = resumenCompleto()
    datos.lotes_por_vencer[0].fecha_vencimiento = null
    alertsMock.obtenerResumenAlertas.mockResolvedValue(datos)
    const wrapper = mount(AlertsView)

    await flushPromises()

    expect(wrapper.text()).toContain('No disponible')
  })
})
