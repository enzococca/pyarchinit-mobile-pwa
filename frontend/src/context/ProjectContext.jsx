/**
 * ProjectContext - Gestione stato globale progetti
 *
 * Fornisce:
 * - Lista progetti dell'utente
 * - Progetto corrente selezionato
 * - Funzioni per switch progetto, crea/aggiorna/elimina
 * - Aggiunge automaticamente header X-Project-ID alle API calls
 */
import { createContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export const ProjectContext = createContext();

export const ProjectProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Carica lista progetti utente
   */
  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/projects/my-projects');

      if (response.data.success) {
        setProjects(response.data.projects);

        // Se c'è un progetto salvato in localStorage, usalo
        const savedProjectId = localStorage.getItem('currentProjectId');
        if (savedProjectId) {
          const saved = response.data.projects.find(p => p.id === parseInt(savedProjectId));
          if (saved) {
            setCurrentProject(saved);
            return;
          }
        }

        // Altrimenti usa il personal workspace (is_personal === true)
        const personalWorkspace = response.data.projects.find(p => p.is_personal);
        if (personalWorkspace) {
          setCurrentProject(personalWorkspace);
          localStorage.setItem('currentProjectId', personalWorkspace.id.toString());
        } else if (response.data.projects.length > 0) {
          // Fallback: primo progetto disponibile
          setCurrentProject(response.data.projects[0]);
          localStorage.setItem('currentProjectId', response.data.projects[0].id.toString());
        }
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
      setError(err.response?.data?.detail || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Switch a un altro progetto
   */
  const switchProject = useCallback(async (projectId) => {
    try {
      setError(null);

      // Chiama API per validare l'accesso
      const response = await api.post('/projects/switch', { project_id: projectId });

      if (response.data.success) {
        const project = projects.find(p => p.id === projectId);
        if (project) {
          setCurrentProject(project);
          localStorage.setItem('currentProjectId', projectId.toString());

          // Aggiorna header per future richieste
          api.defaults.headers.common['X-Project-ID'] = projectId;

          return true;
        }
      }

      return false;
    } catch (err) {
      console.error('Failed to switch project:', err);
      setError(err.response?.data?.detail || 'Failed to switch project');
      return false;
    }
  }, [projects]);

  /**
   * Crea nuovo progetto
   */
  const createProject = useCallback(async (projectData) => {
    try {
      setError(null);

      const response = await api.post('/projects/create', projectData);

      if (response.data.success) {
        const newProject = response.data.project;

        // Aggiungi alla lista
        setProjects(prev => [...prev, {
          id: newProject.id,
          name: newProject.name,
          description: newProject.description,
          db_mode: newProject.db_mode,
          is_personal: newProject.is_personal,
          my_role: newProject.my_role,
          team_size: 1,
          created_at: newProject.created_at,
          updated_at: newProject.updated_at
        }]);

        // Switch automaticamente al nuovo progetto
        await switchProject(newProject.id);

        return { success: true, project: newProject };
      }

      return { success: false, error: 'Failed to create project' };
    } catch (err) {
      console.error('Failed to create project:', err);
      const errorMsg = err.response?.data?.detail || 'Failed to create project';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [switchProject]);

  /**
   * Aggiorna progetto esistente
   */
  const updateProject = useCallback(async (projectId, updates) => {
    try {
      setError(null);

      const response = await api.put(`/projects/${projectId}`, updates);

      if (response.data.success) {
        const updatedProject = response.data.project;

        // Aggiorna lista
        setProjects(prev => prev.map(p =>
          p.id === projectId
            ? { ...p, ...updates, updated_at: updatedProject.updated_at }
            : p
        ));

        // Se è il progetto corrente, aggiornalo
        if (currentProject?.id === projectId) {
          setCurrentProject(prev => ({ ...prev, ...updates }));
        }

        return { success: true, project: updatedProject };
      }

      return { success: false, error: 'Failed to update project' };
    } catch (err) {
      console.error('Failed to update project:', err);
      const errorMsg = err.response?.data?.detail || 'Failed to update project';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [currentProject]);

  /**
   * Elimina progetto
   */
  const deleteProject = useCallback(async (projectId) => {
    try {
      setError(null);

      const response = await api.delete(`/projects/${projectId}`);

      if (response.data.success) {
        // Rimuovi dalla lista
        setProjects(prev => prev.filter(p => p.id !== projectId));

        // Se era il progetto corrente, switch al personal workspace
        if (currentProject?.id === projectId) {
          const personalWorkspace = projects.find(p => p.is_personal && p.id !== projectId);
          if (personalWorkspace) {
            await switchProject(personalWorkspace.id);
          } else {
            setCurrentProject(null);
            localStorage.removeItem('currentProjectId');
          }
        }

        return { success: true, message: response.data.message };
      }

      return { success: false, error: 'Failed to delete project' };
    } catch (err) {
      console.error('Failed to delete project:', err);
      const errorMsg = err.response?.data?.detail || 'Failed to delete project';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [currentProject, projects, switchProject]);

  /**
   * Carica progetti al mount
   */
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      loadProjects();
    } else {
      setLoading(false);
    }
  }, [loadProjects]);

  /**
   * Aggiorna header X-Project-ID quando cambia il progetto corrente
   */
  useEffect(() => {
    if (currentProject) {
      api.defaults.headers.common['X-Project-ID'] = currentProject.id;
    } else {
      delete api.defaults.headers.common['X-Project-ID'];
    }
  }, [currentProject]);

  const value = {
    projects,
    currentProject,
    loading,
    error,
    loadProjects,
    switchProject,
    createProject,
    updateProject,
    deleteProject,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};
