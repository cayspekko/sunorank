const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({origin: true});

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
  
  // Set the expiration time (e.g., 10 minutes from now)
  const expirationTime = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + 10 * 60 * 1000)
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
  const { code } = data;
  
  if (!code) {
    throw new functions.https.HttpsError(
      'invalid-argument', 
      'The code must be provided.'
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
  
  // Mark the code as used
  await codeDoc.ref.update({ used: true });
  
  return { success: true };
});
