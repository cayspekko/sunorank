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

    // Add properties for star rating
    this.currentSongIndex = 0;
    this.starRatings = {};
    this.starRatingContainer = document.getElementById('star-rating-container');
    this.songCard = document.getElementById('song-card');
    this.songProgress = document.getElementById('song-progress');
    this.nextSongBtn = document.getElementById('next-song-btn');
    this.prevSongBtn = document.getElementById('prev-song-btn');
    this.submitStarRatingBtn = document.getElementById('submit-star-rating-btn');
    
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

    // Star rating navigation
    if (this.nextSongBtn) {
      this.nextSongBtn.addEventListener('click', () => this.nextSong());
    }
    
    if (this.prevSongBtn) {
      this.prevSongBtn.addEventListener('click', () => this.previousSong());
    }
    
    if (this.submitStarRatingBtn) {
      this.submitStarRatingBtn.addEventListener('click', () => this.submitVote());
    }
  }
  
  // Start the voting process for a playlist
  async startVoting(playlistId, isPublic = false) {
    try {
      app.showLoading();
      
      // Get the playlist details
      const playlist = await FirebaseService.getPlaylist(playlistId);
      
      if (!playlist) {
        app.showMessage('Playlist not found.');
        return;
      }
      
      this.currentPlaylist = playlist;
      this.items = [...playlist.items];
      
      // Use the rankingType directly from the playlist
      const rankingType = playlist.rankingType;
      console.log("Playlist ranking type:", rankingType);
      
      // Get ALL relevant DOM elements - refresh these references to ensure they're current
      const rankedChoiceContainer = document.getElementById('ranked-choice-container');
      const starRatingContainer = document.getElementById('star-rating-container');
      const resultsContainer = document.getElementById('results-container');
      const matchupContainer = document.getElementById('matchup-container');
      const votingSongsContainer = document.getElementById('voting-songs-container');
      
      // Helper function to forcefully hide an element
      const forceHide = (element) => {
        if (!element) return;
        element.classList.add('hidden');
        element.style.display = 'none'; // Force hide with inline style
      };
      
      // Helper function to show an element
      const forceShow = (element) => {
        if (!element) return;
        element.classList.remove('hidden');
        element.style.display = 'block'; // Force display as block
        console.log(`Showing element: ${element.id}, new display: ${element.style.display}`);
      };
      
      // Always hide all containers first
      forceHide(rankedChoiceContainer);
      forceHide(starRatingContainer);
      forceHide(resultsContainer);
      forceHide(matchupContainer);
      
      // Make sure voting section itself is visible
      const votingSection = document.getElementById('voting-section');
      if (votingSection) {
        votingSection.classList.remove('hidden');
      }
      
      // Then show only the appropriate container based on ranking type
      if (rankingType && rankingType.toLowerCase() === 'star-rating') {
        // Reset for star rating
        this.starRatings = {};
        this.currentSongIndex = 0;
        
        // Update the reference to the star rating container
        this.starRatingContainer = starRatingContainer;
        
        // Show ONLY star rating UI, hide ranked choice UI
        forceShow(starRatingContainer);
        forceHide(votingSongsContainer); // Also hide the songs container used by ranked choice
        console.log("Star rating UI should be visible, ranked choice hidden");
        
        if (starRatingContainer) {
          console.log("Star container display after:", starRatingContainer.style.display);
          console.log("Star container classes after:", starRatingContainer.className);
        }
        
        // Set up the first song
        this.displayCurrentSong();
      } else if (!rankingType || rankingType.toLowerCase() === 'ranked-choice') {
        // Reset selections for ranked choice
        this.selections = {
          first: null,
          second: null,
          third: null
        };
        
        // Show ONLY ranked choice UI, hide star rating
        forceShow(rankedChoiceContainer || this.songsContainer);
        forceShow(votingSongsContainer);
        forceHide(starRatingContainer);
        console.log("Ranked choice UI should be visible, star rating hidden");
      } else {
        console.error("Unknown ranking type:", rankingType);
      }
      
      // Set title
      if (this.votingTitle) this.votingTitle.textContent = `Vote on: ${playlist.name}`;
      
      // Check if user is authenticated
      if (!authService.isLoggedIn() && !isPublic) {
        this.showLoginPrompt();
        return;
      }
      
      // Navigate to the voting section
      app.navigateTo('voting-section', { id: playlistId });
      
      // Render all songs for the simple "choose three" UI
      if (!rankingType || rankingType.toLowerCase() === 'ranked-choice') {
        this.renderSongsForSelection();
      }
      
      // Check if voting is still open
      if (playlist.votingDeadline) {
        const now = new Date();
        const deadline = new Date(playlist.votingDeadline);
        if (now > deadline) {
          app.showMessage('Voting for this playlist has ended.');
          return;
        }

        // Start the countdown timer
        this.startCountdown(deadline);
      }

      // Set up submit button based on voting type
      if (rankingType && rankingType.toLowerCase() === 'star-rating') {
        if (this.voteButton) this.voteButton.classList.add('hidden');
        if (this.submitStarRatingBtn) this.submitStarRatingBtn.classList.remove('hidden');
      } else {
        if (this.voteButton) this.voteButton.classList.remove('hidden');
        if (this.submitStarRatingBtn) this.submitStarRatingBtn.classList.add('hidden');
      }
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
    
    // Use the original items array instead of shuffling to maintain input order
    const songItems = [...this.items];
    
    // Create song grid
    const songGrid = document.createElement('div');
    songGrid.className = 'song-selection-grid';
    
    // Add each song to the grid
    songItems.forEach(song => {
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
          <div class="song-artist">${song.artist || 'Unknown'}</div>
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
    try {
      if (!this.currentPlaylist) {
        app.showMessage('No playlist selected');
        return;
      }
      
      if (!authService.isLoggedIn()) {
        app.showMessage('Please log in to vote');
        return;
      }
      
      const rankingType = this.currentPlaylist.rankingType || 'ranked-choice';
      let voteData;
      
      if (rankingType === 'ranked-choice') {
        // Ensure we have all three selections
        if (!this.selections.first || !this.selections.second || !this.selections.third) {
          app.showMessage('Please select your top three songs before submitting');
          return;
        }
        
        const currentUser = authService.getCurrentUser();
        
        // Prepare vote data
        voteData = {
          playlistId: this.currentPlaylist.id,
          userId: currentUser.uid,
          displayName: currentUser.displayName || 'Anonymous',
          photoURL: currentUser.photoURL || '',
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          votes: [
            {
              songId: this.selections.first.id,
              rank: 1,
              songTitle: this.selections.first.title
            },
            {
              songId: this.selections.second.id,
              rank: 2,
              songTitle: this.selections.second.title
            },
            {
              songId: this.selections.third.id,
              rank: 3,
              songTitle: this.selections.third.title
            }
          ]
        };
      } else if (rankingType === 'star-rating') {
        // Check if any songs have been rated
        const ratedSongs = this.items.filter(song => this.starRatings[song.id] > 0);
        
        if (ratedSongs.length === 0) {
          app.showMessage('Please rate at least one song before submitting');
          return;
        }
        
        // Format star ratings for submission
        const starVotes = [];
        this.items.forEach(song => {
          if (this.starRatings[song.id]) {
            starVotes.push({
              songId: song.id,
              rating: this.starRatings[song.id],
              songTitle: song.title
            });
          }
        });
        
        voteData = {
          userId: authService.getCurrentUser().uid,
          userName: authService.getCurrentUser().displayName || 'Anonymous',
          playlistId: this.currentPlaylist.id,
          createdAt: new Date(),
          voteType: 'star-rating',
          starVotes: starVotes
        };
      }
      
      // Submit the vote to Firestore
      await FirebaseService.submitVote(voteData);
      
      // Show success message and redirect back to the playlist page
      app.hideLoading();
      app.showMessage('Your vote has been submitted successfully!');
      
      // Return directly to the playlist page
      if (this.currentPlaylist && this.currentPlaylist.id) {
        playlistManager.viewPlaylist(this.currentPlaylist.id);
      } else {
        app.navigateTo('dashboard-section');
      }
    } catch (error) {
      console.error('Error submitting vote:', error);
      app.hideLoading();
      app.showMessage(`Error submitting vote: ${error.message}`);
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
  
  // Show the vote success screen
  showVoteSuccess() {
    // Navigate to the vote success section
    app.navigateTo('vote-success-section', { id: this.currentPlaylist.id });
    
    // Update the vote results if needed
    this.displayVoteResults();
  }
  
  // Display vote results on the success page
  displayVoteResults() {
    const voteResultsContainer = document.getElementById('vote-results');
    if (!voteResultsContainer) return;
    
    // Clear any existing content
    voteResultsContainer.innerHTML = '';
    
    // Add selected songs in order
    if (this.selections.first) {
      this.addVoteResultItem(voteResultsContainer, this.selections.first, '1st');
    }
    
    if (this.selections.second) {
      this.addVoteResultItem(voteResultsContainer, this.selections.second, '2nd');
    }
    
    if (this.selections.third) {
      this.addVoteResultItem(voteResultsContainer, this.selections.third, '3rd');
    }
    
    // Set up back to playlist button
    const backToPlaylistBtn = document.getElementById('back-to-playlist-btn');
    if (backToPlaylistBtn && this.currentPlaylist) {
      backToPlaylistBtn.onclick = () => playlistManager.viewPlaylist(this.currentPlaylist.id);
    }
  }
  
  // Helper method to add a song result item
  addVoteResultItem(container, song, rank) {
    const resultItem = document.createElement('div');
    resultItem.className = 'result-item';
    
    resultItem.innerHTML = `
      <div class="result-rank">${rank}</div>
      <div class="song-result">
        <div class="song-thumbnail">
          <img src="${song.coverImage || 'images/default-thumbnail.jpg'}" alt="${song.title}">
        </div>
        <div class="song-info">
          <h4>${song.title}</h4>
          <p>${song.artist || 'Unknown Artist'}</p>
        </div>
      </div>
    `;
    
    container.appendChild(resultItem);
  }

  // Start a countdown timer
  startCountdown(deadline) {
    const countdownElement = document.getElementById('voting-countdown');
    const updateCountdown = () => {
      const now = new Date();
      const timeLeft = deadline - now;

      if (timeLeft <= 0) {
        clearInterval(intervalId);
        countdownElement.textContent = 'Voting has ended.';
        if (this.voteButton) this.voteButton.disabled = true;
        return;
      }

      const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

      countdownElement.textContent = `Time left: ${hours}h ${minutes}m ${seconds}s`;
    };

    updateCountdown();
    const intervalId = setInterval(updateCountdown, 1000);
  }
  
  // Add methods for star rating
  displayCurrentSong() {
    if (!this.items || this.items.length === 0 || !this.songCard) return;
    
    const song = this.items[this.currentSongIndex];
    const totalSongs = this.items.length;
    const currentRating = this.starRatings[song.id] || 0;
    
    // Create the Suno URL for the song
    const sunoUrl = song.sunoUrl || `https://suno.com/song/${song.id}`;
    
    // Update song card
    this.songCard.innerHTML = `
      <img src="${song.coverImage || 'assets/default-cover.png'}" alt="${song.title}" class="song-card-image">
      <div class="song-card-content">
        <h3 class="song-card-title">
          <a href="${sunoUrl}" target="_blank" rel="noopener noreferrer">${song.title}</a>
        </h3>
        <div class="song-card-author">
          <img src="${song.authorAvatar || 'assets/default-avatar.png'}" alt="${song.author}" class="author-avatar">
          <span>${song.author}</span>
        </div>
        <div class="star-selector" data-song-id="${song.id}">
          ${this.generateStars(currentRating)}
        </div>
        <div class="song-progress">
          <span>Song ${this.currentSongIndex + 1} of ${totalSongs}</span>
          <span>${this.getCompletionStatus()}</span>
        </div>
      </div>
    `;
    
    // Attach click handlers to stars
    const stars = this.songCard.querySelectorAll('.star');
    stars.forEach((star, index) => {
      star.addEventListener('click', () => this.setRating(song.id, index + 1));
    });
    
    // Enable/disable navigation buttons
    if (this.prevSongBtn) this.prevSongBtn.disabled = this.currentSongIndex === 0;
    if (this.nextSongBtn) this.nextSongBtn.disabled = this.currentSongIndex === totalSongs - 1;
    if (this.submitStarRatingBtn) this.submitStarRatingBtn.disabled = !this.hasAnyRatings();
  }
  
  generateStars(rating) {
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
      starsHtml += `<span class="star ${i <= rating ? 'selected' : ''}" data-value="${i}">★</span>`;
    }
    return starsHtml;
  }
  
  setRating(songId, rating) {
    console.log(`Setting rating for song ${songId} to ${rating}`);
    this.starRatings[songId] = rating;
    
    // Update UI to show selected stars
    const stars = document.querySelectorAll(`.star-selector[data-song-id="${songId}"] .star`);
    stars.forEach((star, index) => {
      star.classList.toggle('selected', index < rating);
    });
    
    // Enable submit button as long as at least one song is rated
    const hasRatings = this.hasAnyRatings();
    console.log(`Has any ratings? ${hasRatings}`);
    if (this.submitStarRatingBtn) {
      console.log(`Updating submit button disabled state to: ${!hasRatings}`);
      this.submitStarRatingBtn.disabled = !hasRatings;
    } else {
      console.error('Submit button element not found');
    }
  }
  
  isStarRatingComplete() {
    // Check if all songs have a rating
    const allRated = this.items.every(song => this.starRatings[song.id] > 0);
    console.log('Current ratings:', this.starRatings);
    console.log(`Songs rated: ${Object.keys(this.starRatings).length}/${this.items.length}`);
    return allRated;
  }
  
  hasAnyRatings() {
    // Check if at least one song has a rating
    return this.items.some(song => this.starRatings[song.id] > 0);
  }
  
  getCompletionStatus() {
    // Count songs that have a rating greater than 0
    const rated = this.items.filter(song => this.starRatings[song.id] > 0).length;
    const total = this.items.length;
    return `${rated}/${total} songs rated`;
  }
  
  nextSong() {
    if (this.currentSongIndex < this.items.length - 1) {
      this.currentSongIndex++;
      this.displayCurrentSong();
    }
  }
  
  previousSong() {
    if (this.currentSongIndex > 0) {
      this.currentSongIndex--;
      this.displayCurrentSong();
    }
  }
}

// Initialize Voting Manager
const votingManager = new VotingManager();

// Add a direct event listener to the submit button
document.addEventListener('DOMContentLoaded', () => {
  const submitStarRatingBtn = document.getElementById('submit-star-rating-btn');
  if (submitStarRatingBtn) {
    console.log('Adding direct click handler to submit-star-rating-btn');
    submitStarRatingBtn.addEventListener('click', () => {
      console.log('Submit button clicked directly');
      votingManager.submitVote();
    });
  } else {
    console.error('Could not find submit-star-rating-btn on DOMContentLoaded');
  }
});
