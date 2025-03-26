// Voting functionality
class VotingManager {
  constructor() {
    // Voting elements
    this.votingSection = document.getElementById('voting-section');
    this.votingTitle = document.getElementById('voting-title');
    this.backToPlaylistBtn = document.getElementById('back-to-playlist-btn');
    this.firstChoice = document.getElementById('first-choice');
    this.secondChoice = document.getElementById('second-choice');
    this.thirdChoice = document.getElementById('third-choice');
    this.voteButton = document.getElementById('submit-vote-btn');
    this.voteLoginPrompt = document.getElementById('voting-login-prompt');
    
    // Choose Three UI elements
    this.songsContainer = document.getElementById('voting-songs-container');
    
    // State
    this.currentPlaylist = null;
    this.items = [];
    this.selections = {
      first: null,
      second: null,
      third: null
    };
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    if (this.backToPlaylistBtn) {
      this.backToPlaylistBtn.addEventListener('click', () => {
        // Only navigate back if a playlist is loaded
        if (this.currentPlaylist) {
          playlistManager.viewPlaylist(this.currentPlaylist.id);
        } else {
          app.navigateTo('dashboard-section');
        }
      });
    }
    
    if (this.voteButton) {
      this.voteButton.addEventListener('click', () => this.submitVote());
    }
  }
  
  // Start the voting process for a playlist
  async startVoting(playlistId, isPublic = false) {
    try {
      app.showLoading('Loading playlist...');
      
      // Get the playlist
      const playlist = await FirebaseService.getPlaylist(playlistId);
      if (!playlist) {
        app.showMessage('Playlist not found');
        return;
      }
      
      this.currentPlaylist = playlist;
      this.items = [...playlist.items];
      
      // Reset selections
      this.selections = {
        first: null,
        second: null,
        third: null
      };
      
      // Set title
      this.votingTitle.textContent = `Vote on: ${playlist.name}`;
      
      // Check if user is authenticated
      if (!authService.isLoggedIn() && !isPublic) {
        this.showLoginPrompt();
      } else {
        this.hideLoginPrompt();
      }
      
      // Navigate to voting section
      app.navigateTo('voting-section', { id: playlistId });
      
      // Render all songs for the simple "choose three" UI
      this.renderSongsForSelection();
    } catch (error) {
      console.error('Error starting voting:', error);
      app.showMessage(`Error: ${error.message}`);
    } finally {
      app.hideLoading();
    }
  }
  
  // Show login prompt for unauthenticated users
  showLoginPrompt() {
    if (this.voteLoginPrompt) {
      this.voteLoginPrompt.classList.remove('hidden');
      
      // Hide the voting container
      if (this.songsContainer) {
        this.songsContainer.classList.add('hidden');
      }
      
      // Disable voting button
      if (this.voteButton) {
        this.voteButton.disabled = true;
      }
    }
  }
  
  // Hide login prompt for authenticated users
  hideLoginPrompt() {
    if (this.voteLoginPrompt) {
      this.voteLoginPrompt.classList.add('hidden');
      
      // Show the voting container
      if (this.songsContainer) {
        this.songsContainer.classList.remove('hidden');
      }
      
      // Enable voting button
      if (this.voteButton) {
        this.voteButton.disabled = false;
      }
    }
  }
  
  // Render all songs for simple selection
  renderSongsForSelection() {
    // Clear previous content
    if (!this.songsContainer) return;
    
    this.songsContainer.innerHTML = '';
    
    // Create instructions
    const instructions = document.createElement('div');
    instructions.className = 'selection-instructions';
    instructions.innerHTML = `
      <h3>Select Your Top Three Songs</h3>
      <p>Click on songs to select them in order (1st, 2nd, and 3rd place).</p>
      <p>Click again to deselect. You can change your selections at any time.</p>
    `;
    this.songsContainer.appendChild(instructions);
    
    // Shuffle items for randomized order
    const shuffledItems = this.shuffleArray([...this.items]);
    
    // Create song grid
    const songGrid = document.createElement('div');
    songGrid.className = 'song-selection-grid';
    
    // Add each song to the grid
    shuffledItems.forEach(song => {
      const songCard = document.createElement('div');
      songCard.className = 'song-card selectable';
      songCard.dataset.songId = song.id;
      
      // Create UI for the song
      songCard.innerHTML = `
        <div class="song-selection-indicator"></div>
        <div class="song-thumbnail">
          <img src="${song.coverImage || 'images/default-thumbnail.jpg'}" alt="${song.title}">
        </div>
        <div class="song-info">
          <div class="song-title">${song.title}</div>
          <div class="song-artist">${song.author || 'Unknown'}</div>
        </div>
      `;
      
      // Add click event to select/deselect
      songCard.addEventListener('click', () => this.toggleSongSelection(song, songCard));
      
      songGrid.appendChild(songCard);
    });
    
    this.songsContainer.appendChild(songGrid);
    
    // Add voting button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'voting-buttons';
    buttonContainer.innerHTML = `
      <button id="submit-vote-btn" class="primary-btn">Submit Vote</button>
    `;
    
    const voteBtn = buttonContainer.querySelector('#submit-vote-btn');
    voteBtn.disabled = true; // Disabled until all selections are made
    voteBtn.addEventListener('click', () => this.submitVote());
    
    this.songsContainer.appendChild(buttonContainer);
    
    // Show the voting UI
    this.showVotingUI();
    
    // Hide the matchup-based UI elements
    this.hideMatchupUI();
  }
  
