<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiRequest } from '../services/api'

const router = useRouter()
const perfil = ref(null)
const loading = ref(true)
const error = ref('')

const iniciales = computed(() => {
  const partes = [perfil.value?.nombres, perfil.value?.apellido_paterno].filter(Boolean)
  return partes.map((parte) => parte[0]).join('').toUpperCase() || 'U'
})

const nombreCompleto = computed(() => perfil.value?.nombre_completo || 'Usuario')

const formatearFecha = (valor, conHora = false) => {
  if (!valor) return 'No registrada'
  const texto = String(valor)
  const fecha = new Date(/^\d{4}-\d{2}-\d{2}$/.test(texto) ? `${texto}T00:00:00` : texto)
  if (Number.isNaN(fecha.getTime())) return texto

  const opciones = { day: '2-digit', month: 'long', year: 'numeric' }
  if (conHora) {
    opciones.hour = '2-digit'
    opciones.minute = '2-digit'
  }
  return new Intl.DateTimeFormat('es-BO', opciones).format(fecha)
}

const datos = computed(() => {
  if (!perfil.value) return []
  return [
    { label: 'Correo electrónico', value: perfil.value.correo, icon: 'fa-envelope' },
    { label: 'CI / NIT', value: perfil.value.ci_nit, icon: 'fa-id-card' },
    { label: 'Fecha de nacimiento', value: formatearFecha(perfil.value.fecha_nacimiento), icon: 'fa-cake-candles' },
    { label: 'Miembro desde', value: formatearFecha(perfil.value.fecha_registro, true), icon: 'fa-calendar-check' }
  ]
})

const cargarPerfil = async () => {
  loading.value = true
  error.value = ''
  try {
    perfil.value = await apiRequest('/api/perfil')
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      const theme = localStorage.getItem('theme')
      localStorage.clear()
      if (theme) localStorage.setItem('theme', theme)
      await router.replace({ name: 'login' })
      return
    }
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const cerrarSesion = async () => {
  const theme = localStorage.getItem('theme')
  localStorage.clear()
  if (theme) localStorage.setItem('theme', theme)
  await router.replace({ name: 'login' })
}

onMounted(cargarPerfil)
</script>

<template>
  <section class="px-1">
    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
      <div>
        <span class="eyebrow">Cuenta</span>
        <h2 class="h4 fw-bold mb-1">Mi perfil</h2>
        <p class="text-muted mb-0">Consulta tus datos de acceso y el estado de tu cuenta.</p>
      </div>
      <router-link
        v-if="perfil?.nombre_rol === 'Administrador'"
        to="/usuarios"
        class="btn btn-ghost rounded-pill px-3"
      >
        <i class="fas fa-users me-2"></i>Gestionar usuarios
      </router-link>
    </div>

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

    <div v-else-if="perfil" class="row g-3">
      <div class="col-xl-8">
        <article class="profile-hero">
          <div class="profile-glow" aria-hidden="true"></div>
          <div class="d-flex flex-column flex-sm-row align-items-sm-center gap-3 position-relative">
            <span class="profile-avatar">{{ iniciales }}</span>
            <div class="min-w-0 flex-grow-1">
              <span class="profile-role">
                <i class="fas fa-shield-halved"></i>
                {{ perfil.nombre_rol }}
              </span>
              <h3 class="profile-name">{{ nombreCompleto }}</h3>
              <p class="profile-email mb-0">
                <i class="fas fa-envelope me-2"></i>{{ perfil.correo }}
              </p>
            </div>
            <span class="profile-status">
              <span class="status-dot"></span>
              {{ perfil.estado_cuenta }}
            </span>
          </div>
        </article>

        <div class="row g-3 mt-1">
          <div v-for="dato in datos" :key="dato.label" class="col-sm-6">
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
      </div>

      <div class="col-xl-4">
        <article class="card border-0 shadow-sm rounded-4">
          <div class="card-body p-4">
            <h3 class="h6 fw-bold mb-1">Sesión</h3>
            <p class="text-muted small mb-3">Tu acceso está protegido según tu rol.</p>
            <ul class="session-list">
              <li>
                <span>Rol</span>
                <strong>{{ perfil.nombre_rol }}</strong>
              </li>
              <li>
                <span>Estado</span>
                <strong>{{ perfil.estado_cuenta }}</strong>
              </li>
              <li>
                <span>ID de usuario</span>
                <strong>#{{ perfil.id_usuario }}</strong>
              </li>
            </ul>
            <button type="button" class="btn btn-ghost-danger rounded-pill w-100 mt-3" @click="cerrarSesion">
              <i class="fas fa-arrow-right-from-bracket me-2"></i>Cerrar sesión
            </button>
          </div>
        </article>
      </div>
    </div>
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

.session-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.session-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.55rem 0;
  border-bottom: 1px solid var(--border-color);
  font-size: 0.82rem;
}

.session-list li:last-child {
  border-bottom: none;
}

.session-list span {
  color: var(--text-muted);
}

.session-list strong {
  color: var(--text-main);
  font-weight: 700;
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
