<script setup>
/**
 * Notificación flotante reutilizable (mismo estilo en todo el sistema).
 * Se oculta sola después de `duration` milisegundos.
 */
import { computed, onBeforeUnmount, watch } from 'vue'

const props = defineProps({
  message: { type: String, default: '' },
  tone: { type: String, default: 'success' },
  duration: { type: Number, default: 4500 }
})

const emit = defineEmits(['close'])

const icono = computed(() => {
  if (props.tone === 'error') return 'fa-circle-exclamation'
  if (props.tone === 'warning') return 'fa-triangle-exclamation'
  return 'fa-circle-check'
})

let temporizador = null

const limpiarTemporizador = () => {
  if (temporizador) {
    clearTimeout(temporizador)
    temporizador = null
  }
}

watch(() => props.message, (mensaje) => {
  limpiarTemporizador()
  if (mensaje) {
    temporizador = setTimeout(() => emit('close'), props.duration)
  }
})

onBeforeUnmount(limpiarTemporizador)
</script>

<template>
  <div class="toast-stack" aria-live="polite">
    <Transition name="toast">
      <div v-if="message" class="toast-item" :class="`is-${tone}`" role="status">
        <i class="fas" :class="icono"></i>
        <span>{{ message }}</span>
      </div>
    </Transition>
  </div>
</template>
