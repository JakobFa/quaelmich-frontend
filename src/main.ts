import './assets/main.css'

// Alte Render-Adresse → eigene Domain (Pfad und Parameter bleiben erhalten)
const CANONICAL_HOST = 'quaelmich.com'
if (window.location.hostname.endsWith('.onrender.com')) {
  const { pathname, search, hash } = window.location
  window.location.replace(`https://${CANONICAL_HOST}${pathname}${search}${hash}`)
}

import { createApp } from 'vue'
import App from './App.vue'
import { setUnauthorizedHandler } from './api'
import router from './router'

// Token abgelaufen oder ungültig → zur Anmeldung, danach zurück zur aktuellen Seite
setUnauthorizedHandler(() => {
  router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
})

const app = createApp(App)

app.use(router)

app.mount('#app')
