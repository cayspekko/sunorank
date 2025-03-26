// Testing environment functionality
class TestingEnvironment {
  constructor() {
    this.isTestMode = false;
    this.dummyAccounts = {
      admin: {
        uid: 'test-admin-uid',
        email: 'admin@test.com',
        displayName: 'Test Admin',
        photoURL: 'assets/default-avatar.png',
        verified: true,
        isAdmin: true
      },
      user: {
        uid: 'test-user-uid',
        email: 'user@test.com',
        displayName: 'Test User',
        photoURL: 'assets/default-avatar.png',
        verified: true,
        isAdmin: false
      },
      unverified: {
        uid: 'test-unverified-uid',
        email: 'unverified@test.com',
        displayName: 'Test Unverified User',
        photoURL: 'assets/default-avatar.png',
        verified: false,
        isAdmin: false
      }
    };
    
    this.currentTestUser = null;
    this.testPlaylists = [];
    this.testVotes = [];
    
    // DOM Elements for test panel
    this.setupTestElements();
  }
  
  setupTestElements() {
    // Create testing panel
    const panel = document.createElement('div');
    panel.id = 'testing-panel';
    panel.className = 'testing-panel hidden';
    panel.innerHTML = `
      <h3>Testing Environment</h3>
      <div class="test-toggle">
        <label for="test-mode-toggle">Test Mode:</label>
        <input type="checkbox" id="test-mode-toggle">
      </div>
      <div class="test-accounts hidden">
        <h4>Switch Account:</h4>
        <div class="test-buttons">
          <button id="test-admin-btn" class="test-account-btn">Admin</button>
          <button id="test-user-btn" class="test-account-btn">Regular User</button>
          <button id="test-unverified-btn" class="test-account-btn">Unverified User</button>
        </div>
      </div>
      <div class="test-data-actions hidden">
        <h4>Test Data:</h4>
        <button id="generate-test-data-btn">Generate Test Data</button>
        <button id="clear-test-data-btn">Clear Test Data</button>
      </div>
    `;
    document.body.appendChild(panel);
    
    // Create toggle button (separate from panel)
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'toggle-testing-panel-btn';
    toggleBtn.className = 'toggle-panel-btn';
    toggleBtn.textContent = 'Testing';
    document.body.appendChild(toggleBtn);
    
    // Setup event listeners after DOM is fully loaded
    // Use setTimeout to ensure these are added after page load
    setTimeout(() => {
      this.setupTestEventListeners();
    }, 100);
  }
  
