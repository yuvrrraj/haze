export interface User {
  id: string;
  username: string;
  bio?: string;
  avatar_url?: string;
  cover_url?: string;
  created_at?: string;
}

export interface Post {
  id: string;
  user_id: string;
  caption?: string;
  image_url: string; // ImageKit URL
  likes_count: number;
  comments_count: number;
  created_at: string;
  user?: User;
}

export interface Reel {
  id: string;
  user_id: string;
  caption?: string;
  video_url: string;    // Cloudinary MP4
  hls_url?: string;     // Cloudinary HLS m3u8
  thumbnail_url: string; // ImageKit thumbnail
  likes_count: number;
  created_at: string;
  user?: User;
}

export interface Story {
  id: string;
  user_id: string;
  video_url?: string;   // Cloudinary
  image_url?: string;   // ImageKit
  thumbnail_url?: string;
  expires_at: string;
  created_at: string;
  user?: User;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  seen: boolean;
  delivered: boolean;
  created_at: string;
}

export interface Repost {
  id: string;
  user_id: string;
  reel_id: string;
  emoji: string | null;
  created_at: string;
}

export interface Comment {
  id: string;
  user_id: string;
  post_id?: string;
  reel_id?: string;
  content: string;
  created_at: string;
  user?: User;
}

export interface Chat {
  id: string;
  participants: string[];
  last_message?: Message;
  is_group: boolean;
  name?: string;
}

// Group and Channel types
export interface Group {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  type: 'group' | 'channel';
  created_by: string;
  last_message?: string;
  last_message_at: string;
  created_at: string;
  member_count?: number;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'member' | 'allowed';
  joined_at: string;
  profile?: User;
}

export interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  type: 'text' | 'voice';
  created_at: string;
  sender?: User;
}
