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
const currentUserId = Number(localStorage.getItem('idUsuario'))

const formularioInicial = () => ({
  id_usuario: null,
  nombre: '',
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
      usuario.nombre,
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
  modalAbierto.value = true
}

const abrirEdicion = (usuario) => {
  editando.value = true
  form.value = {
    id_usuario: usuario.id_usuario,
    nombre: usuario.nombre,
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
  modalAbierto.value = true
}

const guardarUsuario = async () => {
  saving.value = true
  error.value = ''
  mensaje.value = ''

  const body = {
    nombre: form.value.nombre.trim(),
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
  if (!window.confirm(`¿Quieres ${verbo} la cuenta de ${usuario.nombre}?`)) return
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
  usuario.nombre,
  usuario.apellido_paterno,
  usuario.apellido_materno
].filter(Boolean).join(' ')

onMounted(cargarDatos)
</script>

<template>
  <section class="px-1">
    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
      <div>
        <h2 class="h4 fw-bold mb-1">Gestión de usuarios</h2>
        <p class="text-muted mb-0">Administra las cuentas y los roles de acceso del sistema.</p>
      </div>
      <button type="button" class="btn btn-success rounded-pill px-4" @click="abrirNuevo">
        <i class="fas fa-user-plus me-2"></i>Nuevo usuario
      </button>
    </div>

    <div v-if="mensaje" class="alert alert-success rounded-3" role="status">{{ mensaje }}</div>
    <div v-if="error" class="alert alert-danger rounded-3" role="alert">{{ error }}</div>

    <div class="card border-0 shadow-sm rounded-4 overflow-hidden">
      <div class="card-header bg-transparent border-0 p-3 p-lg-4">
        <div class="row g-3">
          <div class="col-md">
            <label class="visually-hidden" for="buscar-usuarios">Buscar usuarios</label>
            <div class="input-group">
              <span class="input-group-text bg-body"><i class="fas fa-search text-muted"></i></span>
              <input id="buscar-usuarios" v-model="search" class="form-control" type="search" placeholder="Buscar por nombre, correo, CI/NIT o rol">
            </div>
          </div>
          <div class="col-md-3">
            <label class="visually-hidden" for="filtrar-estado">Filtrar por estado</label>
            <select id="filtrar-estado" v-model="estadoFiltro" class="form-select">
              <option>Todos</option>
              <option>Activo</option>
              <option>Inactivo</option>
            </select>
          </div>
        </div>
      </div>

      <div v-if="loading" class="text-center py-5 text-muted">
        <span class="spinner-border spinner-border-sm text-success me-2" role="status"></span>
        Cargando usuarios...
      </div>
      <div v-else-if="usuariosFiltrados.length === 0" class="text-center py-5">
        <i class="fas fa-user-slash fs-2 text-muted mb-3"></i>
        <p class="text-muted mb-0">{{ usuarios.length ? 'No hay usuarios que coincidan con la búsqueda.' : 'Aún no hay usuarios registrados.' }}</p>
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
                <div class="fw-semibold">{{ nombreCompleto(usuario) }}</div>
                <div class="small text-muted">{{ usuario.correo }}</div>
              </td>
              <td>{{ usuario.ci_nit }}</td>
              <td><span class="badge rounded-pill bg-success-subtle text-success-emphasis">{{ usuario.nombre_rol }}</span></td>
              <td>
                <span class="badge rounded-pill" :class="usuario.estado_cuenta === 'Activo' ? 'bg-success-subtle text-success-emphasis' : 'bg-secondary-subtle text-secondary-emphasis'">
                  {{ usuario.estado_cuenta }}
                </span>
              </td>
              <td class="text-end pe-4">
                <div class="d-inline-flex gap-2">
                  <button type="button" class="btn btn-sm btn-outline-secondary rounded-pill" aria-label="Editar usuario" @click="abrirEdicion(usuario)">
                    <i class="fas fa-pen"></i>
                  </button>
                  <button
                    v-if="usuario.id_usuario !== currentUserId"
                    type="button"
                    class="btn btn-sm rounded-pill"
                    :class="usuario.estado_cuenta === 'Activo' ? 'btn-outline-danger' : 'btn-outline-success'"
                    :aria-label="usuario.estado_cuenta === 'Activo' ? 'Desactivar cuenta' : 'Activar cuenta'"
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
      <div class="card-footer bg-transparent border-0 px-4 py-3 text-muted small">
        {{ usuariosFiltrados.length }} usuario(s)
      </div>
    </div>

    <div v-if="modalAbierto" class="modal-backdrop-custom" @click.self="modalAbierto = false">
      <section class="user-modal card border-0 shadow-lg rounded-4" role="dialog" aria-modal="true" aria-labelledby="user-modal-title">
        <div class="card-header bg-transparent border-0 p-4 pb-0 d-flex justify-content-between align-items-start">
          <div>
            <h3 id="user-modal-title" class="h5 fw-bold mb-1">{{ editando ? 'Editar usuario' : 'Nuevo usuario' }}</h3>
            <p class="text-muted small mb-0">Los campos con * son obligatorios.</p>
          </div>
          <button type="button" class="btn-close" aria-label="Cerrar" @click="modalAbierto = false"></button>
        </div>
        <form class="p-4" @submit.prevent="guardarUsuario">
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label" for="nombre">Nombre *</label>
              <input id="nombre" v-model="form.nombre" class="form-control" maxlength="80" required>
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
              <input id="correo" v-model="form.correo" class="form-control" type="email" maxlength="120" autocomplete="email" required>
            </div>
            <div class="col-md-6">
              <label class="form-label" for="ci-nit">CI / NIT *</label>
              <input id="ci-nit" v-model="form.ci_nit" class="form-control" maxlength="20" required>
            </div>
            <div class="col-md-6">
              <label class="form-label" for="rol">Rol *</label>
              <select id="rol" v-model="form.id_rol" class="form-select" required>
                <option value="" disabled>Selecciona un rol</option>
                <option v-for="rol in roles" :key="rol.id_rol" :value="String(rol.id_rol)">{{ rol.nombre_rol }}</option>
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label" for="contrasena">{{ editando ? 'Restablecer contraseña (opcional)' : 'Contraseña inicial *' }}</label>
              <input id="contrasena" v-model="form.contrasena" class="form-control" type="password" :required="!editando" :minlength="editando ? 0 : 8" autocomplete="new-password">
              <div class="form-text">{{ editando ? 'Déjalo vacío para conservar la contraseña actual.' : 'Mínimo 8 caracteres.' }}</div>
            </div>
          </div>
          <div v-if="error" class="alert alert-danger py-2 mt-3 mb-0" role="alert">{{ error }}</div>
          <div class="d-flex justify-content-end gap-2 mt-4">
            <button type="button" class="btn btn-outline-secondary rounded-pill px-3" @click="modalAbierto = false">Cancelar</button>
            <button type="submit" class="btn btn-success rounded-pill px-4" :disabled="saving">
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
.table thead th {
  color: var(--text-muted);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
}

.modal-backdrop-custom {
  position: fixed;
  inset: 0;
  z-index: 1080;
  display: grid;
  place-items: center;
  overflow-y: auto;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.62);
}

.user-modal {
  width: min(100%, 760px);
  max-height: calc(100vh - 2rem);
  overflow-y: auto;
  background: var(--bg-card);
  color: var(--text-main);
}
</style>
