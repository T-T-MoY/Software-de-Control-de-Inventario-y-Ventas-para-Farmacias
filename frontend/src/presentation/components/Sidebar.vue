<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { modulosVisibles } from '../../config/distribution'
import { obtenerSesion } from '../../business/session'
import { useAlertMonitor } from '../composables/useAlertMonitor'

defineProps({
  isOpen: { type: Boolean, default: false }
})

defineEmits(['close'])

const route = useRoute()

const { totales } = useAlertMonitor()
const totalAlertas = computed(() => totales.value.total)
const navLinkClasses = 'sidebar-link flex min-h-11 items-center gap-3 rounded-xl border-l-[3px] border-l-transparent px-3 py-2.5 text-sm font-medium text-[#fff7e3]/75 no-underline transition hover:translate-x-0.5 hover:bg-white/10 hover:text-[#fff7e3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b8aee3]'
const isCurrentRoute = (path) => route.path === path

// El sidebar muestra solo los módulos del rol de la sesión.
const modules = computed(() => modulosVisibles(obtenerSesion().rol))
</script>

<template>
  <aside
    id="sidebar"
    class="fixed inset-y-3 left-3 z-[1040] flex w-[min(18rem,calc(100vw-1.5rem))] -translate-x-[115%] flex-col overflow-hidden rounded-[1.35rem] border border-white/10 bg-[image:var(--sidebar-bg)] p-3 shadow-2xl transition-transform duration-300 ease-in-out lg:inset-y-6 lg:left-6 lg:w-[250px] lg:translate-x-0"
    :class="{ 'translate-x-0': isOpen }"
  >
    <router-link
      to="/"
      class="sidebar-link mb-4 mt-2 flex shrink-0 items-center text-[#fff7e3] no-underline"
      aria-label="Ir al panel principal"
      @click="$emit('close')"
    >
      <div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#3d6ac1] to-[#b8aee3] text-lg text-white shadow-lg">
        <i class="fas fa-capsules" aria-hidden="true"></i>
      </div>
      <div class="ml-3 flex min-w-0 flex-1 flex-col">
        <span class="truncate text-sm font-extrabold tracking-[0.14em] text-[#fff7e3]">FARMACIA</span>
        <span class="text-[0.63rem] uppercase tracking-[0.08em] text-[#fff7e3]/60">Inventario &amp; Ventas</span>
      </div>
      <button
        type="button"
        class="ml-2 inline-flex size-9 shrink-0 items-center justify-center rounded-full text-[#fff7e3]/75 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-[#b8aee3] lg:hidden"
        aria-label="Cerrar menú de navegación"
        @click.stop.prevent="$emit('close')"
      >
        <i class="fas fa-xmark" aria-hidden="true"></i>
      </button>
    </router-link>

    <hr class="mb-3 shrink-0 border-0 border-t border-solid border-white/15">

    <div class="min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-1">
      <div class="px-3 pb-2 text-[0.64rem] font-extrabold tracking-[0.14em] text-[#5c86d8]">GENERAL</div>
      <ul class="mb-4 flex list-none flex-col gap-1 p-0">
        <li class="nav-item">
          <router-link
            to="/"
            :class="[navLinkClasses, { 'border-l-[#3d6ac1] bg-gradient-to-r from-[#3d6ac1]/40 to-[#3d6ac1]/10 font-bold text-[#fff7e3]': isCurrentRoute('/') }]"
            @click="$emit('close')"
          >
            <i class="fas fa-chart-pie w-5 shrink-0 text-center" aria-hidden="true"></i>
            <span class="min-w-0 flex-1 truncate">Panel principal</span>
          </router-link>
        </li>
      </ul>

      <div class="px-3 pb-2 text-[0.64rem] font-extrabold tracking-[0.14em] text-[#5c86d8]">MÓDULOS DEL SISTEMA</div>
      <ul class="flex list-none flex-col gap-1 p-0">
        <template v-for="module in modules" :key="module.name">
          <li class="nav-item">
            <router-link :to="module.to" v-slot="{ isActive, href, navigate }">
              <a
                :href="href"
                :class="[navLinkClasses, { 'border-l-[#3d6ac1] bg-gradient-to-r from-[#3d6ac1]/40 to-[#3d6ac1]/10 font-bold text-[#fff7e3]': isActive }]"
                @click="navigate($event); $emit('close')"
              >
                <i
                  class="fas w-5 shrink-0 text-center"
                  :class="[module.icon, { 'text-[#5c86d8]': isActive }]"
                  aria-hidden="true"
                ></i>

                <span class="min-w-0 flex-1">
                  {{ module.name }}
                </span>

                <span
                  v-if="module.name === 'Alertas' && totalAlertas > 0"
                  class="relative inline-flex size-2 shrink-0 items-center justify-center"
                  :title="`${totalAlertas} alertas de inventario`"
                  :aria-label="`${totalAlertas} alertas de inventario`"
                >
                  <span
                    class="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-60"
                    aria-hidden="true"
                  ></span>
                  <span
                    class="relative inline-flex size-1.5 rounded-full bg-red-400 shadow-[0_0_6px_2px_rgba(248,113,113,0.75)]"
                    aria-hidden="true"
                  ></span>
                </span>
              </a>
            </router-link>
          </li>
        </template>
      </ul>
    </div>

    <div class="mt-3 flex shrink-0 items-center justify-end border-t border-white/15 pt-3 text-white/55">
      <span class="rounded-full border border-[#b8aee3]/30 px-2 py-1 text-[0.62rem] font-bold tracking-wider text-[#fff7e3]/70">v1.0</span>
    </div>
  </aside>
</template>
