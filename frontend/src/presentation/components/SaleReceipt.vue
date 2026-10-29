<script setup>
/**
 * Comprobante de venta de 80 mm.
 *
 * Componente de presentación reutilizable: no llama a la API ni calcula
 * reglas de negocio. Recibe la venta ya armada por el módulo de ventas.
 *
 * Uso:
 *   <SaleReceipt :farmacia="farmacia" :venta="venta" />
 *
 * Estructura mínima de `venta`:
 *   {
 *     numero, fecha, cliente, usuario, tipoComprobante, numSerie,
 *     items: [{ cantidad, descripcion, precioUnitario, subtotal }],
 *     subtotal, descuento, total, montoRecibido, cambio
 *   }
 */
import { computed } from 'vue'

const props = defineProps({
  farmacia: {
    type: Object,
    default: () => ({})
  },
  venta: {
    type: Object,
    required: true
  },
  mostrarAcciones: {
    type: Boolean,
    default: true
  }
})

const items = computed(() => props.venta.items || props.venta.detalles || [])

const subtotal = computed(() => {
  if (props.venta.subtotal !== undefined) return Number(props.venta.subtotal)
  return items.value.reduce((total, item) => {
    const linea = item.subtotal !== undefined
      ? Number(item.subtotal)
      : Number(item.cantidad || 0) * Number(item.precioUnitario || item.precio_venta || 0)
    return total + linea
  }, 0)
})

const descuento = computed(() => Number(props.venta.descuento || 0))

const total = computed(() => {
  if (props.venta.total !== undefined) return Number(props.venta.total)
  return Math.max(subtotal.value - descuento.value, 0)
})

const montoRecibido = computed(() => Number(props.venta.montoRecibido || 0))

const cambio = computed(() => {
  if (props.venta.cambio !== undefined) return Number(props.venta.cambio)
  return Math.max(montoRecibido.value - total.value, 0)
})

const fecha = computed(() => {
  const valor = props.venta.fecha
  if (!valor) return new Date().toLocaleString('es-BO')
  const texto = String(valor)
  const fechaVenta = new Date(/^\d{4}-\d{2}-\d{2}$/.test(texto) ? `${texto}T00:00:00` : texto)
  return Number.isNaN(fechaVenta.getTime())
    ? texto
    : fechaVenta.toLocaleString('es-BO')
})

const moneda = (valor) => `Bs ${Number(valor || 0).toFixed(2)}`

const imprimir = () => {
  const limpiar = () => document.body.classList.remove('printing-receipt')
  document.body.classList.add('printing-receipt')
  window.addEventListener('afterprint', limpiar, { once: true })
  window.print()
}
</script>

