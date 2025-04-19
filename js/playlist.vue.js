// Playlist component for Vue 3 using OOP principles
import { ref, computed, reactive, onMounted, watch, nextTick } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import { useFirebase } from './firebase.vue.js';

/**
 * Base Playlist class - defines common properties and methods for all playlist types
 */
class Playlist {
  constructor(data) {
    this.id = data.id;
    this.name = data.name || 'Untitled Playlist';
    this.items = data.items || [];
    this.createdBy = data.createdBy;
    this.createdAt = data.createdAt;
    this.voteCount = data.voteCount || 0;
    this.type = data.type || 'star';
    this.metadata = data.metadata || {};
    
    // Voting related properties
    this.votingEnabled = data.votingEnabled || false;
    this.votingDeadline = data.votingDeadline || null;
    this.votingStartDate = data.votingStartDate || null;
    this.votingResults = data.votingResults || null; // Store aggregated results
  }
  
  // Get the song count
  get songCount() {
    return this.items.length;
  }
  
  // Get the type label for display
  get typeLabel() {
    return this.type.charAt(0).toUpperCase() + this.type.slice(1);
  }
  
  // Check if voting is currently active
  get isVotingActive() {
    if (!this.votingEnabled) return false;
    
    // If there's a deadline, check if it has passed
    if (this.votingDeadline) {
      const now = new Date();
      const deadline = new Date(this.votingDeadline);
      return now <= deadline;
    }
    
    // If no deadline, voting is active if enabled
    return this.votingEnabled;
  }
  
  // Get voting method based on playlist type
  get votingMethod() {
    return 'none'; // Base class has no voting
  }
  
  // Base render method that defines the common playlist structure
  render() {
    return {
      // Common data
      id: this.id,
      name: this.name,
      type: this.type,
      items: this.items.map(item => ({
        id: item.id,
        title: item.title,
        artist: item.artist,
        thumbnail: item.coverImage || item.thumbnail, // Include song cover image as thumbnail
        votes: 0, // Initialize votes to 0
        rating: 0 // Initialize rating to 0
      })),
      // Metadata
      metadata: {
        votingEnabled: this.votingEnabled,
        votingDeadline: this.votingDeadline,
        votingMethod: this.votingMethod,
        createdBy: this.createdBy,
        createdAt: this.createdAt,
        isVotingActive: this.isVotingActive,
        totalVotes: 0 // Initialize total votes
      },
      // Subclass-specific data
      votingInterface: this.renderVotingInterface(),
      resultsView: this.renderResults()
    };
  }

  // Subclasses should override these methods
  renderVotingInterface() {
    return null;
  }

  renderResults() {
    return null;
  }

  // Card template for list view
  getCardTemplate() {
    return {
      header: this.name,
      description: `${this.songCount} songs`,
      typeLabel: this.typeLabel,
      voteCount: this.voteCount,
      votingActive: this.isVotingActive
    };
  }
}

/**
 * StarPlaylist - Star rating playlist type
 */
class StarPlaylist extends Playlist {
  constructor(data) {
    super(data);
    this.type = 'star';
  }
  
  // Star playlists use star rating voting 
  get votingMethod() {
    return 'star-rating';
  }
  
  // Get star rating results from Firestore
  async getVotingResults() {
    if (!this.id) return null;
    
    // Initialize results with all songs (0 votes by default)
    const results = {};
    
    // Initialize with all songs
    this.items.forEach(item => {
      results[item.id] = { 
        songId: item.id, 
        song: item, 
        totalStars: 0, 
        averageRating: 0, 
        voteCount: 0 
      };
    });
    
    try {
      const db = firebase.firestore();
      const votesSnapshot = await db.collection('playlists').doc(this.id).collection('votes').get();
      
      if (votesSnapshot.empty) {
        return { 
          status: 'no-votes',
          results: Object.values(results), // Return all songs with 0 votes
          voteCount: 0
        };
      }
      
      // Aggregate the star ratings
      const voteData = votesSnapshot.docs.map(doc => doc.data());
      
      // Aggregate star ratings
      voteData.forEach(vote => {
        if (vote.type !== 'star-rating' || !vote.ratings) return;
        
        Object.entries(vote.ratings).forEach(([songId, stars]) => {
          if (results[songId]) {
            results[songId].totalStars += stars;
            results[songId].voteCount += 1;
          }
        });
      });
      
      // Calculate averages
      Object.values(results).forEach(result => {
        result.averageRating = result.voteCount > 0 ? 
          result.totalStars / result.voteCount : 0;
      });
      
      // Sort by average rating
      const sortedResults = Object.values(results)
        .sort((a, b) => b.averageRating - a.averageRating);
      
      return {
        status: 'success',
        results: sortedResults,
        voteCount: voteData.length
      };
    } catch (error) {
      console.error('Error getting star voting results:', error);
      return { 
        status: 'error', 
        message: error.message,
        results: Object.values(results), // Return all songs with 0 votes on error
        voteCount: 0
      };
    }
  }
  
