<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
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
const cargandoCatalogo = ref(false)
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

// Búsqueda unificada de clientes y alta rápida.
const busquedaCliente = ref('')
const mostrarSugerencias = ref(false)
const indiceSugerencia = ref(-1)
const modalClienteAbierto = ref(false)
const guardandoCliente = ref(false)
const formularioCliente = ref({ nombre: '', ci_nit: '' })

const busquedaProductoRef = ref(null)
const nombreClienteRapidoRef = ref(null)
const ciClienteRapidoRef = ref(null)
const clienteAutocompleteRef = ref(null)

let temporizadorBusqueda
let solicitudCatalogo = 0

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
  cliente?.nombres,
  cliente?.apellido_paterno,
  cliente?.apellido_materno
].filter(Boolean).join(' ').trim()

const notificar = (mensaje, tono = 'success') => {
  notificacion.value = mensaje
  tonoNotificacion.value = tono
}

const esConsumidorFinal = (cliente) => String(cliente?.ci_nit || '').trim() === '00000'

const etiquetaCliente = (cliente) => {
  if (!cliente) return ''
  if (esConsumidorFinal(cliente)) return 'Consumidor Final'
  return nombreCliente(cliente) || cliente.ci_nit
}

const clienteConsumidorFinal = computed(() => (
  clientes.value.find((cliente) => esConsumidorFinal(cliente)) || null
))

const clienteSeleccionado = computed(() => (
  clientes.value.find((cliente) => String(cliente.id_cliente) === clienteId.value) || null
))

const clienteValido = computed(() => Boolean(clienteSeleccionado.value))

const terminoCliente = computed(() => busquedaCliente.value.trim().toLocaleLowerCase())
const buscarPorDocumento = computed(() => /^[0-9-]+$/.test(terminoCliente.value))

const clientesFiltrados = computed(() => {
  const termino = terminoCliente.value
  if (!termino) {
    return clientes.value
      .filter((cliente) => !esConsumidorFinal(cliente))
      .slice(0, 8)
  }

  const porDocumento = /^[0-9-]+$/.test(termino)
  return clientes.value
    .filter((cliente) => {
      const documento = String(cliente.ci_nit || '').toLocaleLowerCase()
      if (esConsumidorFinal(cliente)) {
        return documento.includes(termino) || 'consumidor final'.includes(termino)
      }
      if (porDocumento) return documento.includes(termino)
      return nombreCliente(cliente).toLocaleLowerCase().includes(termino)
    })
    .sort((a, b) => {
      const textoA = porDocumento ? String(a.ci_nit || '') : nombreCliente(a)
      const textoB = porDocumento ? String(b.ci_nit || '') : nombreCliente(b)
      const empiezaA = textoA.toLocaleLowerCase().startsWith(termino) ? 0 : 1
      const empiezaB = textoB.toLocaleLowerCase().startsWith(termino) ? 0 : 1
      return empiezaA - empiezaB || textoA.localeCompare(textoB)
    })
    .slice(0, 8)
})

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
      (cliente) => String(cliente.id_cliente) === clienteId.value
    )) {
      clienteId.value = ''
    }

    // Venta rápida: si existe el cliente genérico se asigna desde el inicio.
    if (!clienteId.value) {
      const consumidorFinal = listaClientes.find((cliente) => esConsumidorFinal(cliente))
      if (consumidorFinal) clienteId.value = String(consumidorFinal.id_cliente)
    }

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

  const solicitud = ++solicitudCatalogo
  cargandoCatalogo.value = true
  error.value = ''
  try {
    const catalogo = await listarCatalogoVenta({ buscar: busqueda.value.trim() })
    if (solicitud !== solicitudCatalogo) return
    productos.value = catalogo.filter(
      (item) => Number(item.stock_disponible) > 0
    )
    if (productoId.value && !productos.value.some(
      (item) => String(item.id_medicamento) === productoId.value
    )) {
      productoId.value = ''
    }
  } catch (err) {
    if (solicitud !== solicitudCatalogo) return
    error.value = err.message || 'No se pudo cargar el catálogo de medicamentos.'
  } finally {
    if (solicitud === solicitudCatalogo) cargandoCatalogo.value = false
  }
}

