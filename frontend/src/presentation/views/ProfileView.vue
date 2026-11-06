<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  cambiarContrasena as cambiarContrasenaApi,
  obtenerPerfil
} from '../../data/endpoints/profile'
import {
  formatearFecha,
  iniciales as inicialesDeUsuario,
  nombreCompleto as nombreCompletoDe
} from '../../business/format'
import { cerrarSesion } from '../../business/session'
import {
  limpiarContrasena,
  validarConfirmacion,
  validarContrasena
} from '../validators/fields'

defineProps({
  profileMenuOpen: { type: Boolean, default: false }
})

const router = useRouter()
const perfil = ref(null)
const loading = ref(true)
const error = ref('')

const iniciales = computed(() => inicialesDeUsuario(perfil.value))

const nombreCompleto = computed(() => nombreCompletoDe(perfil.value) || 'Usuario')

// Datos que no aparecen en la cabecera del perfil.
const datos = computed(() => {
  if (!perfil.value) return []
  return [
    { label: 'CI / NIT', value: perfil.value.ci, icon: 'fa-id-card' },
    { label: 'Fecha de nacimiento', value: formatearFecha(perfil.value.fecha_nacimiento), icon: 'fa-cake-candles' },
    { label: 'Miembro desde', value: formatearFecha(perfil.value.fecha_registro, true), icon: 'fa-calendar-check' }
  ]
})

const cargarPerfil = async () => {
  loading.value = true
  error.value = ''
  try {
    perfil.value = await obtenerPerfil()
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      cerrarSesion()
      await router.replace({ name: 'login' })
      return
    }
    error.value = err.message
  } finally {
    loading.value = false
  }
}

// =====================================================
// CAMBIO DE CONTRASEÑA DEL USUARIO AUTENTICADO
// =====================================================
const formContrasena = reactive({
  actual: '',
  nueva: '',
  confirmacion: ''
})
const erroresContrasena = ref({})
const guardandoContrasena = ref(false)
const mensajeContrasena = ref('')
const errorContrasena = ref('')

const validarCampoContrasena = (campo) => {
  if (campo === 'actual') {
    erroresContrasena.value.actual = formContrasena.actual
      ? ''
      : 'Ingresa tu contraseña actual.'
    return
  }
  if (campo === 'nueva') {
    erroresContrasena.value.nueva = validarContrasena(formContrasena.nueva, { min: 6 })
    return
  }
  erroresContrasena.value.confirmacion = validarConfirmacion(
    formContrasena.confirmacion,
    formContrasena.nueva
  )
}

const alEscribirContrasena = (campo) => {
  formContrasena[campo] = limpiarContrasena(formContrasena[campo])
  mensajeContrasena.value = ''
  errorContrasena.value = ''
  if (erroresContrasena.value[campo]) validarCampoContrasena(campo)
}

const enviarCambioContrasena = async () => {
  mensajeContrasena.value = ''
  errorContrasena.value = ''
  validarCampoContrasena('actual')
  validarCampoContrasena('nueva')
  validarCampoContrasena('confirmacion')

  if (Object.values(erroresContrasena.value).some(Boolean)) return

  guardandoContrasena.value = true
  try {
    await cambiarContrasenaApi({
      contrasena_actual: formContrasena.actual,
      contrasena_nueva: formContrasena.nueva
    })
    formContrasena.actual = ''
    formContrasena.nueva = ''
    formContrasena.confirmacion = ''
    erroresContrasena.value = {}
    mensajeContrasena.value = 'Tu contraseña se actualizó correctamente.'
  } catch (err) {
    if (err.status === 401) {
      cerrarSesion()
      await router.replace({ name: 'login' })
      return
    }
    errorContrasena.value = err.message
  } finally {
    guardandoContrasena.value = false
  }
}

onMounted(cargarPerfil)
</script>

