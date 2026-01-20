
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Project, Comment, CommentCategory } from '../types';

interface ProjectEditorProps {
  project: Project;
  onUpdate: (project: Project) => void;
}

const CATEGORIES: { id: CommentCategory; label: string; color: string }[] = [
  { id: 'video', label: 'וידאו', color: 'bg-blue-500' },
  { id: 'image', label: 'תמונה', color: 'bg-emerald-500' },
  { id: 'effect', label: 'אפקט', color: 'bg-purple-500' },
  { id: 'subtitles', label: 'כתוביות', color: 'bg-yellow-500' },
  { id: 'transition', label: 'מעבר', color: 'bg-pink-500' },
  { id: 'music', label: 'מוזיקה', color: 'bg-indigo-500' },
  { id: 'sound', label: 'סאונד', color: 'bg-cyan-500' },
  { id: 'ai', label: 'Ai', color: 'bg-fuchsia-600' },
  { id: 'bug', label: 'תקלה', color: 'bg-red-500' },
];

const PRIORITIES = [
  { id: 'low', label: 'נמוכה', color: 'bg-slate-700' },
  { id: 'medium', label: 'בינונית', color: 'bg-orange-600' },
  { id: 'high', label: 'דחופה', color: 'bg-red-600' },
];

const ProjectEditor: React.FC<ProjectEditorProps> = ({ project, onUpdate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [userName, setUserName] = useState<string>('');
  const [tempUserName, setTempUserName] = useState<string>('');
  const [showNamePrompt, setShowNamePrompt] = useState(true);
  
  const [currentTime, setCurrentTime] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CommentCategory>('video');
  const [selectedPriority, setSelectedPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [isPausedForComment, setIsPausedForComment] = useState(false);
  const [activeOverlays, setActiveOverlays] = useState<Comment[]>([]);
  const [copySuccess, setCopySuccess] = useState(false);
  
  const [filterCategory, setFilterCategory] = useState<CommentCategory | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<string | 'all'>('all');

  const [seekStep, setSeekStep] = useState<number>(10);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

  useEffect(() => {
    const storedName = sessionStorage.getItem('vrp_username');
    if (storedName) {
      setUserName(storedName);
      setShowNamePrompt(false);
    }
  }, []);

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempUserName.trim()) {
      setUserName(tempUserName.trim());
      sessionStorage.setItem('vrp_username', tempUserName.trim());
      setShowNamePrompt(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);
      const visible = project.comments.filter(c => 
        time >= c.timestamp && time <= c.timestamp + 2.5 && !c.resolved
      );
      setActiveOverlays(visible);
    }
  };

  const filteredComments = useMemo(() => {
    return project.comments.filter(c => {
      const catMatch = filterCategory === 'all' || c.category === filterCategory;
      const priMatch = filterPriority === 'all' || c.priority === filterPriority;
      return catMatch && priMatch;
    });
  }, [project.comments, filterCategory, filterPriority]);

  const progress = useMemo(() => {
    if (project.comments.length === 0) return 0;
    const resolvedCount = project.comments.filter(c => c.resolved).length;
    return Math.round((resolvedCount / project.comments.length) * 100);
  }, [project.comments]);

  const addComment = () => {
    if (!commentText.trim()) return;

    const newComment: Comment = {
      id: crypto.randomUUID(),
      timestamp: videoRef.current ? videoRef.current.currentTime : 0,
      text: commentText,
      user: userName || 'אורח',
      createdAt: Date.now(),
      category: selectedCategory,
      priority: selectedPriority,
      resolved: false
    };

    const updatedProject = {
      ...project,
      comments: [...project.comments, newComment].sort((a, b) => a.timestamp - b.timestamp)
    };

    onUpdate(updatedProject);
    setCommentText('');
    setSelectedCategory('video');
    setSelectedPriority('medium');
    setIsPausedForComment(false);
    videoRef.current?.play();
  };

  const toggleResolved = (e: React.MouseEvent, commentId: string) => {
    e.stopPropagation();
    const updatedProject = {
      ...project,
      comments: project.comments.map(c => 
        c.id === commentId ? { ...c, resolved: !c.resolved } : c
      )
    };
    onUpdate(updatedProject);
  };

  const confirmDelete = () => {
    if (commentToDelete) {
      const updatedProject = {
        ...project,
        comments: project.comments.filter(c => c.id !== commentToDelete)
      };
      onUpdate(updatedProject);
      setCommentToDelete(null);
    }
  };

  const seek = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
  };

  const jumpToTime = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      videoRef.current.play();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCategoryColor = (catId: CommentCategory) => {
    return CATEGORIES.find(c => c.id === catId)?.color || 'bg-indigo-500';
  };

  const handleShare = async () => {
    // Generate a link that is shareable (pointing to the app root)
    const url = window.location.origin + window.location.pathname + `?project=${project.id}`;
    await navigator.clipboard.writeText(url);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700">
      {showNamePrompt && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[200] flex items-center justify-center p-4">
           <form onSubmit={handleNameSubmit} className="bg-[#0a0a0a] border border-white/10 p-12 rounded-[50px] w-full max-w-md shadow-2xl">
              <div className="w-20 h-20 bg-indigo-600 rounded-[28px] flex items-center justify-center mb-8 mx-auto shadow-lg shadow-indigo-500/30">
                 <span className="text-white font-black text-3xl">K</span>
              </div>
              <h3 className="text-3xl font-black text-white mb-3 text-center tracking-tighter">ברוכים הבאים ל-Kozy</h3>
              <p className="text-slate-500 text-sm mb-10 text-center font-medium">הזינו את שמכם כדי שנוכל לשייך את ההערות שלכם בצורה מסודרת.</p>
              <input 
                autoFocus
                type="text"
                value={tempUserName}
                onChange={(e) => setTempUserName(e.target.value)}
                placeholder="השם שלך..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-white outline-none focus:ring-2 focus:ring-indigo-500 mb-8 transition-all text-center text-xl font-bold"
                required
              />
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 py-5 rounded-2xl font-black text-white transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98] text-lg">
                התחל עבודה
              </button>
           </form>
        </div>
      )}

      {commentToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[300] flex items-center justify-center p-4">
           <div className="bg-[#0a0a0a] border border-white/10 p-10 rounded-[40px] w-full max-w-sm shadow-2xl animate-in zoom-in-95">
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                 <TrashIcon size={32} />
              </div>
              <h3 className="text-2xl font-black text-white mb-3 text-center tracking-tight">מחיקת הערה</h3>
              <p className="text-slate-500 text-sm mb-8 text-center font-medium">האם אתם בטוחים? פעולה זו אינה ניתנת לביטול.</p>
              <div className="flex gap-4">
                 <button onClick={confirmDelete} className="flex-1 bg-red-600 hover:bg-red-500 py-4 rounded-2xl font-black text-white transition-all active:scale-95">מחק</button>
                 <button onClick={() => setCommentToDelete(null)} className="flex-1 bg-white/5 hover:bg-white/10 py-4 rounded-2xl font-black text-slate-400 transition-all border border-white/10">ביטול</button>
              </div>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 h-full">
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white/[0.03] border border-white/10 p-8 rounded-[32px] flex items-center justify-between gap-6 backdrop-blur-xl">
            <div className="flex items-center gap-6">
               <div className="w-14 h-14 bg-indigo-500/10 rounded-[20px] flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                  <VideoIcon size={28} />
               </div>
               <div>
                  <h1 className="text-3xl font-black text-white truncate max-w-xs md:max-w-md tracking-tighter">{project.title}</h1>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] flex items-center gap-3 mt-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                    מחובר כ: {userName}
                  </p>
               </div>
            </div>
            <button 
              onClick={handleShare}
              className={`flex items-center gap-3 px-8 py-3.5 rounded-[18px] text-xs font-black transition-all ${copySuccess ? 'bg-emerald-600 shadow-emerald-500/20 shadow-xl' : 'bg-white/5 hover:bg-white/10 border border-white/10 text-white'}`}
            >
              {copySuccess ? 'הקישור הועתק!' : 'שתף פרויקט'}
            </button>
          </div>

          <div className="relative bg-black rounded-[50px] overflow-hidden shadow-2xl ring-1 ring-white/10 group aspect-video">
            <video 
              ref={videoRef}
              src={project.videoUrl}
              onTimeUpdate={handleTimeUpdate}
              controls
              className="w-full h-full object-contain"
              playsInline
            />

            <div className="absolute inset-0 pointer-events-none p-10">
              {activeOverlays.map((comment, index) => (
                <div 
                  key={comment.id}
                  className="absolute animate-in zoom-in slide-in-from-bottom-6 duration-500"
                  style={{ bottom: `${60 + (index * 85)}px`, right: '60px', maxWidth: '70%', zIndex: 40 }}
                >
                  <div className={`${getCategoryColor(comment.category)}/40 backdrop-blur-2xl text-white px-8 py-4 rounded-[30px] shadow-2xl flex items-center gap-5 border border-white/20`}>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">
                        {CATEGORIES.find(cat => cat.id === comment.category)?.label} • {comment.user}
                      </span>
                      <p className="text-lg font-bold leading-tight tracking-tight">{comment.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {isPausedForComment && (
              <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[100] flex items-center justify-center p-4">
                 <div className="bg-[#0a0a0a] border border-white/10 p-10 rounded-[50px] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300">
                    <h4 className="text-3xl font-black text-white mb-8 flex items-center gap-4 tracking-tighter">
                      <div className="w-4 h-4 rounded-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)]"></div>
                      הערה ב-{formatTime(currentTime)}
                    </h4>
                    
                    <textarea 
                      autoFocus
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-[30px] p-6 mb-8 outline-none focus:ring-2 focus:ring-indigo-500 min-h-[160px] text-white text-lg font-medium transition-all"
                      placeholder="מה צריך לשפר בחלק הזה?"
                    />

                    <div className="space-y-8 mb-10">
                      <div>
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] block mb-4">קטגוריית ביקורת</span>
                        <div className="flex flex-wrap gap-3">
                          {CATEGORIES.map((cat) => (
                            <button
                              key={cat.id}
                              onClick={() => setSelectedCategory(cat.id)}
                              className={`px-5 py-2.5 rounded-2xl text-[11px] font-black transition-all border ${
                                selectedCategory === cat.id 
                                  ? `${cat.color} text-white border-white/20 shadow-xl scale-105` 
                                  : 'bg-white/5 text-slate-500 border-white/5 hover:border-white/10'
                              }`}
                            >
                              {cat.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] block mb-4">רמת עדיפות</span>
                        <div className="grid grid-cols-3 gap-4">
                          {PRIORITIES.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => setSelectedPriority(p.id as any)}
                              className={`py-3.5 rounded-2xl text-[11px] font-black transition-all border ${
                                selectedPriority === p.id 
                                  ? 'bg-indigo-600 text-white border-white/20 shadow-xl' 
                                  : 'bg-white/5 text-slate-500 border-white/5'
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <button 
                        onClick={addComment}
                        className="flex-[2] bg-indigo-600 hover:bg-indigo-500 py-5 rounded-[24px] font-black transition-all text-white shadow-2xl shadow-indigo-500/30 active:scale-95 text-lg"
                      >
                        שמור ביקורת
                      </button>
                      <button 
                        onClick={() => { setIsPausedForComment(false); videoRef.current?.play(); }}
                        className="flex-1 bg-white/5 hover:bg-white/10 rounded-[24px] font-black text-slate-500 transition-all border border-white/5"
                      >
                        ביטול
                      </button>
                    </div>
                 </div>
              </div>
            )}
          </div>

          <div className="bg-white/[0.03] border border-white/10 p-4 rounded-[30px] flex items-center justify-between gap-6 backdrop-blur-md">
             <button 
                onClick={() => seek(-seekStep)}
                className="w-12 h-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center text-white transition-all active:scale-90"
                title={`אחורה ${seekStep}s`}
              >
                <ArrowIcon direction="left" />
             </button>

             <div className="flex items-center gap-4">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] hidden sm:inline">דילוג</span>
                <div className="flex bg-white/5 rounded-2xl p-1 border border-white/5">
                   {[0.5, 10, 60].map(step => (
                     <button 
                      key={step}
                      onClick={() => setSeekStep(step)}
                      className={`px-5 py-2.5 rounded-[14px] text-[10px] font-black transition-all ${seekStep === step ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                     >
                       {step < 1 ? step : `${step}s`}
                     </button>
                   ))}
                </div>
             </div>
             
             <button 
                onClick={() => seek(seekStep)}
                className="w-12 h-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center text-white transition-all active:scale-90"
                title={`קדימה ${seekStep}s`}
              >
                <ArrowIcon direction="right" />
             </button>
          </div>

          <button 
            onClick={() => {
               if (videoRef.current) {
                  videoRef.current.pause();
                  setIsPausedForComment(true);
               }
            }}
            className="w-full bg-indigo-600 hover:bg-indigo-500 py-6 rounded-[35px] font-black flex items-center justify-center gap-4 transition-all text-white shadow-2xl shadow-indigo-500/30 active:scale-[0.98] ring-1 ring-white/10 text-xl tracking-tight"
          >
            <PlusIcon size={28} />
            הוסף הערה ב-{formatTime(currentTime)}
          </button>
        </div>

        <div className="lg:col-span-4 flex flex-col h-full bg-[#0a0a0a] border border-white/10 rounded-[45px] overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-white/10 space-y-6 bg-white/[0.02] backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-white tracking-tight">ביקורות</h2>
              <div className="text-[11px] font-black text-white bg-indigo-600 px-4 py-1.5 rounded-full uppercase shadow-lg shadow-indigo-500/20">{filteredComments.length}</div>
            </div>
            
            <div className="space-y-5">
               <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
                  <button 
                    onClick={() => setFilterCategory('all')}
                    className={`px-5 py-2.5 rounded-2xl text-[10px] font-black whitespace-nowrap border transition-all ${filterCategory === 'all' ? 'bg-white text-black border-white' : 'bg-white/5 text-slate-500 border-white/5 hover:border-white/10'}`}
                  >
                    הכל
                  </button>
                  {CATEGORIES.map(cat => (
                    <button 
                      key={cat.id}
                      onClick={() => setFilterCategory(cat.id)}
                      className={`px-5 py-2.5 rounded-2xl text-[10px] font-black whitespace-nowrap border transition-all ${filterCategory === cat.id ? `${cat.color} text-white border-white/10 shadow-lg` : 'bg-white/5 text-slate-500 border-white/5 hover:border-white/10'}`}
                    >
                      {cat.label}
                    </button>
                  ))}
               </div>
               <div className="flex gap-3">
                  {['all', 'low', 'medium', 'high'].map(p => (
                    <button 
                      key={p}
                      onClick={() => setFilterPriority(p)}
                      className={`flex-1 py-3 rounded-2xl text-[10px] font-black border transition-all ${filterPriority === p ? 'bg-white text-black border-white' : 'bg-white/5 text-slate-500 border-white/5 hover:border-white/10'}`}
                    >
                      {p === 'all' ? 'עדיפות' : PRIORITIES.find(pr => pr.id === p)?.label}
                    </button>
                  ))}
               </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
            {filteredComments.length === 0 ? (
              <div className="text-center py-32 opacity-20 text-slate-400">
                <p className="text-sm font-black uppercase tracking-[0.3em]">אין ביקורות להצגה</p>
              </div>
            ) : (
              filteredComments.map(comment => (
                <div 
                  key={comment.id}
                  onClick={() => jumpToTime(comment.timestamp)}
                  className={`p-6 rounded-[32px] border transition-all cursor-pointer group relative bg-white/[0.03] border-white/5 hover:border-white/20 hover:bg-white/[0.06]
                    ${comment.resolved ? 'opacity-50 grayscale-[0.8] border-emerald-500/20' : ''}
                    ${Math.abs(currentTime - comment.timestamp) < 0.5 ? 'ring-2 ring-indigo-500 bg-white/10 shadow-2xl scale-[1.02]' : ''}`}
                >
                  <div className="flex justify-between items-start mb-5">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-white bg-white/10 px-3 py-1.5 rounded-xl tracking-tighter">
                        {formatTime(comment.timestamp)}
                      </span>
                      <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black text-white uppercase tracking-wider ${comment.resolved ? 'bg-emerald-600' : getCategoryColor(comment.category)}`}>
                        {comment.resolved ? 'בוצע' : CATEGORIES.find(c => c.id === comment.category)?.label}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                       <button 
                        onClick={(e) => toggleResolved(e, comment.id)}
                        className={`p-2 rounded-xl transition-all ${comment.resolved ? 'text-emerald-400 bg-emerald-400/10' : 'text-slate-600 hover:text-emerald-400 hover:bg-emerald-400/10'}`}
                       >
                         <CheckIcon size={18} />
                       </button>
                       <button 
                        onClick={(e) => { e.stopPropagation(); setCommentToDelete(comment.id); }}
                        className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                       >
                         <TrashIcon size={18} />
                       </button>
                    </div>
                  </div>
                  
                  <p className={`text-base leading-relaxed mb-5 font-bold tracking-tight ${comment.resolved ? 'text-emerald-200 line-through' : 'text-slate-200'}`}>
                    {comment.text}
                  </p>
                  
                  <div className="flex items-center justify-between opacity-40 text-[9px] font-black">
                    <span>{new Date(comment.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-black text-white uppercase">
                        {comment.user[0]}
                      </div>
                      <span className="tracking-widest uppercase">{comment.user}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-8 border-t border-white/10 bg-black/40 backdrop-blur-xl">
             <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">סטטוס פרויקט</span>
                <span className={`text-[11px] font-black px-3 py-1 rounded-full ${progress === 100 ? 'text-emerald-400 bg-emerald-400/10' : 'text-indigo-400 bg-indigo-400/10'}`}>
                  {progress}% הושלם
                </span>
             </div>
             <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div 
                  className={`h-full transition-all duration-1000 ease-out ${progress === 100 ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-indigo-600 shadow-[0_0_15px_rgba(99,102,241,0.5)]'}`}
                  style={{ width: `${progress}%` }}
                ></div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ArrowIcon = ({ direction }: { direction: 'left' | 'right' }) => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" className={direction === 'left' ? '' : 'rotate-180'}>
    <path d="M15 19l-7-7 7-7" />
  </svg>
);
const PlusIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M12 5v14m-7-7h14" /></svg>
);
const TrashIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
);
const CheckIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
);
const VideoIcon = ({ size = 24 }: { size?: number }) => (
   <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
);

export default ProjectEditor;
