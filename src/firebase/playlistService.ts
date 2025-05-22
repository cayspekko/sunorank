import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './config';
import { Playlist, Track, Vote, TrackWithRanking, RankingMethod } from '../types/playlist';

/**
 * Fetches a playlist by its ID
 */
export const getPlaylist = async (id: string): Promise<Playlist | null> => {
  try {
    const docRef = doc(db, 'playlists', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    const data = docSnap.data();
    
    // Add default values for new fields if they don't exist
    const playlist: Playlist = {
      id: docSnap.id,
      ...data,
      // Provide defaults for new fields
      rankingMethod: data.rankingMethod || 'star',
      votingEnabled: data.votingEnabled !== undefined ? data.votingEnabled : true,
      allowVoteChanges: data.allowVoteChanges !== undefined ? data.allowVoteChanges : true,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    } as Playlist;
    
    // Update the playlist in the database with default fields if they're missing
    if (!data.rankingMethod || data.votingEnabled === undefined || data.allowVoteChanges === undefined) {
      console.log('Updating playlist with default values');
      // Use a separate async operation to avoid blocking the get
      updateDoc(docRef, {
        rankingMethod: playlist.rankingMethod,
        votingEnabled: playlist.votingEnabled,
        allowVoteChanges: playlist.allowVoteChanges
      }).catch(err => console.error('Error updating playlist with default values:', err));
    }
    
    return playlist;
  } catch (error) {
    console.error('Error fetching playlist:', error);
    throw error;
  }
};

/**
 * Fetches all playlists for a user
 */
export const getUserPlaylists = async (userId: string): Promise<Playlist[]> => {
  try {
    const q = query(
      collection(db, 'playlists'),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      } as Playlist;
    });
  } catch (error) {
    console.error('Error fetching user playlists:', error);
    throw error;
  }
};

/**
 * Fetches public playlists
 */
export const getPublicPlaylists = async (limit = 10): Promise<Playlist[]> => {
  try {
    const q = query(
      collection(db, 'playlists'),
      where('isPublic', '==', true),
      orderBy('updatedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      } as Playlist;
    }).slice(0, limit);
  } catch (error) {
    console.error('Error fetching public playlists:', error);
    throw error;
  }
};

/**
 * Fetches votes for a specific track in a playlist
 */
export const getVotesForTrack = async (playlistId: string, trackId: string): Promise<Vote[]> => {
  try {
    const q = query(
      collection(db, 'votes'),
      where('playlistId', '==', playlistId),
      where('trackId', '==', trackId)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt
      } as Vote;
    });
  } catch (error) {
    console.error('Error fetching votes for track:', error);
    throw error;
  }
};

/**
 * Fetches all votes for a playlist
 */
export const getVotesForPlaylist = async (playlistId: string): Promise<Vote[]> => {
  try {
    const q = query(
      collection(db, 'votes'),
      where('playlistId', '==', playlistId)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt
      } as Vote;
    });
  } catch (error) {
    console.error('Error fetching votes for playlist:', error);
    throw error;
  }
};

/**
 * Gets a specific vote by a user for a track using composite ID
 */
export const getUserVoteForTrack = async (
  playlistId: string, 
  trackId: string, 
  userId: string
): Promise<Vote | null> => {
  try {
    // Create composite ID for the vote
    const voteId = `${userId}_${playlistId}_${trackId}`;
    
    // Get vote directly by ID instead of querying
    const voteDoc = await getDoc(doc(db, 'votes', voteId));
    
    if (!voteDoc.exists()) {
      return null;
    }
    
    const data = voteDoc.data();
    return {
      id: voteDoc.id,
      ...data,
      createdAt: data.createdAt
    } as Vote;
  } catch (error) {
    console.error('Error fetching user vote:', error);
    throw error;
  }
};

/**
 * Gets all votes from a specific user for a playlist
 */
export const getUserVotesForPlaylist = async (
  playlistId: string,
  userId: string
): Promise<Vote[]> => {
  try {
    const q = query(
      collection(db, 'votes'),
      where('playlistId', '==', playlistId),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt
      } as Vote;
    });
  } catch (error) {
    console.error('Error fetching user votes for playlist:', error);
    throw error;
  }
};

/**
 * Create or update a vote - uses composite ID and respects allowVoteChanges setting
 */
export const saveVote = async (vote: Omit<Vote, 'id' | 'createdAt'>): Promise<string> => {
  try {
    // First, get the playlist to check allowVoteChanges
    const playlist = await getPlaylist(vote.playlistId);
    if (!playlist) {
      throw new Error('Playlist not found');
    }
    
    // Create composite ID for the vote
    const voteId = `${vote.userId}_${vote.playlistId}_${vote.trackId}`;
    
    // Check if user has already voted
    const existingVote = await getUserVoteForTrack(
      vote.playlistId,
      vote.trackId,
      vote.userId
    );
    
    if (existingVote) {
      // Check if vote changes are allowed
      if (!playlist.allowVoteChanges) {
        throw new Error('Vote changes are not allowed for this playlist');
      }
      
      // Update existing vote
      const voteRef = doc(db, 'votes', voteId);
      await updateDoc(voteRef, {
        rating: vote.rating,
        updatedAt: serverTimestamp()
      });
      return voteId;
    } else {
      // Create new vote with the composite ID
      const now = Date.now();
      await setDoc(doc(db, 'votes', voteId), {
        ...vote,
        createdAt: now,
        updatedAt: now
      });
      return voteId;
    }
  } catch (error) {
    console.error('Error saving vote:', error);
    throw error;
  }
};

