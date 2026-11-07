<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import ToastNotification from '../components/ToastNotification.vue'

import {
  listarProveedores,
  crearProveedor,
  actualizarProveedor
} from '../../data/endpoints/suppliers'

import { obtenerSesion } from '../../business/session'

import {
  limpiarCampoProveedor,
  validarCampoProveedor,
  validarFormularioProveedor
} from '../validators/supplier'

const proveedores = ref([])
const loading = ref(true)
const saving = ref(false)

const error = ref('')
const errorFormulario = ref('')
const notificacion = ref('')

const modalAbierto = ref(false)
const editando = ref(false)

const puedeGestionar = computed(() => [
  'Administrador',
  'Encargado de inventario'
].includes(obtenerSesion().rol))

const search = ref('')
const porPagina = 10
const paginaActual = ref(1)

const proveedoresFiltrados = computed(() => {
  const consulta = search.value.trim().toLocaleLowerCase()

  if (!consulta) return proveedores.value

  return proveedores.value.filter((proveedor) => {
    const valores = [
      proveedor.nombre_comercial,
      proveedor.ruc_nit,
      proveedor.telefono,
      proveedor.correo_electronico,
      proveedor.direccion
    ]

    return valores.some((valor) =>
      String(valor || '').toLocaleLowerCase().includes(consulta)
    )
  })
})

const totalPaginas = computed(() => (
  Math.max(1, Math.ceil(
    proveedoresFiltrados.value.length / porPagina
  ))
))

const proveedoresPaginados = computed(() => {
  const inicio = (paginaActual.value - 1) * porPagina

  return proveedoresFiltrados.value.slice(
    inicio,
    inicio + porPagina
  )
})

const numerosPagina = computed(() => {
  const total = totalPaginas.value
  const actual = paginaActual.value
  const maxVisible = 5

  if (total <= maxVisible + 2) {
    return Array.from({ length: total }, (_, indice) => indice + 1)
  }

  const paginas = [1]
  let inicio = Math.max(2, actual - 1)
  let fin = Math.min(total - 1, actual + 1)

  if (actual <= 3) {
    inicio = 2
    fin = 4
  } else if (actual >= total - 2) {
    inicio = total - 3
    fin = total - 1
  }

  if (inicio > 2) paginas.push('...')
  for (let pagina = inicio; pagina <= fin; pagina += 1) {
    paginas.push(pagina)
  }
  if (fin < total - 1) paginas.push('...')
  paginas.push(total)

  return paginas
})

const indiceInicio = computed(() => (
  proveedoresFiltrados.value.length === 0
    ? 0
    : (paginaActual.value - 1) * porPagina + 1
))

const indiceFin = computed(() => (
  Math.min(
    paginaActual.value * porPagina,
    proveedoresFiltrados.value.length
  )
))

watch(search, () => {
  paginaActual.value = 1
})

watch(totalPaginas, (total) => {
  if (paginaActual.value > total) {
    paginaActual.value = total
  }
})

const totalProveedores = computed(() => proveedores.value.length)

const proveedoresConTelefono = computed(() =>
  proveedores.value.filter((p) => p.telefono).length
)

const proveedoresConCorreo = computed(() =>
  proveedores.value.filter((p) => p.correo_electronico).length
)

const proveedoresSinCorreo = computed(() =>
  proveedores.value.filter((p) => !p.correo_electronico).length
)

const formularioInicial = () => ({
  id_proveedor: null,
  nombre_comercial: '',
  ruc_nit: '',
  telefono: '',
  correo_electronico: '',
  direccion: ''
})

const form = ref(formularioInicial())

const errores = ref({})
const touched = ref({})

const restablecerValidacion = () => {
  errores.value = {}
  touched.value = {}
}

const validarCampo = (campo) => {
  errores.value[campo] = validarCampoProveedor(
    campo,
    form.value[campo]
  )
}