const recargarDatos = async () => {
  const clienteAnterior = clienteId.value
  await cargarDatos()
  if (clienteId.value === clienteAnterior && clienteValido.value) {
    await cargarCatalogo()
  }
}

// El carrito no se vacía al cambiar de cliente: se vuelve a enlazar con el
// cliente actual al confirmar la venta y se conservan productos e importes.
watch(clienteId, () => {
  productoId.value = ''
  void cargarCatalogo()
})

const buscarProductos = () => {
  clearTimeout(temporizadorBusqueda)
  if (clienteValido.value) temporizadorBusqueda = setTimeout(cargarCatalogo, 250)
}

const aplicarCliente = (cliente) => {
  if (!cliente) return
  const id = String(cliente.id_cliente)
  if (id === clienteId.value) return
  clienteId.value = id
}

const seleccionarCliente = (cliente) => {
  const conservaCarrito = carrito.value.length > 0
    && String(cliente.id_cliente) !== clienteId.value
  aplicarCliente(cliente)
  busquedaCliente.value = ''
  mostrarSugerencias.value = false
  indiceSugerencia.value = -1
  if (conservaCarrito) notificar('Cliente actualizado. El carrito se mantiene.')
  nextTick(() => busquedaProductoRef.value?.focus())
}

const volverConsumidorFinal = () => {
  if (!clienteConsumidorFinal.value) return
  const conservaCarrito = carrito.value.length > 0
    && String(clienteConsumidorFinal.value.id_cliente) !== clienteId.value
  aplicarCliente(clienteConsumidorFinal.value)
  busquedaCliente.value = ''
  mostrarSugerencias.value = false
  if (conservaCarrito) notificar('Cliente actualizado. El carrito se mantiene.')
}

const abrirSugerencias = () => {
  if (modalClienteAbierto.value) return
  mostrarSugerencias.value = true
  indiceSugerencia.value = clientesFiltrados.value.length ? 0 : -1
}

const manejarEntradaCliente = () => {
  mostrarSugerencias.value = true
  indiceSugerencia.value = clientesFiltrados.value.length ? 0 : -1
}

const moverSugerencia = (delta) => {
  const total = clientesFiltrados.value.length
  mostrarSugerencias.value = true
  if (!total) {
    indiceSugerencia.value = -1
    return
  }
  if (indiceSugerencia.value < 0) {
    indiceSugerencia.value = delta > 0 ? 0 : total - 1
    return
  }
  indiceSugerencia.value = (indiceSugerencia.value + delta + total) % total
}

const elegirSugerenciaActual = () => {
  if (!mostrarSugerencias.value) {
    abrirSugerencias()
    return
  }
  const cliente = clientesFiltrados.value[
    indiceSugerencia.value >= 0 ? indiceSugerencia.value : 0
  ]
  if (cliente) {
    seleccionarCliente(cliente)
    return
  }
  if (terminoCliente.value) abrirModalCliente()
}

const manejarClicFuera = (event) => {
  if (
    clienteAutocompleteRef.value
    && !clienteAutocompleteRef.value.contains(event.target)
  ) {
    mostrarSugerencias.value = false
  }
}

const abrirModalCliente = () => {
  const termino = busquedaCliente.value.trim()
  const pareceDocumento = /^[0-9-]+$/.test(termino)
  const pareceNombre = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]+$/.test(termino)

  formularioCliente.value = {
    nombre: pareceNombre ? termino : '',
    ci_nit: pareceDocumento ? termino : ''
  }
  mostrarSugerencias.value = false
  modalClienteAbierto.value = true

  nextTick(() => {
    if (formularioCliente.value.ci_nit) nombreClienteRapidoRef.value?.focus()
    else ciClienteRapidoRef.value?.focus()
  })
}

const cerrarModalCliente = () => {
  if (guardandoCliente.value) return
  modalClienteAbierto.value = false
}

