import { beforeEach, describe, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const { reportsMock } = vi.hoisted(() => ({
  reportsMock: {
    obtenerReporte: vi.fn(),
    descargarReporte: vi.fn()
  }
}))

vi.mock('../src/data/endpoints/reports', () => reportsMock)

const ReportsView = (await import('../src/presentation/views/ReportsView.vue')).default

const reporteVentas = () => ({
  tipo: 'ventas',
  titulo: 'Reporte de ventas',
  total_filas: 2,
  totales: { total: 150, descuento_monto: 10 },
  columnas: [
    { clave: 'fecha_hora_venta', titulo: 'Fecha', tipo: 'fechahora' },
    { clave: 'total', titulo: 'Total', tipo: 'moneda' },
    { clave: 'descuento_monto', titulo: 'Descuento', tipo: 'moneda' },
    { clave: 'cantidad', titulo: 'Cantidad', tipo: 'entero' }
  ],
  filas: [
    {
      fecha_hora_venta: '2026-11-01T14:30:00',
      total: 100,
      cantidad: 5
    },
    {
      fecha_hora_venta: 'fecha-invalida',
      total: null,
      cantidad: 2
    }
  ]
})

const montar = () => mount(ReportsView, {
  global: { stubs: { ReportCharts: true } }
})

describe('vista de reportes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    reportsMock.obtenerReporte.mockResolvedValue(reporteVentas())
    reportsMock.descargarReporte.mockResolvedValue(new Blob(['datos']))
    URL.createObjectURL = vi.fn(() => 'blob:reporte')
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  test('genera el reporte de ventas al montarse', async () => {
    const wrapper = montar()
    await flushPromises()

    expect(reportsMock.obtenerReporte).toHaveBeenCalledWith('ventas', {
      fechaInicio: expect.any(String),
      fechaFin: expect.any(String)
    })
    expect(wrapper.text()).toContain('Reporte de ventas')
    expect(wrapper.text()).toContain('150,00')
    expect(wrapper.text()).toContain('100,00')
    expect(wrapper.text()).toContain('01/11/2026 14:30')
    expect(wrapper.text()).toContain('—')
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  })

  test('cambia al reporte de inventario sin rango de fechas', async () => {
    const wrapper = montar()
    await flushPromises()

    await wrapper.get('#filtro-tipo').setValue('inventario')
    await flushPromises()

    expect(reportsMock.obtenerReporte).toHaveBeenLastCalledWith('inventario', {})
    expect(wrapper.text()).toContain('Existencias vigentes al día de hoy.')
    expect(wrapper.find('#filtro-desde').exists()).toBe(false)
  })

  test('valida que la fecha inicial no supere la final', async () => {
    const wrapper = montar()
    await flushPromises()

    await wrapper.get('#filtro-desde').setValue('2026-12-31')
    await wrapper.get('#filtro-hasta').setValue('2026-01-01')
    await wrapper.findAll('button')
      .find((boton) => boton.text().includes('Generar'))
      .trigger('click')
    await flushPromises()

    expect(reportsMock.obtenerReporte).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('La fecha inicial no puede ser posterior a la fecha final.')
  })

  test('muestra el mensaje cuando no hay registros', async () => {
    reportsMock.obtenerReporte.mockResolvedValue({
      ...reporteVentas(),
      total_filas: 0,
      totales: {},
      filas: []
    })
    const wrapper = montar()
    await flushPromises()

    expect(wrapper.text()).toContain('Sin registros para los filtros seleccionados.')
    expect(wrapper.find('.apex-chart-stub').exists()).toBe(false)
  })

  test('exporta a Excel y descarga el archivo', async () => {
    const wrapper = montar()
    await flushPromises()

    await wrapper.findAll('button')
      .find((boton) => boton.text().includes('Exportar Excel'))
      .trigger('click')
    await flushPromises()

    expect(reportsMock.descargarReporte).toHaveBeenCalledWith('ventas', 'excel', {
      fechaInicio: expect.any(String),
      fechaFin: expect.any(String)
    })
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:reporte')
    expect(wrapper.text()).toContain('Reporte exportado en Excel.')
  })

  test('traduce el error 401 al generar el reporte', async () => {
    reportsMock.obtenerReporte.mockRejectedValue({ status: 401, message: 'Sin sesión' })
    const wrapper = montar()
    await flushPromises()

    expect(wrapper.text()).toContain('Tu sesión expiró. Inicia sesión nuevamente.')
  })

  test('muestra el error al exportar', async () => {
    reportsMock.descargarReporte.mockRejectedValue({ status: 500, message: 'Fallo al exportar' })
    const wrapper = montar()
    await flushPromises()

    await wrapper.findAll('button')
      .find((boton) => boton.text().includes('Exportar PDF'))
      .trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Fallo al exportar')
    expect(wrapper.text()).not.toContain('Reporte exportado')
  })
})
