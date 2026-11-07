import { beforeEach, describe, expect, test } from 'vitest'
import {
  bienvenidaActiva,
  registrarBienvenida,
  consumirBienvenida,
  finalizarBienvenida,
  guardarSesion,
  obtenerSesion,
  estaAutenticado,
  esAdministrador,
  puedeGestionarCatalogo,
  cerrarSesion,
} from '../src/business/session'

const usuario = () => ({
  id_usuario: 7,
  nombre_completo: 'Ana Pérez Gómez',
  nombres: 'Ana',
  rol: 'Administrador',
  correo: 'ana@farmacia.test',
  ci: '123456',
  apellido_paterno: 'Pérez',
  apellido_materno: 'Gómez',
})

describe('sesión del frontend', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    finalizarBienvenida()
  })

  test('guarda todos los datos de la sesión', () => {
    guardarSesion('token-123', usuario())

    expect(localStorage.getItem('tokenSession')).toBe('token-123')
    expect(localStorage.getItem('idUsuario')).toBe('7')
    expect(localStorage.getItem('nombreUsuario')).toBe('Ana Pérez Gómez')
    expect(localStorage.getItem('nombrePila')).toBe('Ana')
    expect(localStorage.getItem('rolUsuario')).toBe('Administrador')
    expect(localStorage.getItem('correoUsuario')).toBe('ana@farmacia.test')
    expect(localStorage.getItem('ciUsuario')).toBe('123456')
    expect(localStorage.getItem('apellidoPaterno')).toBe('Pérez')
    expect(localStorage.getItem('apellidoMaterno')).toBe('Gómez')
  })

  test('usa cadenas vacías cuando faltan datos opcionales', () => {
    guardarSesion('token', { id_usuario: 1 })

    expect(localStorage.getItem('nombreUsuario')).toBe('')
    expect(localStorage.getItem('nombrePila')).toBe('')
    expect(localStorage.getItem('rolUsuario')).toBe('')
    expect(localStorage.getItem('correoUsuario')).toBe('')
    expect(localStorage.getItem('ciUsuario')).toBe('')
    expect(localStorage.getItem('apellidoPaterno')).toBe('')
    expect(localStorage.getItem('apellidoMaterno')).toBe('')
  })

  test('recupera la sesión guardada', () => {
    guardarSesion('token-123', usuario())

    expect(obtenerSesion()).toEqual({
      token: 'token-123',
      idUsuario: 7,
      nombre: 'Ana Pérez Gómez',
      nombrePila: 'Ana',
      rol: 'Administrador',
      correo: 'ana@farmacia.test',
      ciNit: '123456',
      apellidoPaterno: 'Pérez',
      apellidoMaterno: 'Gómez',
    })
  })

  test('devuelve valores por defecto sin sesión guardada', () => {
    expect(obtenerSesion()).toEqual({
      token: null,
      idUsuario: null,
      nombre: '',
      nombrePila: '',
      rol: '',
      correo: '',
      ciNit: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
    })
  })

  test.each(['0', '-1', 'abc', '', '1.5'])(
    'descarta el identificador %p',
    (id) => {
      localStorage.setItem('idUsuario', id)

      expect(obtenerSesion().idUsuario).toBeNull()
    }
  )

  test('detecta autenticación, administrador y gestión de catálogo', () => {
    expect(estaAutenticado()).toBe(false)
    expect(esAdministrador()).toBe(false)
    expect(puedeGestionarCatalogo()).toBe(false)

    localStorage.setItem('tokenSession', 'token')
    localStorage.setItem('rolUsuario', 'Administrador')

    expect(estaAutenticado()).toBe(true)
    expect(esAdministrador()).toBe(true)
    expect(puedeGestionarCatalogo()).toBe(true)

    localStorage.setItem('rolUsuario', 'Encargado de inventario')

    expect(esAdministrador()).toBe(false)
    expect(puedeGestionarCatalogo()).toBe(true)

    localStorage.setItem('rolUsuario', 'Ventas')

    expect(puedeGestionarCatalogo()).toBe(false)
  })

  test('gestiona el aviso de bienvenida', () => {
    expect(bienvenidaActiva.value).toBe(false)

    registrarBienvenida()

    expect(sessionStorage.getItem('mostrarBienvenida')).toBe('true')
    expect(bienvenidaActiva.value).toBe(true)

    expect(consumirBienvenida()).toBe(true)
    expect(sessionStorage.getItem('mostrarBienvenida')).toBeNull()

    expect(consumirBienvenida()).toBe(false)
  })

  test('finalizarBienvenida limpia el aviso y el estado', () => {
    registrarBienvenida()

    finalizarBienvenida()

    expect(sessionStorage.getItem('mostrarBienvenida')).toBeNull()
    expect(bienvenidaActiva.value).toBe(false)
  })

  test('cerrarSesion borra solo las claves de sesión y la bienvenida', () => {
    guardarSesion('token', usuario())
    registrarBienvenida()
    localStorage.setItem('theme', 'dark')

    cerrarSesion()

    expect(localStorage.getItem('tokenSession')).toBeNull()
    expect(localStorage.getItem('idUsuario')).toBeNull()
    expect(localStorage.getItem('rolUsuario')).toBeNull()
    expect(localStorage.getItem('theme')).toBe('dark')
    expect(sessionStorage.getItem('mostrarBienvenida')).toBeNull()
    expect(bienvenidaActiva.value).toBe(false)
  })
})
