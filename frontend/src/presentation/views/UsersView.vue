<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  actualizarUsuario,
  cambiarEstadoUsuario,
  crearUsuario,
  eliminarUsuarioLogico,
  listarRoles,
  listarUsuarios,
  obtenerImpactoUsuario
} from '../../data/endpoints/users'
import { iniciales, nombreCompleto } from '../../business/format'
import { obtenerSesion } from '../../business/session'
import { FECHA_MINIMA, fechaHoyISO } from '../validators/fields'
import {
  limpiarCampoUsuario,
  validarCampoUsuario,
  validarFormularioUsuario
} from '../validators/user'

const usuarios = ref([])
const roles = ref([])
const loading = ref(true)
const saving = ref(false)
const modalAbierto = ref(false)
const editando = ref(false)
const error = ref('')
const errorFormulario = ref('')
const errorAccion = ref('')
const showPassword = ref(false)
const currentUserId = obtenerSesion().idUsuario

// Filtros, búsqueda y paginación
const search = ref('')
const filtroRol = ref('Todos')
const filtroEstado = ref('Todos')
const porPagina = 10
const paginaActual = ref(1)

// Baja de usuarios
const usuarioBaja = ref(null)
const impactoBaja = ref(null)
const errorBaja = ref('')
const procesandoBaja = ref(false)
const eliminandoId = ref(null)

// Notificación flotante
const notificacion = ref('')
let temporizadorNotificacion = null

const notificar = (texto) => {
  notificacion.value = texto
  if (temporizadorNotificacion) clearTimeout(temporizadorNotificacion)
  temporizadorNotificacion = setTimeout(() => {
    notificacion.value = ''
  }, 4500)
}

const formularioInicial = () => ({
  id_usuario: null,
  nombres: '',
  apellido_paterno: '',
  apellido_materno: '',
  fecha_nacimiento: '',
  correo: '',
  ci_nit: '',
  id_rol: '',
  contrasena: ''
})
const form = ref(formularioInicial())

// Validación de los campos del formulario
const errores = ref({})
const touched = ref({})
const fechaMaxima = fechaHoyISO()

const restablecerValidacion = () => {
  errores.value = {}
  touched.value = {}
}

const validarCampo = (campo) => {
  errores.value[campo] = validarCampoUsuario(campo, form.value[campo], {
    editando: editando.value
  })
}

const alEscribir = (campo) => {
  form.value[campo] = limpiarCampoUsuario(campo, form.value[campo])
  if (touched.value[campo]) validarCampo(campo)
}

const alSalir = (campo) => {
  touched.value[campo] = true
  validarCampo(campo)
}

const validarFormulario = () => {
  errores.value = validarFormularioUsuario(form.value, {
    editando: editando.value
  })
  Object.keys(errores.value).forEach((campo) => {
    touched.value[campo] = true
  })
  return !Object.values(errores.value).some(Boolean)
}

const esActivo = (usuario) => (
  String(usuario?.estado_cuenta || '').trim().toLocaleLowerCase() === 'activo'
)

const esPropio = (usuario) => (
  Number(usuario?.id_usuario) === Number(currentUserId)
)

// Listas únicas para los filtros
const rolesDisponibles = computed(() => {
  const conjunto = new Set()
  roles.value.forEach((rol) => {
    if (rol.nombre_rol) conjunto.add(String(rol.nombre_rol))
  })
  usuarios.value.forEach((usuario) => {
    if (usuario.nombre_rol) conjunto.add(String(usuario.nombre_rol))
  })
  return Array.from(conjunto).sort((a, b) => a.localeCompare(b, 'es'))
})

const estadosDisponibles = computed(() => {
  const conjunto = new Set(['Activo', 'Inactivo'])
  usuarios.value.forEach((usuario) => {
    const estado = String(usuario.estado_cuenta || '').trim()
    if (estado) conjunto.add(estado)
  })
  return Array.from(conjunto)
})

// Filtrado + búsqueda
const usuariosFiltrados = computed(() => {
  const consulta = search.value.trim().toLocaleLowerCase()

  return usuarios.value.filter((usuario) => {
    if (consulta) {
      const nombre = [
        usuario.nombres,
        usuario.apellido_paterno,
        usuario.apellido_materno
      ].filter(Boolean).join(' ')
      const coincide = [
        nombre,
        usuario.correo,
        usuario.ci_nit,
        usuario.nombre_rol
      ].some((valor) => String(valor || '').toLocaleLowerCase().includes(consulta))
      if (!coincide) return false
    }

    if (
      filtroRol.value !== 'Todos'
      && String(usuario.nombre_rol) !== filtroRol.value
    ) {
      return false
    }

    if (
      filtroEstado.value !== 'Todos'
      && String(usuario.estado_cuenta).toLocaleLowerCase()
        !== filtroEstado.value.toLocaleLowerCase()
    ) {
      return false
    }

    return true
  })
})

