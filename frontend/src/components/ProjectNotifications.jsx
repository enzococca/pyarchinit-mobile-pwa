/**
 * ProjectNotifications - Badge notifiche per nuovi progetti
 *
 * Features:
 * - Badge con numero nuovi progetti (aggiunti nelle ultime 24h)
 * - Dropdown con lista progetti nuovi
 * - Segna come "visto" quando l'utente apre
 * - Integrazione con ProjectSelector
 */
import { useState, useEffect, useContext } from 'react';
import { ProjectContext } from '../context/ProjectContext';
import '../styles/ProjectNotifications.css';

const ProjectNotifications = ({ onProjectSelect }) => {
  const { projects, switchProject, loading } = useContext(ProjectContext);
  const [newProjects, setNewProjects] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [lastSeenTimestamp, setLastSeenTimestamp] = useState(null);

  useEffect(() => {
    // Carica timestamp ultima visualizzazione
    const lastSeen = localStorage.getItem('projectNotificationsLastSeen');
    setLastSeenTimestamp(lastSeen ? new Date(lastSeen) : null);
  }, []);

  useEffect(() => {
    if (!projects || projects.length === 0) return;

    // Identifica progetti aggiunti di recente (nelle ultime 24h)
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recentProjects = projects.filter(project => {
      // Escludi personal workspace
      if (project.is_personal) return false;

      // Controlla se il progetto è stato creato nelle ultime 24h
      const createdAt = new Date(project.created_at);
      const isRecent = createdAt > oneDayAgo;

      // Se c'è un lastSeenTimestamp, mostra solo progetti più recenti di quello
      if (lastSeenTimestamp) {
        return createdAt > new Date(lastSeenTimestamp);
      }

      return isRecent;
    });

    setNewProjects(recentProjects);
  }, [projects, lastSeenTimestamp]);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    // Aggiorna timestamp visualizzazione quando chiude
    const now = new Date().toISOString();
    localStorage.setItem('projectNotificationsLastSeen', now);
    // NON aggiorniamo lastSeenTimestamp qui per evitare re-render immediato
  };

  const handleProjectClick = async (projectId) => {
    setIsOpen(false);
    if (onProjectSelect) {
      await onProjectSelect(projectId);
    } else {
      const success = await switchProject(projectId);
      if (success) {
        window.location.reload();
      }
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading || newProjects.length === 0) {
    return null;
  }

  return (
    <div className="project-notifications">
      <button
        className="notification-badge-btn"
        onClick={handleOpen}
        title={`${newProjects.length} new project${newProjects.length > 1 ? 's' : ''}`}
      >
        <span className="bell-icon">🔔</span>
        <span className="badge-count">{newProjects.length}</span>
      </button>

      {isOpen && (
        <>
          <div className="notifications-dropdown">
            <div className="dropdown-header">
              <h3>New Projects</h3>
              <button
                className="close-btn"
                onClick={handleClose}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="notifications-list">
              {newProjects.map(project => (
                <div
                  key={project.id}
                  className="notification-item"
                  onClick={() => handleProjectClick(project.id)}
                >
                  <div className="notification-content">
                    <div className="notification-title">
                      <span className="project-icon">📁</span>
                      {project.name}
                    </div>
                    {project.description && (
                      <div className="notification-description">
                        {project.description}
                      </div>
                    )}
                    <div className="notification-meta">
                      <span className="role-badge">{project.my_role}</span>
                      <span className="time-ago">{formatTimeAgo(project.created_at)}</span>
                    </div>
                  </div>
                  <span className="chevron">›</span>
                </div>
              ))}
            </div>

            <div className="dropdown-footer">
              <p className="info-text">
                Click on a project to switch to it
              </p>
            </div>
          </div>

          <div
            className="notifications-backdrop"
            onClick={handleClose}
          />
        </>
      )}
    </div>
  );
};

export default ProjectNotifications;
