import { useState, useEffect } from 'react';
import { Database, Server, HardDrive, Upload, Download, Settings, Check, AlertCircle } from 'lucide-react';

export default function DatabaseSettings({ onClose }) {
  const [dbMode, setDbMode] = useState('sqlite'); // 'sqlite' | 'separate' | 'hybrid'
  const [currentMode, setCurrentMode] = useState(null);
  const [sqliteFile, setSqliteFile] = useState(null);
  const [postgresConfig, setPostgresConfig] = useState({
    host: 'localhost',
    port: '5432',
    database: 'pyarchinit_db',
    user: 'postgres',
    password: ''
  });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCurrentMode();
  }, []);

  const fetchCurrentMode = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/db-mode`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentMode(data.mode);
        setDbMode(data.mode);
      }
    } catch (error) {
      console.error('Error fetching database mode:', error);
    }
  };

  const handleSqliteFileChange = (e) => {
    const file = e.target.files[0];
    if (file && (file.name.endsWith('.sqlite') || file.name.endsWith('.db'))) {
      setSqliteFile(file);
      setStatus({ type: 'info', message: `File selezionato: ${file.name}` });
    } else {
      setStatus({ type: 'error', message: 'Seleziona un file .sqlite o .db valido' });
    }
  };

  const handleUploadSqlite = async () => {
    if (!sqliteFile) {
      setStatus({ type: 'error', message: 'Seleziona prima un file SQLite' });
      return;
    }

    setLoading(true);
    setStatus({ type: 'info', message: 'Caricamento in corso...' });

    try {
      const formData = new FormData();
      formData.append('file', sqliteFile);

      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/database/upload-sqlite`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        setStatus({ type: 'success', message: 'Database SQLite caricato con successo!' });
        fetchCurrentMode();
      } else {
        const error = await response.json();
        setStatus({ type: 'error', message: `Errore: ${error.detail}` });
      }
    } catch (error) {
      setStatus({ type: 'error', message: `Errore di caricamento: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setLoading(true);
    setStatus({ type: 'info', message: 'Test connessione in corso...' });

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/database/test-connection`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mode: dbMode,
          config: postgresConfig
        })
      });

      if (response.ok) {
        setStatus({ type: 'success', message: 'Connessione riuscita!' });
      } else {
        const error = await response.json();
        setStatus({ type: 'error', message: `Errore di connessione: ${error.detail}` });
      }
    } catch (error) {
      setStatus({ type: 'error', message: `Errore: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfiguration = async () => {
    setLoading(true);
    setStatus({ type: 'info', message: 'Salvataggio configurazione...' });

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/database/configure`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mode: dbMode,
          config: dbMode !== 'sqlite' ? postgresConfig : null
        })
      });

      if (response.ok) {
        setStatus({ type: 'success', message: 'Configurazione salvata! Riavviare l\'applicazione.' });
        setCurrentMode(dbMode);
      } else {
        const error = await response.json();
        setStatus({ type: 'error', message: `Errore: ${error.detail}` });
      }
    } catch (error) {
      setStatus({ type: 'error', message: `Errore: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSqlite = async () => {
    setLoading(true);
    setStatus({ type: 'info', message: 'Download in corso...' });

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/database/download-sqlite`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        // Get filename from Content-Disposition header or use default
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'pyarchinit_db.sqlite';
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/);
          if (filenameMatch) filename = filenameMatch[1];
        }

        // Download file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setStatus({ type: 'success', message: `Database scaricato: ${filename}` });
      } else {
        const error = await response.json();
        setStatus({ type: 'error', message: `Errore: ${error.detail}` });
      }
    } catch (error) {
      setStatus({ type: 'error', message: `Errore di download: ${error.message}` });
    } finally {
      setLoading(false);
    }
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
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        padding: '30px'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px', position: 'relative' }}>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                background: 'white',
                border: 'none',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '24px',
                color: '#667eea',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            >
              ✕
            </button>
          )}
          <Settings size={48} style={{ color: '#667eea', marginBottom: '10px' }} />
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1a202c', marginBottom: '8px' }}>
            Impostazioni Database
          </h1>
          <p style={{ color: '#718096' }}>
            Configura il tipo di database e la connessione
          </p>
          {currentMode && (
            <div style={{
              display: 'inline-block',
              padding: '8px 16px',
              background: '#edf2f7',
              borderRadius: '20px',
              marginTop: '12px',
              fontSize: '14px',
              color: '#4a5568'
            }}>
              Modalità attuale: <strong>{currentMode}</strong>
            </div>
          )}
        </div>

        {/* Status Messages */}
        {status.message && (
          <div style={{
            padding: '16px',
            borderRadius: '12px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: status.type === 'success' ? '#d4edda' :
                       status.type === 'error' ? '#f8d7da' : '#d1ecf1',
            color: status.type === 'success' ? '#155724' :
                   status.type === 'error' ? '#721c24' : '#0c5460',
            border: `1px solid ${status.type === 'success' ? '#c3e6cb' :
                                  status.type === 'error' ? '#f5c6cb' : '#bee5eb'}`
          }}>
            {status.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
            {status.message}
          </div>
        )}

        {/* Database Mode Selection */}
        <div style={{ marginBottom: '30px' }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: '12px', color: '#2d3748' }}>
            Seleziona Modalità Database
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            {/* SQLite */}
            <button
              onClick={() => setDbMode('sqlite')}
              disabled={loading}
              style={{
                padding: '20px',
                borderRadius: '12px',
                border: dbMode === 'sqlite' ? '3px solid #667eea' : '2px solid #e2e8f0',
                background: dbMode === 'sqlite' ? '#edf2ff' : 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: loading ? 0.6 : 1
              }}
            >
              <HardDrive size={32} style={{
                color: dbMode === 'sqlite' ? '#667eea' : '#718096',
                margin: '0 auto 8px'
              }} />
              <div style={{ fontWeight: '600', color: '#2d3748', marginBottom: '4px' }}>SQLite</div>
              <div style={{ fontSize: '12px', color: '#718096' }}>Database locale</div>
            </button>

            {/* PostgreSQL Separate */}
            <button
              onClick={() => setDbMode('separate')}
              disabled={loading}
              style={{
                padding: '20px',
                borderRadius: '12px',
                border: dbMode === 'separate' ? '3px solid #667eea' : '2px solid #e2e8f0',
                background: dbMode === 'separate' ? '#edf2ff' : 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: loading ? 0.6 : 1
              }}
            >
              <Database size={32} style={{
                color: dbMode === 'separate' ? '#667eea' : '#718096',
                margin: '0 auto 8px'
              }} />
              <div style={{ fontWeight: '600', color: '#2d3748', marginBottom: '4px' }}>PostgreSQL</div>
              <div style={{ fontSize: '12px', color: '#718096' }}>DB separato</div>
            </button>

            {/* PostgreSQL Hybrid */}
            <button
              onClick={() => setDbMode('hybrid')}
              disabled={loading}
              style={{
                padding: '20px',
                borderRadius: '12px',
                border: dbMode === 'hybrid' ? '3px solid #667eea' : '2px solid #e2e8f0',
                background: dbMode === 'hybrid' ? '#edf2ff' : 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: loading ? 0.6 : 1
              }}
            >
              <Server size={32} style={{
                color: dbMode === 'hybrid' ? '#667eea' : '#718096',
                margin: '0 auto 8px'
              }} />
              <div style={{ fontWeight: '600', color: '#2d3748', marginBottom: '4px' }}>PostgreSQL</div>
              <div style={{ fontSize: '12px', color: '#718096' }}>Ibrido (RLS)</div>
            </button>
          </div>
        </div>

        {/* SQLite File Upload */}
        {dbMode === 'sqlite' && (
          <div style={{
            padding: '24px',
            background: '#f7fafc',
            borderRadius: '12px',
            marginBottom: '24px'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#2d3748' }}>
              Carica Database SQLite
            </h3>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <label style={{
                flex: 1,
                padding: '12px 20px',
                background: 'white',
                border: '2px dashed #cbd5e0',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'center',
                color: '#4a5568',
                transition: 'all 0.2s'
              }}>
                <Upload size={20} style={{ display: 'inline-block', marginRight: '8px', verticalAlign: 'middle' }} />
                {sqliteFile ? sqliteFile.name : 'Seleziona file .sqlite/.db'}
                <input
                  type="file"
                  accept=".sqlite,.db"
                  onChange={handleSqliteFileChange}
                  style={{ display: 'none' }}
                  disabled={loading}
                />
              </label>
              <button
                onClick={handleUploadSqlite}
                disabled={!sqliteFile || loading}
                style={{
                  padding: '12px 24px',
                  background: sqliteFile && !loading ? '#667eea' : '#cbd5e0',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: sqliteFile && !loading ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s'
                }}
              >
                Carica
              </button>
            </div>

            {/* Download Database */}
            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#2d3748' }}>
                Scarica Database Corrente
              </h3>
              <p style={{ fontSize: '14px', color: '#718096', marginBottom: '12px' }}>
                Scarica una copia del database SQLite attualmente in uso
              </p>
              <button
                onClick={handleDownloadSqlite}
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  background: loading ? '#cbd5e0' : 'white',
                  color: '#667eea',
                  border: '2px solid #667eea',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Download size={20} />
                Scarica Database
              </button>
            </div>
          </div>
        )}

        {/* PostgreSQL Configuration */}
        {(dbMode === 'separate' || dbMode === 'hybrid') && (
          <div style={{
            padding: '24px',
            background: '#f7fafc',
            borderRadius: '12px',
            marginBottom: '24px'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#2d3748' }}>
              Configurazione PostgreSQL
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: '#4a5568' }}>
                  Host
                </label>
                <input
                  type="text"
                  value={postgresConfig.host}
                  onChange={(e) => setPostgresConfig({ ...postgresConfig, host: e.target.value })}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: '#4a5568' }}>
                  Porta
                </label>
                <input
                  type="text"
                  value={postgresConfig.port}
                  onChange={(e) => setPostgresConfig({ ...postgresConfig, port: e.target.value })}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: '#4a5568' }}>
                  Database
                </label>
                <input
                  type="text"
                  value={postgresConfig.database}
                  onChange={(e) => setPostgresConfig({ ...postgresConfig, database: e.target.value })}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: '#4a5568' }}>
                  Utente
                </label>
                <input
                  type="text"
                  value={postgresConfig.user}
                  onChange={(e) => setPostgresConfig({ ...postgresConfig, user: e.target.value })}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px', color: '#4a5568' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={postgresConfig.password}
                  onChange={(e) => setPostgresConfig({ ...postgresConfig, password: e.target.value })}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>
            <button
              onClick={handleTestConnection}
              disabled={loading}
              style={{
                marginTop: '16px',
                padding: '10px 20px',
                background: 'white',
                color: '#667eea',
                border: '2px solid #667eea',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              Testa Connessione
            </button>
          </div>
        )}

        {/* Mode Description */}
        <div style={{
          padding: '20px',
          background: '#edf2ff',
          borderRadius: '12px',
          marginBottom: '24px',
          fontSize: '14px',
          color: '#4a5568',
          lineHeight: '1.6'
        }}>
          <strong>Modalità selezionata: {dbMode === 'sqlite' ? 'SQLite' : dbMode === 'separate' ? 'PostgreSQL Separato' : 'PostgreSQL Ibrido'}</strong>
          <p style={{ marginTop: '8px', marginBottom: 0 }}>
            {dbMode === 'sqlite' && 'Database locale sul dispositivo. Ideale per uso offline singolo.'}
            {dbMode === 'separate' && 'Ogni utente ha il proprio database PostgreSQL separato. Isolamento completo dei dati.'}
            {dbMode === 'hybrid' && 'Database condiviso con Row-Level Security. Consente collaborazione tra utenti su progetti.'}
          </p>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSaveConfiguration}
          disabled={loading}
          style={{
            width: '100%',
            padding: '16px',
            background: loading ? '#cbd5e0' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s',
            boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
          }}
        >
          {loading ? 'Elaborazione...' : 'Salva Configurazione'}
        </button>
      </div>
    </div>
  );
}
