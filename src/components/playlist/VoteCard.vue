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
            <template v-else-if="rankingMethod === 'ranked'">
              <div class="ranked-container">
                <p>Select your top 3 tracks:</p>
                <div class="ranked-buttons">
                  <div class="rank-selection">
                    <n-button 
                      :type="userRank === 1 ? 'primary' : 'default'" 
                      @click="setUserRank(1)"
                      class="rank-button"
                    >
                      <template #icon>
                        <n-icon color="#D4AF37"><trophy-icon /></n-icon>
                      </template>
                      1st
                    </n-button>
                    <n-button 
                      :type="userRank === 2 ? 'primary' : 'default'" 
                      @click="setUserRank(2)"
                      class="rank-button"
                    >
                      <template #icon>
                        <n-icon color="#A9A9B0"><trophy-icon /></n-icon>
                      </template>
                      2nd
                    </n-button>
                    <n-button 
                      :type="userRank === 3 ? 'primary' : 'default'" 
                      @click="setUserRank(3)"
                      class="rank-button"
                    >
                      <template #icon>
                        <n-icon color="#A97142"><trophy-icon /></n-icon>
                      </template>
                      3rd
                    </n-button>
                  </div>
                  <n-button 
                    v-if="userRank" 
                    @click="clearUserRank()"
                    class="clear-rank-button"
                  >
                    Clear Selection
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
            <template v-else-if="rankingMethod === 'ranked'">
              <div class="stats-container">
                <div class="ranked-stats">
                  <p class="ranked-stats-title">Total points: {{ currentStats.pointsTotal }}</p>
                  <div class="ranked-breakdown">
                    <div class="rank-stat">
                      <span class="rank-position">1st:</span> {{ currentStats.firstPlaceVotes }}
                    </div>
                    <div class="rank-stat">
                      <span class="rank-position">2nd:</span> {{ currentStats.secondPlaceVotes }}
                    </div>
                    <div class="rank-stat">
                      <span class="rank-position">3rd:</span> {{ currentStats.thirdPlaceVotes }}
                    </div>
                  </div>
                  <p class="ranked-explanation">Points: 1st = 3pts, 2nd = 2pts, 3rd = 1pt</p>
                </div>
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
import { MusicalNoteOutline as MusicIcon, ThumbsUpOutline as ThumbUpIcon, ThumbsDownOutline as ThumbDownIcon, HeartOutline as HeartOutlineIcon, Heart as HeartIcon, Trophy as TrophyIcon } from '@vicons/ionicons5'
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
const userRank = ref(0)
const userRatingChanged = ref(false)
const submitLoading = ref(false)
const removeLoading = ref(false)
const existingVote = ref<Vote | null>(null)
const allVotes = ref<Vote[]>([])
const otherUserRankedVotes = ref<{[key: number]: Vote}>({})

const currentStats = computed(() => {
  if (!allVotes.value.length) {
    return {
      voteCount: 0,
      averageRating: 0,
      upvotes: 0,
      downvotes: 0,
      score: 0,
      firstPlaceVotes: 0,
      secondPlaceVotes: 0,
      thirdPlaceVotes: 0,
      pointsTotal: 0
    }
  }
  const voteCount = allVotes.value.length
  const averageRating = allVotes.value.reduce((sum, v) => sum + (v.rating || 0), 0) / voteCount
  const upvotes = allVotes.value.filter(v => v.rating === 1).length
  const downvotes = allVotes.value.filter(v => v.rating === -1).length
  const score = upvotes - downvotes
  
  // For ranked voting
  const firstPlaceVotes = allVotes.value.filter(v => v.rank === 1).length
  const secondPlaceVotes = allVotes.value.filter(v => v.rank === 2).length
  const thirdPlaceVotes = allVotes.value.filter(v => v.rank === 3).length
  
  // Points calculation: 1st place = 3 points, 2nd place = 2 points, 3rd place = 1 point
  const pointsTotal = (firstPlaceVotes * 3) + (secondPlaceVotes * 2) + thirdPlaceVotes
  
  return { 
    voteCount, 
    averageRating, 
    upvotes, 
    downvotes, 
    score, 
    firstPlaceVotes, 
    secondPlaceVotes, 
    thirdPlaceVotes, 
    pointsTotal 
  }
})

function formatDuration(duration: number): string {
  if (!duration) return ''
  const min = Math.floor(duration / 60)
  const sec = Math.floor(duration % 60)
  return `${min}:${sec.toString().padStart(2, '0')}`
}

function getRatingText(rating: number): string {
  if (props.rankingMethod === 'star') {
    if (rating === 1) return 'Eh, not for me'
    if (rating === 2) return 'Getting into it'
    if (rating === 3) return 'Pretty catchy'
    if (rating === 4) return 'Really good'
    if (rating === 5) return 'Banger alert!'
    return ''
  }
  return ''
}

