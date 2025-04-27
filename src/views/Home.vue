<template>
  <div class="home">
    <n-card class="page-card">
      <template #header>
        <h1>Home Page</h1>
      </template>
      <p>Welcome to our Vue 3 application with Naive UI components!</p>
      <p>This is a simple demonstration of a multi-page application using Vue Router and Naive UI library.</p>
      <n-divider />
      <n-alert type="info" show-icon>
        <template #icon>
          <n-icon><information-circle /></n-icon>
        </template>
        <template #header>
          <strong>Hello World!</strong>
        </template>
        This is the home page of our application.
      </n-alert>
    </n-card>
    
    <!-- Font comparison section -->
    <n-card title="Roboto Font Demo" class="font-test-card" style="margin-top: 30px; text-align: left;">
      <div class="font-comparison">
        <h3 class="roboto-heading">Roboto Font Weights:</h3>
        <p class="roboto-text weight-300">Roboto Light (300): The quick brown fox jumps over the lazy dog.</p>
        <p class="roboto-text weight-400">Roboto Regular (400): The quick brown fox jumps over the lazy dog.</p>
        <p class="roboto-text weight-500">Roboto Medium (500): The quick brown fox jumps over the lazy dog.</p>
        <p class="roboto-text weight-700">Roboto Bold (700): The quick brown fox jumps over the lazy dog.</p>
        
        <h3 style="margin-top: 20px" class="system-heading">System Font Comparison:</h3>
        <p class="system-font">This text uses system fonts (sans-serif)</p>
        <p class="combined-text">Roboto is known for its <span class="highlight">clean lines</span> and <span class="highlight">excellent readability</span> across different screen sizes.</p>
      </div>
    </n-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { InformationCircle } from '@vicons/ionicons5'

// Define reactive state
const test = ref('')

// Component name is automatically inferred from filename
// No need to register components - they're automatically available in the template
</script>

<style scoped>
.home {
  text-align: center;
}

.page-card {
  max-width: 800px;
  margin: 0 auto;
}

p {
  margin-bottom: 1rem;
}

/* Font testing styles */
.font-test-card {
  max-width: 800px;
  margin: 0 auto;
}

.font-comparison h3 {
  margin-bottom: 16px;
  font-size: 20px;
}

/* Roboto font styles */
.roboto-heading {
  font-family: 'Roboto', sans-serif;
  font-size: 22px;
  font-weight: 500;
  margin-bottom: 18px;
}

.system-heading {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
  font-weight: bold;
  font-size: 20px;
}

.roboto-text {
  font-family: 'Roboto', sans-serif;
  line-height: 1.6;
  margin-bottom: 12px;
}

.weight-300 {
  font-weight: 300;
}

.weight-400 {
  font-weight: 400;
}

.weight-500 {
  font-weight: 500;
}

.weight-600 {
  font-weight: 600;
}

.weight-700 {
  font-weight: 700;
}

.system-font {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 16px;
  margin-bottom: 12px;
}

.combined-text {
  font-family: 'Roboto', sans-serif;
  font-size: 16px;
  line-height: 1.6;
  margin-top: 15px;
}

.highlight {
  font-weight: 600;
  color: #36ad6a;
  font-size: 17px;
}
</style>
