import React from 'react';
import { Note, Podcast } from '../types';
import { ArrowLeft } from 'lucide-react';

interface Props {
  notes: Note[];
  podcasts: Podcast[];
  onBack: () => void;
  onSelectPodcast: (podcast: Podcast) => void;
}

const NotesPage: React.FC<Props> = ({ notes, podcasts, onBack, onSelectPodcast }) => {
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

      {/* 按节目浏览 */}
      <div>
        <h2 className="text-base font-sans text-ink mb-6">按节目浏览</h2>

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

                        <div className="flex justify-end items-end border-t border-ink/10 pt-4 mt-2">
                            <span className="text-xs font-mono text-subtext">笔记 {stats.count}</span>
                        </div>
                    </div>
                );
            })}
        </div>
        {podcasts.filter(p => getStats(p.id).count > 0).length === 0 && (
            <div className="text-center py-16 text-subtext">暂无笔记</div>
        )}
      </div>
    </div>
  );
};

export default NotesPage;
