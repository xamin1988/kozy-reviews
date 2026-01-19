
export type CommentCategory = 'video' | 'image' | 'effect' | 'subtitles' | 'transition' | 'music' | 'sound' | 'ai' | 'bug';

export interface Comment {
  id: string;
  timestamp: number;
  text: string;
  user: string;
  createdAt: number;
  category: CommentCategory;
  priority: 'low' | 'medium' | 'high';
  resolved?: boolean;
}

export interface Project {
  id: string;
  title: string;
  videoUrl: string; // This will now be the persistent cloud/proxy URL
  thumbnailUrl: string;
  createdAt: number;
  comments: Comment[];
  googleDriveFileId?: string; 
  isCloudStored: boolean;
}