const registrarClienteRapido = async () => {
  const nombre = formularioCliente.value.nombre.trim()
  const ciNit = formularioCliente.value.ci_nit.trim()
  const mensaje = validarNombre(nombre, {
    etiqueta: 'El nombre o razón social',
    max: 80
  }) || validarCi(ciNit)

  if (mensaje) {
    notificar(mensaje, 'error')
    return
  }

  const clienteExistente = clientes.value.find((cliente) => (
    String(cliente.ci_nit || '').trim().toLocaleUpperCase()
      === ciNit.toLocaleUpperCase()
  ))
  if (clienteExistente) {
    modalClienteAbierto.value = false
    busquedaCliente.value = ''
    aplicarCliente(clienteExistente)
    notificar('Ese CI/NIT ya estaba registrado. Se asignó el cliente existente.')
    nextTick(() => busquedaProductoRef.value?.focus())
    return
  }

  guardandoCliente.value = true
  try {
    const respuesta = await crearCliente({
      nombres: nombre,
      apellido_paterno: '',
      apellido_materno: '',
      ci_nit: ciNit
    })
    if (!respuesta?.cliente?.id_cliente) {
      throw new Error('El cliente se registró, pero no se recibieron sus datos para asignarlo.')
    }

    const cliente = respuesta.cliente
    clientes.value = [
      ...clientes.value.filter((item) => item.id_cliente !== cliente.id_cliente),
      cliente
    ]
    modalClienteAbierto.value = false
    busquedaCliente.value = ''
    aplicarCliente(cliente)
    notificar('Cliente registrado y asignado a la venta.')
    nextTick(() => busquedaProductoRef.value?.focus())
  } catch (err) {
    notificar(err.message || 'No se pudo registrar el cliente.', 'error')
  } finally {
    guardandoCliente.value = false
  }
}

const enfocarBusquedaProducto = () => {
  busquedaProductoRef.value?.focus()
  busquedaProductoRef.value?.select()
}

