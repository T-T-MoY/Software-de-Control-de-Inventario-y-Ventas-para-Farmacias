import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('../src/data/endpoints/alerts', () => ({
  obtenerContadoresAlertas: vi.fn(),
}))

vi.mock('../src/business/session', () => ({
  estaAutenticado: vi.fn(),
}))

import { obtenerContadoresAlertas } from '../src/data/endpoints/alerts'
import { estaAutenticado } from '../src/business/session'
import { useAlertMonitor } from '../src/presentation/composables/useAlertMonitor'

const resumen = (porVencer = 0, vencidos = 0, reponer = 0) => ({
  resumen: {
    total_lotes_por_vencer: porVencer,
    total_lotes_vencidos: vencidos,
    total_medicamentos_por_reponer: reponer,
  },
})

describe('monitor global de alertas', () => {
  const monitor = useAlertMonitor()

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    sessionStorage.clear()
    monitor.detenerMonitor()
    estaAutenticado.mockReturnValue(true)
    obtenerContadoresAlertas.mockResolvedValue(resumen())
  })

  afterEach(() => {
    monitor.detenerMonitor()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  test('inicia con contadores en cero', () => {
    expect(monitor.totales.value).toEqual({
      porVencer: 0,
      vencidos: 0,
      reponer: 0,
      total: 0,
    })
    expect(monitor.cargado.value).toBe(false)
    expect(monitor.error.value).toBe('')
    expect(monitor.aviso.value).toBe('')
    expect(monitor.modalAbierto.value).toBe(false)
  })

  test('no consulta si no hay sesión', async () => {
    estaAutenticado.mockReturnValue(false)

    await monitor.refrescar()

    expect(obtenerContadoresAlertas).not.toHaveBeenCalled()
    expect(monitor.cargado.value).toBe(false)
  })

  test('carga los contadores y calcula el total', async () => {
    obtenerContadoresAlertas.mockResolvedValue(resumen(2, 3, 4))

    await monitor.refrescar()

    expect(monitor.cargado.value).toBe(true)
    expect(monitor.totales.value).toEqual({
      porVencer: 2,
      vencidos: 3,
      reponer: 4,
      total: 9,
    })
    expect(monitor.error.value).toBe('')
  })

  test('abre el modal crítico en la primera carga con vencidos', async () => {
    obtenerContadoresAlertas.mockResolvedValue(resumen(0, 2, 0))

    await monitor.refrescar()

    expect(monitor.modalAbierto.value).toBe(true)

    monitor.cerrarModal()

    expect(monitor.modalAbierto.value).toBe(false)
    expect(sessionStorage.getItem('alertasVencidosAvisados')).toBe('1')
  })

  test('no abre el modal si ya se avisó en la sesión', async () => {
    sessionStorage.setItem('alertasVencidosAvisados', '1')
    obtenerContadoresAlertas.mockResolvedValue(resumen(0, 2, 0))

    await monitor.refrescar()

    expect(monitor.modalAbierto.value).toBe(false)
  })

  test('no abre el modal sin lotes vencidos', async () => {
    obtenerContadoresAlertas.mockResolvedValue(resumen(5, 0, 2))

    await monitor.refrescar()

    expect(monitor.modalAbierto.value).toBe(false)
  })

  test('avisa cuando aumentan las alertas después de la primera carga', async () => {
    obtenerContadoresAlertas.mockResolvedValueOnce(resumen(0, 0, 0))

    await monitor.refrescar()
    expect(monitor.aviso.value).toBe('')

    obtenerContadoresAlertas.mockResolvedValueOnce(resumen(1, 2, 3))

    await monitor.refrescar()

    expect(monitor.aviso.value).toBe(
      'Nuevas alertas de inventario: 2 lotes vencidos, 1 lote próximo a vencer, 3 medicamentos por reponer.'
    )
  })

  test('usa el singular para una sola alerta nueva', async () => {
    obtenerContadoresAlertas.mockResolvedValueOnce(resumen(0, 0, 0))
    await monitor.refrescar()

    obtenerContadoresAlertas.mockResolvedValueOnce(resumen(0, 1, 0))
    await monitor.refrescar()

    expect(monitor.aviso.value).toBe(
      'Nuevas alertas de inventario: 1 lote vencido.'
    )
  })

  test('no avisa si el total no aumenta', async () => {
    obtenerContadoresAlertas.mockResolvedValueOnce(resumen(1, 1, 1))
    await monitor.refrescar()

    obtenerContadoresAlertas.mockResolvedValueOnce(resumen(1, 1, 1))
    await monitor.refrescar()

    expect(monitor.aviso.value).toBe('')
  })

  test('limpiarAviso borra el aviso temporal', async () => {
    obtenerContadoresAlertas.mockResolvedValueOnce(resumen())
    await monitor.refrescar()
    obtenerContadoresAlertas.mockResolvedValueOnce(resumen(0, 1, 0))
    await monitor.refrescar()

    monitor.limpiarAviso()

    expect(monitor.aviso.value).toBe('')
  })

  test('registra el error de consulta sin detener el monitor', async () => {
    obtenerContadoresAlertas.mockRejectedValue({
      message: 'Falla de red',
      status: 500,
    })

    await monitor.refrescar()

    expect(monitor.error.value).toBe('Falla de red')
    expect(monitor.cargado.value).toBe(false)
  })

  test('usa un mensaje genérico cuando el error no trae texto', async () => {
    obtenerContadoresAlertas.mockRejectedValue({})

    await monitor.refrescar()

    expect(monitor.error.value)
      .toBe('No se pudieron consultar las alertas.')
  })

  test('detiene el monitor y limpia el aviso ante un 401', async () => {
    sessionStorage.setItem('alertasVencidosAvisados', '1')
    obtenerContadoresAlertas.mockRejectedValue({
      message: 'Sesión vencida',
      status: 401,
    })

    await monitor.refrescar()

    expect(monitor.totales.value.total).toBe(0)
    expect(monitor.cargado.value).toBe(false)
    expect(monitor.error.value).toBe('')
    expect(sessionStorage.getItem('alertasVencidosAvisados')).toBeNull()
  })

  test('sincroniza los contadores sin avisar ni abrir el modal', async () => {
    monitor.sincronizarConResumen(resumen(2, 1, 3))

    expect(monitor.totales.value).toEqual({
      porVencer: 2,
      vencidos: 1,
      reponer: 3,
      total: 6,
    })
    expect(monitor.aviso.value).toBe('')
    expect(monitor.modalAbierto.value).toBe(false)
  })

  test('al sincronizar cierra un modal abierto y marca el aviso', () => {
    obtenerContadoresAlertas.mockResolvedValue(resumen(0, 1, 0))

    return monitor.refrescar().then(() => {
      expect(monitor.modalAbierto.value).toBe(true)

      monitor.sincronizarConResumen({ resumen: {}, total: 0 })

      expect(monitor.modalAbierto.value).toBe(false)
      expect(sessionStorage.getItem('alertasVencidosAvisados')).toBe('1')
      expect(monitor.totales.value.total).toBe(0)
    })
  })

  test('tolera una respuesta sin resumen', async () => {
    obtenerContadoresAlertas.mockResolvedValue({})

    await monitor.refrescar()

    expect(monitor.totales.value.total).toBe(0)
    expect(monitor.cargado.value).toBe(true)
  })

  test('no inicia el intervalo sin sesión', async () => {
    estaAutenticado.mockReturnValue(false)

    monitor.iniciarMonitor()
    await vi.advanceTimersByTimeAsync(60000)

    expect(obtenerContadoresAlertas).not.toHaveBeenCalled()
  })

  test('inicia un único intervalo y consulta cada minuto', async () => {
    monitor.iniciarMonitor()
    await vi.advanceTimersByTimeAsync(0)

    expect(obtenerContadoresAlertas).toHaveBeenCalledTimes(1)

    monitor.iniciarMonitor()
    await vi.advanceTimersByTimeAsync(60000)

    expect(obtenerContadoresAlertas).toHaveBeenCalledTimes(2)

    monitor.detenerMonitor()
    await vi.advanceTimersByTimeAsync(60000)

    expect(obtenerContadoresAlertas).toHaveBeenCalledTimes(2)
    expect(monitor.cargado.value).toBe(false)
  })

  test('soporta la ausencia de sessionStorage', async () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('sin storage')
      })
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('sin storage')
      })
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem')
      .mockImplementation(() => {
        throw new Error('sin storage')
      })

    obtenerContadoresAlertas.mockResolvedValue(resumen(0, 1, 0))

    await monitor.refrescar()

    expect(monitor.modalAbierto.value).toBe(true)
    expect(() => monitor.cerrarModal()).not.toThrow()
    expect(() => monitor.detenerMonitor()).not.toThrow()

    getItem.mockRestore()
    setItem.mockRestore()
    removeItem.mockRestore()
  })
})
