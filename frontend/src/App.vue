<script setup>
import { ref, onMounted } from 'vue' 
import { useRoute } from 'vue-router'
import Sidebar from './components/Sidebar.vue'
import Topbar from './components/Topbar.vue'

const route = useRoute()


const isSidebarOpen = ref(false)

const toggleMenu = () => {
  isSidebarOpen.value = !isSidebarOpen.value
}

onMounted(() => {
  const savedTheme = localStorage.getItem('theme') || 'light'
  
  document.documentElement.setAttribute('data-theme', savedTheme)
  document.documentElement.setAttribute('data-bs-theme', savedTheme) // <-- Agrega esta línea
})
</script>

<template>
  <template v-if="route.name !== 'login'">
    <div id="sidebar-backdrop" class="sidebar-backdrop d-lg-none" :class="{ 'show': isSidebarOpen }" @click="toggleMenu"></div>
    <Sidebar :class="{ 'show': isSidebarOpen }" />
    
    <main id="main-content">
      <Topbar @toggle-sidebar="toggleMenu" />
      <div class="container-fluid px-0">
        <router-view></router-view>
      </div>
    </main>
  </template>

  <template v-else>
    <router-view></router-view>
  </template>
</template>

<style>

</style>