  // Toggle song selection when clicked
  toggleSongSelection(song, songCard) {
    // Check if user is authenticated
    if (!authService.isLoggedIn()) {
      app.showMessage('Please log in to vote');
      this.showLoginPrompt();
      return;
    }
    
    // Check if this song is already selected
    const isFirst = this.selections.first && this.selections.first.id === song.id;
    const isSecond = this.selections.second && this.selections.second.id === song.id;
    const isThird = this.selections.third && this.selections.third.id === song.id;
    
    // Remove any existing selection classes
    songCard.classList.remove('selected-first', 'selected-second', 'selected-third');
    
    // Handle deselection
    if (isFirst) {
      this.selections.first = null;
    } else if (isSecond) {
      this.selections.second = null;
    } else if (isThird) {
      this.selections.third = null;
    } else {
      // Handle new selection
      if (!this.selections.first) {
        this.selections.first = song;
        songCard.classList.add('selected-first');
      } else if (!this.selections.second) {
        this.selections.second = song;
        songCard.classList.add('selected-second');
      } else if (!this.selections.third) {
        this.selections.third = song;
        songCard.classList.add('selected-third');
      } else {
        app.showMessage('You have already selected three songs. Deselect one first.');
        return;
      }
    }
    
    // Update all song cards to reflect current selections
    this.updateSelectionDisplay();
    
    // Enable/disable submit button based on selections
    const submitBtn = document.getElementById('submit-vote-btn');
    if (submitBtn) {
      submitBtn.disabled = !(this.selections.first && this.selections.second && this.selections.third);
    }
  }
  
  // Update the display of all songs to reflect current selections
  updateSelectionDisplay() {
    const songCards = document.querySelectorAll('.song-card.selectable');
    
    songCards.forEach(card => {
      // Clear previous selection classes
      card.classList.remove('selected-first', 'selected-second', 'selected-third');
      
      const songId = card.dataset.songId;
      
      // Apply appropriate selection classes
      if (this.selections.first && this.selections.first.id === songId) {
        card.classList.add('selected-first');
        card.querySelector('.song-selection-indicator').textContent = '1st';
      } else if (this.selections.second && this.selections.second.id === songId) {
        card.classList.add('selected-second');
        card.querySelector('.song-selection-indicator').textContent = '2nd';
      } else if (this.selections.third && this.selections.third.id === songId) {
        card.classList.add('selected-third');
        card.querySelector('.song-selection-indicator').textContent = '3rd';
      } else {
        card.querySelector('.song-selection-indicator').textContent = '';
      }
    });
  }
  
  // Show the voting UI
  showVotingUI() {
    // Hide the results container if it exists
    const resultsContainer = document.getElementById('results-container');
    if (resultsContainer) {
      resultsContainer.classList.add('hidden');
    }
    
    // Show the songs container
    if (this.songsContainer) {
      this.songsContainer.classList.remove('hidden');
    }
  }
  
  // Hide the matchup UI elements
  hideMatchupUI() {
    const matchupContainer = document.getElementById('matchup-container');
    if (matchupContainer) {
      matchupContainer.classList.add('hidden');
    }
  }
  
  // Submit the final vote
  async submitVote() {
    if (!authService.isLoggedIn()) {
      app.showMessage('You must be logged in to vote');
      this.showLoginPrompt();
      return;
    }
    
    if (!this.currentPlaylist) {
      app.showMessage('No playlist selected');
      return;
    }
    
    // Ensure we have all three selections
    if (!this.selections.first || !this.selections.second || !this.selections.third) {
      app.showMessage('Please select your top three songs before submitting');
      return;
    }
    
    try {
      app.showLoading('Submitting your vote...');
      
      const currentUser = authService.getCurrentUser();
      
      // Prepare vote data
      const voteData = {
        playlistId: this.currentPlaylist.id,
        userId: currentUser.uid,
        displayName: currentUser.displayName || 'Anonymous',
        photoURL: currentUser.photoURL || '',
        firstChoice: this.selections.first.id,
        secondChoice: this.selections.second.id,
        thirdChoice: this.selections.third.id,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      // Submit the vote
      const result = await FirebaseService.submitVote(voteData);
      
      if (result) {
        app.showMessage('Your vote has been submitted successfully!');
        
        // Return to the playlist page
        playlistManager.viewPlaylist(this.currentPlaylist.id);
      } else {
        app.showMessage('Failed to submit your vote. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting vote:', error);
      app.showMessage(`Error: ${error.message}`);
    } finally {
      app.hideLoading();
    }
  }
  
  // Utility method to shuffle an array
  shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }
}

// Initialize Voting Manager
const votingManager = new VotingManager();
