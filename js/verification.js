class VerificationService {
  constructor() {
    // DOM Elements - delay initialization until needed to avoid null references
    this.currentCode = null;
    this.generateCodeBtnInitialized = false;

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
    this.verificationStatus = document.getElementById('verification-status');
    this.stepInstructions = document.getElementById('step-instructions');
    
    // Look for the dynamically added elements
    this.songIdInput = document.getElementById('song-id');
    this.verifySongBtn = document.getElementById('verify-song-btn'); 
    
    // Static event listener - only needs to be set up once
    if (this.generateCodeBtn && !this.generateCodeBtnInitialized) {
      this.generateCodeBtn.addEventListener('click', () => this.getVerificationCode());
      this.generateCodeBtnInitialized = true;
    }
    
    // Dynamic event listener - needs to be set up every time we update the DOM
    if (this.verifySongBtn) {
      console.log('Setting up verify song button event listener');
      this.verifySongBtn.addEventListener('click', () => this.verifySunoAccount());
    }
    
    // Log elements to ensure they're found
    console.log('Verification elements:', {
      generateCodeBtn: this.generateCodeBtn,
      verificationCodeContainer: this.verificationCodeContainer,
      verificationCode: this.verificationCode,
      songIdInput: this.songIdInput,
      verifySongBtn: this.verifySongBtn
    });
  }

  // Initialize the verification section
  initialize() {
    this.initializeElements();
    
    // Fetch existing verification code after elements are initialized
    if (authService.isLoggedIn()) {
      this.fetchExistingVerificationCode();
    }
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
    
    // Update the step instructions
    this.stepInstructions.innerHTML = `
      <h3>Step 2: Create a Suno Song</h3>
      <p class="mb-3">Create a new song on Suno and add the verification code to the song tags.</p>
      <p class="mb-3"><strong>Your verification code:</strong> <span class="verification-code">${code}</span></p>
      <div class="mb-3">
        <ol class="verification-steps">
          <li>Go to <a href="https://suno.com/create" target="_blank">Suno Create</a></li>
          <li>Add the verification code <code>${code}</code> to the tags field</li>
          <li>Generate your song and copy its URL or ID</li>
        </ol>
      </div>
      <div class="mb-3">
        <label for="song-id" class="form-label">Suno Song URL or ID:</label>
        <input type="text" id="song-id" class="form-control" placeholder="Enter the song URL or ID">
        <small class="form-text text-muted">Example: https://suno.com/@username/a1b2c3d4 or just the song ID (a1b2c3d4)</small>
      </div>
      <button id="verify-song-btn" class="btn btn-primary">Verify Song</button>
      <div id="verification-status" class="verification-status mt-3"></div>
    `;
    
    // Re-initialize elements after updating the HTML
    this.initializeElements();
    
    console.log('Displayed verification code in UI:', code);
  }
  
  // Generate a verification code using Firebase Cloud Function
  async getVerificationCode() {
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
    
    const songId = this.songIdInput ? this.songIdInput.value.trim() : '';
    if (!songId) {
      app.showMessage('Please enter a song ID.');
      return;
    }
    
    try {
      app.showLoading('Verifying your Suno account...');
      
      // Call the Cloud Function directly
      const verifyCodeFunction = firebase.functions().httpsCallable('verifyCode');
      const result = await verifyCodeFunction({ 
        code: this.currentCode,
        songId: songId // Send the raw songId to the server
      });
      
      const isVerified = result.data.success;
      const sunoProfile = result.data.sunoProfile;
      
      console.log('Verification result:', result.data);
      
      if (isVerified) {
        // Update verification status display
        if (this.verificationStatus) {
          this.verificationStatus.textContent = 'Verification successful! You can now create playlists and vote.';
          this.verificationStatus.className = 'verification-status success';
        }
        
        // If we got Suno profile data back, display it
        if (sunoProfile) {
          console.log('Received Suno profile data:', sunoProfile);
          
          // Update the verification status with the Suno profile info
          if (this.verificationStatus) {
            this.verificationStatus.textContent = `Verification successful! Connected to Suno profile: ${sunoProfile.displayName || sunoProfile.handle}`;
          }
          
          // Refresh auth state to show Suno avatar in header
          authService.refreshUserState();
        } else {
          // If we didn't get profile data, still update verification status
          if (authService.isLoggedIn()) {
            await this.updateUserVerificationStatus(authService.getCurrentUser().uid);
          }
        }
        
        app.showMessage('Your Suno account has been verified!');
        
        // Navigate back to dashboard after a short delay to allow the user to see the success message
        setTimeout(() => {
          console.log('Verification successful, redirecting to dashboard');
          app.navigateTo('dashboard-section');
        }, 2000);
        
      } else {
        // Handle verification failure
        if (this.verificationStatus) {
          this.verificationStatus.textContent = 'Verification failed. Please check the song ID and try again.';
          this.verificationStatus.className = 'verification-status error';
        }
        
        app.showMessage('Verification failed. Please check that you added the verification code to the song tags.');
      }
      
      app.hideLoading();
      
    } catch (error) {
      console.error('Error verifying Suno account:', error);
      
      // Display error in verification status
      if (this.verificationStatus) {
        this.verificationStatus.textContent = `Error: ${error.message || 'Failed to verify account'}`;
        this.verificationStatus.className = 'verification-status error';
      }
      
      app.showMessage(`Error: ${error.message || 'Failed to verify account'}`);
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