  getCardTemplate() {
    return {
      ...super.getCardTemplate(),
      icon: 'star',
      badgeColor: 'warning',
      votingMethod: this.votingMethod
    };
  }
}

/**
 * Ranked Playlist - playlists with ranked items
 */
class RankedPlaylist extends Playlist {
  constructor(data) {
    super(data);
    this.type = 'ranked';
    this.isRanked = true;
    this.rankingType = data.rankingType || 'ranked-choice';
    this.votingDeadline = data.votingDeadline || null;
    
    // For ranked playlists, voting is enabled by default
    this.votingEnabled = data.votingEnabled !== undefined ? data.votingEnabled : true;
  }
  
  // Ranked playlists use ranked choice voting
  get votingMethod() {
    return 'ranked-choice';
  }
  
  // Get voting results for this ranked playlist
  async getVotingResults() {
    if (!this.id) return null;
    
    // Initialize results with all songs (0 votes by default)
    const results = {};
      
    // Initialize with all songs
    this.items.forEach(item => {      
      results[item.id] = { 
        songId: item.id, 
        song: item, 
        firstPlaceVotes: 0,
        secondPlaceVotes: 0,
        thirdPlaceVotes: 0,
        points: 0 // Weighted scoring: 3pts for 1st, 2pts for 2nd, 1pt for 3rd
      };
    });
    
    try {
      const db = firebase.firestore();
      const votesSnapshot = await db.collection('playlists').doc(this.id).collection('votes').get();
      
      if (votesSnapshot.empty) {
        return { 
          status: 'no-votes',
          results: Object.values(results), // Return all songs with 0 votes
          voteCount: 0
        };
      }
      
      // Aggregate the ranked choice votes
      const voteData = votesSnapshot.docs.map(doc => doc.data());
      
      // Count the votes
      voteData.forEach(vote => {
        if (vote.type !== 'ranked-choice') return;
        
        // First place (3 points)
        if (vote.first && results[vote.first]) {
          results[vote.first].firstPlaceVotes += 1;
          results[vote.first].points += 3;
        }
        
        // Second place (2 points)
        if (vote.second && results[vote.second]) {
          results[vote.second].secondPlaceVotes += 1;
          results[vote.second].points += 2;
        }
        
        // Third place (1 point)
        if (vote.third && results[vote.third]) {
          results[vote.third].thirdPlaceVotes += 1;
          results[vote.third].points += 1;
        }
      });
      
      // Convert to array and sort by points
      const sortedResults = Object.values(results)
        .sort((a, b) => b.points - a.points);
      
      // For each result, calculate percentage of maximum possible points
      const maxPossiblePoints = voteData.length * 3; // 3 points per voter if all voted for this song as first place
      
      sortedResults.forEach(result => {
        result.percentage = maxPossiblePoints > 0 ? 
          Math.round((result.points / maxPossiblePoints) * 100) : 0;
      });
      
      return {
        status: 'success',
        results: sortedResults,
        voteCount: voteData.length
      };
    } catch (error) {
      console.error('Error getting ranked voting results:', error);
      return { 
        status: 'error', 
        message: error.message,
        results: Object.values(results), // Return all songs with 0 votes on error
        voteCount: 0
      };
    }
  }
  
  // Format the deadline for display
  formatDeadline() {
    if (!this.votingDeadline) return '';
    
    const deadline = new Date(this.votingDeadline);
    return `Voting ends ${deadline.toLocaleDateString()}`;
  }
  
  // Override base render methods for ranked playlist specific UI
  renderVotingInterface() {
    if (!this.votingEnabled) return null;

    return {
      type: 'ranked-choice',
      instructions: 'Rank your top 3 favorite songs from this playlist.',
      deadline: this.votingDeadline ? this.formatDeadline() : null,
      maxRanks: 3
    };
  }

  renderResults() {
    if (!this.votingResults?.results) return null;

    return {
      type: 'ranked-choice',
      results: this.votingResults.results.map(result => ({
        songId: result.songId,
        song: result.song,
        stats: {
          firstPlace: result.firstPlaceVotes,
          secondPlace: result.secondPlaceVotes,
          thirdPlace: result.thirdPlaceVotes,
          percentage: result.percentage
        }
      }))
    };
  }

  getCardTemplate() {
    return {
      ...super.getCardTemplate(),
      icon: 'trophy',
      badgeColor: 'success',
      description: `${this.songCount} ranked songs`,
      votingMethod: this.votingMethod,
      deadlineText: this.formatDeadline(),
      deadline: this.votingDeadline
    };
  }
}

/**
 * Collaborative Playlist - playlists that multiple users can edit
 */
