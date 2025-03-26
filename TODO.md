# SunoRank - TODO List

## Core Features

### Time-based Playlist Functionality
- Add ability to create time-limited voting sessions for playlists
- Allow playlist owners to set a specific duration (hours, days) for voting to remain open
- Implement countdown timer display on voting pages
- Auto-close voting when time expires and show final results
- Send notification to playlist owner when voting period ends

### Public Sharing System
- Implement a comprehensive public sharing model where:
  - Playlist owners can toggle a playlist as "public" or "private"
  - Public playlists can be viewed and voted on by non-owners (including non-logged in users)
  - Only playlist owners can modify playlist details or delete them
  - Create shareable URLs that work even for non-logged in users
  - Add view counter to track how many times a playlist has been accessed
- Create a "discovery" page for finding popular public playlists

### Twitch Integration with Animated Overlay
- Create a standalone overlay.html page designed for OBS/Twitch integration
- Implement real-time vote animations and updates using WebSockets
- Add customizable themes/colors for streamers
- Include options for displaying vote counts and rankings in an animated format
- Implement controlled reveal of results for stream events

### Testing Environment with Dummy Accounts
- Create a testing mode toggle in the app
- Generate configurable dummy accounts with different permission levels:
  - Test Admin accounts
  - Test Regular User accounts
  - Test Restricted accounts
- Implement functionality to simulate user activity (voting, creating playlists)
- Create a test data generator that populates the database with sample playlists and votes
- Add ability to reset test environment without affecting production data

## Improvements

### User Experience Enhancements
- Add dark mode toggle
- Implement proper mobile responsiveness
- Add keyboard shortcuts for common actions
- Improve accessibility (ARIA support, screen reader compatibility)
- Add more detailed onboarding tutorial for first-time users

### Voting System Enhancements
- Allow customization of voting methodology (ranked choice, approval, etc.)
- Implement vote weight system based on user reputation
- Add comment section for each vote
- Create voting analytics dashboard for playlist owners

### Performance and Security
- Implement proper Firebase security rules for all collections
- Add rate limiting to prevent API abuse
- Optimize database queries for large playlists
- Implement proper error handling throughout the application
- Add comprehensive logging system

## Stretch Goals

### API Access
- Create a documented public API for accessing playlist data
- Implement OAuth authentication for API consumers
- Add rate limiting and usage tracking

### Integration with Other Platforms
- Add ability to export rankings to other social media platforms
- Create embeddable widgets for websites and blogs
- Implement webhooks for third-party notifications