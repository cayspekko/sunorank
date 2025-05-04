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
          <template #header-extra>
            <n-button type="error" size="small" @click="unlinkSunoAccount">
              <template #icon><n-icon><unlink-outline /></n-icon></template>
              Unlink Account
            </n-button>
          </template>
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
              <n-button type="primary" @click="openLinkSunoModal">
                <template #icon><n-icon><link-outline /></n-icon></template>
                Link Suno Account
              </n-button>
            </template>
          </n-empty>
        </n-card>
        
        <!-- Link Suno Modal -->
        <n-modal v-model:show="showLinkSunoModal" preset="card" style="width: 600px" title="Link Suno Account" :closable="true">
          <div class="link-suno-container">
            <!-- Step 1: Generate verification code -->
            <n-card title="Step 1: Generate Verification Code" class="step-card">
              <div class="step-container">
                <p>A unique verification code is required to link your Suno account.</p>
                
                <n-space vertical>
                  <!-- Always show the generate code button -->
                  <n-button 
                    type="primary" 
                    @click="generateCode" 
                    :loading="generatingCode"
                    :disabled="generatingCode"
                  >
                    {{ verificationCode ? 'Generate New Code' : 'Generate Verification Code' }}
                  </n-button>
                  
                  <!-- Show the verification code if it exists -->
                  <div v-if="verificationCode" class="verification-code-container">
                    <n-alert type="success">
                      <template #icon>
                        <n-icon><checkmark-circle-outline /></n-icon>
                      </template>
                      <p>Your verification code:</p>
                      <n-input-group>
                        <n-input readonly :value="verificationCode" />
                        <n-button type="primary" @click="copyToClipboard">
                          <template #icon>
                            <n-icon><copy-outline /></n-icon>
                          </template>
                          Copy
                        </n-button>
                      </n-input-group>
                    </n-alert>
                  </div>
                  
                  <n-alert v-if="verificationError" type="error">
                    {{ verificationError }}
                  </n-alert>
                </n-space>
              </div>
            </n-card>
            
            <!-- Step 2: Instructions for using code in Suno -->
            <n-card title="Step 2: Use Verification Code in Suno" class="step-card">
              <div class="step-container">
                <div v-if="!verificationCode">
                  <n-alert type="info">
                    <p>Please generate a verification code in Step 1 first.</p>
                  </n-alert>
                </div>
                
                <div v-else>
                  <h3>Instructions:</h3>
                  <n-timeline>
                    <n-timeline-item type="success" title="Go to Suno">
                      <p>Sign in to your Suno account at <a href="https://suno.com" target="_blank">suno.com</a></p>
                    </n-timeline-item>
                    <n-timeline-item type="success" title="Create a song">
                      <p>Create a new song using any prompt</p>
                    </n-timeline-item>
                    <n-timeline-item type="warning" title="Add verification code">
                      <p>Add your verification code <strong>{{ verificationCode }}</strong> in the 'Style' section of your prompt</p>
                    </n-timeline-item>
                    <n-timeline-item type="info" title="Copy song URL">
                      <p>After creating the song, copy its URL for the verification step below</p>
                    </n-timeline-item>
                  </n-timeline>
                </div>
              </div>
            </n-card>
            
            <!-- Step 3: Verify with song URL -->
            <n-card title="Step 3: Verify Your Account" class="step-card">
              <div class="step-container">
                <div v-if="!verificationCode">
                  <n-alert type="info">
                    <p>Please complete Step 1 and Step 2 first.</p>
                  </n-alert>
                </div>
                
                <div v-else-if="verified">
                  <n-result 
                    status="success" 
                    title="Success!" 
                    description="Your Suno account has been successfully verified and linked."
                  >
                    <template #footer>
                      <n-button type="primary" @click="finishLinking">Close</n-button>
                    </template>
                  </n-result>
                </div>
                
                <div v-else>
                  <p>Enter the URL of the Suno song you created with the verification code:</p>
                  
                  <n-form 
                    ref="formRef" 
                    :model="formData" 
                    :rules="formRules"
                    label-placement="top"
                  >
                    <n-form-item label="Song URL" path="songUrl">
                      <n-input 
                        v-model:value="formData.songUrl" 
                        placeholder="https://suno.com/@username/song-id" 
                      />
                    </n-form-item>
                    
                    <n-space>
                      <n-button 
                        type="primary" 
                        @click="verifySunoAccount" 
                        :loading="verificationLoading"
                        :disabled="verificationLoading"
                      >
                        Verify Account
                      </n-button>
                    </n-space>
                    
                    <n-alert v-if="verificationError" type="error" style="margin-top: 15px">
                      {{ verificationError }}
                    </n-alert>
                  </n-form>
                </div>
              </div>
            </n-card>
          </div>
        </n-modal>
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { 
  LogoGoogle, 
  CheckmarkCircleOutline, 
  AlertCircleOutline,
  CopyOutline,
  LinkOutline,
  UnlinkOutline
} from '@vicons/ionicons5'
import { useAuth } from '../composables/useAuth'
import { ref, reactive } from 'vue'
import { useMessage } from 'naive-ui'
import { functions, db } from '../firebase/config'
import { httpsCallable } from 'firebase/functions'
import { collection, query, where, orderBy, limit, getDocs, doc, setDoc, getDoc } from 'firebase/firestore'

