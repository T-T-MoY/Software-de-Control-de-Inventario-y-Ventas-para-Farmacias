<script setup>
import { computed, onMounted, ref } from 'vue'
import { listarHistorial, listarUsuariosHistorial } from '../../data/endpoints/reports'
import { formatearFecha, formatearPrecio } from '../../business/format'

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

    <div class="panel mb-4 p-4 sm:p-5">
      <div class="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto_auto]">
        <label class="flex min-w-0 flex-col gap-1.5 text-sm font-semibold text-[var(--text-muted)]">
          Desde
          <input v-model="filtros.fechaInicio" type="date" class="form-input panel-control" />
        </label>
        <label class="flex min-w-0 flex-col gap-1.5 text-sm font-semibold text-[var(--text-muted)]">
          Hasta
          <input v-model="filtros.fechaFin" type="date" class="form-input panel-control" />
        </label>
        <select v-model="filtros.tipo" class="form-select panel-control" aria-label="Tipo de operación">
          <option v-for="t in TIPOS" :key="t.valor" :value="t.valor">{{ t.nombre }}</option>
        </select>
        <select v-model="filtros.idUsuario" class="form-select panel-control" aria-label="Usuario">
          <option value="">Todos los usuarios</option>
          <option v-for="u in usuarios" :key="u.id_usuario" :value="u.id_usuario">
            {{ u.usuario }}
          </option>
        </select>
        <button
          type="button"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#2a468b] to-[#3d6ac1] px-5 py-2.5 text-sm font-bold text-[#fff7e3] shadow-md transition hover:from-[#1e356d] hover:to-[#2a468b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-55"
          :disabled="loading"
          @click="buscar"
        >
          <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
          Buscar
        </button>
        <button
          type="button"
          class="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-5 py-2.5 text-sm font-bold text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-55"
          :disabled="loading"
          @click="limpiar"
        >
          Limpiar
        </button>
      </div>
    </div>

    <div v-if="loading && !historial" class="panel-state" role="status">
      <span class="mr-2 inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent align-[-0.2em]" aria-hidden="true"></span>
      Consultando historial...
    </div>

    <template v-if="historial">
      <div class="stats-grid">
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

      <div v-if="historial.registros.length === 0" class="panel panel-state">
        No hay operaciones para los filtros seleccionados.
      </div>

      <div v-else class="panel overflow-hidden">
        <div class="overflow-x-auto">
        <table class="panel-table min-w-[58rem]">
          <thead>
            <tr>
              <th>Fecha y hora</th>
              <th>Operación</th>
              <th>Detalle</th>
              <th>Usuario</th>
              <th class="text-right">Monto</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in historial.registros" :key="r.id_historial">
              <td>{{ formatearFecha(r.fecha_hora, true) }}</td>
              <td>
                <span class="badge-soft" :class="CLASES[r.tipo_operacion]">
                  {{ r.etiqueta_operacion }}
                </span>
              </td>
              <td>{{ r.descripcion }}</td>
              <td>{{ r.usuario }} <small class="text-[var(--text-muted)]">({{ r.rol }})</small></td>
              <td class="text-right">{{ r.monto !== null ? formatearPrecio(r.monto) : '—' }}</td>
            </tr>
          </tbody>
        </table>
        </div>

        <div class="panel-footer flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <span class="panel-count">Página {{ historial.pagina }} de {{ historial.total_paginas }}</span>
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
