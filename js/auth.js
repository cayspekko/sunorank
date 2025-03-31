// Authentication functionality
class AuthService {
  constructor() {
    this.auth = firebase.auth();
    this.googleProvider = new firebase.auth.GoogleAuthProvider();
    this.currentUser = null;
    this.userVerified = false;
    this.sunoProfile = null;

    // DOM Elements
    this.loginBtn = document.getElementById('login-btn');
    this.logoutBtn = document.getElementById('logout-btn');
    this.startAuthBtn = document.getElementById('start-auth-btn');
    this.userProfile = document.getElementById('user-profile');
    this.loginContainer = document.getElementById('login-container');
    this.userName = document.getElementById('user-name');
    this.userPhoto = document.getElementById('user-photo');
    this.sunoProfileLink = document.getElementById('suno-profile-link');
    this.sunoAvatar = document.getElementById('suno-avatar');
    
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
      console.log('Auth state changed:', user ? 'User signed in' : 'User signed out');
      this.currentUser = user;
      
      if (user) {
        // User is signed in
        console.log('User is signed in:', user.uid);
        this.updateUIForSignedInUser(user);
        
        // Check if user exists in Firestore
        const userProfile = await FirebaseService.getUserProfile(user.uid);
        if (!userProfile) {
          // Create user profile if it doesn't exist
          console.log('Creating new user profile');
          await FirebaseService.createUserProfile(user.uid, {
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
          });
        } else {
          // Check if user is verified and has Suno profile
          console.log('User profile found, verified status:', userProfile.verified);
          this.userVerified = userProfile.verified || userProfile.isSunoVerified || false;
          
          // Store Suno profile data if available
          if (userProfile.sunoProfile) {
            console.log('Suno profile found:', userProfile.sunoProfile);
            this.sunoProfile = userProfile.sunoProfile;
            this.updateSunoProfileUI();
          }
        }

        // Let the router handle navigation based on current URL
        if (this.userVerified) {
          // If current hash is empty or auth-related, redirect to dashboard
          if (!window.location.hash || window.location.hash === '#' || window.location.hash.startsWith('#auth')) {
            console.log('Redirecting to dashboard after auth');
            app.navigateTo('dashboard-section');
            // Ensure playlists are loaded
            setTimeout(() => {
              console.log('Loading playlists after auth redirect');
              playlistManager.loadUserPlaylists();
            }, 200);
          } else {
            // Otherwise let the router handle the current hash
            console.log('Handling existing route after auth:', window.location.hash);
            app.handleRouteChange();
          }
        } else {
          console.log('User not verified, redirecting to verification');
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

  // Helper method to check if user is logged in
  isLoggedIn() {
    return !!this.currentUser;
  }

  // Helper method to check if user is verified
  isVerified() {
    return this.userVerified;
  }
  
  // Helper method to get current user
  getCurrentUser() {
    return this.currentUser;
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

  async refreshUserState() {
    if (!this.isLoggedIn()) return;
    
    try {
      // Fetch the latest user profile from Firestore
      const userId = this.getCurrentUser().uid;
      const userProfile = await FirebaseService.getUserProfile(userId);
      
      if (userProfile) {
        console.log('Refreshed user profile:', userProfile);
        this.userVerified = userProfile.verified || userProfile.isSunoVerified || false;
        
        // Update Suno profile if available
        if (userProfile.sunoProfile) {
          this.sunoProfile = userProfile.sunoProfile;
          this.updateSunoProfileUI();
        }
      }
    } catch (error) {
      console.error('Error refreshing user state:', error);
    }
  }

  updateSunoProfileUI() {
    if (this.sunoProfile) {
      // Set the link to the Suno profile using the handle
      this.sunoProfileLink.href = `https://suno.com/@${this.sunoProfile.handle}`;
      // Use the avatar image URL from the profile
      this.sunoAvatar.src = this.sunoProfile.avatarImageUrl;
      // Show the Suno profile link and avatar
      this.sunoProfileLink.classList.remove('hidden');
    } else {
      this.sunoProfileLink.classList.add('hidden');
    }
  }
}
