import { beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('../src/data/api', () => ({
  apiRequest: vi.fn(),
  apiDownload: vi.fn(),
}))

import { apiRequest, apiDownload } from '../src/data/api'
import {
  obtenerResumenAlertas,
  obtenerContadoresAlertas,
  listarLotesPorVencer,
  listarLotesVencidos,
  listarMedicamentosPorReponer,
} from '../src/data/endpoints/alerts'
import { iniciarSesion } from '../src/data/endpoints/auth'
import {
  listarLotes,
  obtenerLote,
  registrarRecepcion,
  darBajaLote,
} from '../src/data/endpoints/lots'
import {
  listarMedicamentos,
  listarCategorias,
  crearMedicamento,
  actualizarMedicamento,
  cambiarEstadoMedicamento,
  eliminarMedicamentoLogico,
  subirFotoMedicamento,
  eliminarFotoMedicamento,
} from '../src/data/endpoints/medicines'
import {
  obtenerParametros,
  actualizarParametros,
} from '../src/data/endpoints/parameters'
import {
  obtenerPerfil,
  cambiarContrasena,
} from '../src/data/endpoints/profile'
import {
  obtenerReporte,
  descargarReporte,
  listarHistorial,
  listarUsuariosHistorial,
} from '../src/data/endpoints/reports'
import {
  listarCatalogoVenta,
  crearVenta,
  listarClientes,
  crearCliente,
  actualizarCliente,
} from '../src/data/endpoints/sales'
import {
  listarProveedores,
  obtenerProveedor,
  crearProveedor,
  actualizarProveedor,
} from '../src/data/endpoints/suppliers'
import {
  listarUsuarios,
  listarRoles,
  crearUsuario,
  actualizarUsuario,
  cambiarEstadoUsuario,
  obtenerImpactoUsuario,
  eliminarUsuarioLogico,
} from '../src/data/endpoints/users'

const ultimaLlamada = () => apiRequest.mock.calls.at(-1)

describe('endpoints del frontend', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiRequest.mockResolvedValue({ ok: true })
    apiDownload.mockResolvedValue(new Blob())
  })

  test('alertas consulta todas sus rutas', async () => {
    await obtenerResumenAlertas()
    expect(ultimaLlamada()).toEqual(['/api/alertas/resumen'])

    await obtenerContadoresAlertas()
    expect(ultimaLlamada()).toEqual(['/api/alertas/contadores'])

    await listarLotesPorVencer()
    expect(ultimaLlamada()).toEqual(['/api/alertas/vencimientos/proximos'])

    await listarLotesVencidos()
    expect(ultimaLlamada()).toEqual(['/api/alertas/vencimientos/vencidos'])

    await listarMedicamentosPorReponer()
    expect(ultimaLlamada()).toEqual(['/api/alertas/reorden'])
  })

  test('auth inicia sesión con correo y contraseña', async () => {
    await iniciarSesion({ email: 'ana@test.com', password: 'Clave123' })

    expect(ultimaLlamada()).toEqual([
      '/api/login',
      {
        method: 'POST',
        body: JSON.stringify({
          email: 'ana@test.com',
          password: 'Clave123',
        }),
      },
    ])
  })

  test('lotes lista con y sin búsqueda y gestiona recepciones y bajas', async () => {
    await listarLotes()
    expect(ultimaLlamada()).toEqual(['/api/lotes'])

    await listarLotes({ buscar: 'L-2026' })
    expect(ultimaLlamada()).toEqual(['/api/lotes?buscar=L-2026'])

    await obtenerLote(4)
    expect(ultimaLlamada()).toEqual(['/api/lotes/4'])

    await registrarRecepcion({ lote_numero: 'L-1' })
    expect(ultimaLlamada()).toEqual([
      '/api/lotes/recepciones',
      {
        method: 'POST',
        body: JSON.stringify({ lote_numero: 'L-1' }),
      },
    ])

    await darBajaLote(4)
    expect(ultimaLlamada()).toEqual([
      '/api/lotes/4/baja',
      { method: 'PATCH' },
    ])
  })

  test('medicamentos arma filtros y operaciones del catálogo', async () => {
    await listarMedicamentos()
    expect(ultimaLlamada()).toEqual(['/api/medicamentos'])

    await listarMedicamentos({
      buscar: 'para',
      categoria: 2,
      estado: 'Activo',
    })
    expect(ultimaLlamada()).toEqual([
      '/api/medicamentos?buscar=para&categoria=2&estado=Activo',
    ])

    await listarCategorias()
    expect(ultimaLlamada()).toEqual(['/api/medicamentos/categorias'])

    await crearMedicamento({ nombre_comercial: 'Paracetamol' })
    expect(ultimaLlamada()).toEqual([
      '/api/medicamentos',
      {
        method: 'POST',
        body: JSON.stringify({ nombre_comercial: 'Paracetamol' }),
      },
    ])

    await actualizarMedicamento(2, { precio_unitario: 2.5 })
    expect(ultimaLlamada()).toEqual([
      '/api/medicamentos/2',
      {
        method: 'PUT',
        body: JSON.stringify({ precio_unitario: 2.5 }),
      },
    ])

    await cambiarEstadoMedicamento(2, false)
    expect(ultimaLlamada()).toEqual([
      '/api/medicamentos/2/estado',
      {
        method: 'PATCH',
        body: JSON.stringify({ activo: false }),
      },
    ])

    await eliminarMedicamentoLogico(2)
    expect(ultimaLlamada()).toEqual([
      '/api/medicamentos/2',
      { method: 'DELETE' },
    ])

    await eliminarFotoMedicamento(2)
    expect(ultimaLlamada()).toEqual([
      '/api/medicamentos/2/foto',
      { method: 'DELETE' },
    ])
  })

  test('subir foto envía un FormData', async () => {
    const archivo = new File(['foto'], 'foto.png', { type: 'image/png' })

    await subirFotoMedicamento(2, archivo)

    const [ruta, opciones] = ultimaLlamada()
    expect(ruta).toBe('/api/medicamentos/2/foto')
    expect(opciones.method).toBe('POST')
    expect(opciones.body).toBeInstanceOf(FormData)
    expect(opciones.body.get('foto')).toBe(archivo)
  })

  test('parámetros consulta y actualiza', async () => {
    await obtenerParametros()
    expect(ultimaLlamada()).toEqual(['/api/parametros'])

    await actualizarParametros({ margenAlertaDias: 30 })
    expect(ultimaLlamada()).toEqual([
      '/api/parametros',
      {
        method: 'PUT',
        body: JSON.stringify({ margenAlertaDias: 30 }),
      },
    ])
  })

  test('perfil consulta y cambia la contraseña', async () => {
    await obtenerPerfil()
    expect(ultimaLlamada()).toEqual(['/api/perfil'])

    await cambiarContrasena({ contrasena_actual: 'Actual123' })
    expect(ultimaLlamada()).toEqual([
      '/api/perfil/contrasena',
      {
        method: 'PATCH',
        body: JSON.stringify({ contrasena_actual: 'Actual123' }),
      },
    ])
  })

  test('reportes arma query y usa apiDownload', async () => {
    await obtenerReporte('ventas', {
      fechaInicio: '2026-01-01',
      fechaFin: '2026-01-31',
    })
    expect(ultimaLlamada()).toEqual([
      '/api/reportes/ventas?fechaInicio=2026-01-01&fechaFin=2026-01-31',
    ])

    await obtenerReporte('inventario')
    expect(ultimaLlamada()).toEqual(['/api/reportes/inventario'])

    await descargarReporte('ventas', 'pdf', {
      fechaInicio: '2026-01-01',
      fechaFin: null,
      buscar: '',
    })
    expect(apiDownload).toHaveBeenCalledWith(
      '/api/reportes/ventas/exportar?fechaInicio=2026-01-01&formato=pdf'
    )

    await listarHistorial({ tipo: 'VENTA' })
    expect(ultimaLlamada()).toEqual(['/api/historial?tipo=VENTA'])

    await listarHistorial({ tipo: null, pagina: undefined })
    expect(ultimaLlamada()).toEqual(['/api/historial'])

    await listarUsuariosHistorial()
    expect(ultimaLlamada()).toEqual(['/api/historial/usuarios'])
  })

  test('ventas y clientes usan sus rutas', async () => {
    await listarCatalogoVenta()
    expect(ultimaLlamada()).toEqual(['/api/ventas/catalogo'])

    await listarCatalogoVenta({ buscar: 'ibu' })
    expect(ultimaLlamada()).toEqual(['/api/ventas/catalogo?buscar=ibu'])

    await crearVenta({ id_cliente: 1 })
    expect(ultimaLlamada()).toEqual([
      '/api/ventas',
      {
        method: 'POST',
        body: JSON.stringify({ id_cliente: 1 }),
      },
    ])

    await listarClientes()
    expect(ultimaLlamada()).toEqual(['/api/clientes'])

    await listarClientes({ buscar: 'Ana' })
    expect(ultimaLlamada()).toEqual(['/api/clientes?buscar=Ana'])

    await crearCliente({ nombres: 'Ana' })
    expect(ultimaLlamada()).toEqual([
      '/api/clientes',
      {
        method: 'POST',
        body: JSON.stringify({ nombres: 'Ana' }),
      },
    ])

    await actualizarCliente(5, { nombres: 'Ana María' })
    expect(ultimaLlamada()).toEqual([
      '/api/clientes/5',
      {
        method: 'PUT',
        body: JSON.stringify({ nombres: 'Ana María' }),
      },
    ])
  })

  test('proveedores usa sus rutas', async () => {
    await listarProveedores()
    expect(ultimaLlamada()).toEqual(['/api/proveedores'])

    await listarProveedores({ buscar: 'Andina' })
    expect(ultimaLlamada()).toEqual(['/api/proveedores?buscar=Andina'])

    await obtenerProveedor(3)
    expect(ultimaLlamada()).toEqual(['/api/proveedores/3'])

    await crearProveedor({ nombre_comercial: 'Andina' })
    expect(ultimaLlamada()).toEqual([
      '/api/proveedores',
      {
        method: 'POST',
        body: JSON.stringify({ nombre_comercial: 'Andina' }),
      },
    ])

    await actualizarProveedor(3, { telefono: '70000000' })
    expect(ultimaLlamada()).toEqual([
      '/api/proveedores/3',
      {
        method: 'PUT',
        body: JSON.stringify({ telefono: '70000000' }),
      },
    ])
  })

  test('usuarios usa sus rutas', async () => {
    await listarUsuarios()
    expect(ultimaLlamada()).toEqual(['/api/usuarios'])

    await listarRoles()
    expect(ultimaLlamada()).toEqual(['/api/usuarios/roles'])

    await crearUsuario({ correo: 'ana@test.com' })
    expect(ultimaLlamada()).toEqual([
      '/api/usuarios',
      {
        method: 'POST',
        body: JSON.stringify({ correo: 'ana@test.com' }),
      },
    ])

    await actualizarUsuario(5, { correo: 'nueva@test.com' })
    expect(ultimaLlamada()).toEqual([
      '/api/usuarios/5',
      {
        method: 'PUT',
        body: JSON.stringify({ correo: 'nueva@test.com' }),
      },
    ])

    await cambiarEstadoUsuario(5, true)
    expect(ultimaLlamada()).toEqual([
      '/api/usuarios/5/estado',
      {
        method: 'PATCH',
        body: JSON.stringify({ activo: true }),
      },
    ])

    await obtenerImpactoUsuario(5)
    expect(ultimaLlamada()).toEqual(['/api/usuarios/5/impacto'])

    await eliminarUsuarioLogico(5)
    expect(ultimaLlamada()).toEqual([
      '/api/usuarios/5',
      { method: 'DELETE' },
    ])
  })
})
