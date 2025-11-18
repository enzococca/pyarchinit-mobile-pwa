import React, { useState, useRef } from 'react';
import { Download, Upload, FileJson, Image as ImageIcon, CheckCircle, XCircle, Loader } from 'lucide-react';

/**
 * TropyIntegration - Component for importing/exporting photos to/from Tropy format
 *
 * Tropy is a research photo management tool widely used by archaeologists.
 * This component allows:
 * - Exporting PyArchInit photos to Tropy JSON format
 * - Importing Tropy projects into PyArchInit
 */
export default function TropyIntegration({ onClose }) {
  const [activeTab, setActiveTab] = useState('export'); // 'export' | 'import'
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState(null); // 'success' | 'error'

  // Export state
  const [exportFilter, setExportFilter] = useState('all'); // 'all' | 'site'
  const [siteName, setSiteName] = useState('');
  const [projectName, setProjectName] = useState('PyArchInit Export');

  // Import state
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleExport = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams();

      if (exportFilter === 'site' && siteName) {
        params.append('site', siteName);
      }

      params.append('project_name', projectName);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/media/export-tropy?${params}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tropy-export-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setMessage('Esportazione Tropy completata con successo!');
        setMessageType('success');
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Errore durante l\'esportazione');
      }
    } catch (error) {
      console.error('Export error:', error);
      setMessage(error.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setMessage('Seleziona un file Tropy da importare');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('auth_token');
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/media/import-tropy`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        }
      );

      if (response.ok) {
        const result = await response.json();
        setMessage(`Importazione completata! ${result.imported_count} foto importate.`);
        setMessageType('success');
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Errore durante l\'importazione');
      }
    } catch (error) {
      console.error('Import error:', error);
      setMessage(error.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setMessage('Seleziona un file JSON Tropy valido');
      setMessageType('error');
      return;
    }

    setSelectedFile(file);
    setMessage(null);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
      overflowY: 'auto',
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '600px',
        width: '100%',
        background: 'white',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '24px',
          color: 'white',
          position: 'relative'
        }}>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            >
              ✕
            </button>
          )}
          <FileJson size={48} style={{ marginBottom: '12px' }} />
          <h1 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            margin: 0,
            marginBottom: '8px'
          }}>
            Tropy Integration
          </h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>
            Importa ed esporta foto da/per Tropy
          </p>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '2px solid #e2e8f0'
        }}>
          <button
            onClick={() => setActiveTab('export')}
            style={{
              flex: 1,
              padding: '16px',
              background: activeTab === 'export' ? '#f7fafc' : 'white',
              border: 'none',
              borderBottom: activeTab === 'export' ? '3px solid #667eea' : '3px solid transparent',
              color: activeTab === 'export' ? '#667eea' : '#718096',
              fontWeight: '600',
              fontSize: '15px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <Download size={20} />
            Esporta
          </button>
          <button
            onClick={() => setActiveTab('import')}
            style={{
              flex: 1,
              padding: '16px',
              background: activeTab === 'import' ? '#f7fafc' : 'white',
              border: 'none',
              borderBottom: activeTab === 'import' ? '3px solid #667eea' : '3px solid transparent',
              color: activeTab === 'import' ? '#667eea' : '#718096',
              fontWeight: '600',
              fontSize: '15px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <Upload size={20} />
            Importa
          </button>
        </div>

        {/* Message */}
        {message && (
          <div style={{
            margin: '20px',
            padding: '16px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: messageType === 'success' ? '#f0fdf4' : '#fef2f2',
            color: messageType === 'success' ? '#166534' : '#991b1b',
            border: messageType === 'success' ? '1px solid #bbf7d0' : '1px solid #fecaca'
          }}>
            {messageType === 'success' ? (
              <CheckCircle size={20} />
            ) : (
              <XCircle size={20} />
            )}
            <span style={{ fontWeight: '500' }}>{message}</span>
          </div>
        )}

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {activeTab === 'export' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#4a5568',
                  marginBottom: '8px'
                }}>
                  Nome Progetto Tropy
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="PyArchInit Export"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#667eea';
                    e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#4a5568',
                  marginBottom: '8px'
                }}>
                  Filtra per Sito
                </label>
                <select
                  value={exportFilter}
                  onChange={(e) => {
                    setExportFilter(e.target.value);
                    if (e.target.value === 'all') setSiteName('');
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '15px',
                    background: 'white',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#667eea';
                    e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <option value="all">Tutte le foto</option>
                  <option value="site">Filtra per sito</option>
                </select>
              </div>

              {exportFilter === 'site' && (
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#4a5568',
                    marginBottom: '8px'
                  }}>
                    Nome Sito
                  </label>
                  <input
                    type="text"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="es. Pompei"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '15px',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#667eea';
                      e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              )}

              <button
                onClick={handleExport}
                disabled={loading || (exportFilter === 'site' && !siteName)}
                style={{
                  width: '100%',
                  background: loading || (exportFilter === 'site' && !siteName)
                    ? '#cbd5e0'
                    : '#667eea',
                  color: 'white',
                  padding: '14px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: loading || (exportFilter === 'site' && !siteName)
                    ? 'not-allowed'
                    : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontWeight: '600',
                  fontSize: '16px',
                  transition: 'all 0.2s',
                  boxShadow: loading || (exportFilter === 'site' && !siteName)
                    ? 'none'
                    : '0 2px 8px rgba(102, 126, 234, 0.3)'
                }}
                onMouseEnter={(e) => {
                  if (!loading && !(exportFilter === 'site' && !siteName)) {
                    e.currentTarget.style.background = '#5568d3';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading && !(exportFilter === 'site' && !siteName)) {
                    e.currentTarget.style.background = '#667eea';
                  }
                }}
              >
                {loading ? (
                  <>
                    <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
                    Esportazione...
                  </>
                ) : (
                  <>
                    <Download size={20} />
                    Esporta in Tropy (JSON)
                  </>
                )}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div
                style={{
                  border: '2px dashed #d1d5db',
                  borderRadius: '12px',
                  padding: '40px',
                  textAlign: 'center',
                  background: '#f9fafb',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => fileInputRef.current?.click()}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#f9fafb'}
              >
                <ImageIcon size={64} style={{ color: '#9ca3af', margin: '0 auto 16px' }} />
                <p style={{
                  fontSize: '16px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  {selectedFile ? selectedFile.name : 'Seleziona file Tropy JSON'}
                </p>
                <p style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  margin: 0
                }}>
                  Clicca per selezionare o trascina il file qui
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />

              <button
                onClick={handleImport}
                disabled={loading || !selectedFile}
                style={{
                  width: '100%',
                  background: loading || !selectedFile ? '#cbd5e0' : '#10b981',
                  color: 'white',
                  padding: '14px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: loading || !selectedFile ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontWeight: '600',
                  fontSize: '16px',
                  transition: 'all 0.2s',
                  boxShadow: loading || !selectedFile
                    ? 'none'
                    : '0 2px 8px rgba(16, 185, 129, 0.3)'
                }}
                onMouseEnter={(e) => {
                  if (!loading && selectedFile) {
                    e.currentTarget.style.background = '#059669';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading && selectedFile) {
                    e.currentTarget.style.background = '#10b981';
                  }
                }}
              >
                {loading ? (
                  <>
                    <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} />
                    Importazione...
                  </>
                ) : (
                  <>
                    <Upload size={20} />
                    Importa da Tropy
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Info Card */}
        <div style={{
          margin: '0 24px 24px',
          background: '#edf2ff',
          border: '1px solid #c7d2fe',
          borderRadius: '12px',
          padding: '16px'
        }}>
          <h4 style={{
            fontWeight: '600',
            fontSize: '15px',
            color: '#3730a3',
            marginBottom: '8px',
            marginTop: 0
          }}>
            ℹ️ Informazioni
          </h4>
          <ul style={{
            fontSize: '14px',
            color: '#4338ca',
            margin: 0,
            paddingLeft: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <li>Tropy è uno strumento di gestione foto per la ricerca</li>
            <li>Esporta: crea un file JSON compatibile con Tropy</li>
            <li>Importa: carica foto da un progetto Tropy esistente</li>
            <li>I metadati (titolo, descrizione, data) vengono preservati</li>
          </ul>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
