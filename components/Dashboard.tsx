
import React, { useState } from 'react';
import { Project } from '../types';

interface DashboardProps {
  projects: Project[];
  onCreate: (title: string, videoUrl: string, thumbnailUrl: string) => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ projects, onCreate, onSelect, onDelete }) => {
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title && videoUrl) {
      onCreate(title, videoUrl, thumbnailUrl || `https://picsum.photos/seed/${title}/400/225`);
      resetForm();
    }
  };

  const resetForm = () => {
    setTitle('');
    setVideoUrl('');
    setThumbnailUrl('');
    setShowModal(false);
  };

  const processFile = (file: File) => {
    if (file && file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      
      setIsGeneratingThumbnail(true);
      const video = document.createElement('video');
      video.src = url;
      video.currentTime = 1;
      video.onloadeddata = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext('2d');
        setTimeout(() => {
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
          setThumbnailUrl(canvas.toDataURL('image/jpeg'));
          setIsGeneratingThumbnail(false);
        }, 800);
      };
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-white tracking-tighter">הפרויקטים שלי</h1>
          <p className="text-slate-400 mt-3 font-medium text-lg">ניהול ביקורות וידאו בצורה חכמה, מהירה ואינטואיטיבית.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-5 rounded-[24px] font-black transition-all hover:shadow-indigo-500/30 hover:shadow-2xl flex items-center gap-3 active:scale-95 text-lg"
        >
          <PlusIcon />
          פרויקט חדש
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white/[0.02] border border-dashed border-white/10 rounded-[60px] p-32 text-center flex flex-col items-center justify-center space-y-6 backdrop-blur-sm">
          <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center text-slate-700">
            <VideoIcon size={48} />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-black text-white">הלוח נקי</h3>
            <p className="text-slate-500 max-w-xs text-sm font-medium">העלו את הסרטון הראשון שלכם והתחילו את תהליך הביקורת.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map(project => {
             const resolvedCount = project.comments.filter(c => c.resolved).length;
             const progress = project.comments.length > 0 ? Math.round((resolvedCount / project.comments.length) * 100) : 0;
             
             return (
              <div 
                key={project.id}
                className="group bg-white/[0.03] border border-white/5 rounded-[40px] overflow-hidden hover:border-indigo-500/40 transition-all duration-500 shadow-lg hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] flex flex-col"
              >
                <div 
                  className="relative aspect-video cursor-pointer overflow-hidden"
                  onClick={() => onSelect(project.id)}
                >
                  <img 
                    src={project.thumbnailUrl} 
                    alt={project.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />
                  
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 scale-75 group-hover:scale-100">
                     <div className="bg-white text-black p-6 rounded-full shadow-2xl">
                        <PlayIcon size={28} />
                     </div>
                  </div>
                  
                  <div className="absolute top-6 right-6 bg-black/60 backdrop-blur-xl px-4 py-2 rounded-full text-[10px] font-black text-white border border-white/10 uppercase tracking-widest">
                    {project.comments.length} הערות
                  </div>

                  {project.comments.length > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10">
                       <div 
                        className={`h-full transition-all duration-1000 ${progress === 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                        style={{ width: `${progress}%` }}
                       />
                    </div>
                  )}
                </div>
                
                <div className="p-8 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-white mb-3 truncate group-hover:text-indigo-400 transition-colors tracking-tight">{project.title}</h3>
                    <div className="flex items-center gap-3">
                       <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">
                         {new Date(project.createdAt).toLocaleDateString('he-IL')}
                       </span>
                       {progress === 100 && project.comments.length > 0 && (
                         <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full uppercase">מוכן לשידור</span>
                       )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-10">
                    <button 
                      onClick={() => onSelect(project.id)}
                      className="text-sm font-black text-indigo-400 hover:text-indigo-300 transition-all flex items-center gap-2"
                    >
                      פתיחת עורך <ArrowIcon />
                    </button>
                    <button 
                      onClick={() => onDelete(project.id)}
                      className="p-3 text-slate-700 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all active:scale-90"
                    >
                      <TrashIcon size={20} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-2xl" onClick={() => setShowModal(false)} />
          <form 
            onSubmit={handleSubmit}
            className="relative bg-[#0a0a0a] border border-white/10 rounded-[50px] p-12 w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-300"
          >
            <h2 className="text-4xl font-black text-white mb-10 tracking-tighter">יצירת פרויקט חדש</h2>
            <div className="space-y-8">
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">שם הפרויקט</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-white font-bold text-lg"
                  placeholder="למשל: פרסומת קיץ 2024"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">קובץ וידאו (גרירה או בחירה)</label>
                <div className="relative">
                   <input 
                    type="file" 
                    accept="video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="video-upload"
                  />
                  <label 
                    htmlFor="video-upload"
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`flex flex-col items-center justify-center border-2 border-dashed rounded-[40px] p-16 cursor-pointer transition-all duration-300
                      ${isDragging ? 'border-indigo-500 bg-indigo-500/10 scale-[1.02]' : ''}
                      ${videoUrl ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/10 hover:border-indigo-500/50 hover:bg-white/5'}
                    `}
                  >
                    {isGeneratingThumbnail ? (
                      <div className="flex flex-col items-center">
                         <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                         <span className="text-xs font-black text-slate-500 uppercase tracking-widest">מייצר תצוגה מקדימה...</span>
                      </div>
                    ) : videoUrl ? (
                      <div className="text-emerald-400 flex flex-col items-center gap-4">
                         <div className="bg-emerald-400/10 p-5 rounded-full">
                            <CheckIcon size={28} />
                         </div>
                         <span className="text-sm font-black uppercase tracking-widest">הווידאו נטען</span>
                         {thumbnailUrl && <img src={thumbnailUrl} className="mt-4 w-56 aspect-video rounded-2xl object-cover shadow-2xl border border-white/10" />}
                      </div>
                    ) : (
                      <>
                        <div className="bg-white/5 p-6 rounded-full mb-5 transition-colors">
                           <UploadIcon />
                        </div>
                        <span className="text-slate-300 text-lg font-bold">גרור סרטון לכאן</span>
                        <span className="text-slate-600 text-[11px] mt-2 font-black uppercase tracking-widest">או לחץ לבחירה מהמחשב</span>
                      </>
                    )}
                  </label>
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-12">
              <button 
                type="submit"
                className="flex-[2] bg-indigo-600 hover:bg-indigo-500 py-5 rounded-[24px] font-black shadow-xl shadow-indigo-500/20 transition-all text-white disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] text-lg"
                disabled={!videoUrl || isGeneratingThumbnail}
              >
                התחל לעבוד
              </button>
              <button 
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 px-6 py-5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-[24px] font-black text-slate-400 transition-all text-xs uppercase tracking-widest"
              >
                ביטול
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

const ArrowIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
);
const PlusIcon = () => (
  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M12 5v14m-7-7h14" /></svg>
);
const PlayIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
);
const TrashIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
);
const VideoIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
);
const UploadIcon = () => (
  <svg width="36" height="36" className="text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
);
const CheckIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
);

export default Dashboard;