<template>
  <section class="px-1">
    <div
      v-if="loading"
      class="flex items-center justify-center gap-3 py-12 text-sm text-[var(--text-muted)]"
      role="status"
      aria-live="polite"
    >
      <span
        class="size-5 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--primary)]"
        aria-hidden="true"
      ></span>
      <span>Cargando perfil...</span>
    </div>

    <div
      v-else-if="error"
      class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--danger)]/25 bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger)]"
      role="alert"
    >
      <span class="flex min-w-0 items-start gap-2">
        <i class="fas fa-circle-exclamation mt-0.5 shrink-0" aria-hidden="true"></i>
        {{ error }}
      </span>
      <button
        type="button"
        class="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 text-sm font-bold text-[var(--text-main)] transition hover:bg-[var(--accent-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        @click="cargarPerfil"
      >
        Reintentar
      </button>
    </div>

    <template v-else-if="perfil">
      <!-- Cabecera: identidad, rol, correo y estado -->
      <article class="profile-hero">
        <div class="profile-glow" aria-hidden="true"></div>
        <div class="profile-hero-content relative z-10 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 sm:gap-5 lg:grid-cols-[auto_minmax(0,1fr)_auto]">
          <span class="profile-avatar">{{ iniciales }}</span>
          <div class="profile-identity min-w-0 flex-1">
            <span class="profile-role">
              <i class="fas fa-shield-halved" aria-hidden="true"></i>
              {{ perfil.nombre_rol }}
            </span>
            <h3 class="profile-name break-words">{{ nombreCompleto }}</h3>
            <p class="profile-email mb-0 break-all">
              <i class="fas fa-envelope mr-2" aria-hidden="true"></i>{{ perfil.correo }}
            </p>
          </div>
          <div class="profile-hero-actions relative z-10 col-span-2 flex w-full flex-wrap items-center gap-2 sm:w-auto lg:col-span-1 lg:justify-self-end">
            <span class="profile-status transition-opacity" :class="{ 'invisible opacity-0': profileMenuOpen }">
              <span class="status-dot"></span>
              {{ perfil.estado_cuenta }}
            </span>
          </div>
        </div>
      </article>

      <!-- Datos personales (sin repetir rol, correo ni estado) -->
      <div class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div v-for="dato in datos" :key="dato.label">
          <article class="h-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 shadow-sm">
            <div class="flex h-full items-center gap-3">
              <span class="data-icon">
                <i class="fas" :class="dato.icon" aria-hidden="true"></i>
              </span>
              <div class="min-w-0">
                <div class="data-label">{{ dato.label }}</div>
                <div class="data-value truncate" :title="dato.value">{{ dato.value }}</div>
              </div>
            </div>
          </article>
        </div>
      </div>

      <!-- Cambio de contraseña -->
      <article class="mt-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-4 shadow-sm sm:p-6">
        <div>
          <h3 class="mb-1 text-base font-bold">Cambiar contraseña</h3>
          <p class="mb-4 text-sm text-[var(--text-muted)]">
            Mínimo 6 caracteres, con al menos una letra y un número.
          </p>

          <form novalidate @submit.prevent="enviarCambioContrasena">
            <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label class="form-label" for="perfil-contrasena-actual">
                  Contraseña actual <span class="req">*</span>
                </label>
                <input
                  id="perfil-contrasena-actual"
                  v-model="formContrasena.actual"
                  class="form-input"
                  :class="{ 'has-error': erroresContrasena.actual }"
                  type="password"
                  autocomplete="current-password"
                  maxlength="72"
                  :aria-invalid="Boolean(erroresContrasena.actual)"
                  @input="alEscribirContrasena('actual')"
                  @blur="validarCampoContrasena('actual')"
                >
                <p class="error-text" role="alert">
                  <template v-if="erroresContrasena.actual">
                    <i class="fas fa-circle-exclamation"></i>{{ erroresContrasena.actual }}
                  </template>
                </p>
              </div>

              <div>
                <label class="form-label" for="perfil-contrasena-nueva">
                  Nueva contraseña <span class="req">*</span>
                </label>
                <input
                  id="perfil-contrasena-nueva"
                  v-model="formContrasena.nueva"
                  class="form-input"
                  :class="{ 'has-error': erroresContrasena.nueva }"
                  type="password"
                  autocomplete="new-password"
                  maxlength="72"
                  placeholder="Mínimo 6 caracteres"
                  :aria-invalid="Boolean(erroresContrasena.nueva)"
                  @input="alEscribirContrasena('nueva')"
                  @blur="validarCampoContrasena('nueva')"
                >
                <p class="error-text" role="alert">
                  <template v-if="erroresContrasena.nueva">
                    <i class="fas fa-circle-exclamation"></i>{{ erroresContrasena.nueva }}
                  </template>
                </p>
              </div>

              <div>
                <label class="form-label" for="perfil-contrasena-confirmacion">
                  Confirmar nueva contraseña <span class="req">*</span>
                </label>
                <input
                  id="perfil-contrasena-confirmacion"
                  v-model="formContrasena.confirmacion"
                  class="form-input"
                  :class="{ 'has-error': erroresContrasena.confirmacion }"
                  type="password"
                  autocomplete="new-password"
                  maxlength="72"
                  :aria-invalid="Boolean(erroresContrasena.confirmacion)"
                  @input="alEscribirContrasena('confirmacion')"
                  @blur="validarCampoContrasena('confirmacion')"
                >
                <p class="error-text" role="alert">
                  <template v-if="erroresContrasena.confirmacion">
                    <i class="fas fa-circle-exclamation"></i>{{ erroresContrasena.confirmacion }}
                  </template>
                </p>
              </div>
            </div>

            <div
              v-if="errorContrasena"
              class="mt-4 rounded-xl border border-[var(--danger)]/25 bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]"
              role="alert"
            >
              <i class="fas fa-circle-exclamation mr-2" aria-hidden="true"></i>{{ errorContrasena }}
            </div>
            <div
              v-if="mensajeContrasena"
              class="mt-4 rounded-xl border border-[var(--success)]/25 bg-[var(--success-soft)] px-4 py-3 text-sm text-[var(--success)]"
              role="status"
            >
              <i class="fas fa-circle-check mr-2" aria-hidden="true"></i>{{ mensajeContrasena }}
            </div>

            <div class="mt-4 flex justify-stretch sm:justify-end">
              <button
                type="submit"
                class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#2a468b] to-[#3d6ac1] px-5 py-2.5 text-sm font-bold text-[#fff7e3] shadow-md transition hover:-translate-y-0.5 hover:from-[#1e356d] hover:to-[#2a468b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                :disabled="guardandoContrasena"
              >
                <span
                  v-if="guardandoContrasena"
                  class="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                  role="status"
                  aria-label="Guardando"
                ></span>
                {{ guardandoContrasena ? 'Guardando...' : 'Actualizar contraseña' }}
              </button>
            </div>
          </form>
        </div>
      </article>
    </template>
  </section>
