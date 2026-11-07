import { beforeEach, describe, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const { profileMock, sessionMock, routerMock } = vi.hoisted(() => ({
  profileMock: {
    obtenerPerfil: vi.fn(),
    cambiarContrasena: vi.fn()
  },
  sessionMock: { cerrarSesion: vi.fn() },
  routerMock: { replace: vi.fn() }
}))

vi.mock('../src/data/endpoints/profile', () => profileMock)
vi.mock('../src/business/session', () => sessionMock)
vi.mock('vue-router', () => ({ useRouter: () => routerMock }))

const ProfileView = (await import('../src/presentation/views/ProfileView.vue')).default

const perfil = () => ({
  nombres: 'Ana',
  apellido_paterno: 'Pérez',
  apellido_materno: 'Rojas',
  correo: 'ana@farmacia.com',
  nombre_rol: 'Administrador',
  estado_cuenta: 'Activo',
  ci: '12345678',
  fecha_nacimiento: '1990-05-20',
  fecha_registro: '2024-01-15T10:00:00'
})

const montar = (props = {}) => mount(ProfileView, {
  props: { profileMenuOpen: false, ...props }
})

const completarContrasena = async (wrapper, nueva = 'nueva123') => {
  await wrapper.get('#perfil-contrasena-actual').setValue('actual123')
  await wrapper.get('#perfil-contrasena-nueva').setValue(nueva)
  await wrapper.get('#perfil-contrasena-confirmacion').setValue(nueva)
}

const enviarContrasena = async (wrapper) => {
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}

describe('vista del perfil', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    profileMock.obtenerPerfil.mockResolvedValue(perfil())
  })

  test('muestra los datos del perfil cargado', async () => {
    const wrapper = montar()
    await flushPromises()

    expect(wrapper.text()).toContain('Ana Pérez Rojas')
    expect(wrapper.text()).toContain('Administrador')
    expect(wrapper.text()).toContain('ana@farmacia.com')
    expect(wrapper.text()).toContain('Activo')
    expect(wrapper.text()).toContain('12345678')
    expect(wrapper.text()).toContain('AP')
    expect(wrapper.findAll('.data-value')).toHaveLength(3)
  })

  test('oculta el estado cuando el menú de perfil está abierto', async () => {
    const wrapper = montar({ profileMenuOpen: true })
    await flushPromises()

    expect(wrapper.get('.profile-status').classes()).toContain('invisible')
  })

  test('cierra la sesión si el perfil responde 401', async () => {
    profileMock.obtenerPerfil.mockRejectedValue({ status: 401, message: 'Sin sesión' })
    const wrapper = montar()
    await flushPromises()

    expect(sessionMock.cerrarSesion).toHaveBeenCalledTimes(1)
    expect(routerMock.replace).toHaveBeenCalledWith({ name: 'login' })
  })

  test('muestra el error y permite reintentar', async () => {
    profileMock.obtenerPerfil
      .mockRejectedValueOnce({ status: 500, message: 'No se pudo cargar' })
      .mockResolvedValueOnce(perfil())
    const wrapper = montar()
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('No se pudo cargar')

    await wrapper.findAll('button')
      .find((boton) => boton.text() === 'Reintentar')
      .trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Ana Pérez Rojas')
  })

  test('valida los campos de la contraseña', async () => {
    const wrapper = montar()
    await flushPromises()

    await enviarContrasena(wrapper)

    expect(profileMock.cambiarContrasena).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Ingresa tu contraseña actual.')
  })

  test('exige que la confirmación coincida', async () => {
    const wrapper = montar()
    await flushPromises()

    await completarContrasena(wrapper)
    await wrapper.get('#perfil-contrasena-confirmacion').setValue('otra123')
    await enviarContrasena(wrapper)

    expect(profileMock.cambiarContrasena).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Las contraseñas no coinciden.')
  })

  test('cambia la contraseña y limpia el formulario', async () => {
    profileMock.cambiarContrasena.mockResolvedValue({})
    const wrapper = montar()
    await flushPromises()

    await completarContrasena(wrapper)
    await enviarContrasena(wrapper)

    expect(profileMock.cambiarContrasena).toHaveBeenCalledWith({
      contrasena_actual: 'actual123',
      contrasena_nueva: 'nueva123'
    })
    expect(wrapper.text()).toContain('Tu contraseña se actualizó correctamente.')
    expect(wrapper.get('#perfil-contrasena-actual').element.value).toBe('')
  })

  test('muestra el error devuelto al cambiar la contraseña', async () => {
    profileMock.cambiarContrasena.mockRejectedValue({ status: 400, message: 'Contraseña actual incorrecta' })
    const wrapper = montar()
    await flushPromises()

    await completarContrasena(wrapper)
    await enviarContrasena(wrapper)

    expect(wrapper.text()).toContain('Contraseña actual incorrecta')
  })

  test('cierra la sesión si el cambio de contraseña responde 401', async () => {
    profileMock.cambiarContrasena.mockRejectedValue({ status: 401 })
    const wrapper = montar()
    await flushPromises()

    await completarContrasena(wrapper)
    await enviarContrasena(wrapper)

    expect(sessionMock.cerrarSesion).toHaveBeenCalledTimes(1)
    expect(routerMock.replace).toHaveBeenCalledWith({ name: 'login' })
  })
})
