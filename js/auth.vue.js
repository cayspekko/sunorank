// Auth component for Vue 3
import { ref, computed, onMounted } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import { useFirebase } from './firebase.vue.js';

export const useAuth = () => {
  const { 
    currentUser, 
    userVerified, 
    sunoProfile, 
    isLoading,
    signInWithGoogle,
    signOut,
    isLoggedIn,
    isVerified,
    refreshUserState
  } = useFirebase();
  
  // Auth component state
  const authMessage = ref('');
  
  // Computed properties
  const userDisplayName = computed(() => currentUser.value?.displayName || '');
  const userPhotoUrl = computed(() => currentUser.value?.photoURL || 'assets/default-avatar.png');
  const sunoProfileUrl = computed(() => 
    sunoProfile.value ? `https://suno.com/@${sunoProfile.value.handle}` : '#'
  );
  const sunoAvatarUrl = computed(() => sunoProfile.value?.avatarImageUrl || '');
  const hasSunoProfile = computed(() => !!sunoProfile.value);
  
  // Auth methods
  const login = async () => {
    authMessage.value = '';
    const result = await signInWithGoogle();
    if (result.error) {
      authMessage.value = `Error signing in: ${result.error}`;
    }
  };
  
  const logout = async () => {
    authMessage.value = '';
    const result = await signOut();
    if (result.error) {
      authMessage.value = `Error signing out: ${result.error}`;
    }
  };
  
  // Navigation helper - returns the section that should be shown based on auth state
  const getAppropriateSection = () => {
    if (!isLoggedIn()) {
      return 'auth-section';
    }
    
    if (!isVerified()) {
      return 'verification-section';
    }
    
    return 'dashboard-section';
  };
  
  // Return everything needed for the auth functionality
  return {
    // State
    currentUser,
    userVerified,
    sunoProfile,
    isLoading,
    authMessage,
    
    // Computed
    userDisplayName,
    userPhotoUrl,
    sunoProfileUrl,
    sunoAvatarUrl,
    hasSunoProfile,
    
    // Methods
    login,
    logout,
    isLoggedIn,
    isVerified,
    refreshUserState,
    getAppropriateSection
  };
};
