class VerificationService {
  constructor() {
    // DOM Elements
    this.generateCodeBtn = document.getElementById('generate-code-btn');
    this.verificationCodeContainer = document.getElementById('verification-code-container');
    this.verificationCode = document.getElementById('verification-code');
    this.styleInstruction = document.getElementById('style-instruction');
    this.styleCode = document.getElementById('style-code');
    this.songIdInput = document.getElementById('song-id');
    this.verifyBtn = document.getElementById('verify-btn');
    this.verificationStatus = document.getElementById('verification-status');

    // Store the generated code
    this.currentCode = null;

    // Initialize
    this.setupEventListeners();
    
    // Listen for auth state changes instead of checking immediately
    this.initAuthListener();
  }

  setupEventListeners() {
    this.generateCodeBtn.addEventListener('click', () => this.generateVerificationCode());
    this.verifyBtn.addEventListener('click', () => this.verifySunoAccount());
  }
  
  // Initialize auth state listener to check for codes after auth is ready
  initAuthListener() {
    firebase.auth().onAuthStateChanged(user => {
      if (user) {
        // User is signed in, now check for existing verification code
        this.checkExistingVerificationCode();
      }
    });
  }
  
  // Check if user already has a verification code
  async checkExistingVerificationCode() {
    if (!authService.isLoggedIn()) {
      return;
    }
    
    try {
      const userId = authService.getCurrentUser().uid;
      
      // Get user profile from Firestore
      const userDoc = await db.collection(COLLECTIONS.USERS).doc(userId).get();
      const userProfile = userDoc.exists ? userDoc.data() : null;
      
      if (userProfile && userProfile.verificationCode) {
        // User already has a verification code, display it
        this.currentCode = userProfile.verificationCode;
        this.displayExistingCode(this.currentCode);
        console.log('Retrieved existing verification code:', this.currentCode);
      }
    } catch (error) {
      console.error('Error checking existing verification code:', error);
    }
  }
  
  // Display an existing verification code
  displayExistingCode(code) {
    this.verificationCode.textContent = code;
    this.verificationCodeContainer.classList.remove('hidden');
    
    this.styleCode.textContent = code;
    this.styleInstruction.classList.remove('hidden');
  }

  // Generate a unique verification code
  async generateVerificationCode() {
    // Generate a random 10-character code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = 'SUNORANK_';
    for (let i = 0; i < 10; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    this.currentCode = code;
    
    // Display the code
    this.verificationCode.textContent = code;
    this.verificationCodeContainer.classList.remove('hidden');
    
    // Display the style instruction
    this.styleCode.textContent = code;
    this.styleInstruction.classList.remove('hidden');
    
    // Save code to database if user is logged in
    if (authService.isLoggedIn()) {
      try {
        const userId = authService.getCurrentUser().uid;
        await this.saveVerificationCode(userId, code);
        console.log('Saved verification code to database:', code);
      } catch (error) {
        console.error('Error saving verification code:', error);
      }
    }
    
    return code;
  }
  
  // Save verification code to user's profile
  async saveVerificationCode(userId, code) {
    try {
      await db.collection(COLLECTIONS.USERS).doc(userId).update({
        verificationCode: code,
        verificationCodeCreatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error saving verification code:', error);
      return false;
    }
  }

  // Verify the Suno account by checking the song style field
  async verifySunoAccount() {
    if (!this.currentCode) {
      // Try to check for an existing code first
      await this.checkExistingVerificationCode();
      
      if (!this.currentCode) {
        this.showVerificationMessage('Please generate a verification code first.', false);
        return;
      }
    }
    
    const songId = this.songIdInput.value.trim();
    if (!songId) {
      this.showVerificationMessage('Please enter a Suno song ID.', false);
      return;
    }
    
    try {
      app.showLoading('Verifying your Suno account...');
      
      // Check the Suno song by fetching from the Suno API and verifying the tags contain the code
      const verified = await this.checkSunoSong(songId, this.currentCode);
      
      if (verified) {
        // Update user verification status in Firebase
        const success = await authService.setUserVerified();
        
        if (success) {
          this.showVerificationMessage('Your Suno account has been verified successfully!', true);
          
          // Redirect to dashboard after a short delay
          setTimeout(() => {
            app.navigateTo('dashboard-section');
            playlistManager.loadUserPlaylists();
          }, 2000);
        } else {
          this.showVerificationMessage('Verification successful, but there was an error updating your profile. Please try again.', false);
        }
      } else {
        this.showVerificationMessage('Verification failed. Please make sure you entered the correct song ID and included the verification code in the style field.', false);
      }
    } catch (error) {
      console.error('Error verifying Suno account:', error);
      this.showVerificationMessage(`Error: ${error.message}`, false);
    } finally {
      app.hideLoading();
    }
  }

  // Check the Suno song by fetching from the Suno API and verifying the tags contain the code
  async checkSunoSong(songId, code) {
    if (!songId) {
      return false;
    }
    
    try {
      // Clean the songId to ensure it's just the UUID
      const cleanId = songId.trim().replace(/^https:\/\/.*\//, '');
      
      // Construct the Suno API URL
      const apiUrl = `https://studio-api.prod.suno.com/api/clip/${cleanId}`;
      
      // Fetch the song data
      const response = await fetch(apiUrl);
      
      // If the request failed, return false
      if (!response.ok) {
        console.error('Error fetching Suno song:', response.status, response.statusText);
        return false;
      }
      
      // Parse the response
      const songData = await response.json();
      
      // Check if metadata and tags exist
      if (!songData.metadata || !songData.metadata.tags) {
        console.log('Song metadata or tags missing:', songData);
        return false;
      }
      
      // Get the tags and check if they contain the verification code
      const tags = songData.metadata.tags;
      
      console.log('Song tags:', tags);
      console.log('Verification code:', code);
      
      // Check if the tags match the verification code (exact match)
      return tags === code;
    } catch (error) {
      console.error('Error checking Suno song:', error);
      return false;
    }
  }

  // Show verification status message
  showVerificationMessage(message, isSuccess) {
    this.verificationStatus.textContent = message;
    this.verificationStatus.className = '';
    this.verificationStatus.classList.add(isSuccess ? 'success' : 'error');
  }

  // Reset verification form
  resetVerification() {
    this.currentCode = null;
    this.verificationCodeContainer.classList.add('hidden');
    this.styleInstruction.classList.add('hidden');
    this.songIdInput.value = '';
    this.verificationStatus.textContent = '';
  }
}
