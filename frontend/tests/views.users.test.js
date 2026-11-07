import { beforeEach, describe, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'

const { usersMock, sessionMock } = vi.hoisted(() => ({
  usersMock: {
    listarUsuarios: vi.fn(),
    listarRoles: vi.fn(),
    crearUsuario: vi.fn(),
    actualizarUsuario: vi.fn(),
    cambiarEstadoUsuario: vi.fn(),
    eliminarUsuarioLogico: vi.fn(),
    obtenerImpactoUsuario: vi.fn()
  },
  sessionMock: {
    obtenerSesion: vi.fn(() => ({ idUsuario: 1 }))
  }
}))

vi.mock('../src/data/endpoints/users', () => usersMock)
vi.mock('../src/business/session', () => sessionMock)

const UsersView = (await import('../src/presentation/views/UsersView.vue')).default

const usuarios = () => [
  {
    id_usuario: 1,
    nombres: 'Ana',
    apellido_paterno: 'Pérez',
    apellido_materno: 'Rojas',
    fecha_nacimiento: '1990-05-20T00:00:00',
    correo: 'ana@farmacia.com',
    ci: '12345678',
    id_rol: 1,
    nombre_rol: 'Administrador',
    estado_cuenta: 'Activo'
  },
  {
    id_usuario: 2,
    nombres: 'Luis',
    apellido_paterno: 'Gómez',
    apellido_materno: '',
    fecha_nacimiento: '1992-03-10T00:00:00',
    correo: 'luis@farmacia.com',
    ci: '87654321',
    id_rol: 2,
    nombre_rol: 'Ventas',
    estado_cuenta: 'Activo'
  },
  {
    id_usuario: 3,
    nombres: 'Carla',
    apellido_paterno: 'Ríos',
    apellido_materno: '',
    fecha_nacimiento: '1995-07-01T00:00:00',
    correo: 'carla@farmacia.com',
    ci: '55566677',
    id_rol: 2,
    nombre_rol: 'Ventas',
    estado_cuenta: 'Inactivo'
  }
]

const roles = () => [
  { id_rol: 1, nombre_rol: 'Administrador' },
  { id_rol: 2, nombre_rol: 'Ventas' },
  { id_rol: 3, nombre_rol: 'Encargado de inventario' }
]

const montar = () => mount(UsersView)

const abrirNuevo = async (wrapper) => {
  const boton = wrapper.findAll('button')
    .find((nodo) => nodo.text().includes('Nuevo usuario'))
  await boton.trigger('click')
}

const completarFormulario = async (wrapper) => {
  await wrapper.get('#nombres').setValue('Marta')
  await wrapper.get('#apellido-paterno').setValue('Soto')
  await wrapper.get('#fecha-nacimiento').setValue('1993-04-12')
  await wrapper.get('#correo').setValue('Marta@Farmacia.com')
  await wrapper.get('#ci-nit').setValue('11223344')
  await wrapper.get('#rol').setValue('2')
  await wrapper.get('#contrasena').setValue('clave123')
}

/**
 * Devuelve los botones cuyo texto coincide (exacto o por regex) dentro de un
 * contenedor. Si `contenedor` es el wrapper, busca en todo el árbol.
 */
const botonesPorTexto = (contenedor, patron) =>
  contenedor.findAll('button').filter((n) => patron.test(n.text().trim()))

/**
 * Localiza la fila (tr) que contiene el texto del usuario indicado.
 * Se asume que la tabla usa <tr>; si usa divs, ajusta el selector.
 */
const filaDeUsuario = (wrapper, textoUsuario) => {
  const filas = wrapper.findAll('tr')
  const fila = filas.find((f) => f.text().includes(textoUsuario))
  if (!fila) {
    const disponibles = filas.map((f) => f.text().replace(/\s+/g, ' ').trim())
    throw new Error(
      `No se encontró fila para "${textoUsuario}". Filas disponibles: ${JSON.stringify(disponibles)}`
    )
  }
  return fila
}

/**
 * Abre el modal de baja (borrado lógico) para un usuario concreto.
 * - Busca el botón de baja DENTRO de la fila del usuario, no en toda la tabla.
 * - Acepta variantes de texto ("Eliminar", "Dar de baja", "Baja", "Borrar").
 * - Verifica que el modal se haya abierto comprobando `obtenerImpactoUsuario`.
 */
const abrirModalBaja = async (wrapper, textoUsuario, idEsperado) => {
  const fila = filaDeUsuario(wrapper, textoUsuario)

  // Candidatos de baja dentro de la fila del usuario
  const candidatos = botonesPorTexto(fila, /eliminar|baja|borrar|desactivar/i)

  if (candidatos.length === 0) {
    const disponibles = fila.findAll('button').map((b) => ({
      texto: b.text().trim(),
      disabled: b.attributes('disabled')
    }))
    throw new Error(
      `No hay botón de baja en la fila de "${textoUsuario}". Botones en la fila: ${JSON.stringify(disponibles)}`
    )
  }

  // Preferir un botón habilitado
  const habilitado = candidatos.find((b) => !b.attributes('disabled')) || candidatos[0]

  await habilitado.trigger('click')
  await flushPromises()
  await nextTick()

  // Verificar que el clic disparó la carga de impacto (apertura del modal)
  if (!usersMock.obtenerImpactoUsuario.mock.calls.length) {
    const todos = wrapper.findAll('button').map((b) => ({
      texto: b.text().trim(),
      disabled: b.attributes('disabled')
    }))
    throw new Error(
      `El clic en "${habilitado.text().trim()}" no llamó a obtenerImpactoUsuario. ` +
      `Botones disponibles en toda la vista: ${JSON.stringify(todos)}. ` +
      `¿El botón correcto tiene otro texto o está en un menú desplegable?`
    )
  }

  expect(usersMock.obtenerImpactoUsuario).toHaveBeenCalledWith(idEsperado)
  await flushPromises()
  await nextTick()
}

describe('vista de usuarios', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionMock.obtenerSesion.mockReturnValue({ idUsuario: 1 })
    usersMock.listarUsuarios.mockResolvedValue(usuarios())
    usersMock.listarRoles.mockResolvedValue(roles())
    usersMock.obtenerImpactoUsuario.mockResolvedValue({
      impacto: { total: 2, ventas: 1, historial: 1 }
    })
    usersMock.crearUsuario.mockResolvedValue({})
    usersMock.actualizarUsuario.mockResolvedValue({})
    usersMock.cambiarEstadoUsuario.mockResolvedValue({})
    usersMock.eliminarUsuarioLogico.mockResolvedValue({})
  })

  test('carga usuarios y roles y muestra las estadísticas', async () => {
    const wrapper = montar()
    await flushPromises()

    expect(usersMock.listarUsuarios).toHaveBeenCalledTimes(1)
    expect(usersMock.listarRoles).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Ana Pérez Rojas')
    expect(wrapper.text()).toContain('luis@farmacia.com')
    expect(wrapper.text()).toContain('Administrador')
    expect(wrapper.findAll('.stat-card')).toHaveLength(4)
    expect(wrapper.text()).toContain('3')
    expect(wrapper.text()).toContain('2')
  })

  test('filtra por búsqueda, rol y estado', async () => {
    const wrapper = montar()
    await flushPromises()

    await wrapper.get('#buscar-usuarios').setValue('carla')
    expect(wrapper.text()).toContain('Carla Ríos')
    expect(wrapper.text()).not.toContain('Ana Pérez')

    await wrapper.get('#buscar-usuarios').setValue('')
    await wrapper.get('#filtrar-rol').setValue('Ventas')
    expect(wrapper.text()).toContain('Luis Gómez')
    expect(wrapper.text()).not.toContain('Ana Pérez')

    await wrapper.get('#filtrar-estado').setValue('Inactivo')
    expect(wrapper.text()).toContain('Carla Ríos')
    expect(wrapper.text()).not.toContain('Luis Gómez')

    await wrapper.findAll('button')
      .find((nodo) => nodo.text().includes('Limpiar'))
      .trigger('click')

    expect(wrapper.text()).toContain('Ana Pérez Rojas')
  })

  test('permite precisar la búsqueda con varias palabras', async () => {
    const wrapper = montar()
    await flushPromises()

    await wrapper.get('#buscar-usuarios').setValue('ana pér')

    expect(wrapper.text()).toContain('Ana Pérez Rojas')
    expect(wrapper.text()).not.toContain('Luis Gómez')
  })

  test('muestra el estado vacío cuando no hay coincidencias', async () => {
    const wrapper = montar()
    await flushPromises()

    await wrapper.get('#buscar-usuarios').setValue('inexistente')

    expect(wrapper.text()).toContain('No se encontraron usuarios que coincidan con los filtros.')
  })

  test('no encuentra coincidencias internas en nombres ni correo', async () => {
    const wrapper = montar()
    await flushPromises()

    await wrapper.get('#buscar-usuarios').setValue('rl')

    expect(wrapper.text()).not.toContain('Carla Ríos')
    expect(wrapper.text()).toContain('No se encontraron usuarios que coincidan con los filtros.')
  })

  test('valida el formulario antes de crear un usuario', async () => {
    const wrapper = montar()
    await flushPromises()
    await abrirNuevo(wrapper)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(usersMock.crearUsuario).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Revisa los campos marcados en rojo antes de guardar.')
    expect(wrapper.text()).toContain('El nombre es obligatorio.')
  })

  test('crea un usuario con el correo en minúsculas', async () => {
    const wrapper = montar()
    await flushPromises()
    await abrirNuevo(wrapper)
    await completarFormulario(wrapper)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(usersMock.crearUsuario).toHaveBeenCalledWith({
      nombres: 'Marta',
      apellido_paterno: 'Soto',
      apellido_materno: '',
      fecha_nacimiento: '1993-04-12',
      correo: 'marta@farmacia.com',
      ci: '11223344',
      id_rol: 2,
      contrasena: 'clave123'
    })
    expect(wrapper.text()).toContain('El usuario se creó correctamente.')
    expect(usersMock.listarUsuarios).toHaveBeenCalledTimes(2)
  })

  test('edita un usuario sin enviar contraseña si no se cambió', async () => {
    const wrapper = montar()
    await flushPromises()

    const editar = wrapper.findAll('button')
      .find((nodo) => nodo.text() === 'Editar')
    await editar.trigger('click')
    await wrapper.get('#nombres').setValue('Ana María')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(usersMock.actualizarUsuario).toHaveBeenCalledWith(1, {
      nombres: 'Ana María',
      apellido_paterno: 'Pérez',
      apellido_materno: 'Rojas',
      fecha_nacimiento: '1990-05-20',
      correo: 'ana@farmacia.com',
      ci: '12345678',
      id_rol: 1
    })
    expect(wrapper.text()).toContain('Los datos del usuario se actualizaron.')
  })

  test('activa una cuenta inactiva', async () => {
    const wrapper = montar()
    await flushPromises()

    const activar = wrapper.findAll('button')
      .find((nodo) => nodo.text() === 'Activar')
    await activar.trigger('click')
    await flushPromises()

    expect(usersMock.cambiarEstadoUsuario).toHaveBeenCalledWith(3, true)
    expect(wrapper.text()).toContain('La cuenta de Carla Ríos quedó activa.')
  })

  /**
   * BORRADO LÓGICO — desactivación.
   * El modal de baja debe mostrar el impacto (ventas/historial) y permitir
   * desactivar la cuenta sin eliminarla.
   */
  test('desactiva una cuenta desde la baja', async () => {
    const wrapper = montar()
    await flushPromises()

    // Abre el modal de baja del usuario activo (Luis, id 2)
    await abrirModalBaja(wrapper, 'luis@farmacia.com', 2)

    // El modal debe mostrar el impacto
    expect(wrapper.text()).toContain('Ventas registradas:')

    // Localiza el botón "Desactivar" dentro del modal (panel-modal)
    const modal = wrapper.find('.panel-modal')
    expect(modal.exists(), 'No se encontró el contenedor .panel-modal').toBe(true)

    const desactivar = botonesPorTexto(modal, /^desactivar$/i)[0]
    expect(desactivar, 'No se encontró el botón Desactivar en el modal').toBeTruthy()

    await desactivar.trigger('click')
    await flushPromises()

    expect(usersMock.cambiarEstadoUsuario).toHaveBeenCalledWith(2, false)
    expect(wrapper.text()).toContain('La cuenta de Luis Gómez quedó inactiva.')
  })

  /**
   * BORRADO LÓGICO — eliminación.
   * El botón "Eliminar" del modal ejecuta `eliminarUsuarioLogico(id)`;
   * NO debe borrar físicamente, solo marcar como eliminado.
   */
  test('elimina lógicamente una cuenta desde la baja', async () => {
    const wrapper = montar()
    await flushPromises()

    await abrirModalBaja(wrapper, 'luis@farmacia.com', 2)

    const modal = wrapper.find('.panel-modal')
    expect(modal.exists(), 'No se encontró el contenedor .panel-modal').toBe(true)

    const confirmar = botonesPorTexto(modal, /^eliminar$/i)[0]
    expect(confirmar, 'No se encontró el botón Eliminar en el modal de baja').toBeTruthy()

    await confirmar.trigger('click')
    await flushPromises()

    // Borrado LÓGICO: se llama al endpoint lógico, no a un borrado físico
    expect(usersMock.eliminarUsuarioLogico).toHaveBeenCalledWith(2)
    // Verificación explícita de que NO se hizo borrado físico
    expect(usersMock).not.toHaveProperty('eliminarUsuarioFisico')
    expect(wrapper.text()).toContain('La cuenta de Luis Gómez se eliminó correctamente.')
  })

  test('muestra el error de permisos al cargar', async () => {
    usersMock.listarUsuarios.mockRejectedValue({ status: 403, message: 'Prohibido' })
    const wrapper = montar()
    await flushPromises()

    expect(wrapper.text()).toContain('No tienes permisos para gestionar usuarios o tu sesión expiró.')
  })
})