const manejarAtajos = (event) => {
  if (event.key === 'Escape') {
    if (modalClienteAbierto.value) {
      event.preventDefault()
      cerrarModalCliente()
      return
    }
    if (mostrarSugerencias.value) {
      event.preventDefault()
      mostrarSugerencias.value = false
    }
    return
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

onMounted(async () => {
  document.addEventListener('pointerdown', manejarClicFuera)
  window.addEventListener('keydown', manejarAtajos)

  await cargarDatos()
  await nextTick()
  enfocarBusquedaProducto()
})

onBeforeUnmount(() => {
  clearTimeout(temporizadorBusqueda)
  document.removeEventListener('pointerdown', manejarClicFuera)
  window.removeEventListener('keydown', manejarAtajos)
})
</script>

<template>
  <section class="sales-page px-1">
    <ToastNotification
      :message="notificacion"
      :tone="tonoNotificacion"
      @close="notificacion = ''"
    />

    <header class="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <span class="eyebrow">Ventas</span>
        <h1 class="mb-1 text-2xl font-extrabold text-[var(--text-main)] sm:text-3xl">Punto de venta</h1>
        <p class="mb-0 text-sm text-[var(--text-muted)]">Carrito, pago en efectivo y comprobante de venta.</p>
      </div>
      <router-link
        to="/clientes"
        class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-5 py-2.5 text-sm font-bold text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:w-auto"
      >
        <i class="fas fa-address-book" aria-hidden="true"></i>Gestionar clientes
      </router-link>
    </header>

    <div v-if="error" class="notice notice-error mb-4" role="alert">
      <span class="flex items-start gap-2">
        <i class="fas fa-circle-exclamation mt-0.5 shrink-0" aria-hidden="true"></i>{{ error }}
      </span>
    </div>

    <div class="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
      <div class="min-w-0 xl:col-span-7">
        <article class="panel mb-4">
          <div class="p-4 sm:p-5">
            <div class="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 class="mb-1 text-lg font-extrabold">Agregar productos</h2>
                <p class="mb-0 text-xs text-[var(--text-muted)] sm:text-sm">El stock se descuenta por vencimiento más próximo.</p>
              </div>
              <span class="shrink-0 rounded-full border border-[var(--border-color)] bg-[var(--bg-body)] px-3 py-1 text-xs font-semibold text-[var(--text-muted)]">{{ productos.length }} disponibles</span>
            </div>
            <div v-if="!clienteValido" class="notice mb-4 flex items-start gap-2 py-3 text-sm">
              <i class="fas fa-lock mt-0.5 shrink-0" aria-hidden="true"></i>
              Selecciona o registra un cliente para habilitar la búsqueda de medicamentos.
            </div>
            <fieldset
              class="sales-product-fields m-0 w-full min-w-0 border-0 p-0"
              :disabled="!clienteValido"
            >
            <div class="grid grid-cols-1 items-end gap-4 sm:grid-cols-12">
              <div class="min-w-0 sm:col-span-12">
                <label class="form-label" for="buscar-producto">Buscar medicamento</label>
                <div class="sale-input-group flex min-w-0 items-center overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--ring)]">
                  <span class="pl-4 text-[var(--text-soft)]" aria-hidden="true">
                    <i class="fas fa-magnifying-glass"></i>
                  </span>
                  <input
                    id="buscar-producto"
                    ref="busquedaProductoRef"
                    v-model="busqueda"
                    class="form-input min-w-0 flex-1 border-0 bg-transparent focus:ring-0"
                    placeholder="Nombre, DCI o código de barras"
                    autocomplete="off"
                    @input="buscarProductos"
                  >
                </div>
              </div>
              <div class="min-w-0 sm:col-span-12">
                <span class="form-label block">Medicamentos disponibles</span>
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
                  <p v-if="!cargandoCatalogo && productos.length === 0" class="m-0 p-3 text-sm text-[var(--text-muted)]">
                    No hay medicamentos con stock vigente que coincidan con la búsqueda.
                  </p>
                </div>
              </div>
              <div class="min-w-0 sm:col-span-3 lg:col-span-2">
                <label class="form-label" for="cantidad-venta">Cantidad</label>
                <input
                  id="cantidad-venta"
                  v-model.number="cantidad"
                  class="form-input"
                  type="number"
                  min="1"
                  :max="productoSeleccionado?.stock_disponible || 1"
                >
              </div>
              <div class="sm:col-span-9 lg:col-span-10">
                <button
                  type="button"
                  class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#2a468b] to-[#3d6ac1] px-5 py-2.5 text-sm font-bold text-[#fff7e3] shadow-md transition hover:from-[#1e356d] hover:to-[#2a468b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-55"
                  :disabled="!productoSeleccionado"
                  @click="agregarProducto"
                >
                  <i class="fas fa-cart-plus" aria-hidden="true"></i>Agregar
                </button>
              </div>
            </div>
            </fieldset>
            <p v-if="cargandoCatalogo" class="mb-0 mt-3 text-sm text-[var(--text-muted)]" role="status">Cargando catálogo…</p>
          </div>
        </article>

        <article class="panel">
          <div class="p-4 sm:p-5">
            <div class="mb-4 flex items-center justify-between gap-3">
              <h2 class="mb-0 text-lg font-extrabold">Carrito</h2>
              <span class="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-bold text-[var(--primary)]">{{ carrito.length }} productos</span>
            </div>
            <div v-if="!carrito.length" class="py-10 text-center text-sm text-[var(--text-muted)]">
              <i class="fas fa-basket-shopping mb-2 block text-3xl" aria-hidden="true"></i>
              <p class="mb-0">Agrega medicamentos para iniciar la venta.</p>
            </div>
            <div v-else class="sale-cart-scroll">
              <table class="w-full min-w-[36rem] border-collapse text-left text-sm">
                <thead>
                  <tr class="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                    <th class="px-3 py-3">Medicamento</th><th class="px-3 py-3">Precio</th><th class="w-24 px-3 py-3">Cantidad</th><th class="px-3 py-3">Subtotal</th><th class="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in carrito" :key="item.id_medicamento">
                    <td class="border-t border-[var(--border-color)] px-3 py-3">
                      <strong>{{ item.nombre_comercial }}</strong>
                      <span v-if="item.tipo_venta === 'Con receta'" class="ml-2 rounded-full bg-[var(--warning-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--warning)]">Receta</span>
                      <small v-if="item.lotes_por_vencer > 0" class="mt-1 block text-[var(--warning)]">Hay lote(s) próximos a vencer</small>
                    </td>
                    <td class="border-t border-[var(--border-color)] px-3 py-3">Bs {{ Number(item.precio_unitario).toFixed(2) }}</td>
                    <td class="border-t border-[var(--border-color)] px-3 py-3">
                      <input
                        class="form-input min-h-10 px-2 py-2 text-sm"
                        type="number"
                        min="1"
                        :max="item.stock_disponible"
                        :value="item.cantidad"
                        :aria-label="`Cantidad de ${item.nombre_comercial}`"
                        @change="actualizarCantidad(item, $event.target.value)"
                      >
                    </td>
                    <td class="border-t border-[var(--border-color)] px-3 py-3 font-semibold">{{ dinero(Math.round(Number(item.precio_unitario) * 100) * item.cantidad) }}</td>
                    <td class="border-t border-[var(--border-color)] px-3 py-3">
                      <button
                        type="button"
                        class="inline-flex size-9 items-center justify-center rounded-full border border-[var(--danger)] text-[var(--danger)] transition hover:bg-[var(--danger-soft)] focus-visible:outline-2 focus-visible:outline-[var(--danger)]"
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

      <div class="min-w-0 xl:col-span-5">
        <article class="panel">
          <div class="p-4 sm:p-5">
            <h2 class="mb-4 text-lg font-extrabold">Cliente y pago</h2>

            <div class="sale-client-current mb-4" :class="{ 'is-empty': !clienteSeleccionado }">
              <div class="flex min-w-0 items-center gap-2">
                <span class="sale-client-icon" aria-hidden="true">
                  <i class="fas" :class="clienteSeleccionado ? 'fa-user-check' : 'fa-user-slash'"></i>
                </span>
                <div class="sale-client-info min-w-0 flex-1">
                  <span class="sale-client-label">Cliente actual</span>
                  <strong class="block truncate">
                    {{ clienteSeleccionado ? etiquetaCliente(clienteSeleccionado) : 'Sin cliente seleccionado' }}
                  </strong>
                  <small v-if="clienteSeleccionado && !esConsumidorFinal(clienteSeleccionado)" class="text-[var(--text-muted)]">
                    CI/NIT: {{ clienteSeleccionado.ci_nit }}
                  </small>
                  <small v-else-if="clienteSeleccionado" class="text-[var(--text-muted)]">
                    No requiere datos del cliente
                  </small>
                </div>
                <span
                  v-if="clienteSeleccionado && esConsumidorFinal(clienteSeleccionado)"
                  class="shrink-0 rounded-full bg-[var(--success-soft)] px-2.5 py-1 text-xs font-bold text-[var(--success)]"
                >
                  Venta rápida
                </span>
                <button
                  v-else-if="clienteConsumidorFinal"
                  type="button"
                  class="shrink-0 rounded-full border border-[var(--border-color)] px-3 py-1.5 text-xs font-bold text-[var(--text-muted)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--primary)]"
                  @click="volverConsumidorFinal"
                >
                  Consumidor final
                </button>
              </div>
            </div>

            <div ref="clienteAutocompleteRef" class="cliente-autocomplete mb-4">
              <label class="form-label" for="buscar-cliente-venta">Buscar cliente</label>
              <div class="cliente-search-wrap">
                <div class="sale-input-group flex min-w-0 items-center overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--ring)]">
                  <span class="pl-4 text-[var(--text-soft)]" aria-hidden="true">
                    <i class="fas fa-address-book"></i>
                  </span>
                  <input
                    id="buscar-cliente-venta"
                    v-model="busquedaCliente"
                    class="form-input min-w-0 flex-1 border-0 bg-transparent focus:ring-0"
                    type="text"
                    placeholder="Nombre, razón social o CI/NIT"
                    maxlength="80"
                    autocomplete="off"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-controls="cliente-sugerencias"
                    :aria-expanded="mostrarSugerencias"
                    :disabled="cargando || guardandoCliente"
                    @focus="abrirSugerencias"
                    @input="manejarEntradaCliente"
                    @keydown.down.prevent="moverSugerencia(1)"
                    @keydown.up.prevent="moverSugerencia(-1)"
                    @keydown.enter.prevent="elegirSugerenciaActual"
                    @keydown.esc.prevent="mostrarSugerencias = false"
                  >
                  <button
                    type="button"
                    class="mr-1 inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border-color)] text-[var(--primary)] transition hover:bg-[var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
                    title="Agregar nuevo cliente"
                    aria-label="Agregar nuevo cliente"
                    :disabled="cargando || guardandoCliente"
                    @click="abrirModalCliente"
                  >
                    <i class="fas fa-user-plus"></i>
                  </button>
                </div>

                <div
                  v-if="mostrarSugerencias"
                  id="cliente-sugerencias"
                  class="cliente-suggestions"
                  role="listbox"
                >
                  <button
                    v-for="(cliente, indice) in clientesFiltrados"
                    :key="cliente.id_cliente"
                    type="button"
                    class="cliente-suggestion"
                    :class="{ 'is-active': indice === indiceSugerencia }"
                    role="option"
                    :aria-selected="indice === indiceSugerencia"
                    @mouseenter="indiceSugerencia = indice"
                    @click="seleccionarCliente(cliente)"
                  >
                    <span class="cliente-suggestion-icon" aria-hidden="true">
                      <i class="fas" :class="esConsumidorFinal(cliente) ? 'fa-bolt' : 'fa-user'"></i>
                    </span>
                    <span class="cliente-suggestion-info">
                      <strong>{{ etiquetaCliente(cliente) }}</strong>
                      <small>{{ esConsumidorFinal(cliente) ? '00000 · Venta rápida' : cliente.ci_nit }}</small>
                    </span>
                    <i
                      v-if="String(cliente.id_cliente) === clienteId"
                      class="fas fa-circle-check text-primary"
                      aria-hidden="true"
                    ></i>
                  </button>

                  <p v-if="!clientesFiltrados.length" class="cliente-suggestions-empty">
                    {{ terminoCliente ? 'No se encontraron clientes con ese dato.' : 'No hay clientes registrados.' }}
                  </p>

                  <button
                    type="button"
                    class="cliente-suggestion cliente-suggestion-new"
                    @click="abrirModalCliente"
                  >
                    <span class="cliente-suggestion-icon" aria-hidden="true">
                      <i class="fas fa-user-plus"></i>
                    </span>
                    <span class="cliente-suggestion-info">
                      <strong>+ Agregar Nuevo Cliente</strong>
                      <small>Solo CI/NIT y nombre o razón social</small>
                    </span>
                  </button>
                </div>
              </div>
              <small class="mt-1 block text-xs text-[var(--text-muted)]">
                {{ buscarPorDocumento ? 'Filtrando por CI/NIT…' : 'Escribe letras para buscar por nombre o números para buscar por CI/NIT.' }}
              </small>
            </div>

            <div v-if="requiereReceta" class="mb-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-body)] p-4">
              <h3 class="mb-3 text-sm font-extrabold"><i class="fas fa-prescription mr-2" aria-hidden="true"></i>Datos de receta (RD5)</h3>
              <div class="mb-3">
                <label class="form-label" for="paciente">Paciente</label>
                <input id="paciente" v-model.trim="receta.paciente" class="form-input" maxlength="160" required>
              </div>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div class="min-w-0">
                  <label class="form-label" for="medico">Médico</label>
                  <input id="medico" v-model.trim="receta.medico" class="form-input" maxlength="160" required>
                </div>
                <div class="min-w-0">
                  <label class="form-label" for="matricula">Matrícula</label>
                  <input id="matricula" v-model.trim="receta.matricula" class="form-input" maxlength="40" required>
                </div>
              </div>
              <small class="mt-2 block text-xs text-[var(--text-muted)]">Estos datos se validan para la venta y no se guardan.</small>
            </div>

            <div class="mb-4 grid grid-cols-2 gap-3">
              <div class="min-w-0">
                <label class="form-label" for="descuento-venta">Descuento (%)</label>
                <input id="descuento-venta" v-model.number="descuento" class="form-input" type="number" min="0" max="100" step="0.01">
              </div>
              <div class="min-w-0">
                <label class="form-label" for="efectivo-venta">Recibido (Bs)</label>
                <input id="efectivo-venta" v-model="efectivo" class="form-input" type="number" min="0" step="0.01" required>
              </div>
              <div class="min-w-0">
                <label class="form-label" for="tipo-comprobante">Comprobante</label>
                <select id="tipo-comprobante" v-model="tipoComprobante" class="form-select">
                  <option>Nota de venta</option>
                  <option>Factura</option>
                </select>
              </div>
            </div>

            <div class="border-t border-[var(--border-color)] pt-4">
              <p class="mb-2 flex justify-between gap-3 text-sm"><span>Subtotal</span><strong>{{ dinero(subtotalCentavos) }}</strong></p>
              <p class="mb-2 flex justify-between gap-3 text-sm"><span>Descuento</span><strong>- {{ dinero(descuentoCentavos) }}</strong></p>
              <p class="mb-2 flex justify-between gap-3 text-lg"><span>Total</span><strong>{{ dinero(totalCentavos) }}</strong></p>
              <p class="mb-4 flex justify-between gap-3 text-sm text-[var(--success)]"><span>Cambio</span><strong>{{ dinero(cambioCentavos) }}</strong></p>
              <button
                type="button"
                class="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--success)] px-5 py-3 text-sm font-extrabold text-white shadow-md transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--success)] disabled:cursor-not-allowed disabled:opacity-55"
                :disabled="guardando || cargando || !carrito.length"
                @click="confirmarVenta"
              >
                <i class="fas fa-cash-register" aria-hidden="true"></i>
                <span>{{ guardando ? 'Registrando…' : 'Confirmar venta' }}</span>
              </button>
            </div>
          </div>
        </article>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="modalClienteAbierto"
        class="panel-modal-backdrop"
        role="presentation"
        @click.self="cerrarModalCliente"
      >
        <section
          class="panel-modal cliente-rapido-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cliente-rapido-title"
        >
          <header class="panel-modal-head">
            <div>
              <span class="eyebrow">Venta rápida</span>
              <h3 id="cliente-rapido-title">Nuevo cliente</h3>
              <p>Solo CI/NIT y nombre. El carrito actual se mantiene intacto.</p>
            </div>
            <button
              type="button"
              class="panel-modal-close"
              aria-label="Cerrar"
              :disabled="guardandoCliente"
              @click="cerrarModalCliente"
            >
              <i class="fas fa-xmark"></i>
            </button>
          </header>

          <form class="mt-4" @submit.prevent="registrarClienteRapido">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-12">
              <div class="min-w-0 sm:col-span-5">
                <label for="cliente-rapido-ci" class="form-label">
                  CI/NIT <span class="req">*</span>
                </label>
                <input
                  id="cliente-rapido-ci"
                  ref="ciClienteRapidoRef"
                  v-model="formularioCliente.ci_nit"
                  class="form-input"
                  maxlength="20"
                  autocomplete="off"
                  required
                >
              </div>
              <div class="min-w-0 sm:col-span-7">
                <label for="cliente-rapido-nombre" class="form-label">
                  Nombre / Razón social <span class="req">*</span>
                </label>
                <input
                  id="cliente-rapido-nombre"
                  ref="nombreClienteRapidoRef"
                  v-model="formularioCliente.nombre"
                  class="form-input"
                  maxlength="80"
                  autocomplete="off"
                  required
                >
              </div>
            </div>
            <footer class="panel-modal-actions mt-4">
              <button
                type="button"
                class="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-5 py-2.5 text-sm font-bold text-[var(--text-muted)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-55"
                :disabled="guardandoCliente"
                @click="cerrarModalCliente"
              >
                Cancelar
              </button>
              <button type="submit" class="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#2a468b] to-[#3d6ac1] px-5 py-2.5 text-sm font-bold text-[#fff7e3] shadow-md transition hover:from-[#1e356d] hover:to-[#2a468b] disabled:cursor-not-allowed disabled:opacity-55" :disabled="guardandoCliente">
                <span v-if="guardandoCliente" class="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent" role="status" aria-label="Guardando"></span>
                <i v-else class="fas fa-user-plus" aria-hidden="true"></i>
                {{ guardandoCliente ? 'Guardando…' : 'Guardar y asignar' }}
              </button>
            </footer>
          </form>
        </section>
      </div>
    </Teleport>

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
          <button
            type="button"
            class="sale-preview-close"
            aria-label="Cerrar comprobante"
            title="Cerrar"
            @click="cerrarComprobante"
          >
            <i class="fas fa-xmark" aria-hidden="true"></i>
          </button>
          <SaleReceipt :farmacia="farmacia" :venta="ventaCompletada" />
        </section>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.sale-input-group .form-input {
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}

.sale-input-group .form-input:focus {
  border-color: transparent !important;
  box-shadow: none !important;
}

.sale-cart-scroll {
  max-height: min(40vh, 360px);
  overflow-x: auto;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  border-radius: 0.5rem;
}

.sale-cart-scroll thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--bg-card);
  box-shadow: inset 0 -1px 0 var(--border-color);
}

