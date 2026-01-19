
import React, { useState } from 'react';
import { Project } from '../types';
import { saveVideo } from '../lib/db';

interface DashboardProps {
  projects: Project[];
  onCreate: (title: string, videoUrl: string, thumbnailUrl: string, googleDriveFileId?: string) => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ projects, onCreate, onSelect, onDelete }) => {
  const [showModal, setShowModal] = useState(false);
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [title, setTitle] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      let finalVideoUrl = '';
      let fileId: string | undefined = undefined;

      if (uploadMode === 'file' && videoFile) {
        // Local simulation with persistence
        fileId = `cloud_${crypto.randomUUID()}`;
        try {
          await saveVideo(fileId, videoFile);
        } catch (err) {
          console.error("Local caching failed", err);
        }

        // Fake upload progress
        for(let i = 0; i <= 100; i += 20) {
          setUploadProgress(i);
          await new Promise(r => setTimeout(r, 100));
        }
        finalVideoUrl = URL.createObjectURL(videoFile);
      } else if (uploadMode === 'url' && externalUrl) {
        // Real external link for cross-device support
        finalVideoUrl = externalUrl;
        setUploadProgress(100);
      }

      if (finalVideoUrl) {
        const thumb = thumbnailUrl || `https://picsum.photos/seed/${encodeURIComponent(title)}/400/225`;
        onCreate(title, finalVideoUrl, thumb, fileId);
        resetForm();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setVideoFile(null);
    setExternalUrl('');
    setThumbnailUrl('');
    setShowModal(false);
    setUploadProgress(0);
    setUploadMode('file');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      // Generate thumbnail locally
      const url = URL.createObjectURL(file);
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
          if (!title) setTitle(file.name.split('.')[0]);
        }, 500);
      };
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">הפרויקטים שלי</h1>
          <p className="text-slate-500 mt-2 font-medium">ניהול ושיתוף ביקורות וידאו בצורה מקצועית.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-[#22c55e] hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 active:scale-95"
        >
          <PlusIcon /> פרויקט חדש
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-[40px] p-24 text-center flex flex-col items-center justify-center space-y-6">
           <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center animate-pulse">
              <UploadIcon />
           </div>
           <div>
              <h3 className="text-xl font-bold text-slate-900">אין פרויקטים עדיין</h3>
              <p className="text-slate-400 max-w-xs mx-auto mt-2 font-medium">העלו וידאו או הדביקו קישור כדי להתחיל.</p>
           </div>
           <button 
             onClick={() => setShowModal(true)} 
             className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg"
           >
             צור פרויקט ראשון
           </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map(project => (
            <div key={project.id} className="bg-white border border-slate-200 rounded-[32px] overflow-hidden hover:shadow-xl hover:border-emerald-500 transition-all flex flex-col group h-full">
              <div 
                className="relative aspect-video cursor-pointer overflow-hidden bg-slate-100" 
                onClick={() => onSelect(project.id)}
              >
                <img 
                  src={project.thumbnailUrl} 
                  alt={project.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/640x360?text=No+Thumbnail'; }}
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                  <PlayIcon size={48} />
                </div>
                <div className="absolute top-4 left-4 bg-emerald-500 text-white text-[9px] font-black px-3 py-1 rounded-full shadow-lg">
                  {project.comments.length} הערות
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-lg font-bold text-slate-900 mb-4 truncate" title={project.title}>{project.title}</h3>
                <div className="flex justify-between items-center mt-auto">
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                    {new Date(project.createdAt).toLocaleDateString('he-IL')}
                  </span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <TrashIcon />
                    </button>
                    <button 
                      onClick={() => onSelect(project.id)} 
                      className="px-4 py-2 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-600 rounded-xl text-xs font-bold transition-all border border-slate-100"
                    >
                      צפייה
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <form onSubmit={handleSubmit} className="bg-white p-8 md:p-10 rounded-[40px] w-full max-w-xl shadow-2xl space-y-8 animate-in zoom-in-95 duration-300">
            <div className="text-center">
               <h2 className="text-2xl font-black">הוספת וידאו</h2>
               <p className="text-slate-400 text-sm mt-1">בחרו איך להוסיף את הווידאו למערכת</p>
            </div>

            {/* Toggle Upload Mode */}
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setUploadMode('file')}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${uploadMode === 'file' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                העלאת קובץ
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('url')}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${uploadMode === 'url' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                קישור חיצוני (למובייל)
              </button>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 mr-1">שם הפרויקט</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-slate-800"
                  placeholder="לדוגמה: פרסומת טלוויזיה v1"
                  required
                />
              </div>
              
              {uploadMode === 'file' ? (
                <div className="border-2 border-dashed border-slate-200 bg-slate-50 rounded-3xl p-10 text-center relative hover:border-emerald-500 hover:bg-emerald-50/30 transition-all group">
                  <input 
                    type="file" 
                    accept="video/*" 
                    onChange={handleFileUpload} 
                    className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                    disabled={isUploading}
                  />
                  {videoFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                         <CheckIcon />
                      </div>
                      <span className="text-sm font-bold text-emerald-600">{videoFile.name}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="text-slate-300 group-hover:text-emerald-400 transition-colors"><UploadIcon /></div>
                      <span className="text-slate-400 font-bold text-sm">לחצו לבחירת קובץ מהמחשב</span>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 mr-1">קישור לווידאו (MP4)</label>
                   <input 
                    type="url" 
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-slate-800 ltr"
                    placeholder="https://example.com/video.mp4"
                    dir="ltr"
                  />
                  <p className="text-[10px] text-slate-400 mt-2 mr-1">שימו לב: הקישור חייב להיות ציבורי וישיר לקובץ וידאו כדי לעבוד בכל המכשירים.</p>
                </div>
              )}
            </div>

            {isUploading && (
              <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                  <span className="text-emerald-600">מעבד נתונים...</span>
                  <span className="text-slate-400">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden shadow-inner">
                  <div className="bg-emerald-500 h-full transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button 
                type="submit" 
                disabled={isUploading || (uploadMode === 'file' && !videoFile) || (uploadMode === 'url' && !externalUrl)}
                className="flex-[2] bg-[#22c55e] hover:bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all active:scale-[0.98]"
              >
                {isUploading ? 'יוצר פרויקט...' : 'צור פרויקט'}
              </button>
              <button 
                type="button" 
                onClick={() => setShowModal(false)} 
                className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl font-bold transition-all"
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

const PlusIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M12 5v14m-7-7h14" /></svg>;
const PlayIcon = ({ size = 24 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>;
const TrashIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const UploadIcon = () => <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>;
const CheckIcon = () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>;

export default Dashboard;
