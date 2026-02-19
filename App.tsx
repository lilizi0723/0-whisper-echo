import React, { useState, useEffect, useCallback } from 'react';
import { ViewState, Podcast, Note } from './types';
import { api } from './services/api';

// Components
import LandingPage from './components/LandingPage';
import HomePage from './components/HomePage';
import PodcastListPage from './components/PodcastListPage';
import NotesPage from './components/NotesPage';
import PlayerPage from './components/PlayerPage';

const STORAGE_KEY_PODCASTS = 'whisper-echo-podcasts';
const STORAGE_KEY_NOTES = 'whisper-echo-notes';

function loadPodcasts(): Podcast[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PODCASTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const App: React.FC = () => {
  // Global State（从 localStorage 初始化）
  const [view, setView] = useState<ViewState>(ViewState.LANDING);
  const [podcasts, setPodcasts] = useState<Podcast[]>(() => loadPodcasts());
  const [notes, setNotes] = useState<Note[]>(() => loadNotes());

  // 持久化 podcasts
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PODCASTS, JSON.stringify(podcasts));
  }, [podcasts]);

  // 持久化 notes 到笔记仓库
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(notes));
  }, [notes]);
  
  const [selectedPodcast, setSelectedPodcast] = useState<Podcast | null>(null);
  const [transcribingIds, setTranscribingIds] = useState<Set<string>>(new Set());

  // Track which mode the player is in
  const [playerMode, setPlayerMode] = useState<'player' | 'readOnly'>('player');

  // Navigation Handlers
  const handleEnterApp = () => setView(ViewState.HOME);
  
  // Entering from Podcast List -> Full Player
  const handleSelectPodcastForListening = (podcast: Podcast) => {
    setSelectedPodcast(podcast);
    setPlayerMode('player');
    setView(ViewState.PLAYER);
  };

  // Entering from Notes Repo -> Read Only Mode
  const handleSelectPodcastForReading = (podcast: Podcast) => {
    setSelectedPodcast(podcast);
    setPlayerMode('readOnly');
    setView(ViewState.PLAYER);
  };

  // Switching from Read Only -> Full Player
  const handleSwitchToPlayer = () => {
    setPlayerMode('player');
  };

  // --- Data Management Handlers ---

  const handleSaveNote = (content: string, timestamp: string) => {
    if (!selectedPodcast) return;
    
    const newNote: Note = {
      id: Date.now().toString(),
      podcastId: selectedPodcast.id,
      content: content,
      timestamp: timestamp,
      createdAt: new Date().toLocaleDateString(),
      isQuote: false,
    };

    setNotes(prev => [newNote, ...prev]);
  };

  const handleUpdateNote = (noteId: string, content: string) => {
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, content } : n));
  };

  const handleDeleteNote = (noteId: string) => {
    setNotes(prev => prev.filter(n => n.id !== noteId));
  };

  const handleUpdateTranscript = (id: string, transcript: string) => {
    setPodcasts(prev => prev.map(p => p.id === id ? { ...p, transcript } : p));
    // 使用函数式更新，避免闭包导致 selectedPodcast 不更新（转写可能很久才完成）
    setSelectedPodcast(prev => prev?.id === id ? { ...prev, transcript } : prev);
  };

  const handleUpdateProgress = useCallback((id: string, progress: number) => {
    setPodcasts(prev => prev.map(p => p.id === id ? { ...p, progress } : p));
    setSelectedPodcast(prev => prev?.id === id ? (prev ? { ...prev, progress } : null) : prev);
  }, []);

  const handlePodcastImported = (podcast: Podcast) => {
      setPodcasts(prev => [...prev, podcast]);
      console.log('[导入] 已加入我的播客:', podcast.title);
      if (podcast.audioUrl) {
        setTranscribingIds(prev => new Set(prev).add(podcast.id));
        api.transcribe(podcast.id, podcast.audioUrl).then(t => {
          if (t) handleUpdateTranscript(podcast.id, t);
        }).finally(() => {
          setTranscribingIds(prev => { const s = new Set(prev); s.delete(podcast.id); return s; });
        });
      }
  };

  /** 导入成功后从后端刷新列表（确保新播客显示） */
  const refreshFromBackend = async () => {
    try {
      const list = await api.getPodcasts();
      if (list.length > 0) {
        const mapped: Podcast[] = list.map((p) => ({
          id: p.id,
          title: p.title,
          showName: p.showName,
          duration: p.duration,
          coverColor: p.coverColor ?? 'bg-sage/30',
          progress: p.progress ?? 0,
          category: p.category ?? '',
          transcriptSummary: p.transcriptSummary ?? '',
          transcript: p.transcript ?? '',
          keyNodes: p.keyNodes ?? [],
          audioUrl: p.audioUrl ?? null,
          coverImageUrl: p.coverImageUrl ?? null,
        }));
        setPodcasts(mapped);
      }
    } catch (_) {}
  };

  const handleDeletePodcast = (podcastId: string) => {
      setPodcasts(prev => prev.filter(p => p.id !== podcastId));
      // Also cleanup notes? Optional, but good practice
      setNotes(prev => prev.filter(n => n.podcastId !== podcastId));
  };

  const renderView = () => {
    switch (view) {
      case ViewState.LANDING:
        return <LandingPage onEnter={handleEnterApp} />;
      
      case ViewState.HOME:
        return (
          <HomePage 
            onChangeView={setView} 
            podcastCount={podcasts.length}
            notesCount={notes.length}
          />
        );
      
      case ViewState.PODCAST_LIST:
        return (
          <PodcastListPage 
            podcasts={podcasts} 
            onBack={() => setView(ViewState.HOME)} 
            onSelectPodcast={handleSelectPodcastForListening}
            onDeletePodcast={handleDeletePodcast}
            onPodcastImported={handlePodcastImported}
            onImportSuccess={refreshFromBackend}
          />
        );
      
      case ViewState.NOTES_REPO:
        return (
          <NotesPage 
            notes={notes}
            podcasts={podcasts}
            onBack={() => setView(ViewState.HOME)}
            onSelectPodcast={handleSelectPodcastForReading}
          />
        );

      case ViewState.PLAYER:
        if (!selectedPodcast) return <div className="p-4">Error: No podcast selected</div>;
        return (
          <PlayerPage 
            podcast={selectedPodcast}
            existingNotes={notes.filter(n => n.podcastId === selectedPodcast.id)}
            onBack={() => setView(playerMode === 'readOnly' ? ViewState.NOTES_REPO : ViewState.PODCAST_LIST)}
            onSaveNote={handleSaveNote}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
            onUpdateProgress={handleUpdateProgress}
            onUpdateTranscript={handleUpdateTranscript}
            mode={playerMode}
            onSwitchToPlayer={handleSwitchToPlayer}
            isTranscribing={transcribingIds.has(selectedPodcast.id)}
          />
        );
        
      default:
        return <div className="p-4">Error: Unknown View</div>;
    }
  };

  return (
    <div className="h-screen w-full bg-paper text-ink overflow-hidden font-sans">
      {renderView()}
    </div>
  );
};

export default App;