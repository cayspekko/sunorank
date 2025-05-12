<template>
  <n-card 
    class="track-card"
    :bordered="false"
  >
    <n-grid :x-gap="12" :cols="12">
      <n-gi :span="1">
        <div class="rank-number">{{ track.rank }}</div>
      </n-gi>
      <n-gi :span="3">
        <div class="track-image">
          <img v-if="track.imageUrl" :src="track.imageUrl" alt="Track cover" />
          <div v-else class="no-image">
            <n-icon><music-icon /></n-icon>
          </div>
        </div>
      </n-gi>
      <n-gi :span="6">
        <div class="track-info">
          <h3>
            <n-button text tag="a" :href="track.audioUrl" target="_blank">
              {{ track.title }}
            </n-button>
          </h3>
          <p>{{ track.artist }}</p>
          <div v-if="track.voteCount !== undefined" class="rating-info">
            <template v-if="rankingMethod === 'star'">
              <n-rate 
                readonly 
                :value="track.averageRating || 0" 
                :allow-half="true"
              />
              <span>({{ track.averageRating?.toFixed(1) || '0.0' }}) - {{ track.voteCount }} votes</span>
            </template>
            <template v-else-if="rankingMethod === 'updown'">
              <span>Score: {{ track.averageRating?.toFixed(0) || '0' }} ({{ track.voteCount }} votes)</span>
            </template>
            <template v-else>
              <span>{{ track.voteCount }} favorites</span>
            </template>
          </div>
        </div>
      </n-gi>
      <n-gi :span="2">
        <div class="track-actions">
          <slot name="actions"></slot>
        </div>
      </n-gi>
    </n-grid>
  </n-card>
</template>

<script setup lang="ts">
import { MusicalNoteOutline as MusicIcon } from '@vicons/ionicons5'
import { TrackWithRanking, RankingMethod } from '../../types/playlist'

defineProps<{
  track: TrackWithRanking,
  rankingMethod: RankingMethod
}>()
</script>

<style scoped>
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
</style>