  setupTestEventListeners() {
    // Toggle test panel visibility
    const toggleBtn = document.getElementById('toggle-testing-panel-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const panel = document.getElementById('testing-panel');
        if (panel) {
          panel.classList.toggle('hidden');
        }
      });
    } else {
      console.error('Testing toggle button not found in DOM');
    }
    
    // Toggle test mode
    const modeToggle = document.getElementById('test-mode-toggle');
    if (modeToggle) {
      modeToggle.addEventListener('change', (e) => {
        this.toggleTestMode(e.target.checked);
      });
    }
    
    // Test account buttons
    const adminBtn = document.getElementById('test-admin-btn');
    if (adminBtn) {
      adminBtn.addEventListener('click', () => {
        this.switchToTestUser('admin');
      });
    }
    
    const userBtn = document.getElementById('test-user-btn');
    if (userBtn) {
      userBtn.addEventListener('click', () => {
        this.switchToTestUser('user');
      });
    }
    
    const unverifiedBtn = document.getElementById('test-unverified-btn');
    if (unverifiedBtn) {
      unverifiedBtn.addEventListener('click', () => {
        this.switchToTestUser('unverified');
      });
    }
    
    // Test data buttons
    const generateBtn = document.getElementById('generate-test-data-btn');
    if (generateBtn) {
      generateBtn.addEventListener('click', () => {
        this.generateTestData();
      });
    }
    
    const clearBtn = document.getElementById('clear-test-data-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearTestData();
      });
    }
    
    console.log('🧪 Testing environment initialized');
  }
  
  toggleTestMode(enabled) {
    this.isTestMode = enabled;
    
    // Show/hide test UI sections
    const testSections = document.querySelectorAll('.test-accounts, .test-data-actions');
    testSections.forEach(section => {
      if (enabled) {
        section.classList.remove('hidden');
      } else {
        section.classList.add('hidden');
      }
    });
    
    if (enabled) {
      console.log('🧪 Test mode enabled');
      // Switch to a test user by default
      this.switchToTestUser('user');
    } else {
      console.log('🧪 Test mode disabled');
      // Sign out of test account
      this.signOutTestUser();
      // Return to regular auth
      authService.handleAuthNavigation();
    }
  }
  
  switchToTestUser(userType) {
    if (!this.isTestMode) return;
    
    const userData = this.dummyAccounts[userType];
    if (!userData) return;
    
    this.currentTestUser = {
      ...userData,
      // Add Firebase Auth user properties
      emailVerified: true,
      isAnonymous: false,
      providerData: [{
        providerId: 'test.provider',
        uid: userData.uid,
        displayName: userData.displayName,
        email: userData.email,
        photoURL: userData.photoURL
      }]
    };
    
    // Override the current user in AuthService
    authService.currentUser = this.currentTestUser;
    authService.userVerified = userData.verified;
    
    // Update UI
    authService.updateUIForSignedInUser(this.currentTestUser);
    
    // Navigate to appropriate section
    if (userData.verified) {
      app.navigateTo('dashboard-section');
      // Load test playlists
      this.loadTestPlaylists();
    } else {
      app.navigateTo('verification-section');
    }
    
    console.log(`🧪 Switched to test user: ${userData.displayName}`);
  }
  
  signOutTestUser() {
    if (!this.isTestMode) return;
    
    this.currentTestUser = null;
    
    // Update AuthService
    authService.currentUser = null;
    authService.userVerified = false;
    
    // Update UI
    authService.updateUIForSignedOutUser();
  }
  
  // Override Firebase methods for test mode
  async getUserProfile(userId) {
    if (!this.isTestMode) return null;
    
    // Find the test user that matches the userId
    for (const key in this.dummyAccounts) {
      if (this.dummyAccounts[key].uid === userId) {
        return this.dummyAccounts[key];
      }
    }
    
    return null;
  }
  
  // Override playlists methods for test mode
  async loadTestPlaylists() {
    if (!this.isTestMode || !this.currentTestUser) return;
    
    // Load user-specific test playlists
    const userPlaylists = this.testPlaylists.filter(p => p.userId === this.currentTestUser.uid);
    
    // Render playlists if available, otherwise create sample data
    if (userPlaylists.length > 0) {
      playlistManager.renderPlaylists(userPlaylists);
    } else if (this.testPlaylists.length === 0) {
      // Automatically generate test data if none exists
      this.generateTestData();
    }
  }
  
  // Generate test data
  async generateTestData() {
    if (!this.isTestMode || !this.currentTestUser) return;
    
    app.showLoading('Generating test data...');
    
    // Generate sample playlists for the current test user
    const samplePlaylists = this.generateSamplePlaylists();
    
    // Add the playlists to our test data
    this.testPlaylists = [
      ...this.testPlaylists.filter(p => p.userId !== this.currentTestUser.uid),
      ...samplePlaylists
    ];
    
    // Generate sample votes
    this.generateSampleVotes();
    
    // Render the playlists
    playlistManager.renderPlaylists(samplePlaylists);
    
    app.hideLoading();
    app.showMessage('Test data generated successfully!');
  }
  
  generateSamplePlaylists() {
    if (!this.currentTestUser) return [];
    
    const playlists = [];
    const genres = ['Pop', 'Rock', 'Hip Hop', 'Electronic', 'Jazz'];
    
    // Create 3 sample playlists
    for (let i = 1; i <= 3; i++) {
      const genre = genres[Math.floor(Math.random() * genres.length)];
      const playlistId = `test-playlist-${this.currentTestUser.uid}-${i}`;
      
      const songs = [];
      // Create 5 sample songs per playlist
      for (let j = 1; j <= 5; j++) {
        songs.push({
          id: `test-song-${playlistId}-${j}`,
          title: `${genre} Test Song ${j}`,
          artist: `Test Artist ${j}`,
          album: `Test Album`,
          duration: 180,
          imageUrl: `https://via.placeholder.com/300?text=Test+${j}`
        });
      }
      
      playlists.push({
        id: playlistId,
        name: `${this.currentTestUser.displayName}'s ${genre} Playlist ${i}`,
        description: `A test playlist for ${genre} music`,
        userId: this.currentTestUser.uid,
        userName: this.currentTestUser.displayName,
        items: songs,
        voteCount: Math.floor(Math.random() * 20), // Random vote count
        createdAt: new Date().toISOString(),
        votingOpen: true
      });
    }
    
    return playlists;
  }
  
  generateSampleVotes() {
    if (!this.currentTestUser) return;
    
    // Clear existing votes for this user's playlists
    this.testVotes = this.testVotes.filter(v => {
      const playlist = this.testPlaylists.find(p => p.id === v.playlistId);
      return !playlist || playlist.userId !== this.currentTestUser.uid;
    });
    
    // Get this user's playlists
    const userPlaylists = this.testPlaylists.filter(p => p.userId === this.currentTestUser.uid);
    
    // For each playlist, generate some votes
    userPlaylists.forEach(playlist => {
      const voteCount = playlist.voteCount || 10;
      
      for (let i = 0; i < voteCount; i++) {
        // Create a simulated voter (not the playlist owner)
        const voterId = `test-voter-${i}`;
        
        // If there are 5 songs, create a ranking of them
        const songIds = playlist.items.map(item => item.id);
        // Shuffle the song IDs to create a random ranking
        const shuffledIds = [...songIds].sort(() => Math.random() - 0.5);
        
        // Create a vote with a ranking
        const vote = {
          id: `test-vote-${playlist.id}-${voterId}`,
          playlistId: playlist.id,
          userId: voterId,
          userName: `Test Voter ${i}`,
          ranking: shuffledIds.map((songId, index) => ({
            songId,
            rank: index + 1
          })),
          timestamp: new Date().toISOString()
        };
        
        this.testVotes.push(vote);
      }
    });
  }
  
  clearTestData() {
    if (!this.isTestMode || !this.currentTestUser) return;
    
    app.showLoading('Clearing test data...');
    
    // Remove playlists for the current test user
    this.testPlaylists = this.testPlaylists.filter(p => p.userId !== this.currentTestUser.uid);
    
    // Remove votes for those playlists
    this.testVotes = this.testVotes.filter(v => {
      const playlist = this.testPlaylists.find(p => p.id === v.playlistId);
      return playlist != null; // Keep votes only for playlists that still exist
    });
    
    // Update UI
    playlistManager.renderPlaylists([]);
    
    app.hideLoading();
    app.showMessage('Test data cleared successfully!');
  }
  
  // Method to get a playlist for testing
  getTestPlaylist(playlistId) {
    if (!this.isTestMode) return null;
    return this.testPlaylists.find(p => p.id === playlistId);
  }
  
  // Method to get votes for a playlist
  getTestVotes(playlistId) {
    if (!this.isTestMode) return [];
    return this.testVotes.filter(v => v.playlistId === playlistId);
  }
}

// Initialize testing environment - wait until DOM is fully loaded
window.addEventListener('DOMContentLoaded', () => {
  window.testingEnvironment = new TestingEnvironment();
});
