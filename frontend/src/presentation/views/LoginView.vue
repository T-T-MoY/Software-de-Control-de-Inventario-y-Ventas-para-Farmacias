<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ThemeToggle from '../components/ThemeToggle.vue'
import ToastNotification from '../components/ToastNotification.vue'
import { applyTheme } from '../theme'
import {
  limpiarContrasena,
  limpiarCorreo,
  validarContrasena,
  validarCorreo
} from '../validators/fields'
import { iniciarSesion } from '../../data/endpoints/auth'
import { guardarSesion } from '../../business/session'

const router = useRouter()
const correo = ref('')
const password = ref('')
const errorMessage = ref('')
const notificacion = ref('')
const notificacionTono = ref('error')
const isLoading = ref(false)
const showPassword = ref(false)

// Estados para validación individual (como en React)
const errores = ref({})
const touched = ref({})

onMounted(() => {
  const savedTheme = localStorage.getItem('theme')
  const initialTheme =
    savedTheme ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

  applyTheme(initialTheme)
})

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value
}

// Validación con las reglas compartidas del sistema
const validarCampo = (name, value) => {
  if (name === 'correo') return validarCorreo(value)
  if (name === 'password') {
    return validarContrasena(value, { min: 6, exigirFuerza: false })
  }
  return ''
}

const valorCampo = (campo) => (campo === 'correo' ? correo.value : password.value)

const handleInput = (campo) => {
  if (campo === 'correo') correo.value = limpiarCorreo(correo.value)
  if (campo === 'password') password.value = limpiarContrasena(password.value)

  touched.value[campo] = true
  errores.value[campo] = validarCampo(campo, valorCampo(campo))
  if (errorMessage.value) errorMessage.value = '' // Limpiar error global
  if (notificacion.value) notificacion.value = ''
}

const handleBlur = (campo) => {
  touched.value[campo] = true
  errores.value[campo] = validarCampo(campo, valorCampo(campo))
}

