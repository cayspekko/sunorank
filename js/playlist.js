// Playlist Management functionality
class PlaylistManager {
  constructor() {
    // DOM Elements - Dashboard
    this.playlistsContainer = document.getElementById('playlists-container');
    this.createPlaylistBtn = document.getElementById('create-playlist-btn');
    this.noPlaylistsMessage = document.getElementById('no-playlists-message');

    // DOM Elements - Create Playlist
    this.playlistNameInput = document.getElementById('playlist-name');
    this.playlistNameDisplay = document.getElementById('playlist-name-display');
    this.playlistNameContainer = document.getElementById('playlist-name-container');
    this.editNameBtn = document.getElementById('edit-name-btn');
    this.editNameContainer = document.getElementById('edit-name-container');
    this.playlistUrlInput = document.getElementById('playlist-url');
    this.fetchPlaylistBtn = document.getElementById('fetch-playlist-btn');
    this.itemsContainer = document.getElementById('items-container');
    this.savePlaylistBtn = document.getElementById('save-playlist-btn');
    this.cancelCreateBtn = document.getElementById('cancel-create-btn');
    this.votingDeadlineInput = document.getElementById('voting-deadline');

    // DOM Elements - Playlist Detail
    this.playlistDetailName = document.getElementById('playlist-detail-name');
    this.playlistDetailInfo = document.getElementById('playlist-detail-info');
    this.currentRanking = document.getElementById('current-ranking');
    this.backToDashboardBtn = document.getElementById('back-to-dashboard-btn');
    this.shareLink = document.getElementById('share-link');
    this.copyLinkBtn = document.getElementById('copy-link-btn');

    // Tab Elements
    this.tabButtons = document.querySelectorAll('.tab-btn');
    
    // State
    this.items = [];
    this.currentPlaylist = null;
    this.sunoSongs = []; // Store fetched Suno songs
    this.playlistOriginalName = ''; // Store original name from API

    // Initialize
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Dashboard
    if (this.createPlaylistBtn) {
      this.createPlaylistBtn.addEventListener('click', () => this.showCreatePlaylistForm());
    }
    
    // Create Playlist
    if (this.fetchPlaylistBtn) {
      this.fetchPlaylistBtn.addEventListener('click', () => this.fetchSunoPlaylist());
    }
    
    if (this.savePlaylistBtn) {
      this.savePlaylistBtn.addEventListener('click', () => this.savePlaylist());
    }
    
    if (this.cancelCreateBtn) {
      this.cancelCreateBtn.addEventListener('click', () => this.cancelCreatePlaylist());
    }
    
    if (this.editNameBtn) {
      this.editNameBtn.addEventListener('click', () => this.toggleNameEdit());
    }
    
    // Playlist Detail
    if (this.backToDashboardBtn) {
      this.backToDashboardBtn.addEventListener('click', () => app.navigateTo('dashboard-section'));
    }
    
    if (this.copyLinkBtn) {
      this.copyLinkBtn.addEventListener('click', () => this.copyShareLink());
    }
    
    // Tab navigation
    this.tabButtons.forEach(button => {
      button.addEventListener('click', () => this.switchTab(button));
    });
    
    // Login buttons in prompts
    const playlistLoginBtn = document.getElementById('playlist-login-btn');
    if (playlistLoginBtn) {
      playlistLoginBtn.addEventListener('click', () => authService.signInWithGoogle());
    }
    
    const votingLoginBtn = document.getElementById('voting-login-btn');
    if (votingLoginBtn) {
      votingLoginBtn.addEventListener('click', () => authService.signInWithGoogle());
    }
    
    // Start vote button
    const startVoteBtn = document.getElementById('start-vote-btn');
    if (startVoteBtn) {
      startVoteBtn.addEventListener('click', () => {
        if (this.currentPlaylist) {
          votingManager.startVoting(this.currentPlaylist.id);
        }
      });
    }
    
    // Delete playlist button
    const deletePlaylistBtn = document.getElementById('delete-playlist-btn');
    if (deletePlaylistBtn) {
      deletePlaylistBtn.addEventListener('click', () => {
        if (this.currentPlaylist) {
          this.confirmDeletePlaylist(this.currentPlaylist);
        }
      });
    }
    
    // Edit playlist button
    const editPlaylistBtn = document.getElementById('edit-playlist-btn');
    if (editPlaylistBtn) {
      editPlaylistBtn.addEventListener('click', () => {
        if (this.currentPlaylist) {
          this.editPlaylist(this.currentPlaylist);
        } else {
          console.error('No playlist currently loaded');
          app.showMessage('Error loading playlist for editing');
        }
      });
    }
    
    // Vote Now button - using the correct ID
    if (this.startVoteBtn) {
      this.startVoteBtn.addEventListener('click', () => {
        if (this.currentPlaylist) {
          votingManager.startVoting(this.currentPlaylist.id);
        }
      });
    }
  }

