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

const salir = async () => {
  cerrarSesion()
  await router.replace({ name: 'login' })
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
    <div v-if="loading" class="text-center py-5 text-muted">
      <span class="spinner-border spinner-border-sm text-primary me-2" role="status"></span>
      Cargando perfil...
    </div>

    <div v-else-if="error" class="alert alert-danger rounded-3 d-flex flex-wrap align-items-center gap-3" role="alert">
      <span><i class="fas fa-circle-exclamation me-2"></i>{{ error }}</span>
      <button type="button" class="btn btn-sm btn-ghost rounded-pill px-3" @click="cargarPerfil">
        Reintentar
      </button>
    </div>

    <template v-else-if="perfil">
      <!-- Cabecera: identidad, rol, correo y estado -->
      <article class="profile-hero">
        <div class="profile-glow" aria-hidden="true"></div>
        <div class="profile-hero-content">
          <span class="profile-avatar">{{ iniciales }}</span>
          <div class="profile-identity">
            <span class="profile-role">
              <i class="fas fa-shield-halved"></i>
              {{ perfil.nombre_rol }}
            </span>
            <h3 class="profile-name">{{ nombreCompleto }}</h3>
            <p class="profile-email mb-0">
              <i class="fas fa-envelope me-2"></i>{{ perfil.correo }}
            </p>
          </div>
          <div class="profile-hero-actions">
            <span class="profile-status">
              <span class="status-dot"></span>
              {{ perfil.estado_cuenta }}
            </span>
            <button type="button" class="btn btn-hero-ghost rounded-pill" @click="salir">
              <i class="fas fa-arrow-right-from-bracket me-2"></i>Cerrar sesión
            </button>
          </div>
        </div>
      </article>

      <!-- Datos personales (sin repetir rol, correo ni estado) -->
      <div class="row g-3 mt-1">
        <div v-for="dato in datos" :key="dato.label" class="col-md-4">
          <article class="card border-0 shadow-sm rounded-4 h-100">
            <div class="card-body d-flex align-items-center gap-3">
              <span class="data-icon">
                <i class="fas" :class="dato.icon"></i>
              </span>
              <div class="min-w-0">
                <div class="data-label">{{ dato.label }}</div>
                <div class="data-value text-truncate" :title="dato.value">{{ dato.value }}</div>
              </div>
            </div>
          </article>
        </div>
      </div>

      <!-- Cambio de contraseña -->
      <article class="card border-0 shadow-sm rounded-4 mt-3">
        <div class="card-body p-4">
          <h3 class="h6 fw-bold mb-1">Cambiar contraseña</h3>
          <p class="text-muted small mb-3">
            Mínimo 6 caracteres, con al menos una letra y un número.
          </p>

          <form novalidate @submit.prevent="enviarCambioContrasena">
            <div class="row g-3">
              <div class="col-md-4">
                <label class="form-label" for="perfil-contrasena-actual">
                  Contraseña actual <span class="req">*</span>
                </label>
                <input
                  id="perfil-contrasena-actual"
                  v-model="formContrasena.actual"
                  class="form-control"
                  :class="{ 'is-invalid': erroresContrasena.actual }"
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

              <div class="col-md-4">
                <label class="form-label" for="perfil-contrasena-nueva">
                  Nueva contraseña <span class="req">*</span>
                </label>
                <input
                  id="perfil-contrasena-nueva"
                  v-model="formContrasena.nueva"
                  class="form-control"
                  :class="{ 'is-invalid': erroresContrasena.nueva }"
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

              <div class="col-md-4">
                <label class="form-label" for="perfil-contrasena-confirmacion">
                  Confirmar nueva contraseña <span class="req">*</span>
                </label>
                <input
                  id="perfil-contrasena-confirmacion"
                  v-model="formContrasena.confirmacion"
                  class="form-control"
                  :class="{ 'is-invalid': erroresContrasena.confirmacion }"
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

            <div v-if="errorContrasena" class="alert alert-danger py-2 rounded-3 small mt-3 mb-0" role="alert">
              <i class="fas fa-circle-exclamation me-2"></i>{{ errorContrasena }}
            </div>
            <div v-if="mensajeContrasena" class="alert alert-success py-2 rounded-3 small mt-3 mb-0" role="status">
              <i class="fas fa-circle-check me-2"></i>{{ mensajeContrasena }}
            </div>

            <div class="d-flex justify-content-end mt-4">
              <button
                type="submit"
                class="btn btn-brand rounded-pill px-4 password-submit"
                :disabled="guardandoContrasena"
              >
                <span v-if="guardandoContrasena" class="spinner-border spinner-border-sm me-2" role="status"></span>
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
  padding: 2rem;
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
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1.15rem;
}

.profile-identity {
  min-width: 0;
}

.profile-hero-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
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

.btn-hero-ghost {
  display: inline-flex;
  align-items: center;
  padding: 0.4rem 1rem;
  border: 1px solid rgba(255, 247, 227, 0.3);
  background: rgba(255, 247, 227, 0.08);
  color: #fff7e3;
  font-size: 0.75rem;
  font-weight: 700;
  transition: background-color 0.18s ease, border-color 0.18s ease;
}

.btn-hero-ghost:hover {
  background: rgba(255, 247, 227, 0.16);
  border-color: rgba(255, 247, 227, 0.5);
  color: #fff7e3;
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

.password-submit {
  width: 100%;
}

@media (min-width: 576px) {
  .profile-hero-content {
    flex-direction: row;
    align-items: center;
  }

  .profile-hero-actions {
    margin-left: auto;
    justify-content: flex-end;
  }
}

@media (min-width: 768px) {
  .password-submit {
    width: auto;
  }
}

@media (max-width: 575.98px) {
  .profile-hero {
    padding: 1.5rem;
  }

  .profile-avatar {
    width: 68px;
    height: 68px;
    font-size: 1.15rem;
  }
}
</style>
