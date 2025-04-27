import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

import '@shoelace-style/shoelace/dist/themes/dark.css';
import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path';

setBasePath('https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.20.1/cdn/');


// Create and mount the Vue application
const app = createApp(App)
app.use(router)
app.mount('#app')