const alEscribir = (campo) => {
  form.value[campo] = limpiarCampoProveedor(
    campo,
    form.value[campo]
  )

  if (touched.value[campo]) {
    validarCampo(campo)
  }
}

const alSalir = (campo) => {
  touched.value[campo] = true
  validarCampo(campo)
}

const validarFormulario = () => {
  errores.value = validarFormularioProveedor(form.value)

  Object.keys(errores.value).forEach((campo) => {
    touched.value[campo] = true
  })

  return !Object.values(errores.value).some(Boolean)
}

const notificar = (mensaje) => {
  notificacion.value = mensaje
}

const mensajeErrorAccion = (err) => {
  if (err.status === 401) {
    return 'Tu sesión expiró. Inicia sesión nuevamente.'
  }

  if (err.status === 403) {
    return 'No tienes permiso para gestionar proveedores.'
  }

  if (err.status === 409) {
    return err.message
  }

  return err.message || 'No se pudo completar la operación.'
}

const cargarProveedores = async () => {
  loading.value = true
  error.value = ''

  try {
    const resultado = await listarProveedores()

    proveedores.value = Array.isArray(resultado)
      ? resultado
      : []
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

  restablecerValidacion()

  modalAbierto.value = true
}

const abrirEdicion = (proveedor) => {
  editando.value = true

  form.value = {
    id_proveedor: proveedor.id_proveedor,
    nombre_comercial: proveedor.nombre_comercial || '',
    ruc_nit: proveedor.ruc_nit || '',
    telefono: proveedor.telefono || '',
    correo_electronico: proveedor.correo_electronico || '',
    direccion: proveedor.direccion || ''
  }

  errorFormulario.value = ''
  restablecerValidacion()

  modalAbierto.value = true
}

const cerrarModal = () => {
  if (saving.value) return

  modalAbierto.value = false
  errorFormulario.value = ''
  form.value = formularioInicial()

  restablecerValidacion()
}

const guardarProveedor = async () => {
  errorFormulario.value = ''

  if (!validarFormulario()) {
    errorFormulario.value =
      'Revisa los campos marcados antes de guardar.'

    return
  }

  saving.value = true

  const datos = {
    nombre_comercial: form.value.nombre_comercial.trim(),
    ruc_nit: form.value.ruc_nit.trim(),
    telefono: form.value.telefono.trim() || null,
    correo_electronico:
      form.value.correo_electronico.trim().toLowerCase() || null,
    direccion: form.value.direccion.trim() || null
  }

  try {
    const eraEdicion = editando.value

    if (eraEdicion) {
      await actualizarProveedor(
        form.value.id_proveedor,
        datos
      )
    } else {
      await crearProveedor(datos)
    }

    modalAbierto.value = false
    form.value = formularioInicial()

    restablecerValidacion()

    await cargarProveedores()

    notificar(
      eraEdicion
        ? 'Proveedor actualizado correctamente.'
        : 'Proveedor registrado correctamente.'
    )
  } catch (err) {
    errorFormulario.value = mensajeErrorAccion(err)
  } finally {
    saving.value = false
  }
}

const inicialesProveedor = (proveedor) => {
  return String(proveedor.nombre_comercial || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((palabra) => palabra[0])
    .join('')
    .toUpperCase()
}

const limpiarBusqueda = () => {
  search.value = ''
  paginaActual.value = 1
}

const numerarRegistro = (indice) => (
  (paginaActual.value - 1) * porPagina + indice + 1
)

onMounted(cargarProveedores)
</script>

<template>
  <section class="admin-panel">

    <div class="panel-heading">
      <div>
        <span class="eyebrow">Inventario</span>
        <h2>Proveedores</h2>
        <p>
          Registro, consulta y actualización de proveedores
          de la farmacia.
        </p>
      </div>

      <div class="panel-heading-actions">

        <button
          type="button"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-5 py-2.5 text-sm font-bold text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-55"
          :disabled="loading"
          @click="cargarProveedores"
        >
          <i class="fas fa-rotate" :class="{ 'animate-spin': loading }" aria-hidden="true"></i>
          Actualizar
        </button>

        <button
          v-if="puedeGestionar"
          type="button"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#2a468b] to-[#3d6ac1] px-5 py-2.5 text-sm font-bold text-[#fff7e3] shadow-md transition hover:-translate-y-0.5 hover:from-[#1e356d] hover:to-[#2a468b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          @click="abrirNuevo"
        >
          <i class="fas fa-plus"></i>
          Nuevo proveedor
        </button>

      </div>
    </div>

    <div
      v-if="error"
      class="notice notice-error"
      role="alert"
    >
      <span class="flex items-start gap-2">
        <i class="fas fa-circle-exclamation mt-0.5 shrink-0" aria-hidden="true"></i>
        {{ error }}
      </span>

      <button
        type="button"
        class="notice-close"
        aria-label="Cerrar"
        @click="error = ''"
      >
        ×
      </button>
    </div>

    <div class="stats-grid">

      <div class="stat-card">
        <p>Total registrados</p>
        <strong>{{ totalProveedores }}</strong>
      </div>

      <div class="stat-card">
        <p>Con teléfono</p>
        <strong>{{ proveedoresConTelefono }}</strong>
      </div>

      <div class="stat-card">
        <p>Con correo</p>
        <strong>{{ proveedoresConCorreo }}</strong>
      </div>

      <div class="stat-card is-danger">
        <p>Sin correo</p>
        <strong>{{ proveedoresSinCorreo }}</strong>
      </div>

    </div>

    <div class="panel supplier-list-panel">

      <div class="panel-title-bar">
        <h3>Proveedores registrados</h3>
      </div>

      <div class="panel-toolbar">

        <div class="grid grid-cols-1 items-end gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(150px,1.5fr)]">

          <div class="field-search relative min-w-0">
            <label class="sr-only" for="buscar-proveedores">Buscar proveedores</label>
            <i class="fas fa-search" aria-hidden="true"></i>
            <input
              id="buscar-proveedores"
              v-model="search"
              class="form-input panel-control"
              type="search"
              placeholder="Buscar por nombre, RUC/NIT, teléfono o correo..."
              autocomplete="off"
            >
          </div>

          <div>
            <button
              type="button"
              class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2.5 text-sm font-bold text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-55 lg:w-auto"
              :disabled="!search"
              @click="limpiarBusqueda"
            >
              Limpiar búsqueda
            </button>
          </div>

        </div>

        <p class="panel-count">
          Mostrando
          <strong>{{ indiceInicio }}-{{ indiceFin }}</strong>
          de
          <strong>{{ proveedoresFiltrados.length }}</strong>
          proveedores
        </p>

      </div>

      <div v-if="loading" class="panel-state">
        <span class="mr-2 inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent align-[-0.2em]" role="status" aria-label="Cargando"></span>
        Cargando proveedores...
      </div>

      <div
        v-else-if="error"
        class="panel-state is-error"
      >
        No se pudieron cargar los proveedores.
      </div>

      <div
        v-else-if="proveedoresFiltrados.length === 0"
        class="panel-state"
      >
        <i class="fas fa-truck mb-2 block text-2xl" aria-hidden="true"></i>
        {{
          search
            ? 'No se encontraron proveedores que coincidan con la búsqueda.'
            : 'No hay proveedores registrados.'
        }}
      </div>

      <template v-else>

        <div class="panel-table-wrap">

          <table class="panel-table supplier-table">

            <thead>
              <tr>
                <th class="cell-index">#</th>
                <th class="w-[20%]">Proveedor</th>
                <th class="w-[13%]">RUC / NIT</th>
                <th class="w-[13%]">Teléfono</th>
                <th class="w-[19%]">Correo electrónico</th>
                <th class="w-[20%]">Dirección</th>
                <th
                  v-if="puedeGestionar"
                  class="cell-actions text-center"
                >
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody>

              <tr
                v-for="(proveedor, indice) in proveedoresPaginados"
                :key="proveedor.id_proveedor"
              >

                <td class="cell-index">
                  {{ numerarRegistro(indice) }}
                </td>

                <td class="cell-truncate">

                  <div class="user-cell">
                    <span class="avatar-soft">
                      {{ inicialesProveedor(proveedor) }}
                    </span>
                    <strong
                      class="truncate"
                      :title="proveedor.nombre_comercial"
                    >
                      {{ proveedor.nombre_comercial }}
                    </strong>
                  </div>

                </td>

                <td class="cell-truncate">
                  <span
                    class="truncate"
                    :title="proveedor.ruc_nit"
                  >
                    {{ proveedor.ruc_nit }}
                  </span>
                </td>

                <td class="cell-truncate">
                  <span class="truncate">
                    {{ proveedor.telefono || 'No registrado' }}
                  </span>
                </td>

                <td class="cell-truncate">
                  <span
                    class="truncate"
                    :title="proveedor.correo_electronico"
                  >
                    {{ proveedor.correo_electronico || 'No registrado' }}
                  </span>
                </td>

                <td class="cell-truncate">
                  <span
                    class="truncate"
                    :title="proveedor.direccion"
                  >
                    {{ proveedor.direccion || 'No registrada' }}
                  </span>
                </td>

                <td v-if="puedeGestionar" class="text-center">

                  <div class="action-stack">
                    <button
                      type="button"
                      class="btn-row"
                      title="Editar proveedor"
                      @click="abrirEdicion(proveedor)"
                    >
                      <i class="fas fa-pen mr-1" aria-hidden="true"></i>
                      Editar
                    </button>
                  </div>

                </td>

              </tr>

            </tbody>

          </table>

        </div>

        <div class="mobile-list">

          <article
            v-for="(proveedor, indice) in proveedoresPaginados"
            :key="`movil-${proveedor.id_proveedor}`"
            class="mobile-card"
          >

            <div class="mobile-card-head">
              <span class="mobile-index">
                {{ numerarRegistro(indice) }}
              </span>
              <span class="avatar-soft">
                {{ inicialesProveedor(proveedor) }}
              </span>
              <div class="mobile-card-title">
                <h4>
                  {{ proveedor.nombre_comercial }}
                </h4>
                <p>
                  RUC/NIT: {{ proveedor.ruc_nit }}
                </p>
              </div>
            </div>

            <div class="mobile-meta">

              <div>
                <p>Teléfono</p>
                <strong>
                  {{ proveedor.telefono || 'No registrado' }}
                </strong>
              </div>

              <div class="min-w-0">
                <p>Correo electrónico</p>
                <strong class="supplier-mobile-value">
                  {{ proveedor.correo_electronico || 'No registrado' }}
                </strong>
              </div>

              <div class="min-w-0 col-span-full">
                <p>Dirección</p>
                <strong class="supplier-mobile-value">
                  {{ proveedor.direccion || 'No registrada' }}
                </strong>
              </div>

            </div>

            <div
              v-if="puedeGestionar"
              class="mobile-actions"
            >
              <button
                type="button"
                class="btn-row"
                @click="abrirEdicion(proveedor)"
              >
                <i class="fas fa-pen mr-1" aria-hidden="true"></i>
                Editar proveedor
              </button>
            </div>

          </article>

        </div>

        <div
          v-if="totalPaginas > 1"
          class="panel-footer"
        >

          <p>
            Página
            <strong>{{ paginaActual }}</strong>
            de
            <strong>{{ totalPaginas }}</strong>
          </p>

          <nav aria-label="Paginación de proveedores" class="pagination">

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

            <template
              v-for="(numero, indice) in numerosPagina"
              :key="`pagina-${indice}`"
            >
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

    <ToastNotification
      :message="notificacion"
      @close="notificacion = ''"
    />

    <div
      v-if="modalAbierto"
      class="panel-modal-backdrop"
      role="presentation"
      @mousedown.self="cerrarModal"
    >

      <section
        class="panel-modal supplier-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="proveedor-modal-title"
      >

        <div class="panel-modal-head">

          <div>
            <h3 id="proveedor-modal-title">
              {{
                editando
                  ? 'Editar proveedor'
                  : 'Registrar nuevo proveedor'
              }}
            </h3>
            <p>
              Los campos marcados con * son obligatorios.
            </p>
          </div>

          <button
            type="button"
            class="panel-modal-close"
            aria-label="Cerrar"
            :disabled="saving"
            @click="cerrarModal"
          >
            <i class="fas fa-xmark" aria-hidden="true"></i>
          </button>

        </div>

        <form
          class="mt-4"
          novalidate
          @submit.prevent="guardarProveedor"
        >

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">

            <div>

              <label
                class="form-label"
                for="proveedor-nombre"
              >
                Nombre comercial
                <span class="req">*</span>
              </label>

              <input
                id="proveedor-nombre"
                v-model="form.nombre_comercial"
                class="form-input"
                :class="{
                  'has-error':
                    errores.nombre_comercial &&
                    touched.nombre_comercial
                }"
                maxlength="100"
                autocomplete="organization"
                placeholder="Nombre del proveedor"
                :aria-invalid="Boolean(errores.nombre_comercial && touched.nombre_comercial)"
                @input="alEscribir('nombre_comercial')"
                @blur="alSalir('nombre_comercial')"
              >

              <p class="error-text" role="alert">
                <template
                  v-if="errores.nombre_comercial && touched.nombre_comercial"
                >
                  <i class="fas fa-circle-exclamation"></i>
                  {{ errores.nombre_comercial }}
                </template>
              </p>

            </div>

            <div>

              <label
                class="form-label"
                for="proveedor-ruc"
              >
                RUC / NIT
                <span class="req">*</span>
              </label>

              <input
                id="proveedor-ruc"
                v-model="form.ruc_nit"
                class="form-input"
                :class="{
                  'has-error':
                    errores.ruc_nit && touched.ruc_nit
                }"
                maxlength="20"
                autocomplete="off"
                placeholder="Número de identificación"
                :aria-invalid="Boolean(errores.ruc_nit && touched.ruc_nit)"
                @input="alEscribir('ruc_nit')"
                @blur="alSalir('ruc_nit')"
              >

              <p class="error-text" role="alert">
                <template v-if="errores.ruc_nit && touched.ruc_nit">
                  <i class="fas fa-circle-exclamation"></i>
                  {{ errores.ruc_nit }}
                </template>
              </p>

            </div>

            <div>

              <label
                class="form-label"
                for="proveedor-telefono"
              >
                Teléfono
              </label>

              <input
                id="proveedor-telefono"
                v-model="form.telefono"
                class="form-input"
                :class="{
                  'has-error':
                    errores.telefono && touched.telefono
                }"
                maxlength="20"
                autocomplete="tel"
                placeholder="Ej.: 22411122"
                :aria-invalid="Boolean(errores.telefono && touched.telefono)"
                @input="alEscribir('telefono')"
                @blur="alSalir('telefono')"
              >

              <p class="error-text" role="alert">
                <template v-if="errores.telefono && touched.telefono">
                  <i class="fas fa-circle-exclamation"></i>
                  {{ errores.telefono }}
                </template>
              </p>

            </div>

            <div>

              <label
                class="form-label"
                for="proveedor-correo"
              >
                Correo electrónico
              </label>

              <input
                id="proveedor-correo"
                v-model="form.correo_electronico"
                class="form-input"
                :class="{
                  'has-error':
                    errores.correo_electronico &&
                    touched.correo_electronico
                }"
                type="email"
                maxlength="120"
                autocomplete="email"
                placeholder="proveedor@correo.com"
                :aria-invalid="Boolean(errores.correo_electronico && touched.correo_electronico)"
                @input="alEscribir('correo_electronico')"
                @blur="alSalir('correo_electronico')"
              >

              <p class="error-text" role="alert">
                <template
                  v-if="errores.correo_electronico &&
                    touched.correo_electronico"
                >
                  <i class="fas fa-circle-exclamation"></i>
                  {{ errores.correo_electronico }}
                </template>
              </p>

            </div>

            <div class="sm:col-span-2">

              <label
                class="form-label"
                for="proveedor-direccion"
              >
                Dirección
              </label>

              <!-- CORRECCIÓN APLICADA AQUÍ: autocomplete="off" -->
              <input
                id="proveedor-direccion"
                v-model="form.direccion"
                class="form-input"
                :class="{
                  'has-error':
                    errores.direccion && touched.direccion
                }"
                maxlength="150"
                autocomplete="off"
                placeholder="Dirección del proveedor"
                :aria-invalid="Boolean(errores.direccion && touched.direccion)"
                @input="alEscribir('direccion')"
                @blur="alSalir('direccion')"
              >

              <p class="error-text" role="alert">
                <template v-if="errores.direccion && touched.direccion">
                  <i class="fas fa-circle-exclamation"></i>
                  {{ errores.direccion }}
                </template>
              </p>

            </div>

          </div>

          <div
            v-if="errorFormulario"
            class="notice notice-error mt-3"
            role="alert"
          >
            <i class="fas fa-circle-exclamation"></i>
            {{ errorFormulario }}
          </div>

          <div class="panel-modal-actions">

            <button
              type="button"
              class="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-5 py-2.5 text-sm font-bold text-[var(--text-muted)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-55"
              :disabled="saving"
              @click="cerrarModal"
            >
              Cancelar
            </button>

            <button
              type="submit"
              class="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#2a468b] to-[#3d6ac1] px-5 py-2.5 text-sm font-bold text-[#fff7e3] shadow-md transition hover:from-[#1e356d] hover:to-[#2a468b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-55"
              :disabled="saving"
            >

              <span
                v-if="saving"
                class="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
                role="status"
              ></span>

              <i
                v-else
                class="fas"
                :class="editando ? 'fa-floppy-disk' : 'fa-plus'"
              ></i>

              {{
                saving
                  ? 'Guardando...'
                  : editando
                    ? 'Guardar cambios'
                    : 'Registrar proveedor'
              }}

            </button>

          </div>

        </form>

      </section>

    </div>

  </section>
