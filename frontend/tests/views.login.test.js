import { beforeEach, describe, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const { routerMock, authMock, sessionMock } = vi.hoisted(() => ({
  routerMock: { push: vi.fn() },
  authMock: { iniciarSesion: vi.fn() },
  sessionMock: {
    guardarSesion: vi.fn(),
    registrarBienvenida: vi.fn()
  }
}))

vi.mock('vue-router', () => ({
  useRouter: () => routerMock
}))

vi.mock('../src/data/endpoints/auth', () => authMock)
vi.mock('../src/business/session', () => sessionMock)

const LoginView = (await import('../src/presentation/views/LoginView.vue')).default

const montar = () => mount(LoginView)

const completar = async (wrapper, correo = 'Ana@Farmacia.com', password = 'clave123') => {
  await wrapper.get('#login-correo').setValue(correo)
  await wrapper.get('#login-password').setValue(password)
}

describe('vista de inicio de sesión', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    window.matchMedia = vi.fn(() => ({ matches: false }))
  })

  test('muestra el formulario y aplica el tema guardado', () => {
    localStorage.setItem('theme', 'dark')
    const wrapper = montar()

    expect(wrapper.text()).toContain('Bienvenido de nuevo')
    expect(wrapper.find('#login-correo').exists()).toBe(true)
    expect(wrapper.find('#login-password').exists()).toBe(true)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  test('valida los campos vacíos antes de llamar a la API', async () => {
    const wrapper = montar()

    await wrapper.get('form').trigger('submit')

    expect(wrapper.text()).toContain('El correo es obligatorio.')
    expect(authMock.iniciarSesion).not.toHaveBeenCalled()
    expect(wrapper.get('#login-correo').attributes('aria-invalid')).toBe('true')
  })

  test('marca el correo inválido al escribir y lo limpia al corregirlo', async () => {
    const wrapper = montar()

    await wrapper.get('#login-correo').setValue('correo-invalido')
    expect(wrapper.text()).toContain('Ingresa un correo válido')

    await wrapper.get('#login-correo').setValue('ana@farmacia.com')
    expect(wrapper.text()).not.toContain('Ingresa un correo válido')
  })

  test('inicia sesión y guarda los datos del usuario', async () => {
    authMock.iniciarSesion.mockResolvedValue({
      success: true,
      token: 'token-123',
      usuario: { id_usuario: 1, nombres: 'Ana' }
    })
    const wrapper = montar()
    await completar(wrapper)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(authMock.iniciarSesion).toHaveBeenCalledWith({
      email: 'ana@farmacia.com',
      password: 'clave123'
    })
    expect(sessionMock.guardarSesion).toHaveBeenCalledWith('token-123', {
      id_usuario: 1,
      nombres: 'Ana'
    })
    expect(sessionMock.registrarBienvenida).toHaveBeenCalledTimes(1)
    expect(routerMock.push).toHaveBeenCalledWith('/')
  })

  test('muestra el mensaje cuando las credenciales son incorrectas', async () => {
    authMock.iniciarSesion.mockResolvedValue({
      success: false,
      mensaje: 'Correo o contraseña incorrectos.'
    })
    const wrapper = montar()
    await completar(wrapper)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('.alert-danger').text()).toContain('Correo o contraseña incorrectos.')
    expect(sessionMock.guardarSesion).not.toHaveBeenCalled()
    expect(routerMock.push).not.toHaveBeenCalled()
  })

  test('avisa con una notificación cuando la cuenta está inhabilitada', async () => {
    authMock.iniciarSesion.mockRejectedValue({
      codigo: 'CUENTA_INHABILITADA',
      message: 'Tu cuenta está inhabilitada.'
    })
    const wrapper = montar()
    await completar(wrapper)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Tu cuenta está inhabilitada.')
    expect(wrapper.get('.toast-item').classes()).toContain('is-warning')
    expect(wrapper.text()).not.toContain('Error de conexión')
  })

  test('muestra error de conexión cuando la API falla sin estado', async () => {
    authMock.iniciarSesion.mockRejectedValue(new Error('falló la red'))
    const wrapper = montar()
    await completar(wrapper)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Error de conexión con el servidor.')
  })

  test('alterna la visibilidad de la contraseña', async () => {
    const wrapper = montar()
    const alternar = wrapper.findAll('button')
      .find((boton) => boton.text() === 'Mostrar')

    expect(wrapper.get('#login-password').attributes('type')).toBe('password')

    await alternar.trigger('click')

    expect(wrapper.get('#login-password').attributes('type')).toBe('text')
    expect(wrapper.text()).toContain('Ocultar')
  })
})
