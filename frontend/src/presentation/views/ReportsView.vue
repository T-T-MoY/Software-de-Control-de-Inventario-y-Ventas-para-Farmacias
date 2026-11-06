<script setup>
import { computed, onMounted, ref } from 'vue'
import { obtenerReporte, descargarReporte } from '../../data/endpoints/reports'
import { formatearFecha } from '../../business/format'
import ReportCharts from '../components/ReportCharts.vue'

const TIPOS = [
  { clave: 'ventas', nombre: 'Ventas', icono: 'fa-cash-register', conRango: true },
  { clave: 'inventario', nombre: 'Inventario', icono: 'fa-boxes-stacked', conRango: false },
  { clave: 'lotes-por-vencer', nombre: 'Lotes por vencer', icono: 'fa-hourglass-half', conRango: true },
  { clave: 'lotes-vencidos', nombre: 'Lotes vencidos', icono: 'fa-triangle-exclamation', conRango: true }
]

const pad = (n) => String(n).padStart(2, '0')
const aISO = (fecha) => `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`

const hoy = new Date()
const tipo = ref('ventas')
const fechaInicio = ref(aISO(new Date(hoy.getFullYear(), hoy.getMonth(), 1)))
const fechaFin = ref(aISO(hoy))
const reporte = ref(null)
const loading = ref(false)
const exportando = ref('')
const error = ref('')
const aviso = ref('')

const tipoActual = computed(() => TIPOS.find((t) => t.clave === tipo.value))
const ventas = computed(() => tipo.value === 'ventas')

const filtros = () => (tipoActual.value.conRango
  ? { fechaInicio: fechaInicio.value, fechaFin: fechaFin.value }
  : {})

const mensajeError = (err) => (err.status === 401
  ? 'Tu sesiÃ³n expirÃ³. Inicia sesiÃ³n nuevamente.'
  : err.message || 'No se pudo generar el reporte.')

const validarFechas = () => {
  if (!tipoActual.value.conRango) return ''
  if (ventas.value && (!fechaInicio.value || !fechaFin.value)) {
    return 'Debe proporcionar ambas fechas.'
  }
  if (fechaInicio.value && fechaFin.value && fechaInicio.value > fechaFin.value) {
    return 'La fecha inicial no puede ser posterior a la fecha final.'
  }
  return ''
}

const generar = async () => {
  error.value = validarFechas()
  aviso.value = ''
  if (error.value) return

  loading.value = true
  try {
    reporte.value = await obtenerReporte(tipo.value, filtros())
  } catch (err) {
    reporte.value = null
    error.value = mensajeError(err)
  } finally {
    loading.value = false
  }
}

const elegirTipo = (clave) => {
  tipo.value = clave
  reporte.value = null
  generar()
}

const guardarArchivo = (blob, nombre) => {
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}

const exportar = async (formato) => {
  error.value = validarFechas()
  aviso.value = ''
  if (error.value) return

  exportando.value = formato
  try {
    const blob = await descargarReporte(tipo.value, formato, filtros())
    const sufijo = tipoActual.value.conRango && fechaInicio.value && fechaFin.value
      ? `${fechaInicio.value}_a_${fechaFin.value}`
      : aISO(new Date())
    guardarArchivo(blob, `reporte-${tipo.value}-${sufijo}.${formato === 'pdf' ? 'pdf' : 'xlsx'}`)
    aviso.value = `Reporte exportado en ${formato === 'pdf' ? 'PDF' : 'Excel'}.`
  } catch (err) {
    error.value = mensajeError(err)
  } finally {
    exportando.value = ''
  }
}

const numero = (valor, decimales) => Number(valor).toLocaleString('es-BO', {
  minimumFractionDigits: decimales,
  maximumFractionDigits: decimales
})

const celda = (columna, valor) => {
  if (valor === null || valor === undefined || valor === '') return 'â€”'
  if (columna.tipo === 'moneda' || columna.tipo === 'decimal') return numero(valor, 2)
  if (columna.tipo === 'entero') return numero(valor, 0)
  if (columna.tipo === 'fecha') return formatearFecha(valor)
  if (columna.tipo === 'fechahora') return formatearFecha(valor, true)
  return valor
}

const esNumerica = (columna) => ['moneda', 'decimal', 'entero'].includes(columna.tipo)
const tituloTotal = (clave) => reporte.value.columnas.find((c) => c.clave === clave)

onMounted(generar)
</script>