</template>

<style scoped>
.min-w-0 {
  min-width: 0;
}

.profile-hero {
  position: relative;
  overflow: hidden;
  padding: 1.25rem;
  border-radius: 1.5rem;
  color: #fff7e3;
  background: linear-gradient(145deg, #05102d 0%, #0e2450 55%, #2a468b 100%);
  box-shadow: 0 30px 60px -34px rgba(5, 16, 45, 0.75);
}

.profile-hero::after {
  content: "";
  position: absolute;
  right: -70px;
  bottom: -120px;
  width: 240px;
  height: 240px;
  border-radius: 50%;
  border: 1px solid rgba(184, 174, 227, 0.2);
  pointer-events: none;
}

.profile-glow {
  position: absolute;
  top: -130px;
  right: 6%;
  width: 320px;
  height: 320px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(184, 174, 227, 0.32), transparent 68%);
  pointer-events: none;
}

.profile-hero-content {
  position: relative;
}

.profile-identity {
  min-width: 0;
}

.profile-hero-actions {
  align-self: center;
  min-width: 0;
}

.profile-avatar {
  width: 84px;
  height: 84px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(135deg, #3d6ac1, #b8aee3);
  color: #fff7e3;
  font-size: 1.4rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  border: 2px solid rgba(255, 247, 227, 0.35);
  box-shadow: 0 14px 30px -14px rgba(0, 0, 0, 0.6);
  flex: 0 0 auto;
}

.profile-role {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.28rem 0.65rem;
  border-radius: 999px;
  border: 1px solid rgba(184, 174, 227, 0.28);
  background: rgba(255, 247, 227, 0.07);
  color: rgba(255, 247, 227, 0.8);
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.profile-name {
  margin: 0.55rem 0 0.25rem;
  color: #fff7e3 !important;
  font-size: clamp(1.35rem, 2.4vw, 1.85rem);
  font-weight: 800;
  letter-spacing: -0.03em;
}

.profile-email {
  color: rgba(255, 247, 227, 0.7);
  font-size: 0.86rem;
}

.profile-status {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.4rem 0.8rem;
  border-radius: 999px;
  background: rgba(255, 247, 227, 0.09);
  border: 1px solid rgba(184, 174, 227, 0.24);
  color: #fff7e3;
  font-size: 0.72rem;
  font-weight: 700;
  flex: 0 0 auto;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #7ee0a1;
  box-shadow: 0 0 0 3px rgba(126, 224, 161, 0.18);
}

.data-icon {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.85rem;
  background: var(--accent-soft);
  color: var(--primary);
  font-size: 0.95rem;
  flex: 0 0 auto;
}

.data-label {
  font-size: 0.63rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-soft);
}

.data-value {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-main);
}

@media (max-width: 575.98px) {
  .profile-avatar {
    width: 68px;
    height: 68px;
    font-size: 1.15rem;
  }
}

@media (min-width: 640px) {
  .profile-hero {
    padding: 1.75rem;
  }
}
</style>
