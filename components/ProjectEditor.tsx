
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Project, Comment, CommentCategory } from '../types';
import { getVideo } from '../lib/db';

interface ProjectEditorProps {
  project: Project;
  onUpdate: (project: Project) => void;
}

const CATEGORIES: { id: CommentCategory; label: string; color: string; border: string; text: string }[] = [
  { id: 'video', label: 'וידאו', color: 'bg-blue-500', border: 'border-blue-500', text: 'text-blue-600' },
  { id: 'image', label: 'תמונה', color: 'bg-emerald-500', border: 'border-emerald-500', text: 'text-emerald-600' },
  { id: 'effect', label: 'אפקט', color: 'bg-purple-500', border: 'border-purple-500', text: 'text-purple-600' },
  { id: 'subtitles', label: 'כתוביות', color: 'bg-yellow-500', border: 'border-yellow-500', text: 'text-yellow-600' },
  { id: 'transition', label: 'מעבר', color: 'bg-pink-500', border: 'border-pink-500', text: 'text-pink-600' },
  { id: 'music', label: 'מוזיקה', color: 'bg-indigo-500', border: 'border-indigo-500', text: 'text-indigo-600' },
  { id: 'sound', label: 'סאונד', color: 'bg-cyan-500', border: 'border-cyan-500', text: 'text-cyan-600' },
  { id: 'ai', label: 'Ai', color: 'bg-fuchsia-600', border: 'border-fuchsia-600', text: 'text-fuchsia-600' },
  { id: 'bug', label: 'תקלה', color: 'bg-red-500', border: 'border-red-500', text: 'text-red-600' },
];

