<script setup>
/**
 * Modal de alerta crítica.
 *
 * Se muestra solo al iniciar sesión y solo cuando existen lotes
 * vencidos con existencias pendientes de baja. Para el resto de
 * alertas (próximos a vencer o reposición) no se interrumpe al usuario.
 */
import { onBeforeUnmount, onMounted } from 'vue'

defineProps({
  totalVencidos: { type: Number, default: 0 }
})

const emit = defineEmits(['cerrar', 'ver'])

const cerrar = () => emit('cerrar')
const verAlertas = () => emit('ver')

const alPresionarTecla = (event) => {
  if (event.key === 'Escape') cerrar()
}

onMounted(() => document.addEventListener('keydown', alPresionarTecla))
onBeforeUnmount(() => document.removeEventListener('keydown', alPresionarTecla))
</script>

<template>
  <div class="panel-modal-backdrop" role="presentation" @click.self="cerrar">
    <section
      class="panel-modal alert-critical-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-critical-title"
    >
      <header class="panel-modal-head">
        <div class="alert-critical-head">
          <span class="alert-critical-icon" aria-hidden="true">
            <i class="fas fa-triangle-exclamation"></i>
          </span>
          <div>
            <span class="alert-critical-eyebrow">Alerta crítica de inventario</span>
            <h3 id="alert-critical-title">Medicamentos vencidos pendientes de baja</h3>
          </div>
        </div>

        <button
          type="button"
          class="panel-modal-close"
          aria-label="Cerrar"
          @click="cerrar"
        >
          <i class="fas fa-xmark"></i>
        </button>
      </header>

      <p class="alert-critical-text">
        Hay
        <strong>{{ totalVencidos }}</strong>
        {{ totalVencidos === 1 ? 'lote vencido' : 'lotes vencidos' }}
        con existencias en inventario. Deben darse de baja para evitar
        que se dispensen.
      </p>

      <footer class="panel-modal-actions">
        <button
          type="button"
          class="btn btn-light rounded-pill px-4"
          @click="cerrar"
        >
          Recordar después
        </button>
        <button
          type="button"
          class="btn btn-danger rounded-pill px-4"
          @click="verAlertas"
        >
          <i class="fas fa-bell me-2"></i>
          Ver alertas
        </button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.alert-critical-modal {
  width: min(100%, 560px);
}

.alert-critical-head {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
}

.alert-critical-icon {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 0.9rem;
  background: rgba(220, 38, 38, 0.12);
  color: #dc2626;
  font-size: 1.1rem;
}

.alert-critical-eyebrow {
  display: block;
  margin-bottom: 0.2rem;
  color: #dc2626;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.alert-critical-text {
  margin: 1.1rem 0 0;
  color: var(--text-muted);
  font-size: 0.92rem;
  line-height: 1.55;
}

.alert-critical-text strong {
  color: var(--text-main);
  font-size: 1.05rem;
}
</style>
