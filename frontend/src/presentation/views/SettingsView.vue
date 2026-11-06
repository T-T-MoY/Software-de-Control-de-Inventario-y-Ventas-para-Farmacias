<script setup>
import { onMounted, reactive, ref } from 'vue'
import ToastNotification from '../components/ToastNotification.vue'
import {
  actualizarParametros,
  obtenerParametros
} from '../../data/endpoints/parameters'

const cargando = ref(true)
const guardando = ref(false)
const error = ref('')
const notificacion = ref('')
const tonoNotificacion = ref('success')
const errores = ref({})

const form = reactive({
  margenAlertaDias: 30,
  stockSeguridad: 0,
  diasReposicion: 5,
  ventanaDemandaDias: 30,
  farmacia: {
    nombre: '',
    nit: '',
    direccion: '',
    telefono: ''
  }
})

const aplicarRespuesta = (datos = {}) => {
  form.margenAlertaDias = Number(datos.margenAlertaDias) || 0
  form.stockSeguridad = Number(datos.stockSeguridad) || 0
  form.diasReposicion = Number(datos.diasReposicion) || 1
  form.ventanaDemandaDias = Number(datos.ventanaDemandaDias) || 1

  const farmacia = datos.farmacia || {}
  form.farmacia.nombre = farmacia.nombre || ''
  form.farmacia.nit = farmacia.nit || ''
  form.farmacia.direccion = farmacia.direccion || ''
  form.farmacia.telefono = farmacia.telefono || ''
}

const notificar = (mensaje, tono = 'success') => {
  notificacion.value = mensaje
  tonoNotificacion.value = tono
}

const cargar = async () => {
  cargando.value = true
  error.value = ''
  errores.value = {}

  try {
    aplicarRespuesta(await obtenerParametros())
  } catch (err) {
    error.value = err.message || 'No se pudo cargar la configuración.'
  } finally {
    cargando.value = false
  }
}

const enteroEnRango = (valor, minimo, maximo) => {
  const numero = Number(valor)
  return Number.isInteger(numero) && numero >= minimo && numero <= maximo
}

const validar = () => {
  const nuevos = {}
  const telefono = form.farmacia.telefono.trim()

  if (!form.farmacia.nombre.trim()) {
    nuevos.nombre = 'Ingresa el nombre de la farmacia.'
  } else if (form.farmacia.nombre.trim().length > 120) {
    nuevos.nombre = 'El nombre no puede superar 120 caracteres.'
  }

  if (form.farmacia.nit.length > 30) {
    nuevos.nit = 'El NIT no puede superar 30 caracteres.'
  }

  if (form.farmacia.direccion.length > 150) {
    nuevos.direccion = 'La dirección no puede superar 150 caracteres.'
  }

  if (telefono && !/^[0-9+()\s-]{7,20}$/.test(telefono)) {
    nuevos.telefono = 'Ingresa un teléfono válido de hasta 20 caracteres.'
  }

  if (!enteroEnRango(form.margenAlertaDias, 0, 365)) {
    nuevos.margenAlertaDias = 'Usa un entero entre 0 y 365 días.'
  }

  if (!enteroEnRango(form.stockSeguridad, 0, 100000)) {
    nuevos.stockSeguridad = 'Usa un entero entre 0 y 100000.'
  }

  if (!enteroEnRango(form.diasReposicion, 1, 365)) {
    nuevos.diasReposicion = 'Usa un entero entre 1 y 365 días.'
  }

  if (!enteroEnRango(form.ventanaDemandaDias, 1, 365)) {
    nuevos.ventanaDemandaDias = 'Usa un entero entre 1 y 365 días.'
  }

  errores.value = nuevos
  return Object.keys(nuevos).length === 0
}

const limpiarError = (campo) => {
  if (!errores.value[campo]) return
  const { [campo]: _, ...resto } = errores.value
  errores.value = resto
}

