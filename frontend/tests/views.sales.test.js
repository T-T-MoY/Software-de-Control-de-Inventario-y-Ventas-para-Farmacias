import { beforeEach, describe, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// 1. Mockear endpoints, parámetros y dependencias
const { salesMock, parametersMock } = vi.hoisted(() => ({
  salesMock: {
    listarClientes: vi.fn(),
    listarCatalogoVenta: vi.fn(),
    crearVenta: vi.fn(),
    crearCliente: vi.fn()
  },
  parametersMock: {
    obtenerParametros: vi.fn()
  }
}))

vi.mock('../src/data/endpoints/sales', () => salesMock)
vi.mock('../src/data/endpoints/parameters', () => parametersMock)
vi.mock('../src/data/api', () => ({ apiAssetUrl: vi.fn((url) => url) }))
vi.mock('../src/presentation/validators/fields', () => ({
  validarCi: vi.fn(() => ''),
  validarNombre: vi.fn(() => '')
}))
vi.mock('../src/components/SaleReceipt.vue', () => ({
  default: { template: '<div data-test="receipt">Comprobante</div>' }
}))

const SalesView = (await import('../src/presentation/views/SalesView.vue')).default

const mockClientes = () => [
  { id_cliente: 1, nombres: 'Consumidor', apellido_paterno: 'Final', apellido_materno: '', ci_nit: '00000' },
  { id_cliente: 2, nombres: 'Luis', apellido_paterno: 'Gómez', apellido_materno: '', ci_nit: '87654321' }
]

const mockProductos = () => [
  { id_medicamento: 1, nombre_comercial: 'Dolofin', dci: 'Paracetamol', precio_unitario: 2, stock_disponible: 50, tipo_venta: 'Con receta' }
]

describe('vista de punto de venta', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    salesMock.listarClientes.mockResolvedValue(mockClientes())
    salesMock.listarCatalogoVenta.mockResolvedValue(mockProductos())
    parametersMock.obtenerParametros.mockResolvedValue({ farmacia: { nombre: 'Farmacia Test' } })
  })

  test('carga la vista y selecciona Consumidor Final por defecto', async () => {
    const wrapper = mount(SalesView)
    await flushPromises()

    expect(wrapper.find('.sale-product-option').text()).toContain('Con receta')

    expect(salesMock.listarClientes).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Consumidor Final')
    expect(wrapper.text()).toContain('Venta rápida')
    expect(salesMock.listarCatalogoVenta).toHaveBeenCalledTimes(1)
  })

  test('permite buscar y agregar un producto al carrito', async () => {
    const wrapper = mount(SalesView)
    await flushPromises()

    // Agregamos el producto con el botón "+" de la tarjeta
    const botonAgregar = wrapper.findAll('.sale-product-add')[0]
    await botonAgregar.trigger('click')

    // Verificamos que el carrito ahora tenga el producto y el total cambie
    expect(wrapper.text()).toContain('1 productos')
    expect(wrapper.text()).toContain('Bs 2.00')
    expect(wrapper.text()).toContain('Receta')
    // El botón pasa de "+" a tick verde
    expect(wrapper.find('.sale-product-add').classes()).toContain('is-added')
    expect(wrapper.find('.sale-product-add i').classes()).toContain('fa-check')
  })

  test('agrega el primer resultado al presionar Enter en el buscador', async () => {
    const wrapper = mount(SalesView)
    await flushPromises()

    const buscador = wrapper.get('#buscar-producto')
    await buscador.setValue('dolo')
    await buscador.trigger('keydown', { key: 'Enter' })

    expect(wrapper.text()).toContain('1 productos')
    expect(wrapper.find('.sale-product-add').classes()).toContain('is-added')
    expect(wrapper.find('.sale-product-add i').classes()).toContain('fa-check')
  })

  test('no muestra clientes por coincidencias internas del nombre', async () => {
    const wrapper = mount(SalesView)
    await flushPromises()

    await wrapper.get('#buscar-cliente-venta').setValue('uis')

    expect(wrapper.find('#cliente-sugerencias').text()).not.toContain('Luis Gómez')
  })

  test('permite buscar clientes con varias palabras', async () => {
    const wrapper = mount(SalesView)
    await flushPromises()

    await wrapper.get('#buscar-cliente-venta').setValue('luis gó')

    expect(wrapper.find('#cliente-sugerencias').text()).toContain('Luis Gómez')
  })
})