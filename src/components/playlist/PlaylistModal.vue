<template>
  <n-modal v-model:show="showLocal" :mask-closable="false">
    <n-card
      style="width: 600px; max-width: 90vw"
      :title="isEdit ? 'Edit Playlist' : 'Create New Playlist'"
      :bordered="false"
      size="huge"
      role="dialog"
    >
      <n-form
        ref="formRef"
        :model="formValue"
        :rules="rules"
      >
        <n-form-item path="sunoUrl" label="Import from Suno (Optional)">
          <n-input-group>
            <n-input v-model:value="sunoPlaylistUrl" placeholder="Paste a Suno playlist or song URL" />
            <n-button :loading="importLoading" @click="importFromSuno">Import</n-button>
          </n-input-group>
          <template #feedback>
            <span v-if="importError" style="color: var(--n-error-color)">{{ importError }}</span>
            <span v-else-if="importSuccess" style="color: var(--n-success-color)">{{ importSuccess }}</span>
          </template>
        </n-form-item>

        <n-form-item path="title" label="Title">
          <n-input v-model:value="formValue.title" placeholder="Playlist title" />
        </n-form-item>

        <n-form-item path="description" label="Description">
          <n-input
            v-model:value="formValue.description"
            type="textarea"
            placeholder="Describe your playlist"
            :rows="3"
          />
        </n-form-item>

        <n-form-item path="imageUrl" label="Cover Image URL (optional)">
          <n-input v-model:value="formValue.imageUrl" placeholder="https://example.com/image.jpg" />
        </n-form-item>

        <n-form-item path="isPublic" label="Visibility">
          <n-switch v-model:value="formValue.isPublic">
            <template #checked>Public</template>
            <template #unchecked>Private</template>
          </n-switch>
        </n-form-item>
        
        <n-form-item path="rankingMethod" label="Ranking Method">
          <n-select v-model:value="formValue.rankingMethod" :options="rankingOptions" />
        </n-form-item>
        
        <n-form-item path="votingEnabled" label="Enable Voting">
          <n-switch v-model:value="formValue.votingEnabled">
            <template #checked>Enabled</template>
            <template #unchecked>Disabled</template>
          </n-switch>
        </n-form-item>

        <n-form-item path="allowVoteChanges" label="Allow Vote Changes" v-if="formValue.votingEnabled">
          <n-switch v-model:value="formValue.allowVoteChanges">
            <template #checked>Allowed</template>
            <template #unchecked>Not Allowed</template>
          </n-switch>
          <template #feedback>
            <span>When disabled, users can vote only once and cannot change their vote later</span>
          </template>
        </n-form-item>
      </n-form>

      <div class="preview-image" v-if="formValue.imageUrl">
        <img :src="formValue.imageUrl" alt="Cover preview" @error="handleImageError" />
      </div>

      <template #footer>
        <div class="modal-footer">
          <n-space justify="end">
            <n-button @click="handleCancel">Cancel</n-button>
            <n-button type="primary" :loading="loading" @click="handleSubmit">
              {{ isEdit ? 'Update Playlist' : 'Create Playlist' }}
            </n-button>
          </n-space>
        </div>
      </template>
    </n-card>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useMessage } from 'naive-ui'
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../composables/useAuth'
import type { FormInst } from 'naive-ui'
import type { Playlist, Track } from '../../types/playlist'

const props = defineProps<{
  show: boolean,
  playlist?: Playlist | null
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'created', playlist: Playlist): void
  (e: 'updated', playlist: Playlist): void
}>()

// Determine if we're in edit mode
const isEdit = computed(() => !!props.playlist)

// Computed property for v-model binding
const showLocal = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value)
})

// Form state
const formRef = ref<FormInst | null>(null)
const loading = ref(false)
const importLoading = ref(false)
const importError = ref('')
const importSuccess = ref('')
const sunoPlaylistUrl = ref('')
// Ranking method options
const rankingOptions = [
  { label: 'Star Rating (1-5)', value: 'star' },
  { label: 'Upvote/Downvote', value: 'updown' },
  { label: 'Favorites', value: 'favorite' },
  { label: 'Ranked (1st, 2nd, 3rd)', value: 'ranked' }
]

