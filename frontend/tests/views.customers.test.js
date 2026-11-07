import { beforeEach, describe, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { RouterLinkStub } from './helpers/stubs'

const { salesMock } = vi.hoisted(() => ({
  salesMock: {
    listarClientes: vi.fn(),
    crearCliente: vi.fn(),
    actualizarCliente: vi.fn()
  }
}))

vi.mock('../src/data/endpoints/sales', () => salesMock)

const CustomersView = (await import('../src/presentation/views/CustomersView.vue')).default

const clientesBase = () => [
  { id_cliente: 1, nombres: 'Cliente General', apellido_paterno: '', ci_nit: '00000' },
  { id_cliente: 2, nombres: 'Ana', apellido_paterno: 'Pérez', apellido_materno: 'Rojas', ci_nit: '12345678' },
  { id_cliente: 3, nombres: 'Luis', apellido_paterno: 'Gómez', ci_nit: '87654321' },
]

const montar = () => mount(CustomersView, {
  global: { stubs: { RouterLink: RouterLinkStub } }
})

describe('vista de clientes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    salesMock.listarClientes.mockResolvedValue(clientesBase())
  })

  test('carga y muestra los clientes sin el consumidor final', async () => {
    const wrapper = montar()
    await flushPromises()

    expect(salesMock.listarClientes).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Ana Pérez Rojas')
    expect(wrapper.text()).toContain('Luis Gómez')
    expect(wrapper.text()).not.toContain('Cliente General')
    expect(wrapper.text()).toContain('2 cliente(s)')
  })

  test('filtra por nombre o documento', async () => {
    const wrapper = montar()
    await flushPromises()

    await wrapper.get('#buscar-cliente').setValue('8765')

    expect(wrapper.text()).toContain('Luis Gómez')
    expect(wrapper.text()).not.toContain('Ana Pérez')
    expect(wrapper.text()).toContain('1 cliente(s)')
  })

  test('muestra el estado vacío según la búsqueda', async () => {
    const wrapper = montar()
    await flushPromises()

    await wrapper.get('#buscar-cliente').setValue('inexistente')

    expect(wrapper.text()).toContain('No hay resultados para la búsqueda.')
  })

  test('valida el formulario antes de crear un cliente', async () => {
    const wrapper = montar()
    await flushPromises()

    const nuevo = wrapper.findAll('button')
      .find((boton) => boton.text().includes('Nuevo cliente'))
    await nuevo.trigger('click')
    await flushPromises()

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('#cliente-modal-title').exists()).toBe(true)
    expect(wrapper.text()).toContain('Los nombres es obligatorio.')
    expect(salesMock.crearCliente).not.toHaveBeenCalled()
  })

  test('crea un cliente recortando los espacios', async () => {
    salesMock.crearCliente.mockResolvedValue({})
    const wrapper = montar()
    await flushPromises()

    const nuevo = wrapper.findAll('button')
      .find((boton) => boton.text().includes('Nuevo cliente'))
    await nuevo.trigger('click')
    await wrapper.get('#cliente-nombres').setValue('  Carla  ')
    await wrapper.get('#cliente-ci-nit').setValue(' 55566677 ')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(salesMock.crearCliente).toHaveBeenCalledWith({
      nombres: 'Carla',
      apellido_paterno: '',
      apellido_materno: '',
      ci_nit: '55566677'
    })
    expect(wrapper.text()).toContain('Cliente registrado correctamente.')
    expect(salesMock.listarClientes).toHaveBeenCalledTimes(2)
  })

  test('edita un cliente existente', async () => {
    salesMock.actualizarCliente.mockResolvedValue({})
    const wrapper = montar()
    await flushPromises()

    const editar = wrapper.findAll('button')
      .find((boton) => boton.text().trim() === 'Editar')
    await editar.trigger('click')
    await wrapper.get('#cliente-nombres').setValue('Ana María')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(salesMock.actualizarCliente).toHaveBeenCalledWith(2, expect.objectContaining({
      nombres: 'Ana María',
      ci_nit: '12345678'
    }))
    expect(wrapper.text()).toContain('Cliente actualizado correctamente.')
  })

  test('muestra el error de carga', async () => {
    salesMock.listarClientes.mockRejectedValue({ message: 'Sin conexión' })
    const wrapper = montar()
    await flushPromises()

    expect(wrapper.text()).toContain('Sin conexión')
    expect(wrapper.text()).toContain('No fue posible cargar la lista de clientes.')
  })
})
