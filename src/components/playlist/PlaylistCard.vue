<template>
  <n-card hoverable class="playlist-card">
    <template #cover>
      <div class="card-image-container">
        <img 
          :src="playlist.imageUrl || defaultImage" 
          alt="Playlist cover" 
          class="card-image"
          @error="handleImageError"
        />
      </div>
    </template>
    
    <template #header>
      <div class="card-header">
        <h3 class="playlist-title">{{ playlist.title }}</h3>
      </div>
    </template>
    
    <div class="card-content">
      <p class="playlist-description">{{ playlist.description }}</p>
      <p class="playlist-tracks">{{ trackCount }} tracks</p>
      <p class="playlist-updated">Last updated: {{ formattedDate }}</p>
    </div>
    
    <template #action>
      <div class="card-actions">
        <div class="button-row">
          <n-button type="primary" size="small" @click="emitView">
            <template #icon><n-icon><eye-outline /></n-icon></template>
            View
          </n-button>
          <n-button type="info" size="small" @click="emitEdit">
            <template #icon><n-icon><create-outline /></n-icon></template>
            Edit
          </n-button>
        </div>
        <div class="button-row">
          <n-button size="small" @click="emitShare">
            <template #icon><n-icon><share-social-outline /></n-icon></template>
            Share
          </n-button>
          <n-button type="error" size="small" @click="emitDelete">
            <template #icon><n-icon><trash-outline /></n-icon></template>
            Delete
          </n-button>
        </div>
      </div>
    </template>
  </n-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { 
  EyeOutline, 
  CreateOutline, 
  ShareSocialOutline, 
  TrashOutline 
} from '@vicons/ionicons5'
import type { Playlist } from '../../types/playlist'

const props = defineProps<{
  playlist: Playlist
}>()

const emit = defineEmits<{
  (e: 'view', playlist: Playlist): void
  (e: 'edit', playlist: Playlist): void
  (e: 'delete', playlist: Playlist): void
  (e: 'share', playlist: Playlist): void
}>()

// Default placeholder image
const defaultImage = ref('/images/default-playlist.jpg')

// Handle image loading errors
const handleImageError = (e: Event) => {
  if (e.target) {
    (e.target as HTMLImageElement).src = defaultImage.value
  }
}

// Format the date
const formattedDate = computed(() => {
  const date = props.playlist.updatedAt instanceof Date 
    ? props.playlist.updatedAt 
    : new Date(props.playlist.updatedAt)
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
})

// Get track count
const trackCount = computed(() => {
  return props.playlist.tracks?.length || 0
})

// Event emitters
const emitView = () => emit('view', props.playlist)
const emitEdit = () => emit('edit', props.playlist)
const emitDelete = () => emit('delete', props.playlist)
const emitShare = () => emit('share', props.playlist)
</script>

<style scoped>
.playlist-card {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.card-image-container {
  width: 100%;
  height: 200px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 8px 8px 0 0;
}

.card-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background-color: #191919; /* Dark background for the padding */
}

.card-header {
  padding: 8px 0;
}

.playlist-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-content {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.playlist-description {
  margin-top: 0;
  margin-bottom: 6px;
  font-size: 0.85rem;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  color: var(--n-text-color-2);
}

.playlist-tracks, .playlist-updated {
  margin: 4px 0;
  font-size: 0.8rem;
  color: var(--n-text-color-3);
}

.card-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.button-row {
  display: flex;
  gap: 8px;
  width: 100%;
}

.button-row n-button,
.button-row button {
  flex: 1;
}
</style>
