import { useState, useEffect } from 'react';

const RELATIONSHIP_TYPES = [
  'Copre',
  'Coperto da',
  'Taglia',
  'Tagliato da',
  'Riempie',
  'Riempito da',
  'Si appoggia a',
  'Gli si appoggia',
  'Si lega a',
  'Uguale a',
  'Anteriore a',
  'Posteriore a'
];

function RapportiEditor({ value, onChange, sito }) {
  const [mode, setMode] = useState('visual'); // 'visual' or 'json'
  const [rapporti, setRapporti] = useState([]);
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState('');

  // Initialize rapporti from value
  useEffect(() => {
    try {
      if (typeof value === 'string') {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          setRapporti(parsed);
          setJsonText(JSON.stringify(parsed, null, 2));
        }
      } else if (Array.isArray(value)) {
        setRapporti(value);
        setJsonText(JSON.stringify(value, null, 2));
      } else {
        setRapporti([]);
        setJsonText('[]');
      }
    } catch (e) {
      console.error('Error parsing rapporti:', e);
      setRapporti([]);
      setJsonText('[]');
    }
  }, [value]);

  const addRelationship = () => {
    const newRapporti = [...rapporti, ['Copre', '', '', sito || '']];
    setRapporti(newRapporti);
    setJsonText(JSON.stringify(newRapporti, null, 2));
    onChange(newRapporti);
  };

  const removeRelationship = (index) => {
    const newRapporti = rapporti.filter((_, i) => i !== index);
    setRapporti(newRapporti);
    setJsonText(JSON.stringify(newRapporti, null, 2));
    onChange(newRapporti);
  };

  const updateRelationship = (index, field, value) => {
    const newRapporti = [...rapporti];
    const fieldMap = { type: 0, us: 1, area: 2, sito: 3 };
    newRapporti[index][fieldMap[field]] = value;
    setRapporti(newRapporti);
    setJsonText(JSON.stringify(newRapporti, null, 2));
    onChange(newRapporti);
  };

  const handleJsonChange = (text) => {
    setJsonText(text);
    setJsonError('');

    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        setRapporti(parsed);
        onChange(parsed);
      } else {
        setJsonError('Must be an array');
      }
    } catch (e) {
      setJsonError('Invalid JSON: ' + e.message);
    }
  };

  const switchMode = (newMode) => {
    if (newMode === 'json') {
      // Switching to JSON mode: sync current rapporti to JSON text
      setJsonText(JSON.stringify(rapporti, null, 2));
      setJsonError('');
    } else {
      // Switching to visual mode: try to parse JSON text
      try {
        const parsed = JSON.parse(jsonText);
        if (Array.isArray(parsed)) {
          setRapporti(parsed);
          onChange(parsed);
          setJsonError('');
        } else {
          setJsonError('Must be an array');
          return;
        }
      } catch (e) {
        setJsonError('Fix JSON errors before switching to visual mode');
        return;
      }
    }
    setMode(newMode);
  };

  return (
    <div className="rapporti-editor">
      <div className="rapporti-header">
        <label>Stratigraphic Relationships</label>
        <div className="mode-toggle">
          <button
            onClick={() => switchMode('visual')}
            className={`mode-btn ${mode === 'visual' ? 'active' : ''}`}
          >
            👁️ Visual
          </button>
          <button
            onClick={() => switchMode('json')}
            className={`mode-btn ${mode === 'json' ? 'active' : ''}`}
          >
            📝 JSON
          </button>
        </div>
      </div>

      {mode === 'visual' ? (
        <div className="rapporti-visual">
          {rapporti.length === 0 ? (
            <p className="empty-message">No relationships defined</p>
          ) : (
            <div className="rapporti-list">
              {rapporti.map((rel, index) => (
                <div key={index} className="rapport-item">
                  <div className="rapport-row">
                    <select
                      value={rel[0] || ''}
                      onChange={(e) => updateRelationship(index, 'type', e.target.value)}
                      className="rapport-type"
                    >
                      <option value="">Select type...</option>
                      {RELATIONSHIP_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>

                    <input
                      type="text"
                      placeholder="US"
                      value={rel[1] || ''}
                      onChange={(e) => updateRelationship(index, 'us', e.target.value)}
                      className="rapport-us"
                    />

                    <input
                      type="text"
                      placeholder="Area"
                      value={rel[2] || ''}
                      onChange={(e) => updateRelationship(index, 'area', e.target.value)}
                      className="rapport-area"
                    />

                    <input
                      type="text"
                      placeholder="Site"
                      value={rel[3] || ''}
                      onChange={(e) => updateRelationship(index, 'sito', e.target.value)}
                      className="rapport-sito"
                    />

                    <button
                      onClick={() => removeRelationship(index)}
                      className="btn-remove"
                      title="Remove"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button onClick={addRelationship} className="btn-add">
            ➕ Add Relationship
          </button>
        </div>
      ) : (
        <div className="rapporti-json">
          <textarea
            value={jsonText}
            onChange={(e) => handleJsonChange(e.target.value)}
            className="json-textarea"
            placeholder='[["Copre", "2045", "1", "Site"], ...]'
            rows={10}
          />
          {jsonError && (
            <div className="json-error">⚠️ {jsonError}</div>
          )}
          <div className="json-help">
            Format: [["Type", "US", "Area", "Site"], ...]
          </div>
        </div>
      )}

      <style>{`
        .rapporti-editor {
          margin-bottom: 1rem;
        }

        .rapporti-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .rapporti-header label {
          font-weight: 600;
          color: #333;
        }

        .mode-toggle {
          display: flex;
          gap: 0.5rem;
        }

        .mode-btn {
          padding: 0.4rem 0.8rem;
          background: #f5f5f5;
          border: 1px solid #ddd;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.85rem;
          transition: all 0.2s;
        }

        .mode-btn.active {
          background: #2196f3;
          color: white;
          border-color: #2196f3;
        }

        .mode-btn:hover:not(.active) {
          background: #e0e0e0;
        }

        .rapporti-visual {
          background: #f9f9f9;
          padding: 1rem;
          border-radius: 6px;
          border: 1px solid #ddd;
        }

        .empty-message {
          text-align: center;
          color: #999;
          padding: 1rem;
        }

        .rapporti-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .rapport-item {
          background: white;
          padding: 0.8rem;
          border-radius: 4px;
          border: 1px solid #e0e0e0;
        }

        .rapport-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1.5fr auto;
          gap: 0.5rem;
          align-items: center;
        }

        .rapport-type,
        .rapport-us,
        .rapport-area,
        .rapport-sito {
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 0.9rem;
        }

        .rapport-type {
          font-weight: 500;
        }

        .btn-remove {
          padding: 0.5rem;
          background: #f44336;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
          transition: background 0.2s;
        }

        .btn-remove:hover {
          background: #d32f2f;
        }

        .btn-add {
          width: 100%;
          padding: 0.8rem;
          background: #4caf50;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-add:hover {
          background: #388e3c;
        }

        .rapporti-json {
          background: #f9f9f9;
          padding: 1rem;
          border-radius: 6px;
          border: 1px solid #ddd;
        }

        .json-textarea {
          width: 100%;
          padding: 0.8rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
          font-size: 0.9rem;
          resize: vertical;
          min-height: 200px;
        }

        .json-textarea:focus {
          outline: none;
          border-color: #2196f3;
        }

        .json-error {
          margin-top: 0.5rem;
          padding: 0.8rem;
          background: #ffebee;
          color: #c62828;
          border-radius: 4px;
          font-size: 0.85rem;
        }

        .json-help {
          margin-top: 0.5rem;
          padding: 0.5rem;
          background: #e3f2fd;
          color: #1565c0;
          border-radius: 4px;
          font-size: 0.85rem;
          font-family: 'Courier New', monospace;
        }

        @media (max-width: 768px) {
          .rapport-row {
            grid-template-columns: 1fr;
          }

          .rapport-row > * {
            width: 100%;
          }

          .btn-remove {
            margin-top: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}

export default RapportiEditor;
