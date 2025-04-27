<template>
  <div class="about">
    <n-card class="page-card">
      <template #header>
        <h1>About Page</h1>
      </template>
      <p>This is the About page of our Vue 3 application with Naive UI components.</p>
      <n-divider />
      <n-collapse-transition :show="showDetails">
        <div>
          <h3 @click="showDetails = !showDetails" style="cursor: pointer">
            <n-icon>
              <template v-if="showDetails">
                <chevron-down-circle-outline />
              </template>
              <template v-else>
                <chevron-forward-circle-outline />
              </template>
            </n-icon>
            About this project
          </h3>
          <div v-if="showDetails">
            <p>This is a basic Vue.js 3 application built with:</p>
            <div>
              <n-tag type="default" style="margin-right: 8px">Vue 3</n-tag>
              <n-tag type="success" style="margin-right: 8px">Vite</n-tag>
              <n-tag type="info" style="margin-right: 8px">Naive UI</n-tag>
              <n-tag type="warning" style="margin-right: 8px">Vue Router</n-tag>
            </div>
            <p class="mt-1">It demonstrates a multi-page application with navigation between different views.</p>
          </div>
        </div>
      </n-collapse-transition>
    </n-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ChevronDownCircleOutline, ChevronForwardCircleOutline } from '@vicons/ionicons5'

// Define reactive state
const showDetails = ref(true)

// Component name is automatically inferred from filename
// No need to register components - they're automatically available in the template
</script>

<style scoped>
.about {
  text-align: center;
}

.page-card {
  max-width: 800px;
  margin: 0 auto;
}

p {
  margin-bottom: 1rem;
}

.mt-1 {
  margin-top: 1rem;
}

sl-tag {
  margin-right: 0.5rem;
}
</style>
