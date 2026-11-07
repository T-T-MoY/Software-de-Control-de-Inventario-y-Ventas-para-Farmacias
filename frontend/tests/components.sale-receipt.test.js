import { afterEach, describe, expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SaleReceipt from '../src/presentation/components/SaleReceipt.vue'

const ventaCompleta = () => ({
  numero: 'V-1',
  fecha: '2026-11-05T14:30:00',
  cliente: 'Ana Pérez',
  usuario: 'Luis Ventas',
  tipoComprobante: 'Factura',
  numSerie: 'F-001',
  items: [
    { cantidad: 2, descripcion: 'Paracetamol', precioUnitario: 2.5, subtotal: 5 },
    { cantidad: 1, descripcion: 'Ibuprofeno', precioUnitario: 3, subtotal: 3 },
  ],
  subtotal: 8,
  descuento: 1,
  total: 7,
  montoRecibido: 10,
  cambio: 3,
})

const montar = (props = {}) => mount(SaleReceipt, {
  props: {
    farmacia: {
      nombre: 'Farmacia Central',
      nit: '1234567890',
      direccion: 'Av. Principal #123',
      telefono: '22233344',
    },
    venta: ventaCompleta(),
    ...props,
  },
})

describe('comprobante de venta', () => {
  afterEach(() => {
    document.body.className = ''
    vi.restoreAllMocks()
  })

  test('muestra los datos de la farmacia y de la venta', () => {
    const wrapper = montar()

    expect(wrapper.text()).toContain('Farmacia Central')
    expect(wrapper.text()).toContain('NIT: 1234567890')
    expect(wrapper.text()).toContain('Av. Principal #123')
    expect(wrapper.text()).toContain('Tel.: 22233344')
    expect(wrapper.text()).toContain('Factura')
    expect(wrapper.text()).toContain('N.º F-001')
    expect(wrapper.text()).toContain('Ana Pérez')
    expect(wrapper.text()).toContain('Luis Ventas')
  })

  test('muestra los productos con importes y totales', () => {
    const wrapper = montar()

    expect(wrapper.text()).toContain('Paracetamol')
    expect(wrapper.text()).toContain('Bs 2.50 c/u')
    expect(wrapper.text()).toContain('Bs 5.00')
    expect(wrapper.text()).toContain('Subtotal')
    expect(wrapper.text()).toContain('Bs 8.00')
    expect(wrapper.text()).toContain('Descuento')
    expect(wrapper.text()).toContain('- Bs 1.00')
    expect(wrapper.text()).toContain('Bs 7.00')
    expect(wrapper.text()).toContain('Bs 10.00')
    expect(wrapper.text()).toContain('Bs 3.00')
  })

  test('usa los nombres alternativos del backend', () => {
    const wrapper = montar({
      venta: {
        fecha_emision: '2026-01-01',
        tipo_comprobante: 'Nota de venta',
        num_serie: 'NV-9',
        detalles: [
          { cantidad: 2, nombre_comercial: 'Zinc', precio_unitario: 4 },
        ],
        subtotal_monto: 8,
        descuento_monto: 2,
        monto_recibido: 10,
      },
    })

    expect(wrapper.text()).toContain('Nota de venta')
    expect(wrapper.text()).toContain('N.º NV-9')
    expect(wrapper.text()).toContain('Zinc')
    expect(wrapper.text()).toContain('Bs 4.00 c/u')
    expect(wrapper.text()).toContain('Bs 6.00')
  })

  test('calcula subtotal, total y cambio cuando no vienen en la venta', () => {
    const wrapper = montar({
      venta: {
        items: [
          { cantidad: 2, descripcion: 'A', precio_unitario: 1.5 },
          { cantidad: 1, descripcion: 'B', precio_unitario: 4 },
        ],
        monto_recibido: 10,
      },
    })

    expect(wrapper.text()).toContain('Bs 7.00')
    expect(wrapper.text()).toContain('Bs 3.00')
    expect(wrapper.text()).toContain('Cambio')
  })

  test('muestra el estado vacío sin productos', () => {
    const wrapper = montar({ venta: { items: [] } })

    expect(wrapper.text()).toContain('Sin productos registrados.')
    expect(wrapper.text()).toContain('Bs 0.00')
  })

  test('usa FARMACIA y Nota de venta por defecto', () => {
    const wrapper = montar({ farmacia: {}, venta: { items: [] } })

    expect(wrapper.get('.receipt-title').text()).toBe('FARMACIA')
    expect(wrapper.text()).toContain('Nota de venta')
    expect(wrapper.text()).not.toContain('NIT:')
  })

  test('conserva una fecha con formato desconocido', () => {
    const wrapper = montar({
      venta: { ...ventaCompleta(), fecha: 'sin-fecha' },
    })

    expect(wrapper.text()).toContain('sin-fecha')
  })

  test('no muestra el cambio si no se recibió dinero', () => {
    const wrapper = montar({
      venta: { items: [], total: 0 },
    })

    expect(wrapper.text()).not.toContain('Recibido')
    expect(wrapper.text()).not.toContain('Cambio')
  })

  test('oculta las acciones cuando mostrarAcciones es false', () => {
    const wrapper = montar({ mostrarAcciones: false })

    expect(wrapper.find('.receipt-actions').exists()).toBe(false)
  })

  test('imprime y limpia la clase temporal al terminar', async () => {
    const imprimir = vi.fn()
    vi.stubGlobal('print', imprimir)
    const wrapper = montar()

    await wrapper.get('.receipt-actions button').trigger('click')

    expect(document.body.classList.contains('printing-receipt')).toBe(true)
    expect(imprimir).toHaveBeenCalledTimes(1)

    window.dispatchEvent(new Event('afterprint'))

    expect(document.body.classList.contains('printing-receipt')).toBe(false)
    vi.unstubAllGlobals()
  })
})