// Paginación
const totalPaginas = computed(() => (
  Math.max(1, Math.ceil(usuariosFiltrados.value.length / porPagina))
))

const usuariosPaginados = computed(() => {
  const inicio = (paginaActual.value - 1) * porPagina
  return usuariosFiltrados.value.slice(inicio, inicio + porPagina)
})

const indiceInicio = computed(() => (
  usuariosFiltrados.value.length === 0
    ? 0
    : (paginaActual.value - 1) * porPagina + 1
))

const indiceFin = computed(() => (
  Math.min(paginaActual.value * porPagina, usuariosFiltrados.value.length)
))

const numerosPagina = computed(() => {
  const paginas = []
  const total = totalPaginas.value
  const actual = paginaActual.value
  const maxVisible = 5

  if (total <= maxVisible + 2) {
    for (let i = 1; i <= total; i += 1) paginas.push(i)
    return paginas
  }

  paginas.push(1)
  let inicio = Math.max(2, actual - 1)
  let fin = Math.min(total - 1, actual + 1)

  if (actual <= 3) {
    inicio = 2
    fin = 4
  }
  if (actual >= total - 2) {
    inicio = total - 3
    fin = total - 1
  }

  if (inicio > 2) paginas.push('...')
  for (let i = inicio; i <= fin; i += 1) paginas.push(i)
  if (fin < total - 1) paginas.push('...')
  paginas.push(total)

  return paginas
})

watch([search, filtroRol, filtroEstado], () => {
  paginaActual.value = 1
})

watch(totalPaginas, (total) => {
  if (paginaActual.value > total) paginaActual.value = total
})

const limpiarFiltros = () => {
  search.value = ''
  filtroRol.value = 'Todos'
  filtroEstado.value = 'Todos'
  paginaActual.value = 1
}

const hayFiltrosActivos = computed(() => (
  search.value.trim() !== ''
  || filtroRol.value !== 'Todos'
  || filtroEstado.value !== 'Todos'
))

const filtrosActivos = computed(() => [
  search.value.trim() !== '',
  filtroRol.value !== 'Todos',
  filtroEstado.value !== 'Todos'
].filter(Boolean).length)

// Tarjetas de estadísticas
const totalUsuarios = computed(() => usuarios.value.length)
const usuariosActivos = computed(() => (
  usuarios.value.filter((usuario) => esActivo(usuario)).length
))
const usuariosInactivos = computed(() => (
  usuarios.value.filter((usuario) => !esActivo(usuario)).length
))
const usuariosAdmin = computed(() => (
  usuarios.value.filter((usuario) => (
    String(usuario.nombre_rol || '').toLocaleLowerCase().includes('admin')
  )).length
))

const mensajeErrorAccion = (err) => {
  if (err.status === 401 || err.status === 403) {
    return 'No tienes permisos para gestionar usuarios o tu sesión expiró. Vuelve a iniciar sesión.'
  }
  if (err.status === 404) {
    return 'El usuario no existe o ya fue eliminado.'
  }
  return `No se pudo completar la operación: ${err.message}`
}

const cargarDatos = async () => {
  loading.value = true
  error.value = ''
  try {
    const [lista, listaRoles] = await Promise.all([
      listarUsuarios(),
      listarRoles()
    ])
    usuarios.value = lista
    roles.value = listaRoles
  } catch (err) {
    error.value = mensajeErrorAccion(err)
  } finally {
    loading.value = false
  }
}

const abrirNuevo = () => {
  editando.value = false
  form.value = formularioInicial()
  errorFormulario.value = ''
  showPassword.value = false
  restablecerValidacion()
  modalAbierto.value = true
}

const abrirEdicion = (usuario) => {
  editando.value = true
  form.value = {
    id_usuario: usuario.id_usuario,
    nombres: usuario.nombres,
    apellido_paterno: usuario.apellido_paterno,
    apellido_materno: usuario.apellido_materno || '',
    fecha_nacimiento: String(usuario.fecha_nacimiento).split('T')[0],
    correo: usuario.correo,
    ci_nit: usuario.ci_nit,
    id_rol: String(usuario.id_rol),
    contrasena: ''
  }
  errorFormulario.value = ''
  showPassword.value = false
  restablecerValidacion()
  modalAbierto.value = true
}

