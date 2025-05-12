<template>
  <div class="dashboard-page">
    <n-card class="page-card">
      <template #header>
        <div class="dashboard-header">
          <h1>Your Playlists</h1>
          <n-button type="primary" size="large" @click="openCreatePlaylistModal()">
            <template #icon><n-icon><add-outline /></n-icon></template>
            Create New Playlist
          </n-button>
        </div>
      </template>

      <div v-if="loading">
        <n-spin size="large" />
        <p>Loading your playlists...</p>
      </div>

      <div v-else-if="!isLoggedIn">
        <n-empty description="Please login to view your playlists">
          <template #extra>
            <n-button type="primary" @click="loginWithGoogle">
              <template #icon><n-icon><logo-google /></n-icon></template>
              Login with Google
            </n-button>
          </template>
        </n-empty>
      </div>

      <div v-else-if="playlists.length === 0">
        <n-empty description="You don't have any playlists yet">
          <template #extra>
            <n-button type="primary" @click="openCreatePlaylistModal()">
              <template #icon><n-icon><add-outline /></n-icon></template>
              Create Your First Playlist
            </n-button>
          </template>
        </n-empty>
      </div>

      <div v-else class="playlists-grid">
        <playlist-card 
          v-for="playlist in playlists" 
          :key="playlist.id"
          :playlist="playlist"
          @edit="editPlaylist"
          @delete="confirmDeletePlaylist"
          @share="sharePlaylist"
          @view="viewPlaylist"
        />
      </div>
    </n-card>

    <!-- Playlist Modal (handles both create and edit) -->
    <playlist-modal
      v-model:show="showPlaylistModal"
      :playlist="currentPlaylist"
      @created="handlePlaylistCreated"
      @updated="handlePlaylistUpdated"
    />

    <!-- Confirmation Modal for Delete -->
    <n-modal v-model:show="showDeleteConfirmModal" preset="dialog" title="Delete Playlist">
      <template #content>
        <p>Are you sure you want to delete this playlist?</p>
        <p>This action cannot be undone.</p>
      </template>
      <template #action>
        <div class="modal-actions">
          <n-button @click="showDeleteConfirmModal = false">Cancel</n-button>
          <n-button type="error" @click="handleDeleteConfirmed">Delete</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { useAuth } from '../composables/useAuth'
import { usePlaylistActions } from '../composables/usePlaylistActions'
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '../firebase/config'
import { Playlist } from '../types/playlist'
import { LogoGoogle, AddOutline } from '@vicons/ionicons5'
import PlaylistCard from '../components/playlist/PlaylistCard.vue'
import PlaylistModal from '../components/playlist/PlaylistModal.vue'

// Get authentication functionality
const { 
  user,
  isLoggedIn, 
  loginWithGoogle 
} = useAuth()

const router = useRouter()
const message = useMessage()

// Import playlist actions composable
const { isOwner, sharePlaylist, deletePlaylist, viewPlaylist } = usePlaylistActions()

// State
const playlists = ref<Playlist[]>([])
const loading = ref(true)
const showPlaylistModal = ref(false)
const showDeleteConfirmModal = ref(false)
const currentPlaylist = ref<Playlist | null>(null)

// Fetch playlists
const fetchPlaylists = async () => {
  console.log('Fetching playlists...')
  if (!isLoggedIn.value || !user.value) {
    console.log('User not logged in or no user found')
    loading.value = false
    return
  }

  try {
    loading.value = true
    
    // Log debugging information
    console.log('Fetching playlists for user ID:', user.value.uid)
    
    console.log('Executing main query with sorting...')
    const q = query(
      collection(db, 'playlists'), 
      where('userId', '==', user.value.uid),
      orderBy('updatedAt', 'desc'),
      limit(50)
    )
    
    const playlistsSnapshot = await getDocs(q)
    console.log(`Final playlists returned: ${playlistsSnapshot.size}`)
    
    const playlistsList: Playlist[] = []
    playlistsSnapshot.forEach((doc) => {
      const data = doc.data() as Omit<Playlist, 'id'>
      const playlist = {
        id: doc.id,
        ...data
      }
      console.log('Adding playlist to UI:', playlist)
      playlistsList.push(playlist)
    })
    
    playlists.value = playlistsList
  } catch (error) {
    console.error('Error fetching playlists:', error)
    message.error('Failed to load playlists')
  } finally {
    loading.value = false
  }
}

// Open modal for creating a new playlist
const openCreatePlaylistModal = () => {
  currentPlaylist.value = null
  showPlaylistModal.value = true
}

// Handle playlist actions
const editPlaylist = (playlist: Playlist) => {
  currentPlaylist.value = playlist
  showPlaylistModal.value = true
}

const confirmDeletePlaylist = (playlist: Playlist) => {
  currentPlaylist.value = playlist
  showDeleteConfirmModal.value = true
}

// Use the composable deletePlaylist method with our UI handling
const handleDeleteConfirmed = async () => {
  if (!currentPlaylist.value) return
  
  const success = await deletePlaylist(currentPlaylist.value)
  
  if (success) {
    // Remove from local state without needing another Firestore fetch
    playlists.value = playlists.value.filter(p => p.id !== currentPlaylist.value?.id)
    showDeleteConfirmModal.value = false
  }
}

// We're not directly exposing these methods anymore - using the composable instead

// Handle modal events
const handlePlaylistCreated = () => {
  fetchPlaylists()
}

const handlePlaylistUpdated = () => {
  fetchPlaylists()
}

// Watch for auth state changes
watch(isLoggedIn, (newIsLoggedIn) => {
  console.log('Auth state changed - isLoggedIn:', newIsLoggedIn)
  if (newIsLoggedIn && user.value) {
    console.log('User is now logged in, fetching playlists...')
    fetchPlaylists()
  }
})

// Watch for user changes
watch(user, (newUser) => {
  console.log('User changed:', newUser?.uid)
})

// Initialize
onMounted(() => {
  console.log('onMounted isLoggedIn.value:', isLoggedIn.value)
  console.log('onMounted user.value:', user.value)
  
  // Set a timer to check auth again after a short delay
  // This helps with timing issues in the auth state initialization
  setTimeout(() => {
    console.log('Delayed auth check - isLoggedIn:', isLoggedIn.value)
    console.log('Delayed auth check - user:', user.value)
    
    if (isLoggedIn.value && user.value) {
      fetchPlaylists()
    } else {
      loading.value = false
    }
  }, 500)
})
</script>

<style scoped>
.dashboard-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.playlists-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}
</style>
