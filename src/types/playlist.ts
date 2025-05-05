export interface Playlist {
  id: string;
  title: string;
  description: string;
  userId: string;
  imageUrl?: string;
  createdAt: Date | number;
  updatedAt: Date | number;
  tracks?: Track[];
  isPublic: boolean;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  imageUrl?: string;
  audioUrl: string;
  duration?: number;
  addedAt: Date | number;
}
