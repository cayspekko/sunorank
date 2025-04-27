<template>
  <n-config-provider :theme="darkTheme">
    <n-layout>
      <div class="app-container">
        <header>
          <n-card class="nav-card">
            <nav>
              <n-space>
                <n-button-group>
                  <n-button type="primary" @click="navigate('/')">
                    <template #icon><n-icon><home-outline /></n-icon></template>
                    Home
                  </n-button>
                  <n-button type="primary" @click="navigate('/about')">
                    <template #icon><n-icon><information-circle-outline /></n-icon></template>
                    About
                  </n-button>
                  <n-button type="primary" @click="navigate('/contact')">
                    <template #icon><n-icon><mail-outline /></n-icon></template>
                    Contact
                  </n-button>
                </n-button-group>
              </n-space>
            </nav>
          </n-card>
        </header>
        <main>
          <router-view></router-view>
        </main>
      </div>
    </n-layout>
  </n-config-provider>
</template>

<script setup>
import { darkTheme } from 'naive-ui'
import { useRouter } from 'vue-router'
import { HomeOutline, InformationCircleOutline, MailOutline } from '@vicons/ionicons5'

// Get router instance
const router = useRouter()

// Define methods
const navigate = (route) => {
  router.push(route)
}

// Component name is automatically inferred from filename
// No need to register components - they're automatically available in the template
</script>

<style>
/* Global styles */
.app-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem;
}

header {
  margin-bottom: 1.5rem;
}

main {
  margin-top: 1.5rem;
}

/* Common component styles (available to all views) */
.page-card {
  max-width: 1200px;
  margin: 0 auto;
}
</style>
