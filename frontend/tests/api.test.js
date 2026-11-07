import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  apiAssetUrl,
  apiRequest,
  apiDownload,
} from '../src/data/api'

const respuesta = (cuerpo, { ok = true, status = 200 } = {}) => ({
  ok,
  status,
  json: vi.fn().mockResolvedValue(cuerpo),
  blob: vi.fn().mockResolvedValue(new Blob(['archivo'])),
})

describe('cliente HTTP del frontend', () => {
  let fetchMock

  beforeEach(() => {
    localStorage.clear()
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('apiAssetUrl', () => {
    test('resuelve una ruta contra la URL base', () => {
      expect(apiAssetUrl('/uploads/foto.png'))
        .toBe('http://localhost:3000/uploads/foto.png')
    })
  })

  describe('apiRequest', () => {
    test('envía una petición JSON sin token', async () => {
      fetchMock.mockResolvedValue(respuesta({ ok: true }))

      await expect(apiRequest('/api/datos', {
        method: 'POST',
        body: JSON.stringify({ a: 1 }),
      })).resolves.toEqual({ ok: true })

      const [url, opciones] = fetchMock.mock.calls[0]
      expect(url).toBe('http://localhost:3000/api/datos')
      expect(opciones.method).toBe('POST')
      expect(opciones.headers.get('Content-Type')).toBe('application/json')
      expect(opciones.headers.get('Authorization')).toBeNull()
    })

    test('agrega el token y respeta un cuerpo FormData', async () => {
      localStorage.setItem('tokenSession', 'token-123')
      fetchMock.mockResolvedValue(respuesta({ ok: true }))
      const datos = new FormData()

      await apiRequest('/api/foto', { method: 'POST', body: datos })

      const [, opciones] = fetchMock.mock.calls[0]
      expect(opciones.headers.get('Authorization')).toBe('Bearer token-123')
      expect(opciones.headers.get('Content-Type')).toBeNull()
    })

    test('lanza un error con el mensaje del backend', async () => {
      fetchMock.mockResolvedValue(respuesta(
        { error: 'No autorizado', codigo: 'NO_AUTORIZADO' },
        { ok: false, status: 401 }
      ))

      await expect(apiRequest('/api/privado')).rejects.toMatchObject({
        message: 'No autorizado',
        status: 401,
        codigo: 'NO_AUTORIZADO',
      })
    })

    test('usa data.mensaje cuando no hay data.error', async () => {
      fetchMock.mockResolvedValue(respuesta(
        { mensaje: 'Fallo de validación' },
        { ok: false, status: 400 }
      ))

      await expect(apiRequest('/api/datos')).rejects.toMatchObject({
        message: 'Fallo de validación',
        status: 400,
      })
    })

    test('usa un mensaje genérico si el backend no informa el error', async () => {
      fetchMock.mockResolvedValue(respuesta(
        {},
        { ok: false, status: 500 }
      ))

      await expect(apiRequest('/api/datos')).rejects.toMatchObject({
        message: 'La solicitud no pudo completarse.',
        status: 500,
      })
    })
  })

  describe('apiDownload', () => {
    test('descarga un archivo enviando el token', async () => {
      localStorage.setItem('tokenSession', 'token-123')
      fetchMock.mockResolvedValue(respuesta({}, { status: 200 }))

      const blob = await apiDownload('/api/reportes/ventas/exportar')

      expect(blob).toBeInstanceOf(Blob)
      const [, opciones] = fetchMock.mock.calls[0]
      expect(opciones.headers.get('Authorization')).toBe('Bearer token-123')
    })

    test('descarga sin token cuando no hay sesión', async () => {
      fetchMock.mockResolvedValue(respuesta({}, { status: 200 }))

      await apiDownload('/api/reportes/ventas/exportar')

      const [, opciones] = fetchMock.mock.calls[0]
      expect(opciones.headers.get('Authorization')).toBeNull()
    })

    test('lanza el error JSON del backend', async () => {
      fetchMock.mockResolvedValue(respuesta(
        { error: 'Reporte inválido' },
        { ok: false, status: 400 }
      ))

      await expect(apiDownload('/api/reportes/x/exportar'))
        .rejects.toMatchObject({
          message: 'Reporte inválido',
          status: 400,
        })
    })

    test('usa un mensaje genérico si la respuesta no es JSON', async () => {
      const sinJson = respuesta({}, { ok: false, status: 500 })
      sinJson.json.mockRejectedValue(new Error('sin JSON'))
      fetchMock.mockResolvedValue(sinJson)

      await expect(apiDownload('/api/reportes/x/exportar'))
        .rejects.toMatchObject({
          message: 'No se pudo generar el archivo.',
          status: 500,
        })
    })
  })
})
