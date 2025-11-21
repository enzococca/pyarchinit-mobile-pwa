import React, { useState, useEffect } from 'react';
import AudioRecorder from './components/AudioRecorder';
import PhotoCapture from './components/PhotoCapture';
import MediaCapture from './components/MediaCapture';
import DatabaseSettings from './components/DatabaseSettings';
import NotePreview from './components/NotePreview';
import TropyIntegration from './components/TropyIntegration';
import Scan3DCapture from './components/Scan3DCapture';
import AdminPanel from './components/AdminPanel';
import Login from './components/Login';
import Register from './components/Register';
import ProjectSelector from './components/ProjectSelector';
import ProjectNotifications from './components/ProjectNotifications';
import CreateProjectDialog from './components/CreateProjectDialog';
import { ProjectProvider } from './context/ProjectContext';
import {
  initDB,
  getAllAudioNotes,
  getAllImages,
  getSetting,
  saveSetting,
  deleteAudioNotes
} from './services/offlineStorage';
import {
  isOnline,
  syncAll,
  setupAutoSync,
  getSyncStats,
  refreshProcessedNotes
} from './services/syncService';

export default function App() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authView, setAuthView] = useState('login'); // 'login' | 'register'
  const [currentUser, setCurrentUser] = useState(null);

  const [currentView, setCurrentView] = useState('home'); // 'home', 'audio', 'photo', 'notes', 'sync', 'media', 'tropy', '3dscan'
  const [sito, setSito] = useState('');
  const [recordedBy, setRecordedBy] = useState('');
  const [entityType, setEntityType] = useState('US');
  const [entityId, setEntityId] = useState('');
  const [us, setUs] = useState('');
  const [online, setOnline] = useState(navigator.onLine);
  const [syncStats, setSyncStats] = useState({ total: 0 });
  const [notes, setNotes] = useState([]);
  const [images, setImages] = useState([]);
  const [showDbSettings, setShowDbSettings] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [previewNote, setPreviewNote] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0, message: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'saved', 'unsaved'
  const [selectedNotes, setSelectedNotes] = useState([]);

  useEffect(() => {
    // Check authentication status
    const token = localStorage.getItem('auth_token');
    const userName = localStorage.getItem('user_name');
    const userEmail = localStorage.getItem('user_email');
    const userRole = localStorage.getItem('user_role');

    if (token) {
      setIsAuthenticated(true);
      setCurrentUser({ name: userName, email: userEmail, role: userRole });
      setRecordedBy(userName || '');
    }

    // Init DB
    initDB();

    // Load saved settings
    loadSettings();

    // Setup automatic sync
    setupAutoSync((result) => {
      alert(`Sync completed: ${result.completed}/${result.total} items`);
      refreshData();
    });

    // Monitor connection
    window.addEventListener('online', () => setOnline(true));
    window.addEventListener('offline', () => setOnline(false));

    // Load initial data
    refreshData();

    return () => {
      window.removeEventListener('online', () => setOnline(true));
      window.removeEventListener('offline', () => setOnline(false));
    };
  }, []);

  const handleLoginSuccess = (data) => {
    setIsAuthenticated(true);
    setCurrentUser(data.user);
    setRecordedBy(data.user.name);
  };

  const handleRegisterSuccess = (data) => {
    setIsAuthenticated(true);
    setCurrentUser(data.user);
    setRecordedBy(data.user.name);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_role');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentView('home');
  };

  const loadSettings = async () => {
    const savedSito = await getSetting('sito');
    const savedRecordedBy = await getSetting('recordedBy');
    
    if (savedSito) setSito(savedSito);
    if (savedRecordedBy) setRecordedBy(savedRecordedBy);
  };

  const saveSettings = async () => {
    await saveSetting('sito', sito);
    await saveSetting('recordedBy', recordedBy);
    alert('Settings saved successfully');
  };

  const refreshData = async () => {
    const audioNotes = await getAllAudioNotes();
    const imgs = await getAllImages();
    const stats = await getSyncStats();
    
    setNotes(audioNotes);
    setImages(imgs);
    setSyncStats(stats);
  };

  const handleSync = async () => {
    if (!online) {
      alert('No internet connection');
      return;
    }

    try {
      setSyncing(true);
      setSyncProgress({ current: 0, total: 0, message: 'Starting sync...' });

      const result = await syncAll((progress) => {
        setSyncProgress({
          current: progress.completed,
          total: progress.total,
          message: `Syncing ${progress.current?.type || 'item'}...`
        });
        console.log(`Sync: ${progress.completed}/${progress.total}`);
      });

      setSyncProgress({ current: result.total, total: result.total, message: 'Refreshing notes...' });

      // Update already synced notes with transcription/interpretation from server
      try {
        const refreshResult = await refreshProcessedNotes();
        console.log(`Updated ${refreshResult.updated} notes with transcription`);
      } catch (refreshError) {
        console.warn('Error refreshing notes:', refreshError);
      }

      setSyncing(false);
      alert(`Sync completed!\n${result.completed} items synchronized\n${result.errors.length} errors`);
      refreshData();
    } catch (error) {
      setSyncing(false);
      alert(`Sync error: ${error.message}`);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedNotes.length === 0) {
      alert('No notes selected');
      return;
    }

    if (!confirm(`Delete ${selectedNotes.length} note(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      const results = await deleteAudioNotes(selectedNotes);
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      if (failCount > 0) {
        alert(`Deleted ${successCount} note(s). ${failCount} failed.`);
      } else {
        alert(`Successfully deleted ${successCount} note(s)`);
      }

      setSelectedNotes([]);
      refreshData();
    } catch (error) {
      alert(`Error deleting notes: ${error.message}`);
    }
  };

  const toggleNoteSelection = (noteId) => {
    setSelectedNotes(prev =>
      prev.includes(noteId)
        ? prev.filter(id => id !== noteId)
        : [...prev, noteId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedNotes.length === filteredNotes.length) {
      setSelectedNotes([]);
    } else {
      setSelectedNotes(filteredNotes.map(note => note.id));
    }
  };

  // Filter and search notes
  const filteredNotes = notes.filter(note => {
    // Apply status filter
    if (filterStatus === 'saved' && !note.savedToDb) return false;
    if (filterStatus === 'unsaved' && note.savedToDb) return false;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const transcription = (note.transcription || '').toLowerCase();
      let interpretationText = '';

      try {
        if (note.interpretation) {
          const interp = typeof note.interpretation === 'string'
            ? JSON.parse(note.interpretation)
            : note.interpretation;
          interpretationText = JSON.stringify(interp.extracted_fields || {}).toLowerCase();
        }
      } catch (e) {
        // Ignore parse errors
      }

      return transcription.includes(query) || interpretationText.includes(query);
    }

    return true;
  });

  // Authentication enabled - users must login/register
  // Show authentication screens if not logged in
  const ENABLE_AUTH = true; // Set to false to disable authentication

  if (ENABLE_AUTH && !isAuthenticated) {
    if (authView === 'login') {
      return (
        <Login
          onLoginSuccess={handleLoginSuccess}
          onSwitchToRegister={() => setAuthView('register')}
        />
      );
    } else {
      return (
        <Register
          onRegisterSuccess={handleRegisterSuccess}
          onSwitchToLogin={() => setAuthView('login')}
        />
      );
    }
  }

  return (
    <ProjectProvider>
      <div className="app">
        {/* Header */}
        <header className="app-header">
          <div className="header-left">
            <img src="/logo.svg" alt="pyArchInit Mobile PWA" className="app-logo" />
            <div>
              <h1>pyArchInit Mobile</h1>
              {currentUser && (
                <p className="user-info">👤 {currentUser.name}</p>
              )}
            </div>
          </div>
          <div className="header-center">
            <ProjectSelector onCreateNew={() => setShowCreateProject(true)} />
            <button
              onClick={() => setShowCreateProject(true)}
              className="btn-create-project"
              title="Create New Project"
            >
              + New Project
            </button>
          </div>
          <div className="header-right">
            <ProjectNotifications />
            <button
              onClick={() => setShowDbSettings(true)}
              className="btn-settings"
              title="Database Settings"
            >
              ⚙️
            </button>
            <button
              onClick={handleLogout}
              className="btn-logout"
              title="Logout"
            >
              🚪
            </button>
            <div className="status">
              <span className={online ? 'online' : 'offline'}>
                {online ? '🟢 Online' : '🔴 Offline'}
              </span>
              {syncStats.total > 0 && !syncing && (
                <span className="sync-badge">{syncStats.total} to sync</span>
              )}
            </div>
          </div>
        </header>

      {/* Sync Progress Banner */}
      {syncing && (
        <div className="sync-progress-banner">
          <div className="sync-spinner"></div>
          <div className="sync-info">
            <div className="sync-message">{syncProgress.message}</div>
            <div className="sync-bar-container">
              <div
                className="sync-bar-fill"
                style={{ width: `${syncProgress.total ? (syncProgress.current / syncProgress.total * 100) : 0}%` }}
              ></div>
            </div>
            <div className="sync-counter">{syncProgress.current} / {syncProgress.total}</div>
          </div>
        </div>
      )}

      {/* Database Settings Modal */}
      {showDbSettings && (
        <DatabaseSettings
          onClose={() => setShowDbSettings(false)}
          onLogout={handleLogout}
        />
      )}

      {/* Create Project Dialog */}
      {showCreateProject && (
        <CreateProjectDialog
          isOpen={showCreateProject}
          onClose={() => setShowCreateProject(false)}
        />
      )}

      {/* Base Settings (always visible) */}
      {currentView === 'home' && (
        <div className="settings-panel">
          <h2>Settings</h2>

          <div className="form-group">
            <label>Archaeological Site</label>
            <input
              type="text"
              value={sito}
              onChange={(e) => setSito(e.target.value)}
              placeholder="e.g.: Pompeii, Rome"
            />
          </div>

          <div className="form-group">
            <label>Archaeologist</label>
            <input
              type="text"
              value={recordedBy}
              onChange={(e) => setRecordedBy(e.target.value)}
              placeholder="Your name"
            />
          </div>

          <button onClick={saveSettings} className="btn-primary">
            💾 Save Settings
          </button>

          <div className="main-actions">
            <button
              onClick={() => setCurrentView('audio')}
              className="btn-action btn-audio"
              disabled={!sito}
            >
              🎤 Audio Note
            </button>

            <button
              onClick={() => setCurrentView('media')}
              className="btn-action btn-media"
              disabled={!sito}
            >
              📸 Media Capture
            </button>
          </div>

          <div className="secondary-actions">
            <button onClick={() => setCurrentView('notes')}>
              📝 View Notes ({notes.length})
            </button>
            {/* Photo viewing temporarily disabled
            <button onClick={() => setCurrentView('images')}>
              🖼️ View Photos ({images.length})
            </button>
            */}
            <button onClick={() => setCurrentView('tropy')}>
              📚 Tropy Integration
            </button>
            <button onClick={() => setCurrentView('3dscan')}>
              🎨 3D Scan Upload
            </button>
            {currentUser?.role === 'admin' && (
              <button onClick={() => setCurrentView('admin')} className="btn-admin">
                👥 Admin Panel
              </button>
            )}
            <button onClick={handleSync} disabled={!online || syncStats.total === 0}>
              🔄 Sync ({syncStats.total})
            </button>
          </div>
        </div>
      )}

      {/* Audio Recording */}
      {currentView === 'audio' && (
        <div className="view-panel">
          <button onClick={() => setCurrentView('home')} className="btn-back">
            ← Back
          </button>

          <h2>🎤 Record Audio Note</h2>
          <p className="context-info">Site: <strong>{sito}</strong></p>
          
          <AudioRecorder
            sito={sito}
            recordedBy={recordedBy}
            onRecordingComplete={(id) => {
              refreshData();
              setCurrentView('home');
            }}
          />
        </div>
      )}

      {/* Media Capture */}
      {currentView === 'media' && (
        <div className="view-panel media-capture-view">
          <button onClick={() => setCurrentView('home')} className="btn-back">
            ← Back
          </button>

          <MediaCapture />
        </div>
      )}

      {/* Tropy Integration */}
      {currentView === 'tropy' && (
        <div className="view-panel">
          <button onClick={() => setCurrentView('home')} className="btn-back">
            ← Back
          </button>

          <TropyIntegration />
        </div>
      )}

      {/* 3D Scan Upload */}
      {currentView === '3dscan' && (
        <div className="view-panel">
          <button onClick={() => setCurrentView('home')} className="btn-back">
            ← Back
          </button>

          <Scan3DCapture sito={sito} />
        </div>
      )}

      {/* Admin Panel (Admin Only) */}
      {currentView === 'admin' && currentUser?.role === 'admin' && (
        <div className="view-panel admin-panel-view">
          <button onClick={() => setCurrentView('home')} className="btn-back">
            ← Back
          </button>
          <AdminPanel />
        </div>
      )}

      {/* Notes List */}
      {currentView === 'notes' && (
        <div className="view-panel">
          <button onClick={() => setCurrentView('home')} className="btn-back">
            ← Back
          </button>

          <h2>📝 Audio Notes ({notes.length})</h2>

          {/* Search and Filter Bar */}
          <div className="notes-controls">
            <div className="search-bar">
              <input
                type="text"
                placeholder="🔍 Search in transcriptions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="clear-search"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="filter-bar">
              <label>Filter:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Notes</option>
                <option value="saved">Saved to DB</option>
                <option value="unsaved">Not Saved</option>
              </select>
            </div>

            {selectedNotes.length > 0 && (
              <div className="selection-actions">
                <button onClick={handleDeleteSelected} className="btn-delete-selected">
                  🗑️ Delete ({selectedNotes.length})
                </button>
              </div>
            )}
          </div>

          {/* Select All Checkbox */}
          {filteredNotes.length > 0 && (
            <div className="select-all-bar">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedNotes.length === filteredNotes.length && filteredNotes.length > 0}
                  onChange={toggleSelectAll}
                />
                <span>Select All ({filteredNotes.length})</span>
              </label>
            </div>
          )}

          <div className="items-list">
            {filteredNotes.length === 0 ? (
              <p className="empty-state">
                {notes.length === 0
                  ? 'No notes recorded'
                  : 'No notes match your search/filter'}
              </p>
            ) : (
              filteredNotes.map(note => {
                // Parse interpretation if present
                let interpretation = null;
                try {
                  if (note.interpretation && typeof note.interpretation === 'string') {
                    interpretation = JSON.parse(note.interpretation);
                  } else if (note.interpretation) {
                    interpretation = note.interpretation;
                  }
                } catch (e) {
                  console.error('Error parsing interpretation:', e);
                }

                return (
                  <div key={note.id} className="item-card">
                    <div className="item-header">
                      <label className="note-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedNotes.includes(note.id)}
                          onChange={() => toggleNoteSelection(note.id)}
                        />
                      </label>
                      <span className={`status-badge ${note.status || 'offline'}`}>
                        {note.status || 'offline'}
                      </span>
                      <span className="item-date">
                        {new Date(note.createdAt).toLocaleString('en')}
                      </span>
                    </div>

                    {/* Transcription */}
                    <div className="transcription-section">
                      <strong>📝 Transcription:</strong>
                      <p className="item-content">
                        {note.transcription || 'Awaiting transcription...'}
                      </p>
                    </div>

                    {/* AI Interpretation */}
                    {interpretation && (
                      <div className="interpretation-section">
                        <div className="interpretation-header">
                          <strong>🤖 AI Interpretation</strong>
                          <span className="confidence">
                            {Math.round(interpretation.confidence * 100)}% confidence
                          </span>
                        </div>

                        <div className="extraction-info">
                          <div className="extraction-row">
                            <span className="label">Type:</span>
                            <span className="value">{interpretation.entity_type}</span>
                          </div>
                          <div className="extraction-row">
                            <span className="label">Table:</span>
                            <span className="value">{interpretation.target_table}</span>
                          </div>
                        </div>

                        {interpretation.extracted_fields && (
                          <div className="extracted-fields">
                            <strong>📋 Extracted Fields:</strong>
                            <table className="fields-table">
                              <tbody>
                                {Object.entries(interpretation.extracted_fields).map(([key, value]) => (
                                  <tr key={key}>
                                    <td className="field-name">{key}</td>
                                    <td className="field-value">{String(value)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {interpretation.notes && (
                          <div className="ai-notes">
                            <strong>⚠️ Note:</strong>
                            <p>{interpretation.notes}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Button */}
                    <div className="note-actions">
                      <button
                        onClick={() => setPreviewNote(note)}
                        className="btn-preview"
                        disabled={!note.transcription && !note.interpretation}
                      >
                        👁️ Preview & Edit
                      </button>
                      <div className="note-status-indicators">
                        {note.synced && <span className="synced">✓ Synced</span>}
                        {note.savedToDb && <span className="saved-to-db">💾 Saved to DB</span>}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Note Preview Modal */}
      {previewNote && (
        <NotePreview
          note={previewNote}
          onClose={() => setPreviewNote(null)}
          onSave={(data) => {
            console.log('Note saved:', data);
            refreshData();
          }}
          onRefresh={() => {
            refreshData();
          }}
        />
      )}

      {/* Images List */}
      {currentView === 'images' && (
        <div className="view-panel">
          <button onClick={() => setCurrentView('home')} className="btn-back">
            ← Back
          </button>

          <h2>🖼️ Photos</h2>

          <div className="images-grid">
            {images.length === 0 ? (
              <p className="empty-state">No photos taken</p>
            ) : (
              images.map(img => (
                <div key={img.id} className="image-card">
                  <img src={img.imageBlob} alt="Preview" />
                  <div className="image-info">
                    <span>{img.entityType} {img.entityId}</span>
                    {img.synced && <span className="synced">✓</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Create Project Dialog */}
      <CreateProjectDialog
        isOpen={showCreateProject}
        onClose={() => setShowCreateProject(false)}
      />

      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
          background: #f5f5f5;
          color: #333;
        }

        .app {
          max-width: 600px;
          margin: 0 auto;
          padding-bottom: 2rem;
        }

        .app-header {
          background: #2196f3;
          color: white;
          padding: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 0.8rem;
        }

        .app-logo {
          height: 40px;
          width: auto;
        }

        .app-header h1 {
          font-size: 1.3rem;
          margin: 0;
        }

        .header-right {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .user-info {
          margin: 0;
          font-size: 0.8rem;
          opacity: 0.9;
        }

        .btn-settings,
        .btn-logout {
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          font-size: 1.5rem;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          cursor: pointer;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-settings:hover,
        .btn-logout:hover {
          background: rgba(255,255,255,0.3);
        }

        .btn-logout {
          background: rgba(255,100,100,0.3);
        }

        .btn-logout:hover {
          background: rgba(255,100,100,0.5);
        }

        .btn-create-project {
          background: rgba(76, 175, 80, 0.9);
          border: none;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 600;
          transition: all 0.2s;
          margin-top: 0.5rem;
          display: inline-block;
        }

        .btn-create-project:hover {
          background: rgba(76, 175, 80, 1);
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }

        .header-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .status {
          display: flex;
          gap: 0.5rem;
          align-items: center;
          font-size: 0.9rem;
        }

        .sync-badge {
          background: rgba(255,255,255,0.2);
          padding: 0.2rem 0.6rem;
          border-radius: 12px;
        }

        .sync-progress-banner {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
          animation: slideDown 0.3s ease-out;
        }

        @keyframes slideDown {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .sync-spinner {
          width: 32px;
          height: 32px;
          border: 4px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .sync-info {
          flex: 1;
        }

        .sync-message {
          font-weight: 600;
          font-size: 0.95rem;
          margin-bottom: 0.5rem;
        }

        .sync-bar-container {
          width: 100%;
          height: 8px;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 0.3rem;
        }

        .sync-bar-fill {
          height: 100%;
          background: white;
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .sync-counter {
          font-size: 0.85rem;
          opacity: 0.9;
        }

        .settings-panel, .view-panel {
          background: white;
          margin: 1rem;
          padding: 1.5rem;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
          color: #555;
        }

        .form-group input, .form-group select {
          width: 100%;
          padding: 0.8rem;
          font-size: 1rem;
          border: 1px solid #ddd;
          border-radius: 6px;
        }

        .btn-primary {
          width: 100%;
          padding: 1rem;
          background: #4caf50;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          margin-bottom: 1.5rem;
        }

        .main-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .btn-action {
          padding: 1.5rem;
          font-size: 1.1rem;
          font-weight: 600;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          color: white;
        }

        .btn-audio {
          background: #ff9800;
        }

        .btn-media {
          background: #9c27b0;
        }

        .btn-photo {
          background: #2196f3;
        }

        .btn-action:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .media-capture-view {
          padding: 0 !important;
        }

        .admin-panel-view {
          padding: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
        }

        .secondary-actions {
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
        }

        .secondary-actions button {
          padding: 0.8rem;
          background: #f5f5f5;
          border: 1px solid #ddd;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.95rem;
        }

        .btn-admin {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          color: white !important;
          border: none !important;
          font-weight: 600;
        }

        .btn-back {
          background: transparent;
          border: none;
          color: #2196f3;
          font-size: 1rem;
          cursor: pointer;
          margin-bottom: 1rem;
        }

        .context-info {
          background: #e3f2fd;
          padding: 0.8rem;
          border-radius: 6px;
          margin-bottom: 1rem;
        }

        .items-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .item-card {
          background: #f9f9f9;
          padding: 1rem;
          border-radius: 8px;
          border: 1px solid #eee;
        }

        .item-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
          font-size: 0.85rem;
        }

        .status-badge {
          padding: 0.2rem 0.6rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .status-badge.offline {
          background: #fff3cd;
          color: #856404;
        }

        .status-badge.processed {
          background: #d4edda;
          color: #155724;
        }

        .synced {
          color: #4caf50;
          font-size: 0.85rem;
          margin-left: auto;
        }

        .note-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #eee;
        }

        .btn-preview {
          flex: 1;
          padding: 10px 16px;
          background: #2196f3;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-preview:hover:not(:disabled) {
          background: #1976d2;
        }

        .btn-preview:disabled {
          background: #ccc;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .transcription-section {
          margin-bottom: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #eee;
        }

        .transcription-section strong {
          display: block;
          margin-bottom: 0.5rem;
          color: #555;
        }

        .interpretation-section {
          background: #f0f8ff;
          padding: 1rem;
          border-radius: 6px;
          margin-top: 1rem;
        }

        .interpretation-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.8rem;
        }

        .confidence {
          background: #4caf50;
          color: white;
          padding: 0.2rem 0.6rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .extraction-info {
          background: white;
          padding: 0.8rem;
          border-radius: 4px;
          margin-bottom: 0.8rem;
        }

        .extraction-row {
          display: flex;
          padding: 0.3rem 0;
        }

        .extraction-row .label {
          font-weight: 600;
          color: #666;
          min-width: 80px;
        }

        .extraction-row .value {
          color: #2196f3;
          font-weight: 600;
        }

        .extracted-fields {
          margin-top: 0.8rem;
        }

        .extracted-fields strong {
          display: block;
          margin-bottom: 0.5rem;
        }

        .fields-table {
          width: 100%;
          background: white;
          border-radius: 4px;
          overflow: hidden;
          font-size: 0.85rem;
        }

        .fields-table td {
          padding: 0.5rem;
          border-bottom: 1px solid #eee;
        }

        .fields-table tr:last-child td {
          border-bottom: none;
        }

        .field-name {
          font-weight: 600;
          color: #666;
          width: 40%;
        }

        .field-value {
          color: #333;
        }

        .ai-notes {
          margin-top: 0.8rem;
          padding: 0.8rem;
          background: #fff3cd;
          border-left: 3px solid #ffc107;
          border-radius: 4px;
        }

        .ai-notes strong {
          display: block;
          margin-bottom: 0.3rem;
          color: #856404;
        }

        .ai-notes p {
          color: #856404;
          font-size: 0.85rem;
          margin: 0;
        }

        .empty-state {
          text-align: center;
          padding: 2rem;
          color: #999;
        }

        .images-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 1rem;
        }

        .image-card {
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .image-card img {
          width: 100%;
          aspect-ratio: 1;
          object-fit: cover;
        }

        .image-info {
          padding: 0.5rem;
          background: white;
          font-size: 0.85rem;
          display: flex;
          justify-content: space-between;
        }

        /* Notes Controls */
        .notes-controls {
          margin-bottom: 1rem;
        }

        .search-bar {
          position: relative;
          margin-bottom: 1rem;
        }

        .search-input {
          width: 100%;
          padding: 12px 40px 12px 12px;
          border: 2px solid #ddd;
          border-radius: 8px;
          font-size: 1rem;
          transition: border-color 0.2s;
        }

        .search-input:focus {
          outline: none;
          border-color: #2196f3;
        }

        .clear-search {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          color: #999;
          font-size: 1.2rem;
          cursor: pointer;
          padding: 5px;
        }

        .filter-bar {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .filter-bar label {
          font-weight: 600;
          color: #555;
        }

        .filter-select {
          flex: 1;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 0.95rem;
          background: white;
          cursor: pointer;
        }

        .selection-actions {
          margin-bottom: 1rem;
        }

        .btn-delete-selected {
          width: 100%;
          padding: 12px;
          background: #f44336;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-delete-selected:hover {
          background: #d32f2f;
        }

        .select-all-bar {
          background: #f5f5f5;
          padding: 10px;
          border-radius: 6px;
          margin-bottom: 1rem;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          user-select: none;
        }

        .checkbox-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .checkbox-label span {
          font-weight: 600;
          color: #555;
        }

        .note-checkbox {
          display: flex;
          align-items: center;
          margin-right: 10px;
        }

        .note-checkbox input[type="checkbox"] {
          width: 20px;
          height: 20px;
          cursor: pointer;
        }

        .note-status-indicators {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .saved-to-db {
          color: #4caf50;
          font-size: 0.85rem;
          font-weight: 600;
          background: #e8f5e9;
          padding: 0.2rem 0.6rem;
          border-radius: 12px;
        }

        .note-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #eee;
        }

        .item-header {
          display: flex;
          align-items: center;
          margin-bottom: 0.5rem;
          font-size: 0.85rem;
        }

        .header-center {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: center;
        }
      `}</style>
    </div>
    </ProjectProvider>
  );
}
