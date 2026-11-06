<script setup>
import { computed, onMounted, ref } from 'vue'
import { listarHistorial, listarUsuariosHistorial } from '../../data/endpoints/reports'
import { formatearPrecio } from '../../business/format'

const TIPOS = [
  { valor: '', nombre: 'Todas las operaciones' },
  { valor: 'VENTA', nombre: 'Ventas' },
  { valor: 'RECEPCION', nombre: 'Recepciones de lote' },
  { valor: 'BAJA', nombre: 'Bajas de lote' }
]
const CLASES = {
  VENTA: 'badge-soft-primary',
  RECEPCION: 'badge-soft-lavender',
  BAJA: 'badge-soft-danger'
}

const filtros = ref({ fechaInicio: '', fechaFin: '', tipo: '', idUsuario: '' })
const pagina = ref(1)
const historial = ref(null)
const usuarios = ref([])
const loading = ref(false)
const error = ref('')

// NUEVA FUNCIÓN: Formato compacto para evitar que la tabla se desfase
const formatearFechaCompacta = (fechaISO) => {
  if (!fechaISO) return '—'
  const d = new Date(fechaISO)
  if (isNaN(d.getTime())) return fechaISO
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const mensajeError = (err) => (err.status === 401
  ? 'Tu sesión expiró. Inicia sesión nuevamente.'
  : err.message || 'No se pudo consultar el historial.')

const cargar = async () => {
  const { fechaInicio, fechaFin } = filtros.value
  if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
    error.value = 'La fecha inicial no puede ser posterior a la fecha final.'
    return
  }

  error.value = ''
  loading.value = true
  try {
    historial.value = await listarHistorial({ ...filtros.value, pagina: pagina.value, limite: 20 })
  } catch (err) {
    error.value = mensajeError(err)
  } finally {
    loading.value = false
  }
}

const buscar = () => {
  pagina.value = 1
  cargar()
}

const limpiar = () => {
  filtros.value = { fechaInicio: '', fechaFin: '', tipo: '', idUsuario: '' }
  buscar()
}

const irAPagina = (n) => {
  pagina.value = n
  cargar()
}

const hayAnterior = computed(() => pagina.value > 1)
const haySiguiente = computed(() => historial.value && pagina.value < historial.value.total_paginas)

onMounted(async () => {
  try {
    usuarios.value = await listarUsuariosHistorial()
  } catch {
    usuarios.value = []
  }
  cargar()
})
</script>