  // Dashboard functionality
  async loadUserPlaylists() {
    // Debug: Log auth state
    console.log('Auth state when loading playlists:', authService.isLoggedIn(), authService.getCurrentUser());
    
    if (!authService.isLoggedIn()) {
      console.log('User is not logged in according to authService.isLoggedIn()');
      // Try getting the current user directly from Firebase instead
      const firebaseUser = firebase.auth().currentUser;
      console.log('Firebase current user:', firebaseUser);
      
      if (firebaseUser) {
        console.log('Firebase reports user is logged in, but authService does not');
        // Force update the auth service with the current user
        authService.currentUser = firebaseUser;
      } else {
        console.log('User is not logged in according to both authService and Firebase');
        return;
      }
    }

    try {
      app.showLoading('Loading your playlists...');

      const userId = authService.getCurrentUser().uid;
      console.log('Loading playlists for user ID:', userId);
      
      // Query directly from Firestore for debugging
      console.log('Attempting direct Firestore query...');
      const db = firebase.firestore();
      const querySnapshot = await db.collection('playlists')
        .where('createdBy', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();
      
      console.log('Firestore query results:', querySnapshot.size, 'playlists found');
      
      // Use the regular method
      const playlists = await FirebaseService.getUserPlaylists(userId);
      console.log('Playlists loaded via service:', playlists);

      if (playlists.length === 0) {
        console.log('No playlists found, checking if there might be an issue with the query');
        // Display a message if no playlists are found
        this.noPlaylistsMessage.classList.remove('hidden');
      } else {
        console.log('Rendering', playlists.length, 'playlists');
        this.renderPlaylists(playlists);
      }
    } catch (error) {
      console.error('Error loading playlists:', error);
      app.showMessage('Error loading playlists. Please try again.');
    } finally {
      app.hideLoading();
    }
  }

  renderPlaylists(playlists) {
    console.log('Rendering playlists:', playlists);
    this.playlistsContainer.innerHTML = '';

    if (!playlists || playlists.length === 0) {
      console.log('No playlists to render, showing message');
      this.noPlaylistsMessage.classList.remove('hidden');
      return;
    }

    console.log('Hiding no playlists message');
    this.noPlaylistsMessage.classList.add('hidden');

    playlists.forEach(playlist => {
      console.log('Creating element for playlist:', playlist.id, playlist.name);
      const playlistElement = document.createElement('div');
      playlistElement.className = 'playlist-item';
      playlistElement.innerHTML = `
        <div class="playlist-info">
          <h3>${playlist.name}</h3>
          <p>${playlist.items ? playlist.items.length : 0} songs • ${playlist.voteCount || 0} votes</p>
        </div>
        <div class="playlist-actions">
          <button class="view-btn">View</button>
          <button class="share-btn">Share</button>
          <button class="delete-btn" title="Delete playlist">Delete</button>
        </div>
      `;

      // Add event listeners
      playlistElement.querySelector('.view-btn').addEventListener('click', () => {
        this.viewPlaylist(playlist.id);
      });

      playlistElement.querySelector('.share-btn').addEventListener('click', () => {
        this.showShareOptions(playlist.id);
      });
      
      playlistElement.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent other handlers
        this.confirmDeletePlaylist(playlist);
      });

      this.playlistsContainer.appendChild(playlistElement);
    });
  }

  // Create Playlist functionality
  showCreatePlaylistForm() {
    // Reset form
    this.playlistUrlInput.value = '';
    this.playlistNameInput.value = '';
    this.playlistNameDisplay.textContent = '';
    this.playlistNameContainer.classList.add('hidden');
    this.editNameContainer.classList.add('hidden');
    this.itemsContainer.innerHTML = '';
    this.items = [];
    this.sunoSongs = [];
    this.playlistOriginalName = '';

    // Navigate to create playlist section using the hash-based navigation
    app.navigateTo('create-playlist-section');
  }

  // Toggle between display and edit mode for playlist name
  toggleNameEdit() {
    if (this.editNameContainer.classList.contains('hidden')) {
      // Switch to edit mode
      this.editNameContainer.classList.remove('hidden');
      this.playlistNameInput.value = this.playlistOriginalName;
      this.playlistNameInput.focus();
    } else {
      // Switch back to display mode
      this.editNameContainer.classList.add('hidden');
      // Update the display name if user entered something
      const customName = this.playlistNameInput.value.trim();
      if (customName) {
        this.playlistNameDisplay.textContent = customName;
      } else {
        // If they cleared it, revert to original
        this.playlistNameDisplay.textContent = this.playlistOriginalName;
        this.playlistNameInput.value = this.playlistOriginalName;
      }
    }
  }

  // Extract playlist ID from URL or use directly if it's an ID
  extractPlaylistId(input) {
    input = input.trim();
    // Check if the input is a URL
    if (input.includes('/')) {
      // Extract the ID from the URL
      const parts = input.split('/');
      return parts[parts.length - 1]; // Last part should be the ID
    }
    // Otherwise assume it's already an ID
    return input;
  }

  // Fetch songs from a Suno playlist
  async fetchSunoPlaylist() {
    const playlistUrl = this.playlistUrlInput.value.trim();
    if (!playlistUrl) {
      app.showMessage('Please enter a Suno playlist URL or ID.');
      return;
    }

    try {
      app.showLoading('Fetching songs from Suno playlist...');

      // Extract playlist ID from URL or use directly
      const playlistId = this.extractPlaylistId(playlistUrl);
      
      // Construct the Suno API URL
      const apiUrl = `https://studio-api.prod.suno.com/api/playlist/${playlistId}`;
      
      // Fetch the playlist data
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch playlist: ${response.status} ${response.statusText}`);
      }
      
      const playlistData = await response.json();
      
      if (!playlistData || !playlistData.playlist_clips || playlistData.playlist_clips.length === 0) {
        throw new Error('No songs found in this playlist.');
      }
      
      // Store the fetched songs
      this.sunoSongs = playlistData.playlist_clips.map(item => item.clip);
      
      // Set the playlist name from API
      this.playlistOriginalName = playlistData.name || 'Suno Playlist';
      this.playlistNameDisplay.textContent = this.playlistOriginalName;
      this.playlistNameInput.value = this.playlistOriginalName;
      
      // Show the name container
      this.playlistNameContainer.classList.remove('hidden');
      
      // Store songs as items for saving
      this.items = this.sunoSongs.map(song => {
        return {
          id: song.id,
          title: song.title,
          author: song.display_name,
          authorHandle: song.handle,
          authorAvatar: song.avatar_image_url,
          coverImage: song.image_url,
          audioUrl: song.audio_url,
          sunoUrl: `https://suno.com/song/${song.id}`
        };
      });
      
      // Display the fetched songs
      this.renderSunoSongs();
      
      app.showMessage(`Successfully fetched ${this.sunoSongs.length} songs from the playlist.`);
    } catch (error) {
      console.error('Error fetching Suno playlist:', error);
      app.showMessage(`Error: ${error.message}`);
    } finally {
      app.hideLoading();
    }
  }

  // Render the fetched Suno songs
  renderSunoSongs() {
    this.itemsContainer.innerHTML = '';

    this.sunoSongs.forEach((song, index) => {
      const songElement = document.createElement('div');
      songElement.className = 'suno-song-item';
      songElement.innerHTML = `
        <div class="song-thumbnail">
          <img src="${song.image_url}" alt="${song.title} cover">
        </div>
        <div class="song-info">
          <a href="https://suno.com/song/${song.id}" target="_blank" class="song-title">${song.title}</a>
          <div class="song-author">
            <img src="${song.avatar_image_url}" alt="${song.display_name}" class="author-avatar">
            <span>${song.display_name}</span>
          </div>
        </div>
      `;

      this.itemsContainer.appendChild(songElement);
    });
  }

  async savePlaylist() {
    // Use the custom name if provided, otherwise use the original name
    let name;
    if (this.editNameContainer.classList.contains('hidden')) {
      // Using display name (which could be original or edited)
      name = this.playlistNameDisplay.textContent;
    } else {
      // Using name from input field
      name = this.playlistNameInput.value.trim();
    }
    
    if (!name) {
      name = this.playlistOriginalName;
    }

    if (this.items.length < 2) {
      app.showMessage('Please fetch a Suno playlist with at least 2 songs.');
      return;
    }

    if (!authService.isLoggedIn()) {
      app.showMessage('You need to be logged in to create a playlist.');
      return;
    }

    try {
      // Check if we're in edit mode
      const isEditMode = this.savePlaylistBtn.dataset.mode === 'edit';
      const existingPlaylistId = this.savePlaylistBtn.dataset.playlistId;
      
      app.showLoading(isEditMode ? 'Updating your playlist...' : 'Creating your playlist...');

      const userId = authService.getCurrentUser().uid;
      const votingDeadline = this.votingDeadlineInput.value
        ? new Date(this.votingDeadlineInput.value).toISOString()
        : null;

      // Get the ranking type
      const rankingTypeInputs = document.getElementsByName('ranking-type');
      let rankingType = 'ranked-choice'; // Default value
      
      for (const input of rankingTypeInputs) {
        if (input.checked) {
          rankingType = input.value;
          break;
        }
      }

      const playlistData = {
        name,
        items: this.items,
        createdBy: userId,
        originalSunoPlaylistId: this.extractPlaylistId(this.playlistUrlInput.value),
        votingDeadline,
        rankingType: rankingType
      };

      let success = false;
      let playlistId;

      if (isEditMode && existingPlaylistId) {
        // Update existing playlist
        console.log('Updating existing playlist:', existingPlaylistId);
        success = await FirebaseService.updatePlaylist(existingPlaylistId, playlistData, userId);
        playlistId = existingPlaylistId;
      } else {
        // Create new playlist
        console.log('Creating new playlist');
        playlistData.voteCount = 0; // Only set for new playlists
        playlistId = await FirebaseService.createPlaylist(playlistData);
        success = !!playlistId;
      }

      if (success) {
        app.showMessage(isEditMode ? 'Playlist updated successfully!' : 'Playlist created successfully!');
        app.navigateTo('dashboard-section');
        this.loadUserPlaylists();
      } else {
        app.showMessage(isEditMode ? 'Error updating playlist. Please try again.' : 'Error creating playlist. Please try again.');
      }
    } catch (error) {
      console.error(isEditMode ? 'Error updating playlist:' : 'Error creating playlist:', error);
      app.showMessage(`Error: ${error.message}`);
    } finally {
      app.hideLoading();
    }
  }

  cancelCreatePlaylist() {
    app.navigateTo('dashboard-section');
  }

  // Playlist Detail functionality
  async viewPlaylist(playlistId, allowPublicAccess = false) {
    try {
      app.showLoading('Loading playlist...');

      const playlist = await FirebaseService.getPlaylist(playlistId);
      if (!playlist) {
        app.showMessage('Playlist not found.');
        return;
      }

      this.currentPlaylist = playlist;

      // Set playlist details
      this.playlistDetailName.textContent = playlist.name;
      
      // Generate share link
      const shareUrl = `${window.location.origin}${window.location.pathname}#playlist?id=${playlistId}`;
      this.shareLink.value = shareUrl;

      // Show owner-only controls if the current user is the owner
      this.updatePlaylistUIForOwnership();

      // Load votes and display current ranking
      await this.loadAndDisplayRanking();

      // Navigate to playlist detail section with the playlist ID as a parameter
      app.navigateTo('playlist-detail-section', { id: playlistId });
      
      // Switch to ranking tab by default
      this.switchTab(document.querySelector('.tab-btn[data-tab="ranking"]'));
      
      // Initialize voting if needed 
      // No need to immediately set up voting - will be handled when users click vote button
      // votingManager.setupVotingItems(playlist);
      if (playlist.votingDeadline) {
        const deadlineDate = new Date(playlist.votingDeadline);
        this.playlistDetailInfo.textContent += ` • Voting ends: ${deadlineDate.toLocaleString()}`;
      }
    } catch (error) {
      console.error('Error loading playlist:', error);
      app.showMessage(`Error: ${error.message}`);
    } finally {
      app.hideLoading();
    }
  }

  // Check if current user is the playlist owner and update UI accordingly
  updatePlaylistUIForOwnership() {
    // Get owner controls
    const ownerControls = document.getElementById('playlist-owner-controls');
    const voteControls = document.getElementById('playlist-vote-controls');
    const loginPrompt = document.getElementById('playlist-login-prompt');
    
    if (!ownerControls || !voteControls || !loginPrompt) return;
    
    // Check if user is logged in
    if (!authService.isLoggedIn()) {
      // Public view - hide owner controls, show login prompt
      ownerControls.classList.add('hidden');
      voteControls.classList.add('hidden');
      loginPrompt.classList.remove('hidden');
      return;
    }
    
    // User is logged in, hide login prompt
    loginPrompt.classList.add('hidden');
    
    // Show vote controls for logged-in users
    voteControls.classList.remove('hidden');
    
    // Check if current user is the playlist owner
    const currentUser = authService.getCurrentUser();
    const isOwner = currentUser && this.currentPlaylist && 
                   this.currentPlaylist.createdBy === currentUser.uid;
    
    // Show/hide owner controls based on ownership
    if (isOwner) {
      ownerControls.classList.remove('hidden');
    } else {
      ownerControls.classList.add('hidden');
    }
  }

  async loadAndDisplayRanking() {
    if (!this.currentPlaylist) return;

    try {
      const votes = await FirebaseService.getPlaylistVotes(this.currentPlaylist.id);
      this.currentPlaylist.voteCount = votes.length;
      
      // Update info text
      this.playlistDetailInfo.textContent = `${this.currentPlaylist.items.length} songs • ${this.currentPlaylist.voteCount} votes`;
      
      // Calculate and display rankings
      this.displayRankings(votes);
    } catch (error) {
      console.error('Error loading votes:', error);
    }
  }

  displayRankings(votes) {
    if (!this.currentPlaylist) return;

    const rankings = FirebaseService.calculateRankings(this.currentPlaylist.items, votes);
    const rankingType = this.currentPlaylist.rankingType || 'ranked-choice';
    
    this.currentRanking.innerHTML = '';

    if (votes.length === 0) {
        this.currentRanking.innerHTML = '<p>No votes yet. Be the first to vote!</p>';
        return;
    }

    // Check if there are any star rating votes
    const hasStarRatings = votes.some(vote => vote.voteType === 'star-rating');

    rankings.forEach((ranking, index) => {
        const item = ranking.itemObject;
        const rankingElement = document.createElement('div');
        rankingElement.className = 'ranking-item';
        
        if (item && typeof item === 'object') {
            let statsHtml = '';
            
            if (hasStarRatings || rankingType === 'star-rating') {
                // Star rating display
                const avgRating = ranking.starRatingAvg || 0;
                const voteCount = ranking.starRatingCount || 0;
                
                statsHtml = `
                    <p>
                        <span class="star-results">
                            ${this.generateStarDisplay(avgRating)}
                            <span class="star-average">${avgRating.toFixed(1)}</span>
                        </span>
                        • ${voteCount} ${voteCount === 1 ? 'rating' : 'ratings'}
                    </p>
                `;
            } else {
                // Ranked choice display (existing)
                statsHtml = `
                    <p><span class="score">${ranking.points} points</span> • 
                       ${ranking.firstPlace} first place, 
                       ${ranking.secondPlace} second place, 
                       ${ranking.thirdPlace} third place votes</p>
                `;
            }
            
            // Enhanced display for Suno songs
            rankingElement.innerHTML = `
                <div class="ranking-position">${index + 1}</div>
                <div class="song-thumbnail">
                    <img src="${item.coverImage || 'assets/default-cover.png'}" alt="${item.title} cover">
                </div>
                <div class="ranking-info">
                    <h3><a href="${item.sunoUrl}" target="_blank">${item.title}</a></h3>
                    <div class="song-author">
                        <img src="${item.authorAvatar || 'assets/default-avatar.png'}" alt="${item.author}" class="author-avatar">
                        <span>${item.author}</span>
                    </div>
                    ${statsHtml}
                </div>
            `;
        } else {
            // Fallback for simple text items
            // ...existing fallback code...
        }
        
        this.currentRanking.appendChild(rankingElement);
    });
}

