<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import ToastNotification from '../components/ToastNotification.vue'
import {
  actualizarMedicamento,
  cambiarEstadoMedicamento,
  crearMedicamento,
  eliminarFotoMedicamento,
  eliminarMedicamentoLogico,
  listarCategorias,
  listarMedicamentos,
  subirFotoMedicamento
} from '../../data/endpoints/medicines'
import { apiAssetUrl } from '../../data/api'
import { obtenerParametros } from '../../data/endpoints/parameters'
import { formatearPrecio } from '../../business/format'
import { puedeGestionarCatalogo } from '../../business/session'
import {
  FORMAS_FARMACEUTICAS,
  TIPOS_VENTA,
  limpiarCampoMedicamento,
  validarCampoMedicamento,
  validarFormularioMedicamento
} from '../validators/medicine'

const medicamentos = ref([])
const categorias = ref([])
const loading = ref(true)
const saving = ref(false)
const modalAbierto = ref(false)
const editando = ref(false)
const error = ref('')
const errorFormulario = ref('')
const errorAccion = ref('')
const notificacion = ref('')
const stockSeguridadPorDefecto = ref(10)
const diasReposicionPorDefecto = ref(5)
const fotoOriginal = ref('')
const fotoPendiente = ref(null)
const fotoEliminada = ref(false)
const fotoPreview = ref('')
const errorFoto = ref('')
const inputFoto = ref(null)

const puedeGestionar = computed(() => puedeGestionarCatalogo())
const fotoVisible = computed(() => (
  fotoPreview.value
  || (fotoOriginal.value && !fotoEliminada.value
    ? apiAssetUrl(fotoOriginal.value)
    : '')
))

// Filtros, búsqueda y paginación
const search = ref('')
const filtroCategoria = ref('Todos')
const filtroEstado = ref('Todos')
const porPagina = 12
const paginaActual = ref(1)

// Cambio de estado (borrado lógico del catálogo)
const medicamentoEstado = ref(null)
const errorEstado = ref('')
const procesandoEstado = ref(null)
const medicamentoBaja = ref(null)
const errorBaja = ref('')
const procesandoBaja = ref(false)
const eliminandoId = ref(null)

const formularioInicial = () => ({
  id_medicamento: null,
  codigo_barras: '',
  nombre_comercial: '',
  dci: '',
  concentracion: '',
  forma_farmaceutica: '',
  precio_unitario: '',
  tipo_venta: 'Libre',
  stock_seguridad: String(stockSeguridadPorDefecto.value),
  dias_reposicion: String(diasReposicionPorDefecto.value),
  id_categoria: ''
})
const form = ref(formularioInicial())

const errores = ref({})
const touched = ref({})

const restablecerValidacion = () => {
  errores.value = {}
  touched.value = {}
}

const validarCampo = (campo) => {
  errores.value[campo] = validarCampoMedicamento(campo, form.value[campo])
}

const alEscribir = (campo) => {
  form.value[campo] = limpiarCampoMedicamento(campo, form.value[campo])
  if (touched.value[campo]) validarCampo(campo)
}

const alSalir = (campo) => {
  touched.value[campo] = true
  validarCampo(campo)
}

const validarFormulario = () => {
  errores.value = validarFormularioMedicamento(form.value)
  Object.keys(errores.value).forEach((campo) => {
    touched.value[campo] = true
  })
  return !Object.values(errores.value).some(Boolean)
}

const liberarPrevisualizacionFoto = () => {
  if (fotoPreview.value.startsWith('blob:')) {
    URL.revokeObjectURL(fotoPreview.value)
  }
  fotoPreview.value = ''
}

const limpiarEstadoFoto = () => {
  liberarPrevisualizacionFoto()
  fotoOriginal.value = ''
  fotoPendiente.value = null
  fotoEliminada.value = false
  errorFoto.value = ''
  if (inputFoto.value) inputFoto.value.value = ''
}

const seleccionarFoto = (event) => {
  const archivo = event.target.files?.[0]
  if (!archivo) return

  const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp']
  if (!tiposPermitidos.includes(archivo.type)) {
    errorFoto.value = 'La foto debe ser JPEG, PNG o WebP.'
    event.target.value = ''
    return
  }
  if (archivo.size > 5 * 1024 * 1024) {
    errorFoto.value = 'La foto no puede superar 5 MB.'
    event.target.value = ''
    return
  }

  liberarPrevisualizacionFoto()
  fotoPendiente.value = archivo
  fotoPreview.value = URL.createObjectURL(archivo)
  fotoEliminada.value = false
  errorFoto.value = ''
  event.target.value = ''
}

const quitarFotoSeleccionada = () => {
  liberarPrevisualizacionFoto()
  fotoPendiente.value = null
  fotoEliminada.value = Boolean(form.value.id_medicamento && fotoOriginal.value)
  errorFoto.value = ''
}

const esActivo = (medicamento) => (
  String(medicamento?.estado_medicamento || '').trim().toLocaleLowerCase() === 'activo'
)

const notificar = (texto) => {
  notificacion.value = texto
}

