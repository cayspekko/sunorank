import { createApp, ref, computed, watch, onMounted } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import { useAuth } from './auth.vue.js';
import { usePlaylist } from './playlist.vue.js';
import { useVerification } from './verification.vue.js';

const App = {
  name: 'VueApp',
  template: document.getElementById('main-template').innerHTML,
  setup() {
    // Verification state (Vue composable)
    const {verificationCode, generateVerificationCode, isVerifying, verifySunoSong,
      verificationStatus, verificationError, verificationUserHandle, verificationSongUrl
     } = useVerification();
    // Auth state
    const {
      currentUser, userVerified, userDisplayName, userPhotoUrl,
      sunoAvatarUrl, hasSunoProfile, login, logout,
      isLoggedIn, isVerified
    } = useAuth();

    // Playlist state
    const {
      playlists, currentPlaylist, playlistRanking, tournamentStatus,
      loadUserPlaylists, viewPlaylist, sharePlaylist,
      confirmDeletePlaylist, savePlaylist, editPlaylist,
      resetCreateForm, canEditPlaylist, formData, fetchSunoPlaylist,
    } = usePlaylist();

    const errorMessage = ref('');
    
    // Loading state for UI
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

    // Simplified hash to section mapping
    const hashToSection = {
      'login': 'auth-section',
      'dashboard': 'dashboard-section',
      'create': 'create-playlist-section',
      'playlist': 'playlist-detail-section',
      'verify': 'verification-section'
    };
    
    // Section to hash mapping (for generating URLs)
    const sectionToHash = {
      'auth-section': 'login',
      'dashboard-section': 'dashboard',
      'create-playlist-section': 'create',
      'verification-section': 'verify'
      // playlist-detail-section handled specially
    };
    
    // Auth state tracking to prevent race conditions
    const authStateLoaded = ref(false);
    
    // Navigation guard - ensures user is redirected based on auth state
    // Simple navigation guard - redirects via hash changes based on auth state
    function guardNavigation() {
      // Skip if auth state not loaded yet
      if (!authStateLoaded.value) {
        return false;
      }
      
      // Get current hash or default to dashboard
      const currentHash = window.location.hash.replace(/^#/, '') || 'dashboard';
      const baseRoute = currentHash.split('?')[0];
      const params = currentHash.includes('?') ? currentHash.split('?')[1] : null;
      
      const isUserLoggedIn = isLoggedIn();
      const isUserVerified = userVerified.value;
      
      console.log('Guard navigation:', { isUserLoggedIn, isUserVerified, currentHash });
      
      // Determine where user should go based on auth state
      let targetHash = baseRoute;
      
      // Apply redirect rules
      if (!isUserLoggedIn) {
        targetHash = 'login';
      } else if (!isUserVerified && baseRoute !== 'verify') {
        targetHash = 'verify';
      } else if (isUserVerified && (baseRoute === 'login' || baseRoute === 'verify')) {
        targetHash = 'dashboard';
      }
      
      // Add back any params if needed
      if (params && targetHash === baseRoute) {
        targetHash += '?' + params;
      }
      
      // Only redirect if the hash would change
      if (baseRoute !== targetHash) {
        console.log(`Redirecting: ${baseRoute} → ${targetHash}`);
        window.location.hash = targetHash;
        return true; // Navigation changed
      }
      
      return false; // No change needed
    }
    
    // Reactive wrapper for the hash
    const currentHash = ref(window.location.hash.replace(/^#/, '') || 'dashboard');
    
    // Current section based on hash
    const currentSection = computed(() => {
      const baseRoute = currentHash.value.split('?')[0];
      const section = hashToSection[baseRoute] || 'dashboard-section';
      console.log(`Computing currentSection: hash=${currentHash.value}, section=${section}`);
      return section;
    });
    
    // Simplified navigation helper
    function goTo(section, playlistId = null) {
      if (section === 'playlist-detail-section' && playlistId) {
        window.location.hash = `playlist?id=${playlistId}`;
      } else {
        const hash = sectionToHash[section] || 'dashboard';
        window.location.hash = hash;
      }

      // if (currentSection.value === 'create-playlist-section' && section !== 'create-playlist-section') {
      //   resetCreateForm();
      // }



      // if (section === 'dashboard-section' && isLoggedIn() && isVerified()) {
      //   loadUserPlaylists();
      // } else if (section === 'playlist-detail-section' && isLoggedIn() && isVerified() && playlistId) {
      //   viewPlaylist(playlistId);
      // }
    }

    function handleRoute() {
      const hash = window.location.hash.substring(1);
      const [baseRoute, queryString] = hash.split('?');
      const params = new URLSearchParams(queryString);

      if (baseRoute === 'playlist' && params.get('id')) {
        return isLoggedIn() && isVerified()
          ? goTo('playlist-detail-section', params.get('id'))
          : goTo('auth-section');
      }

      goTo(hashToSection[baseRoute] || 'auth-section');
    }

    // Run navigation guard when auth state changes
    watch([currentUser, userVerified], () => {
      console.log('Auth state changed - applying navigation guard');
      
      // Mark auth state as loaded when we've received values
      if (!authStateLoaded.value && currentUser.value !== null) {
        console.log('Auth state now loaded');
        authStateLoaded.value = true;
      }
      
      // Run guard if auth is fully loaded
      if (authStateLoaded.value) {
        guardNavigation();
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

    // Simple hash change listener
    const setupHashChangeListener = () => {
      window.addEventListener('hashchange', () => {
        const newHash = window.location.hash.replace(/^#/, '') || 'dashboard';
        console.log(`Hash changed to: ${newHash}`);
        // Update the reactive hash wrapper
        currentHash.value = newHash;
        
        // Apply guard then handle route if needed
        if (!guardNavigation()) {
          handleRoute(); 
        }
      });
    };

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
      console.log('App mounted');
      
      // Set default hash if none exists
      if (!window.location.hash) {
        window.location.hash = 'dashboard';
      }
      
      // Initialize the reactive hash wrapper with current hash
      currentHash.value = window.location.hash.replace(/^#/, '') || 'dashboard';
      console.log('Initial hash set to:', currentHash.value);
      
      // Set up hash change listener
      setupHashChangeListener();
      
      // Apply guard once auth is loaded
      watch(authStateLoaded, (isLoaded) => {
        if (isLoaded) {
          console.log('Auth loaded, applying navigation guard');
          
          // Apply navigation guard and update hash if needed
          const redirected = guardNavigation();
          
          // If no redirect, ensure we handle the initial route
          if (!redirected) {
            handleRoute();
          }
        }
      }, { immediate: true });
      
      // Also handle the initial hash if auth is already loaded
      if (authStateLoaded.value) {
        forceUpdateFromHash();
      }
    });

    return {
      // Auth
      currentUser, userVerified, userDisplayName, userPhotoUrl,
      sunoAvatarUrl, hasSunoProfile, isLoggedIn, isVerified,
      login, logout,

      // App State
      currentSection, errorMessage,

      // Playlist
      currentPlaylist, playlists, 
      goTo, resetCreateForm, fetchSunoPlaylist,
      loadUserPlaylists, sharePlaylist,
      formData, savePlaylist,
      
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
      
      // Missing properties that caused warnings
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