<template>
  <section class="admin-panel">
    <div class="panel-heading">
      <div>
        <span class="eyebrow">Reportes e historial</span>
        <h2>Reportes</h2>
        <p>Consulta y exporta ventas, inventario y estado de los lotes.</p>
      </div>
      <div class="panel-heading-actions">
        <button
          type="button"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-5 py-2.5 text-sm font-bold text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-55"
          :disabled="loading || exportando !== ''"
          @click="exportar('excel')"
        >
          <span v-if="exportando === 'excel'" class="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent" role="status" aria-label="Exportando Excel"></span>
          <i v-else class="fas fa-file-excel" aria-hidden="true"></i>
          Exportar Excel
        </button>
        <button
          type="button"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#2a468b] to-[#3d6ac1] px-5 py-2.5 text-sm font-bold text-[#fff7e3] shadow-md transition hover:from-[#1e356d] hover:to-[#2a468b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-55"
          :disabled="loading || exportando !== ''"
          @click="exportar('pdf')"
        >
          <span v-if="exportando === 'pdf'" class="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent" role="status" aria-label="Exportando PDF"></span>
          <i v-else class="fas fa-file-pdf" aria-hidden="true"></i>
          Exportar PDF
        </button>
      </div>
    </div>

    <div v-if="error" class="notice notice-error" role="alert">
      <span class="flex items-start gap-2"><i class="fas fa-circle-exclamation mt-0.5 shrink-0" aria-hidden="true"></i>{{ error }}</span>
    </div>
    <div v-if="aviso" class="notice notice-success" role="status">
      <span class="flex items-start gap-2"><i class="fas fa-circle-check mt-0.5 shrink-0" aria-hidden="true"></i>{{ aviso }}</span>
    </div>

    <div class="panel mb-4 p-4 sm:p-5">
      <div class="grid grid-cols-1 items-end gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
        <select
          class="form-select panel-control"
          :value="tipo"
          aria-label="Tipo de reporte"
          @change="elegirTipo($event.target.value)"
        >
          <option v-for="t in TIPOS" :key="t.clave" :value="t.clave">{{ t.nombre }}</option>
        </select>

        <template v-if="tipoActual.conRango">
          <label class="flex min-w-0 flex-col gap-1.5 text-sm font-semibold text-[var(--text-muted)]">
            Desde
            <input v-model="fechaInicio" type="date" class="form-input panel-control" />
          </label>
          <label class="flex min-w-0 flex-col gap-1.5 text-sm font-semibold text-[var(--text-muted)]">
            Hasta
            <input v-model="fechaFin" type="date" class="form-input panel-control" />
          </label>
        </template>
        <span v-else class="text-sm text-[var(--text-muted)]">Existencias vigentes al día de hoy.</span>

        <button
          type="button"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#2a468b] to-[#3d6ac1] px-5 py-2.5 text-sm font-bold text-[#fff7e3] shadow-md transition hover:from-[#1e356d] hover:to-[#2a468b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-55"
          :disabled="loading"
          @click="generar"
        >
          <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
          Generar
        </button>
      </div>
      <small v-if="tipo !== 'ventas' && tipoActual.conRango" class="mt-3 block text-xs text-[var(--text-muted)]">
        Fechas opcionales: sin ellas se usa el margen de alerta o todos los vencidos.
      </small>
    </div>

    <div v-if="loading" class="panel-state" role="status">
      <span class="mr-2 inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent align-[-0.2em]" aria-hidden="true"></span>
      Generando reporte...
    </div>

    <template v-else-if="reporte">
      <div class="stats-grid">
        <div class="stat-card">
          <p>Registros</p>
          <strong>{{ reporte.total_filas }}</strong>
          <small>{{ reporte.titulo }}</small>
        </div>
        <div v-for="(valor, clave) in reporte.totales" :key="clave" class="stat-card">
          <p>{{ tituloTotal(clave).titulo }}</p>
          <strong>{{ celda(tituloTotal(clave), valor) }}</strong>
          <small>Total del reporte</small>
        </div>
      </div>

      <ReportCharts v-if="reporte.filas.length > 0" :tipo="reporte.tipo" :filas="reporte.filas" :totales="reporte.totales" />

      <div v-if="reporte.filas.length === 0" class="panel panel-state">
        Sin registros para los filtros seleccionados.
      </div>

      <div v-else class="panel overflow-hidden">
        <div class="overflow-x-auto">
        <table class="panel-table min-w-[40rem]">
          <thead>
            <tr>
              <th
                v-for="c in reporte.columnas"
                :key="c.clave"
                :class="{ 'text-right': esNumerica(c) }"
              >
                {{ c.titulo }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(fila, i) in reporte.filas" :key="i">
              <td
                v-for="c in reporte.columnas"
                :key="c.clave"
                :class="{ 'text-right': esNumerica(c) }"
              >
                {{ celda(c, fila[c.clave]) }}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th
                v-for="(c, i) in reporte.columnas"
                :key="c.clave"
                :class="{ 'text-right': esNumerica(c) }"
              >
                <template v-if="i === 0">TOTAL</template>
                <template v-else-if="reporte.totales[c.clave] !== undefined">
                  {{ celda(c, reporte.totales[c.clave]) }}
                </template>
              </th>
            </tr>
          </tfoot>
        </table>
        </div>
      </div>
    </template>
  </section>
</template>