const guardar = async () => {
  error.value = ''

  if (!validar()) {
    notificar('Revisa los campos marcados antes de guardar.', 'error')
    return
  }

  guardando.value = true

  try {
    const datos = await actualizarParametros({
      margenAlertaDias: Number(form.margenAlertaDias),
      stockSeguridad: Number(form.stockSeguridad),
      diasReposicion: Number(form.diasReposicion),
      ventanaDemandaDias: Number(form.ventanaDemandaDias),
      farmacia: {
        nombre: form.farmacia.nombre.trim(),
        nit: form.farmacia.nit.trim(),
        direccion: form.farmacia.direccion.trim(),
        telefono: form.farmacia.telefono.trim()
      }
    })

    aplicarRespuesta(datos)
    notificar('Configuración guardada. Los cambios ya están activos.')
  } catch (err) {
    notificar(err.message || 'No se pudo guardar la configuración.', 'error')
  } finally {
    guardando.value = false
  }
}

onMounted(cargar)
</script>

<template>
  <section class="admin-panel">
    <div class="panel-heading">
      <div>
        <span class="eyebrow">Administración</span>
        <h2>Configuración</h2>
        <p>Parámetros generales del sistema y datos de la farmacia.</p>
      </div>

      <div class="panel-heading-actions">
        <button
          type="button"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-5 py-2.5 text-sm font-bold text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-55"
          :disabled="cargando || guardando"
          @click="cargar"
        >
          <i class="fas fa-rotate-left" aria-hidden="true"></i>
          Descartar cambios
        </button>

        <button
          type="button"
          class="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#2a468b] to-[#3d6ac1] px-5 py-2.5 text-sm font-bold text-[#fff7e3] shadow-md transition hover:from-[#1e356d] hover:to-[#2a468b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-55"
          :disabled="cargando || guardando"
          @click="guardar"
        >
          <span v-if="guardando" class="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent" role="status" aria-label="Guardando"></span>
          <i v-else class="fas fa-floppy-disk" aria-hidden="true"></i>
          {{ guardando ? 'Guardando…' : 'Guardar cambios' }}
        </button>
      </div>
    </div>

    <div v-if="error" class="notice notice-error" role="alert">
      <span class="flex items-start gap-2"><i class="fas fa-circle-exclamation mt-0.5 shrink-0" aria-hidden="true"></i>{{ error }}</span>
    </div>

    <div v-if="cargando" class="panel-state" role="status">
      <span class="mr-2 inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent align-[-0.2em]" aria-hidden="true"></span>
      Cargando configuración…
    </div>

    <template v-else>
      <div class="mb-4 flex items-start gap-3 rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent-soft)] p-4 text-sm leading-relaxed text-[var(--text-accent)] sm:p-5">
        <i class="fas fa-circle-info mt-0.5 shrink-0" aria-hidden="true"></i>
        <p class="m-0">
          Los cambios se aplican de inmediato. El margen afecta a las alertas de
          vencimiento; los días de reposición y el stock de seguridad se usan
          como valores iniciales en medicamentos nuevos; y los datos de la
          farmacia se imprimen en el comprobante de venta.
        </p>
      </div>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <!-- DATOS DE LA FARMACIA -->
        <article class="panel">
          <div class="panel-title-bar">
            <h3><i class="fas fa-store mr-2" aria-hidden="true"></i>Datos de la farmacia</h3>
            <small>Aparecen en el encabezado del comprobante.</small>
          </div>

          <div class="p-4 sm:p-6">
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div class="md:col-span-2">
                <label for="config-nombre" class="form-label">
                  Nombre <span class="req">*</span>
                </label>
                <input
                  id="config-nombre"
                  v-model="form.farmacia.nombre"
                  class="form-input"
                  :class="{ 'has-error': errores.nombre }"
                  maxlength="120"
                  @input="limpiarError('nombre')"
                >
                <p v-if="errores.nombre" class="error-text">
                  <i class="fas fa-circle-exclamation"></i>{{ errores.nombre }}
                </p>
              </div>

              <div>
                <label for="config-nit" class="form-label">NIT</label>
                <input
                  id="config-nit"
                  v-model="form.farmacia.nit"
                  class="form-input"
                  :class="{ 'has-error': errores.nit }"
                  maxlength="30"
                  @input="limpiarError('nit')"
                >
                <p v-if="errores.nit" class="error-text">
                  <i class="fas fa-circle-exclamation"></i>{{ errores.nit }}
                </p>
              </div>

              <div>
                <label for="config-telefono" class="form-label">Teléfono</label>
                <input
                  id="config-telefono"
                  v-model="form.farmacia.telefono"
                  class="form-input"
                  :class="{ 'has-error': errores.telefono }"
                  maxlength="20"
                  @input="limpiarError('telefono')"
                >
                <p v-if="errores.telefono" class="error-text">
                  <i class="fas fa-circle-exclamation"></i>{{ errores.telefono }}
                </p>
              </div>

              <div class="md:col-span-2">
                <label for="config-direccion" class="form-label">Dirección</label>
                <input
                  id="config-direccion"
                  v-model="form.farmacia.direccion"
                  class="form-input"
                  :class="{ 'has-error': errores.direccion }"
                  maxlength="150"
                  @input="limpiarError('direccion')"
                >
                <p v-if="errores.direccion" class="error-text">
                  <i class="fas fa-circle-exclamation"></i>{{ errores.direccion }}
                </p>
              </div>
            </div>
          </div>
        </article>

        <!-- PARÁMETROS DE INVENTARIO Y ALERTAS -->
        <article class="panel">
          <div class="panel-title-bar">
            <h3><i class="fas fa-sliders mr-2" aria-hidden="true"></i>Inventario y alertas</h3>
            <small>Valores por defecto para el catálogo y los avisos.</small>
          </div>

          <div class="p-4 sm:p-6">
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label for="config-margen" class="form-label">
                  Margen de alerta (días) <span class="req">*</span>
                </label>
                <input
                  id="config-margen"
                  v-model.number="form.margenAlertaDias"
                  type="number"
                  min="0"
                  max="365"
                  class="form-input"
                  :class="{ 'has-error': errores.margenAlertaDias }"
                  @input="limpiarError('margenAlertaDias')"
                >
                <p v-if="errores.margenAlertaDias" class="error-text">
                  <i class="fas fa-circle-exclamation"></i>{{ errores.margenAlertaDias }}
                </p>
                <p v-else class="field-hint">Días de anticipación del aviso de vencimiento.</p>
              </div>

              <div>
                <label for="config-ventana" class="form-label">
                  Ventana de demanda (días) <span class="req">*</span>
                </label>
                <input
                  id="config-ventana"
                  v-model.number="form.ventanaDemandaDias"
                  type="number"
                  min="1"
                  max="365"
                  class="form-input"
                  :class="{ 'has-error': errores.ventanaDemandaDias }"
                  @input="limpiarError('ventanaDemandaDias')"
                >
                <p v-if="errores.ventanaDemandaDias" class="error-text">
                  <i class="fas fa-circle-exclamation"></i>{{ errores.ventanaDemandaDias }}
                </p>
                <p v-else class="field-hint">Periodo para calcular la demanda diaria promedio.</p>
              </div>

              <div>
                <label for="config-stock" class="form-label">
                  Stock de seguridad <span class="req">*</span>
                </label>
                <input
                  id="config-stock"
                  v-model.number="form.stockSeguridad"
                  type="number"
                  min="0"
                  max="100000"
                  class="form-input"
                  :class="{ 'has-error': errores.stockSeguridad }"
                  @input="limpiarError('stockSeguridad')"
                >
                <p v-if="errores.stockSeguridad" class="error-text">
                  <i class="fas fa-circle-exclamation"></i>{{ errores.stockSeguridad }}
                </p>
                <p v-else class="field-hint">Valor inicial para medicamentos nuevos.</p>
              </div>

              <div>
                <label for="config-reposicion" class="form-label">
                  Días de reposición <span class="req">*</span>
                </label>
                <input
                  id="config-reposicion"
                  v-model.number="form.diasReposicion"
                  type="number"
                  min="1"
                  max="365"
                  class="form-input"
                  :class="{ 'has-error': errores.diasReposicion }"
                  @input="limpiarError('diasReposicion')"
                >
                <p v-if="errores.diasReposicion" class="error-text">
                  <i class="fas fa-circle-exclamation"></i>{{ errores.diasReposicion }}
                </p>
                <p v-else class="field-hint">Valor inicial para medicamentos nuevos (mínimo 1).</p>
              </div>
            </div>
          </div>
        </article>
      </div>
    </template>

    <ToastNotification
      :message="notificacion"
      :tone="tonoNotificacion"
      @close="notificacion = ''"
    />
  </section>
</template>

<style scoped>
.field-hint {
  margin: 0.35rem 0 0;
  color: var(--text-soft);
  font-size: 0.75rem;
  line-height: 1.4;
}

</style>
