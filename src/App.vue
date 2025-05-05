<template>
  <n-config-provider :theme="darkTheme">
    <n-loading-bar-provider>
      <n-message-provider>
        <n-layout>
          <div class="app-container">
            <header>
              <n-card class="nav-card">
                <div class="nav-container">
                  <nav class="main-nav">
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
                  </nav>
                  <div class="auth-section">
                    <template v-if="loading">
                      <n-spin size="small" />
                    </template>
                    <template v-else-if="isLoggedIn">
                      <div class="user-profile">
                        <n-dropdown trigger="click" :options="userMenuOptions" @select="handleUserMenuSelect">
                          <n-avatar
                            v-if="profile?.photoURL"
                            :src="profile.photoURL"
                            round
                            size="small"
                            class="user-avatar"
                          />
                          <n-avatar v-else round size="small">
                            {{ profile?.displayName?.charAt(0) || 'U' }}
                          </n-avatar>
                        </n-dropdown>
                        <n-button @click="logout" tertiary type="error" size="small">
                          <template #icon><n-icon><log-out-outline /></n-icon></template>
                          Logout
                        </n-button>
                      </div>
                    </template>
                    <template v-else>
                      <n-button @click="loginWithGoogle" type="primary" size="small">
                        <template #icon><n-icon><logo-google /></n-icon></template>
                        Login with Google
                      </n-button>
                    </template>
                  </div>
                </div>
              </n-card>
            </header>
            <main>
              <router-view></router-view>
            </main>
          </div>
        </n-layout>
      </n-message-provider>
    </n-loading-bar-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { darkTheme } from 'naive-ui'
import { useRouter } from 'vue-router'
import { 
  HomeOutline, 
  InformationCircleOutline, 
  MailOutline, 
  LogOutOutline,
  LogoGoogle
} from '@vicons/ionicons5'
import { useAuth } from './composables/useAuth'
import type { DropdownOption } from 'naive-ui'

// Get router instance
const router = useRouter()

// Get authentication functionality
const { 
  profile, 
  loading, 
  isLoggedIn, 
  loginWithGoogle, 
  logout 
} = useAuth()

// User menu dropdown options
const userMenuOptions = ref<DropdownOption[]>([
  {
    label: 'Profile',
    key: 'profile',
    props: {
      onClick: () => router.push('/profile')
    }
  },
  {
    label: 'Settings',
    key: 'settings',
    props: {
      onClick: () => router.push('/settings')
    }
  }
])

// Define methods
const navigate = (route: string): void => {
  router.push(route)
}

const handleUserMenuSelect = (_: string): void => {
  // The click handlers are already defined in the options
  // This is just here for the type safety of the dropdown component
}
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

/* Navigation styles */
.nav-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.main-nav {
  flex: 1;
}

.auth-section {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.user-avatar {
  cursor: pointer;
}

/* Common component styles (available to all views) */
.page-card {
  max-width: 1200px;
  margin: 0 auto;
}
</style>
