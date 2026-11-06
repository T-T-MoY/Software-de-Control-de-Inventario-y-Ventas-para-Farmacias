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
  <div
    class="fixed inset-0 z-[1080] grid place-items-center overflow-y-auto bg-[#05102d]/65 p-3 backdrop-blur-sm sm:p-6"
    role="presentation"
    @click.self="cerrar"
  >
    <section
      class="w-full max-w-xl overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 text-[var(--text-main)] shadow-2xl sm:p-7"
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-critical-title"
    >
      <header class="flex items-start justify-between gap-4">
        <div class="flex min-w-0 items-start gap-3 sm:gap-4">
          <span
            class="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-lg text-red-600 dark:text-red-400"
            aria-hidden="true"
          >
            <i class="fas fa-triangle-exclamation"></i>
          </span>
          <div class="min-w-0">
            <span class="mb-1 block text-xs font-extrabold uppercase tracking-[0.12em] text-red-600 dark:text-red-400">
              Alerta crítica de inventario
            </span>
            <h3 id="alert-critical-title" class="m-0 text-lg font-extrabold leading-snug sm:text-xl">
              Medicamentos vencidos pendientes de baja
            </h3>
          </div>
        </div>

        <button
          type="button"
          class="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-lg text-[var(--text-muted)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          aria-label="Cerrar"
          @click="cerrar"
        >
          <i class="fas fa-xmark"></i>
        </button>
      </header>

      <p class="mt-5 text-sm leading-relaxed text-[var(--text-muted)] sm:text-base">
        Hay
        <strong class="font-extrabold text-[var(--text-main)]">{{ totalVencidos }}</strong>
        {{ totalVencidos === 1 ? 'lote vencido' : 'lotes vencidos' }}
        con existencias en inventario. Deben darse de baja para evitar
        que se dispensen.
      </p>

      <footer class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          class="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-5 py-2.5 text-sm font-bold text-[var(--text-muted)] transition hover:border-[var(--border-strong)] hover:bg-[var(--accent-soft)] hover:text-[var(--text-main)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:w-auto"
          @click="cerrar"
        >
          Recordar después
        </button>
        <button
          type="button"
          class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 active:scale-[0.98] sm:w-auto"
          @click="verAlertas"
        >
          <i class="fas fa-bell" aria-hidden="true"></i>
          Ver alertas
        </button>
      </footer>
    </section>
  </div>
</template>