const guardarUsuario = async () => {
  errorFormulario.value = ''

  if (!validarFormulario()) {
    errorFormulario.value = 'Revisa los campos marcados en rojo antes de guardar.'
    return
  }

  saving.value = true

  const body = {
    nombres: form.value.nombres.trim(),
    apellido_paterno: form.value.apellido_paterno.trim(),
    apellido_materno: form.value.apellido_materno.trim(),
    fecha_nacimiento: form.value.fecha_nacimiento,
    correo: form.value.correo.trim().toLowerCase(),
    ci_nit: form.value.ci_nit.trim(),
    id_rol: Number(form.value.id_rol)
  }
  if (!editando.value) body.contrasena = form.value.contrasena
  else if (form.value.contrasena) body.contrasena = form.value.contrasena

  try {
    await (editando.value
      ? actualizarUsuario(form.value.id_usuario, body)
      : crearUsuario(body))
    const mensaje = editando.value
      ? 'Los datos del usuario se actualizaron.'
      : 'El usuario se creó correctamente.'
    modalAbierto.value = false
    await cargarDatos()
    notificar(mensaje)
  } catch (err) {
    errorFormulario.value = err.message
  } finally {
    saving.value = false
  }
}

const activarUsuario = async (usuario) => {
  errorAccion.value = ''
  try {
    await cambiarEstadoUsuario(usuario.id_usuario, true)
    await cargarDatos()
    notificar(`La cuenta de ${nombreCompleto(usuario)} quedó activa.`)
  } catch (err) {
    errorAccion.value = mensajeErrorAccion(err)
  }
}

// =====================================================
// BAJA DE USUARIO (borrado lógico)
// =====================================================
const cerrarModalBaja = () => {
  if (procesandoBaja.value) return
  usuarioBaja.value = null
  impactoBaja.value = null
  errorBaja.value = ''
}

const ejecutarBaja = async (accion) => {
  const usuario = usuarioBaja.value
  if (!usuario?.id_usuario) {
    errorBaja.value = 'No se pudo identificar el usuario.'
    return
  }

  if (accion === 'desactivar' && !esActivo(usuario)) return

  procesandoBaja.value = true
  eliminandoId.value = usuario.id_usuario
  errorBaja.value = ''

  try {
    if (accion === 'desactivar') {
      await cambiarEstadoUsuario(usuario.id_usuario, false)
    } else {
      await eliminarUsuarioLogico(usuario.id_usuario)
    }

    const nombre = nombreCompleto(usuario)
    usuarioBaja.value = null
    impactoBaja.value = null
    await cargarDatos()
    notificar(
      accion === 'desactivar'
        ? `La cuenta de ${nombre} quedó inactiva.`
        : `La cuenta de ${nombre} se eliminó correctamente.`
    )
  } catch (err) {
    errorBaja.value = mensajeErrorAccion(err)
  } finally {
    procesandoBaja.value = false
    eliminandoId.value = null
  }
}

const abrirBaja = async (usuario) => {
  if (esPropio(usuario) || procesandoBaja.value) return

  usuarioBaja.value = usuario
  impactoBaja.value = null
  errorBaja.value = ''
  eliminandoId.value = usuario.id_usuario

  try {
    const respuesta = await obtenerImpactoUsuario(usuario.id_usuario)
    impactoBaja.value = respuesta.impacto
  } catch (err) {
    errorBaja.value = mensajeErrorAccion(err)
  } finally {
    eliminandoId.value = null
  }
}

const reintentarBaja = () => {
  const usuario = usuarioBaja.value
  if (!usuario) return
  usuarioBaja.value = null
  errorBaja.value = ''
  abrirBaja(usuario)
}

onMounted(cargarDatos)

onBeforeUnmount(() => {
  if (temporizadorNotificacion) clearTimeout(temporizadorNotificacion)
})
</script>

