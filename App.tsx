
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

  const handleCreateProject = (title: string, videoUrl: string, thumbnailUrl: string) => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      title,
      videoUrl,
      thumbnailUrl,
      createdAt: Date.now(),
      comments: []
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
    <div className="min-h-screen bg-[#020202] text-slate-50 selection:bg-indigo-500/50">
      <header className="border-b border-white/5 bg-black/60 backdrop-blur-3xl sticky top-0 z-50">
        <div className="container mx-auto px-8 h-24 flex items-center justify-between">
          <button 
            onClick={() => setActiveProjectId(null)}
            className="flex items-center gap-4 group"
          >
            <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-[18px] flex items-center justify-center shadow-2xl shadow-indigo-500/30 group-hover:scale-105 transition-transform duration-500">
               <span className="text-white font-black text-2xl">K</span>
            </div>
            <div className="flex flex-col items-start leading-none">
              <span className="text-3xl font-black tracking-tighter text-white">Kozy</span>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mt-1">Review Tool</span>
            </div>
          </button>
          
          {activeProjectId && (
            <button 
              onClick={() => setActiveProjectId(null)}
              className="px-6 py-3 text-xs font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all active:scale-95 flex items-center gap-2"
            >
              <span>←</span> חזרה לפרויקטים
            </button>
          )}
        </div>
      </header>

      <main className="container mx-auto py-16 px-8">
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
