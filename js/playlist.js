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
    this.createPlaylistBtn.addEventListener('click', () => this.showCreatePlaylistForm());
    
    // Create Playlist
    this.fetchPlaylistBtn.addEventListener('click', () => this.fetchSunoPlaylist());
    this.playlistUrlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.fetchSunoPlaylist();
      }
    });
    
    // Name editing
    this.editNameBtn.addEventListener('click', () => this.toggleNameEdit());
    
    this.savePlaylistBtn.addEventListener('click', () => this.savePlaylist());
    this.cancelCreateBtn.addEventListener('click', () => this.cancelCreatePlaylist());
    
    // Playlist Detail
    this.backToDashboardBtn.addEventListener('click', () => {
      app.navigateTo('dashboard-section');
      this.loadUserPlaylists();
    });
    this.copyLinkBtn.addEventListener('click', () => this.copyShareLink());
    
    // Tab switching
    this.tabButtons.forEach(button => {
      button.addEventListener('click', () => this.switchTab(button));
    });
  }

  // Dashboard functionality
  async loadUserPlaylists() {
    if (!authService.isLoggedIn()) {
      return;
    }

    try {
      app.showLoading('Loading your playlists...');

      const userId = authService.getCurrentUser().uid;
      const playlists = await FirebaseService.getUserPlaylists(userId);

      this.renderPlaylists(playlists);
    } catch (error) {
      console.error('Error loading playlists:', error);
      app.showMessage('Error loading playlists. Please try again.');
    } finally {
      app.hideLoading();
    }
  }

  renderPlaylists(playlists) {
    this.playlistsContainer.innerHTML = '';

    if (playlists.length === 0) {
      this.noPlaylistsMessage.classList.remove('hidden');
      return;
    }

    this.noPlaylistsMessage.classList.add('hidden');

    playlists.forEach(playlist => {
      const playlistElement = document.createElement('div');
      playlistElement.className = 'playlist-item';
      playlistElement.innerHTML = `
        <div class="playlist-info">
          <h3>${playlist.name}</h3>
          <p>${playlist.items.length} songs • ${playlist.voteCount || 0} votes</p>
        </div>
        <div class="playlist-actions">
          <button class="view-btn">View</button>
          <button class="share-btn">Share</button>
        </div>
      `;

      // Add event listeners
      playlistElement.querySelector('.view-btn').addEventListener('click', () => {
        this.viewPlaylist(playlist.id);
      });

      playlistElement.querySelector('.share-btn').addEventListener('click', () => {
        this.showShareOptions(playlist.id);
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

    // Navigate to create playlist section
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
      app.showLoading('Creating your playlist...');

      const userId = authService.getCurrentUser().uid;
      const playlistData = {
        name,
        items: this.items,
        createdBy: userId,
        voteCount: 0,
        originalSunoPlaylistId: this.extractPlaylistId(this.playlistUrlInput.value)
      };

      const playlistId = await FirebaseService.createPlaylist(playlistData);

      if (playlistId) {
        app.showMessage('Playlist created successfully!');
        app.navigateTo('dashboard-section');
        this.loadUserPlaylists();
      } else {
        app.showMessage('Error creating playlist. Please try again.');
      }
    } catch (error) {
      console.error('Error creating playlist:', error);
      app.showMessage(`Error: ${error.message}`);
    } finally {
      app.hideLoading();
    }
  }

  cancelCreatePlaylist() {
    app.navigateTo('dashboard-section');
  }

  // Playlist Detail functionality
  async viewPlaylist(playlistId) {
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
      const shareUrl = `${window.location.origin}${window.location.pathname}?playlist=${playlistId}`;
      this.shareLink.value = shareUrl;

      // Load votes and display current ranking
      await this.loadAndDisplayRanking();

      // Navigate to playlist detail section
      app.navigateTo('playlist-detail-section');
      
      // Switch to ranking tab by default
      this.switchTab(document.querySelector('.tab-btn[data-tab="ranking"]'));
      
      // Setup voting items if we go to vote tab
      votingManager.setupVotingItems(playlist);
    } catch (error) {
      console.error('Error loading playlist:', error);
      app.showMessage(`Error: ${error.message}`);
    } finally {
      app.hideLoading();
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
    
    this.currentRanking.innerHTML = '';

    if (votes.length === 0) {
      this.currentRanking.innerHTML = '<p>No votes yet. Be the first to vote!</p>';
      return;
    }

    rankings.forEach((ranking, index) => {
      const item = ranking.itemObject;
      const rankingElement = document.createElement('div');
      rankingElement.className = 'ranking-item';
      
      if (item && typeof item === 'object') {
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
            <p><span class="score">${ranking.points} points</span> • 
               ${ranking.firstPlace} first place, 
               ${ranking.secondPlace} second place, 
               ${ranking.thirdPlace} third place votes</p>
          </div>
        `;
      } else {
        // Fallback for simple text items
        rankingElement.innerHTML = `
          <div class="ranking-position">${index + 1}</div>
          <div class="ranking-info">
            <h3>${ranking.item}</h3>
            <p><span class="score">${ranking.points} points</span> • 
               ${ranking.firstPlace} first place, 
               ${ranking.secondPlace} second place, 
               ${ranking.thirdPlace} third place votes</p>
          </div>
        `;
      }
      
      this.currentRanking.appendChild(rankingElement);
    });
  }

  switchTab(button) {
    // Remove active class from all tabs
    this.tabButtons.forEach(btn => {
      btn.classList.remove('active');
    });
    
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    
    // Add active class to selected tab
    button.classList.add('active');
    
    // Show selected tab content
    const tabName = button.getAttribute('data-tab');
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Special handling for tabs
    if (tabName === 'vote' && this.currentPlaylist) {
      votingManager.setupVotingItems(this.currentPlaylist);
    }
  }

  showShareOptions(playlistId) {
    // Navigate to playlist detail and switch to share tab
    this.viewPlaylist(playlistId).then(() => {
      this.switchTab(document.querySelector('.tab-btn[data-tab="share"]'));
    });
  }

  copyShareLink() {
    this.shareLink.select();
    document.execCommand('copy');
    app.showMessage('Share link copied to clipboard!');
  }

  // URL parameter handling for shared playlists
  checkForSharedPlaylist() {
    const urlParams = new URLSearchParams(window.location.search);
    const playlistId = urlParams.get('playlist');
    
    if (playlistId) {
      // If user is logged in and verified, view the playlist
      if (authService.isLoggedIn() && authService.isVerified()) {
        this.viewPlaylist(playlistId);
      } else {
        // Store the playlist ID to view after login/verification
        localStorage.setItem('pendingPlaylistId', playlistId);
      }
    }
  }

  // Check and load pending playlist after login/verification
  async loadPendingPlaylist() {
    const pendingPlaylistId = localStorage.getItem('pendingPlaylistId');
    
    if (pendingPlaylistId) {
      localStorage.removeItem('pendingPlaylistId');
      await this.viewPlaylist(pendingPlaylistId);
      return true;
    }
    
    return false;
  }
}
