import { ref, computed } from 'vue';
import { 
  signInWithPopup, 
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase/config';

// User profile interface
export interface UserProfile {
  displayName: string;
  email: string;
  photoURL: string;
  createdAt: Date;
  sunoProfile?: {
    avatarImageUrl?: string;
    displayName?: string;
    handle?: string;
    verified?: boolean;
    verifiedAt?: Date;
  };
}

export function useAuth() {
  const user = ref<FirebaseUser | null>(null);
  const profile = ref<UserProfile | null>(null);
  const loading = ref(true);
  const error = ref<string | null>(null);

  // Computed property to check if user is logged in
  const isLoggedIn = computed(() => !!user.value);

  // Listen for auth state changes
  onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    loading.value = true;
    user.value = firebaseUser;
    
    if (firebaseUser) {
      try {
        // Get user profile from Firestore
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        
        // If user exists, set profile data
        if (userSnap.exists()) {
          profile.value = userSnap.data() as UserProfile;
        } else {
          // Create new user profile
          const newUser: UserProfile = {
            displayName: firebaseUser.displayName || 'Anonymous',
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || '',
            createdAt: new Date(),
          };
          
          // Save to Firestore with server timestamp
          await setDoc(userRef, {
            ...newUser,
            createdAt: serverTimestamp()
          });
          
          profile.value = newUser;
        }
        error.value = null;
      } catch (err) {
        error.value = (err as Error).message;
        profile.value = null;
      }
    } else {
      profile.value = null;
    }
    
    loading.value = false;
  });

  // Login with Google
  const loginWithGoogle = async () => {
    loading.value = true;
    error.value = null;
    
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      loading.value = false;
    }
  };

  // Logout
  const logout = async () => {
    loading.value = true;
    error.value = null;
    
    try {
      await signOut(auth);
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      loading.value = false;
    }
  };

  return {
    user,
    profile,
    loading,
    error,
    isLoggedIn,
    loginWithGoogle,
    logout
  };
}
