<template>
  <div class="overlay-container" :class="{ 'loading': loading }">
    <div v-if="loading" class="loading-overlay">
      <n-spin size="large" />
    </div>
    <template v-else>
      <div class="overlay-header">
        <h1 class="playlist-title">{{ playlist?.title || 'Playlist Rankings' }}</h1>
        <div v-if="playlist?.votingEnabled" class="voting-status">
          <n-tag type="success">Voting Enabled</n-tag>
        </div>
      </div>

      <transition-group name="rank-change" tag="div" class="rankings-container">
        <div v-for="(track, index) in topTracks" :key="track.id" class="track-card" :class="[getRankClass(index), {'animate-change': changedTracks[track.id]}]">
          <div class="rank-number">
            <div class="rank-medal" :class="getRankClass(index)">{{ index + 1 }}</div>
          </div>
          <div class="track-image">
            <img v-if="track.imageUrl" :src="track.imageUrl" alt="Track cover" />
            <n-icon v-else class="fallback-icon"><music-icon /></n-icon>
          </div>
          <div class="track-info">
            <h3 class="track-title">{{ track.title }}</h3>
            <p class="track-artist">{{ track.artist }}</p>
            <div class="track-stats">
              <template v-if="playlist?.rankingMethod === 'star'">
                <n-rate readonly :value="track.averageRating || 0" :allow-half="true" size="small" />
                <span class="score">{{ track.averageRating?.toFixed(1) || '0.0' }}</span>
              </template>
              <template v-else-if="playlist?.rankingMethod === 'updown'">
                <span class="score">{{ track.averageRating?.toFixed(0) || '0' }} points</span>
              </template>
              <template v-else-if="playlist?.rankingMethod === 'ranked'">
                <div class="rank-votes">
                  <n-tag :color="{ color: '#D4AF37', textColor: '#000' }" size="small" round>
                    <template #icon><n-icon><trophy-icon /></n-icon></template>
                    {{ track.votesByRank?.[1] || 0 }}
                  </n-tag>
                  <n-tag :color="{ color: '#A9A9B0', textColor: '#000' }" size="small" round>
                    <template #icon><n-icon><trophy-icon /></n-icon></template>
                    {{ track.votesByRank?.[2] || 0 }}
                  </n-tag>
                  <n-tag :color="{ color: '#A97142', textColor: '#000' }" size="small" round>
                    <template #icon><n-icon><trophy-icon /></n-icon></template>
                    {{ track.votesByRank?.[3] || 0 }}
                  </n-tag>
                </div>
              </template>
              <template v-else>
                <span class="score">{{ track.voteCount || 0 }} favorites</span>
              </template>
            </div>
          </div>
        </div>
      </transition-group>

      <div v-if="topTracks.length === 0" class="empty-state">
        <n-empty description="No tracks available" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { onSnapshot, collection, query, where, doc } from 'firebase/firestore'
import { db } from '../firebase/config'
import * as playlistService from '../firebase/playlistService'
import { Playlist, TrackWithRanking, Vote } from '../types/playlist'
import { MusicalNoteOutline as MusicIcon, TrophyOutline as TrophyIcon } from '@vicons/ionicons5'

const route = useRoute()
const playlistId = computed(() => route.params.id as string)
const playlist = ref<Playlist | null>(null)
const tracks = ref<TrackWithRanking[]>([])
const votes = ref<Vote[]>([])
const loading = ref(true)
const unsubscribeVotes = ref<(() => void) | null>(null)
const unsubscribePlaylist = ref<(() => void) | null>(null)

// Track previous rankings for animation purposes
const previousTracks = ref<TrackWithRanking[]>([])

// Get top 3 tracks and apply animations when changes occur
const topTracks = computed(() => {
  const top3 = tracks.value.slice(0, 3)
  return top3
})

// Keep track of which tracks have changed position or score
const changedTracks = ref<Record<string, boolean>>({});

