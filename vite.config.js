import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue({
    template: {
      compilerOptions: {
        isCustomElement: (tag) => tag.includes('sl-'),
        types: ["@shoelace-style/shoelace/dist/types/vue"],
      }
    }
  })],
  server: {
    host: "0.0.0.0",
    port: 5173
  },
})
