// Firebase service for Vue 3
import { ref, reactive, onMounted } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';

// Create a singleton instance of the Firebase service
let instance = null;
let instanceCounter = 0;

export const useFirebase = () => {
  instanceCounter++;
  console.log(`useFirebase called ${instanceCounter} times`);
  
  // Return existing instance if already created
  if (instance) {
    console.log('Returning existing Firebase service instance');
    return instance;
  }
  
  // Create new instance only the first time
  // Firebase already initialized in config.js

  // Auth state
  const currentUser = ref(null);
  const userVerified = ref(false);
  const sunoProfile = ref(null);
  const isLoading = ref(true);

  // Firebase services
  const auth = firebase.auth();
  const googleProvider = new firebase.auth.GoogleAuthProvider();
  const db = firebase.firestore();

  // Auth methods
  const signInWithGoogle = async () => {
    try {
      isLoading.value = true;
      await auth.signInWithPopup(googleProvider);
      return true;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      return { error: error.message };
    } finally {
      isLoading.value = false;
    }
  };

  const signOut = async () => {
    try {
      isLoading.value = true;
      await auth.signOut();
      return true;
    } catch (error) {
      console.error('Error signing out:', error);
      return { error: error.message };
    } finally {
      isLoading.value = false;
    }
  };

  // Firestore methods
  const getUserProfile = async (userId) => {
    try {
      const doc = await db.collection('users').doc(userId).get();
      if (doc.exists) {
        return doc.data();
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  };

  const createUserProfile = async (userId, userData) => {
    try {
      await db.collection('users').doc(userId).set({
        email: userData.email,
        displayName: userData.displayName,
        photoURL: userData.photoURL,
        verified: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error creating user profile:', error);
      return false;
    }
  };

  const updateUserVerification = async (userId, isVerified, sunoProfileData = null) => {
    try {
      const updateData = { verified: isVerified };
      
      if (sunoProfileData) {
        updateData.sunoProfile = sunoProfileData;
      }
      
      await db.collection('users').doc(userId).update(updateData);
      return true;
    } catch (error) {
      console.error('Error updating user verification:', error);
      return false;
    }
  };

  // Initialize auth state listener
  const initAuth = () => {
    auth.onAuthStateChanged(async (user) => {
      isLoading.value = true;
      console.log('Auth state changed:', user ? 'User signed in' : 'User signed out');
      
      if (user) {
        // User is signed in
        currentUser.value = user;
        
        // Check if user exists in Firestore
        const userProfile = await getUserProfile(user.uid);
        if (!userProfile) {
          // Create user profile if it doesn't exist
          console.log('Creating new user profile');
          await createUserProfile(user.uid, {
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
          });
        } else {
          // Check if user is verified and has Suno profile
          console.log('User profile found, verified status:', userProfile.verified);
          userVerified.value = userProfile.verified || false;
          
          // Store Suno profile data if available
          if (userProfile.sunoProfile) {
            console.log('Suno profile found:', userProfile.sunoProfile);
            sunoProfile.value = userProfile.sunoProfile;
          }
        }
      } else {
        // User is signed out
        currentUser.value = null;
        userVerified.value = false;
        sunoProfile.value = null;
      }
      
      isLoading.value = false;
    });
  };

  // Helper methods
  const isLoggedIn = () => {
    return !!currentUser.value;
  };

  const isVerified = () => {
    return userVerified.value;
  };

  const refreshUserState = async () => {
    if (!isLoggedIn()) return;
    
    try {
      const userId = currentUser.value.uid;
      const userProfile = await getUserProfile(userId);
      
      if (userProfile) {
        console.log('Refreshed user profile:', userProfile);
        userVerified.value = userProfile.verified || false;
        
        // Update Suno profile if available
        if (userProfile.sunoProfile) {
          sunoProfile.value = userProfile.sunoProfile;
        }
      }
    } catch (error) {
      console.error('Error refreshing user state:', error);
    }
  };

  // Initialize auth listener when the service is used
  onMounted(() => {
    initAuth();
  });

  // Create the instance object with all exports
  const exports = {
    // State
    currentUser,
    userVerified,
    sunoProfile,
    isLoading,
    
    // Auth methods
    signInWithGoogle,
    signOut,
    isLoggedIn,
    isVerified,
    
    // Firestore methods
    getUserProfile,
    createUserProfile,
    updateUserVerification,
    refreshUserState
  };
  
  // Store this instance for future use
  instance = exports;
  
  return exports;
};
