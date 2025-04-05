// Voting functionality
class VotingManager {
  constructor() {
    // Common elements
    this.backToPlaylistBtn = document.getElementById('back-to-playlist-btn');
    this.voteButton = document.getElementById('submit-vote-btn');
    
    // Ranked choice elements
    this.matchupContainer = document.getElementById('matchup-container');
    this.choiceA = document.getElementById('choice-a');
    this.choiceB = document.getElementById('choice-b');
    this.choiceABtn = document.getElementById('choice-a-btn');
    this.choiceBBtn = document.getElementById('choice-b-btn');
    this.skipBtn = document.getElementById('skip-btn');
    this.votingProgress = document.getElementById('voting-progress');
    this.votingProgressText = document.getElementById('voting-progress-text');
    this.votingSongsContainer = document.getElementById('voting-songs-container');
    
    // Star rating elements
    this.starRatingContainer = document.getElementById('star-rating-container');
    this.songCard = document.getElementById('song-card');
    this.songProgress = document.getElementById('song-progress');
    this.nextSongBtn = document.getElementById('next-song-btn');
    this.prevSongBtn = document.getElementById('prev-song-btn');
    this.submitStarRatingBtn = document.getElementById('submit-star-rating-btn');
    
    // Bracket tournament elements
    this.bracketContainer = document.getElementById('bracket-container');
    this.bracketMatchup = document.getElementById('bracket-matchup');
    this.bracketRoundTitle = document.getElementById('bracket-round-title');
    this.bracketProgress = document.getElementById('bracket-progress');
    this.bracketVisualization = document.getElementById('bracket-visualization');
    this.bracketAdminControls = document.getElementById('bracket-admin-controls');
    this.bracketRoundSelect = document.getElementById('bracket-round-select');
    this.bracketRoundDeadline = document.getElementById('bracket-round-deadline');
    this.bracketUpdateRoundBtn = document.getElementById('bracket-update-round-btn');
    this.bracketSubmitVotesBtn = document.getElementById('bracket-submit-votes-btn');
    
    // State
    this.currentPlaylist = null;
    this.items = [];
    this.selections = {
      first: null,
      second: null,
      third: null
    };
    this.starRatings = {};
    this.currentSongIndex = 0;
    
    // Bracket tournament state
    this.bracket = null;
    this.currentMatchup = null;
    this.currentRound = 1;
    this.roundDeadline = null;
    this.currentMatchupIndex = 0;
    this.bracketWinners = [];
    this.bracketVotes = {}; // Store user votes before submission
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Get DOM elements
    this.voteButton = document.getElementById('submit-vote-btn');
    this.submitStarRatingBtn = document.getElementById('submit-star-rating-btn');
    this.bracketSubmitVotesBtn = document.getElementById('bracket-submit-votes-btn');
    this.bracketUpdateRoundBtn = document.getElementById('bracket-update-round-btn');
    this.bracketRoundSelect = document.getElementById('bracket-round-select');
    this.bracketRoundDeadline = document.getElementById('bracket-round-deadline');
    this.bracketRoundTitle = document.getElementById('bracket-round-title');
    this.bracketProgress = document.getElementById('bracket-progress');
    this.bracketMatchup = document.getElementById('bracket-matchup');
    this.bracketVisualization = document.getElementById('bracket-visualization');
    this.bracketAdminControls = document.getElementById('bracket-admin-controls');
    this.backToPlaylistBtn = document.getElementById('back-to-playlist-btn');
    
    // Add event listeners for ranked choice voting
    if (this.voteButton) {
      this.voteButton.addEventListener('click', () => {
        this.submitVote();
      });
    }
    
    // Add event listeners for star rating
    if (this.submitStarRatingBtn) {
      this.submitStarRatingBtn.addEventListener('click', () => {
        this.submitStarRatings();
      });
    }
    
    // Hide the Choose Left/Right buttons since we're using the cards directly
    const leftBtn = document.getElementById('bracket-choice-left-btn');
    const rightBtn = document.getElementById('bracket-choice-right-btn');
    if (leftBtn) leftBtn.style.display = 'none';
    if (rightBtn) rightBtn.style.display = 'none';
    
    if (this.bracketSubmitVotesBtn) {
      this.bracketSubmitVotesBtn.addEventListener('click', () => {
        this.submitBracketVotes();
      });
    }
    
    if (this.bracketUpdateRoundBtn) {
      this.bracketUpdateRoundBtn.addEventListener('click', () => {
        this.updateBracketRound();
      });
    }
    
    // Add event listener for Back To Playlist button
    if (this.backToPlaylistBtn) {
      this.backToPlaylistBtn.addEventListener('click', () => {
        if (this.currentPlaylist && this.currentPlaylist.id) {
          playlistManager.viewPlaylist(this.currentPlaylist.id);
        } else {
          // Fallback to playlist section if we don't have a current playlist
          app.navigateTo('playlists-section');
        }
      });
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
      const bracketContainer = document.getElementById('bracket-container');
      
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
      forceHide(bracketContainer);
      
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
      } else if (rankingType && rankingType.toLowerCase() === 'bracket') {
        // Validate that the playlist has a valid number of items for a bracket
        const validSizes = [2, 4, 8, 16, 32];
        if (!validSizes.includes(this.items.length)) {
          app.showMessage(`Bracket tournaments require 2, 4, 8, 16, or 32 songs. This playlist has ${this.items.length} songs.`);
          playlistManager.viewPlaylist(this.currentPlaylist.id);
          return;
        }
        
        // Initialize bracket tournament
        this.initializeBracket();
        
        // Load the current round from Firebase
        await this.loadCurrentRound();
        
        // Show ONLY bracket tournament UI, hide other UI
        forceShow(bracketContainer);
        forceHide(rankedChoiceContainer);
        forceHide(starRatingContainer);
        forceHide(votingSongsContainer);
        console.log("Bracket tournament UI should be visible, other UI hidden");
        
        // Hide the choice buttons
        this.hideChoiceButtons();
        
        // Set up the first matchup
        await this.displayCurrentMatchup();
        
        // Check if there's a voting deadline
        if (playlist.votingDeadline) {
          const deadline = new Date(playlist.votingDeadline);
          this.startCountdown(deadline);
        }
      } else if (!rankingType || rankingType.toLowerCase() === 'ranked-choice') {
        // Reset selections for ranked choice
        this.selections = {
          first: null,
          second: null,
          third: null
        };
        
        // Show ONLY ranked choice UI, hide star rating UI
        forceShow(rankedChoiceContainer);
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
      } else if (rankingType && rankingType.toLowerCase() === 'bracket') {
        if (this.voteButton) this.voteButton.classList.add('hidden');
        if (this.submitStarRatingBtn) this.submitStarRatingBtn.classList.add('hidden');
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
  
  // Display the current song for star rating
  displayCurrentSong() {
    if (!this.items || this.items.length === 0) {
      console.error('No songs available for rating');
      return;
    }
    
    // Make sure currentSongIndex is valid
    if (this.currentSongIndex < 0) this.currentSongIndex = 0;
    if (this.currentSongIndex >= this.items.length) this.currentSongIndex = this.items.length - 1;
    
    const currentSong = this.items[this.currentSongIndex];
    
    if (!currentSong) {
      console.error('Current song not found');
      return;
    }
    
    // Update song card with current song details
    if (this.songCard) {
      this.songCard.innerHTML = `
        <div class="song-card-image">
          <img src="${currentSong.coverImage || 'assets/default-cover.png'}" alt="${currentSong.title}" style="width:100%; aspect-ratio:1/1; object-fit:cover;">
        </div>
        <div class="song-card-content">
          <h3 class="song-card-title"><a href="${currentSong.sunoUrl || '#'}" target="_blank">${currentSong.title}</a></h3>
          <div class="song-card-author">
            <img src="${currentSong.authorAvatar || 'assets/default-avatar.png'}" alt="${currentSong.author}" class="artist-avatar" style="width:32px; height:32px; border-radius:50%; margin-right:8px;">
            <span>${currentSong.author}</span>
          </div>
          <div class="star-rating" id="star-rating-${currentSong.id}">
            <i class="far fa-star" data-value="1"></i>
            <i class="far fa-star" data-value="2"></i>
            <i class="far fa-star" data-value="3"></i>
            <i class="far fa-star" data-value="4"></i>
            <i class="far fa-star" data-value="5"></i>
          </div>
        </div>
      `;
      
      // Set up star rating click handlers
      const stars = this.songCard.querySelectorAll('.star-rating i');
      stars.forEach(star => {
        star.addEventListener('click', () => {
          const value = parseInt(star.dataset.value);
          this.setStarRating(currentSong.id, value);
        });
        
        star.addEventListener('mouseover', () => {
          const value = parseInt(star.dataset.value);
          this.highlightStars(stars, value);
        });
        
        star.addEventListener('mouseout', () => {
          // Restore the actual rating
          const currentRating = this.starRatings[currentSong.id] || 0;
          this.highlightStars(stars, currentRating);
        });
      });
      
      // Set any existing rating
      if (this.starRatings[currentSong.id]) {
        this.highlightStars(stars, this.starRatings[currentSong.id]);
      }
    }
    
    // Update progress indicator
    if (this.songProgress) {
      this.songProgress.textContent = `Song ${this.currentSongIndex + 1} of ${this.items.length}`;
    }
    
    // Update navigation buttons state
    if (this.prevSongBtn) {
      this.prevSongBtn.disabled = this.currentSongIndex === 0;
      this.prevSongBtn.classList.toggle('disabled', this.currentSongIndex === 0);
      
      // Add click handler if not already added
      if (!this.prevSongBtn._hasClickHandler) {
        this.prevSongBtn.addEventListener('click', () => {
          if (this.currentSongIndex > 0) {
            this.currentSongIndex--;
            this.displayCurrentSong();
          }
        });
        this.prevSongBtn._hasClickHandler = true;
      }
    }
    
    if (this.nextSongBtn) {
      this.nextSongBtn.disabled = this.currentSongIndex === this.items.length - 1;
      this.nextSongBtn.classList.toggle('disabled', this.currentSongIndex === this.items.length - 1);
      
      // Add click handler if not already added
      if (!this.nextSongBtn._hasClickHandler) {
        this.nextSongBtn.addEventListener('click', () => {
          if (this.currentSongIndex < this.items.length - 1) {
            this.currentSongIndex++;
            this.displayCurrentSong();
          }
        });
        this.nextSongBtn._hasClickHandler = true;
      }
    }
  }
  
  // Highlight stars up to the given value
  highlightStars(stars, value) {
    stars.forEach(star => {
      const starValue = parseInt(star.dataset.value);
      if (starValue <= value) {
        star.className = 'fas fa-star';
      } else {
        star.className = 'far fa-star';
      }
    });
  }
  
  // Set star rating for a song
  setStarRating(songId, value) {
    this.starRatings[songId] = value;
    console.log(`Set rating for song ${songId} to ${value}`);
    
    // Highlight the appropriate stars
    const stars = document.querySelectorAll(`#star-rating-${songId} i`);
    this.highlightStars(stars, value);
    
    // Enable the submit button if at least one rating is made
    if (this.submitStarRatingBtn) {
      this.submitStarRatingBtn.disabled = false;
      console.log('Submit star rating button enabled');
    }
  }
  
  // Render all songs for ranked-choice selection
  renderSongsForSelection() {
    if (!this.items || this.items.length === 0 || !this.votingSongsContainer) {
      console.error('No songs to render or container not found');
      return;
    }
    
    // Clear the container first
    this.votingSongsContainer.innerHTML = '';
    
    // Create instructions
    const instructions = document.createElement('div');
    instructions.className = 'voting-instructions';
    instructions.innerHTML = `
      <h3>Select your top three songs</h3>
      <p>Click on songs to select your first, second, and third place choices.</p>
    `;
    this.votingSongsContainer.appendChild(instructions);
    
    // Create songs grid
    const songsGrid = document.createElement('div');
    songsGrid.className = 'songs-grid';
    
    // Add each song
    this.items.forEach(song => {
      const songCard = document.createElement('div');
      songCard.className = 'song-card';
      songCard.dataset.songId = song.id;
      
      // Check if this song is one of the selections
      let selectionClass = '';
      let selectionBadge = '';
      
      if (this.selections.first === song.id) {
        selectionClass = 'selected first-place';
        selectionBadge = '<div class="selection-badge first">1st</div>';
      } else if (this.selections.second === song.id) {
        selectionClass = 'selected second-place';
        selectionBadge = '<div class="selection-badge second">2nd</div>';
      } else if (this.selections.third === song.id) {
        selectionClass = 'selected third-place';
        selectionBadge = '<div class="selection-badge third">3rd</div>';
      }
      
      songCard.className += ` ${selectionClass}`;
      
      songCard.innerHTML = `
        ${selectionBadge}
        <div class="song-thumbnail">
          <img src="${song.coverImage || 'assets/default-cover.png'}" alt="${song.title}">
        </div>
        <div class="song-details">
          <h4 class="song-title">${song.title}</h4>
          <div class="song-artist">
            <img src="${song.authorAvatar || 'assets/default-avatar.png'}" alt="${song.author}" class="artist-avatar-small">
            <span>${song.author}</span>
          </div>
        </div>
      `;
      
      // Add click handler to select/deselect songs
      songCard.addEventListener('click', () => {
        this.toggleSongSelection(song.id);
      });
      
      songsGrid.appendChild(songCard);
    });
    
    this.votingSongsContainer.appendChild(songsGrid);
    
    // Add submit button container
    const submitContainer = document.createElement('div');
    submitContainer.className = 'submit-container';
    submitContainer.style.marginTop = '20px';
    submitContainer.style.textAlign = 'center';
    
    // Create a submit button if the original submit-vote-btn is not available
    const submitBtn = document.createElement('button');
    submitBtn.id = 'ranked-choice-submit-btn';
    submitBtn.className = 'primary-btn';
    submitBtn.textContent = 'Submit Vote';
    submitBtn.disabled = !(this.selections.first || this.selections.second || this.selections.third);
    
    // Add click event listener to the new submit button
    submitBtn.addEventListener('click', () => this.submitVote());
    
    submitContainer.appendChild(submitBtn);
    this.votingSongsContainer.appendChild(submitContainer);
    
    // Styles for ranked choice voting moved to styles.css
  }
  
  // Toggle song selection for ranked-choice voting
  toggleSongSelection(songId) {
    // Check if this song is already selected
    if (this.selections.first === songId) {
      this.selections.first = null;
    } else if (this.selections.second === songId) {
      this.selections.second = null;
    } else if (this.selections.third === songId) {
      this.selections.third = null;
    } else {
      // Not selected yet, add it to the first empty slot
      if (this.selections.first === null) {
        this.selections.first = songId;
      } else if (this.selections.second === null) {
        this.selections.second = songId;
      } else if (this.selections.third === null) {
        this.selections.third = songId;
      } else {
        // All slots are full, show a message
        app.showMessage('You can only select three songs. Deselect one first.');
        return;
      }
    }
    
    // Update the UI to reflect the changes
    this.renderSongsForSelection();
    
    // Enable/disable the submit button based on selections
    if (this.voteButton) {
      const hasSelections = this.selections.first !== null || 
                          this.selections.second !== null || 
                          this.selections.third !== null;
      this.voteButton.disabled = !hasSelections;
    }
  }
  
  // Submit star ratings for all songs
  async submitStarRatings() {
    try {
      // Ensure user is logged in
      if (!authService.isLoggedIn()) {
        app.showMessage("You must be logged in to submit ratings.");
        return;
      }
      
      // Show loading
      app.showLoading('Submitting your ratings...');
      
      // Check if any ratings were made
      const ratingEntries = Object.entries(this.starRatings);
      if (ratingEntries.length === 0) {
        app.showMessage('Please rate at least one song before submitting.');
        app.hideLoading();
        return;
      }
      
      // Prepare vote data
      const userId = authService.getCurrentUser().uid;
      const playlistId = this.currentPlaylist.id;
      
      // Structure the vote data to match Firebase service expectations
      const voteData = {
        userId: userId,
        playlistId: playlistId,
        voteType: 'star-rating',
        starVotes: this.starRatings, // Using starVotes instead of ratings to match Firebase service
        createdAt: new Date().toISOString() // Using createdAt instead of timestamp
      };
      
      // Submit to Firebase
      await FirebaseService.submitVote(voteData);
      
      // Show success message
      app.showMessage('Your ratings have been submitted successfully!');
      
      // Navigate back to the playlist
      playlistManager.viewPlaylist(playlistId);
    } catch (error) {
      console.error('Error submitting star ratings:', error);
      app.showMessage(`Error: ${error.message}`);
    } finally {
      app.hideLoading();
    }
  }
  
  // Submit ranked choice vote
  async submitVote() {
    try {
      // Ensure user is logged in
      if (!authService.isLoggedIn()) {
        app.showMessage("You must be logged in to submit a vote.");
        return;
      }
      
      // Show loading
      app.showLoading('Submitting your vote...');
      
      // Check if any selections were made
      if (!this.selections.first && !this.selections.second && !this.selections.third) {
        app.showMessage('Please select at least one song before submitting your vote.');
        app.hideLoading();
        return;
      }
      
      // Prepare vote data
      const userId = authService.getCurrentUser().uid;
      const playlistId = this.currentPlaylist.id;
      
      // Find the song objects for the selections
      const firstChoice = this.selections.first ? this.items.find(item => item.id === this.selections.first) : null;
      const secondChoice = this.selections.second ? this.items.find(item => item.id === this.selections.second) : null;
      const thirdChoice = this.selections.third ? this.items.find(item => item.id === this.selections.third) : null;
      
      // Structure the vote data to exactly match the format in the database
      const voteData = {
        userId: userId,
        playlistId: playlistId,
        voteType: 'ranked-choice',
        // Use selections object with first, second, third fields to match database structure
        selections: {
          first: this.selections.first,
          second: this.selections.second,
          third: this.selections.third
        },
        timestamp: new Date().toISOString()
      };
      
      // Submit to Firebase
      await FirebaseService.submitVote(voteData);
      
      // Show success message
      app.showMessage('Your vote has been submitted successfully!');
      
      // Navigate back to the playlist
      playlistManager.viewPlaylist(playlistId);
    } catch (error) {
      console.error('Error submitting vote:', error);
      app.showMessage(`Error: ${error.message}`);
    } finally {
      app.hideLoading();
    }
  }
  
  // Initialize bracket tournament
  initializeBracket() {
    // Hide any choice buttons right at initialization
    this.hideChoiceButtons();
    console.log("Initializing bracket with items:", this.items.length);
    
    // Validate that we have items
    if (!this.items || this.items.length === 0) {
      console.error("No items available for bracket tournament");
      return;
    }
    
    // Create a binary tree structure for the bracket
    try {
      this.bracket = this.createBracketTree(this.items);
      
      // Initialize current matchup
      this.currentMatchup = this.bracket;
      
      // Initialize current round
      this.currentRound = 1;
      
      // Initialize round deadline
      this.roundDeadline = null;
      
      console.log("Bracket initialized successfully");
    } catch (error) {
      console.error("Error initializing bracket:", error);
    }
  }
  
  // Create a binary tree structure for the bracket
  createBracketTree(items) {
    console.log("Creating bracket tree with items:", items.length);
    
    // Handle empty items array
    if (!items || items.length === 0) {
      console.error("No items provided for bracket tree");
      return null;
    }
    
    // Base case: if there's only one item, return it as a leaf node
    if (items.length === 1) {
      return {
        song: items[0],
        winner: null,
        children: []
      };
    }
    
    // Recursive case: split the items into two halves and create child nodes
    const mid = Math.floor(items.length / 2);
    const left = this.createBracketTree(items.slice(0, mid));
    const right = this.createBracketTree(items.slice(mid));
    
    // Create the current node with the two child nodes
    return {
      song: null,
      winner: null,
      children: [left, right]
    };
  }
  
  // Display the current matchup for the bracket tournament
  async displayCurrentMatchup() {
    if (!this.bracketMatchup) return;
    
    // We want to keep the Submit Votes button, but remove any left/right choice buttons
    this.hideChoiceButtons();
    
    try {
      // Get the current matchup
      const matchup = await this.getCurrentBracketMatchup();
      if (!matchup) {
        console.error("No matchup available");
        return;
      }
      
      console.log("Displaying matchup:", matchup);
      
      // Update the UI with the current matchup
      this.bracketMatchup.innerHTML = `
        <div class="bracket-song" data-song-id="${matchup.songA.id}" data-choice="left">
          <img src="${matchup.songA.coverImage || 'assets/default-cover.png'}" alt="${matchup.songA.title}" class="bracket-song-image">
          <h3 class="bracket-song-title">
            <a href="${matchup.songA.sunoUrl || `https://suno.com/song/${matchup.songA.id}`}" target="_blank" class="bracket-song-link" onclick="event.stopPropagation();">
              ${matchup.songA.title}
            </a>
          </h3>
          <div class="bracket-song-artist-container">
            <img src="${matchup.songA.authorAvatar || 'assets/default-avatar.png'}" alt="${matchup.songA.authorHandle || matchup.songA.author || 'Artist'}" class="bracket-song-avatar">
            <p class="bracket-song-artist">${matchup.songA.author || 'Unknown artist'}</p>
          </div>
        </div>
        
        <div class="bracket-vs">
          <span>VS</span>
        </div>
        
        <div class="bracket-song" data-song-id="${matchup.songB.id}" data-choice="right">
          <img src="${matchup.songB.coverImage || 'assets/default-cover.png'}" alt="${matchup.songB.title}" class="bracket-song-image">
          <h3 class="bracket-song-title">
            <a href="${matchup.songB.sunoUrl || `https://suno.com/song/${matchup.songB.id}`}" target="_blank" class="bracket-song-link" onclick="event.stopPropagation();">
              ${matchup.songB.title}
            </a>
          </h3>
          <div class="bracket-song-artist-container">
            <img src="${matchup.songB.authorAvatar || 'assets/default-avatar.png'}" alt="${matchup.songB.authorHandle || matchup.songB.author || 'Artist'}" class="bracket-song-avatar">
            <p class="bracket-song-artist">${matchup.songB.author || 'Unknown artist'}</p>
          </div>
        </div>
      `;
      
      // Add click event listeners to the bracket songs
      const bracketSongs = this.bracketMatchup.querySelectorAll('.bracket-song');
      bracketSongs.forEach(song => {
        song.addEventListener('click', (e) => {
          // Don't trigger if clicking on the title link (which opens Suno)
          if (e.target.tagName.toLowerCase() === 'a' || e.target.closest('a')) {
            return;
          }
          const choice = song.dataset.choice;
          this.selectBracketWinner(choice);
        });
      });
      
      // Styles for bracket songs moved to styles.css
      
      // Update the round title
      if (this.bracketRoundTitle) {
        this.bracketRoundTitle.textContent = `Round ${this.currentRound}`;
      }
      
      // Update the progress
      if (this.bracketProgress) {
        const totalRounds = this.calculateTotalRounds(this.items.length);
        const matchNumber = this.getCurrentMatchNumber();
        const totalMatches = this.getTotalMatchesForRound(this.currentRound);
        this.bracketProgress.innerHTML = `<span>Match ${matchNumber} of ${totalMatches} (Round ${this.currentRound}/${totalRounds})</span>`;
      }
      
      // Update the bracket visualization
      this.updateBracketVisualization();
      
      // Show admin controls if user is the playlist owner
      this.showAdminControlsIfOwner();
      
      // Check if the current matchup has already been voted on
      this.checkIfMatchupVoted(matchup);
    } catch (error) {
      console.error("Error displaying current matchup:", error);
    }
  }
  
  // Get the current bracket matchup
  async getCurrentBracketMatchup() {
    console.log(`Getting matchup for round ${this.currentRound}, matchup index ${this.currentMatchupIndex}`);
    
    // If we're at the beginning of the tournament, create matchups from the items
    if (this.currentRound === 1) {
      // Initialize currentMatchupIndex if it doesn't exist
      if (this.currentMatchupIndex === undefined) {
        this.currentMatchupIndex = 0;
      }
      
      // Calculate the indices for the current matchup
      const indexA = this.currentMatchupIndex * 2;
      const indexB = indexA + 1;
      
      console.log(`Round 1 matchup: indexA: ${indexA}, indexB: ${indexB}`);
      
      // Make sure we have valid indices
      if (indexA < this.items.length && indexB < this.items.length) {
        return {
          songA: this.items[indexA],
          songB: this.items[indexB],
          round: this.currentRound,
          matchNumber: this.currentMatchupIndex + 1
        };
      } else {
        console.error(`Invalid indices for matchup: ${indexA}, ${indexB}`);
      }
    } else {
      // For later rounds, we need to get the winners from the previous round
      const previousRound = this.currentRound - 1;
      
      // Get the winners from the previous round
      let previousRoundWinners = [];
      
      try {
        // First check if we have cached winners
        if (this.bracketWinners && this.bracketWinners[previousRound]) {
          previousRoundWinners = this.bracketWinners[previousRound];
          console.log(`Using cached winners for round ${previousRound}:`, previousRoundWinners);
        } else {
          // If not, calculate the winners from the votes
          previousRoundWinners = await this.calculateRoundWinners(previousRound);
          
          // Cache the winners for future use
          if (!this.bracketWinners) {
            this.bracketWinners = {};
          }
          this.bracketWinners[previousRound] = previousRoundWinners;
          
          console.log(`Calculated winners for round ${previousRound}:`, previousRoundWinners);
        }
        
        // Make sure we have winners
        if (!previousRoundWinners || previousRoundWinners.length === 0) {
          console.error(`No winners found for round ${previousRound}`);
          throw new Error(`No winners found for round ${previousRound}`);
        }
        
        // Calculate the indices for the current matchup
        const indexA = this.currentMatchupIndex * 2;
        const indexB = indexA + 1;
        
        console.log(`Round ${this.currentRound} matchup: indexA: ${indexA}, indexB: ${indexB}, total winners: ${previousRoundWinners.length}`);
        
        // Make sure we have valid indices
        if (indexA < previousRoundWinners.length && indexB < previousRoundWinners.length) {
          // Find the songs in the items array
          const songA = this.items.find(song => song.id === previousRoundWinners[indexA].songId);
          const songB = this.items.find(song => song.id === previousRoundWinners[indexB].songId);
          
          if (songA && songB) {
            return {
              songA: songA,
              songB: songB,
              round: this.currentRound,
              matchNumber: this.currentMatchupIndex + 1
            };
          } else {
            console.error(`Could not find songs for matchup: songA id: ${previousRoundWinners[indexA].songId}, songB id: ${previousRoundWinners[indexB].songId}`);
            throw new Error("Could not find songs for matchup");
          }
        } else {
          console.error(`Invalid indices for matchup: ${indexA}, ${indexB}, total winners: ${previousRoundWinners.length}`);
          throw new Error("Invalid indices for matchup");
        }
      } catch (error) {
        console.error(`Error getting matchup for round ${this.currentRound}:`, error);
      }
    }
    
    // If we can't determine the matchup, return a default
    console.warn("Could not determine current matchup, returning default");
    return {
      songA: this.items[0],
      songB: this.items[1],
      round: this.currentRound,
      matchNumber: 1
    };
  }
  
  // Get the current match number
  getCurrentMatchNumber() {
    // Return the current matchup index + 1 (to make it 1-based)
    return this.currentMatchupIndex !== undefined ? this.currentMatchupIndex + 1 : 1;
  }
  
  // Get the total number of matches for a round
  getTotalMatchesForRound(round) {
    // The number of matches in a round is half the number of participants in that round
    const participantsInRound = this.items.length / Math.pow(2, round - 1);
    return participantsInRound / 2;
  }
  
  // Helper method to remove choice buttons completely
  hideChoiceButtons() {
    // Find and remove only the choice left/right buttons from the DOM
    const choiceButtons = document.querySelectorAll('#bracket-choice-left-btn, #bracket-choice-right-btn');
    choiceButtons.forEach(btn => {
      if (btn && btn.parentNode) {
        btn.parentNode.removeChild(btn);
      }
    });
    
    // Also remove any buttons with text containing 'Choose Left' or 'Choose Right'
    document.querySelectorAll('button').forEach(btn => {
      if (btn && btn.textContent && (
        btn.textContent.includes('Choose Left') ||
        btn.textContent.includes('Choose Right')
      ) && btn.parentNode) {
        btn.parentNode.removeChild(btn);
      }
    });
    
    // Add CSS to ensure any dynamically added buttons won't show
    // Styles for bracket voting moved to styles.css
  }
  
  // Update the bracket visualization
  updateBracketVisualization() {
    if (!this.bracketVisualization) return;
    
    // Create a simple table to display the matchups and votes
    let html = `
      <div class="bracket-votes-table-container">
        <table class="bracket-votes-table">
          <thead>
            <tr>
              <th>Match-Up Songs</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    // Get the number of matches in the current round
    const matchesInRound = this.getTotalMatchesForRound(this.currentRound);
    
    // Generate a row for each match in the current round
    for (let match = 1; match <= matchesInRound; match++) {
      // Determine the songs for this match
      let leftSong = null;
      let rightSong = null;
      
      // For round 1, we know the songs are just the original playlist items
      if (this.currentRound === 1) {
        const leftIndex = (match - 1) * 2;
        const rightIndex = leftIndex + 1;
        
        if (leftIndex < this.items.length) {
          leftSong = this.items[leftIndex];
        }
        
        if (rightIndex < this.items.length) {
          rightSong = this.items[rightIndex];
        }
      } else {
        // For later rounds, try to get the actual songs from previous round winners
        try {
          // Only attempt this if we have winners from previous rounds
          if (this.bracketWinners && this.bracketWinners[this.currentRound - 1]) {
            const previousRoundWinners = this.bracketWinners[this.currentRound - 1];
            const leftIndex = (match - 1) * 2;
            const rightIndex = leftIndex + 1;
            
            // Make sure indices are valid
            if (leftIndex < previousRoundWinners.length && previousRoundWinners[leftIndex]) {
              // Find the actual song from the items array
              leftSong = this.items.find(song => song.id === previousRoundWinners[leftIndex].songId) || 
                      { title: `Winner from previous round` };
            }
            
            if (rightIndex < previousRoundWinners.length && previousRoundWinners[rightIndex]) {
              // Find the actual song from the items array
              rightSong = this.items.find(song => song.id === previousRoundWinners[rightIndex].songId) || 
                      { title: `Winner from previous round` };
            }
          } else {
            // If we don't have previous round winners, use placeholders
            leftSong = { title: `Match ${Math.floor((match-1)/2)*2 + 1} Winner` };
            rightSong = { title: `Match ${Math.floor((match-1)/2)*2 + 2} Winner` };
          }
        } catch (error) {
          console.error("Error determining songs for later rounds:", error);
          leftSong = { title: `Left Song` };
          rightSong = { title: `Right Song` };
        }
      }
      
      // Determine if this match has a vote
      let leftSelected = false;
      let rightSelected = false;
      
      if (this.bracketVotes && 
          this.bracketVotes[this.currentRound] && 
          this.bracketVotes[this.currentRound][match]) {
        
        const vote = this.bracketVotes[this.currentRound][match];
        
        // Determine which song was selected
        if (leftSong && leftSong.id === vote.songId) {
          leftSelected = true;
        } else if (rightSong && rightSong.id === vote.songId) {
          rightSelected = true;
        }
      }
      
      // Determine if this is the current match
      const isCurrentMatch = (match === this.getCurrentMatchNumber());
      
      // Create the row with a data attribute for the match number
      html += `
        <tr class="${isCurrentMatch ? 'current-match' : ''}" data-match="${match}" data-round="${this.currentRound}">
          <td>
            <div class="bracket-table-row">
              <div class="bracket-table-song ${leftSelected ? 'selected-song' : ''}">
                <img src="${leftSong && leftSong.coverImage ? leftSong.coverImage : 'assets/default-cover.png'}" class="bracket-table-song-image">
                <div class="bracket-table-song-info">
                  <div class="bracket-table-song-title">${leftSong ? leftSong.title : 'N/A'}</div>
                  <div class="bracket-table-song-artist-container">
                    <img src="${leftSong && leftSong.authorAvatar ? leftSong.authorAvatar : 'assets/default-avatar.png'}" class="bracket-table-song-avatar">
                    <div class="bracket-table-song-artist">${leftSong && leftSong.author ? leftSong.author : 'Unknown artist'}</div>
                  </div>
                </div>
              </div>
              <div class="bracket-table-vs">VS</div>
              <div class="bracket-table-song ${rightSelected ? 'selected-song' : ''}">
                <img src="${rightSong && rightSong.coverImage ? rightSong.coverImage : 'assets/default-cover.png'}" class="bracket-table-song-image">
                <div class="bracket-table-song-info">
                  <div class="bracket-table-song-title">${rightSong ? rightSong.title : 'N/A'}</div>
                  <div class="bracket-table-song-artist-container">
                    <img src="${rightSong && rightSong.authorAvatar ? rightSong.authorAvatar : 'assets/default-avatar.png'}" class="bracket-table-song-avatar">
                    <div class="bracket-table-song-artist">${rightSong && rightSong.author ? rightSong.author : 'Unknown artist'}</div>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      `;
    }
    
    html += `
          </tbody>
        </table>
      </div>
    `;
    
    this.bracketVisualization.innerHTML = html;
    
    // Add click event listeners to the table rows
    const rows = this.bracketVisualization.querySelectorAll('tbody tr');
    rows.forEach(row => {
      row.addEventListener('click', () => {
        const matchNumber = parseInt(row.dataset.match, 10);
        if (!isNaN(matchNumber)) {
          // Update the current matchup index (0-based, hence the -1)
          this.currentMatchupIndex = matchNumber - 1;
          // Display the selected matchup
          this.displayCurrentMatchup();
        }
      });
    });
    
    // Styles for bracket votes table moved to styles.css
  }
  
  // Show admin controls if the user is the playlist owner
  showAdminControlsIfOwner() {
    if (!this.bracketAdminControls || !this.currentPlaylist) return;
    
    // Check if the current user is the playlist owner
    const isOwner = authService.isLoggedIn() && 
                    authService.getCurrentUser().uid === this.currentPlaylist.createdBy;
    
    if (isOwner) {
      // Show the admin controls
      this.bracketAdminControls.classList.remove('hidden');
      
      // Populate the round select dropdown
      if (this.bracketRoundSelect) {
        // Clear existing options
        this.bracketRoundSelect.innerHTML = '';
        
        // Calculate the total number of rounds
        const totalRounds = this.calculateTotalRounds(this.items.length);
        
        // Add options for each round
        for (let i = 1; i <= totalRounds; i++) {
          const option = document.createElement('option');
          option.value = i;
          option.textContent = `Round ${i}`;
          
          // Select the current round
          if (i === this.currentRound) {
            option.selected = true;
          }
          
          this.bracketRoundSelect.appendChild(option);
        }
      }
      
      // Set the current deadline
      if (this.bracketRoundDeadline && this.roundDeadline) {
        // Format the date for the datetime-local input
        const formattedDate = this.roundDeadline.toISOString().slice(0, 16);
        this.bracketRoundDeadline.value = formattedDate;
      }
    } else {
      // Hide the admin controls
      this.bracketAdminControls.classList.add('hidden');
    }
  }
  
  // Select the winner of the current matchup
  async selectBracketWinner(winner) {
    console.log(`Winner selected: ${winner}`);
    
    try {
      // Get the current matchup
      const matchup = await this.getCurrentBracketMatchup();
      if (!matchup) {
        console.error("No matchup available");
        return;
      }
      
      // Determine the winning song
      const winningSong = winner === 'left' ? matchup.songA : matchup.songB;
      console.log("Winning song:", winningSong);
      
      // Highlight the selected song
      const songs = document.querySelectorAll('.bracket-song');
      songs.forEach(song => {
        song.classList.remove('selected');
        if (song.dataset.songId === winningSong.id) {
          song.classList.add('selected');
        }
      });
      
      // Store the vote in the bracketVotes object
      if (!this.bracketVotes[this.currentRound]) {
        this.bracketVotes[this.currentRound] = {};
      }
      this.bracketVotes[this.currentRound][matchup.matchNumber] = {
        songId: winningSong.id,
        songTitle: winningSong.title
      };
      
      console.log("Updated bracket votes:", this.bracketVotes);
      
      // Move to the next matchup after a short delay
      setTimeout(async () => {
        // Check if there are more matchups in the current round
        if (this.hasMoreMatchupsInRound()) {
          // Move to the next matchup in the current round
          await this.moveToNextMatchup();
        } else {
          // All matchups in the current round have been voted on
          app.showMessage("You've voted on all matchups in this round. Please submit your votes.");
        }
      }, 500);
    } catch (error) {
      console.error("Error selecting bracket winner:", error);
    }
  }
  
  // Submit all bracket votes to Firebase
  async submitBracketVotes() {
    if (!this.currentPlaylist || !authService.isLoggedIn()) {
      app.showMessage("You must be logged in to submit votes.");
      return;
    }
    
    // Check if there are any votes to submit
    if (!this.bracketVotes[this.currentRound] || Object.keys(this.bracketVotes[this.currentRound]).length === 0) {
      app.showMessage("You haven't voted on any matchups yet.");
      return;
    }
    
    try {
      app.showLoading();
      
      // Prepare vote data
      const voteData = {
        userId: authService.getCurrentUser().uid,
        userName: authService.getCurrentUser().displayName || 'Anonymous',
        playlistId: this.currentPlaylist.id,
        createdAt: new Date(),
        voteType: 'bracket',
        round: this.currentRound,
        votes: this.bracketVotes[this.currentRound]
      };
      
      // Submit the votes to Firestore
      await FirebaseService.submitBracketVotes(voteData);
      
      // Clear the votes for this round
      this.bracketVotes[this.currentRound] = {};
      
      app.showMessage("Your votes have been submitted successfully!");
      
      // Reset the selected state of all songs
      const songs = document.querySelectorAll('.bracket-song');
      songs.forEach(song => {
        song.classList.remove('selected');
      });
      
      // Update the bracket visualization
      this.updateBracketVisualization();
      
    } catch (error) {
      console.error("Error submitting bracket votes:", error);
      app.showMessage(`Error: ${error.message}`);
    } finally {
      app.hideLoading();
    }
  }
  
  // Check if there are more matchups in the current round
  hasMoreMatchupsInRound() {
    // Get the total number of matchups in the current round
    const totalMatchups = this.getTotalMatchesForRound(this.currentRound);
    
    // Get the current matchup number
    const currentMatchup = this.getCurrentMatchNumber();
    
    // Check if there are more matchups
    return currentMatchup < totalMatchups;
  }
  
  // Move to the next matchup in the current round
  async moveToNextMatchup() {
    // Increment the current matchup index
    if (!this.currentMatchupIndex) {
      this.currentMatchupIndex = 0;
    }
    this.currentMatchupIndex++;
    
    // Display the next matchup
    await this.displayCurrentMatchup();
  }
  
  // Show the final winner of the tournament
  showFinalWinner() {
    // Get the final winner
    const finalWinner = this.getFinalWinner();
    
    if (finalWinner) {
      // Show a message with the final winner
      app.showMessage(`The winner of the tournament is: ${finalWinner.title}!`);
      
      // Redirect back to the playlist page
      setTimeout(() => {
        if (this.currentPlaylist && this.currentPlaylist.id) {
          playlistManager.viewPlaylist(this.currentPlaylist.id);
        } else {
          app.navigateTo('dashboard-section');
        }
      }, 3000);
    }
  }
  
  // Get the final winner of the tournament
  getFinalWinner() {
    // For now, just return the last winner in the bracketWinners array
    if (this.bracketWinners && this.bracketWinners.length > 0) {
      const lastWinner = this.bracketWinners[this.bracketWinners.length - 1];
      
      // Find the song in the items array
      return this.items.find(song => song.id === lastWinner.songId);
    }
    
    return null;
  }
  
  // Update the bracket round (admin function)
  async updateBracketRound() {
    if (!this.bracketRoundSelect || !this.bracketRoundDeadline) return;
    
    try {
      app.showLoading();
      
      // Get the selected round
      const selectedRound = parseInt(this.bracketRoundSelect.value);
      
      // Get the round deadline
      const deadlineValue = this.bracketRoundDeadline.value;
      const deadline = deadlineValue ? new Date(deadlineValue) : null;
      
      // Verify that the current user is the playlist owner
      if (!this.currentPlaylist || this.currentPlaylist.createdBy !== authService.getCurrentUser().uid) {
        app.showMessage("Only the playlist owner can update the round.");
        return;
      }
      
      // If moving to a new round, calculate the winners from the previous round's votes
      if (selectedRound > this.currentRound) {
        // Check if there are any ties in the current round
        const hasTies = await this.checkForTies();
        
        if (hasTies) {
          app.showMessage("There are ties in the current round. All ties must be resolved before moving to the next round.");
          app.hideLoading();
          return;
        }
        
        // Calculate the winners from the previous round's votes
        const winners = await this.calculateRoundWinners(this.currentRound);
        
        if (!winners || winners.length === 0) {
          app.showMessage("No votes have been submitted for the current round yet.");
          app.hideLoading();
          return;
        }
        
        // Store the winners in the bracket structure
        this.bracketWinners[this.currentRound] = winners;
        console.log(`Winners for round ${this.currentRound}:`, winners);
      }
      
      // Update the current round
      this.currentRound = selectedRound;
      
      // Reset the current matchup index for the new round
      this.currentMatchupIndex = 0;
      
      // Save the current round to Firebase
      await this.saveCurrentRound();
      
      // Display the first matchup of the new round
      await this.displayCurrentMatchup();
      
      // Update the bracket visualization
      this.updateBracketVisualization();
      
      app.showMessage(`Round updated to ${selectedRound}`);
    } catch (error) {
      console.error("Error updating bracket round:", error);
      app.showMessage(`Error: ${error.message}`);
    } finally {
      app.hideLoading();
    }
  }
  
  // Calculate the winners from a round's votes
  async calculateRoundWinners(round) {
    try {
      // Get all votes for the current playlist
      const votes = await FirebaseService.getPlaylistVotes(this.currentPlaylist.id);
      
      // Filter votes for the specified round
      const roundVotes = votes.filter(vote => 
        vote.voteType === 'bracket' && 
        vote.round === round
      );
      
      if (roundVotes.length === 0) {
        console.log(`No votes found for round ${round}`);
        return [];
      }
      
      // Group votes by matchup
      const matchupVotes = {};
      roundVotes.forEach(vote => {
        if (!vote.votes) return;
        
        Object.entries(vote.votes).forEach(([matchNumber, songData]) => {
          const matchKey = matchNumber;
          
          if (!matchupVotes[matchKey]) {
            matchupVotes[matchKey] = {
              songVotes: {}
            };
          }
          
          const songId = songData.songId;
          if (!matchupVotes[matchKey].songVotes[songId]) {
            matchupVotes[matchKey].songVotes[songId] = 0;
          }
          
          matchupVotes[matchKey].songVotes[songId]++;
        });
      });
      
      // Determine the winner for each matchup
      const winners = [];
      Object.entries(matchupVotes).forEach(([matchKey, data]) => {
        const songVotes = data.songVotes;
        const songIds = Object.keys(songVotes);
        
        if (songIds.length > 0) {
          // Sort songs by vote count
          songIds.sort((a, b) => songVotes[b] - songVotes[a]);
          
          // Get the winning song
          const winningSongId = songIds[0];
          
          // Find the song in the items array
          const winningSong = this.items.find(song => song.id === winningSongId);
          
          if (winningSong) {
            winners.push({
              matchNumber: parseInt(matchKey),
              songId: winningSongId,
              songTitle: winningSong.title
            });
          }
        }
      });
      
      // Sort winners by match number
      winners.sort((a, b) => a.matchNumber - b.matchNumber);
      
      return winners;
    } catch (error) {
      console.error(`Error calculating winners for round ${round}:`, error);
      return [];
    }
  }
  
  // Save the current round to Firebase
  async saveCurrentRound() {
    if (!this.currentPlaylist || !this.currentPlaylist.id) return;
    
    try {
      // Update the playlist document with the current round
      await FirebaseService.updatePlaylistBracketRound(
        this.currentPlaylist.id,
        this.currentRound,
        this.roundDeadline ? this.roundDeadline.toISOString() : null
      );
      
      console.log(`Current round ${this.currentRound} saved to Firebase`);
    } catch (error) {
      console.error('Error saving current round:', error);
    }
  }
  
  // Load the current round from Firebase
  async loadCurrentRound() {
    if (!this.currentPlaylist || !this.currentPlaylist.id) return;
    
    try {
      // Get the playlist from Firebase
      const playlist = await FirebaseService.getPlaylist(this.currentPlaylist.id);
      
      if (playlist && playlist.bracketCurrentRound) {
        // Update the current round
        this.currentRound = playlist.bracketCurrentRound;
        console.log(`Loaded current round ${this.currentRound} from Firebase`);
        
        // Update the round deadline if available
        if (playlist.bracketRoundDeadline) {
          this.roundDeadline = new Date(playlist.bracketRoundDeadline);
        }
      }
    } catch (error) {
      console.error('Error loading current round:', error);
    }
  }
  
  // Calculate the total number of rounds based on the number of items
  calculateTotalRounds(itemsLength) {
    if (!itemsLength || itemsLength <= 0) {
      return 0;
    }
    // Calculate the total number of rounds using the formula: log2(n)
    const totalRounds = Math.log2(itemsLength);
    return Math.ceil(totalRounds);
  }
  
  // Check if there's a tie in the current round
  async checkForTies() {
    if (!this.currentPlaylist || !this.currentPlaylist.id) return false;
    
    try {
      // Get all votes for the current playlist
      const votes = await FirebaseService.getPlaylistVotes(this.currentPlaylist.id);
      
      // Filter votes for the current round
      const roundVotes = votes.filter(vote => 
        vote.voteType === 'bracket' && 
        vote.round === this.currentRound
      );
      
      // Group votes by matchup
      const matchupVotes = {};
      roundVotes.forEach(vote => {
        const matchKey = `${vote.round}-${vote.matchNumber}`;
        if (!matchupVotes[matchKey]) {
          matchupVotes[matchKey] = {
            songVotes: {}
          };
        }
        
        const songId = vote.winner.id;
        if (!matchupVotes[matchKey].songVotes[songId]) {
          matchupVotes[matchKey].songVotes[songId] = 0;
        }
        
        matchupVotes[matchKey].songVotes[songId]++;
      });
      
      // Check for ties in each matchup
      let hasTies = false;
      Object.keys(matchupVotes).forEach(matchKey => {
        const songVotes = matchupVotes[matchKey].songVotes;
        const songIds = Object.keys(songVotes);
        
        // If there are at least two songs with votes
        if (songIds.length >= 2) {
          // Sort songs by vote count
          songIds.sort((a, b) => songVotes[b] - songVotes[a]);
          
          // Check if the top two songs have the same number of votes
          if (songVotes[songIds[0]] === songVotes[songIds[1]]) {
            hasTies = true;
            console.log(`Tie detected in matchup ${matchKey}: ${songIds[0]} and ${songIds[1]} both have ${songVotes[songIds[0]]} votes`);
          }
        }
      });
      
      return hasTies;
    } catch (error) {
      console.error('Error checking for ties:', error);
      return false;
    }
  }
  
  // Move to the next round if there are no ties
  async moveToNextRound() {
    // Check for ties before moving to the next round
    const hasTies = await this.checkForTies();
    
    if (hasTies) {
      // Show a message about the tie
      app.showMessage('There are ties in the current round. All ties must be resolved before moving to the next round.');
      return false;
    }
    
    // No ties, proceed to the next round
    this.currentRound++;
    
    // Save the current round to Firebase
    await this.saveCurrentRound();
    
    // Reset the current matchup index for the new round
    this.currentMatchupIndex = 0;
    
    // Display the first matchup of the new round
    await this.displayCurrentMatchup();
    
    return true;
  }
  
  // Check if the current matchup has already been voted on
  checkIfMatchupVoted(matchup) {
    if (!this.bracketVotes || !this.bracketVotes[this.currentRound]) return;
    
    const vote = this.bracketVotes[this.currentRound][matchup.matchNumber];
    if (!vote) return;
    
    // Highlight the selected song
    const songs = document.querySelectorAll('.bracket-song');
    songs.forEach(song => {
      song.classList.remove('selected');
      if (song.dataset.songId === vote.songId) {
        song.classList.add('selected');
      }
    });
    
    // Hide the Choose Left/Right buttons since we're using the cards directly
    // This ensures backward compatibility with any existing HTML that might have these buttons
    const leftBtn = document.getElementById('bracket-choice-left-btn');
    const rightBtn = document.getElementById('bracket-choice-right-btn');
    if (leftBtn) leftBtn.style.display = 'none';
    if (rightBtn) rightBtn.style.display = 'none';
  }
  
  // ... rest of the code remains the same ...
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