<template>
  <section class="admin-panel">
    <div class="panel-heading">
      <div>
        <span class="eyebrow">Reportes e historial</span>
        <h2>Historial de operaciones</h2>
        <p>Registro de ventas, recepciones y bajas de lotes. Es de solo lectura.</p>
      </div>
    </div>

    <div v-if="error" class="notice notice-error" role="alert">
      <span class="flex items-start gap-2"><i class="fas fa-circle-exclamation mt-0.5 shrink-0" aria-hidden="true"></i>{{ error }}</span>
    </div>

    <!-- FILTROS -->
    <div class="panel mb-6 p-4 sm:p-5 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)]">
      <div class="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto_auto]">
        <label class="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          Desde
          <input v-model="filtros.fechaInicio" type="date" class="form-input panel-control w-full h-11 bg-[var(--bg-base)] [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-shadow" />
        </label>
        <label class="flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          Hasta
          <input v-model="filtros.fechaFin" type="date" class="form-input panel-control w-full h-11 bg-[var(--bg-base)] [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-shadow" />
        </label>
        <div class="w-full">
          <label class="mb-1.5 block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Operación</label>
          <select v-model="filtros.tipo" class="form-select panel-control w-full h-11 bg-[var(--bg-base)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-shadow">
            <option v-for="t in TIPOS" :key="t.valor" :value="t.valor">{{ t.nombre }}</option>
          </select>
        </div>
        <div class="w-full">
          <label class="mb-1.5 block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Usuario</label>
          <select v-model="filtros.idUsuario" class="form-select panel-control w-full h-11 bg-[var(--bg-base)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition-shadow">
            <option value="">Todos los usuarios</option>
            <option v-for="u in usuarios" :key="u.id_usuario" :value="u.id_usuario">
              {{ u.usuario }}
            </option>
          </select>
        </div>
        
        <button
          type="button"
          class="inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#2a468b] to-[#3d6ac1] px-6 py-2.5 text-sm font-bold text-[#fff7e3] shadow-md transition hover:from-[#1e356d] hover:to-[#2a468b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-55"
          :disabled="loading"
          @click="buscar"
        >
          <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
          Buscar
        </button>
        <button
          type="button"
          class="inline-flex w-full min-h-11 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-6 py-2.5 text-sm font-bold text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-55"
          :disabled="loading"
          @click="limpiar"
        >
          Limpiar
        </button>
      </div>
    </div>

    <div v-if="loading && !historial" class="panel-state py-12">
      <span class="mr-2 inline-block size-5 animate-spin rounded-full border-2 border-current border-r-transparent align-[-0.2em]" aria-hidden="true"></span>
      Consultando historial...
    </div>

    <template v-if="historial">
      <!-- TARJETAS -->
      <div class="stats-grid mb-6">
        <div class="stat-card">
          <p>Operaciones</p>
          <strong>{{ historial.total }}</strong>
          <small>Según los filtros</small>
        </div>
        <div class="stat-card">
          <p>Ventas</p>
          <strong>{{ historial.resumen.VENTA }}</strong>
        </div>
        <div class="stat-card">
          <p>Recepciones</p>
          <strong>{{ historial.resumen.RECEPCION }}</strong>
        </div>
        <div class="stat-card is-danger">
          <p>Bajas</p>
          <strong>{{ historial.resumen.BAJA }}</strong>
        </div>
      </div>

      <div v-if="historial.registros.length === 0" class="panel panel-state py-10">
        <i class="fas fa-folder-open text-4xl mb-3 opacity-20"></i>
        <p>No hay operaciones para los filtros seleccionados.</p>
      </div>

      <!-- TABLA CORREGIDA -->
      <div v-else class="panel mx-auto w-full max-w-full overflow-hidden bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)]">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead class="bg-[var(--bg-base)] border-b border-[var(--border-color)]">
              <tr>
                <th class="px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Fecha y hora</th>
                <th class="px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Operación</th>
                <th class="px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Detalle</th>
                <th class="px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Usuario</th>
                <th class="px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">Monto</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--border-color)]">
              <tr v-for="r in historial.registros" :key="r.id_historial" class="hover:bg-[var(--accent-soft)] transition-colors">
                
                <!-- Fecha compacta para evitar desfase vertical -->
                <td class="px-4 py-3 text-[var(--text-main)] whitespace-nowrap">
                  {{ formatearFechaCompacta(r.fecha_hora) }}
                </td>
                
                <td class="px-4 py-3">
                  <span class="badge-soft" :class="CLASES[r.tipo_operacion]">
                    {{ r.etiqueta_operacion }}
                  </span>
                </td>
                
                <!-- Detalle con ancho limitado -->
                <td class="px-4 py-3 text-[var(--text-main)] min-w-[200px] max-w-[300px]">
                  {{ r.descripcion }}
                </td>
                
                <!-- Usuario y rol en la misma línea si se puede -->
                <td class="px-4 py-3 text-[var(--text-main)] min-w-[150px]">
                  {{ r.usuario }} <small class="text-[var(--text-muted)] whitespace-nowrap">({{ r.rol }})</small>
                </td>
                
                <!-- Monto alineado a la derecha y sin saltos -->
                <td class="px-4 py-3 text-right font-medium tabular-nums whitespace-nowrap text-[var(--text-main)]">
                  {{ r.monto !== null ? formatearPrecio(r.monto) : '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- PAGINACIÓN -->
        <div class="panel-footer flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center p-4 bg-[var(--bg-base)] border-t border-[var(--border-color)]">
          <span class="text-sm text-[var(--text-muted)] font-medium">Página {{ historial.pagina }} de {{ historial.total_paginas }}</span>
          <div class="flex w-full gap-2 sm:w-auto">
            <button
              type="button"
              class="inline-flex min-h-10 flex-1 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 text-sm font-bold text-[var(--text-muted)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-55 sm:flex-none"
              :disabled="!hayAnterior || loading"
              @click="irAPagina(pagina - 1)"
            >
              Anterior
            </button>
            <button
              type="button"
              class="inline-flex min-h-10 flex-1 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 text-sm font-bold text-[var(--text-muted)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-55 sm:flex-none"
              :disabled="!haySiguiente || loading"
              @click="irAPagina(pagina + 1)"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>