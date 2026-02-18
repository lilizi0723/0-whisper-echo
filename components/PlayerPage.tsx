import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Podcast, Note, ChatMessage } from '../types';
import { ArrowLeft, Play, Send, List, FileText, PenTool, Pencil, Trash2, Pause } from 'lucide-react';
import { api } from '../services/api';
import { MOCK_CHAT_HISTORY } from '../constants';

const BULLETS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

function stripNoteTimestamp(content: string): string {
  return content.replace(/^(\s*>\s*)?\[\d{1,2}:\d{2}\]\s*/, '').trim();
}

interface Props {
  podcast: Podcast;
  existingNotes: Note[];
  onBack: () => void;
  onSaveNote: (content: string, timestamp: string) => void;
  onUpdateNote?: (noteId: string, content: string) => void;
  onDeleteNote?: (noteId: string) => void;
  onUpdateProgress: (id: string, progress: number) => void;
  onUpdateTranscript?: (podcastId: string, transcript: string) => void;
  mode: 'player' | 'readOnly';
  onSwitchToPlayer: () => void;
  isTranscribing?: boolean;
}

function parseDurationMinutes(d: string | undefined): number {
  const s = String(d || '0');
  const num = parseInt(s.replace(/\D/g, ''), 10) || 0;
  if (/^\d+:\d+$/.test(s.trim())) {
    const [h, m] = s.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }
  return num;
}
function formatProgressTime(pct: number, durationMin: number): string {
  const totalMin = Math.max(durationMin, 1);
  const currentMin = (pct / 100) * totalMin;
  const m = Math.floor(currentMin);
  const s = Math.floor((currentMin - m) * 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
function formatMmSs(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
function formatDuration(d: string | undefined): string {
  const totalMin = parseDurationMinutes(d);
  if (totalMin < 60) return `${totalMin}:00`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}:${m.toString().padStart(2, '0')}`;
}

const PlayerPage: React.FC<Props> = ({ podcast, existingNotes, onBack, onSaveNote, onUpdateNote, onDeleteNote, onUpdateProgress, onUpdateTranscript, mode, onSwitchToPlayer, isTranscribing = false }) => {
  // --- Shared State ---
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [chatHistory, setChatHistoryState] = useState<ChatMessage[]>([]);

  const setChatHistory = (updater: React.SetStateAction<ChatMessage[]>) => {
    setChatHistoryState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return next;
    });
  };

  const [progress, setProgress] = useState(podcast.progress);
  const [leftWidth, setLeftWidth] = useState(50);
  const [leftTab, setLeftTab] = useState<'overview' | 'transcript'>('overview');
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [localTranscribing, setLocalTranscribing] = useState(false);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const [selectionMenu, setSelectionMenu] = useState<{x: number, y: number, text: string} | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(podcast.progress);
  const [activeTab, setActiveTab] = useState<'notes' | 'chat'>('notes');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  const audioUrl = podcast.audioUrl;
  const backendBase = typeof window !== 'undefined' && window.location.port === '3001'
    ? `http://${window.location.hostname}:8787`
    : '';
  const proxyAudioUrl = audioUrl && audioUrl.startsWith('http')
    ? (backendBase ? `${backendBase}/audio-proxy?url=${encodeURIComponent(audioUrl)}` : `/api/audio-proxy?url=${encodeURIComponent(audioUrl)}`)
    : null;

  const applyProgressFromClientX = useCallback((clientX: number, syncAudio = true) => {
    const bar = progressBarRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const el = audioRef.current;
    setProgress(pct);
    progressRef.current = pct;
    if (el && el.duration > 0 && syncAudio) {
      el.currentTime = (pct / 100) * el.duration;
      setAudioCurrentTime(el.currentTime);
    }
  }, []);

  const [isNarrowView, setIsNarrowView] = useState(typeof window !== 'undefined' ? !window.matchMedia('(min-width: 768px)').matches : false);
  progressRef.current = progress;

  useEffect(() => {
    const m = window.matchMedia('(min-width: 768px)');
    const update = () => setIsNarrowView(!m.matches);
    m.addEventListener('change', update);
    return () => m.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (chatHistory.length === 0) {
      if (mode === 'player') {
        setChatHistoryState([{
          id: 'init',
          role: 'model',
          text: `欢迎来到 "${podcast.title}" 的听想空间。你可以随时问我关于本期节目的问题。`
        }]);
      } else {
        setChatHistoryState(MOCK_CHAT_HISTORY);
      }
    }
  }, [podcast.id, mode, podcast.title]);

  useEffect(() => {
    return () => { onUpdateProgress(podcast.id, progressRef.current); };
  }, [podcast.id, onUpdateProgress]);

  // 音频播放（拖动进度条时不覆盖）
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !proxyAudioUrl) return;
    const onTimeUpdate = () => {
      if (isDraggingProgress) return;
      const t = el.currentTime;
      setAudioCurrentTime(t);
      if (el.duration > 0) {
        const pct = (t / el.duration) * 100;
        setProgress(pct);
        progressRef.current = pct;
      }
    };
    const onDurationChange = () => setAudioDuration(el.duration);
    const onEnded = () => setIsPlaying(false);
    el.addEventListener('timeupdate', onTimeUpdate);
    el.addEventListener('durationchange', onDurationChange);
    el.addEventListener('ended', onEnded);
    return () => {
      el.removeEventListener('timeupdate', onTimeUpdate);
      el.removeEventListener('durationchange', onDurationChange);
      el.removeEventListener('ended', onEnded);
    };
  }, [proxyAudioUrl, isDraggingProgress]);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, activeTab, isTyping]);

  // Handle Transcript Selection
  useEffect(() => {
    const handleSelection = () => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
            setSelectionMenu(null);
            return;
        }

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Ensure selection is inside transcript
        if (transcriptRef.current && transcriptRef.current.contains(range.commonAncestorContainer)) {
             setSelectionMenu({
                x: rect.left + rect.width / 2,
                y: rect.top - 10, // above selection
                text: selection.toString()
            });
        } else {
            setSelectionMenu(null);
        }
    };

    // Attach to mouseup to detect end of selection
    document.addEventListener('mouseup', handleSelection);
    return () => {
        document.removeEventListener('mouseup', handleSelection);
    };
  }, [leftTab]);

  const handleAddToNotes = () => {
    if (selectionMenu) {
      const timeMatch = selectionMenu.text.match(/\[(\d{2}:\d{2})\]/);
      let timestamp: string;
      if (timeMatch) {
        timestamp = timeMatch[1];
      } else {
        const totalSeconds = parseInt(podcast.duration || '0') * 60;
        const currentSeconds = totalSeconds * (progress / 100);
        const m = Math.floor(currentSeconds / 60);
        const s = Math.floor(currentSeconds % 60);
        timestamp = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      }
      const contentPrefix = timeMatch ? '' : `[${timestamp}] `;
      const textToAdd = `> ${contentPrefix}${selectionMenu.text}\n\n`;
      setNoteInput(prev => prev ? prev + '\n' + textToAdd : textToAdd);
      setSelectionMenu(null);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const userText = chatInput.trim();
    if (!userText || isTyping) return;
    setChatInput('');
    setChatHistory(prev => [...prev, { id: Date.now().toString(), role: 'user', text: userText }]);
    setIsTyping(true);
    try {
      const { text } = await api.ask({
        history: chatHistory.map(m => ({ role: m.role, text: m.text })),
        userMessage: userText,
        transcriptSummary: (podcast.transcript || podcast.transcriptSummary || '').slice(0, 12000),
      });
      setChatHistory(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      let displayMsg = '抱歉，思考过程中遇到了一些问题。';
      try {
        const parsed = typeof msg === 'string' && msg.startsWith('{') ? JSON.parse(msg) : null;
        if (parsed?.error) displayMsg = String(parsed.error);
        else if (msg && msg.length < 200) displayMsg = msg;
      } catch (_) { if (msg && msg.length < 200) displayMsg = msg; }
      setChatHistory(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: displayMsg
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSaveNote = () => {
    if (!noteInput.trim()) return;
    const minutes = Math.floor((parseInt(podcast.duration || '0') * (progress / 100)));
    const timestamp = `${minutes.toString().padStart(2, '0')}:00`;
    onSaveNote(noteInput, timestamp);
    setNoteInput('');
  };

  const handleNoteSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    handleSaveNote();
  };

  const handleBack = async () => {
      try {
        await onUpdateProgress(podcast.id, progressRef.current);
      } catch (e) {
        console.error('保存进度失败', e);
      }
      onBack();
  };


  // --- RENDER: READ ONLY MODE ---
  if (mode === 'readOnly') {
    return (
        <div className="h-full flex flex-col px-6 py-8 bg-paper text-ink overflow-y-auto no-scrollbar animate-fade-in">
           {/* Header / Breadcrumbs */}
           <div className="mb-8 border-b-2 border-ink pb-6">
             <div className="flex justify-between items-start">
                 <div>
                    <button onClick={onBack} className="flex items-center gap-2 text-subtext hover:text-ink transition-colors mb-4 group">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 
                        <span className="font-mono text-xs tracking-widest uppercase">返回笔记仓库</span>
                    </button>
                    <h1 className="font-serif text-4xl md:text-5xl italic">{podcast.title}</h1>
                 </div>
                 <button onClick={onSwitchToPlayer} className="bg-ink text-paper px-4 py-2 rounded-full text-sm font-medium hover:bg-sage flex items-center gap-2">
                     <Play className="w-3 h-3" /> 继续收听
                 </button>
             </div>
           </div>

           <div className="flex-1">
               {/* Notes Section - 只保留我的笔记，删除历史对话 */}
               <div className="space-y-6 max-w-2xl">
                    <h2 className="font-serif text-2xl border-b border-ink/20 pb-2 flex items-center gap-2">
                        <PenTool className="w-5 h-5 text-sage" /> 我的笔记
                    </h2>
                    {existingNotes.length === 0 ? (
                        <div className="p-8 border-2 border-dashed border-ink/10 rounded-xl text-center text-subtext">
                            暂无笔记
                        </div>
                    ) : (
                        existingNotes.map((note, idx) => (
                            <div key={note.id} className="bg-white border border-ink/10 p-4 rounded-lg shadow-sm group">
                                <div className="flex justify-between text-xs font-mono text-subtext mb-2">
                                    <span>{note.createdAt}</span>
                                    {(onUpdateNote || onDeleteNote) && (
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {onUpdateNote && <button type="button" className="p-1 hover:bg-gray-100 rounded" title="编辑" onClick={() => { setEditingNoteId(note.id); setEditingContent(note.content); }}><Pencil className="w-3 h-3" /></button>}
                                            {onDeleteNote && <button type="button" className="p-1 hover:bg-red-50 rounded text-red-600" title="删除" onClick={() => { if (window.confirm('确定删除这条笔记吗？')) onDeleteNote(note.id); }}><Trash2 className="w-3 h-3" /></button>}
                                        </div>
                                    )}
                                </div>
                                {editingNoteId === note.id ? (
                                    <div className="mt-2">
                                        <textarea value={editingContent} onChange={e => setEditingContent(e.target.value)} className="w-full text-sm border border-ink/20 rounded p-2 min-h-[60px]" rows={3} />
                                        <div className="flex justify-end gap-2 mt-2">
                                            <button type="button" className="text-sm text-subtext" onClick={() => setEditingNoteId(null)}>取消</button>
                                            <button type="button" className="text-sm bg-sage text-white px-3 py-1 rounded" onClick={() => { onUpdateNote?.(note.id, editingContent); setEditingNoteId(null); }}>保存</button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-ink leading-relaxed whitespace-pre-wrap"><span className="text-sage mr-1">{BULLETS[idx] || (idx + 1) + '.'}</span>{stripNoteTimestamp(note.content)}</p>
                                )}
                            </div>
                        ))
                    )}
               </div>
           </div>
        </div>
    );
  }

  // --- RENDER: PLAYER MODE ---
  const effectiveLeftWidth = Math.min(Math.max(leftWidth, 25), 75);
  const leftPanelWidth = isNarrowView ? '100%' : `${effectiveLeftWidth}%`;
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const onMouseMove = (ev: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setLeftWidth(Math.min(Math.max(pct, 25), 75));
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };
  return (
    <div ref={containerRef} className="h-full flex flex-col md:flex-row bg-paper text-ink overflow-y-auto md:overflow-hidden relative gap-0">
      
      {/* --- Left Panel: Player & Transcript --- */}
      <div 
        style={{ width: leftPanelWidth }}
        className="flex flex-col relative bg-paper z-10 h-full min-h-0 md:min-h-full flex-shrink-0 md:flex-shrink border-r border-ink/10"
      >
        {/* Header */}
        <div className="p-6 border-b border-ink/10 flex justify-between items-center bg-paper z-20">
             <button type="button" onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5" />
             </button>
             <span className="font-mono text-sm font-semibold uppercase tracking-widest text-ink">NOW PLAYING</span>
             <div className="w-9"></div>
        </div>

        <div className="p-6 pb-2 sticky top-0 bg-paper z-10 border-b border-ink/5">
                {/* 封面 + 标题 + 创作者 */}
                <div className="mb-4">
                    <div className={`w-full max-w-[200px] mx-auto aspect-square rounded-lg overflow-hidden border-2 border-ink/10 mb-4 flex items-center justify-center ${podcast.coverImageUrl ? 'bg-gray-100' : podcast.coverColor || 'bg-sage/30'}`}>
                        {podcast.coverImageUrl ? (
                            <img src={podcast.coverImageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <span className="font-serif text-4xl text-ink/30 italic">{(podcast.title || ' ').slice(0, 1)}</span>
                        )}
                    </div>
                    <h2 className="font-serif text-xl font-medium text-ink line-clamp-2 text-center mb-1">{podcast.title}</h2>
                    {podcast.showName && <p className="text-sm text-subtext text-center mb-4">{podcast.showName}</p>}
                </div>

                {/* 音频 */}
                {proxyAudioUrl && (
                  <audio
                    ref={audioRef}
                    src={proxyAudioUrl}
                    preload="auto"
                    crossOrigin="anonymous"
                    onError={(e) => console.warn('[audio] 加载失败:', proxyAudioUrl?.slice(0, 80), e)}
                  />
                )}
                <div className="mb-4">
                    <div
                        ref={progressBarRef}
                        className="w-full h-3 bg-gray-200 rounded-full mb-2 cursor-pointer select-none relative"
                        onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsDraggingProgress(true);
                            applyProgressFromClientX(e.clientX);
                            const onMouseMove = (ev: MouseEvent) => { ev.preventDefault(); applyProgressFromClientX(ev.clientX); };
                            const onMouseUp = () => {
                                const el = audioRef.current;
                                if (el && el.duration > 0) {
                                  el.currentTime = (progressRef.current / 100) * el.duration;
                                  setAudioCurrentTime(el.currentTime);
                                }
                                setIsDraggingProgress(false);
                                document.removeEventListener('mousemove', onMouseMove);
                                document.removeEventListener('mouseup', onMouseUp);
                            };
                            document.addEventListener('mousemove', onMouseMove);
                            document.addEventListener('mouseup', onMouseUp);
                        }}
                        onTouchStart={(e) => {
                            e.preventDefault();
                            const t = e.touches[0];
                            if (t) { setIsDraggingProgress(true); applyProgressFromClientX(t.clientX); }
                            const onTouchMove = (ev: TouchEvent) => {
                                if (ev.touches[0]) applyProgressFromClientX(ev.touches[0].clientX);
                            };
                            const onTouchEnd = () => {
                                const el = audioRef.current;
                                if (el && el.duration > 0) {
                                  el.currentTime = (progressRef.current / 100) * el.duration;
                                  setAudioCurrentTime(el.currentTime);
                                }
                                setIsDraggingProgress(false);
                                document.removeEventListener('touchmove', onTouchMove);
                                document.removeEventListener('touchend', onTouchEnd);
                            };
                            document.addEventListener('touchmove', onTouchMove, { passive: true });
                            document.addEventListener('touchend', onTouchEnd);
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            applyProgressFromClientX(e.clientX);
                        }}
                    >
                        <div data-progress-fill className={`h-full bg-ink rounded-full pointer-events-none ${isDraggingProgress ? '' : 'transition-all duration-75'}`} style={{ width: `${proxyAudioUrl && audioDuration > 0 ? (audioCurrentTime / audioDuration) * 100 : progress}%` }} />
                    </div>
                    <div className="flex justify-between text-xs font-mono text-subtext">
                        <span>{proxyAudioUrl && audioDuration > 0 ? formatMmSs(audioCurrentTime) : formatProgressTime(progress, parseDurationMinutes(podcast.duration))}</span>
                        <span>{proxyAudioUrl && audioDuration > 0 ? formatMmSs(audioDuration) : formatDuration(podcast.duration)}</span>
                    </div>
                </div>

                <div className="flex justify-center mb-4">
                    <button
                        type="button"
                        onClick={() => {
                            const el = audioRef.current;
                            if (el && proxyAudioUrl) {
                                if (isPlaying) {
                                    el.pause();
                                } else {
                                    if (el.duration > 0) {
                                        el.currentTime = (progressRef.current / 100) * el.duration;
                                        setAudioCurrentTime(el.currentTime);
                                    }
                                    el.play();
                                }
                                setIsPlaying(!isPlaying);
                            }
                        }}
                        className="w-14 h-14 rounded-full bg-ink text-paper flex items-center justify-center hover:bg-sage transition-colors disabled:opacity-50"
                        disabled={!proxyAudioUrl}
                        title={proxyAudioUrl ? (isPlaying ? '暂停' : '播放') : '暂无音频'}
                    >
                        {isPlaying ? (
                            <Pause className="w-6 h-6" fill="currentColor" />
                        ) : (
                            <Play className="w-6 h-6 ml-0.5" fill="currentColor" />
                        )}
                    </button>
                </div>

                 {/* Tab Switcher (Overview vs Transcript) */}
                <div className="flex border-2 border-ink/10 rounded-lg p-1 bg-gray-50/50 mt-2">
                    <button 
                        onClick={() => setLeftTab('overview')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${leftTab === 'overview' ? 'bg-white shadow-sm text-ink border border-ink/10' : 'text-subtext hover:text-ink'}`}
                    >
                        <List className="w-4 h-4" /> 概览
                    </button>
                    <button 
                         onClick={() => setLeftTab('transcript')}
                         className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${leftTab === 'transcript' ? 'bg-white shadow-sm text-ink border border-ink/10' : 'text-subtext hover:text-ink'}`}
                    >
                        <FileText className="w-4 h-4" /> 全文
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 relative">
                {leftTab === 'overview' ? (
                    <div className="space-y-4 animate-fade-in">
                        <section>
                            <p className="text-sm leading-relaxed text-ink/80 whitespace-pre-line p-4 rounded-lg border border-ink/10 bg-card/30">
                                {(podcast.transcriptSummary || '暂无节目简介').replace(/\]\]\s*>/g, '')}
                            </p>
                        </section>
                    </div>
                ) : (
                    <div className="animate-fade-in">
                        {(isTranscribing || localTranscribing) ? (
                            <div className="flex flex-col items-center justify-center py-12 text-subtext">
                                <div className="w-10 h-10 border-2 border-sage border-t-transparent rounded-full animate-spin mb-3" />
                                <p className="text-sm">正在转写中...</p>
                            </div>
                        ) : podcast.transcript ? (
                            <div ref={transcriptRef} className="prose prose-sm max-w-none text-ink font-mono text-sm leading-relaxed space-y-2 overflow-y-auto">
                                {podcast.transcript.split('\n').filter(l => l.trim()).map((line, i) => {
                                    const tsMatch = line.match(/^\[(\d{1,2}:\d{2})\]\s*(Speaker\d+)?:?\s*(.+)$/);
                                    if (tsMatch) {
                                        const [, ts, speaker, text] = tsMatch;
                                        const [m, s] = ts.split(':').map(Number);
                                        const sec = (m || 0) * 60 + (s || 0);
                                        const totalSec = Math.max(parseDurationMinutes(podcast.duration) * 60, 1);
                                        const pct = (sec / totalSec) * 100;
                                        return (
                                            <button
                                                key={i}
                                                type="button"
                                                className="block w-full text-left hover:bg-sage/10 p-2 rounded transition-colors"
                                                onClick={() => {
                                                    const el = audioRef.current;
                                                    if (el && proxyAudioUrl && el.duration > 0) {
                                                        el.currentTime = sec;
                                                        setProgress(pct);
                                                        progressRef.current = pct;
                                                        if (!isPlaying) {
                                                            el.play();
                                                            setIsPlaying(true);
                                                        }
                                                    }
                                                }}
                                            >
                                                <span className="text-sage font-mono text-xs mr-2">[{ts}]</span>
                                                {speaker && <span className="text-subtext text-xs mr-2">{speaker}</span>}
                                                <span className="text-ink">{text || line}</span>
                                            </button>
                                        );
                                    }
                                    return <p key={i} className="text-ink py-1">{line}</p>;
                                })}
                            </div>
                        ) : (
                            <div className="text-center text-subtext py-10">
                                <p className="mb-4">暂无逐字稿</p>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (!podcast.audioUrl) {
                                            setTranscriptError('暂无音频地址');
                                            return;
                                        }
                                        setTranscriptError(null);
                                        setLocalTranscribing(true);
                                        try {
                                            const t = await api.transcribe(podcast.id, podcast.audioUrl);
                                            if (t) {
                                                onUpdateTranscript?.(podcast.id, t);
                                                setTranscriptError(null);
                                            } else {
                                                setTranscriptError('转写结果为空');
                                            }
                                        } catch (e) {
                                            setTranscriptError(e instanceof Error ? e.message : '转写失败');
                                        } finally {
                                            setLocalTranscribing(false);
                                        }
                                    }}
                                    className="text-sage hover:underline"
                                >
                                    生成逐字稿（讯飞听见）
                                </button>
                                {transcriptError && <p className="text-sm text-red-600 mt-3">{transcriptError}</p>}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Highlight Popover */}
                         {selectionMenu && (
                            <div 
                                style={{ 
                                    position: 'fixed', 
                                    left: selectionMenu.x, 
                                    top: selectionMenu.y,
                                    transform: 'translate(-50%, -100%)'
                                }}
                                className="z-50 bg-ink text-paper px-3 py-1.5 rounded-full shadow-xl flex items-center gap-2 animate-bounce-in cursor-pointer hover:scale-105 transition-transform"
                                onMouseDown={(e) => {
                                    e.preventDefault(); // Prevent losing selection before action
                                    handleAddToNotes();
                                }}
                            >
                                <PenTool className="w-3 h-3" />
                                <span className="text-xs font-medium whitespace-nowrap">记笔记</span>
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-ink rotate-45"></div>
                            </div>
                         )}

      </div>

      {/* --- Resizable divider --- */}
      <div
        className="hidden md:flex w-1 hover:w-2 bg-transparent hover:bg-sage/50 cursor-col-resize z-50 absolute h-full transition-all items-center justify-center group"
        style={{ left: `${effectiveLeftWidth}%`, transform: 'translateX(-50%)' }}
        onMouseDown={handleResizeMouseDown}
      />

      {/* --- Right Panel: User Notes & Chat --- */}
      <div ref={rightPanelRef} className="flex-1 flex flex-col bg-[#FDFBF7] min-h-0 min-w-0 md:min-w-[280px] flex-shrink-0 self-stretch">
         {/* Tabs */}
         <div className="flex flex-shrink-0 border-b border-ink/10 bg-paper">
             <button 
                onClick={() => setActiveTab('notes')}
                className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'notes' ? 'border-ink text-ink bg-[#FDFBF7]' : 'border-transparent text-subtext bg-paper hover:bg-gray-50'}`}
             >
                📝 我的笔记
             </button>
             <button 
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'chat' ? 'border-ink text-ink bg-[#FDFBF7]' : 'border-transparent text-subtext bg-paper hover:bg-gray-50'}`}
             >
                💬 AI 对话
             </button>
         </div>

         {/* Content - chat 时贯穿到底，无底部留白 */}
         <div className={`flex-1 flex flex-col min-h-0 self-stretch ${activeTab === 'chat' ? 'overflow-hidden pt-6 px-6 pb-0' : 'overflow-y-auto p-6'}`}>
             {activeTab === 'notes' ? (
                 <div className="h-full flex flex-col">
                     <div className="flex-1 space-y-4 mb-4">
                        {existingNotes.length === 0 ? null : (
                            [...existingNotes].reverse().map((note, idx) => (
                                <div key={note.id} className="group relative pl-4 border-l-2 border-sage/30 hover:border-sage transition-colors">
                                     <div className="flex justify-between items-baseline mb-1">
                                        <span className="text-[10px] text-subtext">{note.createdAt}</span>
                                        {(onUpdateNote || onDeleteNote) && (
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {onUpdateNote && <button type="button" className="p-1 hover:bg-gray-100 rounded" title="编辑" onClick={() => { setEditingNoteId(note.id); setEditingContent(note.content); }}><Pencil className="w-3 h-3" /></button>}
                                                {onDeleteNote && <button type="button" className="p-1 hover:bg-red-50 rounded text-red-600" title="删除" onClick={() => { if (window.confirm('确定删除这条笔记吗？')) onDeleteNote(note.id); }}><Trash2 className="w-3 h-3" /></button>}
                                            </div>
                                        )}
                                     </div>
                                     {editingNoteId === note.id ? (
                                        <div className="mt-2">
                                            <textarea value={editingContent} onChange={e => setEditingContent(e.target.value)} className="w-full text-sm border border-ink/20 rounded p-2 min-h-[60px]" rows={3} />
                                            <div className="flex justify-end gap-2 mt-2">
                                                <button type="button" className="text-sm text-subtext" onClick={() => setEditingNoteId(null)}>取消</button>
                                                <button type="button" className="text-sm bg-sage text-white px-3 py-1 rounded" onClick={() => { onUpdateNote?.(note.id, editingContent); setEditingNoteId(null); }}>保存</button>
                                            </div>
                                        </div>
                                     ) : (
                                        <p className="text-sm text-ink whitespace-pre-wrap"><span className="text-sage mr-1">{BULLETS[idx] || (idx + 1) + '.'}</span>{stripNoteTimestamp(note.content)}</p>
                                     )}
                                </div>
                            ))
                        )}
                     </div>
                     
                     {/* Input Area */}
                     <form onSubmit={handleNoteSubmit} className="mt-auto bg-white border border-ink/10 rounded-xl p-3 shadow-sm focus-within:ring-1 focus-within:ring-sage focus-within:border-sage transition-all">
                        <textarea 
                            value={noteInput}
                            onChange={e => setNoteInput(e.target.value)}
                            placeholder="记录当下的想法..."
                            className="w-full text-sm resize-none outline-none bg-transparent placeholder:text-subtext/50 min-h-[60px]"
                            onKeyDown={(e) => {
                                if(e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleNoteSubmit();
                                }
                            }}
                        />
                        <div className="flex justify-end items-center mt-2 border-t border-gray-100 pt-2 note-form-footer">
                             <button type="submit" disabled={!noteInput.trim()} className="bg-ink text-paper rounded-full p-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-sage transition-colors">
                                 <Send className="w-3 h-3" />
                             </button>
                        </div>
                     </form>
                 </div>
             ) : (
                <div className="flex flex-col flex-1 min-h-0 w-full">
                  <div className="flex-1 overflow-y-auto min-h-0 -mx-6 px-6">
                    {chatHistory.map(msg => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-3`}>
                            <div className={`max-w-[85%] p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-ink text-paper rounded-br-none whitespace-pre-wrap' : 'bg-white border border-ink/10 text-ink rounded-bl-none shadow-sm whitespace-pre-wrap'}`}>
                                {msg.role === 'user' ? msg.text : msg.text}
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex justify-start mb-3">
                            <div className="bg-white border border-ink/10 px-4 py-3 rounded-2xl rounded-bl-none shadow-sm flex gap-1 items-center">
                                <div className="w-1.5 h-1.5 bg-ink/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-1.5 h-1.5 bg-ink/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-1.5 h-1.5 bg-ink/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  {/* Chat Input - 固定在底部，无下方留白 */}
                  <form onSubmit={handleChatSubmit} className="flex-shrink-0 mt-4 bg-white border border-ink/10 rounded-xl p-1 pl-4 shadow-sm focus-within:ring-1 focus-within:ring-sage focus-within:border-sage transition-all flex items-center gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      placeholder="向 AI 提问..."
                      className="flex-1 text-sm outline-none bg-transparent placeholder:text-subtext/50 py-3"
                    />
                    <button type="submit" disabled={!chatInput.trim() || isTyping} className="bg-ink text-paper rounded-lg p-2 m-1 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-sage transition-colors">
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
             )}
         </div>
      </div>
    </div>
  );
};

export default PlayerPage;