// Ranking class based on position
const getRankClass = (index: number) => {
  if (index === 0) return 'gold'
  if (index === 1) return 'silver'
  if (index === 2) return 'bronze'
  return ''
}

// Fetch playlist data
const fetchPlaylist = async () => {
  if (!playlistId.value) return
  
  loading.value = true
  
  try {
    const playlistData = await playlistService.getPlaylist(playlistId.value)
    
    if (!playlistData) {
      console.error('Playlist not found')
      return
    }
    
    playlist.value = playlistData
    
    // Start listening for vote changes
    setupVotesListener()
  } catch (error) {
    console.error('Error fetching playlist:', error)
  } finally {
    loading.value = false
  }
}

// Setup real-time listeners for both playlist data and votes
const setupVotesListener = () => {
  if (!playlistId.value) return
  
  // Clear any existing subscriptions
  if (unsubscribeVotes.value) {
    unsubscribeVotes.value()
  }
  
  if (unsubscribePlaylist.value) {
    unsubscribePlaylist.value()
  }
  
  // 1. Listen for playlist document changes
  unsubscribePlaylist.value = onSnapshot(
    doc(db, 'playlists', playlistId.value),
    (docSnapshot) => {
      if (docSnapshot.exists()) {
        // Update playlist data
        const data = docSnapshot.data()
        playlist.value = { ...data, id: docSnapshot.id } as Playlist
      }
    },
    (error) => {
      console.error('Error listening to playlist changes:', error)
    }
  )
  
  // 2. Listen for votes collection changes
  unsubscribeVotes.value = onSnapshot(
    query(
      collection(db, 'votes'),
      where('playlistId', '==', playlistId.value)
    ),
    async (snapshot) => {
      // Store previous tracks for change detection
      previousTracks.value = [...tracks.value]
      
      // Get all current votes
      const currentVotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Vote)
      votes.value = currentVotes
      
      // Reset change tracking
      changedTracks.value = {}
      
      // Calculate new rankings if we have track data
      if (playlist.value?.tracks) {
        tracks.value = playlistService.calculateRankings(
          playlist.value.tracks,
          votes.value,
          playlist.value.rankingMethod
        )
        
        // Detect changes in position or score for animations
        detectChanges()
      }
    },
    (error) => {
      console.error('Error listening to vote changes:', error)
    }
  )
}

// Fetch votes and calculate rankings (initial load and fallback)
const fetchVotes = async () => {
  if (!playlist.value) return
  
  try {
    // Store previous tracks for change detection
    previousTracks.value = [...tracks.value]
    
    // Reset change tracking
    changedTracks.value = {}
    
    // Fetch votes
    votes.value = await playlistService.getVotesForPlaylist(playlist.value.id)
    
    // Calculate rankings
    if (playlist.value.tracks) {
      tracks.value = playlistService.calculateRankings(
        playlist.value.tracks,
        votes.value,
        playlist.value.rankingMethod
      )
      
      // Detect changes for animations
      detectChanges()
    }
  } catch (error) {
    console.error('Error fetching votes:', error)
  }
}

// Detect changes in track rankings and scores for animations
const detectChanges = () => {
  const top3Current = tracks.value.slice(0, 3)
  const top3Previous = previousTracks.value.slice(0, 3)
  
  top3Current.forEach((track, index) => {
    // Find the same track in previous rankings
    const prevIndex = top3Previous.findIndex(t => t.id === track.id)
    
    // Check if this track is new to top 3 or changed position
    if (prevIndex === -1 || prevIndex !== index) {
      changedTracks.value[track.id] = true
      return
    }
    
    // Check if score changed
    const prevTrack = top3Previous[prevIndex]
    if (prevTrack.averageRating !== track.averageRating || 
        prevTrack.voteCount !== track.voteCount) {
      changedTracks.value[track.id] = true
    }
  })
}

// Watch for route changes
watch(() => route.params.id, () => {
  fetchPlaylist()
})

let refreshInterval: NodeJS.Timeout | null = null