class CollaborativePlaylist extends Playlist {
  constructor(data) {
    super(data);
    this.type = 'collaborative';
    this.collaborators = data.collaborators || [];
    
    // Tournament specific properties
    this.tournamentRounds = data.tournamentRounds || [];
    this.currentRound = data.currentRound || 0;
  }
  
  get collaboratorCount() {
    return this.collaborators.length;
  }
  
  // Collaborative playlists can use tournament bracket voting
  get votingMethod() {
    return 'tournament';
  }
  
  // Initialize a tournament bracket
  initializeTournament() {
    if (!this.items || this.items.length < 2) {
      throw new Error('Need at least 2 songs to create a tournament');
    }
    
    // Determine the bracket size (next power of 2)
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(this.items.length)));
    
    // Shuffle the songs
    const shuffledItems = [...this.items].sort(() => Math.random() - 0.5);
    
    // Create the initial matchups
    const matchups = [];
    for (let i = 0; i < bracketSize; i += 2) {
      // If we don't have enough songs, give byes
      const songA = i < shuffledItems.length ? shuffledItems[i] : null;
      const songB = i + 1 < shuffledItems.length ? shuffledItems[i + 1] : null;
      
      // If one song is null, the other automatically advances
      const winner = !songA ? songB : (!songB ? songA : null);
      
      matchups.push({
        matchId: `r1-m${(i/2)+1}`,
        songA,
        songB,
        winner,
        votes: { // Track votes for each song
          [songA?.id]: 0,
          [songB?.id]: 0
        }
      });
    }
    
    // Set up the tournament with one round
    this.tournamentRounds = [{
      round: 1,
      matchups,
      deadline: this.votingDeadline || null,
      completed: false
    }];
    
    this.currentRound = 1;
    this.votingEnabled = true;
    this.votingStartDate = new Date();
    
    return this;
  }
  
  // Advance to the next tournament round
  advanceToNextRound(newDeadline = null) {
    // Make sure we have a current round
    const currentRound = this.tournamentRounds.find(r => r.round === this.currentRound);
    if (!currentRound) {
      throw new Error('Current round not found');
    }
    
    // Make sure all matchups have winners
    const allMatchupsComplete = currentRound.matchups.every(m => m.winner);
    if (!allMatchupsComplete) {
      throw new Error('Cannot advance to next round until all current matchups have winners');
    }
    
    // Mark current round as completed
    currentRound.completed = true;
    
    // Create next round matchups based on winners from current round
    const nextRoundNumber = this.currentRound + 1;
    const winners = currentRound.matchups.map(m => m.winner);
    
    // If we have only one winner, the tournament is complete
    if (winners.length === 1) {
      this.votingEnabled = false;
      return this;
    }
    
    // Create matchups for next round
    const matchups = [];
    for (let i = 0; i < winners.length; i += 2) {
      const songA = winners[i];
      const songB = i + 1 < winners.length ? winners[i + 1] : null;
      
      // If one song is null, the other automatically advances
      const winner = !songA ? songB : (!songB ? songA : null);
      
      matchups.push({
        matchId: `r${nextRoundNumber}-m${(i/2)+1}`,
        songA,
        songB,
        winner,
        votes: {
          [songA?.id]: 0,
          [songB?.id]: 0
        }
      });
    }
    
    // Add the new round to tournament rounds
    this.tournamentRounds.push({
      round: nextRoundNumber,
      matchups,
      deadline: newDeadline,
      completed: false
    });
    
    // Update current round and voting status
    this.currentRound = nextRoundNumber;
    this.votingEnabled = true;
    this.votingStartDate = new Date();
    this.votingDeadline = newDeadline;
    
    return this;
  }
  
  // Get the current tournament status
  getCurrentTournamentStatus() {
    // Always include songs with default zero votes
    const allSongs = this.items.map(item => ({
      id: item.id,
      song: item,
      votes: 0,
      wins: 0,
      losses: 0
    }));
    
    // Find the current round
    const currentRound = this.tournamentRounds.find(r => r.round === this.currentRound);
    
    if (!currentRound) {
      return {
        status: 'not-started',
        message: 'Tournament has not been initialized',
        songs: allSongs, // Include all songs even when tournament hasn't started
        voteCount: 0
      };
    }
    
    const roundsRemaining = Math.ceil(Math.log2(this.items.length)) - this.currentRound;
    
    return {
      status: 'active',
      currentRound: this.currentRound,
      matchups: currentRound.matchups,
      deadline: currentRound.deadline,
      isComplete: roundsRemaining <= 0,
      roundsRemaining,
      roundsCompleted: this.currentRound - 1,
      songs: allSongs // Always include songs
    };
  }
  
  // Record votes for the current round
  async recordVotes(matchId, songId, userId) {
    if (!this.id || !matchId || !songId || !userId) {
      throw new Error('Missing required parameters');
    }
    
    try {
      const db = firebase.firestore();
      
      // Create a vote entry
      await db.collection('playlists').doc(this.id)
        .collection('votes').doc(userId).set({
          type: 'tournament',
          matchId,
          songId,
          round: this.currentRound,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      
      return true;
    } catch (error) {
      console.error('Error recording tournament vote:', error);
      throw error;
    }
  }
  
  getCardTemplate() {
    const tournamentStatus = this.getCurrentTournamentStatus();
    let tournamentText = '';
    
    if (tournamentStatus.status === 'active') {
      if (tournamentStatus.isComplete) {
        tournamentText = 'Tournament complete';
      } else {
        tournamentText = `Round ${this.currentRound} • ${tournamentStatus.roundsRemaining} rounds remaining`;
      }
    }
    
    return {
      ...super.getCardTemplate(),
      icon: 'people',
      badgeColor: 'info',
      description: `${this.songCount} songs • ${this.collaboratorCount} collaborators`,
      showCollaborators: true,
      votingMethod: this.votingMethod,
      tournamentActive: tournamentStatus.status === 'active',
      tournamentText,
      currentRound: this.currentRound
    };
  }
}

/**
 * Factory function to create the appropriate playlist instance based on type
 */
function createPlaylist(data) {
  switch(data.type) {
    case 'star':
      return new StarPlaylist(data);
    case 'collaborative':
      return new CollaborativePlaylist(data);
    default:
      // Ranked is now the default type
      return new RankedPlaylist(data);
  }
}

/**
 * Factory function to create a new playlist based on form data
 */
function createPlaylistObject(formData, userId) {
  // Default type is now ranked
  let type = 'ranked';
  
  // Determine playlist type based on properties
  if (formData.votingMethod === 'star-rating') {
    type = 'star';
  } else if (formData.collaborators && formData.collaborators.length > 0) {
    type = 'collaborative';
  }
  
  // Base data for all playlist types
  const baseData = {
    // Don't include id in the document data - Firestore will assign this
    // We'll add it to our local objects after retrieving from Firestore
    name: formData.name || 'Untitled Playlist',
    items: formData.items || [],
    createdBy: userId,
    createdAt: formData.createdAt || firebase.firestore.FieldValue.serverTimestamp(),
    voteCount: formData.voteCount || 0,
    type: type,
    originalSunoPlaylistId: formData.originalSunoPlaylistId || null,
    metadata: {}
  };
  
  // For updating existing documents, include the ID in the local object
  // but not in what gets saved to Firestore
  if (formData.id) {
    baseData._id = formData.id; // Use a different property name to avoid saving to Firestore
  }
  
  // Add type-specific properties
  if (type === 'ranked') {
    baseData.metadata.rankingType = formData.rankingType || 'ranked-choice';
    baseData.metadata.votingDeadline = formData.votingDeadline || null;
  } else if (type === 'collaborative') {
    baseData.collaborators = formData.collaborators || [];
  }
  
  return baseData;
}

// Main Vue composable for playlists
export const usePlaylist = () => {
  const { currentUser, isLoggedIn } = useFirebase();
  
  // State - ensure all reactive properties are initialized
  const playlists = ref([]);
  const isLoading = ref(false);
  const errorMessage = ref('');
  const noPlaylistsFound = ref(false);
  
  // Create playlist form state
  const formData = reactive({
    name: '',
    items: [],
    playlistUrl: '',
    sunoSongs: [],
    rankingType: 'ranked-choice',
    votingDeadline: '',
    originalSunoPlaylistId: null,
    isEditMode: false,
    editPlaylistId: null
  });
  
  // Current playlist being viewed or edited
  const currentPlaylist = ref(null);
  
  // Ranking and voting data
  const playlistRanking = ref(null);
  const tournamentStatus = ref(null);
  
  // Log initial state
  console.log('Playlist component initialized with empty playlists array:', playlists.value);
  
  // Load user playlists
  const loadUserPlaylists = async () => {
    console.log('Loading playlists in Vue component');
    if (!isLoggedIn()) {
      console.log('User not logged in, cannot load playlists');
      return;
    }
    
    try {
      isLoading.value = true;
      errorMessage.value = '';
      
      // Make sure the UI updates to show loading state
      await nextTick();
      
      const userId = currentUser.value.uid;
      console.log('Loading playlists for user ID:', userId);
      
      // Use Firestore to get playlists
      const db = firebase.firestore();
      const querySnapshot = await db.collection('playlists')
        .where('createdBy', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();
      
      // Process the results and create appropriate playlist instances using factory
      const results = [];
      querySnapshot.forEach(doc => {
        // Get data with the correct ID handling
        const docData = doc.data();
        
        // Create a new object with the Firestore document ID as the primary ID
        const data = {
          id: doc.id, // Always use Firestore's document ID
          ...docData,
        };
        
        // Remove any duplicate ID fields to avoid confusion
        if (data.docId) {
          console.log(`Document already has docId field: ${data.docId}`);
        } else {
          // For documents without docId field, update Firestore (migration)
          try {
            doc.ref.update({ docId: doc.id });
            console.log(`Added docId field to document ${doc.id}`);
          } catch (err) {
            console.warn(`Could not update docId for document ${doc.id}:`, err);
          }
        }
        
        // Use factory to create appropriate playlist type
        const playlist = createPlaylist(data);
        
        // Debug logging
        console.log(`Loaded playlist: ID=${playlist.id}, Type=${playlist.type}, Name=${playlist.name}`);
        
        results.push(playlist);
      });
      
      console.log('Playlists loaded:', results.length);
      
      // Replace the playlists array with the new results
      playlists.value = [];
      await nextTick();
      playlists.value = results;
      noPlaylistsFound.value = results.length === 0;
      
      // Force UI update
      await nextTick();
      console.log('Vue component updated after playlist load');
      
      // Debug: Log loaded playlist types
      const typeCounts = results.reduce((counts, playlist) => {
        counts[playlist.type] = (counts[playlist.type] || 0) + 1;
        return counts;
      }, {});
      
      console.log('Playlist types loaded:', typeCounts);
      
      if (playlists.value.length > 0) {
        console.log('First playlist details:', {
          name: playlists.value[0].name,
          type: playlists.value[0].type,
          template: playlists.value[0].getCardTemplate()
        });  
      }
      
    } catch (error) {
      console.error('Error loading playlists:', error);
      errorMessage.value = 'Error loading playlists. Please try again.';
    } finally {
      isLoading.value = false;
    }
  };
  
  // Get ranking/voting results for a playlist
  // Note: Using the playlistRanking and tournamentStatus refs defined above
  
  // Format a date for display
  const formatDeadline = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (err) {
      console.error('Error formatting date:', err);
      return dateString; // Fallback to the original string
    }
  };
  
  // Check if the current user can edit a playlist
  const canEditPlaylist = (playlist) => {
    if (!playlist || !isLoggedIn()) return false;
    
    // Users can only edit their own playlists
    return playlist.createdBy === currentUser.value?.uid;
  };
  
  // Edit a playlist (redirect to create form with playlist data) - removed duplicate
  
  // Start voting on a playlist
  const voteOnPlaylist = (playlistId) => {
    if (!playlistId) {
      console.error('Cannot vote: Invalid playlist ID');
      return;
    }
    
    // Navigate to voting interface with playlist ID
    window.location.hash = `voting?id=${playlistId}`;
  };
  
  // View a playlist and load its ranking data for the tabbed interface
  const viewPlaylist = async (playlistId) => {
    console.log('CALLED: viewPlaylist with ID:', playlistId);
    if (!playlistId) {
      console.error('Invalid playlist ID');
      return;
    }

    console.log('Viewing playlist:', playlistId);
    try {
      isLoading.value = true;
      errorMessage.value = '';
      
      // Reset previous ranking data
      playlistRanking.value = null;
      tournamentStatus.value = null;
      
      // Load the playlist from Firestore
      const db = firebase.firestore();
      const playlistDoc = await db.collection('playlists').doc(playlistId).get();
      
      if (!playlistDoc.exists) {
        throw new Error('Playlist not found');
      }
      
      // Get data and create appropriate playlist instance
      const data = {
        id: playlistDoc.id,
        ...playlistDoc.data()
      };
      
      // Use factory to create the right playlist type
      const playlist = createPlaylist(data);
      console.log('Viewing playlist:', playlist.name, 'Type:', playlist.type);
      
      // Load voting results first
      const votingResults = await playlist.getVotingResults();
      if (votingResults) {
        playlist.votingResults = votingResults;
      }

      // Set current playlist and render it
      currentPlaylist.value = playlist;
      
      // Get the rendered view data using polymorphic render method
      const renderedView = playlist.render();
      
      // Update reactive state based on the rendered view
      playlistRanking.value = renderedView.resultsView;
      
      // For tournament playlists, also update tournament status
      if (playlist.type === 'collaborative' && playlist.votingMethod === 'tournament') {
        tournamentStatus.value = await playlist.getCurrentTournamentStatus();
      }
      
      // Update the URL if it doesn't already match
      if (!window.location.hash.includes(`playlist?id=${playlistId}`)) {
        window.location.hash = `playlist?id=${playlistId}`;
      }
      
    } catch (error) {
      console.error('Error viewing playlist:', error);
      errorMessage.value = 'Error viewing playlist. Please try again.';
      if (window.app && typeof window.app.showMessage === 'function') {
        window.app.showMessage(`Error: ${error.message}`);
      }
    } finally {
      isLoading.value = false;
    }
  };
  
  // Share a playlist
  const sharePlaylist = (playlistId) => {
    console.log('Sharing playlist in Vue component:', playlistId);
    
    // Create a shareable link
    const shareLink = `${window.location.origin}${window.location.pathname}#playlist?id=${playlistId}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareLink)
      .then(() => {
        // Use a more elegant notification in the future
        alert('Share link copied to clipboard!');
      })
      .catch(err => {
        console.error('Error copying share link:', err);
        alert('Error creating share link. Please try again.');
      });
  };
  
  // Delete a playlist 
  const confirmDeletePlaylist = (playlist) => {
    console.log('CALLED: confirmDeletePlaylist with playlist:', playlist);
    // Validate playlist object
    if (!playlist) {
      console.error('Cannot delete playlist: Invalid playlist object', playlist);
      errorMessage.value = 'Cannot delete: Invalid playlist';
      return;
    }
    
    // Check for valid ID - this is the Firestore document ID
    if (!playlist.id) {
      console.error('Cannot delete playlist: Missing document ID', playlist);
      errorMessage.value = 'Cannot delete: Missing document ID';
      return;
    }
    
    console.log('Confirming delete of playlist in Vue component:', playlist.id);
    
    // Get playlist name with fallback
    const playlistName = playlist.name || 'Untitled Playlist';
    
    // Simple confirmation dialog - this would be better with a Shoelace dialog in the future
    if (confirm(`Are you sure you want to delete "${playlistName}"? This cannot be undone.`)) {
      deletePlaylist(playlist.id);
    }
  };
  
  // Delete a playlist from Firestore
  const deletePlaylist = async (playlistId) => {
    try {
      // Validate the playlist ID - must be a non-empty string
      if (!playlistId || typeof playlistId !== 'string' || playlistId.trim() === '') {
        console.error('Cannot delete playlist: Invalid or empty playlist ID');
        errorMessage.value = 'Cannot delete playlist: Invalid ID';
        return;
      }
      
      isLoading.value = true;
      console.log(`Attempting to delete playlist with ID: ${playlistId}`);
      
      // Delete from Firestore
      const db = firebase.firestore();
      
      // First check if the document exists
      const docRef = db.collection('playlists').doc(playlistId);
      const docSnap = await docRef.get();
      
      if (!docSnap.exists) {
        console.error(`Cannot delete playlist: Document with ID ${playlistId} does not exist`);
        errorMessage.value = 'Cannot delete playlist: Document not found';
        return;
      }
      
      console.log(`Document exists, continuing with deletion: ${playlistId}`);
      
      // First delete all votes for this playlist if they exist
      const votesRef = docRef.collection('votes');
      const votesSnapshot = await votesRef.get();
      
      // Use a batch to delete votes if there are any
      if (!votesSnapshot.empty) {
        const batch = db.batch();
        votesSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`Deleted ${votesSnapshot.size} votes for playlist`);
      } else {
        console.log('No votes to delete for this playlist');
      }
      
      // Then delete the playlist document
      await docRef.delete();
      console.log(`Deleted playlist document: ${playlistId}`);
      
      // Remove from local array
      const initialCount = playlists.value.length;
      playlists.value = playlists.value.filter(p => p.id !== playlistId);
      const finalCount = playlists.value.length;
      
      console.log(`Removed from local array: ${initialCount - finalCount} items removed`);
      noPlaylistsFound.value = playlists.value.length === 0;
      
      // Show success message
      if (window.app && typeof window.app.showMessage === 'function') {
        window.app.showMessage('Playlist deleted successfully');
      }
      
      console.log('Playlist deleted successfully');
    } catch (error) {
      console.error('Error deleting playlist:', error);
      errorMessage.value = `Error deleting playlist: ${error.message}`;
      
      // Show error message in app UI
      if (window.app && typeof window.app.showMessage === 'function') {
        window.app.showMessage(`Error: ${error.message}`);
      }
    } finally {
      isLoading.value = false;
    }
  };
  
  // Watch for changes in currentUser to reload playlists
  watch(currentUser, (newUser, oldUser) => {
    console.log('User changed in playlist component:', newUser?.uid);
    if (newUser && (!oldUser || newUser.uid !== oldUser.uid)) {
      console.log('User changed, reloading playlists');
      loadUserPlaylists();
    }
  }, { immediate: true }); // immediate: true ensures it runs on component mount
  
  // Initialize on mount if user is already logged in
  onMounted(() => {
    console.log('Playlist component mounted, checking auth state');
    if (isLoggedIn()) {
      console.log('User is logged in, loading playlists in onMounted');
      // Use timeout to ensure the component is fully mounted
      setTimeout(() => loadUserPlaylists(), 500);
    } else {
      console.log('User not logged in at component mount time');
    }
    
    // Make this accessible for debugging
    window.debugPlaylistComponent = {
      loadPlaylists: loadUserPlaylists,
      getPlaylists: () => playlists.value,
      isLoading: () => isLoading.value,
      playlists
    };
  });
  
  // Voting function for ranked playlists - using the same navigation as voteOnPlaylist
  const votePlaylist = (playlistId) => {
    console.log('Voting on playlist:', playlistId);
    // Navigate to the voting section - use the same hash as voteOnPlaylist
    window.location.hash = `voting?id=${playlistId}`;
  };
  
  // Reset create playlist form
  const resetCreateForm = () => {
    console.log('Resetting create playlist form');
    formData.name = '';
    formData.items = [];
    formData.playlistUrl = '';
    formData.sunoSongs = [];
    formData.rankingType = 'ranked-choice';
    formData.votingDeadline = '';
    formData.originalSunoPlaylistId = null;
    formData.isEditMode = false;
    formData.editPlaylistId = null;
  };
  
  // Extract playlist ID from URL
  const extractPlaylistId = (url) => {
    if (!url) return null;
    
    try {
      // Handle Suno playlist URL formats
      const urlObj = new URL(url);
      
      // Format: https://suno.com/playlist/{playlistId}
      if (urlObj.pathname.includes('/playlist/')) {
        return urlObj.pathname.split('/playlist/')[1].split('/')[0];
      }
      
      // Format: https://suno.com/user/{username}/playlist/{playlistId}
      if (urlObj.pathname.includes('/user/') && urlObj.pathname.includes('/playlist/')) {
        return urlObj.pathname.split('/playlist/')[1].split('/')[0];
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting playlist ID:', error);
      return null;
    }
  };
  
  // Fetch Suno playlist from URL
  const fetchSunoPlaylist = async () => {
    const playlistUrl = formData.playlistUrl.trim();
    if (!playlistUrl) {
      errorMessage.value = 'Please enter a Suno playlist URL';
      return;
    }
    
    const playlistId = extractPlaylistId(playlistUrl);
    if (!playlistId) {
      errorMessage.value = 'Invalid Suno playlist URL. Please check the URL and try again.';
      return;
    }
    
    try {
      isLoading.value = true;
      errorMessage.value = '';
      
      console.log('Fetching Suno playlist:', playlistId);
      
      // Construct the Suno API URL - same as in original implementation
      const apiUrl = `https://studio-api.prod.suno.com/api/playlist/${playlistId}`;
      
      // Fetch the playlist data
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch playlist: ${response.status} ${response.statusText}`);
      }
      
      // Parse the response data
      const playlistData = await response.json();
      
      if (!playlistData || !playlistData.playlist_clips || playlistData.playlist_clips.length === 0) {
        throw new Error('No songs found in this playlist.');
      }
      
      // Store the fetched songs
      const sunoSongs = playlistData.playlist_clips.map(item => item.clip);
      
      // Get the playlist name from API
      const playlistOriginalName = playlistData.name || 'Suno Playlist';
      
      // Update form data
      formData.name = playlistOriginalName;
      formData.originalSunoPlaylistId = playlistId;
      formData.sunoSongs = sunoSongs;
      
      // Convert Suno songs to our format - same structure as the original implementation
      formData.items = sunoSongs.map(song => ({
        id: song.id,
        title: song.title,
        author: song.display_name,
        authorHandle: song.handle,
        authorAvatar: song.avatar_image_url,
        coverImage: song.image_url,
        audioUrl: song.audio_url,
        sunoUrl: `https://suno.com/song/${song.id}`
      }));
      
      console.log('Processed items:', formData.items);
    } catch (error) {
      console.error('Error fetching Suno playlist:', error);
      errorMessage.value = error.message || 'Error fetching playlist. Please try again.';
    } finally {
      isLoading.value = false;
    }
  };
  
  // Save playlist to Firestore
  const savePlaylist = async () => {
    if (!isLoggedIn()) {
      errorMessage.value = 'You need to be logged in to create a playlist.';
      return;
    }
    
    if (formData.items.length < 2) {
      errorMessage.value = 'Please fetch a Suno playlist with at least 2 songs.';
      return;
    }
    
    try {
      isLoading.value = true;
      errorMessage.value = '';
      
      const userId = currentUser.value.uid;
      
      // Extract voting deadline if provided
      const votingDeadline = formData.votingDeadline
        ? new Date(formData.votingDeadline).toISOString()
        : null;
      
      // Create playlist data using our factory function
      const formDataForObject = {
        name: formData.name,
        items: formData.items,
        rankingType: formData.rankingType,
        votingDeadline: votingDeadline,
        originalSunoPlaylistId: formData.originalSunoPlaylistId,
        isEditMode: formData.isEditMode
      };
      
      // Only include the ID when updating, not when creating
      if (formData.isEditMode && formData.editPlaylistId) {
        formDataForObject.id = formData.editPlaylistId;
      }
      
      const playlistData = createPlaylistObject(formDataForObject, userId);
      
      console.log('Saving playlist:', playlistData);
      
      let success = false;
      let playlistId;
      
      // Update or create based on mode - same as original implementation but adapted for Vue
      if (formData.isEditMode && formData.editPlaylistId) {
        // Update existing playlist through Firestore
        console.log('Updating existing playlist:', formData.editPlaylistId);
        const db = firebase.firestore();
        await db.collection('playlists').doc(formData.editPlaylistId).update(playlistData);
        success = true;
        playlistId = formData.editPlaylistId;
      } else {
        // Create new playlist through Firestore
        console.log('Creating new playlist');
        const db = firebase.firestore();
        
        // Make sure we're not including an ID field in the document
        const firestoreData = {...playlistData};
        delete firestoreData.id; // Remove any id field to let Firestore auto-generate it
        delete firestoreData._id; // Remove our internal tracking id
        
        firestoreData.voteCount = 0; // Only set for new playlists
        firestoreData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        
        // Add the document to Firestore (this generates an ID)
        const docRef = await db.collection('playlists').add(firestoreData);
        playlistId = docRef.id;
        
        // Add the generated ID to the document explicitly to avoid this issue in the future
        await docRef.update({ 
          docId: playlistId // Store the document ID as a separate field
        });
        
        success = !!playlistId;
      }
      
      if (success) {
        console.log(`Playlist ${formData.isEditMode ? 'updated' : 'created'} successfully:`, playlistId);
        
        // Show success message (using modal message from app)
        // This matches the original implementation in PlaylistManager.savePlaylist()
        if (window.app && typeof window.app.showMessage === 'function') {
          window.app.showMessage(formData.isEditMode ? 'Playlist updated successfully!' : 'Playlist created successfully!');
        } else {
          // Fallback if app.showMessage is not available
          alert(formData.isEditMode ? 'Playlist updated successfully!' : 'Playlist created successfully!');
        }
        
        // Clear form
        resetCreateForm();
        
        // Reload playlists to show the new one
        await loadUserPlaylists();
        
        // Navigate back to dashboard - matches original implementation
        window.location.hash = 'dashboard';
      } else {
        throw new Error(`Failed to ${formData.isEditMode ? 'update' : 'create'} playlist`);
      }
    } catch (error) {
      console.error(`Error ${formData.isEditMode ? 'updating' : 'creating'} playlist:`, error);
      
      // Show error message (using modal message from app)
      const errorMsg = error.message || `Error ${formData.isEditMode ? 'updating' : 'creating'} playlist. Please try again.`;
      errorMessage.value = errorMsg;
      
      if (window.app && typeof window.app.showMessage === 'function') {
        window.app.showMessage(`Error: ${errorMsg}`);
      }
    } finally {
      // Hide loading state (matches original implementation)
      isLoading.value = false;
      if (window.app && typeof window.app.hideLoading === 'function') {
        window.app.hideLoading();
      }
    }
  };
  
  // Start editing an existing playlist
  const editPlaylist = async (playlistId) => {
    try {
      isLoading.value = true;
      
      // Fetch the playlist
      const db = firebase.firestore();
      const playlistDoc = await db.collection('playlists').doc(playlistId).get();
      
      if (!playlistDoc.exists) {
        throw new Error('Playlist not found');
      }
      
      const data = playlistDoc.data();
      
      // Set form data for editing
      formData.name = data.name;
      formData.items = data.items || [];
      formData.originalSunoPlaylistId = data.originalSunoPlaylistId;
      formData.isEditMode = true;
      formData.editPlaylistId = playlistId;
      formData.rankingType = data.metadata?.rankingType || 'ranked-choice';
      formData.votingDeadline = data.metadata?.votingDeadline || '';
      
      // Navigate to create section (in edit mode)
      // Use window.vueApp which is set in app.vue.js
      if (window.vueApp) {
        // For Vue 3, need to access the mounted component instance
        const appInstance = window.vueApp._instance.proxy;
        if (typeof appInstance.goTo === 'function') {
          appInstance.goTo('create-playlist-section');
          return;
        }
      }
      
      // Fallback to simple hash navigation
      window.location.hash = 'create';
    } catch (error) {
      console.error('Error starting playlist edit:', error);
      errorMessage.value = error.message || 'Error loading playlist for editing. Please try again.';
    } finally {
      isLoading.value = false;
    }
  };
  
  return {
    // State
    playlists,
    isLoading,
    errorMessage,
    noPlaylistsFound,
    currentPlaylist,
    formData,
    playlistRanking,
    tournamentStatus,
    
    // Playlist list actions
    loadUserPlaylists,
    viewPlaylist,
    sharePlaylist,
    confirmDeletePlaylist,
    votePlaylist,
    voteOnPlaylist,
    canEditPlaylist,
    formatDeadline,
    
    // Create/edit actions
    resetCreateForm,
    fetchSunoPlaylist,
    savePlaylist,
    editPlaylist,
    extractPlaylistId
  };
};