function ratingChanged(value: number) {
  userRating.value = value
  userRatingChanged.value = true
}

function setUserRank(rank: number) {
  // If we have an existing vote for this rank from another track, warn the user
  if (otherUserRankedVotes.value[rank]) {
    const existingTrack = otherUserRankedVotes.value[rank]
    message.warning(`You've already ranked another track as ${getRankText(rank)}. Submitting will replace that ranking.`)
  }
  // set the total rating (reverse the rank) #todo: total number of ranks could be a config option
  userRating.value = 4 - rank
  userRank.value = rank
  userRatingChanged.value = true
}

function clearUserRank() {
  userRank.value = 0
  userRatingChanged.value = true
}

function getRankText(rank: number): string {
  if (rank === 1) return '1st'
  if (rank === 2) return '2nd'
  if (rank === 3) return '3rd'
  return ''
}

async function fetchVotes() {
  try {
    // Fetch votes for this track
    allVotes.value = await playlistService.getVotesForTrack(props.playlistId, props.track.id)
    
    // If user is logged in, get their vote
    if (isLoggedIn.value) {
      existingVote.value = await playlistService.getUserVoteForTrack(
        props.playlistId, 
        props.track.id, 
        user.value?.uid || ''
      )
      
      // If they have a vote, update the local rating
      if (existingVote.value) {
        userRating.value = existingVote.value.rating || 0
        userRank.value = existingVote.value.rank || 0
      }
      
      // For ranked voting, get the user's other ranked votes for this playlist
      if (props.rankingMethod === 'ranked' && user.value) {
        const userVotes = await playlistService.getUserVotesForPlaylist(props.playlistId, user.value.uid)
        
        // Create a map of rank -> vote for quick lookup, excluding the current track
        otherUserRankedVotes.value = {}
        userVotes.forEach(vote => {
          if (vote.trackId !== props.track.id && vote.rank) {
            otherUserRankedVotes.value[vote.rank] = vote
          }
        })
      }
    }
  } catch (err) {
    console.error('Error fetching votes:', err)
    message.error('Failed to load votes')
  }
}

async function submitVote() {
  if (!isLoggedIn.value || !user.value) {
    message.error('You must be logged in to vote')
    return
  }
  
  try {
    submitLoading.value = true
    
    // Create base vote data without the rank field
    const voteData: any = {
      userId: user.value.uid,
      playlistId: props.playlistId,
      trackId: props.track.id,
      rating: userRating.value
    }
    
    // Only add rank field for ranked playlists
    if (props.rankingMethod === 'ranked') {
      voteData.rank = userRank.value
    }
    
    await playlistService.saveVote(voteData)
    
    message.success('Vote submitted successfully')
    userRatingChanged.value = false
    
    // Refetch votes to update the UI
    await fetchVotes()
  } catch (err) {
    console.error('Error submitting vote:', err)
    if (err instanceof Error) {
      if (err.message.includes('Vote changes are not allowed')) {
        message.error('Vote changes are not allowed for this playlist')
      } else {
        message.error('Failed to submit vote')
      }
    } else {
      message.error('Failed to submit vote')
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
    userRank.value = 0
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
  margin-bottom: 20px;
}

.track-content {
  display: flex;
  margin-bottom: 20px;
}

.track-image-container {
  width: 150px;
  height: 150px;
  margin-right: 20px;
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
  background-color: var(--n-color);
  border: 1px solid var(--n-border-color);
}

.voting-section {
  margin-top: 16px;
}

.voting-card, .rating-card {
  height: 100%;
}

.empty-rating-card {
  height: 100%;
}

.rating-container, .updown-container, .favorite-container, .ranked-container {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.updown-buttons {
  display: flex;
  gap: 16px;
}

.rating-text {
  margin-top: 8px;
  font-weight: bold;
}

/* Ranked voting specific styles */
.ranked-container {
  width: 100%;
}

.ranked-buttons {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.rank-selection {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  justify-content: center;
  width: 100%;
}

.rank-button {
  min-width: 90px;
  flex: 1;
}

.clear-rank-button {
  margin-top: 8px;
}

.ranked-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.ranked-stats-title {
  font-size: 1.1rem;
  font-weight: bold;
  margin-bottom: 8px;
}

.ranked-breakdown {
  display: flex;
  justify-content: space-around;
  width: 100%;
  margin: 8px 0;
}

.rank-stat {
  display: flex;
  gap: 4px;
}

.rank-position {
  font-weight: bold;
}

.ranked-explanation {
  font-size: 0.8rem;
  color: var(--n-text-color-3);
  margin-top: 8px;
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