.cliente-autocomplete,
.cliente-search-wrap {
  position: relative;
}

.cliente-suggestions {
  position: absolute;
  top: calc(100% + 0.35rem);
  right: 0;
  left: 0;
  z-index: 30;
  max-height: 16rem;
  overflow-y: auto;
  padding: 0.3rem;
  border: 1px solid var(--border-color);
  border-radius: 0.8rem;
  background: var(--bg-card);
  box-shadow: 0 0.9rem 2rem rgb(15 23 42 / 18%);
}

.cliente-suggestion {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  padding: 0.55rem 0.65rem;
  border: 0;
  border-radius: 0.6rem;
  background: transparent;
  color: inherit;
  text-align: left;
}

.cliente-suggestion:hover,
.cliente-suggestion.is-active {
  background: var(--accent-soft);
}

.cliente-suggestion-icon {
  display: inline-flex;
  flex: 0 0 1.9rem;
  align-items: center;
  justify-content: center;
  width: 1.9rem;
  height: 1.9rem;
  border-radius: 50%;
  background: var(--bg-input);
  color: var(--primary);
  font-size: 0.8rem;
}

.cliente-suggestion-info {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.cliente-suggestion-info strong,
.cliente-suggestion-info small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cliente-suggestion-info strong {
  font-size: 0.9rem;
}

.cliente-suggestion-info small {
  color: var(--text-muted);
  font-size: 0.75rem;
}

.cliente-suggestion-new {
  color: var(--primary);
}

.cliente-suggestion-new .cliente-suggestion-icon {
  background: var(--accent-soft);
}

.cliente-suggestions-empty {
  margin: 0;
  padding: 0.6rem 0.65rem;
  color: var(--text-muted);
  font-size: 0.82rem;
}

.sale-client-current {
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--border-color);
  border-radius: 0.85rem;
  background: var(--bg-input);
}

