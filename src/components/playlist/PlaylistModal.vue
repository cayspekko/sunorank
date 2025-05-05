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
import type { Playlist } from '../../types/playlist'

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
const formValue = ref({
  title: '',
  description: '',
  imageUrl: '',
  isPublic: false
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
        isPublic: newPlaylist.isPublic
      }
    } else {
      // Reset form when not in edit mode
      formValue.value = {
        title: '',
        description: '',
        imageUrl: '',
        isPublic: false
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
      isPublic: false
    }
  }
  showLocal.value = false
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
          createdAt: props.playlist.createdAt,
          updatedAt: Date.now(),
          tracks: props.playlist.tracks
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
        
        const docRef = await addDoc(playlistsRef, {
          title: formValue.value.title,
          description: formValue.value.description,
          imageUrl: formValue.value.imageUrl || null,
          userId: user.value?.uid as string,
          tracks: [], // Empty array for tracks
          isPublic: formValue.value.isPublic,
          createdAt: now,
          updatedAt: now
        })

        // Create the playlist object to return
        const newPlaylist: Playlist = {
          id: docRef.id,
          title: formValue.value.title,
          description: formValue.value.description,
          imageUrl: formValue.value.imageUrl || undefined,
          userId: user.value?.uid as string,
          tracks: [],
          isPublic: formValue.value.isPublic,
          createdAt: now,
          updatedAt: now
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
