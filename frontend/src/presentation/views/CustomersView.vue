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
  ci_nit: ''
})

const clientesFiltrados = computed(() => {
  const termino = busqueda.value.trim().toLocaleLowerCase()
  if (!termino) return clientes.value
  return clientes.value.filter((cliente) => [
    cliente.nombres,
    cliente.apellido_paterno,
    cliente.apellido_materno,
    cliente.ci_nit
  ].some((valor) => String(valor || '').toLocaleLowerCase().includes(termino)))
})

const nombreCliente = (cliente) => [
  cliente.nombres,
  cliente.apellido_paterno,
  cliente.apellido_materno
].filter(Boolean).join(' ')

const inicialesCliente = (cliente) => nombreCliente(cliente)
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((parte) => parte[0])
  .join('')
  .toLocaleUpperCase()

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

const cerrarModal = () => {
  if (guardando.value) return
  modalAbierto.value = false
}

const abrirEdicion = (cliente) => {
  editando.value = true
  clienteId.value = cliente.id_cliente
  form.value = {
    nombres: cliente.nombres || '',
    apellido_paterno: cliente.apellido_paterno || '',
    apellido_materno: cliente.apellido_materno || '',
    ci_nit: cliente.ci_nit || ''
  }
  modalAbierto.value = true
}

