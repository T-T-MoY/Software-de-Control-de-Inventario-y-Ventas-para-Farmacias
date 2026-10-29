import { createApp } from 'vue'
import App from './App.vue'
import router from './presentation/router'

import './assets/css/tailwind.css'
import './assets/css/style.css'


const app = createApp(App)

app.use(router) 
app.mount('#app')