const ProjectEditor: React.FC<ProjectEditorProps> = ({ project, onUpdate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoSrc, setVideoSrc] = useState<string>(project.videoUrl);
  const [userName, setUserName] = useState<string>(sessionStorage.getItem('vrp_username') || '');
  const [showNamePrompt, setShowNamePrompt] = useState(!userName);
  const [commentText, setCommentText] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<CommentCategory>('video');
  const [isPausedForComment, setIsPausedForComment] = useState(false);
  const [activeOverlays, setActiveOverlays] = useState<Comment[]>([]);
  const [isLoadingVideo, setIsLoadingVideo] = useState(true);
  const [showShareSuccess, setShowShareSuccess] = useState(false);
  
  // AI State
  const [isAiSummarizing, setIsAiSummarizing] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    const loadVideoData = async () => {
      setIsLoadingVideo(true);
      try {
        if (project.googleDriveFileId) {
          const blob = await getVideo(project.googleDriveFileId);
          if (blob) {
            objectUrl = URL.createObjectURL(blob);
            setVideoSrc(objectUrl);
          } else {
            setVideoSrc(project.videoUrl);
          }
        } else {
             setVideoSrc(project.videoUrl);
        }
      } catch (err) {
        console.error("Cloud sync failed", err);
        setVideoSrc(project.videoUrl);
      } finally {
        setIsLoadingVideo(false);
      }
    };
    loadVideoData();
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [project.googleDriveFileId, project.videoUrl]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setShowShareSuccess(true);
    setTimeout(() => setShowShareSuccess(false), 2000);
  };

  const handleAiSummary = async () => {
    if (project.comments.length === 0) return;
    setIsAiSummarizing(true);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const commentsText = project.comments.map(c => 
            `- [${formatTime(c.timestamp)}] ${c.user} (${CATEGORIES.find(cat => cat.id === c.category)?.label}): ${c.text}`
        ).join('\n');

        const prompt = `
        You are a professional video editor assistant. 
        Analyze the following video review comments and create a concise, prioritized "To-Do List" for the editor in Hebrew.
        Group the tasks logically (e.g., Audio, Visuals, Story).
        Ignore resolved comments if marked.
        
        Comments:
        ${commentsText}
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        
        setAiSummary(response.text || "לא התקבל מענה מה-AI.");
        setShowAiModal(true);
    } catch (error) {
        console.error("AI Error", error);
        alert("שגיאה ביצירת סיכום. וודא שה-API KEY מוגדר כראוי.");
    } finally {
        setIsAiSummarizing(false);
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

  const addComment = () => {
    if (!commentText.trim()) return;
    const newComment: Comment = {
      id: crypto.randomUUID(),
      timestamp: videoRef.current ? videoRef.current.currentTime : 0,
      text: commentText,
      user: userName,
      createdAt: Date.now(),
      category: selectedCategory,
      priority: 'medium',
      resolved: false
    };
    onUpdate({ ...project, comments: [...project.comments, newComment].sort((a,b) => a.timestamp - b.timestamp) });
    setCommentText('');
    setIsPausedForComment(false);
    videoRef.current?.play();
  };

  const jumpToTime = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      videoRef.current.play();
    }
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
      {/* Name Prompt Modal */}
      {showNamePrompt && (
        <div className="fixed inset-0 z-[300] bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white p-10 rounded-[32px] w-full max-w-sm text-center shadow-2xl">
            <h3 className="text-xl font-black mb-6">שלום! מי הצופה?</h3>
            <input 
              autoFocus
              type="text" 
              placeholder="השם שלכם..." 
              className="w-full border-2 border-slate-100 bg-slate-50 rounded-2xl p-4 mb-6 font-bold outline-none focus:border-emerald-500 transition-all text-center"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
            />
            <button 
              disabled={!userName.trim()}
              onClick={() => { sessionStorage.setItem('vrp_username', userName); setShowNamePrompt(false); }}
              className="w-full bg-[#22c55e] text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
            >התחל בביקורת</button>
          </div>
        </div>
      )}

      {/* AI Summary Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white p-8 rounded-[32px] w-full max-w-2xl shadow-2xl flex flex-col max-h-[80vh] animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 text-purple-600 rounded-xl"><SparklesIcon /></div>
                    <h3 className="text-2xl font-black text-slate-900">סיכום משימות (AI)</h3>
                </div>
                <button onClick={() => setShowAiModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 font-bold">סגור</button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div className="prose prose-slate max-w-none whitespace-pre-wrap font-medium text-slate-700 leading-relaxed">
                    {aiSummary}
                </div>
            </div>
            <div className="mt-6 flex justify-end">
                <button onClick={() => setShowAiModal(false)} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all">הבנתי, תודה</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="lg:col-span-8 space-y-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-[24px] border border-slate-200 shadow-sm">
             <h2 className="text-xl font-black text-slate-800 px-2 truncate">{project.title}</h2>
             <button 
                onClick={handleShare}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl font-bold transition-all active:scale-95 relative"
             >
                {showShareSuccess ? <span className="text-emerald-600">הועתק!</span> : <><ShareIcon /> שתף פרויקט</>}
             </button>
        </div>

        <div className="relative bg-black rounded-[40px] overflow-hidden shadow-2xl aspect-video group ring-1 ring-slate-200" title="נגן הווידאו">
          {isLoadingVideo ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-slate-900">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">טוען...</p>
            </div>
          ) : (
            <video 
              ref={videoRef} 
              src={videoSrc} 
              onTimeUpdate={handleTimeUpdate} 
              controls 
              className="w-full h-full"
              playsInline
              crossOrigin="anonymous"
            />
          )}
          
          <div className="absolute inset-0 pointer-events-none p-8 flex flex-col justify-end items-start pb-16">
            {activeOverlays.map((c) => {
                const catInfo = CATEGORIES.find(cat => cat.id === c.category);
                return (
                  <div key={c.id} className={`bg-white/95 backdrop-blur-md p-5 rounded-2xl shadow-2xl mb-4 border-r-[6px] ${catInfo?.border || 'border-slate-500'} animate-in slide-in-from-right max-w-md pointer-events-auto`}>
                    <div className="flex items-center justify-between mb-1 gap-4">
                      <span className={`text-[10px] font-black uppercase tracking-wider ${catInfo?.text || 'text-slate-500'}`}>
                        {catInfo?.label}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400">{c.user}</span>
                    </div>
                    <p className="font-bold text-slate-800 leading-tight">{c.text}</p>
                  </div>
                );
            })}
          </div>
        </div>

        <button 
          onClick={() => { 
            if(videoRef.current) {
              videoRef.current.pause(); 
              setIsPausedForComment(true); 
            }
          }}
          className="w-full bg-[#22c55e] hover:bg-emerald-600 text-white py-6 rounded-[28px] font-black text-xl shadow-xl flex items-center justify-center gap-4 transition-all active:scale-[0.98]"
        >
          <PlusIcon /> הוסף ביקורת ב-{formatTime(currentTime)}
        </button>

        {isPausedForComment && (
          <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-xl space-y-6 animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center">
                <h4 className="text-lg font-black text-slate-900">הוספת הערה</h4>
                <span className="bg-emerald-50 text-emerald-600 text-xs font-black px-3 py-1 rounded-full">{formatTime(currentTime)}</span>
            </div>
            <textarea 
              autoFocus
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 font-bold min-h-[120px] outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-slate-700"
              placeholder="מה צריך לתקן?"
            />
            <div className="space-y-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">קטגוריה:</span>
              <div className="flex gap-2 flex-wrap">
                {CATEGORIES.map(cat => (
                  <button 
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all ${selectedCategory === cat.id ? `${cat.color} text-white ${cat.border} shadow-md scale-105` : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'}`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-4 pt-2">
              <button onClick={addComment} className="flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg transition-all">שמור</button>
              <button onClick={() => setIsPausedForComment(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-500 py-4 rounded-2xl font-bold transition-all">ביטול</button>
            </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-4 bg-white border border-slate-200 rounded-[32px] p-6 h-[750px] flex flex-col shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black">הערות ({project.comments.length})</h2>
          
          {/* AI Summary Button */}
          {project.comments.length > 0 && (
            <button 
              onClick={handleAiSummary}
              disabled={isAiSummarizing}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-bold shadow-lg shadow-purple-500/20 hover:scale-105 transition-all disabled:opacity-70"
            >
              {isAiSummarizing ? (
                <span className="animate-pulse">חושב...</span>
              ) : (
                <>
                  <SparklesIcon /> AI סיכום משימות
                </>
              )}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-1 pb-4">
          {project.comments.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 text-center px-4">
              <div className="mb-4 opacity-20"><PlusIcon /></div>
              <p className="text-sm font-bold uppercase tracking-widest">אין הערות עדיין</p>
            </div>
          ) : (
            project.comments.map(c => {
                const catInfo = CATEGORIES.find(cat => cat.id === c.category);
                return (
                  <div 
                    key={c.id} 
                    onClick={() => jumpToTime(c.timestamp)} 
                    className={`p-5 rounded-[24px] bg-slate-50 border-2 cursor-pointer hover:shadow-md transition-all group relative overflow-hidden
                      ${Math.abs(currentTime - c.timestamp) < 0.5 ? 'border-emerald-500 bg-emerald-50/50' : 'border-transparent hover:border-slate-200'}`}
                  >
                    <div className={`absolute top-0 right-0 bottom-0 w-1.5 ${catInfo?.color || 'bg-slate-300'}`}></div>
                    <div className="flex justify-between items-start mb-3 pr-2">
                      <span className="text-[10px] font-black bg-white text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm">
                        {formatTime(c.timestamp)}
                      </span>
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] font-black text-slate-400 uppercase leading-none">{c.user}</span>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-slate-700 leading-snug pr-2">{c.text}</p>
                    <div className="mt-3 flex items-center gap-2 pr-2">
                       <span className={`px-2 py-0.5 rounded-md text-[9px] font-black text-white uppercase ${catInfo?.color || 'bg-slate-400'}`}>
                          {catInfo?.label}
                       </span>
                    </div>
                  </div>
                );
            })
          )}
        </div>
      </div>
    </div>
  );
};

const PlusIcon = () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M12 5v14m-7-7h14" /></svg>;
const ShareIcon = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8m-4-6l-4-4m0 0L8 8m4-4v12"/></svg>;
const SparklesIcon = () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>;

export default ProjectEditor;
