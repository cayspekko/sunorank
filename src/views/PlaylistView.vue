<template>
  <div class="playlist-container">
    <playlist-modal 
      v-if="playlist"
      :show="showPlaylistModal" 
      :playlist="playlist" 
      @update:show="showPlaylistModal = $event"
      @updated="handlePlaylistUpdated"
    />
    <n-spin :show="loading">
      <div v-if="playlist">
        <div class="playlist-header">
          <div class="playlist-content">
            <div class="playlist-image-title">
              <n-avatar
                v-if="playlist.imageUrl"
                :src="playlist.imageUrl"
                :size="100"
                round
              />
              <div class="title-info">
                <h1>{{ playlist.title }}</h1>
                <p>{{ playlist.description }}</p>
                <p class="meta-info">
                  {{ playlist.tracks?.length || 0 }} tracks • 
                  Created {{ formatDate(playlist.createdAt) }}
                </p>
              </div>
            </div>
            
            <div class="playlist-actions">
              <n-space>
                <!-- Share button - available to everyone -->
                <n-button @click="sharePlaylist(playlist)">
                  <template #icon>
                    <n-icon><share-icon /></n-icon>
                  </template>
                  Share
                </n-button>
                
                <!-- Edit button - only for owner -->
                <n-button 
                  v-if="isOwner(playlist)" 
                  type="primary" 
                  @click="openEditModal(playlist)"
                >
                  <template #icon>
                    <n-icon><edit-icon /></n-icon>
                  </template>
                  Edit
                </n-button>
                
                <!-- Delete button - only for owner -->
                <n-popconfirm
                  v-if="isOwner(playlist)"
                  positive-text="Delete"
                  negative-text="Cancel"
                  @positive-click="handleDeletePlaylist(playlist)"
                >
                  <template #trigger>
                    <n-button type="error">
                      <template #icon>
                        <n-icon><trash-icon /></n-icon>
                      </template>
                      Delete
                    </n-button>
                  </template>
                  Are you sure you want to delete this playlist? This action cannot be undone.
                </n-popconfirm>
              </n-space>
            </div>
          </div>
        </div>

        <div class="ranking-info">
          <n-tag type="info">{{ getRankingMethodLabel() }}</n-tag>
          <n-tag v-if="playlist.votingEnabled" type="success">Voting Enabled</n-tag>
          <n-tag v-else type="warning">Voting Disabled</n-tag>
        </div>

        <n-divider />

        <div class="tracks-container">
          <div v-if="tracksWithRanking.length === 0" class="empty-state">
            <n-empty description="This playlist is empty" />
          </div>
          <div v-else class="track-list">
            <track-card 
              v-for="track in tracksWithRanking" 
              :key="track.id" 
              :track="track"
              :ranking-method="playlist.rankingMethod"
            >
              <template #actions>
                <n-button 
                  v-if="playlist.votingEnabled" 
                  type="primary"
                  @click="navigateToVote(track)"
                >
                  Vote
                </n-button>
              </template>
            </track-card>
          </div>
        </div>
      </div>
      <div v-else-if="!loading" class="not-found">
        <n-result 
          status="404" 
          title="Playlist Not Found" 
          description="The playlist you're looking for doesn't exist or is private."
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
import { useMessage } from 'naive-ui'
import { useAuth } from '../composables/useAuth'
import { usePlaylistActions } from '../composables/usePlaylistActions'
import { Playlist, TrackWithRanking, Vote } from '../types/playlist'
import { 
  MusicalNoteOutline as MusicIcon,
  ShareSocialOutline as ShareIcon,
  TrashOutline as TrashIcon,
  PencilOutline as EditIcon
} from '@vicons/ionicons5'
import TrackCard from '../components/playlist/TrackCard.vue'
import PlaylistModal from '../components/playlist/PlaylistModal.vue'
import * as playlistService from '../firebase/playlistService'

