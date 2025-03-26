// Main application functionality
class App {
  constructor() {
    // DOM Elements - Sections
    this.sections = document.querySelectorAll('.section');
    
    // DOM Elements - Modals
    this.loadingModal = document.getElementById('loading-modal');
    this.loadingMessage = document.getElementById('loading-message');
    this.messageModal = document.getElementById('message-modal');
    this.modalMessage = document.getElementById('modal-message');
    this.modalOkBtn = document.getElementById('modal-ok-btn');
    this.closeModalBtn = document.querySelector('.close-modal');
    this.customModal = document.getElementById('custom-modal');
    this.customModalContent = document.getElementById('custom-modal-content');
    
    // Routing state
    this.routes = {
      '': 'auth-section',
      '#dashboard': 'dashboard-section',
      '#create': 'create-playlist-section',
      '#verification': 'verification-section',
      '#playlist': 'playlist-detail-section',
      '#voting': 'voting-section'
    };
    
    // Initialize
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Modal event listeners
    if (this.modalOkBtn) {
      this.modalOkBtn.addEventListener('click', () => this.hideMessage());
    }
    
    if (this.closeModalBtn) {
      this.closeModalBtn.addEventListener('click', () => this.hideMessage());
    }
    
    // Close custom modal when clicking outside content
    if (this.customModal) {
      this.customModal.addEventListener('click', (e) => {
        if (e.target === this.customModal) {
          this.closeModal();
        }
      });
    }
    
    // Handle browser navigation
    window.addEventListener('hashchange', () => this.handleRouteChange());
  }
  
  // Route to the appropriate section based on URL hash
  handleRouteChange() {
    const hash = window.location.hash.substring(1);
    console.log('Handling route change. Current hash:', hash);
    
    // Parse the route and parameters
    const [baseRoute, queryString] = hash.split('?');
    const params = {};
    
    if (queryString) {
      queryString.split('&').forEach(param => {
        const [key, value] = param.split('=');
        params[key] = decodeURIComponent(value);
      });
    }
    
    // Handle special routes
    if (baseRoute === 'playlist' && params.id) {
      // Route to playlist detail
      console.log('Routing to playlist detail:', params.id);
      playlistManager.viewPlaylist(params.id, true); // Allow public access
      return;
    }
    
    if (baseRoute === 'vote' && params.id) {
      // Route to voting
      console.log('Routing to voting:', params.id);
      votingManager.startVoting(params.id, true); // Allow public access (viewing only)
      return;
    }
    
    // Default routes
    const sectionId = this.routes[baseRoute] || this.routes[''];
    console.log('Section ID from route:', sectionId);
    
    // Check authentication requirements for protected routes
    if (['dashboard-section', 'create-playlist-section'].includes(sectionId)) {
      // These routes require authentication
      if (!authService.isLoggedIn()) {
        console.log('Protected route requires login, redirecting to auth');
        this.navigateTo('auth-section');
        return;
      }
    }
    
    this.navigateTo(sectionId, params);
    
    // If we navigated to dashboard, make sure we load the playlists
    if (sectionId === 'dashboard-section') {
      console.log('Loading playlists for dashboard');
      setTimeout(() => playlistManager.loadUserPlaylists(), 100);
    }
  }
  
  // Navigate to a section and update the URL
  navigateTo(sectionId, params = {}) {
    // Hide all sections first
    document.querySelectorAll('.section').forEach(section => {
      section.classList.add('hidden');
    });
    
    // Show the target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
      targetSection.classList.remove('hidden');
    }
    
    // Update URL based on section
    let route = '';
    for (const [key, value] of Object.entries(this.routes)) {
      if (value === sectionId) {
        route = key;
        break;
      }
    }
    
    // Special case for playlist detail and voting
    if (sectionId === 'playlist-detail-section' && params.id) {
      this.updateUrl(`playlist?id=${params.id}`);
    } else if (sectionId === 'voting-section' && params.id) {
      this.updateUrl(`vote?id=${params.id}`);
    } else {
      this.updateUrl(route);
    }
  }
  
  // Update the URL without triggering a page reload
  updateUrl(route) {
    window.history.pushState(null, null, `#${route}`);
  }
  
  // Loading modal
  showLoading(message = 'Loading...') {
    this.loadingMessage.textContent = message;
    this.loadingModal.classList.remove('hidden');
  }
  
  hideLoading() {
    this.loadingModal.classList.add('hidden');
  }
  
  // Message modal
  showMessage(message) {
    this.modalMessage.textContent = message;
    this.messageModal.classList.remove('hidden');
  }
  
  hideMessage() {
    this.messageModal.classList.add('hidden');
  }
  
  // Custom modal
  showModal(content) {
    if (!this.customModal || !this.customModalContent) {
      console.error('Custom modal elements not found in the DOM');
      // Fallback to regular message if custom modal is not available
      if (typeof content === 'string') {
        this.showMessage(content);
      } else if (content instanceof HTMLElement) {
        this.showMessage(content.textContent || 'Custom content cannot be displayed');
      }
      return;
    }
    
    // Clear previous content
    this.customModalContent.innerHTML = '';
    
    // Add new content
    if (typeof content === 'string') {
      this.customModalContent.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      this.customModalContent.appendChild(content);
    }
    
    // Show modal
    this.customModal.classList.remove('hidden');
  }
  
  closeModal() {
    if (!this.customModal) return;
    
    this.customModal.classList.add('hidden');
    
    // Clear content after animation
    if (this.customModalContent) {
      setTimeout(() => {
        this.customModalContent.innerHTML = '';
      }, 300);
    }
  }
  
  // URL parameter handling
  handleURLParameters() {
    // Process specific URL parameters first
    const urlParams = new URLSearchParams(window.location.search);
    const playlistId = urlParams.get('playlist');
    
    if (playlistId) {
      // Store the playlist ID in local storage and redirect to clean URL
      localStorage.setItem('pendingPlaylistId', playlistId);
      // Remove the query parameter
      window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
    }
    
    // Now handle route based on hash
    this.handleRouteChange();
  }
  
  // Initialize app
  init() {
    console.log('Initializing SunoRank app...');
    this.showLoading('Initializing app...');
    
    // Handle URL parameters and initial route
    this.handleURLParameters();
  }
}

// Initialize app components
const app = new App();
const authService = new AuthService();
const verificationService = new VerificationService();
const playlistManager = new PlaylistManager();
// votingManager is initialized in voting.js

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
