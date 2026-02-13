import React from 'react';
import { ViewState } from '../types';
import { Headphones, BookOpen, ArrowUpRight, Mic } from 'lucide-react';

interface Props {
  onChangeView: (view: ViewState) => void;
  podcastCount: number;
  notesCount: number;
}

const HomePage: React.FC<Props> = ({ onChangeView, podcastCount, notesCount }) => {
  return (
    <div className="flex flex-col h-full px-6 py-8 animate-fade-in bg-paper text-ink font-sans">
      {/* Editorial Header */}
      <header className="flex justify-between items-end mb-12 md:mb-20 mt-4 border-b-2 border-ink pb-6">
        <div>
          <h1 className="font-serif text-5xl md:text-7xl italic font-medium tracking-tight leading-[0.9]">
            Whisper <br/> <span className="not-italic">& Echo</span>
          </h1>
        </div>
        <div className="hidden md:block text-right">
          <p className="font-mono text-xs tracking-widest uppercase mb-1">今日会话</p>
          <p className="font-serif text-xl">{new Date().toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
      </header>

      {/* Main Action Grid */}
      <div className="flex-1 flex flex-col md:flex-row gap-6 pb-8">
        
        {/* Podcast Card - White Theme */}
        <button 
          onClick={() => onChangeView(ViewState.PODCAST_LIST)}
          className="flex-1 bg-white border-2 border-ink rounded-2xl p-8 relative group transition-all duration-300 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#1a1a1a] flex flex-col justify-between min-h-[280px]"
        >
          <div className="w-full flex justify-between items-start">
            <div className="w-14 h-14 bg-sage/20 border-2 border-ink rounded-full flex items-center justify-center group-hover:bg-sage group-hover:text-white transition-colors">
              <Headphones className="w-6 h-6" />
            </div>
            <ArrowUpRight className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1 group-hover:-translate-y-1" />
          </div>

          <div className="text-left mt-8">
            <h3 className="font-serif text-4xl mb-2 text-ink">我的播客</h3>
            <p className="font-sans text-subtext text-sm max-w-[200px]">存放你导入的声音，开始新的听想旅程。</p>
          </div>

          <div className="w-full mt-8 pt-6 border-t border-ink/10 flex justify-between items-center font-mono text-sm">
             <span>已导入</span>
             <span className="bg-ink text-paper px-3 py-1 rounded-full">{podcastCount}</span>
          </div>
        </button>

        {/* Notes Card - Ink Theme for Contrast */}
        <button 
          onClick={() => onChangeView(ViewState.NOTES_REPO)}
          className="flex-1 bg-ink text-paper border-2 border-ink rounded-2xl p-8 relative group transition-all duration-300 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#A7B89E] flex flex-col justify-between min-h-[280px]"
        >
          <div className="w-full flex justify-between items-start">
            <div className="w-14 h-14 bg-white/10 border-2 border-paper rounded-full flex items-center justify-center group-hover:bg-paper group-hover:text-ink transition-colors">
              <BookOpen className="w-6 h-6" />
            </div>
            <ArrowUpRight className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1 group-hover:-translate-y-1" />
          </div>

          <div className="text-left mt-8">
            <h3 className="font-serif text-4xl mb-2">笔记仓库</h3>
            <p className="font-sans text-white/60 text-sm max-w-[200px]">你留下的思考痕迹，随时回来偶遇旧想法。</p>
          </div>

           <div className="w-full mt-8 pt-6 border-t border-white/20 flex justify-between items-center font-mono text-sm">
             <span>笔记数</span>
             <span className="bg-paper text-ink px-3 py-1 rounded-full">{notesCount}</span>
          </div>
        </button>
      </div>
      
      {/* Footer Decoration */}
      <div className="hidden md:flex justify-center items-center py-6 opacity-50">
         <div className="h-px w-24 bg-ink/30 mx-4"></div>
         <Mic className="w-4 h-4 text-ink/30" />
         <div className="h-px w-24 bg-ink/30 mx-4"></div>
      </div>
    </div>
  );
};

export default HomePage;