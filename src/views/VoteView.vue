<template>
  <div class="vote-container">
    <n-spin :show="loading">
      <div v-if="playlist">
        <div class="vote-header">
          <h1>Vote on Tracks</h1>
          <p>From playlist: <n-button text @click="navigateToPlaylist">{{ playlist.title }}</n-button></p>
        </div>
        <div class="track-cards">
          <VoteCard
            v-for="track in filteredTracks"
            :key="track.id"
            :track="track"
            :playlist-id="playlist.id"
            :ranking-method="playlist.rankingMethod"
            :allow-vote-changes="playlist.allowVoteChanges"
          />
        </div>
      </div>
      <div v-else-if="!loading" class="not-found">
        <n-result 
          status="404" 
          title="Playlist Not Found" 
          description="The playlist you're looking for doesn't exist or is not accessible."
        >
          <template #footer>
            <n-button type="primary" @click="$router.push('/')">
              Back to Home
            </n-button>
          </template>
        </n-result>
      </div>
    </n-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import VoteCard from '../components/playlist/VoteCard.vue'
import { useMessage } from 'naive-ui'
import { useAuth } from '../composables/useAuth'
import { Playlist, Track, Vote } from '../types/playlist'
import * as playlistService from '../firebase/playlistService'
import { 
  MusicalNoteOutline as MusicIcon,
  HeadsetOutline as HeadphonesIcon,
  ThumbsUpOutline as ThumbUpIcon,
  ThumbsDownOutline as ThumbDownIcon,
  HeartOutline as HeartOutlineIcon,
  Heart as HeartIcon
} from '@vicons/ionicons5'

const props = defineProps<{
  id: string 
}>()

const router = useRouter()
const route = useRoute()
const message = useMessage()
const { user, isLoggedIn } = useAuth()

const loading = ref(true)
const playlist = ref<Playlist | null>(null)

const trackId = computed(() => {
  return route.query.track as string
})

// Filter tracks by the track query param if present
const filteredTracks = computed(() => {
  if (!playlist.value || !playlist.value.tracks) return [];
  const trackParam = route.query.track;
  if (trackParam) {
    return playlist.value.tracks.filter(t => t.id === trackParam);
  }
  return playlist.value.tracks;
});

const navigateToPlaylist = () => {
  if (playlist.value) {
    router.push(`/playlist/${playlist.value.id}`)
  }
}

const fetchPlaylist = async () => {
  try {
    const playlistId = props.id || route.params.id as string
    if (!playlistId) {
      message.error('Invalid playlist ID')
      return
    }
    
    loading.value = true
    
    // Get the playlist
    const playlistData = await playlistService.getPlaylist(playlistId)
    
    if (!playlistData) {
      message.error('Playlist not found')
      return
    }
    
    // Check if playlist is public or if the current user is the owner
    if (!playlistData.isPublic && 
        (!isLoggedIn.value || user.value?.uid !== playlistData.userId)) {
      message.error('This playlist is private')
      playlist.value = null
      return
    }
    
    // Check if voting is enabled
    if (!playlistData.votingEnabled) {
      message.error('Voting is disabled for this playlist')
      router.push(`/playlist/${playlistId}`)
      return
    }
    
    playlist.value = playlistData
  } catch (error) {
    console.error('Error fetching playlist:', error)
    message.error('Failed to load playlist')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // Check if auth is ready before showing login message
  // Wait a short time for auth to initialize
  setTimeout(() => {
    if (!isLoggedIn.value && user.value === null) {
      message.warning('You need to log in to vote')
    }
  }, 500)
  
  fetchPlaylist()
})
</script>

<style scoped>
.vote-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.vote-header {
  margin-bottom: 24px;
  text-align: center;
}

.vote-header h1 {
  margin-bottom: 8px;
  font-size: 2rem;
}

.track-detail-card {
  margin-bottom: 24px;
}

.track-content {
  display: flex;
  gap: 24px;
}

.track-image-container {
  width: 200px;
  height: 200px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}

.track-image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.no-image {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--n-card-color);
  border: 1px solid var(--n-border-color);
}

.track-info {
  display: flex;
  flex-direction: column;
}

.track-info h2 {
  margin-top: 0;
  margin-bottom: 8px;
  font-size: 1.5rem;
}

.track-info .artist {
  margin-bottom: 16px;
  color: var(--n-text-color-2);
  font-size: 1.1rem;
}

.listen-button {
  margin-top: auto;
  margin-bottom: 16px;
  align-self: flex-start;
}

.duration {
  font-size: 0.9rem;
  color: var(--n-text-color-3);
}

.voting-section {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

@media (min-width: 768px) {
  .voting-section {
    grid-template-columns: 1fr 1fr;
  }
}

.rating-container, .updown-container, .favorite-container, .stats-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 16px 0;
}

.updown-buttons {
  display: flex;
  gap: 16px;
}

.rating-text {
  font-weight: bold;
}

.vote-actions {
  margin-top: 24px;
}

.not-found {
  margin-top: 40px;
  text-align: center;
}

@media (max-width: 768px) {
  .track-content {
    flex-direction: column;
    align-items: center;
  }
  
  .track-image-container {
    width: 100%;
    max-width: 240px;
    height: auto;
    aspect-ratio: 1/1;
  }
  
  .track-info {
    text-align: center;
    width: 100%;
  }
  
  .listen-button {
    align-self: center;
  }
}
</style>
