const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({origin: true});
const axios = require('axios');

admin.initializeApp();

// Define functions with a specific region
const regionalFunctions = functions.region('us-central1');

/**
 * Cloud Function to generate a unique verification code,
 * store it in Firestore, and return it to the client.
 * 
 * The verification code is tied to a specific user ID.
 */
exports.generateVerificationCode = regionalFunctions.https.onCall(async (data, context) => {
  // Check if the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated', 
      'You must be logged in to request a verification code.'
    );
  }

  const userId = context.auth.uid;
  
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
  const expirationTime = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + 60 * 60 * 1000)
  );
  
  // Store the code in Firestore
  const codeData = {
    code: code,
    userId: userId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: expirationTime,
    used: false
  };
  
  // Make sure we're using the correct collection name as defined in the client
  // This should match the COLLECTIONS.VERIFICATION_CODES in config.js
  try {
    await admin.firestore().collection('verificationCodes').add(codeData);
    console.log(`Verification code ${code} generated for user ${userId}`);
  } catch (error) {
    console.error("Error storing verification code:", error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to store verification code'
    );
  }
  
  // Return the code to the client
  return { code };
});

/**
 * Cloud Function to verify a submitted code.
 * Returns success if the code is valid, an error otherwise.
 */
exports.verifyCode = regionalFunctions.https.onCall(async (data, context) => {
  // Check if the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated', 
      'You must be logged in to verify a code.'
    );
  }
  
  const userId = context.auth.uid;
  const { code, songId } = data;
  
  if (!code) {
    throw new functions.https.HttpsError(
      'invalid-argument', 
      'The code must be provided.'
    );
  }
  
  if (!songId) {
    throw new functions.https.HttpsError(
      'invalid-argument', 
      'The song ID must be provided.'
    );
  }
  
  // Query for the code
  const codesSnapshot = await admin.firestore()
    .collection('verificationCodes')
    .where('code', '==', code)
    .where('userId', '==', userId)
    .where('used', '==', false)
    .get();
  
  if (codesSnapshot.empty) {
    throw new functions.https.HttpsError(
      'not-found', 
      'Invalid or expired verification code.'
    );
  }
  
  const codeDoc = codesSnapshot.docs[0];
  const codeData = codeDoc.data();
  
  // Check if the code has expired
  const now = new Date();
  const expiresAt = codeData.expiresAt.toDate();
  
  if (now > expiresAt) {
    throw new functions.https.HttpsError(
      'deadline-exceeded', 
      'The verification code has expired.'
    );
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
    const axios = require('axios');
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
      avatarImageUrl: profileResponse.data.avatar_image_url
    };
    
    // Update user document with Suno profile data
    await admin.firestore().collection('users').doc(userId).update({
      sunoProfile: sunoProfileData,
      isSunoVerified: true,
      verified: true,
      verifiedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`Updated user ${userId} with Suno profile data for handle ${handle}`);
    verified = true;
    
  } catch (error) {
    console.error('Error during Suno verification:', error);
    throw new functions.https.HttpsError(
      'invalid-argument',
      `Verification failed: ${error.message}`
    );
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
