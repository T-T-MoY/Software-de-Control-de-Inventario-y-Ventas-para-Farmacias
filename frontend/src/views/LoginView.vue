<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { applyTheme, getStoredTheme } from '../services/theme'

const router = useRouter()
const correo = ref('')
const password = ref('')
const errorMessage = ref('')
const isLoading = ref(false)
const showPassword = ref(false)
const isDarkMode = ref(false)

onMounted(() => {
  const savedTheme = getStoredTheme()
  isDarkMode.value = savedTheme === 'dark'
  applyTheme(savedTheme)
})

const toggleDarkMode = () => {
  applyTheme(isDarkMode.value ? 'dark' : 'light')
}

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value
}

const handleLogin = async () => {
  errorMessage.value = ''
  isLoading.value = true

  try {
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    const response = await fetch(`${apiBaseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: correo.value,
        password: password.value
      })
    })

    const data = await response.json()

    if (response.ok && data.success && data.token && data.usuario) {
      localStorage.setItem('tokenSession', data.token)
      localStorage.setItem('idUsuario', data.usuario.id_usuario)
      localStorage.setItem('nombreUsuario', data.usuario.nombre_completo)
      localStorage.setItem('nombrePila', data.usuario.nombre)
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

    <div class="login-theme">
      <label class="theme-switch" title="Alternar tema">
        <input
          v-model="isDarkMode"
          type="checkbox"
          aria-label="Alternar entre tema claro y oscuro"
          @change="toggleDarkMode"
        >
        <div class="slider"></div>
      </label>
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

        <span class="eyebrow">Acceso seguro</span>
        <h2>Bienvenido de nuevo</h2>
        <p class="login-lead">Ingresa tus credenciales para continuar.</p>

        <form @submit.prevent="handleLogin">
          <div class="mb-3 text-start">
            <label for="email" class="form-label">Correo electrónico</label>
            <div class="custom-input-group">
              <span class="input-group-text"><i class="fas fa-envelope"></i></span>
              <input
                id="email"
                v-model="correo"
                class="form-control"
                type="email"
                placeholder="tu-correo@farmacia.bo"
                autocomplete="username"
                required
              >
            </div>
          </div>

          <div class="mb-4 text-start">
            <label for="password" class="form-label">Contraseña</label>
            <div class="custom-input-group">
              <span class="input-group-text"><i class="fas fa-lock"></i></span>
              <input
                id="password"
                v-model="password"
                class="form-control"
                :type="showPassword ? 'text' : 'password'"
                placeholder="••••••••"
                autocomplete="current-password"
                required
              >
              <button
                type="button"
                class="password-toggle"
                :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                @click="togglePasswordVisibility"
              >
                <i class="fas" :class="showPassword ? 'fa-eye-slash' : 'fa-eye'"></i>
              </button>
            </div>
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

        <div v-if="errorMessage" class="alert alert-danger py-2 rounded-3 mb-0" role="alert">
          <i class="fas fa-circle-exclamation me-2"></i>{{ errorMessage }}
        </div>

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

.login-theme {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  z-index: 5;
}

.login-shell {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  width: min(1040px, 100%);
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 1.75rem;
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  animation: fadeInUp 0.5s ease both;
}

.login-showcase {
  position: relative;
  flex-direction: column;
  padding: 3rem;
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
  width: 48px;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 15px;
  background: linear-gradient(135deg, #3d6ac1, #b8aee3);
  color: #fff7e3;
  font-size: 1.15rem;
  box-shadow: 0 12px 24px -12px rgba(184, 174, 227, 0.9);
  flex: 0 0 auto;
}

.showcase-name {
  font-size: 0.92rem;
  font-weight: 800;
  letter-spacing: 0.18em;
}

.showcase-sub {
  font-size: 0.66rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 247, 227, 0.55);
}

.showcase-copy {
  margin-top: 3.5rem;
}

.showcase-copy h1 {
  margin: 0.65rem 0 1rem;
  font-size: clamp(2rem, 3vw, 2.65rem);
  font-weight: 800;
  line-height: 1.12;
  letter-spacing: -0.03em;
  color: #fff7e3 !important;
}

.showcase-copy h1 span {
  color: #b8aee3;
}

.showcase-copy p {
  max-width: 34ch;
  margin: 0;
  color: rgba(255, 247, 227, 0.72);
  font-size: 0.92rem;
  line-height: 1.65;
}

.showcase-features {
  display: grid;
  gap: 0.7rem;
  margin-top: 2.25rem;
}

.showcase-feature {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.65rem 0.8rem;
  border-radius: 0.9rem;
  background: rgba(255, 247, 227, 0.06);
  border: 1px solid rgba(184, 174, 227, 0.14);
  font-size: 0.82rem;
  color: rgba(255, 247, 227, 0.82);
}

.showcase-feature i {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.55rem;
  background: rgba(184, 174, 227, 0.18);
  color: #b8aee3;
  font-size: 0.78rem;
  flex: 0 0 auto;
}

.showcase-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: auto;
  padding-top: 2.5rem;
  font-size: 0.68rem;
  color: rgba(255, 247, 227, 0.5);
}

.palette-dots {
  display: flex;
  gap: 0.3rem;
}

.palette-dots span {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid rgba(255, 247, 227, 0.35);
}

.login-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  padding: 3rem 2.75rem;
  background: var(--bg-card);
}

.login-mobile-brand {
  margin-bottom: 2rem;
}

.login-mobile-brand .showcase-name {
  color: var(--text-main);
}

.login-mobile-brand .showcase-sub {
  color: var(--text-muted);
}

.login-card h2 {
  margin: 0.45rem 0 0.4rem;
  font-size: 1.65rem;
  font-weight: 800;
  color: var(--text-main);
}

.login-lead {
  margin-bottom: 1.8rem;
  color: var(--text-muted);
  font-size: 0.88rem;
}

.password-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  color: var(--text-soft);
  border-radius: 0.6rem;
  transition: color 0.18s ease, background-color 0.18s ease;
  flex: 0 0 auto;
}

.password-toggle:hover {
  color: var(--primary);
  background: var(--accent-soft);
}

.login-footnote {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  margin: 1.5rem 0 0;
  color: var(--text-soft);
  font-size: 0.7rem;
}

.login-footnote i {
  font-size: 0.65rem;
}

@media (max-width: 991.98px) {
  .login-shell {
    grid-template-columns: 1fr;
    width: min(460px, 100%);
  }

  .login-card {
    padding: 2.25rem 1.75rem;
  }

  .login-page {
    padding: 4.25rem 1.25rem 1.5rem;
  }

  .login-theme {
    top: 1rem;
    right: 1rem;
  }
}

@media (max-width: 420px) {
  .login-card {
    padding: 2rem 1.35rem;
  }

  .login-card h2 {
    font-size: 1.45rem;
  }
}
</style>
