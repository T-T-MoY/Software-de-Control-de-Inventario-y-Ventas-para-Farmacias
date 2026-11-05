<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import ToastNotification from '../components/ToastNotification.vue'
import SaleReceipt from '../components/SaleReceipt.vue'
import { apiAssetUrl } from '../../data/api'
import {
  crearCliente,
  crearVenta,
  listarCatalogoVenta,
  listarClientes
} from '../../data/endpoints/sales'
import { obtenerParametros } from '../../data/endpoints/parameters'
import { validarCi, validarNombre } from '../validators/fields'

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
const fotosNoDisponibles = ref(new Set())
const cantidad = ref(1)
const carrito = ref([])
const clienteId = ref('')
const descuento = ref(0)
const efectivo = ref('')
const tipoComprobante = ref('Nota de venta')
const receta = ref({ paciente: '', medico: '', matricula: '' })
const ventaCompletada = ref(null)
const identificacionCliente = ref('')
const formularioCliente = ref({
  nombres: '',
  apellido_paterno: '',
  apellido_materno: '',
  ci_nit: '',
  telefono: '',
  domicilio: ''
})
const guardandoCliente = ref(false)

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

const clientePorIdentificacion = computed(() => {
  const identificacion = identificacionCliente.value.trim().toLocaleUpperCase()
  if (!identificacion) return null
  return clientes.value.find((cliente) => (
    String(cliente.ci_nit || '').trim().toLocaleUpperCase() === identificacion
    && cliente.ci_nit !== '00000'
  )) || null
})
const clienteValido = computed(() => clientes.value.some((cliente) => (
  String(cliente.id_cliente) === clienteId.value && cliente.ci_nit !== '00000'
)))
const mostrarFormularioCliente = computed(() => (
  Boolean(identificacionCliente.value.trim())
  && validarCi(identificacionCliente.value) === ''
  && identificacionCliente.value.trim() !== '00000'
  && !clientePorIdentificacion.value
))

const cargarDatos = async () => {
  cargando.value = true
  error.value = ''
  try {
    const [listaClientes, parametros] = await Promise.all([
      listarClientes(),
      obtenerParametros()
    ])
    clientes.value = listaClientes
    farmacia.value = parametros.farmacia || {}
    if (clienteId.value && !listaClientes.some(
      (cliente) => String(cliente.id_cliente) === clienteId.value && cliente.ci_nit !== '00000'
    )) clienteId.value = ''
    if (productoId.value && !productos.value.some(
      (item) => String(item.id_medicamento) === productoId.value
    )) {
      productoId.value = ''
    }
  } catch (err) {
    error.value = err.message || 'No se pudieron cargar los datos del punto de venta.'
  } finally {
    cargando.value = false
  }
}

const cargarCatalogo = async () => {
  if (!clienteValido.value) {
    productos.value = []
    productoId.value = ''
    return
  }
  cargando.value = true
  error.value = ''
  try {
    const catalogo = await listarCatalogoVenta({ buscar: busqueda.value.trim() })
    productos.value = catalogo.filter(
      (item) => Number(item.stock_disponible) > 0
    )
    if (productoId.value && !productos.value.some(
      (item) => String(item.id_medicamento) === productoId.value
    )) {
      productoId.value = ''
    }
  } catch (err) {
    error.value = err.message || 'No se pudo cargar el catálogo de medicamentos.'
  } finally {
    cargando.value = false
  }
}

const recargarDatos = async () => {
  await cargarDatos()
  if (clienteValido.value) await cargarCatalogo()
}

watch(identificacionCliente, (identificacion) => {
  const cliente = clientePorIdentificacion.value
  if (cliente) {
    if (clienteId.value !== String(cliente.id_cliente)) {
      clienteId.value = String(cliente.id_cliente)
      notificacion.value = 'Cliente registrado anteriormente'
      tonoNotificacion.value = 'success'
    }
    formularioCliente.value = { ...formularioCliente.value, ci_nit: cliente.ci_nit }
    return
  }

  if (clienteId.value) clienteId.value = ''
  formularioCliente.value = {
    nombres: '',
    apellido_paterno: '',
    apellido_materno: '',
    ci_nit: identificacion.trim(),
    telefono: '',
    domicilio: ''
  }
})

watch(clienteId, (nuevo, anterior) => {
  if (nuevo !== anterior && anterior && carrito.value.length) {
    carrito.value = []
    efectivo.value = ''
    descuento.value = 0
    receta.value = { paciente: '', medico: '', matricula: '' }
    notificacion.value = 'Se vació el carrito porque cambió el cliente.'
    tonoNotificacion.value = 'warning'
  }
  productoId.value = ''
  void cargarCatalogo()
})

