<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router' 

const router = useRouter() 
const correo = ref('')
const password = ref('')
const errorMessage = ref('')
const isLoading = ref(false)

// NUEVO: Variable para controlar la visibilidad de la contraseña
const showPassword = ref(false)

const isDarkMode = ref(localStorage.getItem('theme') === 'dark')

onMounted(() => {
  const savedTheme = localStorage.getItem('theme') || 'light'
  isDarkMode.value = savedTheme === 'dark'
  
  document.documentElement.setAttribute('data-theme', savedTheme)
  document.documentElement.setAttribute('data-bs-theme', savedTheme) 
})

const toggleDarkMode = () => {
  const htmlElement = document.documentElement
  if (isDarkMode.value) {
    htmlElement.setAttribute('data-theme', 'dark')
    htmlElement.setAttribute('data-bs-theme', 'dark') 
    localStorage.setItem('theme', 'dark')
  } else {
    htmlElement.setAttribute('data-theme', 'light')
    htmlElement.setAttribute('data-bs-theme', 'light')
    localStorage.setItem('theme', 'light')
  }
}
// ------------------------------

// NUEVO: Función para alternar el ojito
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
  <div class="d-flex align-items-center justify-content-center min-vh-100 p-3 position-relative bg-body">
    
    <div class="position-absolute top-0 end-0 p-4">
      <label class="theme-switch" title="Alternar tema">
        <input type="checkbox" v-model="isDarkMode" @change="toggleDarkMode">
        <div class="slider"></div> 
      </label>
    </div>

    <div class="login-card p-4 p-sm-5 rounded-4 shadow-lg text-center bg-body-tertiary">
      <div class="brand-icon d-inline-flex mb-3">
        <i class="fas fa-capsules text-white fs-3"></i>
      </div>
      <h3 class="fw-bold mb-1 text-body">Farmacia</h3>
      <p class="text-muted small mb-4">Control de Inventario y Ventas</p>

      <form @submit.prevent="handleLogin">
        <div class="mb-3 text-start">
          <label for="email" class="form-label fs-7 fw-medium text-muted">Correo Electrónico</label>
          <div class="custom-input-group">
            <span class="input-group-text"><i class="fas fa-envelope"></i></span>
            <input type="email" class="form-control" id="email" v-model="correo" placeholder="admin@farmacia.bo" autocomplete="username" required>
          </div>
        </div>
        
        <div class="mb-4 text-start">
          <label for="password" class="form-label fs-7 fw-medium text-muted">Contraseña</label>
          <div class="custom-input-group">
            <span class="input-group-text"><i class="fas fa-lock"></i></span>
            
            <input :type="showPassword ? 'text' : 'password'" class="form-control border-end-0" id="password" v-model="password" autocomplete="current-password" placeholder="••••••••" required>
            
            <span class="input-group-text bg-transparent cursor-pointer" @click="togglePasswordVisibility">
              <i class="fas text-muted" :class="showPassword ? 'fa-eye-slash' : 'fa-eye'"></i>
            </span>
          </div>
        </div>

        <button type="submit" class="btn btn-primary w-100 rounded-pill py-2 fw-bold mb-3 shadow-sm" :disabled="isLoading">
          <span v-if="isLoading">Cargando... <i class="fas fa-spinner fa-spin ms-2"></i></span>
          <span v-else>Ingresar al Sistema <i class="fas fa-arrow-right ms-2"></i></span>
        </button>
      </form>

      <div v-if="errorMessage" class="alert alert-danger fs-7 py-2 rounded-3" role="alert">
        {{ errorMessage }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-card {
  max-width: 400px;
  width: 100%;
}

/* NUEVO: Cambia el cursor para indicar que el ojito es clickeable */
.cursor-pointer {
  cursor: pointer;
}

/* Quita el borde derecho del input y el izquierdo del ícono para que parezcan unidos (opcional según tu CSS base) */
.custom-input-group .form-control {
  border-right: none;
}
.custom-input-group .cursor-pointer {
  border-left: none;
}
</style>