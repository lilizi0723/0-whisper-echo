import type { ChatMessage } from '../types';

export const CHAT_STORAGE_KEY = 'whisper-echo-chat-history';

export function loadChatHistoryFromStorage(): Record<string, ChatMessage[]> {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(CHAT_STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, ChatMessage[]>;
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {}
  return {};
}

export function saveChatHistoryForPodcast(podcastId: string, history: ChatMessage[]): void {
  try {
    const all = loadChatHistoryFromStorage();
    all[podcastId] = history;
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(all));
  } catch {}
}
