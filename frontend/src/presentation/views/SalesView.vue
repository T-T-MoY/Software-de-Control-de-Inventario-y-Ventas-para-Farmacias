<script setup>
import { computed, onMounted, ref } from 'vue'
import ToastNotification from '../components/ToastNotification.vue'
import SaleReceipt from '../components/SaleReceipt.vue'
import {
  crearVenta,
  listarCatalogoVenta,
  listarClientes
} from '../../data/endpoints/sales'
import { obtenerParametros } from '../../data/endpoints/parameters'

const productos = ref([])
const clientes = ref([])
const farmacia = ref({})
const cargando = ref(true)
const guardando = ref(false)
const error = ref('')
const notificacion = ref('')
const tonoNotificacion = ref('success')
const busqueda = ref('')
const productoId = ref('')
const cantidad = ref(1)
const carrito = ref([])
const clienteId = ref('')
const descuento = ref(0)
const efectivo = ref('')
const tipoComprobante = ref('Nota de venta')
const formatoImpresion = ref('Pantalla')
const receta = ref({ paciente: '', medico: '', matricula: '' })
const ventaCompletada = ref(null)

const requiereReceta = computed(() =>
  carrito.value.some((item) => item.tipo_venta === 'Con receta')
)
const productoSeleccionado = computed(() =>
  productos.value.find((item) => String(item.id_medicamento) === productoId.value)
)
const subtotalCentavos = computed(() => carrito.value.reduce(
  (suma, item) => suma + Math.round(Number(item.precio_unitario) * 100) * item.cantidad,
  0
))
const descuentoCentavos = computed(() => Math.round(
  subtotalCentavos.value * Number(descuento.value || 0) / 100
))
const totalCentavos = computed(() =>
  Math.max(0, subtotalCentavos.value - descuentoCentavos.value)
)
const cambioCentavos = computed(() =>
  Math.max(0, Math.round(Number(efectivo.value || 0) * 100) - totalCentavos.value)
)
const dinero = (centavos) => `Bs ${(Number(centavos) / 100).toFixed(2)}`
const nombreCliente = (cliente) => [
  cliente.nombres,
  cliente.apellido_paterno,
  cliente.apellido_materno
].filter(Boolean).join(' ')

const cargarDatos = async () => {
  cargando.value = true
  error.value = ''
  try {
    const [catalogo, listaClientes, parametros] = await Promise.all([
      listarCatalogoVenta({ buscar: busqueda.value.trim() }),
      listarClientes(),
      obtenerParametros()
    ])
    productos.value = catalogo
    clientes.value = listaClientes
    farmacia.value = parametros.farmacia || {}
    if (productoId.value && !catalogo.some(
      (item) => String(item.id_medicamento) === productoId.value
    )) {
      productoId.value = ''
    }
  } catch (err) {
    error.value = err.message || 'No se pudo cargar el punto de venta.'
  } finally {
    cargando.value = false
  }
}

let temporizadorBusqueda
const buscarProductos = () => {
  clearTimeout(temporizadorBusqueda)
  temporizadorBusqueda = setTimeout(cargarDatos, 250)
}

const agregarProducto = () => {
  const producto = productoSeleccionado.value
  if (!producto || !Number.isInteger(Number(cantidad.value)) || Number(cantidad.value) < 1) {
    notificacion.value = 'Selecciona un medicamento y una cantidad válida.'
    tonoNotificacion.value = 'error'
    return
  }
  const existente = carrito.value.find(
    (item) => item.id_medicamento === producto.id_medicamento
  )
  const nuevaCantidad = Number(cantidad.value) + (existente?.cantidad || 0)
  if (nuevaCantidad > Number(producto.stock_disponible)) {
    notificacion.value = 'La cantidad supera el stock disponible.'
    tonoNotificacion.value = 'error'
    return
  }
  if (existente) {
    existente.cantidad = nuevaCantidad
  } else {
    carrito.value.push({ ...producto, cantidad: Number(cantidad.value) })
  }
  productoId.value = ''
  cantidad.value = 1
}

