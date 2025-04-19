import { createApp, ref, computed, watch, onMounted } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import { useAuth } from './auth.vue.js';
import { usePlaylist } from './playlist.vue.js';
import { useVerification } from './verification.vue.js';

// Login Modal Component
const LoginModal = {
  name: 'LoginModal',
  template: document.getElementById('login-modal-template').innerHTML,
  props: ['show'],
  emits: ['close', 'login-success'],
  setup(props, { emit }) {
    const { login, isLoading } = useAuth();
    
    const handleLogin = async () => {
      const result = await login();
      if (result) {
        emit('login-success');
        emit('close');
      }
    };
    
    return { login: handleLogin, isLoading };
  }
};

// Verification Modal Component
const VerificationModal = {
  name: 'VerificationModal',
  template: document.getElementById('verification-modal-template').innerHTML,
  props: ['show'],
  emits: ['close', 'verified'],
  setup(props, { emit }) {
    const { 
      verificationCode, generateVerificationCode, isVerifying, verifySunoSong,
      verificationStatus, verificationError, verificationUserHandle, verificationSongUrl
    } = useVerification();
    
    const handleVerifySunoSong = async () => {
      await verifySunoSong();
      if (verificationStatus.value === 'Verified!') {
        setTimeout(() => {
          emit('verified');
          emit('close');
        }, 1000);
      }
    };
    
    return {
      verificationCode,
      generateVerificationCode,
      isVerifying,
      verifySunoSong: handleVerifySunoSong,
      verificationStatus,
      verificationError, 
      verificationUserHandle,
      verificationSongUrl
    };
  }
};

// Delete Confirmation Modal Component
const DeleteConfirmationModal = {
  name: 'DeleteConfirmationModal',
  template: document.getElementById('delete-confirmation-template').innerHTML,
  props: ['show', 'playlistName', 'playlistId'],
  emits: ['close', 'confirm-delete'],
  setup(props, { emit }) {
    // This is the function that will be called when the user clicks Delete in the modal
    const confirmDelete = () => {
      // First emit the confirm-delete event with the playlist ID
      emit('confirm-delete', props.playlistId);
      // Then close the modal
      emit('close');
    };
    
    return { confirmDelete };
  }
};

