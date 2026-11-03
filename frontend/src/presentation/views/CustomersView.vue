<script setup>
import { computed, onMounted, ref } from 'vue'
import ToastNotification from '../components/ToastNotification.vue'
import {
  actualizarCliente,
  crearCliente,
  listarClientes
} from '../../data/endpoints/sales'
import { validarCi, validarNombre } from '../validators/fields'

const clientes = ref([])
const cargando = ref(true)
const guardando = ref(false)
const error = ref('')
const notificacion = ref('')
const tonoNotificacion = ref('success')
const busqueda = ref('')
const modalAbierto = ref(false)
const editando = ref(false)
const clienteId = ref(null)
const form = ref({})

const formularioInicial = () => ({
  nombres: '',
  apellido_paterno: '',
  apellido_materno: '',
  ci_nit: '',
  telefono: '',
  domicilio: ''
})

const clientesFiltrados = computed(() => {
  const termino = busqueda.value.trim().toLocaleLowerCase()
  if (!termino) return clientes.value
  return clientes.value.filter((cliente) => [
    cliente.nombres,
    cliente.apellido_paterno,
    cliente.apellido_materno,
    cliente.ci_nit,
    cliente.telefono
  ].some((valor) => String(valor || '').toLocaleLowerCase().includes(termino)))
})

const nombreCliente = (cliente) => [
  cliente.nombres,
  cliente.apellido_paterno,
  cliente.apellido_materno
].filter(Boolean).join(' ')

const cargarClientes = async () => {
  cargando.value = true
  error.value = ''
  try {
    clientes.value = await listarClientes()
  } catch (err) {
    error.value = err.message || 'No se pudieron cargar los clientes.'
  } finally {
    cargando.value = false
  }
}

const abrirNuevo = () => {
  editando.value = false
  clienteId.value = null
  form.value = formularioInicial()
  modalAbierto.value = true
}

const abrirEdicion = (cliente) => {
  editando.value = true
  clienteId.value = cliente.id_cliente
  form.value = {
    nombres: cliente.nombres || '',
    apellido_paterno: cliente.apellido_paterno || '',
    apellido_materno: cliente.apellido_materno || '',
    ci_nit: cliente.ci_nit || '',
    telefono: cliente.telefono || '',
    domicilio: cliente.domicilio || ''
  }
  modalAbierto.value = true
}

const validar = () => {
  const errorNombres = validarNombre(form.value.nombres, { etiqueta: 'Los nombres', max: 80 })
  if (errorNombres) return errorNombres
  const errorPaterno = validarNombre(form.value.apellido_paterno, { etiqueta: 'El apellido paterno', max: 60 })
  if (errorPaterno) return errorPaterno
  const errorMaterno = validarNombre(form.value.apellido_materno, {
    etiqueta: 'El apellido materno',
    requerido: false,
    max: 60
  })
  if (errorMaterno) return errorMaterno
  const errorCi = validarCi(form.value.ci_nit)
  if (errorCi) return errorCi
  if (form.value.telefono && !/^[0-9+()\s-]{7,20}$/.test(form.value.telefono.trim())) {
    return 'Ingresa un teléfono válido.'
  }
  if (form.value.domicilio.length > 150) return 'El domicilio no puede superar 150 caracteres.'
  return ''
}

const guardarCliente = async () => {
  const mensaje = validar()
  if (mensaje) {
    notificacion.value = mensaje
    tonoNotificacion.value = 'error'
    return
  }
  guardando.value = true
  try {
    const datos = {
      ...form.value,
      nombres: form.value.nombres.trim(),
      apellido_paterno: form.value.apellido_paterno.trim(),
      apellido_materno: form.value.apellido_materno.trim(),
      ci_nit: form.value.ci_nit.trim()
    }
    if (editando.value) await actualizarCliente(clienteId.value, datos)
    else await crearCliente(datos)
    modalAbierto.value = false
    notificacion.value = editando.value
      ? 'Cliente actualizado correctamente.'
      : 'Cliente registrado correctamente.'
    tonoNotificacion.value = 'success'
    await cargarClientes()
  } catch (err) {
    notificacion.value = err.message || 'No se pudo guardar el cliente.'
    tonoNotificacion.value = 'error'
  } finally {
    guardando.value = false
  }
}

onMounted(cargarClientes)
</script>

