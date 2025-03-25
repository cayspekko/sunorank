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
    
    // Initialize
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Modal event listeners
    this.modalOkBtn.addEventListener('click', () => this.hideMessage());
    this.closeModalBtn.addEventListener('click', () => this.hideMessage());
  }
  
  // Navigation
  navigateTo(sectionId) {
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
  
  // URL parameter handling
  handleURLParameters() {
    // Check for shared playlist in URL
    playlistManager.checkForSharedPlaylist();
  }
  
  // Initialize app
  init() {
    console.log('Initializing SunoRank app...');
    this.showLoading('Initializing app...');
    
    // Handle URL parameters
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
