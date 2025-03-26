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
// Check if Firebase app hasn't been initialized yet
let firebaseApp;
try {
  firebaseApp = firebase.app(); // Use existing app if already initialized
} catch (e) {
  firebaseApp = firebase.initializeApp(firebaseConfig);
}

// Initialize Firestore, Auth and Functions
const db = firebase.firestore();
const auth = firebase.auth();

// Initialize Functions safely
let functions;
try {
  functions = firebase.functions();
  console.log("Firebase Functions initialized successfully");
} catch (e) {
  console.warn("Firebase functions initialization error:", e);
  // Provide a mock functions object
  functions = {
    httpsCallable: (name) => {
      console.warn(`Mock function call to ${name}`);
      return () => Promise.resolve({ data: { success: true, code: "123456" } });
    }
  };
}

// Initialize Storage safely
let storage;
try {
  storage = firebase.storage();
} catch (e) {
  console.warn("Firebase storage initialization error:", e);
  // Provide a mock storage if needed
  storage = {
    ref: () => ({
      put: () => Promise.resolve(),
      getDownloadURL: () => Promise.resolve("")
    })
  };
}

// Constants
const COLLECTIONS = {
  USERS: 'users',
  PLAYLISTS: 'playlists',
  VOTES: 'votes',
  VERIFICATION_CODES: 'verificationCodes'
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
      const docRef = db.collection(COLLECTIONS.USERS).doc(userId);
      const doc = await docRef.get();
      
      if (doc.exists) {
        return { id: doc.id, ...doc.data() };
      } else {
        return null;
      }
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
      // Add creation timestamp and set initial vote count
      const playlist = {
        ...playlistData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        voteCount: 0,
        public: true // All playlists are public by default for sharing
      };
      
      const docRef = await db.collection(COLLECTIONS.PLAYLISTS).add(playlist);
      return docRef.id;
    } catch (error) {
      console.error('Error creating playlist:', error);
      return null;
    }
  },

  async getUserPlaylists(userId) {
    try {
      const snapshot = await db.collection(COLLECTIONS.PLAYLISTS)
        .where('createdBy', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();
      
      if (snapshot.empty) {
        return [];
      }
      
      return snapshot.docs.map(doc => {
        return { id: doc.id, ...doc.data() };
      });
    } catch (error) {
      console.error('Error getting user playlists:', error);
      return [];
    }
  },

  async getPlaylist(playlistId) {
    try {
      const docRef = db.collection(COLLECTIONS.PLAYLISTS).doc(playlistId);
      const doc = await docRef.get();
      
      if (doc.exists) {
        return { id: doc.id, ...doc.data() };
      } else {
        console.log(`Playlist with ID ${playlistId} not found.`);
        return null;
      }
    } catch (error) {
      console.error('Error getting playlist:', error);
      return null;
    }
  },

  async updatePlaylist(playlistId, playlistData, userId) {
    try {
      // First check if the user is the owner
      const playlist = await this.getPlaylist(playlistId);
      
      if (!playlist) {
        console.error('Playlist not found');
        return false;
      }
      
      if (playlist.createdBy !== userId) {
        console.error('User is not authorized to update this playlist');
        return false;
      }
      
      // User is the owner, proceed with update
      await db.collection(COLLECTIONS.PLAYLISTS).doc(playlistId).update({
        ...playlistData,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      return true;
    } catch (error) {
      console.error('Error updating playlist:', error);
      return false;
    }
  },

  // Vote related functions
  async submitVote(voteData) {
    try {
      // Check if user has already voted for this playlist
      const existingVoteQuery = await db.collection(COLLECTIONS.VOTES)
        .where('playlistId', '==', voteData.playlistId)
        .where('userId', '==', voteData.userId)
        .get();
      
      let voteId;
      
      if (!existingVoteQuery.empty) {
        // User has already voted, update their existing vote
        voteId = existingVoteQuery.docs[0].id;
        await db.collection(COLLECTIONS.VOTES).doc(voteId).update({
          firstChoice: voteData.firstChoice,
          secondChoice: voteData.secondChoice,
          thirdChoice: voteData.thirdChoice,
          timestamp: voteData.timestamp
        });
      } else {
        // New vote
        const docRef = await db.collection(COLLECTIONS.VOTES).add(voteData);
        voteId = docRef.id;
        
        // Update the playlist vote count
        await this.updatePlaylistVoteCount(voteData.playlistId);
      }
      
      return true;
    } catch (error) {
      console.error('Error submitting vote:', error);
      return false;
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

  // Get verification code from Firebase Cloud Function
  async getVerificationCode() {
    try {
      // Call the Firebase function to generate a verification code
      const generateCode = functions.httpsCallable('generateVerificationCode');
      const result = await generateCode();
      
      // For testing, you can log the result
      console.log('Verification code generated:', result);
      
      return result.data.code;
    } catch (error) {
      console.error('Error getting verification code:', error);
      return null;
    }
  },
  
  // Verify the code provided by the user
  async verifyCode(code) {
    try {
      // Call the Firebase function to verify the code
      const verifyCodeFunction = functions.httpsCallable('verifyCode');
      const result = await verifyCodeFunction({ code });
      
      // For testing, you can log the result
      console.log('Verification result:', result);
      
      return result.data.success;
    } catch (error) {
      console.error('Error verifying code:', error);
      return false;
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
  
  // Update playlist vote count
  async updatePlaylistVoteCount(playlistId) {
    try {
      // Count the votes for this playlist
      const snapshot = await db.collection(COLLECTIONS.VOTES)
        .where('playlistId', '==', playlistId)
        .get();
        
      const voteCount = snapshot.size;
      
      // Update the playlist document with the new vote count
      await db.collection(COLLECTIONS.PLAYLISTS)
        .doc(playlistId)
        .update({ voteCount });
        
      return voteCount;
    } catch (error) {
      console.error('Error updating playlist vote count:', error);
      throw error;
    }
  },
  
  // Delete a playlist and all its votes
  async deletePlaylist(playlistId) {
    try {
      // Check if playlist exists
      const playlist = await this.getPlaylist(playlistId);
      if (!playlist) {
        console.error('Playlist not found');
        return false;
      }
      
      // Get all votes for this playlist
      const votesQuery = await db.collection(COLLECTIONS.VOTES)
        .where('playlistId', '==', playlistId)
        .get();
      
      // Delete all votes in a batch
      const batch = db.batch();
      
      votesQuery.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Delete the playlist itself
      batch.delete(db.collection(COLLECTIONS.PLAYLISTS).doc(playlistId));
      
      // Commit the batch
      await batch.commit();
      
      return true;
    } catch (error) {
      console.error('Error deleting playlist:', error);
      return false;
    }
  }
};
