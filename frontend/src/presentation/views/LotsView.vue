<script setup>
import { computed, onMounted, ref, watch } from 'vue'

import ToastNotification from '../components/ToastNotification.vue'

import {
  listarLotes,
  registrarRecepcion,
  darBajaLote
} from '../../data/endpoints/lots'

import { listarMedicamentos } from '../../data/endpoints/medicines'
import { listarProveedores } from '../../data/endpoints/suppliers'
import { coincidePorPrefijo } from '../../business/search'

import {
  puedeGestionarCatalogo,
  esAdministrador
} from '../../business/session'

const puedeGestionar = computed(() => puedeGestionarCatalogo())
const puedeDarBaja = computed(() => esAdministrador())

const lotes = ref([])
const medicamentos = ref([])
const proveedores = ref([])

const loading = ref(true)
const saving = ref(false)

const error = ref('')
const errorFormulario = ref('')
const notificacion = ref('')
const tonoNotificacion = ref('success')

const modalAbierto = ref(false)

const search = ref('')
const filtroEstado = ref('Todos')

const porPagina = 10
const paginaActual = ref(1)

const lotesFiltrados = computed(() => {
  const consulta = search.value.trim().toLocaleLowerCase()

  return lotes.value.filter((lote) => {
    const coincideBusqueda = [
      lote.medicamento,
      lote.codigo_barras,
      lote.proveedor,
      lote.lote_numero
    ].some((valor) =>
      coincidePorPrefijo(valor, consulta)
    )

    const coincideEstado =
      filtroEstado.value === 'Todos'
      || lote.estado_lote === filtroEstado.value

    return coincideBusqueda && coincideEstado
  })
})

const totalPaginas = computed(() =>
  Math.max(1, Math.ceil(lotesFiltrados.value.length / porPagina))
)

