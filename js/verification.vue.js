// Vue 3 SFC-style logic for Suno verification
import { ref, computed, watch } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import { useAuth } from './auth.vue.js';

export const useVerification = () => {
    // Use auth composable instead of firebase directly
    const { currentUser, isLoggedIn, userVerified, sunoProfile, hasSunoProfile } = useAuth();
    // State
    const verificationCode = ref('');
    const codeExpiry = ref(null);
    const codeUsed = ref(false);
    const verificationStatus = ref('');
    const verificationError = ref('');
    const verificationSongUrl = ref('');
    const verificationUserHandle = ref('');
    const isVerifying = ref(false);
    const isLoadingCode = ref(false);

    // Fetch existing verification code from Firestore and check verification status
    async function fetchVerificationCode() {
      if (!isLoggedIn() || !currentUser.value) {
        verificationCode.value = '';
        codeExpiry.value = null;
        codeUsed.value = false;
        verificationStatus.value = '';
        verificationUserHandle.value = '';
        return;
      }
      isLoadingCode.value = true;
      verificationError.value = '';
      
      try {
        // 1. First check if the user is already verified using auth state
        if (userVerified.value) {
          verificationStatus.value = 'Verified!';
          // Extract user handle from sunoProfile if available
          if (sunoProfile.value) {
            verificationUserHandle.value = sunoProfile.value.handle || '';
            console.log('User is already verified with Suno handle:', verificationUserHandle.value);
          }
        }
        
        // 2. Then query for any active verification codes
        const db = firebase.firestore();
        const codesRef = db.collection('verificationCodes');
        const query = codesRef
          .where('userId', '==', currentUser.value.uid)
          .where('used', '==', false)
          .limit(1);
        const snapshot = await query.get();
        
        if (!snapshot.empty) {
          // Use the first matching document
          const doc = snapshot.docs[0];
          const data = doc.data();
          verificationCode.value = data.code || '';
          codeExpiry.value = data.expiresAt ? new Date(data.expiresAt.seconds ? data.expiresAt.seconds * 1000 : data.expiresAt) : null;
          codeUsed.value = !!data.used;
          console.log('Found verification code for user:', verificationCode.value);
        } else {
          console.log('No verification code found for user');
          verificationCode.value = '';
          codeExpiry.value = null;
          codeUsed.value = false;
          // Only reset status if user is not verified
          if (!userVerified.value) {
            verificationStatus.value = '';
          }
        }
      } catch (err) {
        verificationError.value = err.message || 'Error fetching verification data.';
      }
      isLoadingCode.value = false;
    }

    // Call fetch on composable init
    if (isLoggedIn()) fetchVerificationCode();
    // Also watch for login changes
    watch(currentUser, (val) => {
      if (val) fetchVerificationCode();
    });

    // Methods
    async function generateVerificationCode() {
      if (!isLoggedIn()) {
        verificationError.value = 'You must be logged in to generate a verification code.';
        return;
      }
      isVerifying.value = true;
      verificationError.value = '';
      try {
        const generateCode = firebase.functions().httpsCallable('generateVerificationCode');
        const result = await generateCode();
        verificationCode.value = result.data.code || '';
        if (!verificationCode.value) {
          verificationError.value = 'Failed to generate verification code. Please try again.';
        }
      } catch (err) {
        verificationError.value = err.message || 'Error generating code.';
      }
      isVerifying.value = false;
    }

    async function verifySunoSong() {
      if (!verificationSongUrl.value) {
        verificationError.value = 'Please enter your Suno song URL or ID.';
        return;
      }
      isVerifying.value = true;
      verificationError.value = '';
      try {
        // Extract UUID from URL or use as is
        const uuid = verificationSongUrl.value.split('/').pop();
        try {
          const verifySong = firebase.functions().httpsCallable('verifyCode');
          const result = await verifySong({ code: verificationCode.value, songId: uuid });
          if (result.success) {
            verificationStatus.value = 'Verified!';
            verificationUserHandle.value = result.user_handle || '';
          } else {
            verificationStatus.value = 'Failed';
            verificationError.value = result.message || 'Verification failed.';
          }
        } catch (err) {
          verificationStatus.value = 'Failed';
          verificationError.value = err.message || 'Verification error.';
        }
      } catch (err) {
        verificationError.value = err.message || 'Error verifying song.';
      }
      isVerifying.value = false;
    }

    return {
      verificationCode,
      verificationStatus,
      verificationError,
      verificationSongUrl,
      verificationUserHandle,
      isVerifying,
      generateVerificationCode,
      verifySunoSong
    };
};