const App = {
  name: 'VueApp',
  components: {
    LoginModal,
    VerificationModal,
    DeleteConfirmationModal
  },
  template: document.getElementById('main-template').innerHTML,
  setup() {
    // Get state from composables
    const { verificationCode, generateVerificationCode, isVerifying, verifySunoSong,
      verificationStatus, verificationError, verificationUserHandle, verificationSongUrl
     } = useVerification();

    const { currentUser, userVerified, userDisplayName, userPhotoUrl,
      sunoAvatarUrl, hasSunoProfile, login, logout, isLoggedIn, isVerified
    } = useAuth();

    const { playlists, currentPlaylist, playlistRanking, tournamentStatus,
      loadUserPlaylists, viewPlaylist, sharePlaylist, confirmDeletePlaylist, deletePlaylist,
      savePlaylist, editPlaylist, resetCreateForm, canEditPlaylist, 
      formData, fetchSunoPlaylist
    } = usePlaylist();

    // UI state
    const errorMessage = ref('');
    const isLoading = ref(false);
    const loading = computed(() => isLoading.value || isVerifying.value);
    const loadingMessage = computed(() => {
      if (isVerifying.value) {
        return verificationSongUrl.value 
          ? "Verifying your Suno song..." 
          : "Generating verification code...";
      }
      return "Loading...";
    });

    // Hash/section mappings for navigation
    const hashToSection = {
      'dashboard': 'dashboard-section',
      'create': 'create-playlist-section',
      'playlist': 'playlist-detail-section',
      'verify': 'verification-section'
    };
    
    const sectionToHash = {
      'dashboard-section': 'dashboard',
      'create-playlist-section': 'create',
      'verification-section': 'verify'
    };
    
    // Auth tracking
    const authStateLoaded = ref(false);
    const showLoginModal = ref(true);
    const showVerificationModal = ref(true);
    const pendingAuthAction = ref(null);
    
    // Delete confirmation state
    const showDeleteModal = ref(false);
    const deletePlaylistName = ref('');
    const deletePlaylistId = ref('');

    // Computed property for the Suno profile URL
    const sunoProfileUrl = computed(() => {
      return hasSunoProfile.value && sunoAvatarUrl.value 
        ? `https://suno.com/@${sunoAvatarUrl.value.split('/').pop()}` 
        : '#';
    });
    
    // Helper functions for auth modals
    function handleLoginSuccess() {
      showLoginModal.value = false;
      if (!isVerified()) {
        showVerificationModal.value = true;
      } else {
        handlePendingAction();
      }
    }
    
    function handleVerificationSuccess() {
      showVerificationModal.value = false;
      handlePendingAction();
    }
    
    // Handler function for playlist deletion
    function handlePlaylistDelete(playlistId) {
      console.log('Handling playlist delete in App component:', playlistId);
      if (typeof deletePlaylist === 'function' && playlistId) {
        deletePlaylist(playlistId);
      } else {
        console.error('deletePlaylist is not a function or playlistId is missing');
      }
    }
    
    function handlePendingAction() {
      if (pendingAuthAction.value) {
        const { section, params } = pendingAuthAction.value;
        if (params) {
          goTo(section, params);
        } else {
          goTo(section);
        }
        pendingAuthAction.value = null;
      }
    }
    
    // Check if user can access a section
    function needsAuth(section) {
      const protectedSections = ['dashboard-section', 'create-playlist-section', 'playlist-detail-section'];
      return protectedSections.includes(section) && !isLoggedIn();
    }
    
    function needsVerification(section) {
      const verificationSections = ['dashboard-section', 'create-playlist-section', 'playlist-detail-section'];
      return verificationSections.includes(section) && isLoggedIn() && !isVerified();
    }
    
    // Reactive wrapper for the hash
    const currentHash = ref(window.location.hash.replace(/^#/, '') || 'dashboard');
    
    // Current section based on hash
    const currentSection = computed(() => {
      const baseRoute = currentHash.value.split('?')[0];
      const section = hashToSection[baseRoute] || 'dashboard-section';
      return section;
    });
    
    // Simple navigation helper
    function goTo(section, playlistId = null) {
      console.log(`Navigating to ${section}` + (playlistId ? ` with ID: ${playlistId}` : ''));
      
      // Check for auth requirements
      if (needsAuth(section)) {
        pendingAuthAction.value = playlistId ? { section, params: playlistId } : { section };
        showLoginModal.value = true;
        return;
      }
      
      if (needsVerification(section)) {
        pendingAuthAction.value = playlistId ? { section, params: playlistId } : { section };
        showVerificationModal.value = true;
        return;
      }
      
      // Update URL
      if (section === 'playlist-detail-section' && playlistId) {
        window.location.hash = `playlist?id=${playlistId}`;
      } else {
        const hash = sectionToHash[section] || 'dashboard';
        window.location.hash = hash;
      }
      
      // Perform section-specific actions
      if (section === 'dashboard-section' && isLoggedIn()) {
        loadUserPlaylists();
      } else if (section === 'playlist-detail-section' && playlistId) {
        viewPlaylist(playlistId);
      } else if (section === 'create-playlist-section') {
        // Only reset form if we're not in edit mode
        if (!formData.isEditMode) {
          resetCreateForm();
        } else {
          console.log('Navigating to create section in edit mode, preserving form data');
        }
      }
    }

    // Process route changes from hash updates
    function handleRoute() {
      // Always hide modals if the user is already authenticated
      if (isLoggedIn()) {
        showLoginModal.value = false;
      }
      
      if (isLoggedIn() && isVerified()) {
        showVerificationModal.value = false;
      }
      
      // Parse the hash
      const hash = window.location.hash.substring(1) || 'dashboard';
      const [baseRoute, queryString] = hash.split('?');
      const params = new URLSearchParams(queryString || '');

      // Update the reactive hash
      currentHash.value = hash;
      
      // Handle playlist route
      if (baseRoute === 'playlist' && params.get('id')) {
        const playlistId = params.get('id');
        
        if (needsAuth('playlist-detail-section')) {
          pendingAuthAction.value = { section: 'playlist-detail-section', params: playlistId };
          showLoginModal.value = true;
          return;
        }
        
        if (needsVerification('playlist-detail-section')) {
          pendingAuthAction.value = { section: 'playlist-detail-section', params: playlistId };
          showVerificationModal.value = true;
          return;
        }
        
        // User has access, load the playlist
        viewPlaylist(playlistId);
        return;
      }
      
      // Handle other routes
      const targetSection = hashToSection[baseRoute] || 'dashboard-section';
      
      // Check auth requirements
      if (needsAuth(targetSection)) {
        pendingAuthAction.value = { section: targetSection };
        showLoginModal.value = true;
        return;
      }
      
      if (needsVerification(targetSection)) {
        pendingAuthAction.value = { section: targetSection };
        showVerificationModal.value = true;
        return;
      }
      
      // Load dashboard data if needed
      if (targetSection === 'dashboard-section' && isLoggedIn()) {
        loadUserPlaylists();
      }
    }

    // Monitor auth state changes
    watch([currentUser, userVerified], () => {
      console.log('Auth state changed:', { loggedIn: isLoggedIn(), verified: isVerified() });
      
      // Mark auth state as loaded when we've received values
      if (!authStateLoaded.value && currentUser.value !== null) {
        console.log('Auth state now loaded');
        authStateLoaded.value = true;
      }
      
      // Clear any modals if user is logged in
      if (isLoggedIn()) {
        console.log('User is logged in, ensuring login modal is closed');
        showLoginModal.value = false;
      }
      
      // Clear verification modal if user is verified
      if (isLoggedIn() && isVerified()) {
        console.log('User is verified, ensuring verification modal is closed');
        showVerificationModal.value = false;
        // Execute any pending actions that were waiting for full authentication
        handlePendingAction();
      }
    }, { immediate: true });
    
    // Only update history state when section changes, without triggering navigation
    watch(currentSection, (newSection) => {
      // Skip for playlist detail which has special URL handling
      if (newSection === 'playlist-detail-section') return;
      
      // Get the appropriate hash for this section
      const hash = sectionToHash[newSection] || 'dashboard';
      const fullHash = `#${hash}`;
      
      // Only update if different from current hash (avoid loops)
      if (window.location.hash !== fullHash) {
        console.log(`Updating history state to match section: ${newSection} → ${fullHash}`);
        // Use history.replaceState to avoid triggering hashchange events
        window.history.replaceState(null, null, fullHash);
      }
    });


    // Handle initial auth state
    watch([currentUser, userVerified], () => {
      // Mark auth as loaded once we have user info
      if (!authStateLoaded.value && currentUser.value !== undefined) {
        console.log('Auth state loaded', { user: currentUser.value, verified: userVerified.value });
        authStateLoaded.value = true;
      }
    }, { immediate: true });

    // Helper function to ensure the section is properly updated based on the current hash
    function forceUpdateFromHash() {
      console.log('Force updating from current hash');
      const hash = window.location.hash.replace(/^#/, '') || 'dashboard';
      const baseRoute = hash.split('?')[0];
      
      // Ensure the section matches the hash
      const section = hashToSection[baseRoute] || 'dashboard-section';
      console.log(`Current hash: ${hash}, mapped to section: ${section}`);
      
      // Specific logic for sections that need data loaded
      if (section === 'dashboard-section' && isLoggedIn() && isVerified()) {
        console.log('Loading playlists for dashboard');
        loadUserPlaylists();
      } else if (section === 'playlist-detail-section') {
        const params = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
        const playlistId = params.get('id');
        if (playlistId && isLoggedIn() && isVerified()) {
          console.log('Loading playlist details:', playlistId);
          viewPlaylist(playlistId);
        }
      }
    }

    onMounted(() => {
      // Set default hash if none exists
      if (!window.location.hash) {
        window.location.hash = 'dashboard';
      }
      
      // Initialize the reactive hash wrapper
      currentHash.value = window.location.hash.replace(/^#/, '') || 'dashboard';
      
      // Set up hash change listener
      window.addEventListener('hashchange', () => {
        currentHash.value = window.location.hash.replace(/^#/, '') || 'dashboard';
        handleRoute();
      });
      
      // Process the initial route once auth state is loaded
      watch(authStateLoaded, (isLoaded) => {
        if (isLoaded) {
          handleRoute();
        }
      }, { immediate: true });
    });

    // We don't need this - already using the computed sunoProfileUrl above
    
    return {
      // Auth
      currentUser, userVerified, userDisplayName, userPhotoUrl,
      sunoAvatarUrl, hasSunoProfile, isLoggedIn, isVerified,
      login, logout,

      // App State
      currentSection, errorMessage,

      // Playlist
      currentPlaylist, playlists, playlistRanking, tournamentStatus,
      goTo, resetCreateForm, fetchSunoPlaylist,
      loadUserPlaylists, sharePlaylist, viewPlaylist, confirmDeletePlaylist, deletePlaylist,
      formData, savePlaylist, canEditPlaylist, editPlaylist,
      
      // Verification
      verificationCode, 
      generateVerificationCode,
      isVerifying,
      verifySunoSong,
      verificationSongUrl,
      verificationUserHandle,
      verificationStatus,
      verificationError,
      
      // UI State
      loading,
      loadingMessage,
      
      // Modal state
      showLoginModal,
      showVerificationModal,
      showDeleteModal,
      deletePlaylistName,
      deletePlaylistId,
      handleLoginSuccess,
      handleVerificationSuccess,
      handlePlaylistDelete,
      
      // Suno Profile URL
      sunoProfileUrl,
      
      // Common UI states
      isLoading: ref(false),
      playlistsLoading: ref(false),
      noPlaylistsFound: ref(false),
      playlistError: ref(null),
      modalMessage: ref(null)
    };
  }
};

// Mount Vue app
const vueApp = createApp(App);
vueApp.config.globalProperties.verificationService = window.verificationService;
vueApp.component('vue-app', App);
vueApp.mount('#app');
window.vueApp = vueApp;