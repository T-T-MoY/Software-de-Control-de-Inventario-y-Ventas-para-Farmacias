import { describe, expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('vue3-apexcharts', async () => {
  const { h } = await import('vue')
  return {
    default: {
      name: 'VueApexCharts',
      props: {
        type: { type: String, default: '' },
        height: { type: [String, Number], default: '' },
        options: { type: Object, default: () => ({}) },
        series: { type: Array, default: () => [] },
      },
      setup(props) {
        return () => h('div', {
          class: 'apex-chart-stub',
          'data-type': props.type,
          'data-series': JSON.stringify(props.series),
        })
      },
    },
  }
})

const ReportCharts = (await import('../src/presentation/components/ReportCharts.vue')).default

const montar = (props) => mount(ReportCharts, { props })

const seriesDe = (wrapper, indice = 0) => JSON.parse(
  wrapper.findAllComponents({ name: 'VueApexCharts' })[indice]
    .attributes('data-series')
)

describe('gráficas de reportes', () => {
  test('en ventas calcula ingresos, operaciones y descuentos', () => {
    const wrapper = montar({
      tipo: 'ventas',
      filas: [
        { fecha_hora_venta: '2026-01-02T10:00:00', total: '50.00' },
        { fecha_hora_venta: '2026-01-01T10:00:00', total: '100.00' },
        { fecha_hora_venta: '2026-01-01T12:00:00', total: '25.00' },
      ],
      totales: { total: '175', descuento_monto: '10' },
    })

    expect(wrapper.text()).toContain('Bs 175,00')
    expect(wrapper.text()).toContain('Bs 10,00')
    expect(wrapper.text()).toContain('3')
    expect(seriesDe(wrapper)).toEqual([
      { name: 'Ingresos', data: [125, 50] },
    ])
    expect(wrapper.get('.apex-chart-stub').attributes('data-type')).toBe('area')
  })

  test('en ventas sin filas muestra el estado vacío', () => {
    const wrapper = montar({ tipo: 'ventas', filas: [], totales: {} })

    expect(wrapper.text()).toContain('No hay datos suficientes para mostrar la evolución.')
    expect(wrapper.text()).toContain('Bs 0,00')
    expect(wrapper.findAllComponents({ name: 'VueApexCharts' })).toHaveLength(0)
  })

  test('en inventario resume unidades y valores', () => {
    const wrapper = montar({
      tipo: 'inventario',
      filas: [
        {
          nombre_comercial: 'Paracetamol',
          stock_actual: '10',
          valor_stock_costo: '20',
          valor_stock_venta: '30',
        },
        {
          nombre_comercial: 'Ibuprofeno',
          stock_actual: 5,
          valor_stock_costo: '10',
          valor_stock_venta: '15',
        },
      ],
      totales: {},
    })

    expect(wrapper.text()).toContain('Bs 30,00')
    expect(wrapper.text()).toContain('Bs 45,00')
    expect(wrapper.text()).toContain('15')
    expect(wrapper.findAllComponents({ name: 'VueApexCharts' })).toHaveLength(2)
    expect(seriesDe(wrapper, 0)).toEqual([
      { name: 'Unidades', data: [10, 5] },
    ])
    expect(seriesDe(wrapper, 1)).toEqual([
      { name: 'Valor de venta', data: [30, 15] },
    ])
  })

  test('en inventario vacío muestra ambos estados vacíos', () => {
    const wrapper = montar({ tipo: 'inventario', filas: [], totales: {} })

    expect(wrapper.text()).toContain('Sin existencias para comparar.')
    expect(wrapper.text()).toContain('Sin valores para comparar.')
    expect(wrapper.findAllComponents({ name: 'VueApexCharts' })).toHaveLength(0)
  })

  test('en lotes por vencer agrupa por urgencia', () => {
    const wrapper = montar({
      tipo: 'lotes-por-vencer',
      filas: [
        { dias_para_vencer: 3 },
        { dias_para_vencer: 7 },
        { dias_para_vencer: 10 },
        { dias_para_vencer: 20 },
        { dias_para_vencer: -2 },
      ],
      totales: { cantidad_stock: '50', valor_costo: '100' },
    })

    expect(wrapper.text()).toContain('5')
    expect(wrapper.text()).toContain('Bs 100,00')
    expect(seriesDe(wrapper)).toEqual([
      { name: 'Lotes', data: [3, 1, 1] },
    ])
  })

  test('en lotes vencidos cuenta pendientes y bajas', () => {
    const wrapper = montar({
      tipo: 'lotes-vencidos',
      filas: [
        { estado_lote: 'Pendiente de baja' },
        { estado_lote: 'Pendiente de baja' },
        { estado_lote: 'Dado de baja' },
      ],
      totales: {},
    })

    expect(wrapper.text()).toContain('Lotes vencidos')
    expect(seriesDe(wrapper)).toEqual([2, 1])
    expect(wrapper.get('.apex-chart-stub').attributes('data-type')).toBe('donut')
  })

  test('tolera totales ausentes o nulos', () => {
    const wrapper = montar({
      tipo: 'lotes-vencidos',
      filas: [],
      totales: { cantidad_stock: null, valor_costo: null },
    })

    expect(wrapper.text()).toContain('Bs 0,00')
    expect(seriesDe(wrapper)).toEqual([0, 0])
  })
})
