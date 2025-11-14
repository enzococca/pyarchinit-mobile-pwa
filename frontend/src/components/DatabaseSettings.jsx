import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

function DatabaseSettings({ onClose }) {
  const [dbType, setDbType] = useState('sqlite');
  const [pgConfig, setPgConfig] = useState({
    host: 'localhost',
    port: '5432',
    database: 'pyarchinit_db',
    user: 'postgres',
    password: ''
  });
  const [sqlitePath, setSqlitePath] = useState('/Users/enzo/Downloads/pyarchinit-mobile-pwa/backend/pyarchinit_db.sqlite');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saved, setSaved] = useState(false);

  // Load saved settings from localStorage
  useEffect(() => {
    const savedDbType = localStorage.getItem('db_type');
    const savedPgConfig = localStorage.getItem('pg_config');
    const savedSqlitePath = localStorage.getItem('sqlite_path');

    if (savedDbType) setDbType(savedDbType);
    if (savedPgConfig) setPgConfig(JSON.parse(savedPgConfig));
    if (savedSqlitePath) setSqlitePath(savedSqlitePath);
  }, []);

  const handlePgConfigChange = (field, value) => {
    setPgConfig(prev => ({ ...prev, [field]: value }));
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setSaved(false);

    try {
      const config = dbType === 'sqlite'
        ? { type: 'sqlite', path: sqlitePath }
        : { type: 'postgresql', ...pgConfig };

      const response = await axios.post(`${API_BASE}/database/test-connection`, config);

      if (response.data.success) {
        setTestResult({ success: true, message: response.data.message, stats: response.data.stats });
      } else {
        setTestResult({ success: false, message: response.data.error });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error.response?.data?.detail || error.message || 'Connection failed'
      });
    } finally {
      setTesting(false);
    }
  };

  const saveSettings = () => {
    // Save to localStorage
    localStorage.setItem('db_type', dbType);
    if (dbType === 'postgresql') {
      localStorage.setItem('pg_config', JSON.stringify(pgConfig));
    } else {
      localStorage.setItem('sqlite_path', sqlitePath);
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);

    // In a real implementation, you would also send this to the backend
    // to update the .env or config file
  };

  return (
    <div className="database-settings-overlay">
      <div className="database-settings-modal">
        <div className="modal-header">
          <h2>⚙️ Database Configuration</h2>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>

        <div className="modal-body">
          {/* Database Type Selector */}
          <div className="form-group">
            <label>Database Type:</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="dbType"
                  value="sqlite"
                  checked={dbType === 'sqlite'}
                  onChange={(e) => setDbType(e.target.value)}
                />
                <span>SQLite (Local File)</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="dbType"
                  value="postgresql"
                  checked={dbType === 'postgresql'}
                  onChange={(e) => setDbType(e.target.value)}
                />
                <span>PostgreSQL (Server)</span>
              </label>
            </div>
          </div>

          {/* SQLite Configuration */}
          {dbType === 'sqlite' && (
            <div className="config-section">
              <h3>SQLite Configuration</h3>
              <div className="form-group">
                <label>Database File Path:</label>
                <input
                  type="text"
                  value={sqlitePath}
                  onChange={(e) => setSqlitePath(e.target.value)}
                  placeholder="/Users/enzo/Downloads/pyarchinit-mobile-pwa/backend/pyarchinit_db.sqlite"
                />
                <small>Absolute path to SQLite database file on server</small>
              </div>
            </div>
          )}

          {/* PostgreSQL Configuration */}
          {dbType === 'postgresql' && (
            <div className="config-section">
              <h3>PostgreSQL Configuration</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Host:</label>
                  <input
                    type="text"
                    value={pgConfig.host}
                    onChange={(e) => handlePgConfigChange('host', e.target.value)}
                    placeholder="localhost"
                  />
                </div>
                <div className="form-group">
                  <label>Port:</label>
                  <input
                    type="text"
                    value={pgConfig.port}
                    onChange={(e) => handlePgConfigChange('port', e.target.value)}
                    placeholder="5432"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Database Name:</label>
                <input
                  type="text"
                  value={pgConfig.database}
                  onChange={(e) => handlePgConfigChange('database', e.target.value)}
                  placeholder="pyarchinit_db"
                />
              </div>

              <div className="form-group">
                <label>User:</label>
                <input
                  type="text"
                  value={pgConfig.user}
                  onChange={(e) => handlePgConfigChange('user', e.target.value)}
                  placeholder="postgres"
                />
              </div>

              <div className="form-group">
                <label>Password:</label>
                <input
                  type="password"
                  value={pgConfig.password}
                  onChange={(e) => handlePgConfigChange('password', e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>
          )}

          {/* Test Result */}
          {testResult && (
            <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
              <strong>{testResult.success ? '✓ Connection Successful' : '✗ Connection Failed'}</strong>
              <p>{testResult.message}</p>
              {testResult.stats && (
                <div className="db-stats">
                  <p>📊 Database Statistics:</p>
                  <ul>
                    <li>Sites: {testResult.stats.sites}</li>
                    <li>US Records: {testResult.stats.us_records}</li>
                    <li>Tables: {testResult.stats.tables}</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="button-group">
            <button
              onClick={testConnection}
              disabled={testing}
              className="btn btn-test"
            >
              {testing ? '🔄 Testing...' : '🔌 Test Connection'}
            </button>
            <button
              onClick={saveSettings}
              className="btn btn-save"
              disabled={!testResult?.success}
            >
              💾 Save Settings
            </button>
          </div>

          {saved && <div className="save-notification">✓ Settings saved successfully!</div>}
        </div>
      </div>

      <style>{`
        .database-settings-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .database-settings-modal {
          background: white;
          border-radius: 12px;
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #e0e0e0;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.5rem;
          color: #333;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #666;
          padding: 5px 10px;
          line-height: 1;
        }

        .close-btn:hover {
          color: #333;
        }

        .modal-body {
          padding: 20px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #333;
        }

        .form-group input[type="text"],
        .form-group input[type="password"] {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
        }

        .form-group input:focus {
          outline: none;
          border-color: #4CAF50;
        }

        .form-group small {
          display: block;
          margin-top: 5px;
          color: #666;
          font-size: 12px;
        }

        .radio-group {
          display: flex;
          gap: 20px;
        }

        .radio-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-weight: normal;
        }

        .radio-label input[type="radio"] {
          cursor: pointer;
        }

        .config-section {
          padding: 20px;
          background: #f5f5f5;
          border-radius: 8px;
          margin-top: 20px;
        }

        .config-section h3 {
          margin: 0 0 15px 0;
          font-size: 1.1rem;
          color: #333;
        }

        .form-row {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 15px;
        }

        .test-result {
          margin-top: 20px;
          padding: 15px;
          border-radius: 8px;
          border-left: 4px solid;
        }

        .test-result.success {
          background: #e8f5e9;
          border-color: #4CAF50;
          color: #2e7d32;
        }

        .test-result.error {
          background: #ffebee;
          border-color: #f44336;
          color: #c62828;
        }

        .test-result strong {
          display: block;
          margin-bottom: 5px;
        }

        .test-result p {
          margin: 5px 0;
        }

        .db-stats {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid rgba(0, 0, 0, 0.1);
        }

        .db-stats ul {
          margin: 5px 0;
          padding-left: 20px;
        }

        .db-stats li {
          margin: 3px 0;
        }

        .button-group {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }

        .btn {
          flex: 1;
          padding: 12px 20px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-test {
          background: #2196F3;
          color: white;
        }

        .btn-test:hover:not(:disabled) {
          background: #1976D2;
        }

        .btn-save {
          background: #4CAF50;
          color: white;
        }

        .btn-save:hover:not(:disabled) {
          background: #388E3C;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .save-notification {
          margin-top: 10px;
          padding: 10px;
          background: #e8f5e9;
          color: #2e7d32;
          border-radius: 6px;
          text-align: center;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}

export default DatabaseSettings;