const actualizarCantidad = (item, valor) => {
  const nuevaCantidad = Number(valor)
  if (!Number.isInteger(nuevaCantidad) || nuevaCantidad < 1) return
  if (nuevaCantidad > Number(item.stock_disponible)) {
    notificacion.value = 'La cantidad supera el stock disponible.'
    tonoNotificacion.value = 'error'
    return
  }
  item.cantidad = nuevaCantidad
}

const confirmarVenta = async () => {
  if (!clienteId.value || carrito.value.length === 0) {
    notificacion.value = 'Selecciona un cliente y agrega productos al carrito.'
    tonoNotificacion.value = 'error'
    return
  }
  if (requiereReceta.value && Object.values(receta.value).some((valor) => !valor.trim())) {
    notificacion.value = 'Completa paciente, médico y matrícula para los medicamentos con receta.'
    tonoNotificacion.value = 'error'
    return
  }
  if (Math.round(Number(efectivo.value || 0) * 100) < totalCentavos.value) {
    notificacion.value = 'El monto recibido no cubre el total de la venta.'
    tonoNotificacion.value = 'error'
    return
  }

  guardando.value = true
  try {
    const respuesta = await crearVenta({
      id_cliente: Number(clienteId.value),
      items: carrito.value.map((item) => ({
        id_medicamento: item.id_medicamento,
        cantidad: item.cantidad
      })),
      descuento_porcentaje: Number(descuento.value || 0),
      monto_recibido: Number(efectivo.value),
      tipo_comprobante: tipoComprobante.value,
      formato_impresion: formatoImpresion.value,
      ...(requiereReceta.value ? { receta: receta.value } : {})
    })
    ventaCompletada.value = respuesta.venta
    farmacia.value = respuesta.farmacia || farmacia.value
    if (respuesta.venta.lotes_por_vencer?.length) {
      notificacion.value = 'Venta registrada. Se dispensó producto de un lote próximo a vencer.'
      tonoNotificacion.value = 'warning'
    } else {
      notificacion.value = 'Venta registrada correctamente.'
      tonoNotificacion.value = 'success'
    }
    carrito.value = []
    efectivo.value = ''
    descuento.value = 0
    receta.value = { paciente: '', medico: '', matricula: '' }
    await cargarDatos()
  } catch (err) {
    notificacion.value = err.message || 'No se pudo registrar la venta.'
    tonoNotificacion.value = 'error'
  } finally {
    guardando.value = false
  }
}

const nuevaVenta = () => {
  ventaCompletada.value = null
  clienteId.value = ''
}

onMounted(cargarDatos)
</script>

