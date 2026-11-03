
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

import {
  puedeGestionarCatalogo,
  esAdministrador
} from '../../business/session'

// =====================================================
// PERMISOS
// =====================================================

const puedeGestionar = computed(() => puedeGestionarCatalogo())
const puedeDarBaja = computed(() => esAdministrador())

// =====================================================
// ESTADOS
// =====================================================

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

// =====================================================
// BÚSQUEDA Y FILTROS
// =====================================================

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
      String(valor || '').toLocaleLowerCase().includes(consulta)
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

// =====================================================
// ESTADÍSTICAS
// =====================================================

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

// =====================================================
// FORMULARIO
// =====================================================

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

// =====================================================
// CARGAR INFORMACIÓN
// =====================================================

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

    // Ventas puede consultar lotes, pero no proveedores.
    // Solo cargamos proveedores para quienes pueden recepcionar.
    if (puedeGestionar.value) {
      proveedores.value = await listarProveedores()
    }
  } catch (err) {
    error.value = mensajeError(err)
  } finally {
    loading.value = false
  }
}

// =====================================================
// MENSAJES
// =====================================================

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

// =====================================================
// ABRIR Y CERRAR MODAL
// =====================================================

const abrirRecepcion = () => {
  restablecerFormulario()
  modalAbierto.value = true
}

const cerrarModal = () => {
  if (saving.value) return

  modalAbierto.value = false
  restablecerFormulario()
}

// =====================================================
// REGISTRAR RECEPCIÓN
// =====================================================

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

// =====================================================
// DAR DE BAJA UN LOTE VENCIDO
// =====================================================

const procesandoBaja = ref(null)

const ejecutarBaja = async (lote) => {
  if (!puedeDarBaja.value || lote.estado_lote !== 'Vencido') {
    return
  }

  const confirmar = window.confirm(
    `¿Dar de baja el lote ${lote.lote_numero} de ${lote.medicamento}? Esta operación quedará registrada en el historial.`
  )

  if (!confirmar) return

  procesandoBaja.value = lote.id_lote

  try {
    await darBajaLote(lote.id_lote)

    await cargarDatos()

    notificar('Lote dado de baja correctamente.')
  } catch (err) {
    notificar(mensajeError(err), 'error')
  } finally {
    procesandoBaja.value = null
  }
}

