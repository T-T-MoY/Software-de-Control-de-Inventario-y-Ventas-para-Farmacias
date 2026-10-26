<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from './components/Sidebar.vue'
import Topbar from './components/Topbar.vue'
import { applyTheme, getStoredTheme } from './services/theme'

const route = useRoute()
const isSidebarOpen = ref(false)

const toggleMenu = () => {
  isSidebarOpen.value = !isSidebarOpen.value
}

onMounted(() => {
  applyTheme(getStoredTheme())
})
</script>

<template>
  <template v-if="route.name !== 'login'">
    <div
      id="sidebar-backdrop"
      class="sidebar-backdrop d-lg-none"
      :class="{ show: isSidebarOpen }"
      @click="toggleMenu"
    ></div>
    <Sidebar :class="{ show: isSidebarOpen }" />

    <main id="main-content">
      <Topbar @toggle-sidebar="toggleMenu" />
      <div class="container-fluid px-0">
        <router-view v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>
  </template>

  <template v-else>
    <router-view />
  </template>
</template>