// Helper method to generate star display for results
generateStarDisplay(rating) {
    let html = '';
    // Full stars
    for (let i = 1; i <= Math.floor(rating); i++) {
        html += '<span class="star selected">★</span>';
    }
    // Half star
    if (rating % 1 >= 0.5) {
        html += '<span class="star half-selected">★</span>';
    }
    // Empty stars
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
        html += '<span class="star">★</span>';
    }
    return html;
}

  switchTab(button) {
    if (!button) return;
    
    // Remove active class from all tab buttons
    this.tabButtons.forEach(btn => {
      btn.classList.remove('active');
    });
    
    // Add active class to clicked button
    button.classList.add('active');
    
    // Hide all tab content
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
      content.classList.add('hidden');
    });
    
    // Show selected tab content
    const tabName = button.getAttribute('data-tab');
    const tabContent = document.getElementById(`${tabName}-tab`);
    
    if (tabContent) {
      tabContent.classList.remove('hidden');
      
      // Perform tab-specific actions
      if (tabName === 'voting') {
        // If user is not logged in, show login prompt instead of voting interface
        const votingInterface = document.getElementById('voting-interface');
        const loginPrompt = document.getElementById('voting-login-prompt');
        
        if (votingInterface && loginPrompt) {
          if (authService.isLoggedIn()) {
            votingInterface.classList.remove('hidden');
            loginPrompt.classList.add('hidden');
            votingManager.setupVotingItems(this.currentPlaylist);
          } else {
            votingInterface.classList.add('hidden');
            loginPrompt.classList.remove('hidden');
          }
        }
      } else if (tabName === 'share' && this.currentPlaylist) {
        // Ensure share link is up to date
        const shareUrl = `${window.location.origin}${window.location.pathname}#playlist?id=${this.currentPlaylist.id}`;
        this.shareLink.value = shareUrl;
      }
    } else {
      console.error(`Tab content not found for tab: ${tabName}`);
    }
  }

  showShareOptions(playlistId) {
    // Navigate to playlist detail and switch to share tab
    this.viewPlaylist(playlistId).then(() => {
      // Give a small delay to ensure the DOM is ready
      setTimeout(() => {
        const shareTabBtn = document.querySelector('.tab-btn[data-tab="share"]');
        if (shareTabBtn) {
          this.switchTab(shareTabBtn);
        } else {
          console.error('Share tab button not found');
        }
      }, 100);
    }).catch(error => {
      console.error('Error showing share options:', error);
      app.showMessage('Could not load sharing options. Please try again.');
    });
  }

  copyShareLink() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      // Modern clipboard API
      navigator.clipboard.writeText(this.shareLink.value)
        .then(() => {
          app.showMessage('Share link copied to clipboard!');
        })
        .catch(err => {
          console.error('Could not copy text: ', err);
          // Fall back to the older method
          this.fallbackCopyText();
        });
    } else {
      // Fallback for older browsers
      this.fallbackCopyText();
    }
  }
  
  fallbackCopyText() {
    this.shareLink.select();
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        app.showMessage('Share link copied to clipboard!');
      } else {
        app.showMessage('Unable to copy, please copy the link manually.');
      }
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
      app.showMessage('Unable to copy, please copy the link manually.');
    }
  }

  // URL parameter handling for shared playlists
  checkForSharedPlaylist() {
    // This method is now handled by App.handleURLParameters()
    // We just need to check if there's a pendingPlaylistId in localStorage
    this.loadPendingPlaylist();
  }

  // Check and load pending playlist after login/verification
  loadPendingPlaylist() {
    const pendingPlaylistId = localStorage.getItem('pendingPlaylistId');
    
    if (pendingPlaylistId && authService.isLoggedIn() && authService.isVerified()) {
      // Clear the pending playlist ID
      localStorage.removeItem('pendingPlaylistId');
      
      // View the playlist
      this.viewPlaylist(pendingPlaylistId);
    }
  }

  // Edit playlist functionality
  editPlaylist(playlist) {
    if (!authService.isLoggedIn() || !authService.isVerified()) {
      app.showMessage('You need to be logged in to edit this playlist.');
      return;
    }
    
    // Check if current user is the owner
    const currentUser = authService.getCurrentUser();
    if (!currentUser || playlist.createdBy !== currentUser.uid) {
      app.showMessage('You are not authorized to edit this playlist.');
      return;
    }
    
    // Navigate to create playlist section with edit mode
    // We'll reuse the create playlist interface for editing
    app.navigateTo('create-playlist-section');
    
    // Set form values for editing
    this.playlistNameInput.value = playlist.name;
    this.playlistNameDisplay.textContent = playlist.name;
    this.playlistNameContainer.classList.remove('hidden');
    this.editNameContainer.classList.remove('hidden');
    
    // Set URL if available
    if (playlist.originalSunoPlaylistId) {
      this.playlistUrlInput.value = playlist.originalSunoPlaylistId;
    }
    
    // Store items from the playlist
    this.items = [...playlist.items];
    
    // Render items
    this.renderSunoSongs();
    
    // Update save button to indicate editing
    this.savePlaylistBtn.textContent = 'Update Playlist';
    this.savePlaylistBtn.dataset.mode = 'edit';
    this.savePlaylistBtn.dataset.playlistId = playlist.id;

    // Set the ranking type radio button
    const rankingType = playlist.rankingType || 'ranked-choice';
    const rankingTypeInputs = document.getElementsByName('ranking-type');
    
    for (const input of rankingTypeInputs) {
        input.checked = (input.value === rankingType);
    }
  }

  // Delete playlist functionality
  confirmDeletePlaylist(playlist) {
    if (!authService.isLoggedIn() || !authService.isVerified()) {
      app.showMessage('You need to be logged in to delete this playlist.');
      return;
    }
    
    // Check if current user is the owner
    const currentUser = authService.getCurrentUser();
    if (!currentUser || playlist.createdBy !== currentUser.uid) {
      app.showMessage('You are not authorized to delete this playlist.');
      return;
    }
    
    // Create confirmation modal content
    const confirmContent = document.createElement('div');
    confirmContent.innerHTML = `
      <h3>Delete Playlist</h3>
      <p>Are you sure you want to delete "${playlist.name}"?</p>
      <p>This action cannot be undone.</p>
      <div class="modal-buttons">
        <button id="confirm-delete-btn" class="danger-btn">Delete</button>
        <button id="cancel-delete-btn" class="secondary-btn">Cancel</button>
      </div>
    `;
    
    // Show confirmation modal
    app.showModal(confirmContent);
    
    // Add event listeners to modal buttons
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    
    if (confirmDeleteBtn) {
      confirmDeleteBtn.addEventListener('click', () => {
        this.deletePlaylist(playlist.id);
        app.closeModal();
      });
    }
    
    if (cancelDeleteBtn) {
      cancelDeleteBtn.addEventListener('click', () => {
        app.closeModal();
      });
    }
  }
  
  async deletePlaylist(playlistId) {
    try {
      app.showLoading('Deleting playlist...');
      
      const success = await FirebaseService.deletePlaylist(playlistId);
      
      if (success) {
        app.showMessage('Playlist deleted successfully.');
        app.navigateTo('dashboard-section');
        this.loadUserPlaylists();
      } else {
        app.showMessage('Error deleting playlist. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting playlist:', error);
      app.showMessage(`Error: ${error.message}`);
    } finally {
      app.hideLoading();
    }
  }
}