const categoriasDisponibles = computed(() => {
  const conjunto = new Map()
  categorias.value.forEach((categoria) => {
    conjunto.set(String(categoria.id_categoria), categoria.nombre_categoria)
  })
  medicamentos.value.forEach((medicamento) => {
    if (medicamento.id_categoria) {
      conjunto.set(String(medicamento.id_categoria), medicamento.nombre_categoria)
    }
  })
  return Array.from(conjunto, ([id, nombre]) => ({ id, nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
})

const estadosDisponibles = ['Activo', 'Inactivo']

// Filtrado + búsqueda
const medicamentosFiltrados = computed(() => {
  const consulta = search.value.trim().toLocaleLowerCase()

  return medicamentos.value.filter((medicamento) => {
    if (consulta) {
      const coincide = [
        medicamento.nombre_comercial,
        medicamento.dci,
        medicamento.concentracion,
        medicamento.forma_farmaceutica,
        medicamento.nombre_categoria,
        medicamento.codigo_barras
      ].some((valor) => String(valor || '').toLocaleLowerCase().includes(consulta))
      if (!coincide) return false
    }

    if (
      filtroCategoria.value !== 'Todos'
      && String(medicamento.id_categoria) !== filtroCategoria.value
    ) {
      return false
    }

    if (
      filtroEstado.value !== 'Todos'
      && String(medicamento.estado_medicamento).toLocaleLowerCase()
        !== filtroEstado.value.toLocaleLowerCase()
    ) {
      return false
    }

    return true
  })
})

// Paginación
const totalPaginas = computed(() => (
  Math.max(1, Math.ceil(medicamentosFiltrados.value.length / porPagina))
))

const medicamentosPaginados = computed(() => {
  const inicio = (paginaActual.value - 1) * porPagina
  return medicamentosFiltrados.value.slice(inicio, inicio + porPagina)
})

const indiceInicio = computed(() => (
  medicamentosFiltrados.value.length === 0
    ? 0
    : (paginaActual.value - 1) * porPagina + 1
))

const indiceFin = computed(() => (
  Math.min(paginaActual.value * porPagina, medicamentosFiltrados.value.length)
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

watch([search, filtroCategoria, filtroEstado], () => {
  paginaActual.value = 1
})

watch(totalPaginas, (total) => {
  if (paginaActual.value > total) paginaActual.value = total
})

const limpiarFiltros = () => {
  search.value = ''
  filtroCategoria.value = 'Todos'
  filtroEstado.value = 'Todos'
  paginaActual.value = 1
}

const hayFiltrosActivos = computed(() => (
  search.value.trim() !== ''
  || filtroCategoria.value !== 'Todos'
  || filtroEstado.value !== 'Todos'
))

const filtrosActivos = computed(() => [
  search.value.trim() !== '',
  filtroCategoria.value !== 'Todos',
  filtroEstado.value !== 'Todos'
].filter(Boolean).length)

// Tarjetas de estadísticas
const totalMedicamentos = computed(() => medicamentos.value.length)
const medicamentosActivos = computed(() => (
  medicamentos.value.filter((medicamento) => esActivo(medicamento)).length
))
const medicamentosConReceta = computed(() => (
  medicamentos.value.filter((medicamento) => medicamento.tipo_venta === 'Con receta').length
))
const medicamentosInactivos = computed(() => (
  medicamentos.value.filter((medicamento) => !esActivo(medicamento)).length
))

const mensajeErrorAccion = (err) => {
  if (err.status === 401 || err.status === 403) {
    return 'No tienes permisos para gestionar el catálogo o tu sesión expiró. Vuelve a iniciar sesión.'
  }
  if (err.status === 404) {
    return 'El medicamento no existe o ya no está disponible.'
  }
  return `No se pudo completar la operación: ${err.message}`
}

const cargarDatos = async () => {
  loading.value = true
  error.value = ''
  try {
    const [lista, listaCategorias] = await Promise.all([
      listarMedicamentos(),
      listarCategorias()
    ])
    medicamentos.value = lista
    categorias.value = listaCategorias
    try {
      const parametros = await obtenerParametros()
      const stockSeguridad = Number(parametros.stockSeguridad)
      const diasReposicion = Number(parametros.diasReposicion)
      stockSeguridadPorDefecto.value = Number.isInteger(stockSeguridad)
        && stockSeguridad >= 0 ? stockSeguridad : 10
      diasReposicionPorDefecto.value = Number.isInteger(diasReposicion)
        && diasReposicion > 0 ? diasReposicion : 5
    } catch (errorParametros) {
      stockSeguridadPorDefecto.value = 10
      diasReposicionPorDefecto.value = 5
      console.error(
        'No se pudieron cargar los parámetros; se usarán los valores predeterminados.',
        errorParametros
      )
    }
  } catch (err) {
    error.value = mensajeErrorAccion(err)
  } finally {
    loading.value = false
  }
}

const abrirNuevo = () => {
  limpiarEstadoFoto()
  editando.value = false
  form.value = formularioInicial()
  errorFormulario.value = ''
  restablecerValidacion()
  modalAbierto.value = true
}

const abrirEdicion = (medicamento) => {
  limpiarEstadoFoto()
  editando.value = true
  fotoOriginal.value = medicamento.foto_url || ''
  form.value = {
    id_medicamento: medicamento.id_medicamento,
    codigo_barras: medicamento.codigo_barras,
    nombre_comercial: medicamento.nombre_comercial,
    dci: medicamento.dci,
    concentracion: medicamento.concentracion,
    forma_farmaceutica: medicamento.forma_farmaceutica,
    precio_unitario: Number(medicamento.precio_unitario).toFixed(2),
    tipo_venta: medicamento.tipo_venta,
    stock_seguridad: String(medicamento.stock_seguridad),
    dias_reposicion: String(medicamento.dias_reposicion),
    id_categoria: String(medicamento.id_categoria)
  }
  errorFormulario.value = ''
  restablecerValidacion()
  const errorReposicion = validarCampoMedicamento(
    'dias_reposicion',
    form.value.dias_reposicion
  )
  if (errorReposicion) {
    errores.value.dias_reposicion = errorReposicion
    touched.value.dias_reposicion = true
  }
  modalAbierto.value = true
}

const cerrarModal = () => {
  if (saving.value) return
  modalAbierto.value = false
  limpiarEstadoFoto()
}

const guardarMedicamento = async () => {
  errorFormulario.value = ''

  if (!validarFormulario()) {
    errorFormulario.value = 'Revisa los campos marcados en rojo antes de guardar.'
    return
  }

  saving.value = true

  const body = {
    codigo_barras: form.value.codigo_barras.trim(),
    nombre_comercial: form.value.nombre_comercial.trim(),
    dci: form.value.dci.trim(),
    concentracion: form.value.concentracion.trim(),
    forma_farmaceutica: form.value.forma_farmaceutica,
    precio_unitario: Number(form.value.precio_unitario),
    tipo_venta: form.value.tipo_venta,
    stock_seguridad: Number(form.value.stock_seguridad),
    dias_reposicion: Number(form.value.dias_reposicion),
    id_categoria: Number(form.value.id_categoria)
  }

  try {
    const eraEdicion = editando.value
    let idMedicamento = form.value.id_medicamento

    if (eraEdicion) {
      await actualizarMedicamento(idMedicamento, body)
    } else {
      const creado = await crearMedicamento(body)
      idMedicamento = creado.id_medicamento
    }

    try {
      if (fotoPendiente.value) {
        const resultado = await subirFotoMedicamento(idMedicamento, fotoPendiente.value)
        fotoOriginal.value = resultado.foto_url
        fotoEliminada.value = false
      } else if (fotoEliminada.value) {
        await eliminarFotoMedicamento(idMedicamento)
        fotoOriginal.value = ''
        fotoEliminada.value = false
      }
    } catch (err) {
      if (!eraEdicion) {
        editando.value = true
        form.value.id_medicamento = idMedicamento
      }
      errorFormulario.value = `Los datos se guardaron, pero no se pudo guardar la foto: ${err.message}. Puedes volver a intentarlo.`
      await cargarDatos()
      return
    }

    const mensaje = eraEdicion
      ? 'Los datos del medicamento se actualizaron.'
      : 'El medicamento se registró correctamente.'
    limpiarEstadoFoto()
    modalAbierto.value = false
    await cargarDatos()
    notificar(mensaje)
  } catch (err) {
    errorFormulario.value = err.message
  } finally {
    saving.value = false
  }
}

// =====================================================
// ACTIVAR / DESACTIVAR MEDICAMENTO
// =====================================================
const abrirCambioEstado = (medicamento) => {
  if (!puedeGestionar.value) return
  medicamentoEstado.value = medicamento
  errorEstado.value = ''
}

const cerrarCambioEstado = () => {
  if (procesandoEstado.value) return
  medicamentoEstado.value = null
  errorEstado.value = ''
}

const confirmarCambioEstado = async () => {
  const medicamento = medicamentoEstado.value
  if (!medicamento?.id_medicamento) return

  const activo = !esActivo(medicamento)
  procesandoEstado.value = medicamento.id_medicamento
  errorEstado.value = ''

  try {
    await cambiarEstadoMedicamento(medicamento.id_medicamento, activo)
    medicamentoEstado.value = null
    await cargarDatos()
    notificar(
      `"${medicamento.nombre_comercial}" quedó ${activo ? 'activo' : 'inactivo'}.`
    )
  } catch (err) {
    errorEstado.value = mensajeErrorAccion(err)
  } finally {
    procesandoEstado.value = null
  }
}

const abrirBaja = (medicamento) => {
  if (!puedeGestionar.value || procesandoBaja.value) return
  medicamentoBaja.value = medicamento
  errorBaja.value = ''
}

const cerrarBaja = () => {
  if (procesandoBaja.value) return
  medicamentoBaja.value = null
  errorBaja.value = ''
}

const confirmarBaja = async () => {
  const medicamento = medicamentoBaja.value
  if (!medicamento?.id_medicamento) {
    errorBaja.value = 'No se pudo identificar el medicamento.'
    return
  }

  procesandoBaja.value = true
  eliminandoId.value = medicamento.id_medicamento
  errorBaja.value = ''

  try {
    await eliminarMedicamentoLogico(medicamento.id_medicamento)
    medicamentoBaja.value = null
    await cargarDatos()
    notificar(`"${medicamento.nombre_comercial}" se eliminó correctamente.`)
  } catch (err) {
    errorBaja.value = mensajeErrorAccion(err)
  } finally {
    procesandoBaja.value = false
    eliminandoId.value = null
  }
}

onMounted(cargarDatos)
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
        <span class="eyebrow">Catálogo</span>
        <h2>Medicamentos</h2>
        <p>Registro, actualización y búsqueda del catálogo de la farmacia.</p>
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
          @click="abrirNuevo"
        >
          <i class="fas fa-plus"></i>
          Nuevo medicamento
        </button>
      </div>
    </div>

    <!-- Tarjetas de estadísticas -->
    <div class="stats-grid">
      <div class="stat-card">
        <p>Total registrados</p>
        <strong>{{ totalMedicamentos }}</strong>
      </div>
      <div class="stat-card">
        <p>Activos</p>
        <strong>{{ medicamentosActivos }}</strong>
      </div>
      <div class="stat-card">
        <p>Con receta</p>
        <strong>{{ medicamentosConReceta }}</strong>
      </div>
      <div class="stat-card is-danger">
        <p>Inactivos</p>
        <strong>{{ medicamentosInactivos }}</strong>
      </div>
    </div>

    <!-- Contenedor principal -->
    <div class="panel">
      <div class="panel-title-bar">
        <h3>Catálogo registrado</h3>
      </div>

      <!-- Barra de búsqueda y filtros -->
      <div class="panel-toolbar">
        <div class="panel-filters">
          <div class="field field-search">
            <label class="visually-hidden" for="buscar-medicamentos">Buscar medicamentos</label>
            <i class="fas fa-search"></i>
            <input
              id="buscar-medicamentos"
              v-model="search"
              class="form-control panel-control"
              type="search"
              placeholder="Buscar por nombre, DCI, categoría o código de barras..."
              autocomplete="off"
            >
          </div>

          <div class="field">
            <label for="filtrar-categoria">Categoría</label>
            <select
              id="filtrar-categoria"
              v-model="filtroCategoria"
              class="form-select panel-control"
            >
              <option value="Todos">Todas</option>
              <option
                v-for="categoria in categoriasDisponibles"
                :key="categoria.id"
                :value="categoria.id"
              >
                {{ categoria.nombre }}
              </option>
            </select>
          </div>

          <div class="field">
            <label for="filtrar-estado-medicamento">Estado</label>
            <select
              id="filtrar-estado-medicamento"
              v-model="filtroEstado"
              class="form-select panel-control"
            >
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
          <strong>{{ medicamentosFiltrados.length }}</strong>
          medicamentos
          <span v-if="hayFiltrosActivos">(filtrados de {{ totalMedicamentos }} en total)</span>
        </p>
      </div>

      <!-- Estado de carga / error / vacío -->
      <div v-if="loading" class="panel-state">
        <span class="spinner-border spinner-border-sm me-2" role="status"></span>
        Cargando catálogo...
      </div>
      <div v-else-if="error" class="panel-state is-error">{{ error }}</div>
      <div v-else-if="medicamentosFiltrados.length === 0" class="panel-state">
        <i class="fas fa-pills fs-4 d-block mb-2"></i>
        {{
          hayFiltrosActivos
            ? 'No se encontraron medicamentos que coincidan con los filtros.'
            : 'No hay medicamentos registrados.'
        }}
      </div>

      <template v-else>
        
        <div class="medicines-grid">
          <article
            v-for="medicamento in medicamentosPaginados"
            :key="medicamento.id_medicamento"
            class="medicine-card"
          >
            <div class="medicine-card-header-img">
              <img
                v-if="medicamento.foto_url"
                :src="apiAssetUrl(medicamento.foto_url)"
                :alt="`Foto de ${medicamento.nombre_comercial}`"
                loading="lazy"
              >
              <span v-else class="no-photo-text">
                <i class="fas fa-pills" aria-hidden="true"></i>
                Sin foto
              </span>
            </div>
            
            <div class="medicine-card-body">
              <div class="medicine-info">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <h4 class="medicine-title truncate" :title="medicamento.nombre_comercial">
                    {{ medicamento.nombre_comercial }}
                  </h4>
                  <span
                    class="badge-estado"
                    :class="esActivo(medicamento) ? 'is-active' : 'is-inactive'"
                  >
                    {{ medicamento.estado_medicamento }}
                  </span>
                </div>

                <p class="medicine-desc truncate-2-lines" :title="`${medicamento.dci} · ${medicamento.concentracion} · ${medicamento.forma_farmaceutica}`">
                  {{ medicamento.dci }} · {{ medicamento.concentracion }} · {{ medicamento.forma_farmaceutica }}
                </p>

                <div class="medicine-stats">
                  <div>
                    <span>Categoría</span>
                    <strong class="truncate" :title="medicamento.nombre_categoria">{{ medicamento.nombre_categoria }}</strong>
                  </div>
                  <div>
                    <span>Precio</span>
                    <strong>{{ formatearPrecio(medicamento.precio_unitario) }}</strong>
                  </div>
                  <div>
                    <span>Stock</span>
                    <strong :class="{ 'is-empty': medicamento.stock_vigente <= 0 }">
                      {{ medicamento.stock_vigente }} u.
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            <div class="medicine-card-footer">
              <template v-if="puedeGestionar">
                <button
                  type="button"
                  class="medicine-action is-edit"
                  title="Editar medicamento"
                  @click="abrirEdicion(medicamento)"
                >
                  <i class="fas fa-pen" aria-hidden="true"></i>
                  <span>Editar</span>
                </button>
                <button
                  type="button"
                  class="medicine-action"
                  :class="esActivo(medicamento) ? 'is-warning' : 'is-success'"
                  :title="esActivo(medicamento) ? 'Desactivar' : 'Activar'"
                  :aria-label="esActivo(medicamento) ? 'Desactivar medicamento' : 'Activar medicamento'"
                  @click="abrirCambioEstado(medicamento)"
                >
                  <i
                    class="fas"
                    :class="esActivo(medicamento) ? 'fa-ban' : 'fa-check'"
                    aria-hidden="true"
                  ></i>
                  <span>{{ esActivo(medicamento) ? 'Desactivar' : 'Activar' }}</span>
                </button>
                <button
                  type="button"
                  class="medicine-action is-danger"
                  :disabled="eliminandoId === medicamento.id_medicamento"
                  title="Eliminar medicamento"
                  aria-label="Eliminar medicamento"
                  @click="abrirBaja(medicamento)"
                >
                  <i v-if="eliminandoId === medicamento.id_medicamento" class="fas fa-spinner fa-spin"></i>
                  <i v-else class="fas fa-trash-alt" aria-hidden="true"></i>
                  <span>Eliminar</span>
                </button>
              </template>
              <span v-else class="text-muted small w-100 text-center">Modo de solo lectura</span>
            </div>
          </article>
        </div>

        <!-- Paginación numerada -->
        <div v-if="totalPaginas > 1" class="panel-footer mt-4 border-top pt-3">
          <p>
            Página <strong>{{ paginaActual }}</strong> de <strong>{{ totalPaginas }}</strong>
          </p>

          <nav class="pagination" aria-label="Paginación de medicamentos">
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
      class="panel-modal-backdrop"
      role="presentation"
      @mousedown.self="cerrarModal"
    >
      <section
        class="panel-modal is-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="medicamento-modal-title"
      >
        <div class="panel-modal-head">
          <div>
            <h3 id="medicamento-modal-title">
              {{ editando ? 'Editar medicamento' : 'Nuevo medicamento' }}
            </h3>
            <p>Los campos con * son obligatorios.</p>
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

        <form class="mt-4" novalidate @submit.prevent="guardarMedicamento">
          <div class="row g-3">
            <!-- (Campos de formulario intactos) -->
            <div class="col-md-6">
              <label class="form-label" for="codigo-barras">
                Código de barras <span class="req">*</span>
              </label>
              <input
                id="codigo-barras"
                v-model="form.codigo_barras"
                class="form-control"
                :class="{ 'is-invalid': errores.codigo_barras && touched.codigo_barras }"
                maxlength="20"
                autocomplete="off"
                placeholder="Ej.: 7770000000011"
                :aria-invalid="Boolean(errores.codigo_barras && touched.codigo_barras)"
                @input="alEscribir('codigo_barras')"
                @blur="alSalir('codigo_barras')"
              >
              <p class="error-text" role="alert">
                <template v-if="errores.codigo_barras && touched.codigo_barras">
                  <i class="fas fa-circle-exclamation"></i>{{ errores.codigo_barras }}
                </template>
              </p>
            </div>

            <div class="col-md-6">
              <label class="form-label" for="nombre-comercial">
                Nombre comercial <span class="req">*</span>
              </label>
              <input
                id="nombre-comercial"
                v-model="form.nombre_comercial"
                class="form-control"
                :class="{ 'is-invalid': errores.nombre_comercial && touched.nombre_comercial }"
                maxlength="100"
                autocomplete="off"
                placeholder="Ej.: Dolofin"
                :aria-invalid="Boolean(errores.nombre_comercial && touched.nombre_comercial)"
                @input="alEscribir('nombre_comercial')"
                @blur="alSalir('nombre_comercial')"
              >
              <p class="error-text" role="alert">
                <template v-if="errores.nombre_comercial && touched.nombre_comercial">
                  <i class="fas fa-circle-exclamation"></i>{{ errores.nombre_comercial }}
                </template>
              </p>
            </div>

            <div class="col-md-6">
              <label class="form-label" for="dci">
                Principio activo (DCI) <span class="req">*</span>
              </label>
              <input
                id="dci"
                v-model="form.dci"
                class="form-control"
                :class="{ 'is-invalid': errores.dci && touched.dci }"
                maxlength="100"
                autocomplete="off"
                placeholder="Ej.: Paracetamol"
                :aria-invalid="Boolean(errores.dci && touched.dci)"
                @input="alEscribir('dci')"
                @blur="alSalir('dci')"
              >
              <p class="error-text" role="alert">
                <template v-if="errores.dci && touched.dci">
                  <i class="fas fa-circle-exclamation"></i>{{ errores.dci }}
                </template>
              </p>
            </div>

            <div class="col-md-6">
              <label class="form-label" for="concentracion">
                Concentración <span class="req">*</span>
              </label>
              <input
                id="concentracion"
                v-model="form.concentracion"
                class="form-control"
                :class="{ 'is-invalid': errores.concentracion && touched.concentracion }"
                maxlength="40"
                autocomplete="off"
                placeholder="Ej.: 500 mg"
                :aria-invalid="Boolean(errores.concentracion && touched.concentracion)"
                @input="alEscribir('concentracion')"
                @blur="alSalir('concentracion')"
              >
              <p class="error-text" role="alert">
                <template v-if="errores.concentracion && touched.concentracion">
                  <i class="fas fa-circle-exclamation"></i>{{ errores.concentracion }}
                </template>
              </p>
            </div>

            <div class="col-md-4">
              <label class="form-label" for="forma-farmaceutica">
                Forma farmacéutica <span class="req">*</span>
              </label>
              <select
                id="forma-farmaceutica"
                v-model="form.forma_farmaceutica"
                class="form-select"
                :class="{ 'is-invalid': errores.forma_farmaceutica && touched.forma_farmaceutica }"
                :aria-invalid="Boolean(errores.forma_farmaceutica && touched.forma_farmaceutica)"
                @change="alSalir('forma_farmaceutica')"
                @blur="alSalir('forma_farmaceutica')"
              >
                <option value="" disabled>Selecciona</option>
                <option v-for="forma in FORMAS_FARMACEUTICAS" :key="forma" :value="forma">
                  {{ forma }}
                </option>
              </select>
              <p class="error-text" role="alert">
                <template v-if="errores.forma_farmaceutica && touched.forma_farmaceutica">
                  <i class="fas fa-circle-exclamation"></i>{{ errores.forma_farmaceutica }}
                </template>
              </p>
            </div>

            <div class="col-md-4">
              <label class="form-label" for="categoria">
                Categoría <span class="req">*</span>
              </label>
              <select
                id="categoria"
                v-model="form.id_categoria"
                class="form-select"
                :class="{ 'is-invalid': errores.id_categoria && touched.id_categoria }"
                :aria-invalid="Boolean(errores.id_categoria && touched.id_categoria)"
                @change="alSalir('id_categoria')"
                @blur="alSalir('id_categoria')"
              >
                <option value="" disabled>Selecciona</option>
                <option
                  v-for="categoria in categorias"
                  :key="categoria.id_categoria"
                  :value="String(categoria.id_categoria)"
                >
                  {{ categoria.nombre_categoria }}
                </option>
              </select>
              <p class="error-text" role="alert">
                <template v-if="errores.id_categoria && touched.id_categoria">
                  <i class="fas fa-circle-exclamation"></i>{{ errores.id_categoria }}
                </template>
              </p>
            </div>

            <div class="col-md-4">
              <label class="form-label" for="tipo-venta">
                Tipo de venta <span class="req">*</span>
              </label>
              <select
                id="tipo-venta"
                v-model="form.tipo_venta"
                class="form-select"
                :class="{ 'is-invalid': errores.tipo_venta && touched.tipo_venta }"
                :aria-invalid="Boolean(errores.tipo_venta && touched.tipo_venta)"
                @change="alSalir('tipo_venta')"
                @blur="alSalir('tipo_venta')"
              >
                <option v-for="tipo in TIPOS_VENTA" :key="tipo" :value="tipo">
                  {{ tipo }}
                </option>
              </select>
              <p class="error-text" role="alert">
                <template v-if="errores.tipo_venta && touched.tipo_venta">
                  <i class="fas fa-circle-exclamation"></i>{{ errores.tipo_venta }}
                </template>
              </p>
            </div>

            <div class="col-md-4">
              <label class="form-label" for="precio-unitario">
                Precio (Bs) <span class="req">*</span>
              </label>
              <input
                id="precio-unitario"
                v-model="form.precio_unitario"
                class="form-control"
                :class="{ 'is-invalid': errores.precio_unitario && touched.precio_unitario }"
                inputmode="decimal"
                autocomplete="off"
                placeholder="0.00"
                :aria-invalid="Boolean(errores.precio_unitario && touched.precio_unitario)"
                @input="alEscribir('precio_unitario')"
                @blur="alSalir('precio_unitario')"
              >
              <p class="error-text" role="alert">
                <template v-if="errores.precio_unitario && touched.precio_unitario">
                  <i class="fas fa-circle-exclamation"></i>{{ errores.precio_unitario }}
                </template>
              </p>
            </div>

            <div class="col-md-4">
              <label class="form-label" for="stock-seguridad">Stock de seguridad</label>
              <input
                id="stock-seguridad"
                v-model="form.stock_seguridad"
                class="form-control"
                :class="{ 'is-invalid': errores.stock_seguridad && touched.stock_seguridad }"
                inputmode="numeric"
                autocomplete="off"
                placeholder="0"
                :aria-invalid="Boolean(errores.stock_seguridad && touched.stock_seguridad)"
                @input="alEscribir('stock_seguridad')"
                @blur="alSalir('stock_seguridad')"
              >
              <p class="error-text" role="alert">
                <template v-if="errores.stock_seguridad && touched.stock_seguridad">
                  <i class="fas fa-circle-exclamation"></i>{{ errores.stock_seguridad }}
                </template>
              </p>
            </div>

            <div class="col-md-4">
              <label class="form-label" for="dias-reposicion">Días de reposición</label>
              <input
                id="dias-reposicion"
                v-model="form.dias_reposicion"
                class="form-control"
                :class="{ 'is-invalid': errores.dias_reposicion && touched.dias_reposicion }"
                inputmode="numeric"
                autocomplete="off"
                placeholder="0"
                :aria-invalid="Boolean(errores.dias_reposicion && touched.dias_reposicion)"
                @input="alEscribir('dias_reposicion')"
                @blur="alSalir('dias_reposicion')"
              >
              <p class="error-text" role="alert">
                <template v-if="errores.dias_reposicion && touched.dias_reposicion">
                  <i class="fas fa-circle-exclamation"></i>{{ errores.dias_reposicion }}
                </template>
              </p>
            </div>
          </div>

          <div class="medicine-photo-editor mt-3">
            <div class="medicine-photo-preview">
              <img v-if="fotoVisible" :src="fotoVisible" alt="Vista previa de la foto">
              <!-- Cero íconos en todo el componente, sustituido por texto -->
              <span v-else class="no-photo-text" style="font-size: 0.75rem;">Sin foto</span>
            </div>
            <div class="medicine-photo-actions">
              <label class="form-label" for="foto-medicamento">
                Foto del medicamento <span class="text-muted">(opcional)</span>
              </label>
              <input
                id="foto-medicamento"
                ref="inputFoto"
                class="form-control"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                :disabled="saving"
                @change="seleccionarFoto"
              >
              <small class="text-muted">JPEG, PNG o WebP; máximo 5 MB.</small>
              <button
                v-if="fotoPendiente || (fotoOriginal && !fotoEliminada)"
                type="button"
                class="btn-row mt-2"
                :disabled="saving"
                @click="quitarFotoSeleccionada"
              >
                Quitar foto
              </button>
              <p v-if="errorFoto" class="error-text" role="alert">{{ errorFoto }}</p>
            </div>
          </div>

          <div v-if="errorFormulario" class="notice notice-error mt-3" role="alert">
            <span><i class="fas fa-circle-exclamation me-2"></i>{{ errorFormulario }}</span>
          </div>

          <div class="d-flex justify-content-end gap-2 mt-4">
            <button
              type="button"
              class="btn-panel btn-panel-ghost"
              :disabled="saving"
              @click="cerrarModal"
            >
              Cancelar
            </button>
            <button type="submit" class="btn-panel btn-panel-primary" :disabled="saving">
              <span v-if="saving" class="spinner-border spinner-border-sm me-2" role="status"></span>
              {{ saving ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </form>
      </section>
    </div>

    <!-- Confirmación de activar / desactivar -->
    <div
      v-if="medicamentoEstado"
      class="panel-modal-backdrop"
      role="presentation"
      @mousedown.self="cerrarCambioEstado"
    >
      <section
        class="panel-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-estado-medicamento"
      >
        <div class="panel-modal-head">
          <div>
            <h3 id="titulo-estado-medicamento">
              {{ esActivo(medicamentoEstado) ? 'Desactivar medicamento' : 'Activar medicamento' }}
            </h3>
            <p>{{ medicamentoEstado.nombre_comercial }}</p>
          </div>
          <button
            type="button"
            class="panel-modal-close"
            aria-label="Cerrar"
            :disabled="Boolean(procesandoEstado)"
            @click="cerrarCambioEstado"
          >
            ×
          </button>
        </div>

        <p class="mt-4 mb-0 small">
          <template v-if="esActivo(medicamentoEstado)">
            El medicamento quedará <strong>inactivo</strong> y dejará de ofrecerse en el
            catálogo, pero se conservará para el historial.
          </template>
          <template v-else>
            El medicamento volverá a estar <strong>activo</strong> y disponible en el catálogo.
          </template>
        </p>

        <div v-if="errorEstado" class="notice notice-error mt-3" role="alert">
          <span><i class="fas fa-circle-exclamation me-2"></i>{{ errorEstado }}</span>
        </div>

        <div class="panel-modal-actions">
          <button
            type="button"
            class="btn-panel btn-panel-ghost"
            :disabled="Boolean(procesandoEstado)"
            @click="cerrarCambioEstado"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="btn-panel"
            :class="esActivo(medicamentoEstado) ? 'btn-panel-danger' : 'btn-panel-primary'"
            :disabled="Boolean(procesandoEstado)"
            @click="confirmarCambioEstado"
          >
            {{ procesandoEstado ? 'Procesando...' : (esActivo(medicamentoEstado) ? 'Desactivar' : 'Activar') }}
          </button>
        </div>
      </section>
    </div>

    <!-- Confirmación de baja lógica del medicamento -->
    <div
      v-if="medicamentoBaja"
      class="panel-modal-backdrop"
      role="presentation"
      @mousedown.self="cerrarBaja"
    >
      <section
        class="panel-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-baja-medicamento"
      >
        <div class="panel-modal-head">
          <div>
            <h3 id="titulo-baja-medicamento">Eliminar medicamento</h3>
            <p>{{ medicamentoBaja.nombre_comercial }}</p>
          </div>
          <button
            type="button"
            class="panel-modal-close"
            aria-label="Cerrar"
            :disabled="procesandoBaja"
            @click="cerrarBaja"
          >
            ×
          </button>
        </div>

        <p class="mt-4 mb-0 small">
          ¿Quieres eliminar este medicamento? Se marcará como
          <strong>eliminado</strong>; sus lotes, ventas e historial se conservarán.
        </p>

        <div v-if="errorBaja" class="notice notice-error mt-3" role="alert">
          <span><i class="fas fa-circle-exclamation me-2"></i>{{ errorBaja }}</span>
        </div>

        <div class="panel-modal-actions">
          <button
            type="button"
            class="btn-panel btn-panel-ghost"
            :disabled="procesandoBaja"
            @click="cerrarBaja"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="btn-panel btn-panel-danger"
            :disabled="procesandoBaja"
            @click="confirmarBaja"
          >
            {{ procesandoBaja ? 'Procesando...' : 'Eliminar' }}
          </button>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.min-w-0 {
  min-width: 0;
}

.panel-modal.is-wide {
  width: min(100%, 820px);
}

/* ============================================== */
/* GRID Y TARJETAS TIPO E-COMMERCE                */
/* ============================================== */
.medicines-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  align-items: stretch;
  gap: 1rem;
  padding: 1rem;
}

.medicine-card {
  min-width: 0;
  background: var(--bg-card);
  color: var(--text-main);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.medicine-card:hover {
  transform: translateY(-2px);
  border-color: var(--border-strong);
  box-shadow: var(--shadow-md);
}

.medicine-card-header-img {
  height: 168px;
  /* Forzamos un fondo blanco para que las fotos de los medicamentos se vean bien en modo claro y oscuro */
  background: #ffffff; 
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  overflow: hidden;
}

.medicine-card-header-img img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: transform 0.3s ease;
}

.medicine-card:hover .medicine-card-header-img img {
  transform: scale(1.04);
}

.no-photo-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
  color: var(--text-soft);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

/* Ajuste de color para los textos "Sin foto" que ahora están sobre fondo blanco */
.medicine-card-header-img .no-photo-text,
.medicine-photo-preview .no-photo-text {
  color: #64748b; /* Gris oscuro para que se lea bien */
}

.no-photo-text i {
  color: var(--text-accent);
  font-size: 1.6rem;
}

.medicine-card-header-img .no-photo-text i,
.medicine-photo-preview .no-photo-text i {
  color: #94a3b8; /* Ícono grisáceo visible sobre blanco */
}

.medicine-card-body {
  padding: 1rem;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.medicine-info {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.medicine-title {
  min-width: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
  line-height: 1.2;
}

.medicine-desc {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin: 0.4rem 0 0.9rem;
  line-height: 1.4;
}

.truncate-2-lines {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2; /* <-- Propiedad estándar añadida para quitar la advertencia */
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
}

.medicine-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
  font-size: 0.85rem;
  margin-top: auto;
}

.medicine-stats div {
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-input);
  padding: 0.55rem 0.65rem;
  border-radius: 0.7rem;
  border: 1px solid var(--border-color);
}

.medicine-stats span {
  color: var(--text-soft);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 0.2rem;
}

.medicine-stats strong {
  overflow: hidden;
  color: var(--text-main);
  font-weight: 600;
  font-size: 0.9rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.medicine-stats strong.is-empty {
  color: var(--danger);
}

.medicine-card-footer {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.45rem;
  padding: 0.75rem 1rem 1rem;
  border-top: 1px solid var(--border-color);
}

.medicine-card-footer > span {
  grid-column: 1 / -1;
  color: var(--text-muted);
}

.medicine-action {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.5rem 0.4rem;
  border: 1px solid var(--border-color);
  border-radius: 0.7rem;
  background: var(--bg-card);
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  line-height: 1.2;
  transition: background-color 0.18s ease, border-color 0.18s ease,
    color 0.18s ease, transform 0.18s ease;
}

.medicine-action:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: var(--border-strong);
  background: var(--accent-soft);
  color: var(--primary);
}

.medicine-action.is-warning {
  color: var(--warning);
}

.medicine-action.is-warning:hover:not(:disabled) {
  border-color: var(--warning);
  background: var(--warning-soft);
  color: var(--warning);
}

.medicine-action.is-success {
  color: var(--success);
}

.medicine-action.is-success:hover:not(:disabled) {
  border-color: var(--success);
  background: var(--success-soft);
  color: var(--success);
}

.medicine-action.is-danger {
  color: var(--danger);
}

.medicine-action.is-danger:hover:not(:disabled) {
  border-color: var(--danger);
  background: var(--danger-soft);
  color: var(--danger);
}

.medicine-action:focus-visible {
  outline: 3px solid var(--ring);
  outline-offset: 2px;
}

.medicine-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* === EDICIÓN FOTO MODAL === */
.medicine-photo-editor {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1.25rem;
  border: 1px solid var(--border-color);
  border-radius: 0.8rem;
  background: var(--bg-card);
}

.medicine-photo-preview {
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  overflow: hidden;
  border: 1px dashed var(--border-strong);
  border-radius: 0.75rem;
  /* Forzamos fondo blanco para que la vista previa sea consistente */
  background: #ffffff; 
  color: var(--text-muted);
}

.medicine-photo-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 8px;
}

.medicine-photo-actions {
  min-width: 0;
  flex: 1;
}

@media (max-width: 575.98px) {
  .panel-modal.is-wide {
    width: 100%;
  }
  .medicine-photo-editor {
    align-items: flex-start;
  }
  .medicine-photo-preview {
    width: 90px;
    height: 90px;
  }
  .medicines-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.75rem;
    padding: 0.75rem;
  }
  .medicine-card-footer {
    padding: 0.65rem 0.75rem 0.75rem;
  }
  .medicine-action {
    gap: 0.25rem;
    padding-inline: 0.25rem;
    font-size: 0.7rem;
  }
}
</style>