// Get authentication functionality
const { 
  user,
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

// Initialize NaiveUI message component
const message = useMessage()

// Link Suno modal states
const showLinkSunoModal = ref(false)
const verificationCode = ref('')
const generatingCode = ref(false)
const verificationLoading = ref(false)
const verificationError = ref('')
const verified = ref(false)

// Form data
const formRef = ref<{ validate: () => Promise<boolean> } | null>(null)
const formData = reactive({
  songUrl: ''
})

// Form validation rules
const formRules = {
  songUrl: [
    { 
      required: true, 
      message: 'Please enter the song URL',
      trigger: 'blur'
    },
    {
      pattern: /^https?:\/\/suno\.com\/.+/,
      message: 'Please enter a valid Suno song URL',
      trigger: 'blur'
    }
  ]
}

// Refresh the user profile data from Firestore
const refreshProfile = async () => {
  if (!user.value) return;
  
  try {
    // Get the latest user profile data from Firestore
    const userRef = doc(db, 'users', user.value.uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      // Update the profile reference with the latest data
      Object.assign(profile.value || {}, userSnap.data());
      console.log('Profile refreshed successfully');
    }
  } catch (error) {
    console.error('Error refreshing profile:', error);
    message.error('Failed to refresh profile data');
  }
};

// Copy verification code to clipboard
const copyToClipboard = () => {
  try {
    // Use document.execCommand as a fallback method that works in Vue/TS context
    const textarea = document.createElement('textarea')
    textarea.value = verificationCode.value
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    message.success('Verification code copied to clipboard')
  } catch (err) {
    console.error('Failed to copy to clipboard:', err)
    message.error('Failed to copy to clipboard')
  }
}

// Open the Suno link modal and prefetch any active verification code
const openLinkSunoModal = async () => {
  showLinkSunoModal.value = true;
  
  // Prefetch active verification code if user is logged in
  if (isLoggedIn.value && user.value) {
    try {
      // Check if there's already an active verification code in Firestore
      const codesRef = collection(db, 'verificationCodes');
      const activeCodesQuery = query(
        codesRef,
        where('userId', '==', user.value.uid),
        where('used', '==', false),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      
      const snapshot = await getDocs(activeCodesQuery);
      
      if (!snapshot.empty) {
        // Found an active verification code, set it
        const codeData = snapshot.docs[0].data();
        verificationCode.value = codeData.code;
        console.log('Found active verification code:', verificationCode.value);
      } else {
        // No active code found, reset to empty
        verificationCode.value = '';
      }
    } catch (error) {
      console.error('Error prefetching verification code:', error);
      // Silently fail - this is just to improve user experience
    }
  }
};

// Generate verification code
const generateCode = async () => {
  try {
    generatingCode.value = true
    verificationError.value = ''
    
    // Call Firebase function to generate verification code
    const generateVerificationCodeFn = httpsCallable(functions, 'generateVerificationCode')
    const result = await generateVerificationCodeFn({})
    
    verificationCode.value = (result.data as { code: string }).code
    message.success('Verification code generated successfully')
  } catch (error) {
    console.error('Error generating verification code:', error)
    verificationError.value = (error as Error)?.message || 'Failed to generate verification code'
    message.error('Failed to generate verification code')
  } finally {
    generatingCode.value = false
  }
}

// This function has been removed since we're no longer using a wizard approach

// Verify Suno account
const verifySunoAccount = async () => {
  try {
    // Validate form
    if (formRef.value) {
      const valid = await formRef.value.validate()
      if (!valid) return
    }
    
    verificationLoading.value = true
    verificationError.value = ''
    
    // Call Firebase function to verify code
    const verifyCodeFn = httpsCallable(functions, 'verifyCode')
    await verifyCodeFn({
      code: verificationCode.value,
      songId: formData.songUrl
    })
    
    // Success - update verified status
    message.success('Your Suno account has been verified successfully')
    verified.value = true
  } catch (error) {
    console.error('Error verifying Suno account:', error)
    verificationError.value = (error as Error)?.message || 'Failed to verify Suno account'
    message.error('Verification failed: ' + verificationError.value)
  } finally {
    verificationLoading.value = false
  }
}

// Finish linking process
const finishLinking = () => {
  showLinkSunoModal.value = false;
  verified.value = false;
  verificationError.value = '';
  formData.songUrl = '';
  // Note: we're no longer clearing verificationCode to persist it
  
  // Refresh the profile data to show the newly linked Suno account
  refreshProfile();
}

// Unlink Suno account function
const unlinkSunoAccount = async () => {
  try {
    if (!user.value || !profile.value || !profile.value.sunoProfile) return;
    
    // Confirm with the user before unlinking
    if (!window.confirm('Are you sure you want to unlink your Suno account? This action cannot be undone.')) {
      return;
    }
    
    const userRef = doc(db, 'users', user.value.uid);
    
    // Update the user document to remove the Suno profile
    await setDoc(userRef, {
      sunoProfile: null,
      activeVerificationCode: null
    }, { merge: true });
    
    // Clear the verification code
    verificationCode.value = '';
    
    // Refresh the profile to reflect changes
    await refreshProfile();
    
    message.success('Your Suno account has been unlinked successfully');
  } catch (error) {
    console.error('Error unlinking Suno account:', error);
    message.error('Failed to unlink Suno account: ' + (error as Error).message);
  }
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

.step-container {
  padding: 16px 0;
}

.verification-code-container {
  margin-top: 16px;
  width: 100%;
}
</style>
