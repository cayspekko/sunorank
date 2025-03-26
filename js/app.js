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
