// Authentication functionality
class AuthService {
  constructor() {
    this.auth = firebase.auth();
    this.googleProvider = new firebase.auth.GoogleAuthProvider();
    this.currentUser = null;
    this.userVerified = false;

    // DOM Elements
    this.loginBtn = document.getElementById('login-btn');
    this.logoutBtn = document.getElementById('logout-btn');
    this.startAuthBtn = document.getElementById('start-auth-btn');
    this.userProfile = document.getElementById('user-profile');
    this.loginContainer = document.getElementById('login-container');
    this.userName = document.getElementById('user-name');
    this.userPhoto = document.getElementById('user-photo');
    
    // Initialize
    this.setupEventListeners();
    this.initAuthStateListener();
  }

  setupEventListeners() {
    this.loginBtn.addEventListener('click', () => this.signInWithGoogle());
    this.logoutBtn.addEventListener('click', () => this.signOut());
    this.startAuthBtn.addEventListener('click', () => this.handleStartAuth());
  }

  initAuthStateListener() {
    this.auth.onAuthStateChanged(async (user) => {
      this.currentUser = user;
      
      if (user) {
        // User is signed in
        console.log('User is signed in:', user);
        this.updateUIForSignedInUser(user);
        
        // Check if user exists in Firestore
        const userProfile = await FirebaseService.getUserProfile(user.uid);
        if (!userProfile) {
          // Create user profile if it doesn't exist
          await FirebaseService.createUserProfile(user.uid, {
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
          });
        } else {
          // Check if user is verified
          this.userVerified = userProfile.verified || false;
        }

        // Navigate to appropriate section
        if (this.userVerified) {
          app.navigateTo('dashboard-section');
          playlistManager.loadUserPlaylists();
        } else {
          app.navigateTo('verification-section');
        }
      } else {
        // User is signed out
        console.log('User is signed out');
        this.updateUIForSignedOutUser();
        app.navigateTo('auth-section');
      }
      
      // Hide loading spinner once auth state is determined
      app.hideLoading();
    });
  }

  async signInWithGoogle() {
    try {
      app.showLoading('Signing in...');
      await this.auth.signInWithPopup(this.googleProvider);
    } catch (error) {
      console.error('Error signing in with Google:', error);
      app.showMessage(`Error signing in: ${error.message}`);
      app.hideLoading();
    }
  }

  async signOut() {
    try {
      app.showLoading('Signing out...');
      await this.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      app.showMessage(`Error signing out: ${error.message}`);
      app.hideLoading();
    }
  }

  updateUIForSignedInUser(user) {
    // Update profile area
    this.userName.textContent = user.displayName;
    this.userPhoto.src = user.photoURL || 'assets/default-avatar.png';
    
    // Show/hide elements
    this.userProfile.classList.remove('hidden');
    this.loginContainer.classList.add('hidden');
  }

  updateUIForSignedOutUser() {
    // Show/hide elements
    this.userProfile.classList.add('hidden');
    this.loginContainer.classList.remove('hidden');
    
    // Reset current user
    this.currentUser = null;
    this.userVerified = false;
  }

  handleStartAuth() {
    this.signInWithGoogle();
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Check if user is logged in
  isLoggedIn() {
    return this.currentUser !== null;
  }

  // Check if user is verified
  isVerified() {
    return this.userVerified;
  }

  // Set user as verified
  async setUserVerified() {
    if (this.currentUser) {
      const updated = await FirebaseService.updateUserVerification(this.currentUser.uid, true);
      if (updated) {
        this.userVerified = true;
      }
      return updated;
    }
    return false;
  }

  // Navigate based on auth state
  handleAuthNavigation() {
    if (!this.isLoggedIn()) {
      app.navigateTo('auth-section');
      return;
    }
    
    if (!this.isVerified()) {
      app.navigateTo('verification-section');
      return;
    }
    
    app.navigateTo('dashboard-section');
    playlistManager.loadUserPlaylists();
  }
}
