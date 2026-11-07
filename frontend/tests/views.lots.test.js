import { beforeEach, describe, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// 1. Mockear todos los endpoints que usa LotsView
const { lotsMock, medicinesMock, suppliersMock, sessionMock } = vi.hoisted(() => ({
  lotsMock: {
    listarLotes: vi.fn(),
    registrarRecepcion: vi.fn(),
    darBajaLote: vi.fn()
  },
  medicinesMock: {
    listarMedicamentos: vi.fn()
  },
  suppliersMock: {
    listarProveedores: vi.fn()
  },
  sessionMock: {
    puedeGestionarCatalogo: vi.fn(() => true),
    esAdministrador: vi.fn(() => true)
  }
}))

vi.mock('../src/data/endpoints/lots', () => lotsMock)
vi.mock('../src/data/endpoints/medicines', () => medicinesMock)
vi.mock('../src/data/endpoints/suppliers', () => suppliersMock)
vi.mock('../src/business/session', () => sessionMock)

const LotsView = (await import('../src/presentation/views/LotsView.vue')).default

const mockLotes = () => [
  { id_lote: 1, lote_numero: 'L-001', medicamento: 'Paracetamol', codigo_barras: '123', proveedor: 'Farma', fecha_vencimiento: '2026-12-31', dias_para_vencer: 100, cantidad_stock: 50, costo_unitario: 2.5, estado_lote: 'Vigente' },
  { id_lote: 2, lote_numero: 'L-002', medicamento: 'Ibuprofeno', codigo_barras: '456', proveedor: 'Dist', fecha_vencimiento: '2023-01-01', dias_para_vencer: -10, cantidad_stock: 20, costo_unitario: 1.5, estado_lote: 'Vencido' }
]

describe('vista de lotes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    lotsMock.listarLotes.mockResolvedValue(mockLotes())
    medicinesMock.listarMedicamentos.mockResolvedValue([
      { id_medicamento: 1, nombre_comercial: 'Paracetamol', concentracion: '500mg', stock_vigente: 10 }
    ])
    suppliersMock.listarProveedores.mockResolvedValue([
      { id_proveedor: 1, nombre_comercial: 'Farma' }
    ])
  })

  test('carga y muestra los lotes correctamente', async () => {
    const wrapper = mount(LotsView)
    await flushPromises()

    expect(lotsMock.listarLotes).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('L-001')
    expect(wrapper.text()).toContain('Paracetamol')
    expect(wrapper.text()).toContain('Vencido')
  })

  test('muestra el estado vacío si no hay lotes', async () => {
    lotsMock.listarLotes.mockResolvedValueOnce([])
    const wrapper = mount(LotsView)
    await flushPromises()

    expect(wrapper.text()).toContain('No hay lotes registrados.')
  })

  test('filtra por estado de lote', async () => {
    const wrapper = mount(LotsView)
    await flushPromises()

    const select = wrapper.get('#filtro-lote-estado')
    await select.setValue('Vencido')

    expect(wrapper.text()).toContain('L-002')
    expect(wrapper.text()).not.toContain('L-001')
  })
})