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

    <div v-if="error" class="notice notice-error" role="alert">{{ error }}</div>

    <div class="panel panel-toolbar">
      <div class="panel-filters">
        <label class="d-flex align-items-center gap-2">
          Desde
          <input v-model="filtros.fechaInicio" type="date" class="form-control panel-control" />
        </label>
        <label class="d-flex align-items-center gap-2">
          Hasta
          <input v-model="filtros.fechaFin" type="date" class="form-control panel-control" />
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
        <button type="button" class="btn-panel btn-panel-primary" :disabled="loading" @click="buscar">
          <i class="fas fa-magnifying-glass"></i>
          Buscar
        </button>
        <button type="button" class="btn-panel btn-panel-ghost" :disabled="loading" @click="limpiar">
          Limpiar
        </button>
      </div>
    </div>

    <div v-if="loading && !historial" class="panel panel-state">
      <span class="spinner-border spinner-border-sm me-2"></span>
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

      <div v-else class="panel panel-table-wrap">
        <table class="table panel-table">
          <thead>
            <tr>
              <th>Fecha y hora</th>
              <th>Operación</th>
              <th>Detalle</th>
              <th>Usuario</th>
              <th class="text-end">Monto</th>
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
              <td>{{ r.usuario }} <small class="text-muted">({{ r.rol }})</small></td>
              <td class="text-end">{{ r.monto !== null ? formatearPrecio(r.monto) : '—' }}</td>
            </tr>
          </tbody>
        </table>

        <div class="panel-footer d-flex justify-content-between align-items-center">
          <span class="panel-count">Página {{ historial.pagina }} de {{ historial.total_paginas }}</span>
          <div class="d-flex gap-2">
            <button
              type="button"
              class="btn-panel btn-panel-ghost"
              :disabled="!hayAnterior || loading"
              @click="irAPagina(pagina - 1)"
            >
              Anterior
            </button>
            <button
              type="button"
              class="btn-panel btn-panel-ghost"
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