<template>
  <section class="sales-page px-1">
    <ToastNotification
      :message="notificacion"
      :tone="tonoNotificacion"
      @close="notificacion = ''"
    />

    <header class="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
      <div>
        <span class="eyebrow">Ventas · Rodrigo Marca</span>
        <h1 class="h3 fw-bold mb-1">Punto de venta</h1>
        <p class="text-muted mb-0">Carrito, pago en efectivo y comprobante de venta.</p>
      </div>
      <router-link to="/clientes" class="btn btn-outline-primary rounded-pill px-4">
        <i class="fas fa-address-book me-2"></i>Gestionar clientes
      </router-link>
    </header>

    <div v-if="error" class="alert alert-danger" role="alert">{{ error }}</div>

    <div v-if="ventaCompletada" class="row g-4">
      <div class="col-lg-7">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body p-4 text-center d-flex flex-column justify-content-center">
            <span class="text-success display-5"><i class="fas fa-circle-check"></i></span>
            <h2 class="h4 mt-3">Venta registrada</h2>
            <p class="text-muted">Comprobante {{ ventaCompletada.numSerie }}</p>
            <div class="d-flex justify-content-center gap-2">
              <button class="btn btn-primary rounded-pill px-4" @click="nuevaVenta">
                <i class="fas fa-plus me-2"></i>Nueva venta
              </button>
              <router-link to="/clientes" class="btn btn-outline-secondary rounded-pill px-4">
                Clientes
              </router-link>
            </div>
          </div>
        </div>
      </div>
      <div class="col-lg-5">
        <SaleReceipt :farmacia="farmacia" :venta="ventaCompletada" />
      </div>
    </div>

    <div v-else class="row g-4 align-items-start">
      <div class="col-xl-7">
        <article class="card border-0 shadow-sm mb-4">
          <div class="card-body p-4">
            <div class="d-flex justify-content-between align-items-center gap-3 mb-3">
              <div>
                <h2 class="h5 fw-bold mb-1">Agregar productos</h2>
                <p class="small text-muted mb-0">El stock se descuenta por vencimiento más próximo.</p>
              </div>
              <span class="badge text-bg-light">{{ productos.length }} disponibles</span>
            </div>
            <div class="row g-3 align-items-end">
              <div class="col-md">
                <label class="form-label" for="buscar-producto">Buscar medicamento</label>
                <input
                  id="buscar-producto"
                  v-model="busqueda"
                  class="form-control"
                  placeholder="Nombre, DCI o código de barras"
                  @input="buscarProductos"
                >
              </div>
              <div class="col-md-5">
                <label class="form-label" for="producto-venta">Medicamento</label>
                <select id="producto-venta" v-model="productoId" class="form-select">
                  <option value="">Selecciona un producto</option>
                  <option
                    v-for="producto in productos"
                    :key="producto.id_medicamento"
                    :value="String(producto.id_medicamento)"
                  >
                    {{ producto.nombre_comercial }} · Bs {{ Number(producto.precio_unitario).toFixed(2) }}
                    · stock {{ producto.stock_disponible }}
                  </option>
                </select>
              </div>
              <div class="col-5 col-md-2">
                <label class="form-label" for="cantidad-venta">Cantidad</label>
                <input
                  id="cantidad-venta"
                  v-model.number="cantidad"
                  class="form-control"
                  type="number"
                  min="1"
                  :max="productoSeleccionado?.stock_disponible || 1"
                >
              </div>
              <div class="col-7 col-md-auto">
                <button class="btn btn-primary rounded-pill w-100" @click="agregarProducto">
                  <i class="fas fa-cart-plus me-2"></i>Agregar
                </button>
              </div>
            </div>
            <p v-if="cargando" class="small text-muted mt-3 mb-0">Cargando catálogo…</p>
            <p v-else-if="productos.length === 0" class="small text-muted mt-3 mb-0">
              No hay medicamentos con stock vigente que coincidan con la búsqueda.
            </p>
          </div>
        </article>

        <article class="card border-0 shadow-sm">
          <div class="card-body p-4">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h2 class="h5 fw-bold mb-0">Carrito</h2>
              <span class="badge rounded-pill text-bg-primary">{{ carrito.length }} productos</span>
            </div>
            <div v-if="!carrito.length" class="text-center text-muted py-5">
              <i class="fas fa-basket-shopping fs-2 mb-2"></i>
              <p class="mb-0">Agrega medicamentos para iniciar la venta.</p>
            </div>
            <div v-else class="table-responsive">
              <table class="table align-middle">
                <thead>
                  <tr><th>Medicamento</th><th>Precio</th><th style="width: 100px">Cantidad</th><th>Subtotal</th><th></th></tr>
                </thead>
                <tbody>
                  <tr v-for="item in carrito" :key="item.id_medicamento">
                    <td>
                      <strong>{{ item.nombre_comercial }}</strong>
                      <span v-if="item.tipo_venta === 'Con receta'" class="badge text-bg-warning ms-2">Receta</span>
                      <small v-if="item.lotes_por_vencer > 0" class="d-block text-warning">Hay lote(s) próximos a vencer</small>
                    </td>
                    <td>Bs {{ Number(item.precio_unitario).toFixed(2) }}</td>
                    <td>
                      <input
                        class="form-control form-control-sm"
                        type="number"
                        min="1"
                        :max="item.stock_disponible"
                        :value="item.cantidad"
                        :aria-label="`Cantidad de ${item.nombre_comercial}`"
                        @change="actualizarCantidad(item, $event.target.value)"
                      >
                    </td>
                    <td>{{ dinero(Math.round(Number(item.precio_unitario) * 100) * item.cantidad) }}</td>
                    <td>
                      <button
                        class="btn btn-sm btn-outline-danger"
                        :aria-label="`Quitar ${item.nombre_comercial}`"
                        @click="carrito = carrito.filter((producto) => producto.id_medicamento !== item.id_medicamento)"
                      >
                        <i class="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </article>
      </div>

      <div class="col-xl-5">
        <article class="card border-0 shadow-sm">
          <div class="card-body p-4">
            <h2 class="h5 fw-bold mb-3">Cliente y pago</h2>
            <div class="mb-3">
              <label class="form-label" for="cliente-venta">Cliente <span class="text-danger">*</span></label>
              <select id="cliente-venta" v-model="clienteId" class="form-select" required>
                <option value="">Selecciona un cliente</option>
                <option v-for="cliente in clientes" :key="cliente.id_cliente" :value="String(cliente.id_cliente)">
                  {{ nombreCliente(cliente) }} · {{ cliente.ci_nit }}
                </option>
              </select>
              <small v-if="!clientes.length" class="text-muted">
                Registra primero un cliente en <router-link to="/clientes">Clientes</router-link>.
              </small>
            </div>

            <div v-if="requiereReceta" class="rounded-3 bg-light p-3 mb-3">
              <h3 class="h6 fw-bold"><i class="fas fa-prescription me-2"></i>Datos de receta (RD5)</h3>
              <div class="mb-2">
                <label class="form-label" for="paciente">Paciente</label>
                <input id="paciente" v-model.trim="receta.paciente" class="form-control" maxlength="160" required>
              </div>
              <div class="row g-2">
                <div class="col">
                  <label class="form-label" for="medico">Médico</label>
                  <input id="medico" v-model.trim="receta.medico" class="form-control" maxlength="160" required>
                </div>
                <div class="col">
                  <label class="form-label" for="matricula">Matrícula</label>
                  <input id="matricula" v-model.trim="receta.matricula" class="form-control" maxlength="40" required>
                </div>
              </div>
              <small class="text-muted">Estos datos se validan para la venta y no se guardan.</small>
            </div>

            <div class="row g-3 mb-3">
              <div class="col-6">
                <label class="form-label" for="descuento-venta">Descuento (%)</label>
                <input id="descuento-venta" v-model.number="descuento" class="form-control" type="number" min="0" max="100" step="0.01">
              </div>
              <div class="col-6">
                <label class="form-label" for="efectivo-venta">Recibido (Bs)</label>
                <input id="efectivo-venta" v-model="efectivo" class="form-control" type="number" min="0" step="0.01" required>
              </div>
              <div class="col-6">
                <label class="form-label" for="tipo-comprobante">Comprobante</label>
                <select id="tipo-comprobante" v-model="tipoComprobante" class="form-select">
                  <option>Nota de venta</option>
                  <option>Factura</option>
                </select>
              </div>
              <div class="col-6">
                <label class="form-label" for="formato-comprobante">Formato</label>
                <select id="formato-comprobante" v-model="formatoImpresion" class="form-select">
                  <option value="Pantalla">Pantalla</option>
                  <option value="Impreso">Impreso</option>
                </select>
              </div>
            </div>

            <div class="border-top pt-3">
              <p class="d-flex justify-content-between mb-2"><span>Subtotal</span><strong>{{ dinero(subtotalCentavos) }}</strong></p>
              <p class="d-flex justify-content-between mb-2"><span>Descuento</span><strong>- {{ dinero(descuentoCentavos) }}</strong></p>
              <p class="d-flex justify-content-between fs-5 mb-2"><span>Total</span><strong>{{ dinero(totalCentavos) }}</strong></p>
              <p class="d-flex justify-content-between text-success mb-3"><span>Cambio</span><strong>{{ dinero(cambioCentavos) }}</strong></p>
              <button
                class="btn btn-success rounded-pill w-100 py-2"
                :disabled="guardando || cargando || !carrito.length"
                @click="confirmarVenta"
              >
                <i class="fas fa-cash-register me-2"></i>
                {{ guardando ? 'Registrando…' : 'Confirmar venta' }}
              </button>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
