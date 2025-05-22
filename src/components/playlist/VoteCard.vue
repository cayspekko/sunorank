<template>
  <n-card class="vote-card" :bordered="false">
    <div class="track-content">
      <div class="track-image-container">
        <img v-if="track.imageUrl" :src="track.imageUrl" alt="Track cover" />
        <div v-else class="no-image">
          <n-icon size="64"><music-icon /></n-icon>
        </div>
      </div>
      <TrackInfo :track="track" />
    </div>
    <div class="voting-section">
      <n-grid :cols="2" :x-gap="16">
        <!-- Left side: Voting controls -->
        <n-gi>
          <n-card title="Rate this track" :bordered="true" class="voting-card">
            <template v-if="rankingMethod === 'star'">
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
            <template v-else-if="rankingMethod === 'updown'">
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
                <template v-if="existingVote && !allowVoteChanges">
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
                    v-if="existingVote && allowVoteChanges" 
                    @click="removeVote" 
                    :loading="removeLoading"
                  >
                    Remove Vote
                  </n-button>
                </template>
              </n-space>
            </div>
          </n-card>
        </n-gi>
        
        <!-- Right side: Current rating -->
        <n-gi>
          <n-card v-if="currentStats.voteCount > 0" title="Current Rating" :bordered="true" class="rating-card">
            <template v-if="rankingMethod === 'star'">
              <div class="stats-container">
                <n-rate 
                  readonly 
                  :value="currentStats.averageRating" 
                  :allow-half="true"
                />
                <p>{{ currentStats.averageRating.toFixed(1) }} average from {{ currentStats.voteCount }} votes</p>
              </div>
            </template>
            <template v-else-if="rankingMethod === 'updown'">
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
          <div v-else class="empty-rating-card">
            <n-card title="Current Rating" :bordered="true">
              <p>No votes yet</p>
            </n-card>
          </div>
        </n-gi>
      </n-grid>
    </div>
  </n-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useMessage } from 'naive-ui'
import { useAuth } from '../../composables/useAuth'
import { MusicalNoteOutline as MusicIcon, ThumbsUpOutline as ThumbUpIcon, ThumbsDownOutline as ThumbDownIcon, HeartOutline as HeartOutlineIcon, Heart as HeartIcon } from '@vicons/ionicons5'
import { Vote, Track, Playlist } from '../../types/playlist'
import * as playlistService from '../../firebase/playlistService'
import TrackInfo from './TrackInfo.vue'

const props = defineProps<{
  track: Track,
  playlistId: string,
  rankingMethod: string,
  allowVoteChanges: boolean
}>()

const message = useMessage()
const { user, isLoggedIn } = useAuth()
const userRating = ref(0)
const userRatingChanged = ref(false)
const submitLoading = ref(false)
const removeLoading = ref(false)
const existingVote = ref<Vote | null>(null)
const allVotes = ref<Vote[]>([])

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
  const averageRating = allVotes.value.reduce((sum, v) => sum + (v.rating || 0), 0) / voteCount
  const upvotes = allVotes.value.filter(v => v.rating === 1).length
  const downvotes = allVotes.value.filter(v => v.rating === -1).length
  const score = upvotes - downvotes
  return { voteCount, averageRating, upvotes, downvotes, score }
})

function formatDuration(duration: number): string {
  if (!duration) return ''
  const min = Math.floor(duration / 60)
  const sec = Math.floor(duration % 60)
  return `${min}:${sec.toString().padStart(2, '0')}`
}

function getRatingText(rating: number): string {
  if (props.rankingMethod === 'star') {
    if (rating === 1) return 'Terrible'
    if (rating === 2) return 'Bad'
    if (rating === 3) return 'Okay'
    if (rating === 4) return 'Good'
    if (rating === 5) return 'Amazing!'
    return ''
  }
  return ''
}

function ratingChanged(rating: number) {
  userRating.value = rating
  userRatingChanged.value = true
}

async function fetchVotes() {
  try {
    // Get all votes for this track
    allVotes.value = await playlistService.getVotesForTrack(props.playlistId, props.track.id)
    
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

async function submitVote() {
  // Double check auth status
  if (!isLoggedIn.value || !user.value) {
    message.error('You must be logged in to vote')
    return
  }
  
  if (!userRatingChanged.value) {
    message.info('No changes to save')
    return
  }
  
  // Check if this is an update and if votes can be changed
  if (existingVote.value && !props.allowVoteChanges) {
    message.error('This playlist does not allow changing votes')
    return
  }
  
  submitLoading.value = true
  
  try {
    // Use the playlistService to save the vote
    await playlistService.saveVote({
      playlistId: props.playlistId,
      trackId: props.track.id,
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

async function removeVote() {
  if (!existingVote.value || !existingVote.value.id || !user.value) {
    message.error('No vote to remove or user not logged in')
    return
  }
  
  // Check if vote changes are allowed
  if (!props.allowVoteChanges) {
    message.error('This playlist does not allow changing votes')
    return
  }
  
  removeLoading.value = true
  
  try {
    // Use the composite document ID format: userId_playlistId_trackId
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
  fetchVotes()
})
</script>

<style scoped>
.vote-card {
  margin-bottom: 24px;
}
.track-content {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16px;
}
.track-image-container {
  width: 120px;
  height: 120px;
  margin-right: 24px;
}
.track-image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}
.no-image {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #222;
  border-radius: 8px;
}
.track-info {
  flex: 1;
}
.artist-container {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}
.artist-avatar {
  margin-right: 8px;
}
.artist {
  margin: 0;
}
.voting-section {
  margin-top: 24px;
}
.voting-card, .rating-card {
  height: 100%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
.empty-rating-card {
  height: 100%;
}
.rating-container, .updown-container, .favorite-container {
  margin-bottom: 16px;
}
.vote-actions {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
.stats-container {
  margin-top: 8px;
  text-align: center;
}
.updown-buttons {
  display: flex;
  justify-content: center;
  gap: 16px;
}
.rating-text {
  margin-top: 8px;
  font-weight: bold;
  text-align: center;
}
.track-tags {
  font-size: 0.8rem;
}
.title-container {
  margin: 0 0 4px 0;
}

.track-title {
  font-size: 1.1rem;
  font-weight: bold;
}

.duration {
  display: flex;
  align-items: center;
  color: var(--n-text-color-2);
  font-size: 0.9rem;
}

.duration-icon {
  margin-right: 4px;
  color: var(--n-text-color-3);
}
</style>