const props = defineProps<{
  id: string 
}>()

const router = useRouter()
const route = useRoute()
const message = useMessage()
const { user, isLoggedIn } = useAuth()
// Import and use the playlist actions composable
const { isOwner, sharePlaylist, deletePlaylist } = usePlaylistActions()

const loading = ref(true)
const playlist = ref<Playlist | null>(null)
const votes = ref<Vote[]>([])
const showPlaylistModal = ref(false)

const tracksWithRanking = computed<TrackWithRanking[]>(() => {
  if (!playlist.value?.tracks || !playlist.value?.rankingMethod) return []
  
  return playlistService.calculateRankings(
    playlist.value.tracks,
    votes.value,
    playlist.value.rankingMethod,
    user.value?.uid
  )
})

// Formatters and helpers

const formatDate = (timestamp: Date | number): string => {
  if (!timestamp) return ''
  
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
  return date.toLocaleDateString()
}

const getRankingMethodLabel = (): string => {
  if (!playlist.value) return ''
  
  switch (playlist.value.rankingMethod) {
    case 'star':
      return 'Star Rating'
    case 'updown':
      return 'Upvote/Downvote'
    case 'favorite':
      return 'Favorites'
    default:
      return 'Rating'
  }
}

const navigateToVote = (track: TrackWithRanking) => {
  router.push(`/vote/${playlist.value?.id}?track=${track.id}`)
}

// Playlist action methods
const openEditModal = (playlist: Playlist) => {
  if (!isOwner(playlist)) {
    message.error('You can only edit your own playlists')
    return
  }
  showPlaylistModal.value = true
}

const handleDeletePlaylist = async (playlistToDelete: Playlist) => {
  const success = await deletePlaylist(playlistToDelete)
  
  if (success) {
    // Navigate back to dashboard after successful deletion
    router.push('/dashboard')
  }
  // No need to handle the false case as the deletePlaylist function already shows error messages
}

const handlePlaylistUpdated = (updatedPlaylist: Playlist) => {
  if (playlist.value) {
    playlist.value = updatedPlaylist
    message.success('Playlist updated successfully')
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
    
    playlist.value = playlistData
    
    // Fetch votes for this playlist
    await fetchVotes()
  } catch (error) {
    console.error('Error fetching playlist:', error)
    message.error('Failed to load playlist')
  } finally {
    loading.value = false
  }
}

const fetchVotes = async () => {
  if (!playlist.value) return
  
  try {
    votes.value = await playlistService.getVotesForPlaylist(playlist.value.id)
  } catch (error) {
    console.error('Error fetching votes:', error)
    message.error('Failed to load votes')
  }
}

onMounted(() => {
  fetchPlaylist()
})
</script>

<style scoped>
.playlist-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.playlist-header {
  margin-bottom: 20px;
}

.playlist-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 20px;
}

.playlist-image-title {
  display: flex;
  gap: 20px;
  flex: 1;
}

.playlist-actions {
  display: flex;
  align-items: flex-start;
  padding-top: 10px;
}

.title-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.title-info h1 {
  margin: 0 0 8px 0;
  font-size: 2rem;
}

.meta-info {
  color: var(--n-text-color-disabled);
  font-size: 0.9rem;
}

.ranking-info {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.tracks-container {
  margin-top: 20px;
}

.track-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.track-card {
  transition: all 0.2s ease;
}

.track-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.track-image {
  width: 80px;
  height: 80px;
  border-radius: 4px;
  overflow: hidden;
}

.track-image img {
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
  justify-content: center;
}

.track-info h3 {
  margin: 0 0 4px 0;
  font-size: 1.1rem;
}

.track-info p {
  margin: 0 0 8px 0;
  color: var(--n-text-color-2);
}

.rating-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.track-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
}

.rank-number {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--n-text-color-3);
}

.empty-state, .not-found {
  margin-top: 40px;
  text-align: center;
}
</style>
