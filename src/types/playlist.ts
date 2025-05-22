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
  rankingMethod: RankingMethod;
  votingEnabled: boolean;
  allowVoteChanges: boolean;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  imageUrl?: string;
  avatarImageUrl?: string;
  tags?: string;
  audioUrl: string;
  duration?: number;
  addedAt: Date | number;
  updatedAt?: Date | number;
  userId?: string;
}

export interface Vote {
  id?: string;
  trackId: string;
  playlistId: string;
  userId: string;
  rating: number; // For star ranking: 1-5
  createdAt: Date | number;
}

export type RankingMethod = 'star' | 'updown' | 'favorite';

export interface TrackWithRanking extends Track {
  averageRating?: number;
  voteCount?: number;
  userVote?: Vote | null;
  rank?: number;
}
