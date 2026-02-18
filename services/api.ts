export const API_BASE = '';

function getBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location.port === '3001') {
    return `http://${window.location.hostname}:8787`;
  }
  return API_BASE || '';
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const base = getBaseUrl();
  const pathStr = path.startsWith('/') ? path : `/${path}`;
  const url = path.startsWith('http') ? path : `${base}${pathStr}`;
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || res.statusText);
  }
  return res.json();
}

export const api = {
  async ask(params: {
    history: { role: string; text: string }[];
    userMessage: string;
    transcriptSummary: string;
  }): Promise<{ text: string }> {
    return request<{ text: string }>('/api/ask', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async previewRss(rssUrl: string): Promise<{
    showName: string;
    episodes: { index: number; title: string; pubDate: string; audioUrl?: string | null }[];
  }> {
    return request(`/api/rss/preview?url=${encodeURIComponent(rssUrl)}`);
  },

  async createPodcastFromRss(rssUrl: string, episodeIndex?: number): Promise<unknown> {
    const url = episodeIndex != null
      ? `/api/rss/import?url=${encodeURIComponent(rssUrl)}&episode=${episodeIndex}`
      : `/api/rss/import?url=${encodeURIComponent(rssUrl)}`;
    return request(url, { method: 'POST' });
  },

  /** 讯飞听见转写：传入播客ID和音频URL，返回带时间戳和说话人标记的文稿 */
  async transcribe(podcastId: string, audioUrl: string): Promise<string> {
    const data = await request<{ transcript: string }>('/api/transcribe', {
      method: 'POST',
      body: JSON.stringify({ podcastId, audioUrl }),
    });
    return data.transcript || '';
  },

  /** 从后端获取播客列表（用于导入后刷新） */
  async getPodcasts(): Promise<Array<{
    id: string;
    title: string;
    showName: string;
    duration: string;
    coverColor: string;
    progress: number;
    category: string;
    transcriptSummary?: string;
    transcript?: string;
    keyNodes?: Array<{ id: string; timestamp: string; title: string }>;
    audioUrl?: string | null;
  }>> {
    try {
      return request('/api/podcasts');
    } catch {
      return [];
    }
  },
};
