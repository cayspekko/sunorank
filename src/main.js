import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// Import Naive UI
import naive from 'naive-ui'

// Create and mount the Vue application
const app = createApp(App)
app.use(router)
app.use(naive)
app.mount('#app')
