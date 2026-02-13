import React, { useState, useRef, useEffect } from 'react';
import { Podcast, Note, ChatMessage } from '../types';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, Send, Sparkles, List, FileText, PenTool } from 'lucide-react';
import { chatWithGemini } from '../services/geminiService';
import { MOCK_CHAT_HISTORY } from '../constants';

interface Props {
  podcast: Podcast;
  existingNotes: Note[];
  onBack: () => void;
  onSaveNote: (content: string, timestamp: string) => void;
  onUpdateProgress: (id: string, progress: number) => void;
  mode: 'player' | 'readOnly';
  onSwitchToPlayer: () => void;
}

const PlayerPage: React.FC<Props> = ({ podcast, existingNotes, onBack, onSaveNote, onUpdateProgress, mode, onSwitchToPlayer }) => {
  // --- Shared State ---
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  // --- Player Only State ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(podcast.progress);
  
  // Right Panel Tab
  const [activeTab, setActiveTab] = useState<'notes' | 'chat'>('notes');
  
  // Left Panel Tab
  const [leftTab, setLeftTab] = useState<'overview' | 'transcript'>('overview');

  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Selection Menu State
  const [selectionMenu, setSelectionMenu] = useState<{x: number, y: number, text: string} | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  // --- Resizing State ---
  const [leftWidth, setLeftWidth] = useState(40); // Percentage
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize chat
    if (chatHistory.length === 0) {
        if (mode === 'player') {
             setChatHistory([{
                id: 'init',
                role: 'model',
                text: `欢迎来到 "${podcast.title}" 的听想空间。你可以随时问我关于本期节目的问题。`
            }]);
        } else {
            setChatHistory(MOCK_CHAT_HISTORY);
        }
    }
  }, [podcast.id, mode, chatHistory.length, podcast.title]);

  // Save Progress on Unmount or Back
  useEffect(() => {
    return () => {
        onUpdateProgress(podcast.id, progress);
    };
  }, [progress, podcast.id, onUpdateProgress]);

  // Handle Play/Pause Simulation
  useEffect(() => {
      let interval: ReturnType<typeof setInterval>;
      if (isPlaying) {
          interval = setInterval(() => {
              setProgress(prev => Math.min(prev + 0.1, 100));
          }, 1000);
      }
      return () => clearInterval(interval);
  }, [isPlaying]);

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
          // Attempt to extract timestamp from selection (e.g., "[12:40]")
          // If not found, use current player progress formatted
          const timeMatch = selectionMenu.text.match(/\[(\d{2}:\d{2})\]/);
          
          let timestamp;
          if (timeMatch) {
              timestamp = timeMatch[1];
          } else {
              // Fallback to player time
              const totalSeconds = parseInt(podcast.duration) * 60; // Assuming duration is "50 分钟" -> 50
              const currentSeconds = totalSeconds * (progress / 100);
              const m = Math.floor(currentSeconds / 60);
              const s = Math.floor(currentSeconds % 60);
              timestamp = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
          }

          // Prepend the timestamp if it's from the player (not in text)
          const contentPrefix = timeMatch ? '' : `[${timestamp}] `;
          const textToAdd = `> ${contentPrefix}${selectionMenu.text}\n\n`;

          setNoteInput(prev => prev ? prev + '\n' + textToAdd : textToAdd);
          setActiveTab('notes');
          
          // Clear selection
          window.getSelection()?.removeAllRanges();
          setSelectionMenu(null);
      }
  };


  const handleChatSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim() || isTyping) return;
    const userText = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { id: Date.now().toString(), role: 'user', text: userText }]);
    setIsTyping(true);
    try {
      const aiResponse = await chatWithGemini(
        chatHistory.map(m => ({ role: m.role, text: m.text })),
        userText,
        podcast.transcriptSummary
      );
      setChatHistory(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: aiResponse }]);
    } catch (error) {
      setChatHistory(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Connection error." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleNoteSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!noteInput.trim()) return;
    
    // Calculate current timestamp for the note metadata
    const minutes = Math.floor((parseInt(podcast.duration) * (progress / 100)));
    // Add seconds just for simulation variety
    const timestamp = `${minutes.toString().padStart(2, '0')}:00`;
    
    onSaveNote(noteInput, timestamp);
    setNoteInput('');
  };

  const handleBack = () => {
      onUpdateProgress(podcast.id, progress);
      onBack();
  };

  // --- Drag Handler ---
  const startResizing = (mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    
    // Set global cursor style
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (mouseMoveEvent: MouseEvent) => {
        if (containerRef.current) {
            const containerRect = containerRef.current.getBoundingClientRect();
            // Calculate percentage
            const newLeftWidth = ((mouseMoveEvent.clientX - containerRect.left) / containerRect.width) * 100;
            // Clamp between 25% and 75%
            const clampedWidth = Math.min(Math.max(newLeftWidth, 25), 75);
            setLeftWidth(clampedWidth);
        }
    };

    const onMouseUp = () => {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
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

           <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
               {/* Notes Section */}
               <div className="space-y-6">
                    <h2 className="font-serif text-2xl border-b border-ink/20 pb-2 flex items-center gap-2">
                        <span className="text-sage">📝</span> 我的笔记
                    </h2>
                    {existingNotes.length === 0 ? (
                        <div className="p-8 border-2 border-dashed border-ink/10 rounded-xl text-center text-subtext">
                            暂无笔记
                        </div>
                    ) : (
                        existingNotes.map(note => (
                            <div key={note.id} className="bg-white border border-ink/10 p-4 rounded-lg shadow-sm">
                                <div className="flex justify-between text-xs font-mono text-subtext mb-2">
                                    <span className="bg-sage/20 text-ink px-1 rounded">{note.timestamp || '00:00'}</span>
                                    <span>{note.createdAt}</span>
                                </div>
                                <p className="text-ink leading-relaxed whitespace-pre-wrap">{note.content}</p>
                            </div>
                        ))
                    )}
               </div>

               {/* Chat History View */}
               <div className="space-y-6">
                   <h2 className="font-serif text-2xl border-b border-ink/20 pb-2 flex items-center gap-2">
                        <span className="text-sage">💬</span> 历史对话
                   </h2>
                   <div className="bg-card/50 rounded-xl p-4 h-[500px] overflow-y-auto space-y-4 border border-ink/5">
                        {chatHistory.map(msg => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-ink text-paper' : 'bg-white text-ink border border-ink/10'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                   </div>
               </div>
           </div>
        </div>
    );
  }

  // --- RENDER: PLAYER MODE ---
  return (
    <div ref={containerRef} className="h-full flex flex-col md:flex-row bg-paper text-ink overflow-hidden relative">
      
      {/* --- Left Panel: Player & AI Context --- */}
      <div 
        style={{ width: `${leftWidth}%` }}
        className="flex flex-col border-r-2 border-ink relative bg-paper z-10 transition-[width] duration-75 ease-linear h-full"
      >
        {/* Header */}
        <div className="p-6 border-b border-ink/10 flex justify-between items-center bg-paper z-20">
             <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5" />
             </button>
             <span className="font-mono text-xs uppercase tracking-widest text-subtext">Now Playing</span>
             <div className="w-9"></div> {/* spacer */}
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar relative flex flex-col">
            
            {/* Player Controls Area (Sticky Top) */}
            <div className="p-6 pb-2 sticky top-0 bg-paper z-10 border-b border-ink/5 shadow-sm">
                <div className={`w-16 h-16 ${podcast.coverColor} rounded-lg border border-ink flex items-center justify-center mb-4`}>
                    <Play className="w-6 h-6 text-white" />
                </div>
                <h2 className="font-serif text-2xl font-medium leading-tight mb-1">{podcast.title}</h2>
                <p className="text-sm text-subtext mb-6">{podcast.showName}</p>

                {/* Progress Bar */}
                <div className="mb-4">
                    <div className="w-full h-1 bg-gray-200 rounded-full mb-2 cursor-pointer" 
                         onClick={(e) => {
                             const rect = e.currentTarget.getBoundingClientRect();
                             const x = e.clientX - rect.left;
                             const newProgress = (x / rect.width) * 100;
                             setProgress(Math.max(0, Math.min(100, newProgress)));
                         }}
                    >
                        <div className="h-full bg-sage rounded-full relative" style={{ width: `${progress}%` }}>
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-ink rounded-full shadow"></div>
                        </div>
                    </div>
                    <div className="flex justify-between text-xs font-mono text-subtext">
                        <span>{Math.floor(parseInt(podcast.duration) * (progress / 100))}:00</span>
                        <span>{podcast.duration}</span>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex justify-center items-center gap-8 mb-4">
                    <button className="text-ink hover:text-sage"><SkipBack className="w-6 h-6" /></button>
                    <button 
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-14 h-14 bg-ink text-paper rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
                    >
                        {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
                    </button>
                    <button className="text-ink hover:text-sage"><SkipForward className="w-6 h-6" /></button>
                </div>

                 {/* Tab Switcher (Overview vs Transcript) */}
                <div className="flex border-2 border-ink/10 rounded-lg p-1 bg-gray-50/50 mt-2">
                    <button 
                        onClick={() => setLeftTab('overview')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${leftTab === 'overview' ? 'bg-white shadow-sm text-ink border border-ink/10' : 'text-subtext hover:text-ink'}`}
                    >
                        <List className="w-4 h-4" /> 智能概览
                    </button>
                    <button 
                         onClick={() => setLeftTab('transcript')}
                         className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${leftTab === 'transcript' ? 'bg-white shadow-sm text-ink border border-ink/10' : 'text-subtext hover:text-ink'}`}
                    >
                        <FileText className="w-4 h-4" /> 全文逐字稿
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 relative">
                {leftTab === 'overview' ? (
                    <div className="space-y-8 animate-fade-in">
                        <section>
                            <h3 className="font-serif text-lg mb-3 flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-sage" /> AI 摘要
                            </h3>
                            <p className="text-sm leading-relaxed text-ink/80 bg-card/30 p-4 rounded-lg border border-ink/5 whitespace-pre-line">
                                {podcast.transcriptSummary}
                            </p>
                        </section>

                        <section>
                            <h3 className="font-serif text-lg mb-3 flex items-center gap-2">
                                <span className="text-sage">📌</span> 重点节点
                            </h3>
                            <div className="space-y-2">
                                {podcast.keyNodes.map(node => (
                                    <button 
                                        key={node.id} 
                                        className="w-full text-left flex gap-3 p-3 hover:bg-white border border-transparent hover:border-ink/10 rounded-lg transition-colors group"
                                        onClick={() => {
                                            // Extract time (e.g., 03:20) and convert to progress
                                            const [m, s] = node.timestamp.split(':').map(Number);
                                            const timeInMin = m + s / 60;
                                            const totalMin = parseInt(podcast.duration);
                                            setProgress((timeInMin / totalMin) * 100);
                                        }}
                                    >
                                        <span className="font-mono text-xs text-sage pt-1">{node.timestamp}</span>
                                        <span className="text-sm group-hover:text-sage transition-colors">{node.title}</span>
                                    </button>
                                ))}
                            </div>
                        </section>
                    </div>
                ) : (
                    <div className="animate-fade-in pb-20 relative" ref={transcriptRef}>
                         {/* Transcript Content */}
                         <div className="prose prose-sm max-w-none text-ink/80 leading-relaxed font-sans whitespace-pre-wrap select-text selection:bg-sage/30">
                            {podcast.transcript ? podcast.transcript : (
                                <div className="text-center text-subtext py-10 italic">
                                    暂无逐字稿
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
                )}
            </div>
        </div>
      </div>

      {/* --- Drag Handle --- */}
      <div 
        className="w-1 hover:w-2 bg-transparent hover:bg-sage/50 cursor-col-resize z-50 absolute h-full transition-all flex items-center justify-center group"
        style={{ left: `${leftWidth}%`, transform: 'translateX(-50%)' }}
        onMouseDown={startResizing}
      >
        <div className="h-8 w-1 bg-ink/20 rounded-full group-hover:bg-ink/50 transition-colors"></div>
      </div>


      {/* --- Right Panel: User Notes & Chat --- */}
      <div className="flex-1 flex flex-col bg-[#FDFBF7] h-full">
         {/* Tabs */}
         <div className="flex border-b border-ink/10 bg-paper">
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

         {/* Content */}
         <div className="flex-1 overflow-y-auto p-6 relative">
             {activeTab === 'notes' ? (
                 <div className="h-full flex flex-col">
                     <div className="flex-1 space-y-4 mb-4">
                        {existingNotes.length === 0 ? (
                            <div className="text-center text-subtext mt-10 text-sm">
                                点击左侧“+”或直接输入记录想法...
                            </div>
                        ) : (
                            existingNotes.map(note => (
                                <div key={note.id} className="group relative pl-4 border-l-2 border-sage/30 hover:border-sage transition-colors">
                                     <div className="flex justify-between items-baseline mb-1">
                                        <span className="font-mono text-[10px] text-sage">{note.timestamp || '00:00'}</span>
                                        <span className="text-[10px] text-subtext">{note.createdAt}</span>
                                     </div>
                                     <p className="text-sm text-ink whitespace-pre-wrap">{note.content}</p>
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
                        <div className="flex justify-between items-center mt-2 border-t border-gray-100 pt-2">
                             <span className="text-[10px] text-subtext font-mono">
                                 {Math.floor((parseInt(podcast.duration) * (progress / 100)))}:00
                             </span>
                             <button type="submit" disabled={!noteInput.trim()} className="bg-ink text-paper rounded-full p-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-sage transition-colors">
                                 <Send className="w-3 h-3" />
                             </button>
                        </div>
                     </form>
                 </div>
             ) : (
                <div className="h-full flex flex-col">
                    {/* Chat History */}
                    <div className="flex-1 space-y-4 mb-4 overflow-y-auto no-scrollbar pr-2">
                        {chatHistory.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                                    msg.role === 'user' 
                                    ? 'bg-ink text-paper rounded-br-none' 
                                    : 'bg-white border border-ink/10 text-ink rounded-bl-none shadow-sm'
                                }`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-ink/10 px-4 py-3 rounded-2xl rounded-bl-none shadow-sm flex gap-1 items-center">
                                    <div className="w-1.5 h-1.5 bg-ink/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-1.5 h-1.5 bg-ink/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-1.5 h-1.5 bg-ink/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Chat Input */}
                    <form onSubmit={handleChatSubmit} className="mt-auto bg-white border border-ink/10 rounded-xl p-1 pl-4 shadow-sm focus-within:ring-1 focus-within:ring-sage focus-within:border-sage transition-all flex items-center gap-2">
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