// No need for ref import
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { doc, deleteDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { Playlist } from '../types/playlist'
import { useAuth } from './useAuth'

export function usePlaylistActions() {
  const router = useRouter()
  const message = useMessage()
  const { user, isLoggedIn } = useAuth()
  
  const isOwner = (playlist: Playlist) => {
    if (!isLoggedIn.value || !user.value) return false
    return playlist.userId === user.value.uid
  }
  
  // Share playlist - available to anyone
  const sharePlaylist = (playlist: Playlist) => {
    // Generate a shareable URL
    const shareUrl = `${window.location.origin}/playlist/${playlist.id}`
    
    // Try to use Web Share API if available
    if (navigator.share) {
      navigator.share({
        title: `SunoRank: ${playlist.title}`,
        text: `Check out this Suno playlist: ${playlist.title}`,
        url: shareUrl
      }).catch(err => {
        console.error('Error sharing:', err)
        // Fallback: copy to clipboard
        copyToClipboard(shareUrl)
      })
    } else {
      // Fallback: copy to clipboard
      copyToClipboard(shareUrl)
    }
  }
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success('Share link copied to clipboard!')
    }).catch(err => {
      console.error('Failed to copy:', err)
      // If clipboard API fails, show message with the URL
      message.info(`Share this URL: ${text}`)
    })
  }
  
  // Delete playlist - only available to owner
  const deletePlaylist = async (playlist: Playlist) => {
    if (!isOwner(playlist)) {
      message.error('You can only delete your own playlists')
      return false
    }
    
    try {
      const playlistRef = doc(db, 'playlists', playlist.id)
      await deleteDoc(playlistRef)
      
      message.success('Playlist deleted successfully')
      return true
    } catch (error) {
      console.error('Error deleting playlist:', error)
      message.error('Failed to delete playlist')
      return false
    }
  }
  
  // Navigate to view playlist
  const viewPlaylist = (playlist: Playlist) => {
    router.push(`/playlist/${playlist.id}`)
  }
  
  return {
    isOwner,
    sharePlaylist,
    deletePlaylist,
    viewPlaylist
  }
}
