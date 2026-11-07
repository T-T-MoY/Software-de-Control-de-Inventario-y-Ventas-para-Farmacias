import { beforeEach, describe, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// 1. Mockear endpoints de medicamentos, parámetros y sesión
const { medicinesMock, parametersMock, sessionMock } = vi.hoisted(() => ({
  medicinesMock: {
    listarMedicamentos: vi.fn(),
    listarCategorias: vi.fn(),
    crearMedicamento: vi.fn(),
    actualizarMedicamento: vi.fn(),
    cambiarEstadoMedicamento: vi.fn(),
    eliminarMedicamentoLogico: vi.fn(),
    subirFotoMedicamento: vi.fn(),
    eliminarFotoMedicamento: vi.fn()
  },
  parametersMock: {
    obtenerParametros: vi.fn()
  },
  sessionMock: {
    puedeGestionarCatalogo: vi.fn(() => true)
  }
}))

vi.mock('../src/data/endpoints/medicines', () => medicinesMock)
vi.mock('../src/data/endpoints/parameters', () => parametersMock)
vi.mock('../src/business/session', () => sessionMock)
vi.mock('../src/data/api', () => ({ apiAssetUrl: vi.fn((url) => url) }))

const MedicinesView = (await import('../src/presentation/views/MedicinesView.vue')).default

const mockMedicamentos = () => [
  { id_medicamento: 1, codigo_barras: '111', nombre_comercial: 'Dolofin', dci: 'Paracetamol', concentracion: '500mg', forma_farmaceutica: 'Tableta', precio_unitario: 2, tipo_venta: 'Libre', stock_seguridad: 10, dias_reposicion: 5, id_categoria: 1, nombre_categoria: 'Analgésicos', estado_medicamento: 'Activo', stock_vigente: 50, foto_url: '' },
  { id_medicamento: 2, codigo_barras: '222', nombre_comercial: 'Amoxil', dci: 'Amoxicilina', concentracion: '500mg', forma_farmaceutica: 'Cápsula', precio_unitario: 5, tipo_venta: 'Con receta', stock_seguridad: 5, dias_reposicion: 3, id_categoria: 2, nombre_categoria: 'Antibióticos', estado_medicamento: 'Inactivo', stock_vigente: 0, foto_url: '' }
]

describe('vista de medicamentos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    medicinesMock.listarMedicamentos.mockResolvedValue(mockMedicamentos())
    medicinesMock.listarCategorias.mockResolvedValue([{ id_categoria: 1, nombre_categoria: 'Analgésicos' }])
    parametersMock.obtenerParametros.mockResolvedValue({ stockSeguridad: 10, diasReposicion: 5 })
  })

  test('carga y muestra las tarjetas de medicamentos', async () => {
    const wrapper = mount(MedicinesView)
    await flushPromises()

    expect(medicinesMock.listarMedicamentos).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Dolofin')
    expect(wrapper.text()).toContain('Amoxil')
    expect(wrapper.text()).toContain('Total registrados')
    expect(wrapper.text()).toContain('2')
  })

  test('filtra por búsqueda en el catálogo', async () => {
    const wrapper = mount(MedicinesView)
    await flushPromises()

    await wrapper.get('#buscar-medicamentos').setValue('Dolofin')
    expect(wrapper.text()).toContain('Dolofin')
    expect(wrapper.text()).not.toContain('Amoxil')
  })
})