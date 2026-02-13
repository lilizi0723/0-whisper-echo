export enum ViewState {
  LANDING = 'LANDING',
  HOME = 'HOME',
  PODCAST_LIST = 'PODCAST_LIST',
  PLAYER = 'PLAYER',
  NOTES_REPO = 'NOTES_REPO',
}

export interface Podcast {
  id: string;
  title: string;
  showName: string;
  duration: string;
  coverColor: string; // simulating a cover image with a color block
  progress: number; // 0 to 100
  category: string;
  transcriptSummary: string; // Context for AI
  transcript: string; // Full verbatim text
  keyNodes: KeyNode[];
}

export interface KeyNode {
  id: string;
  timestamp: string;
  title: string;
}

export interface Note {
  id: string;
  podcastId: string;
  timestamp?: string;
  content: string;
  createdAt: string;
  isQuote?: boolean; // For "Quote of the day" logic
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}