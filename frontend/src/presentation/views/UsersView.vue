<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import ToastNotification from '../components/ToastNotification.vue'
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

const notificar = (texto) => {
  notificacion.value = texto
}

const formularioInicial = () => ({
  id_usuario: null,
  nombres: '',
  apellido_paterno: '',
  apellido_materno: '',
  fecha_nacimiento: '',
  correo: '',
  ci: '',
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
        usuario.ci,
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

const cerrarModalUsuario = () => {
  if (saving.value) return
  modalAbierto.value = false
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
    ci: usuario.ci,
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
    ci: form.value.ci.trim(),
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
</script>

<template>
  <section class="admin-panel">
    <div v-if="errorAccion" class="notice notice-error" role="alert">
      <span class="flex items-start gap-2"><i class="fas fa-circle-exclamation mt-0.5 shrink-0" aria-hidden="true"></i>{{ errorAccion }}</span>
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
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-5 py-2.5 text-sm font-bold text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-55"
          :disabled="loading"
          @click="cargarDatos"
        >
          <i class="fas fa-rotate" :class="{ 'animate-spin': loading }" aria-hidden="true"></i>
          Actualizar
        </button>
        <button
          type="button"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#2a468b] to-[#3d6ac1] px-5 py-2.5 text-sm font-bold text-[#fff7e3] shadow-md transition hover:-translate-y-0.5 hover:from-[#1e356d] hover:to-[#2a468b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          @click="abrirNuevo"
        >
          <i class="fas fa-user-plus" aria-hidden="true"></i>
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
        <div class="grid grid-cols-1 items-end gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <div class="field-search flex min-w-0 flex-col gap-1.5">
            <label class="sr-only" for="buscar-usuarios">Buscar usuarios</label>
            <i class="fas fa-search"></i>
            <input
              id="buscar-usuarios"
              v-model="search"
              class="form-input panel-control"
              type="search"
              placeholder="Buscar por nombre, apellidos o correo..."
              autocomplete="off"
            >
          </div>

          <div class="flex min-w-0 flex-col gap-1.5">
            <label for="filtrar-rol">Rol</label>
            <select id="filtrar-rol" v-model="filtroRol" class="form-select panel-control">
              <option value="Todos">Todos</option>
              <option v-for="rol in rolesDisponibles" :key="rol" :value="rol">
                {{ rol }}
              </option>
            </select>
          </div>

          <div class="flex min-w-0 flex-col gap-1.5">
            <label for="filtrar-estado">Estado</label>
            <select id="filtrar-estado" v-model="filtroEstado" class="form-select panel-control">
              <option value="Todos">Todos</option>
              <option v-for="estado in estadosDisponibles" :key="estado" :value="estado">
                {{ estado }}
              </option>
            </select>
          </div>

          <div class="flex min-w-0 flex-col gap-1.5">
            <div class="hidden lg:block" aria-hidden="true">&nbsp;</div>
            <button
              type="button"
              class="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2.5 text-sm font-bold text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-55"
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
        <span class="mr-2 inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent align-[-0.2em]" role="status" aria-label="Cargando"></span>
        Cargando usuarios...
      </div>
      <div v-else-if="error" class="panel-state is-error">{{ error }}</div>
      <div v-else-if="usuariosFiltrados.length === 0" class="panel-state">
        <i class="fas fa-user-slash mb-2 block text-2xl" aria-hidden="true"></i>
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
                <th class="w-[24%]">Usuario</th>
                <th class="w-[26%]">Correo electrónico</th>
                <th class="w-[12%]">Rol</th>
                <th class="w-[12%]">Estado</th>
                <th class="cell-actions text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(usuario, indice) in usuariosPaginados" :key="usuario.id_usuario">
                <td class="cell-index">
                  {{ (paginaActual - 1) * porPagina + indice + 1 }}
                </td>
                <td class="cell-truncate">
                  <div class="user-cell">
                    <span class="avatar-soft" aria-hidden="true">{{ iniciales(usuario) }}</span>
                    <span
                      class="truncate font-semibold"
                      :title="nombreCompleto(usuario)"
                    >
                      {{ nombreCompleto(usuario) }}
                    </span>
                  </div>
                </td>
                <td class="cell-truncate">
                  <span class="truncate text-[var(--text-muted)]" :title="usuario.correo">
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
                  <div class="flex flex-wrap justify-end gap-1.5">
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
    <ToastNotification :message="notificacion" @close="notificacion = ''" />

    <!-- Modal de alta / edición -->
    <div
      v-if="modalAbierto"
      class="fixed inset-0 z-[1080] grid place-items-center overflow-y-auto bg-[#05102d]/65 p-3 backdrop-blur-sm sm:p-6"
      @click.self="cerrarModalUsuario"
    >
      <section
        class="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl overflow-y-auto rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-main)] shadow-2xl sm:max-h-[calc(100dvh-3rem)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-modal-title"
      >
        <div class="flex items-start justify-between gap-4 px-4 pt-5 sm:px-6 sm:pt-6">
          <div class="flex min-w-0 items-center gap-3">
            <span class="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--primary)]">
              <i class="fas" :class="editando ? 'fa-user-pen' : 'fa-user-plus'" aria-hidden="true"></i>
            </span>
            <div class="min-w-0">
              <h3 id="user-modal-title" class="mb-1 text-lg font-extrabold">
                {{ editando ? 'Editar usuario' : 'Nuevo usuario' }}
              </h3>
              <p class="mb-0 text-sm text-[var(--text-muted)]">Los campos con * son obligatorios.</p>
            </div>
          </div>
          <button
            type="button"
            class="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-xl text-[var(--text-muted)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Cerrar"
            :disabled="saving"
            @click="cerrarModalUsuario"
          >
            <i class="fas fa-xmark" aria-hidden="true"></i>
          </button>
        </div>

        <form class="p-4 pt-4 sm:px-6 sm:pb-6" novalidate @submit.prevent="guardarUsuario">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="form-label" for="nombres">Nombre <span class="req">*</span></label>
              <input
                id="nombres"
                v-model="form.nombres"
                class="form-input"
                :class="{ 'has-error': errores.nombres && touched.nombres }"
                maxlength="80"
                autocomplete="given-name"
                :aria-invalid="Boolean(errores.nombres && touched.nombres)"
                @input="alEscribir('nombres')"
                @blur="alSalir('nombres')"
              >
              <p class="error-text" role="alert">
                <template v-if="errores.nombres && touched.nombres">
                  <i class="fas fa-circle-exclamation"></i>{{ errores.nombres }}
                </template>
              </p>
            </div>
            <div>
              <label class="form-label" for="apellido-paterno">
                Apellido paterno <span class="req">*</span>
              </label>
              <input
                id="apellido-paterno"
                v-model="form.apellido_paterno"
                class="form-input"
                :class="{ 'has-error': errores.apellido_paterno && touched.apellido_paterno }"
                maxlength="60"
                autocomplete="family-name"
                :aria-invalid="Boolean(errores.apellido_paterno && touched.apellido_paterno)"
                @input="alEscribir('apellido_paterno')"
                @blur="alSalir('apellido_paterno')"
              >
              <p
                class="error-text"
                role="alert"
              >
                <template v-if="errores.apellido_paterno && touched.apellido_paterno">
                  <i class="fas fa-circle-exclamation"></i>{{ errores.apellido_paterno }}
                </template>
              </p>
            </div>
            <div>
              <label class="form-label" for="apellido-materno">Apellido materno</label>
              <input
                id="apellido-materno"
                v-model="form.apellido_materno"
                class="form-input"
                :class="{ 'has-error': errores.apellido_materno && touched.apellido_materno }"
                maxlength="60"
                autocomplete="additional-name"
                :aria-invalid="Boolean(errores.apellido_materno && touched.apellido_materno)"
                @input="alEscribir('apellido_materno')"
                @blur="alSalir('apellido_materno')"
              >
              <p
                class="error-text"
                role="alert"
              >
                <template v-if="errores.apellido_materno && touched.apellido_materno">
                  <i class="fas fa-circle-exclamation"></i>{{ errores.apellido_materno }}
                </template>
              </p>
            </div>
            <div>
              <label class="form-label" for="fecha-nacimiento">
                Fecha de nacimiento <span class="req">*</span>
              </label>
              <input
                id="fecha-nacimiento"
                v-model="form.fecha_nacimiento"
                class="form-input"
                :class="{ 'has-error': errores.fecha_nacimiento && touched.fecha_nacimiento }"
                type="date"
                :min="FECHA_MINIMA"
                :max="fechaMaxima"
                autocomplete="bday"
                :aria-invalid="Boolean(errores.fecha_nacimiento && touched.fecha_nacimiento)"
                @input="alEscribir('fecha_nacimiento')"
                @blur="alSalir('fecha_nacimiento')"
              >
              <p
                class="error-text"
                role="alert"
              >
                <template v-if="errores.fecha_nacimiento && touched.fecha_nacimiento">
                  <i class="fas fa-circle-exclamation"></i>{{ errores.fecha_nacimiento }}
                </template>
              </p>
            </div>
            <div>
              <label class="form-label" for="correo">Correo <span class="req">*</span></label>
              <input
                id="correo"
                v-model="form.correo"
                class="form-input"
                :class="{ 'has-error': errores.correo && touched.correo }"
                type="email"
                inputmode="email"
                maxlength="120"
                autocomplete="email"
                placeholder="nombre@correo.com"
                :aria-invalid="Boolean(errores.correo && touched.correo)"
                @input="alEscribir('correo')"
                @blur="alSalir('correo')"
              >
              <p class="error-text" role="alert">
                <template v-if="errores.correo && touched.correo">
                  <i class="fas fa-circle-exclamation"></i>{{ errores.correo }}
                </template>
              </p>
            </div>
            <div>
              <label class="form-label" for="ci-nit">CI / NIT <span class="req">*</span></label>
              <input
                id="ci-nit"
                v-model="form.ci"
                class="form-input"
                :class="{ 'has-error': errores.ci && touched.ci }"
                maxlength="20"
                autocomplete="off"
                placeholder="Ej.: 4587123"
                :aria-invalid="Boolean(errores.ci && touched.ci)"
                @input="alEscribir('ci')"
                @blur="alSalir('ci')"
              >
              <p class="error-text" role="alert">
                <template v-if="errores.ci && touched.ci">
                  <i class="fas fa-circle-exclamation"></i>{{ errores.ci }}
                </template>
              </p>
            </div>
            <div>
              <label class="form-label" for="rol">Rol <span class="req">*</span></label>
              <select
                id="rol"
                v-model="form.id_rol"
                class="form-select"
                :class="{ 'has-error': errores.id_rol && touched.id_rol }"
                :aria-invalid="Boolean(errores.id_rol && touched.id_rol)"
                @change="alSalir('id_rol')"
                @blur="alSalir('id_rol')"
              >
                <option value="" disabled>Selecciona un rol</option>
                <option v-for="rol in roles" :key="rol.id_rol" :value="String(rol.id_rol)">
                  {{ rol.nombre_rol }}
                </option>
              </select>
              <p class="error-text" role="alert">
                <template v-if="errores.id_rol && touched.id_rol">
                  <i class="fas fa-circle-exclamation"></i>{{ errores.id_rol }}
                </template>
              </p>
            </div>
            <div>
              <label class="form-label" for="contrasena">
                {{ editando ? 'Restablecer contraseña (opcional)' : 'Contraseña inicial' }}
                <span v-if="!editando" class="req">*</span>
              </label>
              <div
                class="flex min-w-0 items-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] transition focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--ring)]"
                :class="{ 'border-[var(--danger)]': errores.contrasena && touched.contrasena }"
              >
                <span class="pl-4 text-[var(--text-soft)]" aria-hidden="true"><i class="fas fa-lock"></i></span>
                <input
                  id="contrasena"
                  v-model="form.contrasena"
                  class="min-w-0 w-full border-0 bg-transparent px-3 py-3 text-sm text-[var(--text-main)] outline-none placeholder:text-[var(--text-soft)] focus:ring-0"
                  :type="showPassword ? 'text' : 'password'"
                  maxlength="72"
                  autocomplete="new-password"
                  placeholder="Mínimo 6 caracteres"
                  :aria-invalid="Boolean(errores.contrasena && touched.contrasena)"
                  @input="alEscribir('contrasena')"
                  @blur="alSalir('contrasena')"
                >
                <button
                  type="button"
                  class="mr-1 inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-[var(--text-soft)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
                  :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                  @click="showPassword = !showPassword"
                >
                  <i class="fas" :class="showPassword ? 'fa-eye-slash' : 'fa-eye'" aria-hidden="true"></i>
                </button>
              </div>
              <p v-if="errores.contrasena && touched.contrasena" class="error-text" role="alert">
                <i class="fas fa-circle-exclamation"></i>{{ errores.contrasena }}
              </p>
              <div v-else class="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                {{
                  editando
                    ? 'Déjalo vacío para conservar la contraseña actual.'
                    : 'Mínimo 6 caracteres, con al menos una letra y un número. Sin espacios.'
                }}
              </div>
            </div>
          </div>

          <div v-if="errorFormulario" class="notice notice-error mt-3" role="alert">
            <span class="flex items-start gap-2"><i class="fas fa-circle-exclamation mt-0.5 shrink-0" aria-hidden="true"></i>{{ errorFormulario }}</span>
          </div>

          <div class="mt-5 flex flex-col-reverse justify-end gap-2 sm:flex-row">
            <button
              type="button"
              class="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-5 py-2.5 text-sm font-bold text-[var(--text-muted)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-55"
              :disabled="saving"
              @click="cerrarModalUsuario"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#2a468b] to-[#3d6ac1] px-5 py-2.5 text-sm font-bold text-[#fff7e3] shadow-md transition hover:from-[#1e356d] hover:to-[#2a468b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-55"
              :disabled="saving"
            >
              <span v-if="saving" class="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent" role="status" aria-label="Guardando"></span>
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
            <i class="fas fa-xmark" aria-hidden="true"></i>
          </button>
        </div>

        <div v-if="errorBaja" class="notice notice-error mt-4" role="alert">
          <span class="flex items-start gap-2"><i class="fas fa-circle-exclamation mt-0.5 shrink-0" aria-hidden="true"></i>{{ errorBaja }}</span>
        </div>

        <div v-else-if="!impactoBaja" class="panel-state">
          <span class="mr-2 inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent align-[-0.2em]" role="status" aria-label="Calculando"></span>
          Calculando registros asociados...
        </div>

        <template v-else-if="impactoBaja.total > 0">
          <p class="mt-4 mb-0 text-sm">
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
              <i class="fas fa-triangle-exclamation mr-2" aria-hidden="true"></i>
              La cuenta quedará marcada como <strong>eliminada</strong> y su historial se conservará.
            </span>
          </div>
        </template>

        <p v-else class="mt-4 mb-0 text-sm">
          ¿Quieres eliminar a <strong>{{ nombreCompleto(usuarioBaja) }}</strong>?
          No tiene registros asociados en el sistema.
        </p>

        <div class="panel-modal-actions">
          <button
            type="button"
            class="inline-flex min-h-10 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 text-sm font-bold text-[var(--text-muted)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-55"
            :disabled="procesandoBaja"
            @click="cerrarModalBaja"
          >
            Cancelar
          </button>

          <button
            v-if="errorBaja && !impactoBaja"
            type="button"
            class="inline-flex min-h-10 items-center justify-center rounded-full border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-2 text-sm font-bold text-[var(--danger)] transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-55"
            :disabled="procesandoBaja"
            @click="reintentarBaja"
          >
            Reintentar
          </button>

          <template v-else>
            <button
              type="button"
              class="inline-flex min-h-10 items-center justify-center rounded-full border border-[var(--warning)] bg-[var(--warning-soft)] px-4 py-2 text-sm font-bold text-[var(--warning)] transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--warning)] disabled:cursor-not-allowed disabled:opacity-55"
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
              class="inline-flex min-h-10 items-center justify-center rounded-full border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-2 text-sm font-bold text-[var(--danger)] transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-55"
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
