<script setup>
import { computed, onMounted, ref } from 'vue'
import { apiRequest } from '../services/api'

const usuarios = ref([])
const roles = ref([])
const search = ref('')
const estadoFiltro = ref('Todos')
const loading = ref(true)
const saving = ref(false)
const modalAbierto = ref(false)
const editando = ref(false)
const mensaje = ref('')
const error = ref('')
const showPassword = ref(false)
const currentUserId = Number(localStorage.getItem('idUsuario'))

const formularioInicial = () => ({
  id_usuario: null,
  nombres: '',
  apellido_paterno: '',
  apellido_materno: '',
  fecha_nacimiento: '',
  correo: '',
  ci_nit: '',
  id_rol: '',
  contrasena: ''
})
const form = ref(formularioInicial())

const usuariosFiltrados = computed(() => {
  const consulta = search.value.trim().toLocaleLowerCase()
  return usuarios.value.filter((usuario) => {
    const nombre = [
      usuario.nombres,
      usuario.apellido_paterno,
      usuario.apellido_materno
    ].filter(Boolean).join(' ').toLocaleLowerCase()
    const coincideTexto = !consulta || [
      nombre,
      usuario.correo,
      usuario.ci_nit,
      usuario.nombre_rol
    ].some((valor) => String(valor || '').toLocaleLowerCase().includes(consulta))
    const coincideEstado = estadoFiltro.value === 'Todos'
      || usuario.estado_cuenta === estadoFiltro.value
    return coincideTexto && coincideEstado
  })
})

