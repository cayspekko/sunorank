class VerificationService {
  constructor() {
    // DOM Elements - delay initialization until needed to avoid null references
    this.currentCode = null;

    // Don't initialize event listeners in constructor - do it when needed
    // This ensures elements are fully loaded before attaching events
  }

  // Initialize DOM elements - call this method when the section becomes visible
  initializeElements() {
    console.log('Initializing verification elements');
    // DOM Elements
    this.generateCodeBtn = document.getElementById('generate-code-btn');
    this.verificationCodeContainer = document.getElementById('verification-code-container');
    this.verificationCode = document.getElementById('verification-code');
    this.styleInstruction = document.getElementById('style-instruction');
    this.styleCode = document.getElementById('style-code');
    this.songIdInput = document.getElementById('song-id');
    this.verifyBtn = document.getElementById('verify-btn');
    this.verificationStatus = document.getElementById('verification-status');

    // Log elements to ensure they're found
    console.log('Verification elements:', {
      generateCodeBtn: this.generateCodeBtn,
      verificationCodeContainer: this.verificationCodeContainer,
      verificationCode: this.verificationCode,
      styleInstruction: this.styleInstruction,
      styleCode: this.styleCode
    });

    // Initialize event listeners only if not already set up
    if (this.generateCodeBtn && !this.generateCodeBtn._hasClickListener) {
      this.generateCodeBtn.addEventListener('click', () => this.generateVerificationCode());
      this.generateCodeBtn._hasClickListener = true;
    }
    if (this.verifyBtn && !this.verifyBtn._hasClickListener) {
      this.verifyBtn.addEventListener('click', () => this.verifySunoAccount());
      this.verifyBtn._hasClickListener = true;
    }
    
    // Fetch existing verification code for the current user
    this.fetchExistingVerificationCode();
  }
  
  // Fetch the most recent verification code for the current user
  async fetchExistingVerificationCode() {
    if (!authService.isLoggedIn()) {
      console.log('User not logged in, cannot fetch verification code');
      return;
    }
    
    try {
      const userId = authService.getCurrentUser().uid;
      console.log('Fetching verification code for user:', userId);
      
      // Query Firestore for the most recent verification code for this user
      const snapshot = await db.collection('verificationCodes')
        .where('userId', '==', userId)
        .where('used', '==', false)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
      
      if (!snapshot.empty) {
        const codeDoc = snapshot.docs[0];
        const codeData = codeDoc.data();
        const code = codeData.code;
        
        console.log('Found existing verification code:', code);
        
        // Check if the code is still valid (not expired)
        const now = new Date();
        const expiresAt = codeData.expiresAt.toDate();
        
        if (expiresAt > now) {
          console.log('Code is still valid, displaying it');
          this.displayCode(code);
        } else {
          console.log('Code has expired, not displaying it');
        }
      } else {
        console.log('No existing verification code found for user');
      }
    } catch (error) {
      console.error('Error fetching verification code:', error);
    }
  }
  
  setupEventListeners() {
    // Now handled by initializeElements
    this.initializeElements();
  }
  
  // Display a verification code in the UI
  displayCode(code) {
    if (!code) return;
    
    // Store the code
    this.currentCode = code;
    
    // Make sure elements are initialized
    if (!this.verificationCode || !this.verificationCodeContainer) {
      this.initializeElements();
    }
    
    // Display the code
    if (this.verificationCode) {
      this.verificationCode.textContent = code;
      this.verificationCodeContainer.classList.remove('hidden');
    }
    
    // Display the style instruction
    if (this.styleCode) {
      this.styleCode.textContent = code;
      this.styleInstruction.classList.remove('hidden');
    }
    
    console.log('Displayed verification code in UI:', code);
  }
  
  // Generate a verification code using Firebase Cloud Function
  async generateVerificationCode() {
    if (!authService.isLoggedIn()) {
      app.showMessage('You must be logged in to generate a verification code');
      return;
    }
    
    try {
      app.showLoading('Generating verification code...');
      
      // Call the Cloud Function directly instead of using FirebaseService
      const generateCode = firebase.functions().httpsCallable('generateVerificationCode');
      const result = await generateCode();
      console.log('Verification code from server:', result);
      
      const code = result.data.code;
      if (!code) {
        app.showMessage('Failed to generate verification code. Please try again.');
        app.hideLoading();
        return null;
      }
      
      // Display the code using our displayCode method
      this.displayCode(code);
      
      app.hideLoading();
      app.showMessage('Verification code generated successfully!');
      
      return code;
    } catch (error) {
      console.error('Error getting verification code from server:', error);
      app.hideLoading();
      return null;
    }
  }
  
  // Verify the Suno account by checking the verification code
  async verifySunoAccount() {
    if (!this.currentCode) {
      app.showMessage('Please generate a verification code first.');
      return;
    }
    
    const songId = this.songIdInput.value.trim();
    if (!songId) {
      app.showMessage('Please enter a song ID.');
      return;
    }
    
    try {
      app.showLoading('Verifying your Suno account...');
      
      // Call the Cloud Function directly
      const verifyCodeFunction = firebase.functions().httpsCallable('verifyCode');
      const result = await verifyCodeFunction({ code: this.currentCode });
      const isVerified = result.data.success;
      
      if (isVerified) {
        this.verificationStatus.textContent = 'Verification successful! You can now create playlists and vote.';
        this.verificationStatus.className = 'verification-status success';
        
        // Update the user's profile
        if (authService.isLoggedIn()) {
          await this.updateUserVerificationStatus(authService.getCurrentUser().uid);
        }
        
        app.showMessage('Your Suno account has been verified!');
        
        // Navigate back to dashboard after a short delay to allow the user to see the success message
        setTimeout(() => {
          console.log('Verification successful, redirecting to dashboard');
          app.navigateTo('dashboard-section');
        }, 2000);
      } else {
        this.verificationStatus.textContent = 'Verification failed. Please make sure you entered the correct song ID and try again.';
        this.verificationStatus.className = 'verification-status error';
        app.showMessage('Verification failed. Please try again.');
      }
    } catch (error) {
      console.error('Error verifying account:', error);
      this.verificationStatus.textContent = 'An error occurred during verification. Please try again.';
      this.verificationStatus.className = 'verification-status error';
      app.showMessage('Error verifying account. Please try again.');
    } finally {
      app.hideLoading();
    }
  }
  
  // Update user's verification status in Firestore
  async updateUserVerificationStatus(userId) {
    try {
      await db.collection(COLLECTIONS.USERS).doc(userId).update({
        isSunoVerified: true,
        verified: true,
        verifiedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Refresh auth state
      authService.refreshUserState();
      
      return true;
    } catch (error) {
      console.error('Error updating verification status:', error);
      return false;
    }
  }
}

// DO NOT create a new verification service instance here
// It's already created in app.js
// This file only defines the class