<template>
  <section class="admin-panel">
    <div v-if="errorAccion" class="notice notice-error" role="alert">
      <span><i class="fas fa-circle-exclamation me-2"></i>{{ errorAccion }}</span>
      <button
        type="button"
        class="notice-close"
        aria-label="Cerrar aviso"
        @click="errorAccion = ''"
      >
        ×
      </button>
    </div>

    <!-- Cabecera -->
    <div class="panel-heading">
      <div>
        <span class="eyebrow">Administración</span>
        <h2>Usuarios</h2>
        <p>Resumen general de las cuentas registradas.</p>
      </div>
      <div class="panel-heading-actions">
        <button
          type="button"
          class="btn-panel btn-panel-ghost"
          :disabled="loading"
          @click="cargarDatos"
        >
          <i class="fas fa-rotate"></i>
          Actualizar
        </button>
        <button type="button" class="btn-panel btn-panel-primary" @click="abrirNuevo">
          <i class="fas fa-user-plus"></i>
          Nuevo usuario
        </button>
      </div>
    </div>

    <!-- Tarjetas de estadísticas -->
    <div class="stats-grid">
      <div class="stat-card">
        <p>Total registrados</p>
        <strong>{{ totalUsuarios }}</strong>
      </div>
      <div class="stat-card">
        <p>Activos</p>
        <strong>{{ usuariosActivos }}</strong>
      </div>
      <div class="stat-card">
        <p>Roles de Admin</p>
        <strong>{{ usuariosAdmin }}</strong>
      </div>
      <div class="stat-card is-danger">
        <p>Suspendidos</p>
        <strong>{{ usuariosInactivos }}</strong>
      </div>
    </div>

    <!-- Contenedor principal -->
    <div class="panel">
      <div class="panel-title-bar">
        <h3>Administrar usuarios</h3>
      </div>

      <!-- Barra de búsqueda y filtros -->
      <div class="panel-toolbar">
        <div class="panel-filters">
          <div class="field field-search">
            <label class="visually-hidden" for="buscar-usuarios">Buscar usuarios</label>
            <i class="fas fa-search"></i>
            <input
              id="buscar-usuarios"
              v-model="search"
              class="form-control panel-control"
              type="search"
              placeholder="Buscar por nombre, apellidos o correo..."
              autocomplete="off"
            >
          </div>

          <div class="field">
            <label for="filtrar-rol">Rol</label>
            <select id="filtrar-rol" v-model="filtroRol" class="form-select panel-control">
              <option value="Todos">Todos</option>
              <option v-for="rol in rolesDisponibles" :key="rol" :value="rol">
                {{ rol }}
              </option>
            </select>
          </div>

          <div class="field">
            <label for="filtrar-estado">Estado</label>
            <select id="filtrar-estado" v-model="filtroEstado" class="form-select panel-control">
              <option value="Todos">Todos</option>
              <option v-for="estado in estadosDisponibles" :key="estado" :value="estado">
                {{ estado }}
              </option>
            </select>
          </div>

          <div class="field">
            <label class="d-none d-lg-block" aria-hidden="true">&nbsp;</label>
            <button
              type="button"
              class="btn-panel btn-panel-ghost"
              :disabled="!hayFiltrosActivos"
              @click="limpiarFiltros"
            >
              Limpiar filtros
              <span v-if="filtrosActivos > 0" class="filter-count">{{ filtrosActivos }}</span>
            </button>
          </div>
        </div>

        <p class="panel-count">
          Mostrando
          <strong>{{ indiceInicio }}-{{ indiceFin }}</strong>
          de
          <strong>{{ usuariosFiltrados.length }}</strong>
          usuarios
          <span v-if="hayFiltrosActivos">(filtrados de {{ totalUsuarios }} en total)</span>
        </p>
      </div>

      <!-- Estado de carga / error / vacío -->
      <div v-if="loading" class="panel-state">
        <span class="spinner-border spinner-border-sm me-2" role="status"></span>
        Cargando usuarios...
      </div>
      <div v-else-if="error" class="panel-state is-error">{{ error }}</div>
      <div v-else-if="usuariosFiltrados.length === 0" class="panel-state">
        <i class="fas fa-user-slash fs-4 d-block mb-2"></i>
        {{
          hayFiltrosActivos
            ? 'No se encontraron usuarios que coincidan con los filtros.'
            : 'No hay usuarios registrados.'
        }}
      </div>

      <template v-else>
        <!-- Vista de escritorio: tabla -->
        <div class="panel-table-wrap">
          <table class="panel-table">
            <thead>
              <tr>
                <th class="cell-index">#</th>
                <th style="width: 24%">Usuario</th>
                <th style="width: 26%">Correo electrónico</th>
                <th style="width: 12%">Rol</th>
                <th style="width: 12%">Estado</th>
                <th class="cell-actions text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(usuario, indice) in usuariosPaginados" :key="usuario.id_usuario">
                <td class="cell-index">
                  {{ (paginaActual - 1) * porPagina + indice + 1 }}
                </td>
                <td class="cell-truncate">
                  <div class="user-cell">
                    <span class="avatar-soft">{{ iniciales(usuario) }}</span>
                    <span
                      class="truncate fw-semibold"
                      :title="nombreCompleto(usuario)"
                    >
                      {{ nombreCompleto(usuario) }}
                    </span>
                  </div>
                </td>
                <td class="cell-truncate">
                  <span class="truncate text-muted" :title="usuario.correo">
                    {{ usuario.correo }}
                  </span>
                </td>
                <td class="cell-truncate">
                  <span class="truncate" :title="usuario.nombre_rol">
                    {{ usuario.nombre_rol }}
                  </span>
                </td>
                <td>
                  <span
                    class="badge-estado"
                    :class="esActivo(usuario) ? 'is-active' : 'is-inactive'"
                  >
                    {{ usuario.estado_cuenta }}
                  </span>
                </td>
                <td>
                  <div class="action-stack">
                    <button
                      type="button"
                      class="btn-row"
                      @click="abrirEdicion(usuario)"
                    >
                      Editar
                    </button>
                    <button
                      v-if="!esActivo(usuario)"
                      type="button"
                      class="btn-row is-success"
                      @click="activarUsuario(usuario)"
                    >
                      Activar
                    </button>
                    <button
                      type="button"
                      class="btn-row is-danger"
                      :disabled="esPropio(usuario) || eliminandoId === usuario.id_usuario"
                      :title="esPropio(usuario)
                        ? 'No puedes eliminar tu propia cuenta'
                        : 'Eliminar usuario'"
                      @click="abrirBaja(usuario)"
                    >
                      {{ eliminandoId === usuario.id_usuario ? 'Cargando…' : 'Eliminar' }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Vista móvil: cards -->
        <div class="mobile-list">
          <article
            v-for="(usuario, indice) in usuariosPaginados"
            :key="`movil-${usuario.id_usuario}`"
            class="mobile-card"
          >
            <div class="mobile-card-head">
              <span class="mobile-index">
                {{ (paginaActual - 1) * porPagina + indice + 1 }}
              </span>
              <span class="avatar-soft">{{ iniciales(usuario) }}</span>
              <div class="mobile-card-title">
                <h4 class="truncate" :title="nombreCompleto(usuario)">
                  {{ nombreCompleto(usuario) }}
                </h4>
                <p class="truncate" :title="usuario.correo">{{ usuario.correo }}</p>
              </div>
            </div>

            <div class="mobile-meta">
              <div class="min-w-0">
                <p>Rol</p>
                <strong class="truncate" :title="usuario.nombre_rol">
                  {{ usuario.nombre_rol }}
                </strong>
              </div>
              <div>
                <p>Estado</p>
                <span
                  class="badge-estado"
                  :class="esActivo(usuario) ? 'is-active' : 'is-inactive'"
                >
                  {{ usuario.estado_cuenta }}
                </span>
              </div>
            </div>

            <div class="mobile-actions">
              <button type="button" class="btn-row" @click="abrirEdicion(usuario)">
                Editar
              </button>
              <button
                v-if="!esActivo(usuario)"
                type="button"
                class="btn-row is-success"
                @click="activarUsuario(usuario)"
              >
                Activar
              </button>
              <button
                type="button"
                class="btn-row is-danger"
                :disabled="esPropio(usuario) || eliminandoId === usuario.id_usuario"
                :title="esPropio(usuario)
                  ? 'No puedes eliminar tu propia cuenta'
                  : 'Eliminar usuario'"
                @click="abrirBaja(usuario)"
              >
                {{ eliminandoId === usuario.id_usuario ? 'Cargando…' : 'Eliminar' }}
              </button>
            </div>
          </article>
        </div>

        <!-- Paginación numerada -->
        <div v-if="totalPaginas > 1" class="panel-footer">
          <p>
            Página <strong>{{ paginaActual }}</strong> de <strong>{{ totalPaginas }}</strong>
          </p>

          <nav class="pagination" aria-label="Paginación de usuarios">
            <button
              type="button"
              class="page-btn"
              title="Primera página"
              :disabled="paginaActual === 1"
              @click="paginaActual = 1"
            >
              «
            </button>
            <button
              type="button"
              class="page-btn"
              title="Página anterior"
              :disabled="paginaActual === 1"
              @click="paginaActual = Math.max(1, paginaActual - 1)"
            >
              ‹
            </button>

            <template v-for="(numero, indice) in numerosPagina" :key="`pagina-${indice}`">
              <span v-if="numero === '...'" class="page-ellipsis">…</span>
              <button
                v-else
                type="button"
                class="page-btn"
                :class="{ 'is-current': paginaActual === numero }"
                :aria-current="paginaActual === numero ? 'page' : undefined"
                @click="paginaActual = numero"
              >
                {{ numero }}
              </button>
            </template>

            <button
              type="button"
              class="page-btn"
              title="Página siguiente"
              :disabled="paginaActual === totalPaginas"
              @click="paginaActual = Math.min(totalPaginas, paginaActual + 1)"
            >
              ›
            </button>
            <button
              type="button"
              class="page-btn"
              title="Última página"
              :disabled="paginaActual === totalPaginas"
              @click="paginaActual = totalPaginas"
            >
              »
            </button>
          </nav>
        </div>
      </template>
    </div>

    <!-- Notificación flotante -->
    <div class="toast-stack" aria-live="polite">
      <Transition name="toast">
        <div v-if="notificacion" class="toast-item" role="status">
          <i class="fas fa-circle-check"></i>
          <span>{{ notificacion }}</span>
        </div>
      </Transition>
    </div>

    <!-- Modal de alta / edición -->
    <div v-if="modalAbierto" class="modal-backdrop-custom" @click.self="modalAbierto = false">
      <section class="user-modal card border-0" role="dialog" aria-modal="true" aria-labelledby="user-modal-title">
        <div class="modal-head">
          <div class="d-flex align-items-center gap-3">
            <span class="modal-icon">
              <i class="fas" :class="editando ? 'fa-user-pen' : 'fa-user-plus'"></i>
            </span>
            <div>
              <h3 id="user-modal-title" class="h5 fw-bold mb-1">
                {{ editando ? 'Editar usuario' : 'Nuevo usuario' }}
              </h3>
              <p class="text-muted small mb-0">Los campos con * son obligatorios.</p>
            </div>
          </div>
          <button type="button" class="btn-close" aria-label="Cerrar" @click="modalAbierto = false"></button>
        </div>

        <form class="p-4 pt-3" novalidate @submit.prevent="guardarUsuario">
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label" for="nombres">Nombre <span class="req">*</span></label>
              <input
                id="nombres"
                v-model="form.nombres"
                class="form-control"
                :class="{ 'is-invalid': errores.nombres && touched.nombres }"
                maxlength="80"
                autocomplete="given-name"
                :aria-invalid="Boolean(errores.nombres && touched.nombres)"
                @input="alEscribir('nombres')"
                @blur="alSalir('nombres')"
              >
              <p v-if="errores.nombres && touched.nombres" class="error-text" role="alert">
                <i class="fas fa-circle-exclamation"></i>{{ errores.nombres }}
              </p>
            </div>
            <div class="col-md-6">
              <label class="form-label" for="apellido-paterno">
                Apellido paterno <span class="req">*</span>
              </label>
              <input
                id="apellido-paterno"
                v-model="form.apellido_paterno"
                class="form-control"
                :class="{ 'is-invalid': errores.apellido_paterno && touched.apellido_paterno }"
                maxlength="60"
                autocomplete="family-name"
                :aria-invalid="Boolean(errores.apellido_paterno && touched.apellido_paterno)"
                @input="alEscribir('apellido_paterno')"
                @blur="alSalir('apellido_paterno')"
              >
              <p
                v-if="errores.apellido_paterno && touched.apellido_paterno"
                class="error-text"
                role="alert"
              >
                <i class="fas fa-circle-exclamation"></i>{{ errores.apellido_paterno }}
              </p>
            </div>
            <div class="col-md-6">
              <label class="form-label" for="apellido-materno">Apellido materno</label>
              <input
                id="apellido-materno"
                v-model="form.apellido_materno"
                class="form-control"
                :class="{ 'is-invalid': errores.apellido_materno && touched.apellido_materno }"
                maxlength="60"
                autocomplete="additional-name"
                :aria-invalid="Boolean(errores.apellido_materno && touched.apellido_materno)"
                @input="alEscribir('apellido_materno')"
                @blur="alSalir('apellido_materno')"
              >
              <p
                v-if="errores.apellido_materno && touched.apellido_materno"
                class="error-text"
                role="alert"
              >
                <i class="fas fa-circle-exclamation"></i>{{ errores.apellido_materno }}
              </p>
            </div>
            <div class="col-md-6">
              <label class="form-label" for="fecha-nacimiento">
                Fecha de nacimiento <span class="req">*</span>
              </label>
              <input
                id="fecha-nacimiento"
                v-model="form.fecha_nacimiento"
                class="form-control"
                :class="{ 'is-invalid': errores.fecha_nacimiento && touched.fecha_nacimiento }"
                type="date"
                :min="FECHA_MINIMA"
                :max="fechaMaxima"
                autocomplete="bday"
                :aria-invalid="Boolean(errores.fecha_nacimiento && touched.fecha_nacimiento)"
                @input="alEscribir('fecha_nacimiento')"
                @blur="alSalir('fecha_nacimiento')"
              >
              <p
                v-if="errores.fecha_nacimiento && touched.fecha_nacimiento"
                class="error-text"
                role="alert"
              >
                <i class="fas fa-circle-exclamation"></i>{{ errores.fecha_nacimiento }}
              </p>
            </div>
            <div class="col-md-6">
              <label class="form-label" for="correo">Correo <span class="req">*</span></label>
              <input
                id="correo"
                v-model="form.correo"
                class="form-control"
                :class="{ 'is-invalid': errores.correo && touched.correo }"
                type="email"
                inputmode="email"
                maxlength="120"
                autocomplete="email"
                placeholder="nombre@correo.com"
                :aria-invalid="Boolean(errores.correo && touched.correo)"
                @input="alEscribir('correo')"
                @blur="alSalir('correo')"
              >
              <p v-if="errores.correo && touched.correo" class="error-text" role="alert">
                <i class="fas fa-circle-exclamation"></i>{{ errores.correo }}
              </p>
            </div>
            <div class="col-md-6">
              <label class="form-label" for="ci-nit">CI / NIT <span class="req">*</span></label>
              <input
                id="ci-nit"
                v-model="form.ci_nit"
                class="form-control"
                :class="{ 'is-invalid': errores.ci_nit && touched.ci_nit }"
                maxlength="20"
                autocomplete="off"
                placeholder="Ej.: 4587123"
                :aria-invalid="Boolean(errores.ci_nit && touched.ci_nit)"
                @input="alEscribir('ci_nit')"
                @blur="alSalir('ci_nit')"
              >
              <p v-if="errores.ci_nit && touched.ci_nit" class="error-text" role="alert">
                <i class="fas fa-circle-exclamation"></i>{{ errores.ci_nit }}
              </p>
            </div>
            <div class="col-md-6">
              <label class="form-label" for="rol">Rol <span class="req">*</span></label>
              <select
                id="rol"
                v-model="form.id_rol"
                class="form-select"
                :class="{ 'is-invalid': errores.id_rol && touched.id_rol }"
                :aria-invalid="Boolean(errores.id_rol && touched.id_rol)"
                @change="alSalir('id_rol')"
                @blur="alSalir('id_rol')"
              >
                <option value="" disabled>Selecciona un rol</option>
                <option v-for="rol in roles" :key="rol.id_rol" :value="String(rol.id_rol)">
                  {{ rol.nombre_rol }}
                </option>
              </select>
              <p v-if="errores.id_rol && touched.id_rol" class="error-text" role="alert">
                <i class="fas fa-circle-exclamation"></i>{{ errores.id_rol }}
              </p>
            </div>
            <div class="col-md-6">
              <label class="form-label" for="contrasena">
                {{ editando ? 'Restablecer contraseña (opcional)' : 'Contraseña inicial' }}
                <span v-if="!editando" class="req">*</span>
              </label>
              <div
                class="custom-input-group"
                :class="{ 'has-error': errores.contrasena && touched.contrasena }"
              >
                <span class="input-group-text"><i class="fas fa-lock"></i></span>
                <input
                  id="contrasena"
                  v-model="form.contrasena"
                  class="form-control"
                  :type="showPassword ? 'text' : 'password'"
                  maxlength="72"
                  autocomplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  :aria-invalid="Boolean(errores.contrasena && touched.contrasena)"
                  @input="alEscribir('contrasena')"
                  @blur="alSalir('contrasena')"
                >
                <button
                  type="button"
                  class="password-toggle"
                  :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                  @click="showPassword = !showPassword"
                >
                  <i class="fas" :class="showPassword ? 'fa-eye-slash' : 'fa-eye'"></i>
                </button>
              </div>
              <p v-if="errores.contrasena && touched.contrasena" class="error-text" role="alert">
                <i class="fas fa-circle-exclamation"></i>{{ errores.contrasena }}
              </p>
              <div v-else class="form-text">
                {{
                  editando
                    ? 'Déjalo vacío para conservar la contraseña actual.'
                    : 'Mínimo 8 caracteres, con al menos una letra y un número. Sin espacios.'
                }}
              </div>
            </div>
          </div>

          <div v-if="errorFormulario" class="notice notice-error mt-3" role="alert">
            <span><i class="fas fa-circle-exclamation me-2"></i>{{ errorFormulario }}</span>
          </div>

          <div class="d-flex justify-content-end gap-2 mt-4">
            <button type="button" class="btn btn-ghost rounded-pill px-3" @click="modalAbierto = false">
              Cancelar
            </button>
            <button type="submit" class="btn btn-brand rounded-pill px-4" :disabled="saving">
              <span v-if="saving" class="spinner-border spinner-border-sm me-2" role="status"></span>
              {{ saving ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </form>
      </section>
    </div>

    <!-- Modal de baja con impacto -->
    <div
      v-if="usuarioBaja"
      class="panel-modal-backdrop"
      role="presentation"
      @mousedown.self="cerrarModalBaja"
    >
      <section
        class="panel-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-baja-usuario"
      >
        <div class="panel-modal-head">
          <div>
            <h3 id="titulo-baja-usuario">Gestionar baja de usuario</h3>
            <p>{{ nombreCompleto(usuarioBaja) }}</p>
          </div>
          <button
            type="button"
            class="panel-modal-close"
            aria-label="Cerrar"
            :disabled="procesandoBaja"
            @click="cerrarModalBaja"
          >
            ×
          </button>
        </div>

        <div v-if="errorBaja" class="notice notice-error mt-4" role="alert">
          <span><i class="fas fa-circle-exclamation me-2"></i>{{ errorBaja }}</span>
        </div>

        <div v-else-if="!impactoBaja" class="panel-state">
          <span class="spinner-border spinner-border-sm me-2" role="status"></span>
          Calculando registros asociados...
        </div>

        <template v-else-if="impactoBaja.total > 0">
          <p class="mt-4 mb-0 small">
            Este usuario tiene registros asociados en el sistema:
          </p>
          <ul class="impact-list">
            <li v-if="impactoBaja.ventas > 0">
              Ventas registradas: <strong>{{ impactoBaja.ventas }}</strong>
            </li>
            <li v-if="impactoBaja.historial > 0">
              Movimientos de historial: <strong>{{ impactoBaja.historial }}</strong>
            </li>
          </ul>
          <div class="notice notice-warning mt-3">
            <span>
              <i class="fas fa-triangle-exclamation me-2"></i>
              La cuenta quedará marcada como <strong>eliminada</strong> y su historial se conservará.
            </span>
          </div>
        </template>

        <p v-else class="mt-4 mb-0 small">
          ¿Quieres eliminar a <strong>{{ nombreCompleto(usuarioBaja) }}</strong>?
          No tiene registros asociados en el sistema.
        </p>

        <div class="panel-modal-actions">
          <button
            type="button"
            class="btn-panel btn-panel-ghost"
            :disabled="procesandoBaja"
            @click="cerrarModalBaja"
          >
            Cancelar
          </button>

          <button
            v-if="errorBaja && !impactoBaja"
            type="button"
            class="btn-panel btn-panel-danger"
            :disabled="procesandoBaja"
            @click="reintentarBaja"
          >
            Reintentar
          </button>

          <template v-else>
            <button
              type="button"
              class="btn-panel btn-panel-warning"
              :disabled="procesandoBaja || !impactoBaja || !esActivo(usuarioBaja)"
              :title="!esActivo(usuarioBaja)
                ? 'La cuenta ya está desactivada'
                : 'Desactivar la cuenta sin eliminarla'"
              @click="ejecutarBaja('desactivar')"
            >
              Desactivar
            </button>
            <button
              type="button"
              class="btn-panel btn-panel-danger"
              :disabled="procesandoBaja || !impactoBaja"
              @click="ejecutarBaja('eliminar')"
            >
              {{ procesandoBaja ? 'Procesando...' : 'Eliminar' }}
            </button>
          </template>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.min-w-0 {
  min-width: 0;
}

.modal-backdrop-custom {
  position: fixed;
  inset: 0;
  z-index: 1080;
  display: grid;
  place-items: center;
  overflow-y: auto;
  padding: 1rem;
  background: rgba(5, 16, 45, 0.64);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.user-modal {
  width: min(100%, 780px);
  max-height: calc(100vh - 2rem);
  overflow-y: auto;
  background: var(--bg-card);
  color: var(--text-main);
  border-radius: 1.3rem;
  box-shadow: var(--shadow-lg);
}

.modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.5rem 1.5rem 0;
}

.modal-icon {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.9rem;
  background: var(--accent-soft);
  color: var(--primary);
  flex: 0 0 auto;
}

.password-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  color: var(--text-soft);
  border-radius: 0.6rem;
  transition: color 0.18s ease, background-color 0.18s ease;
  flex: 0 0 auto;
}

.password-toggle:hover {
  color: var(--primary);
  background: var(--accent-soft);
}

@media (max-width: 575.98px) {
  .modal-head {
    padding: 1.25rem 1.25rem 0;
  }
}
</style>