const lotesPaginados = computed(() => {
  const inicio = (paginaActual.value - 1) * porPagina

  return lotesFiltrados.value.slice(
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

const indiceInicio = computed(() =>
  lotesFiltrados.value.length
    ? (paginaActual.value - 1) * porPagina + 1
    : 0
)

const indiceFin = computed(() =>
  Math.min(
    paginaActual.value * porPagina,
    lotesFiltrados.value.length
  )
)

watch([search, filtroEstado], () => {
  paginaActual.value = 1
})

watch(totalPaginas, (total) => {
  if (paginaActual.value > total) {
    paginaActual.value = total
  }
})

const limpiarFiltros = () => {
  search.value = ''
  filtroEstado.value = 'Todos'
}

const totalLotes = computed(() => lotes.value.length)

const lotesVigentes = computed(() =>
  lotes.value.filter((l) => l.estado_lote === 'Vigente').length
)

const lotesPorVencer = computed(() =>
  lotes.value.filter((l) => l.estado_lote === 'Por vencer').length
)

const lotesVencidos = computed(() =>
  lotes.value.filter((l) => l.estado_lote === 'Vencido').length
)

const formularioInicial = () => ({
  id_medicamento: '',
  id_proveedor: '',
  lote_numero: '',
  fecha_vencimiento: '',
  costo_unitario: '',
  cantidad_stock: ''
})

const form = ref(formularioInicial())

const errores = ref({})

const restablecerFormulario = () => {
  form.value = formularioInicial()
  errores.value = {}
  errorFormulario.value = ''
}

const fechaMinimaVencimiento = computed(() => {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() + 1)

  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')

  return `${anio}-${mes}-${dia}`
})

const validarFormulario = () => {
  const nuevosErrores = {}

  if (!form.value.id_medicamento) {
    nuevosErrores.id_medicamento =
      'Selecciona un medicamento.'
  }

  if (!form.value.id_proveedor) {
    nuevosErrores.id_proveedor =
      'Selecciona un proveedor.'
  }

  if (!form.value.lote_numero.trim()) {
    nuevosErrores.lote_numero =
      'El número de lote es obligatorio.'
  } else if (form.value.lote_numero.trim().length > 40) {
    nuevosErrores.lote_numero =
      'Máximo 40 caracteres.'
  }

  if (!form.value.fecha_vencimiento) {
    nuevosErrores.fecha_vencimiento =
      'Selecciona la fecha de vencimiento.'
  } else if (
    form.value.fecha_vencimiento < fechaMinimaVencimiento.value
  ) {
    nuevosErrores.fecha_vencimiento =
      'El vencimiento debe ser posterior a hoy.'
  }

  const costo = String(form.value.costo_unitario).trim()

  if (!/^\d{1,8}(\.\d{1,2})?$/.test(costo)) {
    nuevosErrores.costo_unitario =
      'Ingresa un costo válido con máximo dos decimales.'
  }

  const cantidad = String(form.value.cantidad_stock).trim()

  if (!/^\d+$/.test(cantidad) || Number(cantidad) < 1) {
    nuevosErrores.cantidad_stock =
      'La cantidad debe ser un entero mayor que cero.'
  }

  errores.value = nuevosErrores

  return Object.keys(nuevosErrores).length === 0
}

const cargarDatos = async () => {
  loading.value = true
  error.value = ''

  try {
    const [listaLotes, listaMedicamentos] = await Promise.all([
      listarLotes(),
      listarMedicamentos({ estado: 'Activo' })
    ])

    lotes.value = listaLotes
    medicamentos.value = listaMedicamentos

    if (puedeGestionar.value) {
      proveedores.value = await listarProveedores()
    }
  } catch (err) {
    error.value = mensajeError(err)
  } finally {
    loading.value = false
  }
}

const notificar = (mensaje, tono = 'success') => {
  notificacion.value = mensaje
  tonoNotificacion.value = tono
}

const mensajeError = (err) => {
  if (err.status === 401) {
    return 'Tu sesión expiró. Inicia sesión nuevamente.'
  }

  if (err.status === 403) {
    return 'No tienes permisos para realizar esta operación.'
  }

  if (err.status === 409) {
    return err.message
  }

  return err.message || 'No se pudo completar la operación.'
}

const abrirRecepcion = () => {
  restablecerFormulario()
  modalAbierto.value = true
}

const cerrarModal = () => {
  if (saving.value) return

  modalAbierto.value = false
  restablecerFormulario()
}

const guardarRecepcion = async () => {
  errorFormulario.value = ''

  if (!validarFormulario()) {
    errorFormulario.value =
      'Revisa los campos del formulario.'

    return
  }

  saving.value = true

  const datos = {
    id_medicamento: Number(form.value.id_medicamento),
    id_proveedor: Number(form.value.id_proveedor),
    lote_numero: form.value.lote_numero.trim(),
    fecha_vencimiento: form.value.fecha_vencimiento,
    costo_unitario: Number(form.value.costo_unitario),
    cantidad_stock: Number(form.value.cantidad_stock)
  }

  try {
    await registrarRecepcion(datos)

    modalAbierto.value = false
    restablecerFormulario()

    await cargarDatos()

    notificar('Recepción registrada correctamente.')
  } catch (err) {
    errorFormulario.value = mensajeError(err)
  } finally {
    saving.value = false
  }
}

const procesandoBaja = ref(null)
const lotePendienteBaja = ref(null)

const solicitarBaja = (lote) => {
  if (!puedeDarBaja.value || lote.estado_lote !== 'Vencido') {
    return
  }

  lotePendienteBaja.value = lote
}

const cancelarBaja = () => {
  if (procesandoBaja.value !== null) return
  lotePendienteBaja.value = null
}

const confirmarBaja = async () => {
  const lote = lotePendienteBaja.value
  if (!lote || !puedeDarBaja.value || lote.estado_lote !== 'Vencido') return

  procesandoBaja.value = lote.id_lote

  try {
    await darBajaLote(lote.id_lote)

    lotePendienteBaja.value = null
    await cargarDatos()

    notificar('Lote dado de baja correctamente.')
  } catch (err) {
    notificar(mensajeError(err), 'error')
  } finally {
    procesandoBaja.value = null
  }
}

const formatearFecha = (valor) => {
  if (!valor) return 'No disponible'

  const fecha = new Date(valor)

  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(fecha)
}

const formatearPrecio = (valor) =>
  `Bs ${Number(valor || 0).toFixed(2)}`

const claseEstado = (estado) => {
  const clases = {
    Vigente: 'lot-status-valid',
    'Por vencer': 'lot-status-warning',
    Vencido: 'lot-status-expired',
    Baja: 'lot-status-disabled'
  }

  return clases[estado] || 'lot-status-disabled'
}

onMounted(cargarDatos)
</script>

<template>
  <section class="admin-panel">

    <div class="panel-heading">
      <div>
        <span class="eyebrow">Inventario</span>
        <h2>Gestión de lotes</h2>
        <p>
          Consulta existencias y registra las recepciones
          de medicamentos.
        </p>
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
          v-if="puedeGestionar"
          type="button"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#2a468b] to-[#3d6ac1] px-5 py-2.5 text-sm font-bold text-[#fff7e3] shadow-md transition hover:-translate-y-0.5 hover:from-[#1e356d] hover:to-[#2a468b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          @click="abrirRecepcion"
        >
          <i class="fas fa-plus"></i>
          Nueva recepción
        </button>

      </div>
    </div>

    <div
      v-if="error"
      class="notice notice-error"
      role="alert"
    >
      <span class="flex items-start gap-2"><i class="fas fa-circle-exclamation mt-0.5 shrink-0" aria-hidden="true"></i>{{ error }}</span>
      <button
        type="button"
        class="notice-close"
        aria-label="Cerrar aviso"
        @click="error = ''"
      >
        ×
      </button>
    </div>

    <div class="stats-grid">

      <div class="stat-card">
        <p>Total de lotes</p>
        <strong>{{ totalLotes }}</strong>
      </div>

      <div class="stat-card">
        <p>Lotes vigentes</p>
        <strong>{{ lotesVigentes }}</strong>
      </div>

      <div class="stat-card">
        <p>Próximos a vencer</p>
        <strong>{{ lotesPorVencer }}</strong>
      </div>

      <div class="stat-card is-danger">
        <p>Lotes vencidos</p>
        <strong>{{ lotesVencidos }}</strong>
      </div>

    </div>

    <div class="panel lots-list-panel">

      <div class="panel-title-bar">
        <h3>Inventario por lotes</h3>
      </div>

      <div class="panel-toolbar">

        <div class="grid grid-cols-1 items-end gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(180px,2fr)_minmax(150px,1.5fr)]">

          <div class="field-search relative min-w-0">
            <label class="sr-only" for="buscar-lotes">Buscar lotes</label>
            <div class="search-input-wrap">
              <i class="fas fa-search" aria-hidden="true"></i>
              <input
                id="buscar-lotes"
                v-model="search"
                type="search"
                class="form-input panel-control"
                placeholder="Buscar medicamento, proveedor o número de lote..."
                autocomplete="off"
              >
            </div>
          </div>

          <div class="flex min-w-0 flex-col gap-1.5">

            <label class="form-label" for="filtro-lote-estado">
              Estado del lote
            </label>

            <select
              id="filtro-lote-estado"
              v-model="filtroEstado"
              class="form-select panel-control"
            >
              <option value="Todos">Todos</option>
              <option value="Vigente">Vigentes</option>
              <option value="Por vencer">Por vencer</option>
              <option value="Vencido">Vencidos</option>
              <option value="Baja">Dados de baja</option>
            </select>
          </div>
          <div>
            <button
              type="button"
              class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2.5 text-sm font-bold text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-55 lg:w-auto"
              :disabled="!search && filtroEstado === 'Todos'"
              @click="limpiarFiltros"
            >
              Limpiar filtros
            </button>
          </div>

        </div>

        <p class="panel-count">
          Mostrando
          <strong>{{ indiceInicio }}-{{ indiceFin }}</strong>
          de
          <strong>{{ lotesFiltrados.length }}</strong>
          lotes
          <span v-if="search || filtroEstado !== 'Todos'">
            (filtrados de {{ totalLotes }} en total)
          </span>
        </p>

      </div>

      <div v-if="loading" class="panel-state">
        <span class="mr-2 inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent align-[-0.2em]" role="status" aria-label="Cargando"></span>
        Cargando inventario...
      </div>

      <div
        v-else-if="error"
        class="panel-state is-error"
      >
        No se pudo cargar el inventario.
      </div>

      <div
        v-else-if="lotesFiltrados.length === 0"
        class="panel-state"
      >
        <i class="fas fa-box-open mb-2 block text-2xl" aria-hidden="true"></i>
        {{
          search || filtroEstado !== 'Todos'
            ? 'No se encontraron lotes que coincidan con los filtros.'
            : 'No hay lotes registrados.'
        }}
      </div>

      <template v-else>

        <div class="panel-table-wrap">

          <table class="panel-table lot-table">

            <thead>
              <tr>
                <th class="cell-index">#</th>
                <th>Lote</th>
                <th>Medicamento</th>
                <th>Proveedor</th>
                <th>Vencimiento</th>
                <th>Cantidad</th>
                <th>Costo unitario</th>
                <th class="text-center">Estado</th>
                <th v-if="puedeDarBaja" class="text-center">Acciones</th>
              </tr>
            </thead>

            <tbody>

              <tr
                v-for="(lote, indice) in lotesPaginados"
                :key="lote.id_lote"
              >

                <td class="cell-index">
                  {{ (paginaActual - 1) * porPagina + indice + 1 }}
                </td>

                <td class="cell-truncate">
                  <strong>{{ lote.lote_numero }}</strong>
                </td>

                <td class="cell-truncate">
                  <strong>{{ lote.medicamento }}</strong>
                  <small class="mt-1 block text-xs text-[var(--text-muted)]">
                    {{ lote.codigo_barras }}
                  </small>
                </td>

                <td class="cell-truncate">
                  <span class="truncate" :title="lote.proveedor">
                    {{ lote.proveedor }}
                  </span>
                </td>

                <td>
                  {{ formatearFecha(lote.fecha_vencimiento) }}

                  <small class="mt-1 block text-xs text-[var(--text-muted)]">
                    {{
                      Number(lote.dias_para_vencer) < 0
                        ? `Venció hace ${Math.abs(Number(lote.dias_para_vencer))} días`
                        : `${lote.dias_para_vencer} días restantes`
                    }}
                  </small>
                </td>

                <td>
                  <strong>{{ lote.cantidad_stock }}</strong>
                </td>

                <td>{{ formatearPrecio(lote.costo_unitario) }}</td>

                <td class="text-center">
                  <span
                    class="lot-status"
                    :class="claseEstado(lote.estado_lote)"
                  >
                    {{ lote.estado_lote }}
                  </span>
                </td>

                <td v-if="puedeDarBaja" class="text-center">

                  <div class="action-stack">
                    <button
                      v-if="lote.estado_lote === 'Vencido'"
                      type="button"
                      class="btn-row is-danger"
                      :disabled="procesandoBaja === lote.id_lote"
                      @click="solicitarBaja(lote)"
                    >
                      {{
                        procesandoBaja === lote.id_lote
                          ? 'Procesando...'
                          : 'Dar de baja'
                      }}
                    </button>

                    <span v-else class="text-[var(--text-muted)]">
                      —
                    </span>
                  </div>

                </td>

              </tr>

            </tbody>

          </table>

        </div>

        <div class="mobile-list">
          <article
            v-for="(lote, indice) in lotesPaginados"
            :key="`movil-${lote.id_lote}`"
            class="mobile-card"
          >
            <div class="mobile-card-head">
              <span class="mobile-index">
                {{ (paginaActual - 1) * porPagina + indice + 1 }}
              </span>
              <span class="avatar-soft">
                <i class="fas fa-box"></i>
              </span>
              <div class="mobile-card-title">
                <h4 class="truncate" :title="lote.medicamento">
                  {{ lote.medicamento }}
                </h4>
                <p class="truncate" :title="lote.lote_numero">
                  Lote {{ lote.lote_numero }}
                </p>
              </div>
              <span
                class="lot-status"
                :class="claseEstado(lote.estado_lote)"
              >
                {{ lote.estado_lote }}
              </span>
            </div>

            <div class="mobile-meta">
              <div class="min-w-0">
                <p>Proveedor</p>
                <strong class="truncate" :title="lote.proveedor">
                  {{ lote.proveedor }}
                </strong>
              </div>
              <div>
                <p>Existencias</p>
                <strong>{{ lote.cantidad_stock }}</strong>
              </div>
              <div>
                <p>Vencimiento</p>
                <strong>{{ formatearFecha(lote.fecha_vencimiento) }}</strong>
                <small class="mt-1 block text-xs text-[var(--text-muted)]">
                  {{
                    Number(lote.dias_para_vencer) < 0
                      ? `Venció hace ${Math.abs(Number(lote.dias_para_vencer))} días`
                      : `${lote.dias_para_vencer} días restantes`
                  }}
                </small>
              </div>
              <div>
                <p>Costo unitario</p>
                <strong>{{ formatearPrecio(lote.costo_unitario) }}</strong>
              </div>
            </div>

            <div v-if="puedeDarBaja" class="mobile-actions">
              <button
                v-if="lote.estado_lote === 'Vencido'"
                type="button"
                class="btn-row is-danger"
                :disabled="procesandoBaja === lote.id_lote"
                @click="solicitarBaja(lote)"
              >
                {{
                  procesandoBaja === lote.id_lote
                    ? 'Procesando...'
                    : 'Dar de baja lote'
                }}
              </button>
            </div>
          </article>
        </div>

        <div
          v-if="totalPaginas > 1"
          class="panel-footer"
        >

          <p>
            Página <strong>{{ paginaActual }}</strong>
            de <strong>{{ totalPaginas }}</strong>
          </p>

          <nav class="pagination" aria-label="Paginación de lotes">
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
      :tone="tonoNotificacion"
      @close="notificacion = ''"
    />

    <div
      v-if="modalAbierto"
      class="panel-modal-backdrop"
      @mousedown.self="cerrarModal"
    >

      <section
        class="panel-modal lot-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recepcion-title"
      >

        <div class="panel-modal-head">

          <div>
            <h3 id="recepcion-title">
              Registrar recepción
            </h3>

            <p>
              Completa los datos de la entrega recibida.
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
          @submit.prevent="guardarRecepcion"
        >

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">

            <div class="sm:col-span-2">

              <label class="form-label" for="lote-medicamento">
                Medicamento <span class="req">*</span>
              </label>

              <select
                id="lote-medicamento"
                v-model="form.id_medicamento"
                class="form-select"
                :class="{ 'has-error': errores.id_medicamento }"
                :aria-invalid="Boolean(errores.id_medicamento)"
                required
              >

                <option value="">Seleccionar medicamento</option>

                <option
                  v-for="medicamento in medicamentos"
                  :key="medicamento.id_medicamento"
                  :value="String(medicamento.id_medicamento)"
                >
                  {{ medicamento.nombre_comercial }}
                  — {{ medicamento.concentracion }}
                  — Stock: {{ medicamento.stock_vigente }}
                </option>

              </select>

              <small class="error-text" role="alert">
                {{ errores.id_medicamento }}
              </small>

            </div>

            <div class="sm:col-span-2">

              <label class="form-label" for="lote-proveedor">
                Proveedor <span class="req">*</span>
              </label>

              <select
                id="lote-proveedor"
                v-model="form.id_proveedor"
                class="form-select"
                :class="{ 'has-error': errores.id_proveedor }"
                :aria-invalid="Boolean(errores.id_proveedor)"
                required
              >

                <option value="">Seleccionar proveedor</option>

                <option
                  v-for="proveedor in proveedores"
                  :key="proveedor.id_proveedor"
                  :value="String(proveedor.id_proveedor)"
                >
                  {{ proveedor.nombre_comercial }}
                </option>

              </select>

              <small class="error-text" role="alert">
                {{ errores.id_proveedor }}
              </small>

            </div>

            <div>

              <label class="form-label" for="numero-lote">
                Número de lote <span class="req">*</span>
              </label>

              <input
                id="numero-lote"
                v-model="form.lote_numero"
                type="text"
                maxlength="40"
                class="form-input"
                :class="{ 'has-error': errores.lote_numero }"
                placeholder="Ej.: LOTE-2026-A"
                :aria-invalid="Boolean(errores.lote_numero)"
              >

              <small class="error-text" role="alert">
                {{ errores.lote_numero }}
              </small>

            </div>

            <div>

              <label class="form-label" for="fecha-vencimiento">
                Fecha de vencimiento <span class="req">*</span>
              </label>

              <input
                id="fecha-vencimiento"
                v-model="form.fecha_vencimiento"
                type="date"
                :min="fechaMinimaVencimiento"
                class="form-input"
                :class="{
                  'has-error': errores.fecha_vencimiento
                }"
                :aria-invalid="Boolean(errores.fecha_vencimiento)"
              >

              <small class="error-text" role="alert">
                {{ errores.fecha_vencimiento }}
              </small>

            </div>

            <div>

              <label class="form-label" for="costo-lote">
                Costo unitario (Bs) <span class="req">*</span>
              </label>

              <input
                id="costo-lote"
                v-model="form.costo_unitario"
                type="number"
                min="0"
                step="0.01"
                class="form-input"
                :class="{ 'has-error': errores.costo_unitario }"
                placeholder="Ej.: 1.25"
                :aria-invalid="Boolean(errores.costo_unitario)"
              >

              <small class="error-text" role="alert">
                {{ errores.costo_unitario }}
              </small>

            </div>

            <div>

              <label class="form-label" for="cantidad-lote">
                Cantidad recibida <span class="req">*</span>
              </label>

              <input
                id="cantidad-lote"
                v-model="form.cantidad_stock"
                type="number"
                min="1"
                step="1"
                class="form-input"
                :class="{ 'has-error': errores.cantidad_stock }"
                placeholder="Ej.: 100"
                :aria-invalid="Boolean(errores.cantidad_stock)"
              >

              <small class="error-text" role="alert">
                {{ errores.cantidad_stock }}
              </small>

            </div>

          </div>

          <div
            v-if="errorFormulario"
            class="notice notice-error mt-3"
            role="alert"
          >
            {{ errorFormulario }}
          </div>

          <div class="panel-modal-actions mt-4">

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
              ></span>

              <i v-else class="fas fa-box"></i>

              {{
                saving
                  ? 'Registrando...'
                  : 'Registrar recepción'
              }}

            </button>

          </div>

        </form>

      </section>

    </div>

    <div
      v-if="lotePendienteBaja"
      class="panel-modal-backdrop"
      @mousedown.self="cancelarBaja"
    >
      <section
        class="panel-modal lot-discharge-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="baja-lote-title"
        aria-describedby="baja-lote-description"
      >
        <div class="panel-modal-head">
          <div class="discharge-modal-heading">
            <span class="discharge-modal-icon" aria-hidden="true">
              <i class="fas fa-triangle-exclamation"></i>
            </span>
            <div>
              <span class="discharge-modal-eyebrow">Acción irreversible</span>
              <h3 id="baja-lote-title">Dar de baja lote</h3>
            </div>
          </div>

          <button
            type="button"
            class="panel-modal-close"
            aria-label="Cerrar"
            :disabled="procesandoBaja !== null"
            @click="cancelarBaja"
          >
            <i class="fas fa-xmark" aria-hidden="true"></i>
          </button>
        </div>

        <p id="baja-lote-description" class="discharge-modal-description">
          Confirma la baja del lote vencido. Esta acción quedará registrada en el historial.
        </p>

        <dl class="discharge-lot-details">
          <div>
            <dt>Medicamento</dt>
            <dd>{{ lotePendienteBaja.medicamento }}</dd>
          </div>
          <div>
            <dt>Número de lote</dt>
            <dd>{{ lotePendienteBaja.lote_numero }}</dd>
          </div>
          <div>
            <dt>Existencias</dt>
            <dd>{{ lotePendienteBaja.cantidad_stock }}</dd>
          </div>
        </dl>

        <div class="panel-modal-actions">
          <button
            type="button"
            class="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-5 py-2.5 text-sm font-bold text-[var(--text-muted)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-55"
            :disabled="procesandoBaja !== null"
            @click="cancelarBaja"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--danger)] bg-[var(--danger-soft)] px-5 py-2.5 text-sm font-bold text-[var(--danger)] transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-55"
            :disabled="procesandoBaja !== null"
            @click="confirmarBaja"
          >
            <span
              v-if="procesandoBaja !== null"
              class="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent"
              aria-hidden="true"
            ></span>
            <i v-else class="fas fa-box-archive" aria-hidden="true"></i>
            {{ procesandoBaja !== null ? 'Procesando...' : 'Confirmar baja' }}
          </button>
        </div>
      </section>
    </div>

  </section>
