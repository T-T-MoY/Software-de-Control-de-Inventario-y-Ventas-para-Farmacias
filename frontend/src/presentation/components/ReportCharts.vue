<script setup>
import { computed } from 'vue'
import VueApexCharts from 'vue3-apexcharts'

const props = defineProps({
  tipo: { type: String, required: true },
  filas: { type: Array, default: () => [] },
  totales: { type: Object, default: () => ({}) }
})

const dinero = (valor) => Number(valor || 0).toLocaleString('es-BO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

const porcentaje = (valor, total) => total > 0
  ? Math.round((valor / total) * 100)
  : 0

const colores = {
  azul: '#4263eb',
  celeste: '#38bdf8',
  violeta: '#8b5cf6',
  verde: '#10b981',
  naranja: '#f59e0b',
  rojo: '#ef4444',
  gris: '#94a3b8'
}

const opcionesBase = {
  chart: {
    toolbar: { show: false },
    fontFamily: 'inherit',
    animations: {
      enabled: true,
      easing: 'easeinout',
      speed: 900,
      animateGradually: { enabled: true, delay: 120 }
    }
  },
  dataLabels: { enabled: false },
  grid: {
    borderColor: '#e9edf5',
    strokeDashArray: 4,
    padding: { left: 8, right: 12 }
  },
  tooltip: {
    theme: 'light',
    style: { fontSize: '13px' }
  },
  legend: {
    fontSize: '13px',
    markers: { radius: 12 }
  }
}

const ventasPorDia = computed(() => {
  const grupos = {}

  props.filas.forEach((fila) => {
    const fecha = String(fila.fecha_hora_venta || '').slice(0, 10)
    if (!fecha) return
    grupos[fecha] = (grupos[fecha] || 0) + Number(fila.total || 0)
  })

  return Object.entries(grupos)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
})

const ventasSeries = computed(() => [{
  name: 'Ingresos',
  data: ventasPorDia.value.map(([, total]) => Number(total.toFixed(2)))
}])

const ventasOpciones = computed(() => ({
  ...opcionesBase,
  chart: { ...opcionesBase.chart, type: 'area' },
  colors: [colores.azul],
  stroke: { curve: 'smooth', width: 4 },
  fill: {
    type: 'gradient',
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.35,
      opacityTo: 0.03,
      stops: [0, 90, 100]
    }
  },
  markers: {
    size: 5,
    strokeWidth: 3,
    hover: { size: 8 }
  },
  xaxis: {
    categories: ventasPorDia.value.map(([fecha]) => fecha.slice(5)),
    labels: { style: { colors: '#64748b' } },
    axisBorder: { show: false },
    axisTicks: { show: false }
  },
  yaxis: {
    labels: {
      style: { colors: '#64748b' },
      formatter: (value) => `Bs ${Number(value).toFixed(0)}`
    }
  },
  tooltip: {
    ...opcionesBase.tooltip,
    y: { formatter: (value) => `Bs ${dinero(value)}` }
  }
}))

const productosStock = computed(() =>
  [...props.filas]
    .sort((a, b) => Number(b.stock_actual) - Number(a.stock_actual))
    .slice(0, 7)
)

const stockSeries = computed(() => [{
  name: 'Unidades',
  data: productosStock.value.map((item) => Number(item.stock_actual || 0))
}])

const stockOpciones = computed(() => ({
  ...opcionesBase,
  chart: { ...opcionesBase.chart, type: 'bar' },
  colors: [colores.celeste],
  plotOptions: {
    bar: {
      horizontal: true,
      borderRadius: 6,
      barHeight: '58%',
      distributed: true
    }
  },
  xaxis: {
    categories: productosStock.value.map((item) => item.nombre_comercial),
    labels: { style: { colors: '#64748b' } }
  },
  yaxis: {
    labels: {
      style: { colors: '#475569', fontSize: '12px' },
      maxWidth: 150
    }
  },
  legend: { show: false },
  tooltip: {
    ...opcionesBase.tooltip,
    y: { formatter: (value) => `${value} unidades` }
  }
}))

const topValor = computed(() =>
  [...props.filas]
    .sort((a, b) => Number(b.valor_stock_venta) - Number(a.valor_stock_venta))
    .slice(0, 5)
)

const valorSeries = computed(() => [{
  name: 'Valor de venta',
  data: topValor.value.map((item) => Number(item.valor_stock_venta || 0))
}])

const valorOpciones = computed(() => ({
  ...opcionesBase,
  chart: { ...opcionesBase.chart, type: 'bar' },
  colors: [colores.violeta],
  plotOptions: {
    bar: {
      horizontal: true,
      borderRadius: 6,
      barHeight: '55%',
      distributed: true
    }
  },
  xaxis: {
    categories: topValor.value.map((item) => item.nombre_comercial),
    labels: {
      style: { colors: '#64748b' },
      formatter: (value) => `Bs ${Number(value).toFixed(0)}`
    }
  },
  yaxis: {
    labels: {
      style: { colors: '#475569', fontSize: '12px' },
      maxWidth: 150
    }
  },
  legend: { show: false },
  tooltip: {
    ...opcionesBase.tooltip,
    y: { formatter: (value) => `Bs ${dinero(value)}` }
  }
}))