const formValue = ref({
  title: '',
  description: '',
  imageUrl: '',
  isPublic: false,
  rankingMethod: 'star' as const,
  votingEnabled: true,
  allowVoteChanges: true,
  tracks: [] as Track[]
})

// Watch for playlist changes to update form values in edit mode
watch(
  () => props.playlist,
  (newPlaylist) => {
    if (newPlaylist) {
      formValue.value = {
        title: newPlaylist.title,
        description: newPlaylist.description,
        imageUrl: newPlaylist.imageUrl || '',
        isPublic: newPlaylist.isPublic,
        rankingMethod: newPlaylist.rankingMethod || 'star',
        votingEnabled: newPlaylist.votingEnabled !== undefined ? newPlaylist.votingEnabled : true,
        allowVoteChanges: newPlaylist.allowVoteChanges !== undefined ? newPlaylist.allowVoteChanges : true,
        tracks: newPlaylist.tracks || []
      }
    } else {
      // Reset form when not in edit mode
      formValue.value = {
        title: '',
        description: '',
        imageUrl: '',
        isPublic: false,
        rankingMethod: 'star',
        votingEnabled: true,
        allowVoteChanges: true,
        tracks: []
      }
    }
  },
  { immediate: true }
)

// Form validation rules
const rules = {
  title: [
    { required: true, message: 'Please enter a title', trigger: 'blur' },
    { min: 2, max: 100, message: 'Title must be between 2-100 characters', trigger: 'blur' }
  ],
  description: [
    { required: true, message: 'Please enter a description', trigger: 'blur' },
    { min: 5, max: 500, message: 'Description must be between 5-500 characters', trigger: 'blur' }
  ],
  imageUrl: [
    { 
      pattern: /^(https?:\/\/.*)?$/, 
      message: 'Image URL must be a valid URL', 
      trigger: 'blur' 
    }
  ]
}

// Get authentication functionality
const { user, isLoggedIn } = useAuth()
const message = useMessage()

// Handle image loading errors
const handleImageError = (_e: Event) => {
  message.error('Unable to load image from URL')
  formValue.value.imageUrl = ''
}

// Form handlers
const handleCancel = () => {
  if (!isEdit.value) {
    formRef.value?.restoreValidation()
    formValue.value = {
      title: '',
      description: '',
      imageUrl: '',
      isPublic: false,
      tracks: []
    }
    sunoPlaylistUrl.value = ''
    importError.value = ''
  }
  showLocal.value = false
}

