import React, { useState } from 'react';
import { Podcast } from '../types';
import { ArrowLeft, Plus, Play, Trash2 } from 'lucide-react';
import { api } from '../services/api';

interface Props {
  podcasts: Podcast[];
  onBack: () => void;
  onSelectPodcast: (podcast: Podcast) => void;
  onDeletePodcast: (id: string) => void;
  onPodcastImported: (podcast: Podcast) => void;
  /** 导入成功后从后端刷新列表 */
  onImportSuccess?: () => void | Promise<void>;
}

const PodcastListPage: React.FC<Props> = ({ 
    podcasts, 
    onBack, 
    onSelectPodcast,
    onDeletePodcast,
    onPodcastImported,
    onImportSuccess
}) => {
  const [showImportModal, setShowImportModal] = useState(false);
  const [deletePodcastId, setDeletePodcastId] = useState<string | null>(null);
  const [rssUrl, setRssUrl] = useState('');
  const [rssLoading, setRssLoading] = useState(false);
  const [rssError, setRssError] = useState<string | null>(null);
  const [rssEpisodes, setRssEpisodes] = useState<{ index: number; title: string; pubDate: string }[] | null>(null);
  const [rssShowName, setRssShowName] = useState('');
  const [rssEpisodeSearch, setRssEpisodeSearch] = useState('');

  return (
    <div className="h-full flex flex-col px-6 py-8 relative bg-paper text-ink">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 border-b-2 border-ink pb-6 gap-4">
        <div>
          <button onClick={onBack} className="flex items-center gap-2 text-subtext hover:text-ink transition-colors mb-4 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 
            <span className="font-mono text-xs tracking-widest uppercase">返回首页</span>
          </button>
          <h1 className="font-serif text-5xl md:text-6xl italic">我的播客</h1>
        </div>
        
        <button 
          onClick={() => setShowImportModal(true)}
          className="bg-ink text-paper px-6 py-3 rounded-full font-medium hover:bg-sage hover:text-white transition-all flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
        >
          <Plus className="w-4 h-4" />
          <span>导入新节目</span>
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-20 no-scrollbar mt-6">
        {podcasts.map((podcast, idx) => (
          <div 
            key={podcast.id}
            onClick={() => onSelectPodcast(podcast)}
            className="bg-white border-2 border-ink rounded-xl p-5 flex gap-5 cursor-pointer hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#1a1a1a] transition-all group items-center relative"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            {/* Delete Button (Visible on Hover) */}
            <button 
                onClick={(e) => { e.stopPropagation(); setDeletePodcastId(podcast.id); }}
                className="absolute top-4 right-4 p-2 text-subtext hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all z-20"
                title="删除节目"
            >
                <Trash2 className="w-4 h-4" />
            </button>

            {/* Styled Cover：有封面图则显示图片，否则显示纯色 */}
            <div className={`w-20 h-20 rounded-lg flex-shrink-0 border border-ink flex items-center justify-center text-ink/40 relative overflow-hidden ${podcast.coverImageUrl ? 'bg-gray-100' : podcast.coverColor}`}>
                {podcast.coverImageUrl ? (
                  <img src={podcast.coverImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                ) : null}
                <div className="absolute inset-0 bg-black/10"></div>
                <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 fill-current" />
                <span className="font-serif text-4xl absolute -bottom-2 -right-2 opacity-20 italic">0{idx + 1}</span>
            </div>
            
            <div className="flex-1 pr-8">
              <div className="flex justify-between items-start">
                 <h3 className="font-serif text-xl font-medium text-ink line-clamp-1 mb-1 group-hover:underline decoration-sage decoration-2">{podcast.title}</h3>
              </div>
              <div className="flex items-center gap-3 mb-3">
                  <span className="font-mono text-xs bg-gray-100 border border-ink/10 px-2 py-1 rounded text-subtext">{podcast.duration}</span>
              </div>
              
              {/* Custom Progress Bar */}
              <div className="w-full h-2 bg-gray-100 border border-ink/20 rounded-full overflow-hidden">
                 <div className="h-full bg-ink" style={{ width: `${podcast.progress}%` }}></div>
              </div>
            </div>
          </div>
        ))}
        {podcasts.length === 0 && (
           <div className="text-center py-20 opacity-50">
             <p className="font-serif italic text-xl">暂无节目，点击上方导入新节目</p>
           </div>
        )}
      </div>

      {/* Delete Podcast Confirm Modal */}
      {deletePodcastId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20" onClick={() => setDeletePodcastId(null)}>
          <div className="bg-paper rounded-xl border-2 border-ink p-6 shadow-xl max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <p className="text-ink mb-4">确定删除这个播客吗？同时会删除该播客下的所有笔记。</p>
            <div className="flex gap-3 justify-end">
              <button type="button" className="px-4 py-2 border border-ink/20 rounded-lg hover:bg-gray-100" onClick={() => setDeletePodcastId(null)}>取消</button>
              <button type="button" className="px-4 py-2 bg-ink text-paper rounded-lg hover:bg-sage" onClick={() => { onDeletePodcast(deletePodcastId); setDeletePodcastId(null); }}>确定删除</button>
            </div>
          </div>
        </div>
      )}

      {/* Stylized Import Modal */}
      {showImportModal && (
        <div className="absolute inset-0 z-50 bg-ink/20 backdrop-blur-sm flex items-end sm:items-center justify-center">
            <div className="bg-paper w-full sm:max-w-md max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-3xl border-t-2 sm:border-2 border-ink shadow-[0_-10px_40px_rgba(0,0,0,0.1)] animate-slide-up">
                <h3 className="font-serif text-3xl mb-2 italic flex-shrink-0 px-8 pt-8">导入新节目</h3>
                <div className="flex flex-col flex-1 min-h-0 overflow-hidden px-8 pt-2 pb-8 space-y-4">
                  {rssEpisodes == null ? (
                    <>
                      <div className="group">
                        <label className="text-xs font-mono tracking-widest uppercase block mb-2 text-subtext">RSS 链接</label>
                        <input
                          type="url"
                          value={rssUrl}
                          onChange={(e) => { setRssUrl(e.target.value); setRssError(null); }}
                          placeholder="https://feed.xyzfm.space/..."
                          className="w-full bg-white border-2 border-ink/10 focus:border-ink rounded-lg p-3 text-ink placeholder:text-subtext/40 focus:outline-none transition-colors"
                        />
                      </div>
                      {rssError && <p className="text-sm text-red-600">{rssError}</p>}
                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => { setShowImportModal(false); setRssUrl(''); setRssError(null); }}
                          className="flex-1 py-3 border-2 border-ink rounded-full font-medium hover:bg-gray-100 transition-colors"
                        >
                          取消
                        </button>
                        <button
                          type="button"
                          disabled={!rssUrl.trim() || rssLoading}
                          onClick={async () => {
                            if (!rssUrl.trim()) return;
                            setRssLoading(true);
                            setRssError(null);
                            try {
                              const list = await api.previewRss(rssUrl.trim());
                              setRssShowName(list.showName);
                              setRssEpisodes(list.episodes || []);
                            } catch (e: unknown) {
                              const msg = e instanceof Error ? e.message : String(e);
                              const is404 = /not be found|NOT_FOUND|404/i.test(msg);
                              setRssError(is404
                                ? '线上版本暂不支持 RSS 导入。请在本机运行前后端后访问 http://localhost:3001 使用完整功能。'
                                : msg || '无法解析该RSS链接，请确认链接是否正确且为有效的播客feed');
                            } finally {
                              setRssLoading(false);
                            }
                          }}
                          className="flex-1 py-3 border-2 border-sage text-sage rounded-full font-medium hover:bg-sage/10 transition-colors disabled:opacity-50"
                        >
                          {rssLoading ? '获取中…' : '获取节目列表'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-ink font-medium flex-shrink-0">节目：{rssShowName}</p>
                      <button
                        type="button"
                        onClick={() => { setRssEpisodes(null); setRssShowName(''); setRssError(null); setRssEpisodeSearch(''); }}
                        className="text-xs font-mono text-subtext hover:text-ink flex-shrink-0"
                      >
                        ← 重新输入链接
                      </button>
                      <input
                        type="text"
                        value={rssEpisodeSearch}
                        onChange={(e) => setRssEpisodeSearch(e.target.value)}
                        placeholder="搜索节目名称…"
                        className="w-full bg-white border-2 border-ink/10 focus:border-ink rounded-lg p-2.5 text-sm text-ink placeholder:text-subtext/40 focus:outline-none transition-colors flex-shrink-0"
                      />
                      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar border border-ink/10 rounded-lg divide-y divide-ink/5 bg-white">
                        {rssEpisodes
                          .filter((ep) => !rssEpisodeSearch.trim() || ep.title.toLowerCase().includes(rssEpisodeSearch.trim().toLowerCase()))
                          .map((ep) => (
                            <button
                              key={ep.index}
                              type="button"
                              disabled={rssLoading}
                              onClick={() => {
                                // 1. 先保存当前值，避免 state 更新导致闭包问题
                                const urlToImport = rssUrl.trim();
                                const epIndex = ep.index;

                                const epAny = ep as { duration?: string; coverImageUrl?: string | null; contentSnippet?: string; audioUrl?: string | null };
                                const isDup = podcasts.some(p => p.title === ep.title && p.showName === rssShowName);
                                if (isDup) {
                                  setRssError('该播客已经存在');
                                  return;
                                }
                                const ts = epAny.contentSnippet ?? '';
                                const newPodcast: Podcast = {
                                  id: `rss-${Date.now()}-${epIndex}`,
                                  title: ep.title,
                                  showName: rssShowName,
                                  duration: epAny.duration ?? '0',
                                  coverColor: 'bg-sage/30',
                                  progress: 0,
                                  category: '',
                                  transcriptSummary: ts,
                                  transcript: '',
                                  keyNodes: [],
                                  audioUrl: epAny.audioUrl ?? null,
                                  coverImageUrl: epAny.coverImageUrl ?? null,
                                };

                                // 2. 同步写入父组件 state（会触发 localStorage 持久化）
                                onPodcastImported(newPodcast);

                                // 3. 立即关闭弹窗并重置
                                setShowImportModal(false);
                                setRssUrl('');
                                setRssEpisodes(null);
                                setRssShowName('');
                                setRssEpisodeSearch('');
                                setRssError(null);
                                setRssLoading(false);

                                // 4. 后台通知后端，成功后从后端刷新列表
                                api.createPodcastFromRss(urlToImport, epIndex).then(() => onImportSuccess?.()).catch(() => onImportSuccess?.());
                              }}
                              className="w-full text-left px-3 py-2.5 text-sm hover:bg-sage/10 transition-colors disabled:opacity-50 border-b border-ink/5 last:border-b-0"
                            >
                              <span className="line-clamp-1 font-medium text-ink block">{ep.title}</span>
                              {ep.pubDate && <span className="text-xs text-subtext block mt-0.5">{ep.pubDate.slice(0, 10)}</span>}
                            </button>
                          ))}
                      </div>
                      {rssError && <p className="text-sm text-red-600 flex-shrink-0">{rssError}</p>}
                      <button
                        type="button"
                        onClick={() => { setShowImportModal(false); setRssUrl(''); setRssEpisodes(null); setRssShowName(''); setRssError(null); setRssEpisodeSearch(''); }}
                        className="w-full py-3 mt-2 text-subtext hover:text-ink text-sm font-medium border border-ink/20 rounded-full"
                      >
                        关闭
                      </button>
                    </>
                  )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default PodcastListPage;