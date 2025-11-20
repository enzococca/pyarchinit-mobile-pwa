/**
 * ProjectSelector - Dropdown per selezione e gestione progetti
 *
 * Features:
 * - Mostra progetto corrente con badge DB mode e ruolo
 * - Dropdown con lista progetti utente
 * - Badge speciale per personal workspace
 * - Switch rapido tra progetti
 * - Pulsante per creare nuovo progetto
 * - Mostra metadata (team size, db mode)
 */
import { useState, useContext } from 'react';
import { ProjectContext } from '../context/ProjectContext';
import '../styles/ProjectSelector.css';

const ProjectSelector = ({ onCreateNew }) => {
  const { projects, currentProject, switchProject, loading } = useContext(ProjectContext);
  const [isOpen, setIsOpen] = useState(false);

  const handleProjectSwitch = async (projectId) => {
    if (projectId === currentProject?.id) {
      setIsOpen(false);
      return;
    }

    const success = await switchProject(projectId);
    if (success) {
      setIsOpen(false);
      // Ricarica la pagina per aggiornare i dati del nuovo progetto
      window.location.reload();
    }
  };

  const handleCreateNew = () => {
    setIsOpen(false);
    if (onCreateNew) {
      onCreateNew();
    }
  };

  const getDbModeBadgeClass = (dbMode) => {
    const classes = {
      sqlite: 'badge-sqlite',
      postgres: 'badge-postgres',
      hybrid: 'badge-hybrid'
    };
    return classes[dbMode] || 'badge-default';
  };

  const getRoleBadgeClass = (role) => {
    const classes = {
      owner: 'badge-owner',
      admin: 'badge-admin',
      member: 'badge-member',
      viewer: 'badge-viewer'
    };
    return classes[role] || 'badge-default';
  };

  const getDbModeLabel = (dbMode) => {
    const labels = {
      sqlite: 'SQLite',
      postgres: 'PostgreSQL',
      hybrid: 'Hybrid'
    };
    return labels[dbMode] || dbMode;
  };

  if (loading) {
    return (
      <div className="project-selector loading">
        <div className="current-project-btn">
          <span className="spinner"></span>
          <span>Loading projects...</span>
        </div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="project-selector no-project">
        <button className="create-project-btn" onClick={handleCreateNew}>
          <span className="icon">+</span>
          Create Project
        </button>
      </div>
    );
  }

  return (
    <div className="project-selector">
      {/* Current Project Button */}
      <button
        className="current-project-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <div className="project-info">
          <div className="project-name">
            {currentProject.is_personal && (
              <span className="personal-icon" title="Personal Workspace">👤</span>
            )}
            {currentProject.name}
          </div>
          <div className="project-badges">
            <span className={`badge ${getDbModeBadgeClass(currentProject.db_mode)}`}>
              {getDbModeLabel(currentProject.db_mode)}
            </span>
            {currentProject.my_role && (
              <span className={`badge ${getRoleBadgeClass(currentProject.my_role)}`}>
                {currentProject.my_role}
              </span>
            )}
          </div>
        </div>
        <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="project-dropdown" onClick={(e) => e.stopPropagation()}>
          <div className="dropdown-header">
            <h3>Your Projects ({projects.length})</h3>
            <button
              className="close-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="project-list">
            {projects.map(project => (
              <button
                key={project.id}
                className={`project-item ${project.id === currentProject.id ? 'active' : ''}`}
                onClick={() => handleProjectSwitch(project.id)}
              >
                <div className="project-item-header">
                  <div className="project-item-name">
                    {project.is_personal && (
                      <span className="personal-icon" title="Personal Workspace">👤</span>
                    )}
                    {project.name}
                  </div>
                  {project.id === currentProject.id && (
                    <span className="active-indicator">✓</span>
                  )}
                </div>

                {project.description && (
                  <div className="project-item-description">
                    {project.description}
                  </div>
                )}

                <div className="project-item-meta">
                  <span className={`badge ${getDbModeBadgeClass(project.db_mode)}`}>
                    {getDbModeLabel(project.db_mode)}
                  </span>
                  <span className={`badge ${getRoleBadgeClass(project.my_role)}`}>
                    {project.my_role}
                  </span>
                  {project.team_size > 1 && (
                    <span className="badge badge-team">
                      👥 {project.team_size}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="dropdown-footer">
            <button
              className="create-new-btn"
              onClick={handleCreateNew}
            >
              <span className="icon">+</span>
              Create New Project
            </button>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="project-selector-backdrop"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default ProjectSelector;
