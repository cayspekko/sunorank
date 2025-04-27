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

<script setup lang="ts">
import { InformationCircle } from '@vicons/ionicons5'

// Component name is automatically inferred from filename
// No need to register components - they're automatically available in the template
</script>

<style scoped>
.home {
  text-align: center;
}

/* Just the minimal styles needed for the font demo */
.weight-300 { font-weight: 300; }
.weight-400 { font-weight: 400; }
.weight-500 { font-weight: 500; }
.weight-700 { font-weight: 700; }

.system-font {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
}

.highlight {
  font-weight: 600;
  color: #36ad6a;
}
</style>
