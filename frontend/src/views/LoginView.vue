<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ThemeToggle from '../components/ThemeToggle.vue'
import { applyTheme } from '../services/theme'

const router = useRouter()
const correo = ref('')
const password = ref('')
const errorMessage = ref('')
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

// Validación básica para replicar el comportamiento de React
const validarCampo = (name, value) => {
  if (name === 'correo') {
    if (!value || !value.trim()) return 'El correo es obligatorio.'
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) return 'Ingresá un correo válido.'
  }
  if (name === 'password') {
    if (!value) return 'La contraseña es obligatoria.'
    if (value.length < 6) return 'Mínimo 6 caracteres.'
  }
  return ''
}

const handleInput = (campo, valor) => {
  touched.value[campo] = true
  errores.value[campo] = validarCampo(campo, valor)
  if (errorMessage.value) errorMessage.value = '' // Limpiar error global
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
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    const response = await fetch(`${apiBaseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: correo.value.toLowerCase().trim(),
        password: password.value
      })
    })

    const data = await response.json()

    if (response.ok && data.success && data.token && data.usuario) {
      localStorage.setItem('tokenSession', data.token)
      localStorage.setItem('idUsuario', data.usuario.id_usuario)
      localStorage.setItem('nombreUsuario', data.usuario.nombre_completo)
      localStorage.setItem('nombrePila', data.usuario.nombres)
      localStorage.setItem('rolUsuario', data.usuario.rol)
      localStorage.setItem('correoUsuario', data.usuario.correo)
      localStorage.setItem('ciUsuario', data.usuario.ci_nit)
      localStorage.setItem('apellidoPaterno', data.usuario.apellido_paterno)
      localStorage.setItem('apellidoMaterno', data.usuario.apellido_materno)

      await router.push('/')
    } else {
      errorMessage.value = data.mensaje || 'Credenciales incorrectas.'
    }
  } catch (error) {
    console.error(error)
    errorMessage.value = 'Error de conexión con el servidor.'
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
          <div class="palette-dots" aria-hidden="true">
            <span style="background:#05102D"></span>
            <span style="background:#FFF7E3"></span>
            <span style="background:#2A468B"></span>
            <span style="background:#3D6AC1"></span>
            <span style="background:#B8AEE3"></span>
          </div>
          <span>v1.0 · Gestión farmacéutica</span>
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
            <label class="form-label">Correo electrónico</label>
            <input
              v-model="correo"
              class="form-input"
              :class="{ 'has-error': errores.correo && touched.correo }"
              type="email"
              placeholder="nombre@correo.com"
              autocomplete="username"
              @input="handleInput('correo', correo)"
              @blur="touched.correo = true"
            >
            <p v-if="errores.correo && touched.correo" class="error-text">
              {{ errores.correo }}
            </p>
          </div>

          <!-- Contraseña -->
          <div class="mb-4">
            <label class="form-label">Contraseña</label>
            <div class="password-wrapper">
              <input
                v-model="password"
                class="form-input"
                :class="{ 'has-error': errores.password && touched.password }"
                :type="showPassword ? 'text' : 'password'"
                placeholder="••••••••"
                autocomplete="current-password"
                @input="handleInput('password', password)"
                @blur="touched.password = true"
              >
              <button
                type="button"
                class="password-toggle-text"
                @click="togglePasswordVisibility"
              >
                {{ showPassword ? 'Ocultar' : 'Mostrar' }}
              </button>
            </div>
            <p v-if="errores.password && touched.password" class="error-text">
              {{ errores.password }}
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

/* ---------- ESTILOS DE INPUTS (Traducidos de React/Tailwind) ---------- */
.form-label {
  display: block;
  font-size: 0.875rem; /* text-sm */
  font-weight: 500;    /* font-medium */
  color: var(--text-muted);
  margin-bottom: 0.25rem; /* mb-1 */
}

.form-input {
  width: 100%;
  padding: 0.75rem 1rem; /* py-3 px-4 */
  border-radius: 0.75rem; /* rounded-xl */
  border: 1px solid var(--border-color);
  background-color: var(--bg-card);
  color: var(--text-main);
  font-size: 0.95rem;
  transition: all 0.2s ease;
  outline: none;
}

.form-input:focus {
  border-color: #3d6ac1;
  box-shadow: 0 0 0 3px rgba(61, 106, 193, 0.15);
}

.form-input.has-error {
  border-color: #ef4444; /* red-500 */
}

.form-input.has-error:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
}

.password-wrapper {
  position: relative;
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

.error-text {
  color: #ef4444;
  font-size: 0.8rem;
  font-weight: 500;
  margin-top: 0.35rem;
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
  color: #b8aee3;
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

.palette-dots {
  display: flex;
  gap: 0.3rem;
}

.palette-dots span {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid rgba(255, 247, 227, 0.35);
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