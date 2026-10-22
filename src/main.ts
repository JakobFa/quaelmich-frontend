// Schriften werden mit der App ausgeliefert – keine Verbindung zu Google Fonts (Datenschutz)
import '@fontsource/barlow-condensed/500.css'
import '@fontsource/barlow-condensed/600.css'
import '@fontsource/barlow-condensed/700.css'
import '@fontsource/barlow-condensed/800.css'
import '@fontsource/barlow-condensed/900.css'
import '@fontsource/barlow-condensed/600-italic.css'
import '@fontsource/barlow-condensed/700-italic.css'
import '@fontsource/barlow-condensed/800-italic.css'
import '@fontsource/barlow-condensed/900-italic.css'
import '@fontsource/saira-stencil-one/400.css'
import '@fontsource/space-mono/400.css'
import '@fontsource/space-mono/700.css'
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