const validar = () => {
  const errorNombres = validarNombre(form.value.nombres, { etiqueta: 'Los nombres', max: 80 })
  if (errorNombres) return errorNombres
  const errorPaterno = validarNombre(form.value.apellido_paterno, {
    etiqueta: 'El apellido paterno',
    requerido: false,
    max: 60
  })
  if (errorPaterno) return errorPaterno
  const errorMaterno = validarNombre(form.value.apellido_materno, {
    etiqueta: 'El apellido materno',
    requerido: false,
    max: 60
  })
  if (errorMaterno) return errorMaterno
  const errorCi = validarCi(form.value.ci_nit)
  if (errorCi) return errorCi
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

    <header class="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <span class="eyebrow">Atención al cliente</span>
        <h1 class="mb-1 text-2xl font-extrabold text-[var(--text-main)] sm:text-3xl">Clientes</h1>
        <p class="mb-0 text-sm text-[var(--text-muted)]">Registra y actualiza datos para las ventas y comprobantes.</p>
      </div>
      <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <router-link
          to="/ventas"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-5 py-2.5 text-sm font-bold text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          <i class="fas fa-cash-register" aria-hidden="true"></i>Punto de venta
        </router-link>
        <button
          type="button"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#2a468b] to-[#3d6ac1] px-5 py-2.5 text-sm font-bold text-[#fff7e3] shadow-md transition hover:from-[#1e356d] hover:to-[#2a468b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          @click="abrirNuevo"
        >
          <i class="fas fa-user-plus" aria-hidden="true"></i>Nuevo cliente
        </button>
      </div>
    </header>

    <div v-if="error" class="notice notice-error mb-4" role="alert">
      <span class="flex items-start gap-2">
        <i class="fas fa-circle-exclamation mt-0.5 shrink-0" aria-hidden="true"></i>{{ error }}
      </span>
    </div>

    <article class="panel overflow-hidden">
      <div class="p-4 sm:p-6">
        <div class="mb-4 grid grid-cols-1 items-end gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div class="min-w-0">
            <label for="buscar-cliente" class="form-label">Buscar cliente</label>
            <input
              id="buscar-cliente"
              v-model="busqueda"
              class="form-input"
              type="search"
              placeholder="Nombre o CI/NIT"
              autocomplete="off"
            >
          </div>
          <div class="text-sm text-[var(--text-muted)] md:text-right">
            {{ clientesFiltrados.length }} cliente(s)
          </div>
        </div>

        <div v-if="cargando" class="panel-state" role="status">
          <span class="mr-2 inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent align-[-0.2em]" aria-hidden="true"></span>
          Cargando clientes…
        </div>
        <div v-else-if="error" class="panel-state is-error" role="status">
          No fue posible cargar la lista de clientes.
        </div>
        <div v-else-if="clientesFiltrados.length === 0" class="panel-state">
          <i class="fas fa-address-book mb-2 block text-2xl" aria-hidden="true"></i>
          {{ busqueda ? 'No hay resultados para la búsqueda.' : 'Aún no hay clientes registrados.' }}
        </div>
        <template v-else>
          <div class="panel-table-wrap">
          <table class="panel-table">
            <thead>
              <tr><th>Nombre completo</th><th>CI/NIT</th><th class="customer-actions">Acciones</th></tr>
            </thead>
            <tbody>
              <tr v-for="cliente in clientesFiltrados" :key="cliente.id_cliente">
                <td class="font-semibold">{{ nombreCliente(cliente) }}</td>
                <td>{{ cliente.ci_nit }}</td>
                <td class="customer-actions">
                  <button
                    type="button"
                    class="btn-row ml-auto max-w-28"
                    @click="abrirEdicion(cliente)"
                  >
                    <i class="fas fa-pen mr-1" aria-hidden="true"></i>Editar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          </div>
          <div class="mobile-list">
            <article
              v-for="cliente in clientesFiltrados"
              :key="`movil-${cliente.id_cliente}`"
              class="mobile-card"
            >
              <div class="mobile-card-head">
                <span class="avatar-soft" aria-hidden="true">
                  {{ inicialesCliente(cliente) }}
                </span>
                <div class="mobile-card-title">
                  <h4>{{ nombreCliente(cliente) }}</h4>
                  <p>CI/NIT: {{ cliente.ci_nit }}</p>
                </div>
              </div>
              <div class="mobile-actions">
                <button type="button" class="btn-row" @click="abrirEdicion(cliente)">
                  <i class="fas fa-pen mr-1" aria-hidden="true"></i>Editar cliente
                </button>
              </div>
            </article>
          </div>
        </template>
      </div>
    </article>

    <div v-if="modalAbierto" class="panel-modal-backdrop" @click.self="cerrarModal">
      <section class="panel-modal customer-modal" role="dialog" aria-modal="true" aria-labelledby="cliente-modal-title">
        <header class="panel-modal-head">
          <div>
            <span class="eyebrow">Clientes</span>
            <h2 id="cliente-modal-title" class="mb-0 text-lg font-extrabold">{{ editando ? 'Editar cliente' : 'Registrar cliente' }}</h2>
          </div>
          <button
            type="button"
            class="panel-modal-close"
            aria-label="Cerrar"
            :disabled="guardando"
            @click="cerrarModal"
          >
            <i class="fas fa-xmark" aria-hidden="true"></i>
          </button>
        </header>
        <form class="p-4 pt-3 sm:p-6" @submit.prevent="guardarCliente">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div class="md:col-span-2">
              <label for="cliente-nombres" class="form-label">Nombres <span class="req">*</span></label>
              <input id="cliente-nombres" v-model="form.nombres" class="form-input" maxlength="80" autocomplete="given-name" required>
            </div>
            <div>
              <label for="cliente-apellido-paterno" class="form-label">Apellido paterno</label>
              <input id="cliente-apellido-paterno" v-model="form.apellido_paterno" class="form-input" maxlength="60" autocomplete="family-name">
            </div>
            <div>
              <label for="cliente-apellido-materno" class="form-label">Apellido materno</label>
              <input id="cliente-apellido-materno" v-model="form.apellido_materno" class="form-input" maxlength="60" autocomplete="additional-name">
            </div>
            <div>
              <label for="cliente-ci-nit" class="form-label">CI/NIT <span class="req">*</span></label>
              <input id="cliente-ci-nit" v-model="form.ci_nit" class="form-input" maxlength="20" autocomplete="off" required>
            </div>
          </div>
          <footer class="panel-modal-actions">
            <button
              type="button"
              class="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-5 py-2.5 text-sm font-bold text-[var(--text-muted)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-55"
              :disabled="guardando"
              @click="cerrarModal"
            >Cancelar</button>
            <button
              type="submit"
              class="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#2a468b] to-[#3d6ac1] px-5 py-2.5 text-sm font-bold text-[#fff7e3] shadow-md transition hover:from-[#1e356d] hover:to-[#2a468b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-55"
              :disabled="guardando"
            >
              <span v-if="guardando" class="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent" role="status" aria-label="Guardando"></span>
              {{ guardando ? 'Guardando…' : 'Guardar cliente' }}
            </button>
          </footer>
        </form>
      </section>
    </div>
  </section>
</template>

<style scoped>
.customer-actions {
  text-align: center;
}

.customer-modal {
  width: min(620px, calc(100vw - 2rem));
}
</style>
