# SunoRank

SunoRank is a client-side ranking application that uses Firebase as the backend to create and vote on rankings for playlists. The application allows users to input a playlist and enables live ranking through a ranked choice voting mechanism where users select their top 3 choices.

## Features

- **Google Authentication**: Users sign in using their Google account
- **Suno Account Verification**: Verify ownership of a Suno account by generating a verification code and adding it to a Suno song
- **Create Playlists**: Add items to create custom playlists for ranking
- **Ranked Choice Voting**: Users select their top 3 choices
- **Live Rankings**: View current rankings based on votes
- **Share Playlists**: Share playlists with others via a unique URL

## Setup Instructions

### 1. Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the setup instructions
3. Once your project is created, register a web app by clicking on the web icon
4. Copy the Firebase configuration object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

5. Update the `firebaseConfig` object in `js/config.js` with your configuration values

### 2. Set Up Firebase Authentication

1. In the Firebase Console, go to "Authentication"
2. Click on "Sign-in method"
3. Enable "Google" as a sign-in provider and configure it

### 3. Set Up Firebase Firestore

1. In the Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Start in production mode or test mode (you can change this later)
4. Select a region for your database
5. Create the following collections:
   - `users`
   - `playlists`
   - `votes`

### 4. Enable GitHub Pages

1. Push your code to a GitHub repository
2. Go to your repository settings
3. Scroll down to "GitHub Pages"
4. Select the branch you want to deploy (usually `main` or `master`)
5. Click Save
6. Your site will be published at `https://<username>.github.io/<repository-name>/`

## Local Development

To test the application locally, you can use a simple HTTP server:

```bash
# If you have Python installed
python -m http.server

# If you have Node.js installed
npx serve
```

## Project Structure

- `index.html` - Main HTML file
- `styles.css` - CSS styles for the application
- `js/`
  - `config.js` - Firebase configuration and database helper functions
  - `auth.js` - Authentication functionality
  - `verification.js` - Suno account verification functionality
  - `playlist.js` - Playlist management functionality
  - `voting.js` - Voting functionality
  - `app.js` - Main application logic

## Important Notes

- This application is client-side only and uses Firebase for backend storage
- For the Suno verification process, this implementation uses a simulated verification check since direct API access to Suno might not be available
- In a production environment, you should implement proper security rules in Firebase to protect your data

## Security

### Firebase API Keys in Client-Side Code

Firebase API keys for web applications are **designed to be public** and included in client-side code. Unlike traditional API keys:

- They only identify your project with Google's servers
- They don't provide unrestricted access to your Firebase resources
- They're restricted by Firebase Security Rules and other security measures

However, to properly secure your application:

1. **Set up Firebase Security Rules**: In the Firebase Console, go to Firestore Database → Rules and implement rules that restrict access to your data. Example:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only authenticated users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Playlists can be read by anyone but only created/updated by authenticated users
    match /playlists/{playlistId} {
      allow read: if true;
      allow create, update: if request.auth != null;
      allow delete: if request.auth != null && request.auth.uid == resource.data.createdBy;
    }
    
    // Votes can be read by anyone but only created by authenticated users
    match /votes/{voteId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```

2. **Restrict Your API Key**:
   - Go to the Google Cloud Console → APIs & Services → Credentials
   - Find your API key and click "Edit"
   - Under "Application restrictions," choose "HTTP referrers" and add your GitHub Pages domain
   - Under "API restrictions," limit the key to only the Firebase services you need

3. **Use Authentication**: Always require authentication for sensitive operations, which your app already implements

These measures, when combined, provide adequate security for a client-side Firebase application.

## License

MIT