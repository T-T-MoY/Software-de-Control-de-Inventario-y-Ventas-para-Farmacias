import { beforeEach, describe, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const { suppliersMock, sessionMock } = vi.hoisted(() => ({
  suppliersMock: {
    listarProveedores: vi.fn(),
    crearProveedor: vi.fn(),
    actualizarProveedor: vi.fn()
  },
  sessionMock: {
    obtenerSesion: vi.fn(() => ({ rol: 'Administrador' }))
  }
}))

vi.mock('../src/data/endpoints/suppliers', () => suppliersMock)
vi.mock('../src/business/session', () => sessionMock)

const SuppliersView = (await import('../src/presentation/views/SuppliersView.vue')).default

const proveedores = () => [
  {
    id_proveedor: 1,
    nombre_comercial: 'Distribuidora Andina',
    ruc_nit: '1234567890',
    telefono: '22233344',
    correo_electronico: 'ventas@andina.com',
    direccion: 'Av. Principal #123'
  },
  {
    id_proveedor: 2,
    nombre_comercial: 'Farmacéutica Sur',
    ruc_nit: '9876543210',
    telefono: null,
    correo_electronico: null,
    direccion: null
  }
]

const montar = () => mount(SuppliersView)

const abrirNuevo = async (wrapper) => {
  const boton = wrapper.findAll('button')
    .find((nodo) => nodo.text().includes('Nuevo proveedor'))
  await boton.trigger('click')
}

describe('vista de proveedores', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionMock.obtenerSesion.mockReturnValue({ rol: 'Administrador' })
    suppliersMock.listarProveedores.mockResolvedValue(proveedores())
    suppliersMock.crearProveedor.mockResolvedValue({})
    suppliersMock.actualizarProveedor.mockResolvedValue({})
  })

  test('carga los proveedores y sus estadísticas', async () => {
    const wrapper = montar()
    await flushPromises()

    expect(wrapper.text()).toContain('Distribuidora Andina')
    expect(wrapper.text()).toContain('Farmacéutica Sur')
    expect(wrapper.text()).toContain('No registrado')
    expect(wrapper.text()).toContain('No registrada')
    expect(wrapper.findAll('.stat-card')).toHaveLength(4)
    expect(wrapper.find('[title="Editar proveedor"]').exists()).toBe(true)
  })

  test('busca y limpia la búsqueda', async () => {
    const wrapper = montar()
    await flushPromises()

    await wrapper.get('#buscar-proveedores').setValue('andina')
    expect(wrapper.text()).toContain('Distribuidora Andina')
    expect(wrapper.text()).not.toContain('Farmacéutica Sur')

    const limpiar = wrapper.findAll('button')
      .find((nodo) => nodo.text().includes('Limpiar'))
    await limpiar.trigger('click')

    expect(wrapper.get('#buscar-proveedores').element.value).toBe('')
    expect(wrapper.text()).toContain('Farmacéutica Sur')
  })

  test('valida el formulario antes de guardar', async () => {
    const wrapper = montar()
    await flushPromises()
    await abrirNuevo(wrapper)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(suppliersMock.crearProveedor).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Revisa los campos marcados antes de guardar.')
  })

  test('crea un proveedor normalizando los campos vacíos', async () => {
    const wrapper = montar()
    await flushPromises()
    await abrirNuevo(wrapper)

    await wrapper.get('#proveedor-nombre').setValue('  Nuevo Proveedor  ')
    await wrapper.get('#proveedor-ruc').setValue(' 555666777 ')
    await wrapper.get('#proveedor-correo').setValue(' Contacto@Proveedor.com ')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(suppliersMock.crearProveedor).toHaveBeenCalledWith({
      nombre_comercial: 'Nuevo Proveedor',
      ruc_nit: '555666777',
      telefono: null,
      correo_electronico: 'contacto@proveedor.com',
      direccion: null
    })
    expect(wrapper.text()).toContain('Proveedor registrado correctamente.')
  })

  test('edita un proveedor existente', async () => {
    const wrapper = montar()
    await flushPromises()

    await wrapper.get('[title="Editar proveedor"]').trigger('click')
    await wrapper.get('#proveedor-nombre').setValue('Distribuidora Andina SRL')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(suppliersMock.actualizarProveedor).toHaveBeenCalledWith(1, expect.objectContaining({
      nombre_comercial: 'Distribuidora Andina SRL',
      telefono: '22233344'
    }))
    expect(wrapper.text()).toContain('Proveedor actualizado correctamente.')
  })

  test('oculta las acciones cuando el rol no puede gestionar', async () => {
    sessionMock.obtenerSesion.mockReturnValue({ rol: 'Ventas' })
    const wrapper = montar()
    await flushPromises()

    expect(wrapper.find('[title="Editar proveedor"]').exists()).toBe(false)
    expect(wrapper.findAll('button')
      .some((nodo) => nodo.text().includes('Nuevo proveedor'))).toBe(false)
  })

  test('traduce el error de permisos', async () => {
    suppliersMock.listarProveedores.mockRejectedValue({ status: 403 })
    const wrapper = montar()
    await flushPromises()

    expect(wrapper.text()).toContain('No tienes permiso para gestionar proveedores.')
  })

  test('trata como vacía una respuesta que no es arreglo', async () => {
    suppliersMock.listarProveedores.mockResolvedValue(null)
    const wrapper = montar()
    await flushPromises()

    expect(wrapper.text()).toContain('No hay proveedores registrados.')
  })
})