.sale-client-current.is-empty {
  border-style: dashed;
}

.sale-client-info {
  min-width: 0;
}

.sale-client-label {
  display: block;
  color: var(--text-muted);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.sale-client-current strong {
  font-size: 0.95rem;
}

.sale-client-icon {
  display: inline-flex;
  flex: 0 0 2.2rem;
  align-items: center;
  justify-content: center;
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--primary);
}

.cliente-rapido-modal {
  width: min(100%, 540px);
}

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
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  background: var(--bg-card);
  color: inherit;
  text-align: left;
}

.sale-product-option:hover,
.sale-product-option.is-selected {
  border-color: var(--primary);
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
  color: var(--text-muted);
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
  position: relative;
  width: min(100%, 30rem);
  max-height: calc(100vh - 2rem);
  overflow-y: auto;
  padding: 3.25rem 1rem 1rem;
  border-radius: 0.75rem;
  background: #fff;
  box-shadow: 0 1rem 3rem rgb(0 0 0 / 25%);
}

.sale-preview-close {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 0;
  border-radius: 50%;
  background: rgb(15 23 42 / 78%);
  color: #fff;
  font-size: 0.95rem;
  line-height: 1;
  box-shadow: 0 0.25rem 0.75rem rgb(15 23 42 / 28%);
}

.sale-preview-close:hover {
  background: rgb(15 23 42 / 95%);
}

@media print {
  .sale-preview-backdrop {
    position: static !important;
    inset: auto !important;
    display: block !important;
    overflow: visible !important;
    padding: 0 !important;
    background: transparent !important;
  }

  .sale-preview-dialog {
    position: static !important;
    width: auto !important;
    max-height: none !important;
    overflow: visible !important;
    padding: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  .sale-preview-close {
    display: none !important;
  }
}
</style>
