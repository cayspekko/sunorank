<template>
  <div class="track-info">
    <div class="title-container">
      <n-button class="track-title" text tag="a" :href="'https://suno.com/song/' + track.id" target="_blank">
        {{ track.title }}
      </n-button>
      <div v-if="track.duration" class="duration">
        <n-icon class="duration-icon"><time-outline-icon /></n-icon>
        {{ formatDuration(track.duration) }}
      </div>
    </div>
    <p v-if="track.tags" class="track-tags">{{ track.tags }}</p>
    <div class="artist-container">
      <n-avatar v-if="track.avatarImageUrl" :src="track.avatarImageUrl" size="small" round class="artist-avatar" />
      <p class="artist">{{ track.artist }}</p>
    </div>
    <slot name="rating-info"></slot>
  </div>
</template>

<script setup lang="ts">
import { MusicalNoteOutline as MusicIcon, TimeOutline as TimeOutlineIcon } from '@vicons/ionicons5'
import { Track } from '../../types/playlist'

defineProps<{
  track: Track
}>()

function formatDuration(duration: number): string {
  if (!duration) return ''
  const min = Math.floor(duration / 60)
  const sec = Math.floor(duration % 60)
  return `${min}:${sec.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.track-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.title-container {
  margin: 0 0 4px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.track-title {
  font-size: 1.1rem;
  font-weight: bold;
}

.duration {
  display: flex;
  align-items: center;
  font-size: 0.75rem;
  color: var(--n-text-color-3);
  background-color: rgba(255, 255, 255, 0.1);
  padding: 2px 6px;
  border-radius: 10px;
  white-space: nowrap;
  margin-left: 8px;
  width: fit-content;
  align-self: center;
}

.track-tags {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  margin: 4px 0 8px 0;
  line-height: 1.2;
}

.duration-icon {
  margin-right: 4px;
  font-size: 0.75rem;
}

.artist-container {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
}

.artist-avatar {
  margin-right: 8px;
}

.artist {
  margin: 0;
}

.track-tags {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  margin: 2px 0 8px 0;
}

.duration {
  display: flex;
  align-items: center;
  color: var(--n-text-color-2);
  font-size: 0.75rem;
}

.duration-icon {
  margin-right: 2px;
  color: var(--n-text-color-3);
}
</style>
