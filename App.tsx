import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import ProjectEditor from './components/ProjectEditor';
import { Project } from './types';

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('kozy_projects');
    if (saved) {
      try {
        setProjects(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse projects", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('kozy_projects', JSON.stringify(projects));
  }, [projects]);

  const handleCreateProject = (title: string, videoUrl: string, thumbnailUrl: string, googleDriveFileId?: string) => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      title,
      videoUrl,
      thumbnailUrl,
      createdAt: Date.now(),
      comments: [],
      googleDriveFileId,
      isCloudStored: true
    };
    setProjects(prev => [newProject, ...prev]);
    setActiveProjectId(newProject.id);
  };

  const handleUpdateProject = (updatedProject: Project) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  const handleDeleteProject = (id: string) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק פרויקט זה?')) {
      setProjects(prev => prev.filter(p => p.id !== id));
      if (activeProjectId === id) setActiveProjectId(null);
    }
  };

  const activeProject = projects.find(p => p.id === activeProjectId);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 selection:bg-emerald-500/30">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-[100] shadow-sm">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <button 
            onClick={() => setActiveProjectId(null)}
            className="flex items-center gap-3 group"
          >
            <div className="w-32 h-14 flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105 duration-300">
               <img 
                 src="https://images.squarespace-cdn.com/content/v1/5f3d4c3f585d8518e8055a73/1621422055663-Y9C9K5I1K9Y9W9W9W9W9/KOZY_LOGO-1.png" 
                 alt="Kozy Logo" 
                 className="max-w-full max-h-full object-contain mix-blend-multiply"
                 style={{ filter: 'contrast(1.1)' }}
               />
            </div>
          </button>
          
          <div className="flex items-center gap-6">
            {activeProjectId && (
              <button 
                onClick={() => setActiveProjectId(null)}
                className="px-5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all border border-slate-200"
              >
                <span>←</span> חזרה ללוח הבקרה
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto py-12 px-6">
        {!activeProjectId ? (
          <Dashboard 
            projects={projects} 
            onCreate={handleCreateProject} 
            onSelect={setActiveProjectId}
            onDelete={handleDeleteProject}
          />
        ) : (
          activeProject && (
            <ProjectEditor 
              project={activeProject} 
              onUpdate={handleUpdateProject} 
            />
          )
        )}
      </main>
    </div>
  );
};

export default App;