onMounted(() => {
  fetchPlaylist()
  
  // Set up auto-refresh every 30 seconds as a fallback
  refreshInterval = setInterval(() => {
    fetchVotes()
  }, 30000)
})

onUnmounted(() => {
  // Clean up resources
  if (unsubscribeVotes.value) {
    unsubscribeVotes.value()
  }
  if (unsubscribePlaylist.value) {
    unsubscribePlaylist.value()
  }
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<style scoped>
.overlay-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 0;
  background-color: transparent;
  height: 100vh;
  overflow: hidden;
  position: relative;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(5px);
  z-index: 10;
}

.overlay-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 10px 20px;
  background-color: rgba(0, 0, 0, 0.6);
  border-radius: 12px;
}

.playlist-title {
  margin: 0;
  font-size: 1.5rem;
  color: var(--n-text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rankings-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.track-card {
  display: flex;
  align-items: center;
  padding: 15px;
  background-color: rgba(0, 0, 0, 0.6);
  border-radius: 12px;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}

.track-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.track-card.gold {
  border-left: 4px solid #D4AF37;
}

.track-card.silver {
  border-left: 4px solid #A9A9B0;
}

.track-card.bronze {
  border-left: 4px solid #A97142;
}

.rank-number {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  margin-right: 15px;
}

.rank-medal {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.2rem;
}

.rank-medal.gold {
  background-color: #D4AF37;
  color: #000;
}

.rank-medal.silver {
  background-color: #A9A9B0;
  color: #000;
}

.rank-medal.bronze {
  background-color: #A97142;
  color: #000;
}

.track-image {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  margin-right: 15px;
  flex-shrink: 0;
  background-color: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.track-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.fallback-icon {
  font-size: 30px;
  color: var(--n-text-color-3);
}

.track-info {
  flex: 1;
  min-width: 0;
}

.track-title {
  margin: 0 0 5px;
  font-size: 1.1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-artist {
  margin: 0 0 8px;
  font-size: 0.9rem;
  color: var(--n-text-color-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-stats {
  display: flex;
  align-items: center;
  gap: 10px;
}

.score {
  font-weight: bold;
  color: var(--n-text-color-2);
}

.rank-votes {
  display: flex;
  gap: 8px;
}

.empty-state {
  padding: 40px;
  text-align: center;
  background-color: rgba(0, 0, 0, 0.6);
  border-radius: 12px;
  margin-top: 20px;
}

/* Transition animations */
.rank-change-enter-active,
.rank-change-leave-active {
  transition: all 0.5s ease;
}

.rank-change-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.rank-change-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* Animation for track changes */
.animate-change {
  animation: highlight-change 1.5s ease;
}

@keyframes highlight-change {
  0% {
    background-color: rgba(138, 107, 250, 0.3);
    transform: scale(1.01);
    box-shadow: 0 0 15px rgba(138, 107, 250, 0.5);
  }
  70% {
    background-color: rgba(138, 107, 250, 0.1);
    transform: scale(1);
    box-shadow: 0 0 5px rgba(138, 107, 250, 0.3);
  }
  100% {
    background-color: rgba(0, 0, 0, 0.6);
    transform: scale(1);
    box-shadow: none;
  }
}

/* Make responsive for overlay usage */
@media (max-width: 768px) {
  .overlay-header {
    padding: 8px 15px;
  }
  
  .playlist-title {
    font-size: 1.2rem;
  }
  
  .track-image {
    width: 50px;
    height: 50px;
  }
  
  .track-title {
    font-size: 1rem;
  }
  
  .rank-medal {
    width: 30px;
    height: 30px;
    font-size: 1rem;
  }
}

/* Specific styles for Twitch overlay usage */
@media (max-width: 480px) {
  .overlay-container {
    padding: 0 5px;
  }
  
  .track-card {
    padding: 10px;
  }
  
  .rank-number {
    margin-right: 8px;
    min-width: 30px;
  }
  
  .track-image {
    width: 40px;
    height: 40px;
    margin-right: 10px;
  }
}
</style>
