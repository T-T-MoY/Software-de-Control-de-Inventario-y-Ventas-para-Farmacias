
<script setup>
import { computed, onMounted, ref } from 'vue'
import { obtenerResumenAlertas } from '../../data/endpoints/alerts'

const loading = ref(true)
const error = ref('')
const datos = ref({
  margen_alerta_dias: 30,
  resumen: {
    total_lotes_por_vencer: 0,
    total_lotes_vencidos: 0,
    total_medicamentos_por_reponer: 0
  },
  lotes_por_vencer: [],
  lotes_vencidos: [],
  medicamentos_por_reponer: []
})

const totalAlertas = computed(() =>
  datos.value.resumen.total_lotes_por_vencer
  + datos.value.resumen.total_lotes_vencidos
  + datos.value.resumen.total_medicamentos_por_reponer
)

const mensajeError = (err) => {
  if (err.status === 401) {
    return 'Tu sesión expiró. Inicia sesión nuevamente.'
  }

  if (err.status === 403) {
    return 'No tienes permiso para consultar las alertas.'
  }

  return err.message || 'No se pudieron cargar las alertas.'
}

const cargarAlertas = async () => {
  loading.value = true
  error.value = ''

  try {
    datos.value = await obtenerResumenAlertas()
  } catch (err) {
    error.value = mensajeError(err)
  } finally {
    loading.value = false
  }
}

const formatearFecha = (valor) => {
  if (!valor) return 'No disponible'

  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(valor))
}

const claseEstado = (estado) => {
  const clases = {
    Vencido: 'alert-status-expired',
    'Por vencer': 'alert-status-warning',
    Reposicion: 'alert-status-warning'
  }

  return clases[estado] || ''
}

const formatearDemanda = (valor) =>
  Number(valor || 0).toFixed(2)

onMounted(cargarAlertas)
</script>

