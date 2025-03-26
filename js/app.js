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
  
  // Navigation
  navigateTo(sectionId, params = {}) {
    // Hide all sections
    this.sections.forEach(section => {
      section.classList.add('hidden');
    });
    
    // Show target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
      targetSection.classList.remove('hidden');
      
      // Update URL hash based on section
      this.updateUrlForSection(sectionId, params);
      
      // Perform section-specific actions
      if (sectionId === 'dashboard-section' && authService.isLoggedIn()) {
        // Load playlists when navigating to dashboard
        playlistManager.loadUserPlaylists();
      }
    }
  }
  
  // Update URL hash based on section
  updateUrlForSection(sectionId, params = {}) {
    // Find the route key for this section
    let routeKey = '';
    for (const [key, value] of Object.entries(this.routes)) {
      if (value === sectionId) {
        routeKey = key;
        break;
      }
    }
    
    if (!routeKey) return; // No matching route found
    
    // Remove the leading '#' if it exists
    routeKey = routeKey.replace(/^#/, '');
    
    // Build URL parameters
    let paramString = '';
    if (Object.keys(params).length > 0) {
      paramString = '?' + new URLSearchParams(params).toString();
    }
    
    // Update hash without triggering navigation
    const newHash = routeKey ? `#${routeKey}${paramString}` : '';
    if (window.location.hash !== newHash) {
      history.pushState(null, '', newHash);
    }
  }
  
  // Handle route changes (both manual and hash changes)
  handleRouteChange() {
    // Extract base route and parameters
    const { baseRoute, params } = this.parseCurrentRoute();
    
    // Get corresponding section ID
    const sectionId = this.routes[baseRoute] || this.routes[''];
    
    // Check authentication requirements for protected routes
    if (['dashboard-section', 'create-playlist-section', 'playlist-detail-section', 'voting-section'].includes(sectionId)) {
      if (!authService.isLoggedIn()) {
        this.navigateTo('auth-section');
        return;
      }
      
      if (!authService.isVerified() && sectionId !== 'verification-section') {
        this.navigateTo('verification-section');
        return;
      }
    }
    
    // Handle specific route parameters
    if (sectionId === 'playlist-detail-section' && params.id) {
      // Show specific playlist
      playlistManager.viewPlaylist(params.id);
      return; // viewPlaylist handles section display
    }
    
    if (sectionId === 'voting-section' && params.id) {
      // Show voting for specific playlist
      votingManager.startVoting(params.id);
      return; // startVoting handles section display
    }
    
    // Navigate to the section without updating URL (already handled)
    this.showSection(sectionId);
  }
  
  // Show section without updating URL (internal use)
  showSection(sectionId) {
    // Hide all sections
    this.sections.forEach(section => {
      section.classList.add('hidden');
    });
    
    // Show target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
      targetSection.classList.remove('hidden');
      
      // Perform section-specific actions
      if (sectionId === 'dashboard-section' && authService.isLoggedIn()) {
        // Load playlists when navigating to dashboard
        playlistManager.loadUserPlaylists();
      }
    }
  }
  
  // Parse current route from URL hash
  parseCurrentRoute() {
    let hash = window.location.hash || '';
    let params = {};
    
    // Extract base route and parameters
    const paramIndex = hash.indexOf('?');
    let baseRoute = hash;
    
    if (paramIndex > -1) {
      baseRoute = hash.substring(0, paramIndex);
      const paramString = hash.substring(paramIndex + 1);
      params = Object.fromEntries(new URLSearchParams(paramString));
    }
    
    return { baseRoute, params };
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
const votingManager = new VotingManager();

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