<template>
  <section class="customers-page px-1">
    <ToastNotification
      :message="notificacion"
      :tone="tonoNotificacion"
      @close="notificacion = ''"
    />

    <header class="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
      <div>
        <span class="eyebrow">Atención al cliente · Rodrigo Marca</span>
        <h1 class="h3 fw-bold mb-1">Clientes</h1>
        <p class="text-muted mb-0">Registra y actualiza datos para las ventas y comprobantes.</p>
      </div>
      <div class="d-flex gap-2">
        <router-link to="/ventas" class="btn btn-outline-primary rounded-pill px-4">
          <i class="fas fa-cash-register me-2"></i>Punto de venta
        </router-link>
        <button class="btn btn-primary rounded-pill px-4" @click="abrirNuevo">
          <i class="fas fa-user-plus me-2"></i>Nuevo cliente
        </button>
      </div>
    </header>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>

    <article class="card border-0 shadow-sm">
      <div class="card-body p-4">
        <div class="row align-items-end g-3 mb-3">
          <div class="col-md-7">
            <label for="buscar-cliente" class="form-label">Buscar cliente</label>
            <input id="buscar-cliente" v-model="busqueda" class="form-control" placeholder="Nombre, CI/NIT o teléfono">
          </div>
          <div class="col-md text-md-end text-muted small">
            {{ clientesFiltrados.length }} cliente(s)
          </div>
        </div>

        <div v-if="cargando" class="text-muted py-4 text-center">Cargando clientes…</div>
        <div v-else-if="clientesFiltrados.length === 0" class="text-muted py-5 text-center">
          <i class="fas fa-address-book fs-2 mb-2"></i>
          <p class="mb-0">{{ busqueda ? 'No hay resultados para la búsqueda.' : 'Aún no hay clientes registrados.' }}</p>
        </div>
        <div v-else class="table-responsive">
          <table class="table align-middle">
            <thead>
              <tr><th>Nombre completo</th><th>CI/NIT</th><th>Teléfono</th><th>Domicilio</th><th class="text-end">Acciones</th></tr>
            </thead>
            <tbody>
              <tr v-for="cliente in clientesFiltrados" :key="cliente.id_cliente">
                <td class="fw-semibold">{{ nombreCliente(cliente) }}</td>
                <td>{{ cliente.ci_nit }}</td>
                <td>{{ cliente.telefono || '—' }}</td>
                <td>{{ cliente.domicilio || '—' }}</td>
                <td class="text-end">
                  <button class="btn btn-sm btn-outline-primary" @click="abrirEdicion(cliente)">
                    <i class="fas fa-pen me-1"></i>Editar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </article>

    <div v-if="modalAbierto" class="panel-modal-backdrop" @click.self="modalAbierto = false">
      <section class="panel-modal customer-modal" role="dialog" aria-modal="true" aria-labelledby="cliente-modal-title">
        <header class="panel-modal-head">
          <div>
            <span class="eyebrow">Clientes</span>
            <h2 id="cliente-modal-title" class="h5 fw-bold mb-0">{{ editando ? 'Editar cliente' : 'Registrar cliente' }}</h2>
          </div>
          <button class="panel-modal-close" aria-label="Cerrar" @click="modalAbierto = false">
            <i class="fas fa-xmark"></i>
          </button>
        </header>
        <form class="p-4" @submit.prevent="guardarCliente">
          <div class="row g-3">
            <div class="col-12">
              <label for="cliente-nombres" class="form-label">Nombres <span class="text-danger">*</span></label>
              <input id="cliente-nombres" v-model="form.nombres" class="form-control" maxlength="80" required>
            </div>
            <div class="col-md-6">
              <label for="cliente-apellido-paterno" class="form-label">Apellido paterno <span class="text-danger">*</span></label>
              <input id="cliente-apellido-paterno" v-model="form.apellido_paterno" class="form-control" maxlength="60" required>
            </div>
            <div class="col-md-6">
              <label for="cliente-apellido-materno" class="form-label">Apellido materno</label>
              <input id="cliente-apellido-materno" v-model="form.apellido_materno" class="form-control" maxlength="60">
            </div>
            <div class="col-md-6">
              <label for="cliente-ci-nit" class="form-label">CI/NIT <span class="text-danger">*</span></label>
              <input id="cliente-ci-nit" v-model="form.ci_nit" class="form-control" maxlength="20" required>
            </div>
            <div class="col-md-6">
              <label for="cliente-telefono" class="form-label">Teléfono</label>
              <input id="cliente-telefono" v-model="form.telefono" class="form-control" maxlength="20">
            </div>
            <div class="col-12">
              <label for="cliente-domicilio" class="form-label">Domicilio</label>
              <input id="cliente-domicilio" v-model="form.domicilio" class="form-control" maxlength="150">
            </div>
          </div>
          <footer class="panel-modal-actions mt-4">
            <button type="button" class="btn btn-light rounded-pill px-4" @click="modalAbierto = false">Cancelar</button>
            <button type="submit" class="btn btn-primary rounded-pill px-4" :disabled="guardando">
              {{ guardando ? 'Guardando…' : 'Guardar cliente' }}
            </button>
          </footer>
        </form>
      </section>
    </div>
  </section>
</template>

<style scoped>
.customer-modal {
  width: min(620px, calc(100vw - 2rem));
}
</style>