let temporizadorBusqueda
const buscarProductos = () => {
  clearTimeout(temporizadorBusqueda)
  if (clienteValido.value) temporizadorBusqueda = setTimeout(cargarCatalogo, 250)
}

const seleccionarCliente = () => {
  const cliente = clientes.value.find(
    (item) => String(item.id_cliente) === clienteId.value
  )
  identificacionCliente.value = cliente?.ci_nit || ''
  if (!cliente) return
  formularioCliente.value = {
    nombres: '',
    apellido_paterno: '',
    apellido_materno: '',
    ci_nit: cliente.ci_nit,
    telefono: '',
    domicilio: ''
  }
}

const registrarCliente = async () => {
  const formulario = formularioCliente.value
  const clienteExistente = clientes.value.find((cliente) => (
    String(cliente.ci_nit || '').trim().toLocaleUpperCase()
      === formulario.ci_nit.trim().toLocaleUpperCase()
    && cliente.ci_nit !== '00000'
  ))
  if (clienteExistente) {
    identificacionCliente.value = clienteExistente.ci_nit
    clienteId.value = String(clienteExistente.id_cliente)
    notificacion.value = 'Cliente registrado anteriormente'
    tonoNotificacion.value = 'success'
    return
  }

  const errorNombres = validarNombre(formulario.nombres, { etiqueta: 'Los nombres', max: 80 })
  const errorPaterno = validarNombre(formulario.apellido_paterno, {
    etiqueta: 'El apellido paterno',
    max: 60
  })
  const errorMaterno = validarNombre(formulario.apellido_materno, {
    etiqueta: 'El apellido materno',
    requerido: false,
    max: 60
  })
  const errorCi = validarCi(formulario.ci_nit)
  const mensaje = errorNombres || errorPaterno || errorMaterno || errorCi
    || (formulario.telefono && !/^[0-9+()\s-]{7,20}$/.test(formulario.telefono.trim())
      ? 'Ingresa un teléfono válido.'
      : '')
    || (formulario.domicilio.length > 150
      ? 'El domicilio no puede superar 150 caracteres.'
      : '')
  if (mensaje) {
    notificacion.value = mensaje
    tonoNotificacion.value = 'error'
    return
  }

  guardandoCliente.value = true
  try {
    const respuesta = await crearCliente({
      ...formulario,
      nombres: formulario.nombres.trim(),
      apellido_paterno: formulario.apellido_paterno.trim(),
      apellido_materno: formulario.apellido_materno.trim(),
      ci_nit: formulario.ci_nit.trim(),
      telefono: formulario.telefono.trim(),
      domicilio: formulario.domicilio.trim()
    })
    if (!respuesta?.cliente?.id_cliente) {
      throw new Error('El cliente se registró, pero no se recibieron sus datos para seleccionarlo.')
    }
    const cliente = respuesta.cliente
    clientes.value = [
      ...clientes.value.filter((item) => item.id_cliente !== cliente.id_cliente),
      cliente
    ]
    identificacionCliente.value = cliente.ci_nit
    clienteId.value = String(cliente.id_cliente)
    notificacion.value = 'Cliente registrado correctamente.'
    tonoNotificacion.value = 'success'
  } catch (err) {
    notificacion.value = err.message || 'No se pudo registrar el cliente.'
    tonoNotificacion.value = 'error'
  } finally {
    guardandoCliente.value = false
  }
}

