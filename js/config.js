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

  // Update the playlist bracket round
  async updatePlaylistBracketRound(playlistId, round, deadline) {
    try {
      const userId = authService.getCurrentUser().uid;
      
      // Get the playlist to verify ownership
      const playlist = await this.getPlaylist(playlistId);
      
      if (!playlist) {
        console.error('Playlist not found');
        return false;
      }
      
      // Verify that the current user is the owner
      if (playlist.createdBy !== userId) {
        console.error('User is not the owner of this playlist');
        return false;
      }
      
      // Update the playlist document with the new bracket information
      await db.collection(COLLECTIONS.PLAYLISTS).doc(playlistId).update({
        bracketCurrentRound: round,
        bracketRoundDeadline: deadline,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      return true;
    } catch (error) {
      console.error('Error updating playlist bracket round:', error);
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
        
        // Update based on vote type
        if (voteData.voteType === 'star-rating') {
          await db.collection(COLLECTIONS.VOTES).doc(voteId).update({
            starVotes: voteData.starVotes,
            voteType: voteData.voteType,
            createdAt: voteData.createdAt
          });
        } else {
          // Default to ranked-choice
          await db.collection(COLLECTIONS.VOTES).doc(voteId).update({
            votes: voteData.votes,
            timestamp: voteData.timestamp
          });
        }
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

  // Calculate rankings for a playlist
  async calculateRankings(playlistId) {
    try {
      // Get all votes for the playlist
      const votes = await this.getPlaylistVotes(playlistId);
      
      // Get the playlist to determine ranking type
      const playlist = await this.getPlaylist(playlistId);
      if (!playlist) {
        console.error('Playlist not found');
        return [];
      }
      
      const rankingType = playlist.rankingType || 'ranked-choice';
      console.log('Calculating rankings for type:', rankingType);
      
      // Initialize rankings object
      const rankings = {};
      
      // Process votes based on ranking type
      if (rankingType === 'star-rating') {
        // Process star ratings
        votes.forEach(vote => {
          if (vote.voteType === 'star-rating' && vote.starVotes) {
            vote.starVotes.forEach(starVote => {
              const songId = starVote.songId;
              const rating = starVote.rating;
              
              if (!rankings[songId]) {
                rankings[songId] = {
                  songId,
                  title: starVote.songTitle || 'Unknown Song',
                  totalPoints: 0,
                  voteCount: 0,
                  averageRating: 0
                };
              }
              
              rankings[songId].totalPoints += rating;
              rankings[songId].voteCount += 1;
            });
          }
        });
        
        // Calculate average ratings
        Object.values(rankings).forEach(ranking => {
          ranking.averageRating = ranking.totalPoints / ranking.voteCount;
          ranking.points = ranking.averageRating; // For sorting
        });
      } else if (rankingType === 'bracket') {
        // Process bracket tournament votes
        votes.forEach(vote => {
          if (vote.voteType === 'bracket' && vote.winner) {
            const songId = vote.winner.id;
            
            if (!rankings[songId]) {
              rankings[songId] = {
                songId,
                title: vote.winner.title || 'Unknown Song',
                winCount: 0
              };
            }
            
            rankings[songId].winCount += 1;
            rankings[songId].points = rankings[songId].winCount; // For sorting
          }
        });
      } else {
        // Process ranked choice votes (default)
        votes.forEach(vote => {
          // Handle both old and new vote formats
          if (vote.votes && Array.isArray(vote.votes)) {
            // New format with votes array
            vote.votes.forEach(v => {
              const songId = v.songId;
              const rank = v.rank;
              
              if (!rankings[songId]) {
                rankings[songId] = {
                  songId,
                  title: v.songTitle || 'Unknown Song',
                  points: 0,
                  firstPlace: 0,
                  secondPlace: 0,
                  thirdPlace: 0
                };
              }
              
              // Assign points based on rank
              if (rank === 1) {
                rankings[songId].points += 3;
                rankings[songId].firstPlace += 1;
              } else if (rank === 2) {
                rankings[songId].points += 2;
                rankings[songId].secondPlace += 1;
              } else if (rank === 3) {
                rankings[songId].points += 1;
                rankings[songId].thirdPlace += 1;
              }
            });
          } else {
            // Old format with firstChoice, secondChoice, thirdChoice
            // Process first choice
            if (vote.firstChoice) {
              const songId = vote.firstChoice;
              
              if (!rankings[songId]) {
                rankings[songId] = {
                  songId,
                  title: this.getSongTitleById(playlist, songId) || 'Unknown Song',
                  points: 0,
                  firstPlace: 0,
                  secondPlace: 0,
                  thirdPlace: 0
                };
              }
              
              rankings[songId].points += 3;
              rankings[songId].firstPlace += 1;
            }
            
            // Process second choice
            if (vote.secondChoice) {
              const songId = vote.secondChoice;
              
              if (!rankings[songId]) {
                rankings[songId] = {
                  songId,
                  title: this.getSongTitleById(playlist, songId) || 'Unknown Song',
                  points: 0,
                  firstPlace: 0,
                  secondPlace: 0,
                  thirdPlace: 0
                };
              }
              
              rankings[songId].points += 2;
              rankings[songId].secondPlace += 1;
            }
            
            // Process third choice
            if (vote.thirdChoice) {
              const songId = vote.thirdChoice;
              
              if (!rankings[songId]) {
                rankings[songId] = {
                  songId,
                  title: this.getSongTitleById(playlist, songId) || 'Unknown Song',
                  points: 0,
                  firstPlace: 0,
                  secondPlace: 0,
                  thirdPlace: 0
                };
              }
              
              rankings[songId].points += 1;
              rankings[songId].thirdPlace += 1;
            }
          }
        });
      }
      
      // Convert rankings object to array and sort by points
      const rankingsArray = Object.values(rankings);
      rankingsArray.sort((a, b) => b.points - a.points);
      
      return rankingsArray;
    } catch (error) {
      console.error('Error calculating rankings:', error);
      return [];
    }
  },
  
  // Helper to calculate current rankings based on votes
  calculateRankings(items, votes) {
    // Initialize scores
    const scores = {};
    const itemsMap = {};
    
    items.forEach(item => {
        const key = typeof item === 'object' && item !== null ? item.id : item;
        scores[key] = { 
            points: 0, 
            firstPlace: 0, 
            secondPlace: 0, 
            thirdPlace: 0,
            starRatingTotal: 0,
            starRatingCount: 0,
            starRatingAvg: 0,
            itemObject: item
        };
        itemsMap[key] = item;
    });

    // Check if there are any star rating votes
    const hasStarRatings = votes.some(vote => vote.voteType === 'star-rating');
    
    // Process all votes
    votes.forEach(vote => {
        if (vote.voteType === 'star-rating' && vote.starVotes) {
            // Process star rating votes
            vote.starVotes.forEach(starVote => {
                const key = starVote.songId;
                if (!scores[key]) return;
                
                scores[key].starRatingTotal += starVote.rating;
                scores[key].starRatingCount += 1;
            });
        } else if (vote.votes && Array.isArray(vote.votes)) {
            // Process new vote format with votes array
            vote.votes.forEach(voteItem => {
                if (!voteItem.songId || !scores[voteItem.songId]) return;
                
                const songId = voteItem.songId;
                if (voteItem.rank === 1) {
                    scores[songId].points += 3;
                    scores[songId].firstPlace += 1;
                } else if (voteItem.rank === 2) {
                    scores[songId].points += 2;
                    scores[songId].secondPlace += 1;
                } else if (voteItem.rank === 3) {
                    scores[songId].points += 1;
                    scores[songId].thirdPlace += 1;
                }
            });
        } else {
            // Process ranked choice votes (old format)
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
        }
    });
    
    // Calculate averages for star ratings
    Object.keys(scores).forEach(key => {
        if (scores[key].starRatingCount > 0) {
            scores[key].starRatingAvg = scores[key].starRatingTotal / scores[key].starRatingCount;
            
            // For mixed voting systems, convert star ratings to points
            // This allows star and ranked choice votes to be shown together
            if (!hasStarRatings) {
                scores[key].points += scores[key].starRatingAvg;
            }
        }
    });
    
    // Convert to array for sorting
    const rankings = Object.keys(scores).map(key => ({
        item: key,
        itemObject: scores[key].itemObject,
        ...scores[key]
    }));

    // Sort by appropriate metric based on voting type
    if (hasStarRatings) {
        // Sort by average star rating for star rating playlists
        return rankings.sort((a, b) => {
            if (b.starRatingCount === 0 && a.starRatingCount === 0) return 0;
            if (b.starRatingCount === 0) return -1;
            if (a.starRatingCount === 0) return 1;
            return b.starRatingAvg - a.starRatingAvg;
        });
    } else {
        // Use existing ranked choice sorting for ranked choice playlists
        return rankings.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.firstPlace !== a.firstPlace) return b.firstPlace - a.firstPlace;
            if (b.secondPlace !== a.secondPlace) return b.secondPlace - a.secondPlace;
            return b.thirdPlace - a.thirdPlace;
        });
    }
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
  },
  
  // Submit bracket votes
  async submitBracketVotes(voteData) {
    try {
      // Check if user has already voted for this playlist in this round
      const existingVoteQuery = await db.collection(COLLECTIONS.VOTES)
        .where('playlistId', '==', voteData.playlistId)
        .where('userId', '==', voteData.userId)
        .where('voteType', '==', 'bracket')
        .where('round', '==', voteData.round)
        .get();
      
      let voteId;
      
      if (!existingVoteQuery.empty) {
        // User has already voted in this round, update their existing vote
        voteId = existingVoteQuery.docs[0].id;
        
        await db.collection(COLLECTIONS.VOTES).doc(voteId).update({
          votes: voteData.votes,
          createdAt: voteData.createdAt
        });
      } else {
        // New vote for this round
        const docRef = await db.collection(COLLECTIONS.VOTES).add(voteData);
        voteId = docRef.id;
      }
      
      return voteId;
    } catch (error) {
      console.error('Error submitting bracket votes:', error);
      throw error;
    }
  },
  
  // Get all votes for a playlist
  async getPlaylistVotes(playlistId) {
    try {
      const votesSnapshot = await db.collection(COLLECTIONS.VOTES)
        .where('playlistId', '==', playlistId)
        .get();
      
      const votes = [];
      votesSnapshot.forEach(doc => {
        votes.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return votes;
    } catch (error) {
      console.error('Error getting playlist votes:', error);
      return [];
    }
  },
};