const cargarDatos = async () => {
  loading.value = true
  error.value = ''
  try {
    const [lista, listaRoles] = await Promise.all([
      apiRequest('/api/usuarios'),
      apiRequest('/api/usuarios/roles')
    ])
    usuarios.value = lista
    roles.value = listaRoles
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const abrirNuevo = () => {
  editando.value = false
  form.value = formularioInicial()
  mensaje.value = ''
  error.value = ''
  showPassword.value = false
  modalAbierto.value = true
}

const abrirEdicion = (usuario) => {
  editando.value = true
  form.value = {
    id_usuario: usuario.id_usuario,
    nombres: usuario.nombres,
    apellido_paterno: usuario.apellido_paterno,
    apellido_materno: usuario.apellido_materno || '',
    fecha_nacimiento: String(usuario.fecha_nacimiento).split('T')[0],
    correo: usuario.correo,
    ci_nit: usuario.ci_nit,
    id_rol: String(usuario.id_rol),
    contrasena: ''
  }
  mensaje.value = ''
  error.value = ''
  showPassword.value = false
  modalAbierto.value = true
}

const guardarUsuario = async () => {
  saving.value = true
  error.value = ''
  mensaje.value = ''

  const body = {
    nombres: form.value.nombres.trim(),
    apellido_paterno: form.value.apellido_paterno.trim(),
    apellido_materno: form.value.apellido_materno.trim(),
    fecha_nacimiento: form.value.fecha_nacimiento,
    correo: form.value.correo.trim(),
    ci_nit: form.value.ci_nit.trim(),
    id_rol: Number(form.value.id_rol)
  }
  if (!editando.value) body.contrasena = form.value.contrasena
  else if (form.value.contrasena) body.contrasena = form.value.contrasena

  try {
    await apiRequest(
      editando.value ? `/api/usuarios/${form.value.id_usuario}` : '/api/usuarios',
      {
        method: editando.value ? 'PUT' : 'POST',
        body: JSON.stringify(body)
      }
    )
    modalAbierto.value = false
    mensaje.value = editando.value
      ? 'Los datos del usuario se actualizaron.'
      : 'El usuario se creó correctamente.'
    await cargarDatos()
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}

const cambiarEstado = async (usuario) => {
  const activo = usuario.estado_cuenta !== 'Activo'
  const verbo = activo ? 'activar' : 'desactivar'
  if (!window.confirm(`¿Quieres ${verbo} la cuenta de ${usuario.nombres}?`)) return
  error.value = ''
  mensaje.value = ''
  try {
    await apiRequest(`/api/usuarios/${usuario.id_usuario}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ activo })
    })
    mensaje.value = `La cuenta quedó ${activo ? 'activa' : 'inactiva'}.`
    await cargarDatos()
  } catch (err) {
    error.value = err.message
  }
}

const nombreCompleto = (usuario) => [
  usuario.nombres,
  usuario.apellido_paterno,
  usuario.apellido_materno
].filter(Boolean).join(' ')

const iniciales = (usuario) => {
  const partes = [usuario.nombres, usuario.apellido_paterno].filter(Boolean)
  return partes.map((parte) => parte[0]).join('').toUpperCase()
}

onMounted(cargarDatos)
</script>

<template>
  <section class="px-1">
    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
      <div>
        <span class="eyebrow">Administración</span>
        <h2 class="h4 fw-bold mb-1">Usuarios del sistema</h2>
        <p class="text-muted mb-0">Administra las cuentas y los roles de acceso del sistema.</p>
      </div>
      <button type="button" class="btn btn-brand rounded-pill px-4" @click="abrirNuevo">
        <i class="fas fa-user-plus me-2"></i>Nuevo usuario
      </button>
    </div>

    <div v-if="mensaje" class="alert alert-success rounded-3" role="status">
      <i class="fas fa-circle-check me-2"></i>{{ mensaje }}
    </div>
    <div v-if="error && !modalAbierto" class="alert alert-danger rounded-3" role="alert">
      <i class="fas fa-circle-exclamation me-2"></i>{{ error }}
    </div>

    <div class="card border-0 shadow-sm rounded-4 overflow-hidden">
      <div class="card-header border-0 p-3 p-lg-4">
        <div class="row g-3">
          <div class="col-md">
            <label class="visually-hidden" for="buscar-usuarios">Buscar usuarios</label>
            <div class="custom-input-group">
              <span class="input-group-text"><i class="fas fa-search"></i></span>
              <input
                id="buscar-usuarios"
                v-model="search"
                class="form-control"
                type="search"
                placeholder="Buscar por nombre, correo, CI/NIT o rol"
              >
            </div>
          </div>
          <div class="col-md-3">
            <label class="visually-hidden" for="filtrar-estado">Filtrar por estado</label>
            <div class="custom-input-group filter-group">
              <span class="input-group-text"><i class="fas fa-filter"></i></span>
              <select id="filtrar-estado" v-model="estadoFiltro" class="form-select">
                <option>Todos</option>
                <option>Activo</option>
                <option>Inactivo</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div v-if="loading" class="text-center py-5 text-muted">
        <span class="spinner-border spinner-border-sm text-primary me-2" role="status"></span>
        Cargando usuarios...
      </div>
      <div v-else-if="usuariosFiltrados.length === 0" class="text-center py-5">
        <i class="fas fa-user-slash fs-2 text-muted mb-3"></i>
        <p class="text-muted mb-0">
          {{ usuarios.length ? 'No hay usuarios que coincidan con la búsqueda.' : 'Aún no hay usuarios registrados.' }}
        </p>
      </div>
      <div v-else class="table-responsive">
        <table class="table align-middle mb-0">
          <thead>
            <tr>
              <th class="ps-4">Usuario</th>
              <th>CI / NIT</th>
              <th>Rol</th>
              <th>Estado</th>
              <th class="text-end pe-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="usuario in usuariosFiltrados" :key="usuario.id_usuario">
              <td class="ps-4">
                <div class="d-flex align-items-center gap-2">
                  <span class="user-avatar">{{ iniciales(usuario) }}</span>
                  <div class="min-w-0">
                    <div class="fw-semibold text-truncate">{{ nombreCompleto(usuario) }}</div>
                    <div class="small text-muted text-truncate">{{ usuario.correo }}</div>
                  </div>
                </div>
              </td>
              <td class="text-muted">{{ usuario.ci_nit }}</td>
              <td>
                <span class="badge-soft badge-soft-primary">
                  <i class="fas fa-shield-halved"></i>
                  {{ usuario.nombre_rol }}
                </span>
              </td>
              <td>
                <span
                  class="badge-soft"
                  :class="usuario.estado_cuenta === 'Activo' ? 'badge-soft-primary' : 'badge-soft-muted'"
                >
                  <span class="status-dot"></span>
                  {{ usuario.estado_cuenta }}
                </span>
              </td>
              <td class="text-end pe-4">
                <div class="d-inline-flex gap-2">
                  <button
                    type="button"
                    class="btn-icon"
                    aria-label="Editar usuario"
                    title="Editar usuario"
                    @click="abrirEdicion(usuario)"
                  >
                    <i class="fas fa-pen"></i>
                  </button>
                  <button
                    v-if="usuario.id_usuario !== currentUserId"
                    type="button"
                    class="btn-icon"
                    :class="usuario.estado_cuenta === 'Activo' ? 'is-danger' : 'is-success'"
                    :aria-label="usuario.estado_cuenta === 'Activo' ? 'Desactivar cuenta' : 'Activar cuenta'"
                    :title="usuario.estado_cuenta === 'Activo' ? 'Desactivar cuenta' : 'Activar cuenta'"
                    @click="cambiarEstado(usuario)"
                  >
                    <i class="fas" :class="usuario.estado_cuenta === 'Activo' ? 'fa-user-slash' : 'fa-user-check'"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="card-footer border-0 px-4 py-3 text-muted small d-flex justify-content-between align-items-center">
        <span>{{ usuariosFiltrados.length }} usuario(s)</span>
        <span v-if="search || estadoFiltro !== 'Todos'" class="badge-soft badge-soft-lavender">Filtro activo</span>
      </div>
    </div>

    <div v-if="modalAbierto" class="modal-backdrop-custom" @click.self="modalAbierto = false">
      <section class="user-modal card border-0" role="dialog" aria-modal="true" aria-labelledby="user-modal-title">
        <div class="modal-head">
          <div class="d-flex align-items-center gap-3">
            <span class="modal-icon">
              <i class="fas" :class="editando ? 'fa-user-pen' : 'fa-user-plus'"></i>
            </span>
            <div>
              <h3 id="user-modal-title" class="h5 fw-bold mb-1">
                {{ editando ? 'Editar usuario' : 'Nuevo usuario' }}
              </h3>
              <p class="text-muted small mb-0">Los campos con * son obligatorios.</p>
            </div>
          </div>
          <button type="button" class="btn-close" aria-label="Cerrar" @click="modalAbierto = false"></button>
        </div>

        <form class="p-4 pt-3" @submit.prevent="guardarUsuario">
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label" for="nombres">Nombre *</label>
              <input id="nombres" v-model="form.nombres" class="form-control" maxlength="80" required>
            </div>
            <div class="col-md-6">
              <label class="form-label" for="apellido-paterno">Apellido paterno *</label>
              <input id="apellido-paterno" v-model="form.apellido_paterno" class="form-control" maxlength="60" required>
            </div>
            <div class="col-md-6">
              <label class="form-label" for="apellido-materno">Apellido materno</label>
              <input id="apellido-materno" v-model="form.apellido_materno" class="form-control" maxlength="60">
            </div>
            <div class="col-md-6">
              <label class="form-label" for="fecha-nacimiento">Fecha de nacimiento *</label>
              <input id="fecha-nacimiento" v-model="form.fecha_nacimiento" class="form-control" type="date" required>
            </div>
            <div class="col-md-6">
              <label class="form-label" for="correo">Correo *</label>
              <input
                id="correo"
                v-model="form.correo"
                class="form-control"
                type="email"
                maxlength="120"
                autocomplete="email"
                required
              >
            </div>
            <div class="col-md-6">
              <label class="form-label" for="ci-nit">CI / NIT *</label>
              <input id="ci-nit" v-model="form.ci_nit" class="form-control" maxlength="20" required>
            </div>
            <div class="col-md-6">
              <label class="form-label" for="rol">Rol *</label>
              <select id="rol" v-model="form.id_rol" class="form-select" required>
                <option value="" disabled>Selecciona un rol</option>
                <option v-for="rol in roles" :key="rol.id_rol" :value="String(rol.id_rol)">
                  {{ rol.nombre_rol }}
                </option>
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label" for="contrasena">
                {{ editando ? 'Restablecer contraseña (opcional)' : 'Contraseña inicial *' }}
              </label>
              <div class="custom-input-group">
                <span class="input-group-text"><i class="fas fa-lock"></i></span>
                <input
                  id="contrasena"
                  v-model="form.contrasena"
                  class="form-control"
                  :type="showPassword ? 'text' : 'password'"
                  :required="!editando"
                  :minlength="editando ? 0 : 8"
                  autocomplete="new-password"
                >
                <button
                  type="button"
                  class="password-toggle"
                  :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                  @click="showPassword = !showPassword"
                >
                  <i class="fas" :class="showPassword ? 'fa-eye-slash' : 'fa-eye'"></i>
                </button>
              </div>
              <div class="form-text">
                {{ editando ? 'Déjalo vacío para conservar la contraseña actual.' : 'Mínimo 8 caracteres.' }}
              </div>
            </div>
          </div>

          <div v-if="error" class="alert alert-danger py-2 mt-3 mb-0" role="alert">
            <i class="fas fa-circle-exclamation me-2"></i>{{ error }}
          </div>

          <div class="d-flex justify-content-end gap-2 mt-4">
            <button type="button" class="btn btn-ghost rounded-pill px-3" @click="modalAbierto = false">
              Cancelar
            </button>
            <button type="submit" class="btn btn-brand rounded-pill px-4" :disabled="saving">
              <span v-if="saving" class="spinner-border spinner-border-sm me-2" role="status"></span>
              {{ saving ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </form>
      </section>
    </div>
  </section>
</template>

<style scoped>
.min-w-0 {
  min-width: 0;
}

.user-avatar {
  width: 38px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(135deg, #2a468b, #b8aee3);
  color: #fff7e3;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  flex: 0 0 auto;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.filter-group .form-select {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding-left: 0;
  border-radius: 0;
}

.modal-backdrop-custom {
  position: fixed;
  inset: 0;
  z-index: 1080;
  display: grid;
  place-items: center;
  overflow-y: auto;
  padding: 1rem;
  background: rgba(5, 16, 45, 0.64);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.user-modal {
  width: min(100%, 780px);
  max-height: calc(100vh - 2rem);
  overflow-y: auto;
  background: var(--bg-card);
  color: var(--text-main);
  border-radius: 1.3rem;
  box-shadow: var(--shadow-lg);
}

.modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.5rem 1.5rem 0;
}

.modal-icon {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.9rem;
  background: var(--accent-soft);
  color: var(--primary);
  flex: 0 0 auto;
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

@media (max-width: 575.98px) {
  .modal-head {
    padding: 1.25rem 1.25rem 0;
  }
}
</style>
