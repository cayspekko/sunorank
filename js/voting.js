// Voting functionality
class VotingManager {
  constructor() {
    // DOM Elements
    this.votingItems = document.getElementById('voting-items');
    this.firstChoiceSlot = document.getElementById('first-choice');
    this.secondChoiceSlot = document.getElementById('second-choice');
    this.thirdChoiceSlot = document.getElementById('third-choice');
    this.submitVoteBtn = document.getElementById('submit-vote-btn');
    
    // Vote Results
    this.voteResults = document.getElementById('vote-results');
    this.backToPlaylistBtn = document.getElementById('back-to-playlist-btn');
    
    // State
    this.selectedItems = {
      first: null,
      second: null,
      third: null
    };
    this.currentPlaylist = null;
    
    // Initialize
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    this.submitVoteBtn.addEventListener('click', () => this.submitVote());
    this.backToPlaylistBtn.addEventListener('click', () => {
      app.navigateTo('playlist-detail-section');
      playlistManager.loadAndDisplayRanking();
    });
  }
  
  setupVotingItems(playlist) {
    if (!playlist || !playlist.items) return;
    
    this.currentPlaylist = playlist;
    this.votingItems.innerHTML = '';
    this.resetSelection();
    
    // Create voting items
    playlist.items.forEach((item, index) => {
      const itemElement = document.createElement('div');
      itemElement.className = 'voting-item';
      
      // Check if it's an object with song data (from Suno) or just a string
      if (item && typeof item === 'object') {
        itemElement.innerHTML = `
          <div class="song-thumbnail">
            <img src="${item.coverImage || 'assets/default-cover.png'}" alt="${item.title} cover">
          </div>
          <div class="song-info">
            <h3>${item.title}</h3>
            <div class="song-author">
              <img src="${item.authorAvatar || 'assets/default-avatar.png'}" alt="${item.author}" class="author-avatar">
              <span>${item.author}</span>
            </div>
          </div>
        `;
        itemElement.setAttribute('data-item-id', item.id);
      } else {
        // Fallback for simple text items
        itemElement.innerHTML = `<h3>${item}</h3>`;
        itemElement.setAttribute('data-item', item);
      }
      
      // Add event listener
      itemElement.addEventListener('click', () => this.handleItemSelection(itemElement, item));
      
      this.votingItems.appendChild(itemElement);
    });
  }
  
  handleItemSelection(element, item) {
    // Get the item identifier (either id for objects or the item itself for strings)
    const itemId = typeof item === 'object' ? item.id : item;
    
    // Check if item is already selected
    if (this.selectedItems.first === item) {
      // Deselect
      this.selectedItems.first = null;
      element.classList.remove('selected');
      this.updateChoiceSlot('first', null);
      return;
    }
    
    if (this.selectedItems.second === item) {
      // Deselect
      this.selectedItems.second = null;
      element.classList.remove('selected');
      this.updateChoiceSlot('second', null);
      return;
    }
    
    if (this.selectedItems.third === item) {
      // Deselect
      this.selectedItems.third = null;
      element.classList.remove('selected');
      this.updateChoiceSlot('third', null);
      return;
    }
    
    // Determine which slot to fill
    let slot = null;
    if (this.selectedItems.first === null) {
      slot = 'first';
    } else if (this.selectedItems.second === null) {
      slot = 'second';
    } else if (this.selectedItems.third === null) {
      slot = 'third';
    } else {
      // All slots filled, show message
      app.showMessage('You have already selected 3 items. Deselect one to change your choices.');
      return;
    }
    
    // Update selection
    this.selectedItems[slot] = item;
    element.classList.add('selected');
    this.updateChoiceSlot(slot, item);
  }
  
  updateChoiceSlot(slot, item) {
    // Get the corresponding DOM element
    const slotElement = slot === 'first' ? this.firstChoiceSlot : 
                      slot === 'second' ? this.secondChoiceSlot : this.thirdChoiceSlot;
    
    const selectionElement = slotElement.querySelector('.selection');
    
    if (item === null) {
      // Clear the slot
      selectionElement.innerHTML = '';
      slotElement.classList.remove('filled');
    } else {
      // Fill the slot
      slotElement.classList.add('filled');
      
      // Check if it's an object with song data (from Suno) or just a string
      if (item && typeof item === 'object') {
        selectionElement.innerHTML = `
          <div class="song-thumbnail">
            <img src="${item.coverImage || 'assets/default-cover.png'}" alt="${item.title} cover">
          </div>
          <div class="song-info">
            <h3>${item.title}</h3>
            <div class="song-author">
              <span>${item.author}</span>
            </div>
          </div>
        `;
      } else {
        // Fallback for simple text items
        selectionElement.innerHTML = `<h3>${item}</h3>`;
      }
    }
  }
  
  resetSelection() {
    this.selectedItems = {
      first: null,
      second: null,
      third: null
    };
    
    // Clear all choice slots
    this.updateChoiceSlot('first', null);
    this.updateChoiceSlot('second', null);
    this.updateChoiceSlot('third', null);
    
    // Remove selected class from all items
    const items = this.votingItems.querySelectorAll('.voting-item');
    items.forEach(item => {
      item.classList.remove('selected');
    });
  }
  
  validateVote() {
    if (!this.selectedItems.first) {
      app.showMessage('Please select your first choice');
      return false;
    }
    
    return true;
  }
  
  async submitVote() {
    if (!this.validateVote()) {
      return;
    }
    
    if (!authService.isLoggedIn()) {
      app.showMessage('You need to be logged in to vote');
      return;
    }
    
    if (!this.currentPlaylist) {
      app.showMessage('No playlist selected');
      return;
    }
    
    try {
      app.showLoading('Submitting your vote...');
      
      const userId = authService.getCurrentUser().uid;
      const voteData = {
        playlistId: this.currentPlaylist.id,
        userId: userId,
        firstChoice: this.selectedItems.first,
        secondChoice: this.selectedItems.second,
        thirdChoice: this.selectedItems.third
      };
      
      const voteId = await FirebaseService.submitVote(voteData);
      
      if (voteId) {
        // Update the vote count in the playlist document
        await FirebaseService.updatePlaylistVoteCount(this.currentPlaylist.id);
        
        // Load updated votes and display results
        await this.showVoteResults();
      } else {
        app.showMessage('Error submitting vote. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting vote:', error);
      app.showMessage(`Error: ${error.message}`);
    } finally {
      app.hideLoading();
    }
  }
  
  async showVoteResults() {
    if (!this.currentPlaylist) return;
    
    try {
      // Get updated votes
      const votes = await FirebaseService.getPlaylistVotes(this.currentPlaylist.id);
      this.currentPlaylist.voteCount = votes.length;
      
      // Calculate rankings
      const rankings = FirebaseService.calculateRankings(this.currentPlaylist.items, votes);
      
      // Display rankings
      this.voteResults.innerHTML = '';
      
      rankings.forEach((ranking, index) => {
        const rankingElement = document.createElement('div');
        rankingElement.className = 'ranking-item';
        
        // Check if item is an object (Suno song) or just a string
        const item = ranking.itemObject;
        
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
        
        this.voteResults.appendChild(rankingElement);
      });
      
      // Navigate to vote success section
      app.navigateTo('vote-success-section');
    } catch (error) {
      console.error('Error showing vote results:', error);
      app.showMessage(`Error: ${error.message}`);
    }
  }
}
