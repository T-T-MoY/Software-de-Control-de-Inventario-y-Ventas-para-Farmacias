import { beforeEach, describe, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const { reportsMock } = vi.hoisted(() => ({
  reportsMock: {
    listarHistorial: vi.fn(),
    listarUsuariosHistorial: vi.fn()
  }
}))

vi.mock('../src/data/endpoints/reports', () => reportsMock)

const HistoryView = (await import('../src/presentation/views/HistoryView.vue')).default

const historial = () => ({
  total: 2,
  pagina: 1,
  total_paginas: 3,
  resumen: { VENTA: 1, RECEPCION: 1, BAJA: 0 },
  registros: [
    {
      id_historial: 1,
      fecha_hora: '2026-11-01T14:30:00',
      tipo_operacion: 'VENTA',
      etiqueta_operacion: 'Venta',
      descripcion: 'Venta de Paracetamol',
      usuario: 'Ana Pérez',
      rol: 'Administrador',
      monto: 25.5
    },
    {
      id_historial: 2,
      fecha_hora: '2026-10-30T08:00:00',
      tipo_operacion: 'RECEPCION',
      etiqueta_operacion: 'Recepción',
      descripcion: 'Ingreso de lote L-1',
      usuario: 'Luis Gómez',
      rol: 'Encargado de inventario',
      monto: null
    }
  ]
})

const usuarios = () => [
  { id_usuario: 1, usuario: 'ana' },
  { id_usuario: 2, usuario: 'luis' }
]

const montar = () => mount(HistoryView)

describe('vista de historial', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    reportsMock.listarHistorial.mockResolvedValue(historial())
    reportsMock.listarUsuariosHistorial.mockResolvedValue(usuarios())
  })

  test('carga los usuarios y el historial al montarse', async () => {
    const wrapper = montar()
    await flushPromises()

    expect(reportsMock.listarUsuariosHistorial).toHaveBeenCalledTimes(1)
    expect(reportsMock.listarHistorial).toHaveBeenCalledWith({
      fechaInicio: '',
      fechaFin: '',
      tipo: '',
      idUsuario: '',
      pagina: 1,
      limite: 20
    })
    expect(wrapper.text()).toContain('Venta de Paracetamol')
    expect(wrapper.text()).toContain('Ingreso de lote L-1')
    expect(wrapper.text()).toContain('Ana Pérez')
    expect(wrapper.text()).toContain('Bs 25,50')
    expect(wrapper.text()).toContain('—')
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
  })

  test('busca con los filtros y vuelve a la primera página', async () => {
    const wrapper = montar()
    await flushPromises()

    await wrapper.get('#filtro-operacion').setValue('VENTA')
    await wrapper.get('#filtro-usuario').setValue('2')
    await wrapper.findAll('button')
      .find((boton) => boton.text() === 'Buscar')
      .trigger('click')
    await flushPromises()

    expect(reportsMock.listarHistorial).toHaveBeenLastCalledWith({
      fechaInicio: '',
      fechaFin: '',
      tipo: 'VENTA',
      idUsuario: 2,
      pagina: 1,
      limite: 20
    })
  })

  test('limpia los filtros y recarga', async () => {
    const wrapper = montar()
    await flushPromises()

    await wrapper.get('#filtro-operacion').setValue('BAJA')
    await wrapper.findAll('button')
      .find((boton) => boton.text() === 'Limpiar')
      .trigger('click')
    await flushPromises()

    expect(reportsMock.listarHistorial).toHaveBeenLastCalledWith({
      fechaInicio: '',
      fechaFin: '',
      tipo: '',
      idUsuario: '',
      pagina: 1,
      limite: 20
    })
  })

  test('rechaza un rango de fechas invertido', async () => {
    const wrapper = montar()
    await flushPromises()

    const fechas = wrapper.findAll('input[type="date"]')
    await fechas[0].setValue('2026-12-31')
    await fechas[1].setValue('2026-01-01')
    await wrapper.findAll('button')
      .find((boton) => boton.text() === 'Buscar')
      .trigger('click')
    await flushPromises()

    expect(reportsMock.listarHistorial).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('La fecha inicial no puede ser posterior a la fecha final.')
  })

  test('navega a la página siguiente', async () => {
    const wrapper = montar()
    await flushPromises()

    await wrapper.findAll('button')
      .find((boton) => boton.text() === 'Siguiente')
      .trigger('click')
    await flushPromises()

    expect(reportsMock.listarHistorial).toHaveBeenLastCalledWith(
      expect.objectContaining({ pagina: 2 })
    )
  })

  test('muestra el estado vacío', async () => {
    reportsMock.listarHistorial.mockResolvedValue({
      ...historial(),
      total: 0,
      resumen: { VENTA: 0, RECEPCION: 0, BAJA: 0 },
      registros: []
    })
    const wrapper = montar()
    await flushPromises()

    expect(wrapper.text()).toContain('No hay operaciones para los filtros seleccionados.')
    expect(wrapper.text()).toContain('0')
  })

  test('traduce el error de sesión expirada', async () => {
    reportsMock.listarHistorial.mockRejectedValue({ status: 401 })
    const wrapper = montar()
    await flushPromises()

    expect(wrapper.text()).toContain('Tu sesión expiró. Inicia sesión nuevamente.')
  })

  test('tolera que falle la carga de usuarios', async () => {
    reportsMock.listarUsuariosHistorial.mockRejectedValue(new Error('sin permiso'))
    const wrapper = montar()
    await flushPromises()

    expect(reportsMock.listarHistorial).toHaveBeenCalledTimes(1)
    expect(wrapper.get('#filtro-usuario').text()).toContain('Todos los usuarios')
    expect(wrapper.get('#filtro-usuario').text()).not.toContain('ana')
  })
})
