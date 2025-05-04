import { onCall, onRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2/options';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import corsMiddleware from 'cors';
import axios from 'axios';

// Initialize Firebase Admin
initializeApp();

// Set global options including region
setGlobalOptions({ region: 'us-central1' });

// Configure CORS middleware
const cors = corsMiddleware({ origin: true, credentials: true });

// Log CORS configuration
console.log('CORS middleware configured with:', {
  origin: true,
  credentials: true
});

/**
 * Cloud Function to generate a unique verification code,
 * store it in Firestore, and return it to the client.
 * 
 * The verification code is tied to a specific user ID.
 */
export const generateVerificationCode = onCall(async (request) => {
  // Check if the user is authenticated
  if (!request.auth) {
    throw new Error('Unauthenticated: You must be logged in to request a verification code.');
  }

  const userId = request.auth.uid;

  // Invalidate all previous codes for this user before generating a new one
  const db = getFirestore();
  const codesRef = db.collection('verificationCodes');
  const existingCodes = await codesRef.where('userId', '==', userId).where('used', '==', false).get();
  const batch = db.batch();
  existingCodes.forEach(doc => {
    batch.update(doc.ref, { used: true, invalidatedAt: FieldValue.serverTimestamp() });
  });
  if (!existingCodes.empty) {
    await batch.commit();
  }

  // Generate a random code in the SUNORANK_XxXxXxXxX format
  const generateRandomString = (length) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  
  const code = `SUNORANK_${generateRandomString(10)}`;
  
  // Set the expiration time (e.g., 60 minutes from now)
  const expirationTime = Timestamp.fromDate(
    new Date(Date.now() + 60 * 60 * 1000)
  );
  
  // Store the code in Firestore
  const codeData = {
    code: code,
    userId: userId,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: expirationTime,
    used: false
  };
  
  // Make sure we're using the correct collection name as defined in the client
  // This should match the COLLECTIONS.VERIFICATION_CODES in config.js
  try {
    await getFirestore().collection('verificationCodes').add(codeData);
    console.log(`Verification code ${code} generated for user ${userId}`);
  } catch (error) {
    console.error("Error storing verification code:", error);
    throw new Error('Failed to store verification code');
  }
  
  // Return the code to the client
  return { code };
});

/**
 * Test HTTP endpoint to verify CORS is working properly
 * Use this to test connectivity to your Firebase emulators
 */
export const testCors = onRequest((req, res) => {
  // Apply CORS middleware to handle preflight requests
  return cors(req, res, () => {
    console.log('CORS headers should be applied now');
    res.status(200).send({
      success: true,
      message: 'CORS is working!',
      timestamp: new Date().toISOString()
    });
  });
});

/**
 * Cloud Function to verify a submitted code.
 * Returns success if the code is valid, an error otherwise.
 */
export const verifyCode = onCall(async (request) => {
  // Check if the user is authenticated
  if (!request.auth) {
    throw new Error('Unauthenticated: You must be logged in to verify a code.');
  }
  
  const userId = request.auth.uid;
  const { code, songId } = request.data;
  
  if (!code) {
    throw new Error('The code must be provided.');
  }
  
  if (!songId) {
    throw new Error('The song ID must be provided.');
  }
  
  // Query for the code
  const codesSnapshot = await getFirestore()
    .collection('verificationCodes')
    .where('code', '==', code)
    .where('userId', '==', userId)
    .where('used', '==', false)
    .get();
  
  if (codesSnapshot.empty) {
    throw new Error('Invalid or expired verification code.');
  }
  
  const codeDoc = codesSnapshot.docs[0];
  const codeData = codeDoc.data();
  
  // Check if the code has expired
  const now = new Date();
  const expiresAt = codeData.expiresAt.toDate();
  
  if (now > expiresAt) {
    throw new Error('The verification code has expired.');
  }
  
  // Server-side verification with Suno API
  let sunoProfileData = null;
  let verified = false;
  
  try {
    // Extract just the song UUID from the provided songId
    // The songId could be:
    // - Just the UUID (e.g., "a1b2c3d4")
    // - Full URL (e.g., "https://suno.com/@username/a1b2c3d4")
    let songUuid = songId;
    
    // If it's a URL, extract just the UUID from the end
    if (songId.includes('/')) {
      const parts = songId.split('/');
      songUuid = parts[parts.length - 1];
    }
    
    console.log(`Extracted song UUID: ${songUuid}`);
    
    if (!songUuid) {
      throw new Error('Could not extract a valid song ID');
    }
    
    // Fetch the song details from Suno API
    const songResponse = await axios.get(`https://studio-api.prod.suno.com/api/clip/${songUuid}`);
    
    if (!songResponse.data) {
      throw new Error('Song not found on Suno');
    }
    
    // Extract the user handle from the song data
    const handle = songResponse.data.handle;
    
    if (!handle) {
      throw new Error('Could not determine the Suno user handle from the song');
    }
    
    // Verify the song contains our verification code in the metadata.tags field
    const tags = songResponse.data.metadata?.tags || '';
    
    if (!tags.includes(code)) {
      console.log(`Verification failed: code ${code} not found in song metadata.tags: ${tags}`);
      throw new Error('Verification code not found in the song. Please include the verification code in the song tags.');
    }
    
    // Now fetch the user's profile data using the handle we got from the song
    const profileResponse = await axios.get(
      `https://studio-api.prod.suno.com/api/profiles/${handle}?clips_sort_by=created_at&playlists_sort_by=created_at`
    );
    
    if (!profileResponse.data) {
      throw new Error('Could not fetch Suno profile data');
    }
    
    // Extract only the needed fields
    sunoProfileData = {
      handle: profileResponse.data.handle,
      displayName: profileResponse.data.display_name,
      avatarImageUrl: profileResponse.data.avatar_image_url,
      verified: true,
      verifiedAt: FieldValue.serverTimestamp()
    };
    
    // Update user document with Suno profile data
    await getFirestore().collection('users').doc(userId).update({
      sunoProfile: sunoProfileData
    });
    
    console.log(`Updated user ${userId} with Suno profile data for handle ${handle}`);
    verified = true;
    
  } catch (error) {
    console.error('Error during Suno verification:', error);
    throw new Error(`Verification failed: ${error.message}`);
  }
  
  // Mark the code as used if verification was successful
  if (verified) {
    await codeDoc.ref.update({ used: true });
  }
  
  return { 
    success: verified,
    sunoProfile: sunoProfileData
  };
});

export const submitVote = onCall(async (request) => {
  // Check if the user is authenticated
  if (!request.auth) {
    throw new Error('Unauthenticated: You must be logged in to submit a vote.');
  }
  
  const userId = request.auth.uid;
  const { playlistId, votes } = request.data;
  
  // Validation
  if (!playlistId) {
    throw new Error('The playlist ID must be provided.');
  }
  
  if (!votes || !Array.isArray(votes) || votes.length === 0) {
    throw new Error('Votes must be provided as a non-empty array.');
  }

  // Fetch the playlist to check the voting deadline
  const playlistDoc = await getFirestore().collection('playlists').doc(playlistId).get();
  if (!playlistDoc.exists) {
    throw new Error('Playlist not found.');
  }

  const playlistData = playlistDoc.data();
  const now = Timestamp.now();

  // Check if voting deadline has passed
  if (playlistData.votingDeadline && playlistData.votingDeadline.toDate() < now.toDate()) {
    throw new Error('Voting for this playlist has ended.');
  }
  
  // Store the votes in Firestore
  try {
    await getFirestore().collection('votes').doc(userId + '_' + playlistId).set({
      userId: userId,
      playlistId: playlistId,
      votes: votes,
      createdAt: FieldValue.serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error submitting vote:', error);
    throw new Error(`Failed to submit vote: ${error.message}`);
  }
});
