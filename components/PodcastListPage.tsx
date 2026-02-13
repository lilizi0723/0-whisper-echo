import React, { useState } from 'react';
import { ViewState, Podcast } from '../types';
import { ArrowLeft, Plus, Play, X, Check, Trash2, MoreHorizontal, Edit2 } from 'lucide-react';

interface Props {
  podcasts: Podcast[];
  categories: string[];
  onBack: () => void;
  onSelectPodcast: (podcast: Podcast) => void;
  onCreateCategory: (name: string) => void;
  onRenameCategory: (oldName: string, newName: string) => void;
  onDeleteCategory: (name: string, deletePodcasts: boolean) => void;
  onDeletePodcast: (id: string) => void;
}

const PodcastListPage: React.FC<Props> = ({ 
    podcasts, 
    categories, 
    onBack, 
    onSelectPodcast,
    onCreateCategory,
    onRenameCategory,
    onDeleteCategory,
    onDeletePodcast
}) => {
  const [activeCategory, setActiveCategory] = useState('全部');
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Category UI State
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  
  // Delete Modal State
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  const filteredPodcasts = activeCategory === '全部' 
    ? podcasts 
    : podcasts.filter(p => p.category === activeCategory);

  // --- Handlers ---

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      onCreateCategory(newCategoryName.trim());
      setActiveCategory(newCategoryName.trim());
      setNewCategoryName('');
      setIsAddingCategory(false);
    }
  };

  const startEditing = (cat: string) => {
      setEditingCategory(cat);
      setEditNameValue(cat);
  };

  const saveEditing = () => {
      if (editingCategory && editNameValue.trim() && editNameValue !== editingCategory) {
          onRenameCategory(editingCategory, editNameValue.trim());
          if (activeCategory === editingCategory) setActiveCategory(editNameValue.trim());
      }
      setEditingCategory(null);
  };

  const confirmDeleteCategory = (deletePodcasts: boolean) => {
      if (categoryToDelete) {
          onDeleteCategory(categoryToDelete, deletePodcasts);
          setActiveCategory('全部');
          setCategoryToDelete(null);
      }
  };

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

      {/* Modern Tabs with Management Feature */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar mb-8 pb-2 items-center">
        <button
            onClick={() => setActiveCategory('全部')}
            className={`whitespace-nowrap px-5 py-2 rounded-lg text-sm border-2 transition-all font-medium ${
              activeCategory === '全部' 
                ? 'bg-ink text-paper border-ink shadow-[4px_4px_0px_0px_#A7B89E] -translate-y-1' 
                : 'bg-transparent text-ink border-ink/20 hover:border-ink hover:bg-white'
            }`}
        >
            全部
        </button>

        {categories.map(cat => (
          editingCategory === cat ? (
              <div key={cat} className="flex items-center gap-1 bg-white border-2 border-ink rounded-lg px-2 py-1 h-[40px] animate-fade-in">
                  <input 
                      autoFocus
                      value={editNameValue}
                      onChange={(e) => setEditNameValue(e.target.value)}
                      onBlur={saveEditing}
                      onKeyDown={(e) => e.key === 'Enter' && saveEditing()}
                      className="w-24 outline-none text-sm bg-transparent"
                  />
                  <Check className="w-4 h-4 text-sage cursor-pointer" onClick={saveEditing} />
              </div>
          ) : (
            <div key={cat} className="relative group/tab">
                <button
                    onClick={() => setActiveCategory(cat)}
                    onDoubleClick={() => startEditing(cat)}
                    className={`whitespace-nowrap px-5 py-2 rounded-lg text-sm border-2 transition-all font-medium flex items-center gap-2 ${
                    activeCategory === cat 
                        ? 'bg-ink text-paper border-ink shadow-[4px_4px_0px_0px_#A7B89E] -translate-y-1' 
                        : 'bg-transparent text-ink border-ink/20 hover:border-ink hover:bg-white'
                    }`}
                >
                    {cat}
                    {/* Delete Icon appearing on Active Tab or Hover */}
                    <span 
                        onClick={(e) => { e.stopPropagation(); setCategoryToDelete(cat); }}
                        className={`w-4 h-4 flex items-center justify-center rounded-full hover:bg-red-500/20 hover:text-red-500 transition-colors ${activeCategory === cat ? 'opacity-100' : 'opacity-0 group-hover/tab:opacity-50'}`}
                    >
                        <X className="w-3 h-3" />
                    </span>
                </button>
            </div>
          )
        ))}

        {/* Add Category Button/Input */}
        {isAddingCategory ? (
          <div className="flex items-center gap-1 bg-white border-2 border-ink rounded-lg px-2 py-1 h-[40px] animate-fade-in">
            <input 
              type="text" 
              autoFocus
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="w-24 outline-none text-sm bg-transparent"
              placeholder="新主题..."
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            />
            <button onClick={handleAddCategory} className="p-1 hover:bg-sage/20 rounded text-sage"><Check className="w-4 h-4" /></button>
            <button onClick={() => setIsAddingCategory(false)} className="p-1 hover:bg-red-100 rounded text-red-400"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <button 
            onClick={() => setIsAddingCategory(true)}
            className="flex items-center justify-center w-10 h-10 rounded-lg border-2 border-dashed border-ink/30 text-ink/50 hover:border-ink hover:text-ink hover:bg-white transition-all flex-shrink-0"
            title="添加新主题"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-20 no-scrollbar">
        {filteredPodcasts.map((podcast, idx) => (
          <div 
            key={podcast.id}
            onClick={() => onSelectPodcast(podcast)}
            className="bg-white border-2 border-ink rounded-xl p-5 flex gap-5 cursor-pointer hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#1a1a1a] transition-all group items-center relative"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            {/* Delete Button (Visible on Hover) */}
            <button 
                onClick={(e) => { e.stopPropagation(); onDeletePodcast(podcast.id); }}
                className="absolute top-4 right-4 p-2 text-subtext hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all z-20"
                title="删除节目"
            >
                <Trash2 className="w-4 h-4" />
            </button>

            {/* Styled Cover */}
            <div className={`w-20 h-20 rounded-lg flex-shrink-0 ${podcast.coverColor} border border-ink flex items-center justify-center text-ink/40 relative overflow-hidden`}>
                <div className="absolute inset-0 bg-black/10"></div>
                <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 fill-current" />
                <span className="font-serif text-4xl absolute -bottom-2 -right-2 opacity-20 italic">0{idx + 1}</span>
            </div>
            
            <div className="flex-1 pr-8">
              <div className="flex justify-between items-start">
                 <h3 className="font-serif text-xl font-medium text-ink line-clamp-1 mb-1 group-hover:underline decoration-sage decoration-2">{podcast.title}</h3>
              </div>
              <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm text-subtext">{podcast.category}</span>
                  <span className="font-mono text-xs bg-gray-100 border border-ink/10 px-2 py-1 rounded text-subtext">{podcast.duration}</span>
              </div>
              
              {/* Custom Progress Bar */}
              <div className="w-full h-2 bg-gray-100 border border-ink/20 rounded-full overflow-hidden">
                 <div className="h-full bg-ink" style={{ width: `${podcast.progress}%` }}></div>
              </div>
            </div>
          </div>
        ))}
        {filteredPodcasts.length === 0 && (
           <div className="text-center py-20 opacity-50">
             <p className="font-serif italic text-xl">此主题下暂无节目</p>
           </div>
        )}
      </div>

      {/* Delete Category Confirmation Modal */}
      {categoryToDelete && (
          <div className="absolute inset-0 z-50 bg-ink/20 backdrop-blur-sm flex items-center justify-center animate-fade-in">
              <div className="bg-paper p-6 rounded-2xl border-2 border-ink shadow-lg max-w-sm w-full mx-6">
                  <h3 className="font-serif text-2xl mb-2">删除 "{categoryToDelete}" ?</h3>
                  <p className="text-sm text-subtext mb-6">你可以选择删除该专题下的所有节目，或者保留节目并将它们移至"其他"。</p>
                  
                  <div className="space-y-3">
                      <button 
                        onClick={() => confirmDeleteCategory(true)}
                        className="w-full py-3 bg-red-50 text-red-600 border border-red-200 rounded-lg font-medium hover:bg-red-100 transition-colors text-sm"
                      >
                          删除专题及所有节目
                      </button>
                      <button 
                        onClick={() => confirmDeleteCategory(false)}
                        className="w-full py-3 bg-white text-ink border border-ink/20 rounded-lg font-medium hover:border-ink transition-colors text-sm"
                      >
                          保留节目 (移至"其他")
                      </button>
                      <button 
                        onClick={() => setCategoryToDelete(null)}
                        className="w-full py-2 text-subtext hover:text-ink transition-colors text-sm mt-2"
                      >
                          取消
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Stylized Import Modal (Preserved from original) */}
      {showImportModal && (
        <div className="absolute inset-0 z-50 bg-ink/20 backdrop-blur-sm flex items-end sm:items-center justify-center">
            <div className="bg-paper w-full sm:max-w-md p-8 rounded-t-3xl sm:rounded-3xl border-t-2 sm:border-2 border-ink shadow-[0_-10px_40px_rgba(0,0,0,0.1)] animate-slide-up">
                <h3 className="font-serif text-3xl mb-6 italic">导入新节目</h3>
                <div className="space-y-5">
                    <div className="group">
                        <label className="text-xs font-mono tracking-widest uppercase block mb-2 text-subtext group-focus-within:text-ink">标题</label>
                        <input type="text" placeholder="例如：认知心理学入门" className="w-full bg-white border-2 border-ink/10 focus:border-ink rounded-lg p-3 text-ink placeholder:text-subtext/40 focus:outline-none transition-colors" />
                    </div>
                    <div className="group">
                        <label className="text-xs font-mono tracking-widest uppercase block mb-2 text-subtext group-focus-within:text-ink">节目名称</label>
                        <input type="text" placeholder="例如：疯投圈" className="w-full bg-white border-2 border-ink/10 focus:border-ink rounded-lg p-3 text-ink placeholder:text-subtext/40 focus:outline-none transition-colors" />
                    </div>
                    
                    <div className="py-8 border-2 border-dashed border-ink/20 hover:border-ink hover:bg-white rounded-xl text-center cursor-pointer transition-all">
                        <p className="font-serif text-lg italic text-ink/60">点击或拖拽上传音频文件</p>
                        <p className="text-xs font-mono text-subtext mt-1">支持 MP3, M4A 格式</p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button 
                             onClick={() => setShowImportModal(false)}
                             className="flex-1 py-3 border-2 border-ink rounded-full font-medium hover:bg-gray-100 transition-colors"
                        >
                            取消
                        </button>
                        <button 
                            onClick={() => setShowImportModal(false)}
                            className="flex-1 bg-ink text-paper py-3 rounded-full font-medium hover:bg-sage hover:text-white border-2 border-ink transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
                        >
                            确认导入
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default PodcastListPage;