const lotesPorUrgencia = computed(() => {
  const grupos = [
    { etiqueta: 'Críticos (0-7 días)', cantidad: 0 },
    { etiqueta: 'Próximos (8-15 días)', cantidad: 0 },
    { etiqueta: 'En observación (16+ días)', cantidad: 0 }
  ]

  props.filas.forEach((fila) => {
    const dias = Number(fila.dias_para_vencer)
    if (dias <= 7) grupos[0].cantidad += 1
    else if (dias <= 15) grupos[1].cantidad += 1
    else grupos[2].cantidad += 1
  })

  return grupos
})

const urgenciaSeries = computed(() => [{
  name: 'Lotes',
  data: lotesPorUrgencia.value.map((item) => item.cantidad)
}])

const urgenciaOpciones = computed(() => ({
  ...opcionesBase,
  chart: { ...opcionesBase.chart, type: 'bar' },
  colors: [colores.rojo, colores.naranja, colores.verde],
  plotOptions: {
    bar: {
      horizontal: true,
      distributed: true,
      borderRadius: 7,
      barHeight: '48%'
    }
  },
  xaxis: {
    categories: lotesPorUrgencia.value.map((item) => item.etiqueta),
    labels: { style: { colors: '#64748b' } },
    tickAmount: 4
  },
  yaxis: {
    labels: { style: { colors: '#475569', fontSize: '12px' } }
  },
  legend: { show: false },
  tooltip: {
    ...opcionesBase.tooltip,
    y: { formatter: (value) => `${value} lotes` }
  }
}))

const estadosVencidos = computed(() => {
  const pendientes = props.filas.filter(
    (fila) => fila.estado_lote === 'Pendiente de baja'
  ).length

  const dadosBaja = props.filas.filter(
    (fila) => fila.estado_lote === 'Dado de baja'
  ).length

  return [pendientes, dadosBaja]
})

const vencidosSeries = computed(() => estadosVencidos.value)

const vencidosOpciones = {
  chart: {
    type: 'donut',
    fontFamily: 'inherit',
    animations: { enabled: true, speed: 900 }
  },
  labels: ['Pendientes de baja', 'Dados de baja'],
  colors: [colores.rojo, colores.verde],
  stroke: { width: 4, colors: ['#fff'] },
  dataLabels: {
    enabled: true,
    formatter: (value) => `${value.toFixed(1)}%`
  },
  plotOptions: {
    pie: {
      donut: {
        size: '70%',
        labels: {
          show: true,
          total: {
            show: true,
            label: 'Total de lotes',
            formatter: (w) =>
              w.globals.seriesTotals.reduce((a, b) => a + b, 0)
          }
        }
      }
    }
  },
  legend: {
    position: 'bottom',
    fontSize: '13px',
    markers: { radius: 12 }
  },
  tooltip: {
    y: { formatter: (value) => `${value} lotes` }
  },
  responsive: [{
    breakpoint: 600,
    options: { chart: { height: 300 }, legend: { position: 'bottom' } }
  }]
}

const valorInventario = computed(() =>
  props.filas.reduce(
    (suma, fila) => suma + Number(fila.valor_stock_venta || 0), 0
  )
)

const valorCosto = computed(() =>
  props.filas.reduce(
    (suma, fila) => suma + Number(fila.valor_stock_costo || 0), 0
  )
)

const totalUnidades = computed(() =>
  props.filas.reduce(
    (suma, fila) => suma + Number(fila.stock_actual || 0), 0
  )
)

const totalVentas = computed(() => Number(props.totales.total || 0))
const totalDescuentos = computed(() => Number(props.totales.descuento_monto || 0))
</script>