</template>

<style scoped>
.lot-discharge-modal {
  width: min(100%, 480px);
}

.discharge-modal-heading {
  display: flex;
  align-items: flex-start;
  gap: 0.8rem;
}

.discharge-modal-icon {
  display: inline-flex;
  width: 2.6rem;
  height: 2.6rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 0.85rem;
  background: var(--danger-soft);
  color: var(--danger);
}

.discharge-modal-eyebrow {
  display: block;
  margin-bottom: 0.2rem;
  color: var(--danger);
  font-size: 0.67rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.discharge-modal-description {
  margin: 1.1rem 0;
  color: var(--text-muted);
  font-size: 0.88rem;
  line-height: 1.55;
}

.discharge-lot-details {
  display: grid;
  gap: 0.65rem;
  margin: 0;
  padding: 0.9rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 0.9rem;
  background: var(--bg-body);
}

.discharge-lot-details div {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.discharge-lot-details dt {
  color: var(--text-muted);
  font-size: 0.8rem;
  font-weight: 500;
}

.discharge-lot-details dd {
  margin: 0;
  color: var(--text-main);
  font-size: 0.8rem;
  font-weight: 700;
  text-align: right;
}

.lots-list-panel {
  container-type: inline-size;
}

.search-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input-wrap i {
  position: absolute;
  left: 1rem;
  color: #64748b;
  pointer-events: none;
}

.search-input-wrap input {
  padding-left: 2.5rem;
}

.lot-table {
  min-width: 0;
  table-layout: auto;
}

.lot-table thead th,
.lot-table tbody td {
  vertical-align: middle;
}

.lot-table thead th {
  padding: 0.55rem 0.4rem;
  font-size: 0.62rem;
  letter-spacing: 0.04em;
}

.lot-table tbody td {
  padding: 0.65rem 0.4rem;
  font-size: 0.76rem;
}

.lot-table thead th.cell-index,
.lot-table tbody td.cell-index {
  text-align: center;
  width: 50px;
  padding-left: 0;
  padding-right: 0;
}

.lot-table thead th:nth-child(2) {
  width: 12%;
}

.lot-table thead th:nth-child(3) {
  width: 17%;
}

.lot-table thead th:nth-child(4) {
  width: 14%;
}

.lot-table thead th:nth-child(5) {
  width: 14%;
}

.lot-table thead th:nth-child(6) {
  width: 7%;
}

.lot-table thead th:nth-child(7) {
  width: 11%;
}

.lot-table thead th:nth-child(8) {
  width: 9%;
}

.lot-table thead th:nth-child(n + 2):nth-child(-n + 6),
.lot-table tbody td:nth-child(n + 2):nth-child(-n + 6) {
  padding-right: 0.2rem;
  padding-left: 0.2rem;
}

.lot-table .lot-status {
  padding: 0.28rem 0.45rem;
  font-size: 0.65rem;
}

.action-stack {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  min-height: 32px;
}

@container (max-width: 1250px) {
  .lot-table thead th {
    padding: 0.5rem 0.3rem;
    font-size: 0.58rem;
    letter-spacing: 0.02em;
  }

  .lot-table tbody td {
    padding: 0.55rem 0.3rem;
    font-size: 0.7rem;
  }

  .lot-table thead th:first-child,
  .lot-table tbody td:first-child {
    padding-left: 0.65rem;
  }

  .lot-table thead th:nth-child(n + 2):nth-child(-n + 6),
  .lot-table tbody td:nth-child(n + 2):nth-child(-n + 6) {
    padding-right: 0.15rem;
    padding-left: 0.15rem;
  }

  .lot-table .lot-status {
    padding: 0.25rem 0.38rem;
    font-size: 0.62rem;
  }
}

.lot-modal {
  width: min(100%, 720px);
}

.lot-status {
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.65rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  white-space: nowrap;
}

.lot-status-valid {
  background: rgba(22, 163, 74, 0.12);
  color: #15803d;
}

.lot-status-warning {
  background: rgba(217, 119, 6, 0.13);
  color: #b45309;
}

.lot-status-expired {
  background: rgba(220, 38, 38, 0.12);
  color: #dc2626;
}

.lot-status-disabled {
  background: rgba(100, 116, 139, 0.14);
  color: #64748b;
}

.lot-modal .error-text {
  display: block;
  min-height: 1.1rem;
}

.mobile-card .truncate {
  overflow-wrap: anywhere;
}

.mobile-card .mobile-meta strong {
  overflow-wrap: anywhere;
}

.mobile-card .mobile-meta .truncate {
  white-space: normal;
}
</style>