</template>

<style scoped>
.supplier-list-panel {
  container-type: inline-size;
}

.supplier-modal {
  width: min(100%, 760px);
}

.supplier-table {
  min-width: 0;
  table-layout: auto;
}

.supplier-table thead th,
.supplier-table tbody td {
  vertical-align: middle;
}

.supplier-table thead th {
  padding: 0.55rem 0.4rem;
  font-size: 0.62rem;
  letter-spacing: 0.04em;
}

.supplier-table tbody td {
  padding: 0.65rem 0.4rem;
  font-size: 0.76rem;
}

.supplier-table thead th.cell-index,
.supplier-table tbody td.cell-index {
  text-align: center;
  width: 50px;
  padding-left: 0;
  padding-right: 0;
}

.supplier-table .cell-actions {
  width: 76px;
}

.action-stack {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  min-height: 32px;
}

.supplier-mobile-value {
  display: block;
  overflow-wrap: anywhere;
  white-space: normal;
}

.mobile-card-title h4 {
  overflow-wrap: anywhere;
  white-space: normal;
}

.mobile-card-title p {
  overflow-wrap: anywhere;
  white-space: normal;
}

@container (max-width: 1250px) {
  .supplier-table thead th {
    padding: 0.5rem 0.3rem;
    font-size: 0.58rem;
    letter-spacing: 0.02em;
  }

  .supplier-table tbody td {
    padding: 0.55rem 0.3rem;
    font-size: 0.7rem;
  }

  .supplier-table .avatar-soft {
    width: 28px;
    height: 28px;
    font-size: 0.62rem;
  }
}
</style>