import { createApp, ref, computed, watch, onMounted } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import { useAuth } from './auth.vue.js';
import { usePlaylist } from './playlist.vue.js';

const App = {
  name: 'VueApp',
  template: document.getElementById('main-template').innerHTML,
  setup() {
    // Auth state
    const {
      currentUser, userVerified, userDisplayName, userPhotoUrl,
      sunoAvatarUrl, hasSunoProfile, login, logout,
      isLoggedIn, isVerified, getAppropriateSection
    } = useAuth();

    // Playlist state
    const {
      playlists, currentPlaylist, playlistRanking, tournamentStatus,
      loadUserPlaylists, viewPlaylist, sharePlaylist,
      confirmDeletePlaylist, savePlaylist, editPlaylist,
      resetCreateForm, canEditPlaylist
    } = usePlaylist();

    const currentSection = ref('auth-section');
    const errorMessage = ref('');

    const routeMap = {
      '': 'auth-section',
      'dashboard': 'dashboard-section',
      'create': 'create-playlist-section',
      'playlist': 'playlist-detail-section'
    };

    const reverseRouteMap = {
      'auth-section': '',
      'dashboard-section': 'dashboard',
      'create-playlist-section': 'create'
      // playlist-detail-section handled by goTo
    };

    function goTo(section, playlistId = null) {
      if (section === 'playlist-detail-section' && playlistId) {
        window.location.hash = `playlist?id=${playlistId}`;
      } else if (section !== currentSection.value) {
        window.location.hash = `#${reverseRouteMap[section] || ''}`;
      }

      if (currentSection.value === 'create-playlist-section' && section !== 'create-playlist-section') {
        resetCreateForm();
      }

      currentSection.value = section;

      if (section === 'dashboard-section' && isLoggedIn() && isVerified()) {
        loadUserPlaylists();
      } else if (section === 'playlist-detail-section' && isLoggedIn() && isVerified() && playlistId) {
        viewPlaylist(playlistId);
      }
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

      goTo(routeMap[baseRoute] || 'auth-section');
    }

    watch([currentUser, userVerified], () => {
      const hash = window.location.hash;
      const isPlaylistUrl = hash.includes('playlist?id=');

      if (isPlaylistUrl) {
        handleRoute();
      } else if (isLoggedIn() && isVerified()) {
        goTo('dashboard-section');
      } else {
        goTo('auth-section');
      }
    }, { immediate: true });

    watch(currentSection, (newSection) => {
      if (newSection === 'playlist-detail-section') return;

      const route = reverseRouteMap[newSection] || '';
      const newHash = route ? `#${route}` : '#';

      if (window.location.hash !== newHash) {
        window.history.pushState(null, null, newHash);
      }
    });

    onMounted(() => {
      const hash = window.location.hash.substring(1);
      if (hash) {
        handleRoute();
      } else if (isLoggedIn() && isVerified()) {
        goTo('dashboard-section');
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
      playlists, currentPlaylist, playlistRanking, tournamentStatus,

      // Actions
      goTo, loadUserPlaylists, viewPlaylist,
      sharePlaylist, confirmDeletePlaylist, savePlaylist,
      editPlaylist, canEditPlaylist
    };
  }
};

// Mount Vue app
const vueApp = createApp(App);
vueApp.config.globalProperties.verificationService = window.verificationService;
vueApp.component('vue-app', App);
vueApp.mount('#app');
window.vueApp = vueApp;

// Debug helper
window.debugVue = () => {
  const app = window.vueApp?._instance?.setupState;
  if (!app) return console.log('Vue app not mounted');
  console.log('App State:', {
    section: app.currentSection.value,
    isLoggedIn: app.isLoggedIn(),
    currentPlaylist: app.currentPlaylist?.value,
    playlists: app.playlists.value
  });
};