// Suno import functionality (for both playlists and single songs)
const importFromSuno = async () => {
  if (!sunoPlaylistUrl.value) {
    importError.value = 'Please enter a Suno playlist or song URL'
    return
  }

  importLoading.value = true
  importError.value = ''
  importSuccess.value = ''

  try {
    // Determine if this is a playlist or single song URL
    const url = sunoPlaylistUrl.value.trim()
    let isPlaylist = false
    let apiUrl = ''
    let id = ''
    
    // Parse the URL and extract the ID
    if (url.includes('/api/playlist/') || url.includes('/playlist/')) {
      isPlaylist = true
      
      // Extract playlist ID
      if (url.includes('/api/playlist/')) {
        id = url.split('/api/playlist/').pop() || ''
      } else if (url.includes('/playlist/')) {
        id = url.split('/playlist/').pop() || ''
      }
      
      // Remove trailing slashes or query parameters
      id = id.split('/')[0].split('?')[0]
      
      // Validate playlist ID format
      if (!id.match(/^[a-f0-9-]{36}$/)) {
        importError.value = 'Invalid playlist ID format'
        importLoading.value = false
        return
      }
      
      apiUrl = `https://studio-api.prod.suno.com/api/playlist/${id}`
    } 
    // Check if it's a single song URL
    else if (url.includes('/api/clip/') || url.includes('/song/')) {
      isPlaylist = false
      
      // Extract song ID
      if (url.includes('/api/clip/')) {
        id = url.split('/api/clip/').pop() || ''
      } else if (url.includes('/song/')) {
        id = url.split('/song/').pop() || ''
      }
      
      // Remove trailing slashes or query parameters
      id = id.split('/')[0].split('?')[0]
      
      // Validate song ID format
      if (!id.match(/^[a-f0-9-]{36}$/)) {
        importError.value = 'Invalid song ID format'
        importLoading.value = false
        return
      }
      
      apiUrl = `https://studio-api.prod.suno.com/api/clip/${id}`
    } else {
      importError.value = 'Unrecognized Suno URL format. Please use a playlist or song URL.'
      importLoading.value = false
      return
    }
    
    // Fetch the data from the Suno API
    const response = await fetch(apiUrl)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from Suno API: ${response.status}`)
    }
    
    const data = await response.json()
    console.log('Suno API response:', data)
    
    // Process based on whether it's a playlist or single song
    const tracks: Track[] = []
    
    if (isPlaylist) {
      // Update form values with the playlist data
      formValue.value.title = data.name || 'Imported Playlist'
      // If name isn't available, try to use the first track title
      if (!formValue.value.title && data.playlist_clips?.[0]?.clip?.title) {
        formValue.value.title = data.playlist_clips[0].clip.title
      }
      
      formValue.value.description = data.description || 'Imported from Suno'
      formValue.value.imageUrl = data.image_url || ''
      // If image_url isn't available, try to use the first track's image
      if (!formValue.value.imageUrl && data.playlist_clips?.[0]?.clip?.image_url) {
        formValue.value.imageUrl = data.playlist_clips[0].clip.image_url
      }
      
      // Map the playlist clips to tracks
      if (data.playlist_clips && Array.isArray(data.playlist_clips)) {
        data.playlist_clips.forEach((item: any) => {
          if (item.clip) {
            const clip = item.clip
            // Extract track data using the exact property names from the API response
            const track: Track = {
              id: clip.id,
              title: clip.title || 'Untitled Track',
              // The artist name is in the parent item object
              artist: item.display_name || clip.display_name || 'Unknown Artist',
              avatarImageUrl: item.avatar_image_url || clip.avatar_image_url || '',
              tags: clip.metadata?.tags || '',
              imageUrl: clip.image_url || clip.image_large_url,
              audioUrl: clip.audio_url,
              duration: typeof clip.metadata?.duration === 'number' ? clip.metadata.duration : 0,
              addedAt: Date.now()
            }
            
            console.log('Adding track from playlist:', track)
            tracks.push(track)
          }
        })
      }
      
      importSuccess.value = `Successfully imported playlist with ${tracks.length} tracks`
    } else {
      // Single song - create a playlist with just this song
      // The song data is directly in the response
      formValue.value.title = data.title ? `${data.title} - Playlist` : 'Single Song Playlist'
      formValue.value.description = data.metadata?.prompt ? 
        `Playlist created from Suno song: ${data.title}\n\nOriginal prompt: ${data.metadata.prompt.slice(0, 300)}${data.metadata.prompt.length > 300 ? '...' : ''}` : 
        `Playlist created from Suno song: ${data.title || 'Untitled'}`
      formValue.value.imageUrl = data.image_url || data.image_large_url || ''
      
      // Create a track for this single song
      const track: Track = {
        id: data.id,
        title: data.title || 'Untitled Track',
        artist: data.display_name || 'Unknown Artist',
        tags: data.metadata?.tags || '',
        avatarImageUrl: data.avatar_image_url,
        imageUrl: data.image_url || data.image_large_url,
        audioUrl: data.audio_url,
        duration: typeof data.metadata?.duration === 'number' ? data.metadata.duration : 0,
        addedAt: Date.now()
      }
      
      console.log('Adding single track:', track)
      tracks.push(track)
      
      importSuccess.value = `Successfully imported song: ${data.title || 'Untitled Track'}`
    }
    
    console.log('Final tracks array:', tracks)
    formValue.value.tracks = tracks
  } catch (error) {
    console.error('Error importing Suno playlist:', error)
    importError.value = 'Failed to import playlist. Please check the URL and try again.'
  } finally {
    importLoading.value = false
  }
}

const handleSubmit = (e: MouseEvent) => {
  if (!isLoggedIn.value || !user.value) {
    message.error('You must be logged in to manage playlists')
    return
  }

  e.preventDefault()
  formRef.value?.validate(async (errors) => {
    if (errors) {
      return
    }

    loading.value = true
    try {
      if (isEdit.value && props.playlist) {
        // Update existing playlist document
        const playlistRef = doc(db, 'playlists', props.playlist.id)
        
        await updateDoc(playlistRef, {
          title: formValue.value.title,
          description: formValue.value.description,
          imageUrl: formValue.value.imageUrl || null,
          isPublic: formValue.value.isPublic,
          rankingMethod: formValue.value.rankingMethod,
          votingEnabled: formValue.value.votingEnabled,
          allowVoteChanges: formValue.value.allowVoteChanges,
          tracks: formValue.value.tracks || props.playlist.tracks || [],
          updatedAt: serverTimestamp()
        })

        // Create the updated playlist object to return
        const updatedPlaylist: Playlist = {
          id: props.playlist.id,
          title: formValue.value.title,
          description: formValue.value.description,
          imageUrl: formValue.value.imageUrl || undefined,
          userId: props.playlist.userId,
          isPublic: formValue.value.isPublic,
          rankingMethod: formValue.value.rankingMethod,
          votingEnabled: formValue.value.votingEnabled,
          createdAt: props.playlist.createdAt,
          updatedAt: Date.now(),
          tracks: formValue.value.tracks || props.playlist.tracks
        }

        message.success('Playlist updated successfully')
        showLocal.value = false
        emit('updated', updatedPlaylist)
      } else {
        // Create new playlist document
        const playlistsRef = collection(db, 'playlists')
        const now = Date.now()
        
        // For debugging
        console.log('Creating playlist with user ID:', user.value?.uid)
        console.log('Tracks being saved:', formValue.value.tracks)
        
        const docRef = await addDoc(playlistsRef, {
          title: formValue.value.title,
          description: formValue.value.description,
          imageUrl: formValue.value.imageUrl || null,
          userId: user.value?.uid as string,
          tracks: formValue.value.tracks || [], // Use the imported tracks
          isPublic: formValue.value.isPublic,
          rankingMethod: formValue.value.rankingMethod,
          votingEnabled: formValue.value.votingEnabled,
          allowVoteChanges: formValue.value.allowVoteChanges,
          createdAt: now,
          updatedAt: now
        })

         const newPlaylistId = docRef.id
        const newPlaylist: Playlist = {
          id: newPlaylistId,
          title: formValue.value.title,
          description: formValue.value.description,
          userId: user.value.uid,
          imageUrl: formValue.value.imageUrl || undefined,
          isPublic: formValue.value.isPublic,
          rankingMethod: formValue.value.rankingMethod,
          votingEnabled: formValue.value.votingEnabled,
          allowVoteChanges: formValue.value.allowVoteChanges,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tracks: formValue.value.tracks || []
        }

        message.success('Playlist created successfully')
        handleCancel()
        emit('created', newPlaylist)
      }
    } catch (error) {
      console.error(`Error ${isEdit.value ? 'updating' : 'creating'} playlist:`, error)
      message.error(`Failed to ${isEdit.value ? 'update' : 'create'} playlist`)
    } finally {
      loading.value = false
    }
  })
}
</script>

<style scoped>
.modal-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.preview-image {
  margin-top: 16px;
  width: 100%;
  max-height: 200px;
  overflow: hidden;
  border-radius: 8px;
  display: flex;
  justify-content: center;
}

.preview-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
</style>