const agregarProducto = () => {
  if (!clienteValido.value) {
    notificacion.value = 'Selecciona o registra un cliente antes de agregar productos.'
    tonoNotificacion.value = 'error'
    return
  }
  const producto = productoSeleccionado.value
  if (
    !producto
    || Number(producto.stock_disponible) <= 0
    || !Number.isInteger(Number(cantidad.value))
    || Number(cantidad.value) < 1
  ) {
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

const seleccionarProducto = (producto) => {
  if (clienteValido.value && Number(producto.stock_disponible) > 0) {
    productoId.value = String(producto.id_medicamento)
  }
}

const imagenProducto = (producto) => (
  producto.imagen_url && !fotosNoDisponibles.value.has(producto.id_medicamento)
    ? apiAssetUrl(producto.imagen_url)
    : ''
)

const marcarImagenNoDisponible = (idMedicamento) => {
  fotosNoDisponibles.value = new Set(fotosNoDisponibles.value).add(idMedicamento)
}

const actualizarCantidad = (item, valor) => {
  const nuevaCantidad = Number(valor)
  if (!Number.isInteger(nuevaCantidad) || nuevaCantidad < 1) return
  if (Number(item.stock_disponible) <= 0 || nuevaCantidad > Number(item.stock_disponible)) {
    notificacion.value = 'La cantidad supera el stock disponible.'
    tonoNotificacion.value = 'error'
    return
  }
  item.cantidad = nuevaCantidad
}

const confirmarVenta = async () => {
  if (!clienteValido.value || carrito.value.length === 0) {
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
  let respuesta
  try {
    respuesta = await crearVenta({
      id_cliente: Number(clienteId.value),
      items: carrito.value.map((item) => ({
        id_medicamento: item.id_medicamento,
        cantidad: item.cantidad
      })),
      descuento_porcentaje: Number(descuento.value || 0),
      monto_recibido: Number(efectivo.value),
      tipo_comprobante: tipoComprobante.value,
      ...(requiereReceta.value ? { receta: receta.value } : {})
    })
  } catch (err) {
    notificacion.value = err.message || 'No se pudo registrar la venta.'
    tonoNotificacion.value = 'error'
    guardando.value = false
    return
  }

  guardando.value = false
  if (!respuesta?.venta) {
    notificacion.value = 'Venta registrada, pero no se recibió el comprobante. El carrito se limpió para evitar duplicarla.'
    tonoNotificacion.value = 'warning'
    carrito.value = []
    efectivo.value = ''
    descuento.value = 0
    receta.value = { paciente: '', medico: '', matricula: '' }
    void recargarDatos()
    return
  }
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
  void recargarDatos()
}

const cerrarComprobante = () => {
  ventaCompletada.value = null
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

    <div class="row g-4 align-items-start">
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
            <div v-if="!clienteValido" class="alert alert-info py-2 mb-3">
              <i class="fas fa-lock me-2" aria-hidden="true"></i>
              Selecciona o registra un cliente para habilitar la búsqueda de medicamentos.
            </div>
            <fieldset
              class="sales-product-fields border-0 p-0 m-0"
              :disabled="!clienteValido || cargando"
            >
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
              <div class="col-12">
                <span class="form-label d-block">Medicamentos disponibles</span>
                <div class="sale-product-list" role="group" aria-label="Medicamentos disponibles">
                  <button
                    v-for="producto in productos"
                    :key="producto.id_medicamento"
                    type="button"
                    class="sale-product-option"
                    :class="{ 'is-selected': productoId === String(producto.id_medicamento) }"
                    :aria-pressed="productoId === String(producto.id_medicamento)"
                    :disabled="Number(producto.stock_disponible) <= 0"
                    @click="seleccionarProducto(producto)"
                  >
                    <span class="sale-product-image">
                      <img
                        v-if="imagenProducto(producto)"
                        :src="imagenProducto(producto)"
                        :alt="`Foto de ${producto.nombre_comercial}`"
                        loading="lazy"
                        @error="marcarImagenNoDisponible(producto.id_medicamento)"
                      >
                      <span v-else class="sale-no-photo">
                        <i class="fas fa-pills" aria-hidden="true"></i>
                        SIN FOTO
                      </span>
                    </span>
                    <span class="sale-product-details">
                      <strong>{{ producto.nombre_comercial }}</strong>
                      <small>{{ producto.dci || producto.concentracion }}</small>
                      <small>
                        Bs {{ Number(producto.precio_unitario).toFixed(2) }}
                        · stock {{ producto.stock_disponible }}
                      </small>
                    </span>
                    <i
                      v-if="productoId === String(producto.id_medicamento)"
                      class="fas fa-circle-check text-primary"
                      aria-hidden="true"
                    ></i>
                  </button>
                  <p v-if="!cargando && productos.length === 0" class="small text-muted mb-0 p-3">
                    No hay medicamentos con stock vigente que coincidan con la búsqueda.
                  </p>
                </div>
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
            </fieldset>
            <p v-if="cargando" class="small text-muted mt-3 mb-0">Cargando catálogo…</p>
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
              <label class="form-label" for="buscar-cliente-venta">Buscar por CI/NIT</label>
              <input
                id="buscar-cliente-venta"
                v-model.trim="identificacionCliente"
                class="form-control mb-2"
                placeholder="Ingresa el documento del cliente"
                maxlength="20"
                :disabled="cargando || guardandoCliente"
                autocomplete="off"
              >
              <label class="form-label" for="cliente-venta">Cliente registrado</label>
              <select
                id="cliente-venta"
                v-model="clienteId"
                class="form-select"
                required
                :disabled="cargando || guardandoCliente"
                @change="seleccionarCliente"
              >
                <option value="">Selecciona un cliente</option>
                <option
                  v-for="cliente in clientes.filter((item) => item.ci_nit !== '00000')"
                  :key="cliente.id_cliente"
                  :value="String(cliente.id_cliente)"
                >
                  {{ nombreCliente(cliente) }} · {{ cliente.ci_nit }}
                </option>
              </select>
              <small v-if="!clientes.some((cliente) => cliente.ci_nit !== '00000')" class="text-muted">
                Registra primero un cliente en <router-link to="/clientes">Clientes</router-link>.
              </small>
            </div>

            <form
              v-if="mostrarFormularioCliente"
              class="rounded-3 border bg-light p-3 mb-3"
              @submit.prevent="registrarCliente"
            >
              <h3 class="h6 fw-bold">Cliente no registrado</h3>
              <p class="small text-muted">Completa sus datos para registrarlo y continuar con la venta.</p>
              <div class="row g-2">
                <div class="col-12">
                  <label class="form-label" for="venta-cliente-nombres">Nombres</label>
                  <input
                    id="venta-cliente-nombres"
                    v-model="formularioCliente.nombres"
                    class="form-control"
                    maxlength="80"
                    required
                  >
                </div>
                <div class="col-md-6">
                  <label class="form-label" for="venta-cliente-paterno">Apellido paterno</label>
                  <input
                    id="venta-cliente-paterno"
                    v-model="formularioCliente.apellido_paterno"
                    class="form-control"
                    maxlength="60"
                    required
                  >
                </div>
                <div class="col-md-6">
                  <label class="form-label" for="venta-cliente-materno">Apellido materno</label>
                  <input
                    id="venta-cliente-materno"
                    v-model="formularioCliente.apellido_materno"
                    class="form-control"
                    maxlength="60"
                  >
                </div>
                <div class="col-md-6">
                  <label class="form-label" for="venta-cliente-ci">CI/NIT</label>
                  <input
                    id="venta-cliente-ci"
                    v-model="formularioCliente.ci_nit"
                    class="form-control"
                    maxlength="20"
                    required
                  >
                </div>
                <div class="col-md-6">
                  <label class="form-label" for="venta-cliente-telefono">Teléfono</label>
                  <input
                    id="venta-cliente-telefono"
                    v-model="formularioCliente.telefono"
                    class="form-control"
                    maxlength="20"
                  >
                </div>
                <div class="col-12">
                  <label class="form-label" for="venta-cliente-domicilio">Domicilio</label>
                  <input
                    id="venta-cliente-domicilio"
                    v-model="formularioCliente.domicilio"
                    class="form-control"
                    maxlength="150"
                  >
                </div>
                <div class="col-12 text-end">
                  <button type="submit" class="btn btn-primary rounded-pill" :disabled="guardandoCliente">
                    <i class="fas fa-user-plus me-2"></i>
                    {{ guardandoCliente ? 'Registrando…' : 'Registrar y seleccionar' }}
                  </button>
                </div>
              </div>
            </form>

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

    <Teleport to="body">
      <div
        v-if="ventaCompletada"
        class="sale-preview-backdrop"
        role="presentation"
        @click.self="cerrarComprobante"
        @keydown.esc.window="cerrarComprobante"
      >
        <section
          class="sale-preview-dialog"
          role="dialog"
          aria-modal="true"
          aria-label="Previsualización del comprobante de venta"
        >
          <SaleReceipt :farmacia="farmacia" :venta="ventaCompletada" />
        </section>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.sale-product-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 0.65rem;
  max-height: 18rem;
  overflow-y: auto;
  padding: 0.15rem;
}

.sales-product-fields {
  width: 100%;
  min-width: 0;
}

.sales-product-fields:disabled {
  opacity: 0.6;
}

.sale-product-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
  padding: 0.55rem;
  border: 1px solid var(--bs-border-color, #dee2e6);
  border-radius: 0.75rem;
  background: var(--bs-body-bg, #fff);
  color: inherit;
  text-align: left;
}

.sale-product-option:hover,
.sale-product-option.is-selected {
  border-color: var(--bs-primary, #0d6efd);
}

.sale-product-option:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.sale-product-image {
  display: flex;
  flex: 0 0 3.5rem;
  align-items: center;
  justify-content: center;
  width: 3.5rem;
  height: 3.5rem;
  overflow: hidden;
  border-radius: 0.5rem;
  background: #fff;
}

.sale-product-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.sale-no-photo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  color: #64748b;
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.sale-no-photo i {
  color: #94a3b8;
  font-size: 1.15rem;
}

.sale-product-details {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.sale-product-details strong,
.sale-product-details small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sale-product-details small {
  color: var(--bs-secondary-color, #6c757d);
}

.sale-preview-backdrop {
  position: fixed;
  z-index: 1060;
  inset: 0;
  display: grid;
  place-items: center;
  overflow-y: auto;
  padding: 1rem;
  background: rgb(0 0 0 / 55%);
}

.sale-preview-dialog {
  width: min(100%, 30rem);
  max-height: calc(100vh - 2rem);
  overflow-y: auto;
  padding: 1rem;
  border-radius: 0.75rem;
  background: #fff;
  box-shadow: 0 1rem 3rem rgb(0 0 0 / 25%);
}
</style>