const handleLogin = async () => {
  errorMessage.value = ''

  // Validar todos los campos antes de enviar
  errores.value.correo = validarCampo('correo', correo.value)
  errores.value.password = validarCampo('password', password.value)
  touched.value.correo = true
  touched.value.password = true

  if (errores.value.correo || errores.value.password) return

  isLoading.value = true

  try {
    const data = await iniciarSesion({
      email: correo.value.toLowerCase().trim(),
      password: password.value
    })

    if (data.success && data.token && data.usuario) {
      guardarSesion(data.token, data.usuario)
      await router.push('/')
    } else {
      errorMessage.value = data.mensaje || 'Credenciales incorrectas.'
    }
  } catch (error) {
    // Cuenta inhabilitada o eliminada: se avisa con una notificación,
    // no con el mensaje de credenciales incorrectas.
    if (error.codigo === 'CUENTA_INHABILITADA' || error.codigo === 'CUENTA_ELIMINADA') {
      errorMessage.value = ''
      notificacionTono.value = error.codigo === 'CUENTA_ELIMINADA' ? 'error' : 'warning'
      notificacion.value = error.message
      return
    }
    errorMessage.value = error.status
      ? error.message
      : 'Error de conexión con el servidor.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-orbs" aria-hidden="true">
      <div class="login-orb login-orb-one"></div>
      <div class="login-orb login-orb-two"></div>
    </div>

    <div class="login-shell">
      <aside class="login-showcase d-none d-lg-flex">
        <div class="showcase-brand">
          <span class="showcase-mark"><i class="fas fa-capsules"></i></span>
          <div>
            <div class="showcase-name">FARMACIA</div>
            <div class="showcase-sub">Inventario &amp; Ventas</div>
          </div>
        </div>

        <div class="showcase-copy">
          <span class="eyebrow eyebrow-light">Sistema integral</span>
          <h1>Tu farmacia,<br><span>en orden y bajo control.</span></h1>
          <p>
            Centraliza inventario, ventas y usuarios en una plataforma clara,
            segura y lista para crecer con tu equipo.
          </p>
        </div>

        <div class="showcase-features">
          <div class="showcase-feature">
            <i class="fas fa-boxes-stacked"></i>
            <span>Control de stock y lotes</span>
          </div>
          <div class="showcase-feature">
            <i class="fas fa-cash-register"></i>
            <span>Ventas y comprobantes</span>
          </div>
          <div class="showcase-feature">
            <i class="fas fa-shield-halved"></i>
            <span>Accesos por rol</span>
          </div>
        </div>

        <div class="showcase-footer">
          <span>v1.0</span>
        </div>
      </aside>

      <section class="login-card">
        <div class="login-mobile-brand d-lg-none">
          <span class="showcase-mark"><i class="fas fa-capsules"></i></span>
          <div>
            <div class="showcase-name">FARMACIA</div>
            <div class="showcase-sub">Inventario &amp; Ventas</div>
          </div>
        </div>

        <div class="login-card-head">
          <span class="eyebrow">Acceso seguro</span>
          <ThemeToggle />
        </div>

        <h2>Bienvenido de nuevo</h2>
        <p class="login-lead">Ingresa tus credenciales para continuar.</p>

        <form @submit.prevent="handleLogin" novalidate>
          
          <!-- Correo Electrónico -->
          <div class="mb-3">
            <label class="form-label" for="login-correo">
              Correo electrónico <span class="req">*</span>
            </label>
            <input
              id="login-correo"
              v-model="correo"
              class="form-input"
              :class="{ 'has-error': errores.correo && touched.correo }"
              type="email"
              inputmode="email"
              placeholder="nombre@correo.com"
              autocomplete="username"
              maxlength="120"
              :aria-invalid="Boolean(errores.correo && touched.correo)"
              aria-describedby="login-correo-error"
              @input="handleInput('correo')"
              @blur="handleBlur('correo')"
            >
            <p
              id="login-correo-error"
              class="error-text"
              role="alert"
            >
              <template v-if="errores.correo && touched.correo">
                <i class="fas fa-circle-exclamation"></i>{{ errores.correo }}
              </template>
            </p>
          </div>

          <!-- Contraseña -->
          <div class="mb-3">
            <label class="form-label" for="login-password">
              Contraseña <span class="req">*</span>
            </label>
            <div class="password-wrapper">
              <input
                id="login-password"
                v-model="password"
                class="form-input"
                :class="{ 'has-error': errores.password && touched.password }"
                :type="showPassword ? 'text' : 'password'"
                placeholder="••••••••"
                autocomplete="current-password"
                maxlength="72"
                :aria-invalid="Boolean(errores.password && touched.password)"
                aria-describedby="login-password-error"
                @input="handleInput('password')"
                @blur="handleBlur('password')"
              >
              <button
                type="button"
                class="password-toggle-text"
                @click="togglePasswordVisibility"
              >
                {{ showPassword ? 'Ocultar' : 'Mostrar' }}
              </button>
            </div>
            <p
              id="login-password-error"
              class="error-text"
              role="alert"
            >
              <template v-if="errores.password && touched.password">
                <i class="fas fa-circle-exclamation"></i>{{ errores.password }}
              </template>
            </p>
          </div>

          <!-- Error Global (API) -->
          <div v-if="errorMessage" class="alert alert-danger py-2 rounded-3 mb-3" role="alert">
            <i class="fas fa-circle-exclamation me-2"></i>{{ errorMessage }}
          </div>

          <button
            type="submit"
            class="btn btn-brand w-100 rounded-pill py-2 fw-bold mb-3"
            :disabled="isLoading"
          >
            <span v-if="isLoading">Cargando... <i class="fas fa-spinner fa-spin ms-2"></i></span>
            <span v-else>Ingresar al sistema <i class="fas fa-arrow-right ms-2"></i></span>
          </button>
        </form>

        <p class="login-footnote">
          <i class="fas fa-lock"></i>
          Acceso restringido al personal autorizado.
        </p>
      </section>
    </div>

    <ToastNotification
      :message="notificacion"
      :tone="notificacionTono"
      :duration="7000"
      @close="notificacion = ''"
    />
  </div>
</template>

<style scoped>
.login-page {
  position: relative;
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 2rem;
}

.login-orbs {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.login-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(10px);
  pointer-events: none;
}

.login-orb-one {
  width: 420px;
  height: 420px;
  top: -160px;
  left: -120px;
  background: radial-gradient(circle, rgba(184, 174, 227, 0.45), transparent 68%);
}

.login-orb-two {
  width: 520px;
  height: 520px;
  right: -200px;
  bottom: -220px;
  background: radial-gradient(circle, rgba(61, 106, 193, 0.22), transparent 70%);
}

/* ---------- Cabecera ---------- */
.login-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

/* ---------- Ajustes propios del login ----------
   El estilo de los inputs vive en assets/css/style.css
   para que sea el mismo en todo el sistema. */
.password-wrapper {
  position: relative;
}

.password-wrapper .form-input {
  padding-right: 4.9rem;
}

.password-toggle-text {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-soft);
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.2s ease;
}

.password-toggle-text:hover {
  color: #3d6ac1;
}

/* ---------- Tarjeta principal ---------- */
.login-shell {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  width: min(900px, 100%);
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 1.5rem;
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  animation: fadeInUp 0.5s ease both;
}

.login-showcase {
  position: relative;
  flex-direction: column;
  padding: 2.5rem;
  background: linear-gradient(160deg, #05102d 0%, #0e2450 52%, #2a468b 100%);
  color: var(--cream);
  overflow: hidden;
}

.login-showcase::before {
  content: "";
  position: absolute;
  top: -90px;
  right: -110px;
  width: 320px;
  height: 320px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(184, 174, 227, 0.35), transparent 68%);
}

.login-showcase::after {
  content: "";
  position: absolute;
  bottom: -130px;
  left: -80px;
  width: 280px;
  height: 280px;
  border-radius: 50%;
  border: 1px solid rgba(184, 174, 227, 0.18);
}

.showcase-brand,
.showcase-copy,
.showcase-features,
.showcase-footer {
  position: relative;
  z-index: 1;
}

.showcase-brand,
.login-mobile-brand {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.showcase-mark {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: linear-gradient(135deg, #3d6ac1, #b8aee3);
  color: #fff7e3;
  font-size: 1.1rem;
  box-shadow: 0 12px 24px -12px rgba(184, 174, 227, 0.9);
  flex: 0 0 auto;
}

.showcase-name {
  font-size: 0.9rem;
  font-weight: 800;
  letter-spacing: 0.15em;
}

.showcase-sub {
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 247, 227, 0.55);
}

.showcase-copy {
  margin-top: 2.5rem;
}

.showcase-copy h1 {
  margin: 0.5rem 0 1rem;
  font-size: clamp(1.8rem, 2.5vw, 2.2rem);
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.02em;
  color: #fff7e3 !important;
}

.showcase-copy h1 span {
  color: var(--blue-400, #b8aee3);
}

.showcase-copy p {
  max-width: 34ch;
  margin: 0;
  color: rgba(255, 247, 227, 0.72);
  font-size: 0.88rem;
  line-height: 1.6;
}

.showcase-features {
  display: grid;
  gap: 0.6rem;
  margin-top: 1.8rem;
}

.showcase-feature {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.6rem 0.8rem;
  border-radius: 0.75rem;
  background: rgba(255, 247, 227, 0.06);
  border: 1px solid rgba(184, 174, 227, 0.14);
  font-size: 0.8rem;
  color: rgba(255, 247, 227, 0.82);
}

.showcase-feature i {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.45rem;
  background: rgba(184, 174, 227, 0.18);
  color: var(--blue-400);
  font-size: 0.75rem;
  flex: 0 0 auto;
}

.showcase-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: auto;
  padding-top: 1.5rem;
  font-size: 0.65rem;
  color: rgba(255, 247, 227, 0.5);
}

.login-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  padding: 2.5rem;
  background: var(--bg-card);
}

.login-mobile-brand {
  margin-bottom: 1.5rem;
}

.login-mobile-brand .showcase-name {
  color: var(--text-main);
}

.login-mobile-brand .showcase-sub {
  color: var(--text-muted);
}

.login-card h2 {
  margin: 0.25rem 0 0.35rem;
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-main);
}

.login-lead {
  margin-bottom: 1.5rem;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.login-footnote {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  margin: 1.25rem 0 0;
  color: var(--text-soft);
  font-size: 0.7rem;
}

.login-footnote i {
  font-size: 0.65rem;
}

/* ---------- Responsive ---------- */
@media (max-width: 991.98px) {
  .login-shell {
    grid-template-columns: 1fr;
    width: min(440px, 100%);
  }

  .login-card {
    padding: 2.5rem 2rem;
  }

  .login-page {
    padding: 1.5rem;
  }
}

@media (max-width: 420px) {
  .login-card {
    padding: 2rem 1.5rem;
  }

  .login-card h2 {
    font-size: 1.35rem;
  }
}

/* Ajuste para pantallas de 1366x768 */
@media (max-height: 780px) and (min-width: 992px) {
  .login-showcase {
    padding: 2rem;
  }
  .showcase-copy {
    margin-top: 1.5rem;
  }
  .showcase-features {
    margin-top: 1rem;
  }
  .login-card {
    padding: 2rem;
  }
}
</style>