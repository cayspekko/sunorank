// Firebase configuration
// Replace these values with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyAovksTTeyENNuw2H3MNS0G7wN-upiEUrM",
  authDomain: "sunorank.firebaseapp.com",
  projectId: "sunorank",
  storageBucket: "sunorank.firebasestorage.app",
  messagingSenderId: "624060241796",
  appId: "1:624060241796:web:5a14d86c3427b41c6b6fd1",
  measurementId: "G-S8SJLGPCWL"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore
const db = firebase.firestore();

// Constants
const COLLECTIONS = {
  USERS: 'users',
  PLAYLISTS: 'playlists',
  VOTES: 'votes'
};

// Helper functions for database operations
const FirebaseService = {
  // User related functions
  async createUserProfile(userId, userData) {
    try {
      await db.collection(COLLECTIONS.USERS).doc(userId).set({
        ...userData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        verified: false
      });
      return true;
    } catch (error) {
      console.error('Error creating user profile:', error);
      return false;
    }
  },

  async getUserProfile(userId) {
    try {
      const doc = await db.collection(COLLECTIONS.USERS).doc(userId).get();
      if (doc.exists) {
        return { id: doc.id, ...doc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  },

  async updateUserVerification(userId, isVerified) {
    try {
      await db.collection(COLLECTIONS.USERS).doc(userId).update({
        verified: isVerified,
        verifiedAt: isVerified ? firebase.firestore.FieldValue.serverTimestamp() : null
      });
      return true;
    } catch (error) {
      console.error('Error updating user verification:', error);
      return false;
    }
  },

  // Playlist related functions
  async createPlaylist(playlistData) {
    try {
      const docRef = await db.collection(COLLECTIONS.PLAYLISTS).add({
        ...playlistData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating playlist:', error);
      return null;
    }
  },

  async getPlaylist(playlistId) {
    try {
      const doc = await db.collection(COLLECTIONS.PLAYLISTS).doc(playlistId).get();
      if (doc.exists) {
        return { id: doc.id, ...doc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting playlist:', error);
      return null;
    }
  },

  async getUserPlaylists(userId) {
    try {
      const snapshot = await db.collection(COLLECTIONS.PLAYLISTS)
        .where('createdBy', '==', userId)
        .get();
      
      // Sort client-side instead of using orderBy
      return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => {
          // Sort by createdAt in descending order (newest first)
          const dateA = a.createdAt ? a.createdAt.toDate() : new Date(0);
          const dateB = b.createdAt ? b.createdAt.toDate() : new Date(0);
          return dateB - dateA;
        });
    } catch (error) {
      console.error('Error getting user playlists:', error);
      return [];
    }
  },

  // Vote related functions
  async submitVote(voteData) {
    try {
      // Check if user has already voted on this playlist
      const existingVotes = await db.collection(COLLECTIONS.VOTES)
        .where('playlistId', '==', voteData.playlistId)
        .where('userId', '==', voteData.userId)
        .get();

      // If user has already voted, update their vote
      if (!existingVotes.empty) {
        const voteDoc = existingVotes.docs[0];
        await voteDoc.ref.update({
          ...voteData,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return voteDoc.id;
      }

      // Otherwise create a new vote
      const docRef = await db.collection(COLLECTIONS.VOTES).add({
        ...voteData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error submitting vote:', error);
      return null;
    }
  },

  async getPlaylistVotes(playlistId) {
    try {
      const snapshot = await db.collection(COLLECTIONS.VOTES)
        .where('playlistId', '==', playlistId)
        .get();
      
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting playlist votes:', error);
      return [];
    }
  },

  // Helper to calculate current rankings based on votes
  calculateRankings(items, votes) {
    // Initialize scores for all items
    const scores = {};
    
    // Create a map of item IDs to the original item objects
    const itemsMap = {};
    
    items.forEach(item => {
      // If item is an object, use its ID as the key
      const key = typeof item === 'object' && item !== null ? item.id : item;
      scores[key] = { 
        points: 0, 
        firstPlace: 0, 
        secondPlace: 0, 
        thirdPlace: 0,
        itemObject: item // Store the original item (object or string)
      };
      itemsMap[key] = item;
    });

    // Calculate points (3 for 1st choice, 2 for 2nd, 1 for 3rd)
    votes.forEach(vote => {
      // Extract the key (id) if the vote choice is an object
      const firstKey = typeof vote.firstChoice === 'object' && vote.firstChoice !== null 
                      ? vote.firstChoice.id 
                      : vote.firstChoice;
      
      const secondKey = typeof vote.secondChoice === 'object' && vote.secondChoice !== null 
                       ? vote.secondChoice.id 
                       : vote.secondChoice;
      
      const thirdKey = typeof vote.thirdChoice === 'object' && vote.thirdChoice !== null 
                      ? vote.thirdChoice.id 
                      : vote.thirdChoice;
      
      if (firstKey && scores[firstKey]) {
        scores[firstKey].points += 3;
        scores[firstKey].firstPlace += 1;
      }
      
      if (secondKey && scores[secondKey]) {
        scores[secondKey].points += 2;
        scores[secondKey].secondPlace += 1;
      }
      
      if (thirdKey && scores[thirdKey]) {
        scores[thirdKey].points += 1;
        scores[thirdKey].thirdPlace += 1;
      }
    });

    // Convert to array for sorting
    const rankings = Object.keys(scores).map(key => ({
      item: key,
      itemObject: scores[key].itemObject,
      ...scores[key]
    }));

    // Sort by points (descending), then by first place votes as tiebreaker
    return rankings.sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      if (b.firstPlace !== a.firstPlace) {
        return b.firstPlace - a.firstPlace;
      }
      if (b.secondPlace !== a.secondPlace) {
        return b.secondPlace - a.secondPlace;
      }
      return b.thirdPlace - a.thirdPlace;
    });
  },
};
