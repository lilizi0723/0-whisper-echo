import React, { useState } from 'react';
import { Note, Podcast } from '../types';
import { ArrowLeft, RefreshCw, Sparkles } from 'lucide-react';
import { QUOTES } from '../constants';

interface Props {
  notes: Note[];
  podcasts: Podcast[];
  onBack: () => void;
  onSelectPodcast: (podcast: Podcast) => void;
}

const NotesPage: React.FC<Props> = ({ notes, podcasts, onBack, onSelectPodcast }) => {
  const [quoteIndex, setQuoteIndex] = useState(0);

  const handleRefreshQuote = () => {
    setQuoteIndex((prev) => (prev + 1) % QUOTES.length);
  };

  const currentQuote = QUOTES[quoteIndex] || notes[0];

  const getStats = (pid: string) => {
    const pNotes = notes.filter(n => n.podcastId === pid);
    return {
        count: pNotes.length,
        highlights: pNotes.filter(n => n.timestamp).length,
    };
  };

  return (
    <div className="h-full flex flex-col px-6 py-8 overflow-y-auto no-scrollbar bg-paper text-ink">
      {/* Header */}
      <div className="mb-10">
        <button onClick={onBack} className="flex items-center gap-2 text-subtext hover:text-ink transition-colors mb-4 group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 
          <span className="font-mono text-xs tracking-widest uppercase">返回首页</span>
        </button>
        <h1 className="font-serif text-5xl md:text-6xl italic">笔记仓库</h1>
      </div>

      {/* Quote of the Day - Magazine Style */}
      <div className="mb-12 relative group cursor-pointer" onClick={handleRefreshQuote}>
         <div className="absolute -left-3 -top-3 text-6xl font-serif text-sage/30">“</div>
         <div className="bg-white border-l-4 border-ink p-8 shadow-sm hover:shadow-md transition-shadow relative z-10">
            <div className="flex justify-between items-start mb-4">
                <span className="font-mono text-xs tracking-widest text-sage uppercase flex items-center gap-2">
                    <Sparkles className="w-3 h-3" /> 今日一言
                </span>
                <RefreshCw className="w-3 h-3 text-subtext group-hover:rotate-180 transition-transform duration-500" />
            </div>
            <p className="font-serif text-2xl md:text-3xl leading-normal text-ink mb-6">
                {currentQuote?.content}
            </p>
            <div className="text-right">
                <p className="font-sans font-medium text-sm">
                   — {podcasts.find(p => p.id === currentQuote?.podcastId)?.title || 'Unknown Source'}
                </p>
                <p className="text-xs text-subtext mt-1">{currentQuote?.createdAt}</p>
            </div>
         </div>
      </div>

      {/* Grid of Podcasts */}
      <div>
        <h2 className="font-serif text-2xl mb-6 border-b border-ink/20 pb-2">按节目浏览</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {podcasts.map(podcast => {
                const stats = getStats(podcast.id);
                if (stats.count === 0) return null;

                return (
                    <div 
                        key={podcast.id}
                        onClick={() => onSelectPodcast(podcast)}
                        className="bg-white border-2 border-ink rounded-xl p-6 hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#1a1a1a] transition-all cursor-pointer flex flex-col justify-between h-40"
                    >
                        <h3 className="font-serif text-xl font-medium leading-tight line-clamp-2">{podcast.title}</h3>
                        
                        <div className="flex justify-between items-end border-t border-ink/10 pt-4 mt-2">
                            <span className="text-xs text-subtext font-mono uppercase">{podcast.category}</span>
                            <div className="flex gap-2 text-xs font-mono text-subtext">
                                <span>笔记 {stats.count}</span>
                                <span>•</span>
                                <span>高亮 {stats.highlights}</span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
};

export default NotesPage;