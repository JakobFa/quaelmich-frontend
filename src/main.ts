import './assets/main.css'

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
