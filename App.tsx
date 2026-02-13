import React, { useState } from 'react';
import { ViewState, Podcast, Note } from './types';
import { MOCK_PODCASTS, MOCK_NOTES } from './constants';

// Components
import LandingPage from './components/LandingPage';
import HomePage from './components/HomePage';
import PodcastListPage from './components/PodcastListPage';
import NotesPage from './components/NotesPage';
import PlayerPage from './components/PlayerPage';

const App: React.FC = () => {
  // Global State
  const [view, setView] = useState<ViewState>(ViewState.LANDING);
  const [podcasts, setPodcasts] = useState<Podcast[]>(MOCK_PODCASTS);
  const [notes, setNotes] = useState<Note[]>(MOCK_NOTES);
  // Lifted category state
  const [categories, setCategories] = useState(['产品思维', '科技', '职场']);
  
  const [selectedPodcast, setSelectedPodcast] = useState<Podcast | null>(null);
  
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

  const handleUpdateProgress = (id: string, progress: number) => {
    setPodcasts(prev => prev.map(p => p.id === id ? { ...p, progress } : p));
    if (selectedPodcast?.id === id) {
        setSelectedPodcast(prev => prev ? { ...prev, progress } : null);
    }
  };

  const handleCreateCategory = (name: string) => {
    if (!categories.includes(name)) {
        setCategories([...categories, name]);
    }
  };

  const handleRenameCategory = (oldName: string, newName: string) => {
      setCategories(prev => prev.map(c => c === oldName ? newName : c));
      // Update podcasts associated with this category
      setPodcasts(prev => prev.map(p => p.category === oldName ? { ...p, category: newName } : p));
  };

  const handleDeleteCategory = (categoryName: string, deletePodcasts: boolean) => {
      setCategories(prev => prev.filter(c => c !== categoryName));
      
      if (deletePodcasts) {
          // Cascade delete
          setPodcasts(prev => prev.filter(p => p.category !== categoryName));
      } else {
          // Move to '其他' (Other/Uncategorized)
          setPodcasts(prev => prev.map(p => p.category === categoryName ? { ...p, category: '其他' } : p));
      }
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
            categories={categories}
            onBack={() => setView(ViewState.HOME)} 
            onSelectPodcast={handleSelectPodcastForListening}
            onCreateCategory={handleCreateCategory}
            onRenameCategory={handleRenameCategory}
            onDeleteCategory={handleDeleteCategory}
            onDeletePodcast={handleDeletePodcast}
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
            onUpdateProgress={handleUpdateProgress}
            mode={playerMode}
            onSwitchToPlayer={handleSwitchToPlayer}
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