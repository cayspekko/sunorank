<template>
  <div class="vote-container">
    <n-spin :show="loading">
      <div v-if="playlist && track">
        <div class="vote-header">
          <h1>Vote on Track</h1>
          <p>From playlist: <n-button text @click="navigateToPlaylist">{{ playlist.title }}</n-button></p>
        </div>
        
        <n-card class="track-detail-card" :bordered="false">
          <div class="track-content">
            <div class="track-image-container">
              <img v-if="track.imageUrl" :src="track.imageUrl" alt="Track cover" />
              <div v-else class="no-image">
                <n-icon size="64"><music-icon /></n-icon>
              </div>
            </div>
            <div class="track-info">
              <h2>{{ track.title }}</h2>
              <p class="artist">{{ track.artist }}</p>
              
              <n-button 
                class="listen-button" 
                type="primary" 
                tag="a" 
                :href="'https://suno.com/song/' + track.id"
                target="_blank"
              >
                <template #icon>
                  <n-icon><headphones-icon /></n-icon>
                </template>
                Listen on Suno
              </n-button>
              
              <div v-if="track.duration" class="duration">
                Duration: {{ formatDuration(track.duration) }}
              </div>
            </div>
          </div>
        </n-card>
        
        <div class="voting-section">
          <n-card title="Rate this track" :bordered="false">
            <template v-if="playlist.rankingMethod === 'star'">
              <div class="rating-container">
                <p>Your rating:</p>
                <n-rate 
                  v-model:value="userRating" 
                  :count="5"
                  :default-value="existingVote?.rating || 0"
                  @update:value="ratingChanged"
                />
                <p v-if="userRating" class="rating-text">
                  {{ getRatingText(userRating) }}
                </p>
              </div>
            </template>
            
            <template v-else-if="playlist.rankingMethod === 'updown'">
              <div class="updown-container">
                <p>Your vote:</p>
                <div class="updown-buttons">
                  <n-button 
                    :type="userRating === 1 ? 'primary' : 'default'" 
                    @click="userRating = 1; ratingChanged(1)"
                  >
                    <template #icon>
                      <n-icon><thumb-up-icon /></n-icon>
                    </template>
                    Upvote
                  </n-button>
                  <n-button 
                    :type="userRating === -1 ? 'error' : 'default'" 
                    @click="userRating = -1; ratingChanged(-1)"
                  >
                    <template #icon>
                      <n-icon><thumb-down-icon /></n-icon>
                    </template>
                    Downvote
                  </n-button>
                </div>
              </div>
            </template>
            
            <template v-else>
              <div class="favorite-container">
                <p>Add to favorites?</p>
                <n-button 
                  :type="userRating === 1 ? 'primary' : 'default'" 
                  @click="userRating = userRating === 1 ? 0 : 1; ratingChanged(userRating)"
                >
                  <template #icon>
                    <n-icon>
                      <heart-icon v-if="userRating === 1" />
                      <heart-outline-icon v-else />
                    </n-icon>
                  </template>
                  {{ userRating === 1 ? 'Favorited' : 'Add to Favorites' }}
                </n-button>
              </div>
            </template>
            
            <div class="vote-actions">
              <n-space justify="center">
                <template v-if="existingVote && !playlist.allowVoteChanges">
                  <n-alert type="warning" title="Vote locked">
                    Your vote has been recorded. This playlist does not allow changing votes.
                  </n-alert>
                </template>
                <template v-else>
                  <n-button 
                    type="primary" 
                    :disabled="!userRatingChanged || submitLoading" 
                    :loading="submitLoading"
                    @click="submitVote"
                  >
                    {{ existingVote ? 'Update Vote' : 'Submit Vote' }}
                  </n-button>
                  
                  <n-button 
                    v-if="existingVote && playlist.allowVoteChanges" 
                    @click="removeVote" 
                    :loading="removeLoading"
                  >
                    Remove Vote
                  </n-button>
                </template>
              </n-space>
            </div>
          </n-card>
          
          <div class="current-rating" v-if="currentStats.voteCount > 0">
            <n-card title="Current Rating" :bordered="false">
              <template v-if="playlist.rankingMethod === 'star'">
                <div class="stats-container">
                  <n-rate 
                    readonly 
                    :value="currentStats.averageRating" 
                    :allow-half="true"
                  />
                  <p>{{ currentStats.averageRating.toFixed(1) }} average from {{ currentStats.voteCount }} votes</p>
                </div>
              </template>
              
              <template v-else-if="playlist.rankingMethod === 'updown'">
                <div class="stats-container">
                  <p>
                    Score: {{ currentStats.score }}
                    ({{ currentStats.upvotes }} upvotes, {{ currentStats.downvotes }} downvotes)
                  </p>
                </div>
              </template>
              
              <template v-else>
                <div class="stats-container">
                  <p>{{ currentStats.voteCount }} users have favorited this track</p>
                </div>
              </template>
            </n-card>
          </div>
        </div>
      </div>
      
      <div v-else-if="!loading && (!playlist || !track)" class="not-found">
        <n-result 
          status="404" 
          title="Track Not Found" 
          description="The track or playlist you're looking for doesn't exist or is private."
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
const submitLoading = ref(false)
const removeLoading = ref(false)
const playlist = ref<Playlist | null>(null)
const track = ref<Track | null>(null)
const allVotes = ref<Vote[]>([])
const existingVote = ref<Vote | null>(null)
const userRating = ref(0)
const userRatingChanged = ref(false)