<template>
  <section class="admin-panel">

    <!-- CABECERA -->
    <div class="panel-heading">
      <div>
        <span class="eyebrow">Inventario</span>
        <h2>Alertas de inventario</h2>
        <p>
          Control de vencimientos y necesidades de reposición
          de medicamentos.
        </p>
      </div>

      <div class="panel-heading-actions">
        <button
          type="button"
          class="btn-panel btn-panel-ghost"
          :disabled="loading"
          @click="cargarAlertas"
        >
          <i class="fas fa-rotate"></i>
          Actualizar alertas
        </button>
      </div>
    </div>

    <!-- ERROR -->
    <div
      v-if="error"
      class="notice notice-error"
      role="alert"
    >
      {{ error }}
    </div>

    <!-- CARGANDO -->
    <div v-if="loading" class="panel panel-state">
      <span class="spinner-border spinner-border-sm me-2"></span>
      Consultando alertas...
    </div>

    <template v-else>

      <!-- RESUMEN -->
      <div class="stats-grid">

        <div class="stat-card">
          <p>Lotes próximos a vencer</p>
          <strong>{{ datos.resumen.total_lotes_por_vencer }}</strong>
          <small>Margen: {{ datos.margen_alerta_dias }} días</small>
        </div>

        <div class="stat-card is-danger">
          <p>Lotes vencidos</p>
          <strong>{{ datos.resumen.total_lotes_vencidos }}</strong>
          <small>Pendientes de baja</small>
        </div>

        <div class="stat-card">
          <p>Medicamentos por reponer</p>
          <strong>
            {{ datos.resumen.total_medicamentos_por_reponer }}
          </strong>
          <small>Según el punto de reorden</small>
        </div>

        <div class="stat-card">
          <p>Total de alertas</p>
          <strong>{{ totalAlertas }}</strong>
          <small>Alertas detectadas</small>
        </div>

      </div>

      <!-- LOTES PRÓXIMOS A VENCER -->
      <div class="panel alert-panel">

        <div class="panel-title-bar">
          <div>
            <h3>
              <i class="fas fa-clock me-2"></i>
              Próximos a vencer
            </h3>
            <small>
              Lotes con vencimiento dentro de
              {{ datos.margen_alerta_dias }} días.
            </small>
          </div>

          <span class="alert-count">
            {{ datos.lotes_por_vencer.length }}
          </span>
        </div>

        <div
          v-if="datos.lotes_por_vencer.length === 0"
          class="panel-state"
        >
          No existen lotes próximos a vencer.
        </div>

        <div v-else class="panel-table-wrap">
          <table class="panel-table">

            <thead>
              <tr>
                <th>Medicamento</th>
                <th>Número de lote</th>
                <th>Proveedor</th>
                <th>Vencimiento</th>
                <th>Días restantes</th>
                <th>Existencias</th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="lote in datos.lotes_por_vencer"
                :key="lote.id_lote"
              >
                <td>
                  <strong>{{ lote.medicamento }}</strong>
                </td>

                <td>{{ lote.lote_numero }}</td>

                <td>{{ lote.proveedor }}</td>

                <td>
                  {{ formatearFecha(lote.fecha_vencimiento) }}
                </td>

                <td>
                  <span class="alert-status alert-status-warning">
                    {{ lote.dias_para_vencer }} días
                  </span>
                </td>

                <td>{{ lote.cantidad_stock }}</td>
              </tr>
            </tbody>

          </table>
        </div>

      </div>

      <!-- LOTES VENCIDOS -->
      <div class="panel alert-panel">

        <div class="panel-title-bar">
          <div>
            <h3>
              <i class="fas fa-triangle-exclamation me-2"></i>
              Lotes vencidos
            </h3>
            <small>
              Lotes vencidos que todavía tienen existencias
              pendientes de baja.
            </small>
          </div>

          <span class="alert-count is-danger">
            {{ datos.lotes_vencidos.length }}
          </span>
        </div>

        <div
          v-if="datos.lotes_vencidos.length === 0"
          class="panel-state"
        >
          No existen lotes vencidos pendientes de baja.
        </div>

        <div v-else class="panel-table-wrap">

          <table class="panel-table">

            <thead>
              <tr>
                <th>Medicamento</th>
                <th>Número de lote</th>
                <th>Proveedor</th>
                <th>Vencimiento</th>
                <th>Días vencido</th>
                <th>Existencias</th>
              </tr>
            </thead>

            <tbody>

              <tr
                v-for="lote in datos.lotes_vencidos"
                :key="lote.id_lote"
              >

                <td>
                  <strong>{{ lote.medicamento }}</strong>
                </td>

                <td>{{ lote.lote_numero }}</td>

                <td>{{ lote.proveedor }}</td>

                <td>
                  {{ formatearFecha(lote.fecha_vencimiento) }}
                </td>

                <td>
                  <span class="alert-status alert-status-expired">
                    {{ lote.dias_vencido }} días
                  </span>
                </td>

                <td>{{ lote.cantidad_stock }}</td>

              </tr>

            </tbody>

          </table>

        </div>

      </div>

      <!-- MEDICAMENTOS POR REPONER -->
      <div class="panel alert-panel">

        <div class="panel-title-bar">
          <div>
            <h3>
              <i class="fas fa-boxes-stacked me-2"></i>
              Necesidad de reposición
            </h3>
            <small>
              Medicamentos cuyo stock disponible es menor
              o igual a su punto de reorden.
            </small>
          </div>

          <span class="alert-count">
            {{ datos.medicamentos_por_reponer.length }}
          </span>
        </div>

        <div
          v-if="datos.medicamentos_por_reponer.length === 0"
          class="panel-state"
        >
          No hay medicamentos que requieran reposición.
        </div>

        <div v-else class="panel-table-wrap">

          <table class="panel-table">

            <thead>
              <tr>
                <th>Medicamento</th>
                <th>Stock disponible</th>
                <th>Demanda diaria</th>
                <th>Días de reposición</th>
                <th>Stock de seguridad</th>
                <th>Punto de reorden</th>
                <th>Estado</th>
              </tr>
            </thead>

            <tbody>

              <tr
                v-for="medicamento in datos.medicamentos_por_reponer"
                :key="medicamento.id_medicamento"
              >

                <td>
                  <strong>{{ medicamento.nombre_comercial }}</strong>
                  <small class="d-block text-muted">
                    {{ medicamento.concentracion }}
                  </small>
                </td>

                <td>
                  <strong>{{ medicamento.stock_actual }}</strong>
                </td>

                <td>
                  {{ formatearDemanda(medicamento.demanda_diaria) }}
                  u/día
                </td>

                <td>{{ medicamento.dias_reposicion }}</td>

                <td>{{ medicamento.stock_seguridad }}</td>

                <td>
                  <strong>{{ medicamento.punto_reorden }}</strong>
                </td>

                <td>
                  <span class="alert-status alert-status-warning">
                    Reposición necesaria
                  </span>
                </td>

              </tr>

            </tbody>

          </table>

        </div>

        <p class="alert-note">
          El stock disponible excluye lotes vencidos y lotes
          dados de baja. La demanda se calcula utilizando
          la ventana configurada en el sistema.
        </p>

      </div>

    </template>

  </section>
</template>

<style scoped>
.alert-panel {
  margin-bottom: 1.2rem;
}

.alert-panel .panel-title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.alert-panel .panel-title-bar h3 {
  margin: 0;
}

.alert-panel .panel-title-bar small {
  display: block;
  margin-top: 0.35rem;
  color: var(--text-muted);
}

.alert-count {
  min-width: 34px;
  height: 34px;
  padding: 0 0.6rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50px;
  background: rgba(217, 119, 6, 0.12);
  color: #b45309;
  font-weight: 800;
}

.alert-count.is-danger {
  background: rgba(220, 38, 38, 0.12);
  color: #dc2626;
}

.alert-status {
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.65rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  white-space: nowrap;
}

.alert-status-warning {
  background: rgba(217, 119, 6, 0.12);
  color: #b45309;
}

.alert-status-expired {
  background: rgba(220, 38, 38, 0.12);
  color: #dc2626;
}

.alert-note {
  padding: 0 1rem 1rem;
  margin: 0;
  color: var(--text-muted);
  font-size: 0.8rem;
}

.alert-panel .panel-table {
  min-width: 800px;
}
</style>