<template>
  <section class="report-charts">
    <div class="charts-heading">
      <div>
        <span class="charts-eyebrow">ANÁLISIS VISUAL</span>
        <h3>Resumen estadístico</h3>
        <p>Indicadores calculados a partir de los registros del reporte.</p>
      </div>
      <span class="charts-live"><span></span> Datos actualizados</span>
    </div>

    <template v-if="tipo === 'ventas'">
      <div class="chart-kpis">
        <article class="chart-kpi chart-kpi-primary">
          <div class="kpi-icon"><i class="bi bi-wallet2"></i></div>
          <span>Ingresos registrados</span>
          <strong>Bs {{ dinero(totalVentas) }}</strong>
          <small>Total de ventas del período</small>
        </article>
        <article class="chart-kpi">
          <div class="kpi-icon"><i class="bi bi-receipt"></i></div>
          <span>Operaciones de venta</span>
          <strong>{{ filas.length }}</strong>
          <small>Transacciones registradas</small>
        </article>
        <article class="chart-kpi">
          <div class="kpi-icon"><i class="bi bi-tag"></i></div>
          <span>Descuentos aplicados</span>
          <strong>Bs {{ dinero(totalDescuentos) }}</strong>
          <small>Importe descontado</small>
        </article>
      </div>

      <article class="chart-card">
        <div class="chart-card-heading">
          <div>
            <h4>Evolución de ingresos</h4>
            <p>Ingresos agrupados por fecha de venta</p>
          </div>
          <span class="chart-period">Últimos 7 días con ventas</span>
        </div>
        <VueApexCharts
          v-if="ventasPorDia.length"
          type="area"
          height="340"
          :options="ventasOpciones"
          :series="ventasSeries"
        />
        <div v-else class="chart-empty">No hay datos suficientes para mostrar la evolución.</div>
      </article>
    </template>

    <template v-else-if="tipo === 'inventario'">
      <div class="chart-kpis">
        <article class="chart-kpi chart-kpi-primary">
          <div class="kpi-icon"><i class="bi bi-box-seam"></i></div>
          <span>Unidades disponibles</span>
          <strong>{{ totalUnidades.toLocaleString('es-BO') }}</strong>
          <small>Existencias vigentes</small>
        </article>
        <article class="chart-kpi">
          <div class="kpi-icon"><i class="bi bi-cash-stack"></i></div>
          <span>Valor a costo</span>
          <strong>Bs {{ dinero(valorCosto) }}</strong>
          <small>Inversión en existencias</small>
        </article>
        <article class="chart-kpi">
          <div class="kpi-icon"><i class="bi bi-graph-up-arrow"></i></div>
          <span>Valor potencial de venta</span>
          <strong>Bs {{ dinero(valorInventario) }}</strong>
          <small>Valorización del inventario</small>
        </article>
      </div>

      <div class="charts-two-columns">
        <article class="chart-card">
          <div class="chart-card-heading">
            <div>
              <h4>Mayor disponibilidad</h4>
              <p>Medicamentos con más unidades en stock</p>
            </div>
          </div>
          <VueApexCharts
            v-if="productosStock.length"
            type="bar"
            height="330"
            :options="stockOpciones"
            :series="stockSeries"
          />
          <div v-else class="chart-empty">Sin existencias para comparar.</div>
        </article>

        <article class="chart-card">
          <div class="chart-card-heading">
            <div>
              <h4>Valor por medicamento</h4>
              <p>Top 5 según valor de venta del stock</p>
            </div>
          </div>
          <VueApexCharts
            v-if="topValor.length"
            type="bar"
            height="330"
            :options="valorOpciones"
            :series="valorSeries"
          />
          <div v-else class="chart-empty">Sin valores para comparar.</div>
        </article>
      </div>
    </template>

    <template v-else-if="tipo === 'lotes-por-vencer'">
      <div class="chart-kpis">
        <article class="chart-kpi chart-kpi-warning">
          <div class="kpi-icon"><i class="bi bi-hourglass-split"></i></div>
          <span>Lotes por vencer</span>
          <strong>{{ filas.length }}</strong>
          <small>Requieren seguimiento</small>
        </article>
        <article class="chart-kpi">
          <div class="kpi-icon"><i class="bi bi-box-seam"></i></div>
          <span>Unidades comprometidas</span>
          <strong>{{ Number(totales.cantidad_stock || 0).toLocaleString('es-BO') }}</strong>
          <small>Existencias en esos lotes</small>
        </article>
        <article class="chart-kpi">
          <div class="kpi-icon"><i class="bi bi-cash-stack"></i></div>
          <span>Valor a costo</span>
          <strong>Bs {{ dinero(totales.valor_costo) }}</strong>
          <small>Valor de los lotes</small>
        </article>
      </div>

      <article class="chart-card">
        <div class="chart-card-heading">
          <div>
            <h4>Nivel de urgencia</h4>
            <p>Clasificación según los días restantes para vencer</p>
          </div>
        </div>
        <VueApexCharts
          type="bar"
          height="280"
          :options="urgenciaOpciones"
          :series="urgenciaSeries"
        />
      </article>
    </template>

    <template v-else>
      <div class="chart-kpis">
        <article class="chart-kpi chart-kpi-danger">
          <div class="kpi-icon"><i class="bi bi-exclamation-triangle"></i></div>
          <span>Lotes vencidos</span>
          <strong>{{ filas.length }}</strong>
          <small>Requieren control sanitario</small>
        </article>
        <article class="chart-kpi">
          <div class="kpi-icon"><i class="bi bi-box-seam"></i></div>
          <span>Existencias relacionadas</span>
          <strong>{{ Number(totales.cantidad_stock || 0).toLocaleString('es-BO') }}</strong>
          <small>Unidades en los lotes</small>
        </article>
        <article class="chart-kpi">
          <div class="kpi-icon"><i class="bi bi-cash-stack"></i></div>
          <span>Valor comprometido</span>
          <strong>Bs {{ dinero(totales.valor_costo) }}</strong>
          <small>Valor a costo</small>
        </article>
      </div>

      <article class="chart-card">
        <div class="chart-card-heading">
          <div>
            <h4>Estado de lotes vencidos</h4>
            <p>Comparación entre pendientes y bajas registradas</p>
          </div>
        </div>
        <VueApexCharts
          type="donut"
          height="350"
          :options="vencidosOpciones"
          :series="vencidosSeries"
        />
      </article>
    </template>
  </section>
</template>