// =====================================================
// FORMATO
// =====================================================

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

    <!-- CABECERA -->
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
          class="btn-panel btn-panel-ghost"
          :disabled="loading"
          @click="cargarDatos"
        >
          <i class="fas fa-rotate"></i>
          Actualizar
        </button>

        <button
          v-if="puedeGestionar"
          type="button"
          class="btn-panel btn-panel-primary"
          @click="abrirRecepcion"
        >
          <i class="fas fa-plus"></i>
          Nueva recepción
        </button>

      </div>
    </div>

    <!-- ERROR -->
    <div
      v-if="error"
      class="notice notice-error"
      role="alert"
    >
      <span><i class="fas fa-circle-exclamation me-2"></i>{{ error }}</span>
      <button
        type="button"
        class="notice-close"
        aria-label="Cerrar aviso"
        @click="error = ''"
      >
        ×
      </button>
    </div>

    <!-- ESTADÍSTICAS -->
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

    <!-- TABLA -->
    <div class="panel lots-list-panel">

      <div class="panel-title-bar">
        <h3>Inventario por lotes</h3>
      </div>

      <div class="panel-toolbar">

        <div class="panel-filters lot-filters">

          <div class="field field-search">

            <label
              for="buscar-lotes"
              class="visually-hidden"
            >
              Buscar lotes
            </label>

            <i class="fas fa-search"></i>

            <input
              id="buscar-lotes"
              v-model="search"
              type="search"
              class="form-control panel-control"
              placeholder="Buscar medicamento, proveedor o número de lote..."
              autocomplete="off"
            >

          </div>

          <div class="field">

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
          <div class="field">
            <label class="d-none d-lg-block" aria-hidden="true">&nbsp;</label>
            <button
              type="button"
              class="btn-panel btn-panel-ghost"
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
        <span class="spinner-border spinner-border-sm me-2"></span>
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
        <i class="fas fa-box-open fs-4 d-block mb-2"></i>
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
                <th>Estado</th>
                <th v-if="puedeDarBaja" class="cell-actions text-end">Acciones</th>
              </tr>
            </thead>

            <tbody>

              <tr
                v-for="(lote, indice) in lotesPaginados"
                :key="lote.id_lote"
              >

                <td>
                  {{ (paginaActual - 1) * porPagina + indice + 1 }}
                </td>

                <td class="cell-truncate">
                  <strong>{{ lote.lote_numero }}</strong>
                </td>

                <td class="cell-truncate">
                  <strong>{{ lote.medicamento }}</strong>
                  <small class="d-block text-muted">
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

                  <small class="d-block text-muted">
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

                <td>
                  <span
                    class="lot-status"
                    :class="claseEstado(lote.estado_lote)"
                  >
                    {{ lote.estado_lote }}
                  </span>
                </td>

                <td v-if="puedeDarBaja">

                  <div class="action-stack">
                    <button
                      v-if="lote.estado_lote === 'Vencido'"
                      type="button"
                      class="btn-row is-danger"
                      :disabled="procesandoBaja === lote.id_lote"
                      @click="ejecutarBaja(lote)"
                    >
                      {{
                        procesandoBaja === lote.id_lote
                          ? 'Procesando...'
                          : 'Dar de baja'
                      }}
                    </button>

                    <span v-else class="text-muted text-center">
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
                <small class="d-block text-muted">
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
                @click="ejecutarBaja(lote)"
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

        <!-- PAGINACIÓN -->
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

    <!-- NOTIFICACIONES -->
    <ToastNotification
      :message="notificacion"
      :tone="tonoNotificacion"
      @close="notificacion = ''"
    />

    <!-- MODAL DE RECEPCIÓN -->
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
            ×
          </button>

        </div>

        <form
          class="mt-4"
          novalidate
          @submit.prevent="guardarRecepcion"
        >

          <div class="row g-3">

            <!-- MEDICAMENTO -->
            <div class="col-12">

              <label class="form-label" for="lote-medicamento">
                Medicamento <span class="req">*</span>
              </label>

              <select
                id="lote-medicamento"
                v-model="form.id_medicamento"
                class="form-select"
                :class="{ 'is-invalid': errores.id_medicamento }"
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

              <small class="error-text">
                {{ errores.id_medicamento }}
              </small>

            </div>

            <!-- PROVEEDOR -->
            <div class="col-12">

              <label class="form-label" for="lote-proveedor">
                Proveedor <span class="req">*</span>
              </label>

              <select
                id="lote-proveedor"
                v-model="form.id_proveedor"
                class="form-select"
                :class="{ 'is-invalid': errores.id_proveedor }"
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

              <small class="error-text">
                {{ errores.id_proveedor }}
              </small>

            </div>

            <!-- NÚMERO DE LOTE -->
            <div class="col-md-6">

              <label class="form-label" for="numero-lote">
                Número de lote <span class="req">*</span>
              </label>

              <input
                id="numero-lote"
                v-model="form.lote_numero"
                type="text"
                maxlength="40"
                class="form-control"
                :class="{ 'is-invalid': errores.lote_numero }"
                placeholder="Ej.: LOTE-2026-A"
              >

              <small class="error-text">
                {{ errores.lote_numero }}
              </small>

            </div>

            <!-- VENCIMIENTO -->
            <div class="col-md-6">

              <label class="form-label" for="fecha-vencimiento">
                Fecha de vencimiento <span class="req">*</span>
              </label>

              <input
                id="fecha-vencimiento"
                v-model="form.fecha_vencimiento"
                type="date"
                :min="fechaMinimaVencimiento"
                class="form-control"
                :class="{
                  'is-invalid': errores.fecha_vencimiento
                }"
              >

              <small class="error-text">
                {{ errores.fecha_vencimiento }}
              </small>

            </div>

            <!-- COSTO -->
            <div class="col-md-6">

              <label class="form-label" for="costo-lote">
                Costo unitario (Bs) <span class="req">*</span>
              </label>

              <input
                id="costo-lote"
                v-model="form.costo_unitario"
                type="number"
                min="0"
                step="0.01"
                class="form-control"
                :class="{ 'is-invalid': errores.costo_unitario }"
                placeholder="Ej.: 1.25"
              >

              <small class="error-text">
                {{ errores.costo_unitario }}
              </small>

            </div>

            <!-- CANTIDAD -->
            <div class="col-md-6">

              <label class="form-label" for="cantidad-lote">
                Cantidad recibida <span class="req">*</span>
              </label>

              <input
                id="cantidad-lote"
                v-model="form.cantidad_stock"
                type="number"
                min="1"
                step="1"
                class="form-control"
                :class="{ 'is-invalid': errores.cantidad_stock }"
                placeholder="Ej.: 100"
              >

              <small class="error-text">
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
              class="btn-panel btn-panel-ghost"
              :disabled="saving"
              @click="cerrarModal"
            >
              Cancelar
            </button>

            <button
              type="submit"
              class="btn-panel btn-panel-primary"
              :disabled="saving"
            >

              <span
                v-if="saving"
                class="spinner-border spinner-border-sm"
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

  </section>
</template>

<style scoped>
.lot-filters {
  grid-template-columns: minmax(0, 1fr);
}

.lots-list-panel {
  container-type: inline-size;
}

@media (min-width: 992px) {
  .lot-filters {
    grid-template-columns:
      minmax(0, 5fr) minmax(180px, 2fr) minmax(150px, 1.5fr);
  }
}

.lot-table {
  min-width: 0;
  table-layout: auto;
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

.lot-table thead th:first-child,
.lot-table tbody td:first-child {
  padding-left: 0.75rem;
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