/**
 * Delete a vote - respects allowVoteChanges setting
 */
export const deleteVote = async (voteId: string, userId: string): Promise<void> => {
  try {
    // First get the vote to get the playlist ID
    const voteRef = doc(db, 'votes', voteId);
    const voteSnap = await getDoc(voteRef);
    
    if (!voteSnap.exists()) {
      throw new Error('Vote not found');
    }
    
    const voteData = voteSnap.data() as Vote;
    
    // Check if this vote belongs to the user
    if (voteData.userId !== userId) {
      throw new Error('You can only delete your own votes');
    }
    
    // Check if vote changes are allowed in this playlist
    const playlist = await getPlaylist(voteData.playlistId);
    if (!playlist) {
      throw new Error('Playlist not found');
    }
    
    if (!playlist.allowVoteChanges) {
      throw new Error('Vote changes are not allowed for this playlist');
    }
    
    // Delete the vote
    await deleteDoc(voteRef);
  } catch (error) {
    console.error('Error deleting vote:', error);
    throw error;
  }
};

/**
 * Converts tracks to tracks with ranking by calculating average ratings
 * and sorting based on the ranking method
 */
export const calculateRankings = (
  tracks: Track[], 
  votes: Vote[], 
  rankingMethod: RankingMethod,
  currentUserId?: string
): TrackWithRanking[] => {
  if (!tracks || tracks.length === 0) return [];
  
  const tracksWithRanking = tracks.map(track => {
    const trackVotes = votes.filter(v => v.trackId === track.id);
    const voteCount = trackVotes.length;
    let averageRating = 0;
    
    // Initialize vote counts by rank
    let votesByRank = {
      1: 0, // 1st place votes
      2: 0, // 2nd place votes
      3: 0  // 3rd place votes
    };
    
    if (voteCount > 0) {
      if (rankingMethod === 'star') {
        // Calculate average star rating
        const sum = trackVotes.reduce((acc, vote) => acc + vote.rating, 0);
        averageRating = sum / voteCount;
      } else if (rankingMethod === 'updown') {
        // For updown, the rating is +1 or -1, so sum is the score
        const sum = trackVotes.reduce((acc, vote) => acc + vote.rating, 0);
        averageRating = sum;
      } else if (rankingMethod === 'ranked') {
        // For ranked voting, calculate points: 1st = 3 points, 2nd = 2 points, 3rd = 1 point
        let points = 0;
        
        // Count votes by rank
        trackVotes.forEach(vote => {
          if (vote.rank === 1) {
            points += 3;
            votesByRank[1]++;
          } else if (vote.rank === 2) {
            points += 2;
            votesByRank[2]++;
          } else if (vote.rank === 3) {
            points += 1;
            votesByRank[3]++;
          }
        });
        
        averageRating = points;
      } else {
        // For favorite, the count of votes is the score
        averageRating = voteCount;
      }
    }
    
    // Get the user's vote if a userId is provided
    let userVote: Vote | null = null;
    if (currentUserId) {
      userVote = trackVotes.find(vote => vote.userId === currentUserId) || null;
    }
    
    return {
      ...track,
      averageRating,
      voteCount,
      userVote,
      votesByRank
    } as TrackWithRanking;
  });
  
  // Sort tracks based on the ranking method
  let sortedTracks: TrackWithRanking[];
  
  if (rankingMethod === 'star' || rankingMethod === 'updown' || rankingMethod === 'ranked') {
    // Sort by average rating (highest first)
    sortedTracks = [...tracksWithRanking].sort((a, b) => {
      // First by rating (descending)
      const ratingDiff = (b.averageRating || 0) - (a.averageRating || 0);
      if (ratingDiff !== 0) return ratingDiff;
      
      // Then by vote count (descending)
      const countDiff = (b.voteCount || 0) - (a.voteCount || 0);
      if (countDiff !== 0) return countDiff;
      
      // Finally by date added (newest first)
      return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
    });
  } else {
    // For favorite, sort by vote count
    sortedTracks = [...tracksWithRanking].sort((a, b) => {
      const countDiff = (b.voteCount || 0) - (a.voteCount || 0);
      if (countDiff !== 0) return countDiff;
      
      return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
    });
  }
  
  // Add ranking position
  sortedTracks.forEach((track, index) => {
    track.rank = index + 1;
  });
  
  return sortedTracks;
};