<template>
  <article class="sale-receipt" aria-label="Comprobante de venta">
    <header class="receipt-header">
      <h2 class="receipt-title">{{ farmacia.nombre || 'FARMACIA' }}</h2>
      <p v-if="farmacia.nit" class="receipt-line">NIT: {{ farmacia.nit }}</p>
      <p v-if="farmacia.direccion" class="receipt-line">{{ farmacia.direccion }}</p>
      <p v-if="farmacia.telefono" class="receipt-line">Tel.: {{ farmacia.telefono }}</p>
    </header>

    <section class="receipt-meta">
      <p class="receipt-line">
        <span>{{ venta.tipoComprobante || 'Nota de venta' }}</span>
        <span v-if="venta.numSerie">N.º {{ venta.numSerie }}</span>
      </p>
      <p class="receipt-line">
        <span>Fecha:</span>
        <span>{{ fecha }}</span>
      </p>
      <p v-if="venta.cliente" class="receipt-line">
        <span>Cliente:</span>
        <span>{{ venta.cliente }}</span>
      </p>
      <p v-if="venta.usuario" class="receipt-line">
        <span>Atendido por:</span>
        <span>{{ venta.usuario }}</span>
      </p>
    </section>

    <table class="receipt-table">
      <thead>
        <tr>
          <th class="col-cant">Cant.</th>
          <th>Descripción</th>
          <th class="col-importe">Importe</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, indice) in items" :key="item.id || indice">
          <td class="col-cant">{{ item.cantidad }}</td>
          <td>
            <span class="item-name">{{ item.descripcion || item.nombre }}</span>
            <span v-if="item.precioUnitario || item.precio_venta" class="item-price">
              {{ moneda(item.precioUnitario || item.precio_venta) }} c/u
            </span>
          </td>
          <td class="col-importe">
            {{ moneda(item.subtotal ?? (Number(item.cantidad || 0) * Number(item.precioUnitario || item.precio_venta || 0))) }}
          </td>
        </tr>
        <tr v-if="!items.length">
          <td colspan="3" class="receipt-empty">Sin productos registrados.</td>
        </tr>
      </tbody>
    </table>

    <section class="receipt-totals">
      <p class="receipt-line">
        <span>Subtotal</span>
        <span>{{ moneda(subtotal) }}</span>
      </p>
      <p v-if="descuento > 0" class="receipt-line">
        <span>Descuento</span>
        <span>- {{ moneda(descuento) }}</span>
      </p>
      <p class="receipt-line receipt-total">
        <span>TOTAL</span>
        <span>{{ moneda(total) }}</span>
      </p>
      <p v-if="montoRecibido > 0" class="receipt-line">
        <span>Recibido</span>
        <span>{{ moneda(montoRecibido) }}</span>
      </p>
      <p v-if="montoRecibido > 0" class="receipt-line">
        <span>Cambio</span>
        <span>{{ moneda(cambio) }}</span>
      </p>
    </section>

    <footer class="receipt-footer">
      <p>Gracias por su compra.</p>
      <p>Conserve este comprobante.</p>
    </footer>

    <div v-if="mostrarAcciones" class="receipt-actions">
      <button type="button" class="btn btn-primary rounded-pill w-100" @click="imprimir">
        <i class="fas fa-print me-2"></i>Imprimir comprobante
      </button>
    </div>
  </article>
</template>

<style scoped>
.sale-receipt {
  width: 80mm;
  max-width: 100%;
  margin: 0 auto;
  padding: 4mm;
  background: #fff;
  color: #111;
  font-family: 'Courier New', Courier, monospace;
  font-size: 11px;
  line-height: 1.35;
}

.receipt-header,
.receipt-footer {
  text-align: center;
}

.receipt-title {
  margin: 0 0 2mm;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.receipt-meta {
  margin: 3mm 0;
  padding: 2mm 0;
  border-top: 1px dashed #111;
  border-bottom: 1px dashed #111;
}

.receipt-line {
  display: flex;
  justify-content: space-between;
  gap: 2mm;
  margin: 0.6mm 0;
}

.receipt-table {
  width: 100%;
  border-collapse: collapse;
  margin: 2mm 0;
}

.receipt-table th,
.receipt-table td {
  padding: 1mm 0;
  vertical-align: top;
  text-align: left;
}

.receipt-table thead th {
  border-bottom: 1px solid #111;
  font-size: 10px;
  text-transform: uppercase;
}

.col-cant {
  width: 10mm;
  text-align: center;
}

.col-importe {
  width: 20mm;
  text-align: right;
}

.item-name {
  display: block;
}

.item-price {
  display: block;
  font-size: 10px;
}

.receipt-empty {
  padding: 3mm 0;
  text-align: center;
}

.receipt-totals {
  margin-top: 2mm;
  padding-top: 2mm;
  border-top: 1px dashed #111;
}

.receipt-total {
  margin-top: 1.5mm;
  font-size: 14px;
  font-weight: 700;
}

.receipt-footer {
  margin-top: 4mm;
  padding-top: 2mm;
  border-top: 1px dashed #111;
  font-size: 10px;
}

.receipt-footer p {
  margin: 0.5mm 0;
}

.receipt-actions {
  margin-top: 4mm;
}

@media print {
  :global(body.printing-receipt *) {
    visibility: hidden;
  }

  .sale-receipt,
  .sale-receipt * {
    visibility: visible;
  }

  .sale-receipt {
    position: absolute;
    top: 0;
    left: 0;
    width: 80mm;
    margin: 0;
    padding: 0;
    box-shadow: none;
  }

  .receipt-actions {
    display: none;
  }
}
</style>