const trackId = computed(() => {
  return route.query.track as string
})

const currentStats = computed(() => {
  if (!allVotes.value.length) {
    return {
      voteCount: 0,
      averageRating: 0,
      upvotes: 0,
      downvotes: 0,
      score: 0
    }
  }
  
  const voteCount = allVotes.value.length
  
  if (playlist.value?.rankingMethod === 'star') {
    // Calculate average star rating
    const sum = allVotes.value.reduce((acc, vote) => acc + vote.rating, 0)
    return {
      voteCount,
      averageRating: sum / voteCount,
      upvotes: 0,
      downvotes: 0,
      score: 0
    }
  } else if (playlist.value?.rankingMethod === 'updown') {
    // For updown voting
    const upvotes = allVotes.value.filter(v => v.rating > 0).length
    const downvotes = allVotes.value.filter(v => v.rating < 0).length
    const score = upvotes - downvotes
    
    return {
      voteCount,
      averageRating: 0,
      upvotes,
      downvotes,
      score
    }
  } else {
    // For favorites
    return {
      voteCount,
      averageRating: 0,
      upvotes: voteCount,
      downvotes: 0,
      score: voteCount
    }
  }
})

const formatDuration = (duration: number): string => {
  const minutes = Math.floor(duration / 60)
  const seconds = Math.floor(duration % 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const getRatingText = (rating: number): string => {
  switch (rating) {
    case 1: return 'Poor'
    case 2: return 'Fair'
    case 3: return 'Good'
    case 4: return 'Great'
    case 5: return 'Excellent'
    default: return ''
  }
}

const ratingChanged = (rating: number) => {
  userRating.value = rating
  userRatingChanged.value = true
}

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
    
    // Get the specific track
    if (trackId.value && playlist.value.tracks) {
      const foundTrack = playlist.value.tracks.find(t => t.id === trackId.value)
      if (foundTrack) {
        track.value = foundTrack
      } else {
        message.error('Track not found in playlist')
      }
    } else if (playlist.value.tracks && playlist.value.tracks.length > 0) {
      // If no track specified, use the first one
      track.value = playlist.value.tracks[0]
    }
    
    // Fetch votes for this track
    await fetchVotes()
  } catch (error) {
    console.error('Error fetching playlist:', error)
    message.error('Failed to load playlist')
  } finally {
    loading.value = false
  }
}

const fetchVotes = async () => {
  if (!playlist.value || !track.value) return
  
  try {
    // Get all votes for this track
    allVotes.value = await playlistService.getVotesForTrack(playlist.value.id, track.value.id)
    
    // Check if user has already voted
    if (isLoggedIn.value && user.value) {
      const userVote = allVotes.value.find(vote => vote.userId === user.value?.uid)
      if (userVote) {
        existingVote.value = userVote
        userRating.value = userVote.rating
      }
    }
  } catch (error) {
    console.error('Error fetching votes:', error)
    message.error('Failed to load votes')
  }
}

const submitVote = async () => {
  // Double check auth status
  if (!isLoggedIn.value || !user.value) {
    console.log('Auth state:', { isLoggedIn: isLoggedIn.value, user: !!user.value })
    message.error('You must be logged in to vote')
    return
  }
  
  if (!playlist.value || !track.value) {
    message.error('Invalid playlist or track')
    return
  }
  
  if (!userRatingChanged.value) {
    message.info('No changes to save')
    return
  }
  
  // Check if this is an update and if votes can be changed
  if (existingVote.value && !playlist.value.allowVoteChanges) {
    message.error('This playlist does not allow changing votes')
    return
  }
  
  submitLoading.value = true
  
  try {
    // Use the playlistService to save the vote
    await playlistService.saveVote({
      playlistId: playlist.value.id,
      trackId: track.value.id,
      userId: user.value.uid,
      rating: userRating.value
    })
    
    message.success(existingVote.value ? 'Vote updated successfully' : 'Vote submitted successfully')
    
    // Refresh votes
    await fetchVotes()
    userRatingChanged.value = false
  } catch (error) {
    console.error('Error saving vote:', error)
    // Display more specific error message if available
    if (error instanceof Error) {
      message.error(error.message)
    } else {
      message.error('Failed to save vote')
    }
  } finally {
    submitLoading.value = false
  }
}

const removeVote = async () => {
  if (!existingVote.value || !existingVote.value.id || !user.value) {
    message.error('No vote to remove or user not logged in')
    return
  }
  
  // Check if vote changes are allowed
  if (!playlist.value?.allowVoteChanges) {
    message.error('This playlist does not allow changing votes')
    return
  }
  
  removeLoading.value = true
  
  try {
    await playlistService.deleteVote(existingVote.value.id, user.value.uid)
    
    message.success('Vote removed successfully')
    
    // Reset UI state
    existingVote.value = null
    userRating.value = 0
    userRatingChanged.value = false
    
    // Refresh votes
    await fetchVotes()
  } catch (error) {
    console.error('Error removing vote:', error)
    // Show specific error message if available
    if (error instanceof Error) {
      message.error(error.message) 
    } else {
      message.error('Failed to remove vote')
    }
  } finally {
    removeLoading.value = false
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
