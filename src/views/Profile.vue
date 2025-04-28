<template>
  <div class="profile-page">
    <n-card class="page-card">
      <template #header>
        <h1>Profile Information</h1>
      </template>
      
      <div v-if="loading">
        <n-spin size="large" />
        <p>Loading profile data...</p>
      </div>
      
      <div v-else-if="!isLoggedIn">
        <n-empty description="Please login to view your profile">
          <template #extra>
            <n-button type="primary" @click="loginWithGoogle">
              <template #icon><n-icon><logo-google /></n-icon></template>
              Login with Google
            </n-button>
          </template>
        </n-empty>
      </div>
      
      <div v-else-if="profile" class="profile-content">
        <!-- User basic profile -->
        <n-card title="User Information" class="profile-section">
          <div class="user-header">
            <n-avatar 
              v-if="profile.photoURL" 
              :src="profile.photoURL" 
              round 
              size="large" 
            />
            <n-avatar v-else round size="large">
              {{ profile.displayName?.charAt(0) || 'U' }}
            </n-avatar>
            <div class="user-name">
              <h2>{{ profile.displayName }}</h2>
              <p>{{ profile.email }}</p>
              <n-tag type="info">Joined: {{ formatDate(profile.createdAt) }}</n-tag>
            </div>
          </div>
        </n-card>
        
        <!-- Suno Profile Information -->
        <n-card title="Suno Profile" class="profile-section" v-if="profile.sunoProfile">
          <div class="suno-profile">
            <div class="user-header">
              <n-avatar 
                v-if="profile.sunoProfile.avatarImageUrl" 
                :src="profile.sunoProfile.avatarImageUrl" 
                round 
                size="large" 
              />
              <n-avatar v-else round size="large">
                {{ profile.sunoProfile.displayName?.charAt(0) || 'S' }}
              </n-avatar>
              <div class="user-name">
                <h2>{{ profile.sunoProfile.displayName }}</h2>
                <p>@{{ profile.sunoProfile.handle }}</p>
                <div class="verification-status">
                  <n-tag v-if="profile.sunoProfile.verified" type="success">
                    <template #icon>
                      <n-icon><checkmark-circle-outline /></n-icon>
                    </template>
                    Verified
                  </n-tag>
                  <n-tag v-else type="warning">
                    <template #icon>
                      <n-icon><alert-circle-outline /></n-icon>
                    </template>
                    Not Verified
                  </n-tag>
                  <p v-if="profile.sunoProfile.verifiedAt">
                    Verified on: {{ formatDate(profile.sunoProfile.verifiedAt) }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </n-card>
        
        <n-card v-else title="Suno Profile" class="profile-section">
          <n-empty description="No Suno profile information available">
            <template #extra>
              <n-button>Create Suno Profile</n-button>
            </template>
          </n-empty>
        </n-card>
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { 
  LogoGoogle, 
  CheckmarkCircleOutline, 
  AlertCircleOutline 
} from '@vicons/ionicons5'
import { useAuth } from '../composables/useAuth'

// Get authentication functionality
const { 
  profile, 
  loading, 
  isLoggedIn, 
  loginWithGoogle 
} = useAuth()

// Firebase Timestamp type for TypeScript
interface FirebaseTimestamp {
  toDate(): Date;
  seconds: number;
  nanoseconds: number;
}

// Format date helper function
const formatDate = (date: Date | FirebaseTimestamp | null | undefined) => {
  if (!date) return 'N/A'
  
  // If it's a Firebase timestamp, convert to JS Date
  if (typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function') {
    return date.toDate().toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      timeZoneName: 'short'
    })
  }
  
  // If it's already a Date object
  if (date instanceof Date) {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      timeZoneName: 'short'
    })
  }
  
  // If it's something else that can be converted to a date
  return new Date(date as any).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    timeZoneName: 'short'
  })
}
</script>

<style scoped>
.profile-page {
  margin: 0 auto;
  max-width: 1200px;
}

.profile-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.profile-section {
  margin-bottom: 1.5rem;
}

.user-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.user-name {
  flex: 1;
}

.user-name h2 {
  margin: 0 0 0.5rem 0;
}

.user-name p {
  margin: 0 0 0.5rem 0;
  opacity: 0.8;
}

.verification-status {
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
</style>
