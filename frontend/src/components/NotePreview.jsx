import { useState } from 'react';
import axios from 'axios';
import DuplicateDialog from './DuplicateDialog';
import RapportiEditor from './RapportiEditor';
import { updateAudioNote } from '../services/offlineStorage';
import { API_BASE } from '../config/api';

// FIXED: Using centralized API_BASE from config/api.js (2025-01-18)

/**
 * Get authorization headers for API requests
 */
function getAuthHeaders() {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('No authentication token found. Please log in again.');
  }
  return {
    'Authorization': `Bearer ${token}`
  };
}

function NotePreview({ note, onClose, onSave, onRefresh }) {
  const [editing, setEditing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState(null);
  const [showAreaDialog, setShowAreaDialog] = useState(false);
  const [missingArea, setMissingArea] = useState('');

  // Parse interpretation
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

  // Initialize edited fields with extracted_fields AND relationships as 'rapporti'
  const [editedFields, setEditedFields] = useState(() => {
    const fields = interpretation?.extracted_fields || {};
    // If relationships exist but rapporti field doesn't, add it
    if (interpretation?.relationships && !fields.rapporti) {
      fields.rapporti = interpretation.relationships;
    }
    return fields;
  });

  const handleFieldChange = (field, value) => {
    setEditedFields(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleProcessWithAI = async () => {
    if (!confirm('Re-process this note with AI? This will replace the current interpretation.')) {
      return;
    }

    // Check if note has been synced to server
    if (!note.serverNoteId) {
      alert('This note must be synced to the server first. Please sync your notes and try again.');
      return;
    }

    setProcessing(true);
    try {
      setProcessingStatus('🎤 Transcribing audio with Whisper AI...');

      const response = await axios.post(`${API_BASE}/notes/${note.serverNoteId}/process`, {
        force_reprocess: true
      }, {
        headers: getAuthHeaders()
      });

      setProcessingStatus('🤖 Interpreting with Claude AI...');

      // Wait a moment to show the status
      await new Promise(resolve => setTimeout(resolve, 500));

      setProcessingStatus('✅ Processing complete!');

      setTimeout(() => {
        alert('Note reprocessed successfully! Refreshing...');
        onRefresh();
        onClose();
      }, 500);
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.message;
      setProcessingStatus(`❌ Error: ${errorMsg}`);
      setTimeout(() => {
        alert(`Error processing: ${errorMsg}`);
        setProcessingStatus('');
      }, 2000);
    } finally {
      setTimeout(() => {
        setProcessing(false);
        setProcessingStatus('');
      }, 500);
    }
  };

  const handleConfirmAndSave = async (force_action = null) => {
    if (!force_action && !confirm('Confirm and save this data to the database?')) {
      return;
    }

    // Check if note has been synced to server
    if (!note.serverNoteId) {
      alert('This note must be synced to the server first. Please sync your notes and try again.');
      return;
    }

    // ⚠️ VALIDAZIONE AREA - campo obbligatorio (constraint database)
    if (!editedFields.area || editedFields.area.trim() === '') {
      setShowAreaDialog(true);
      return;
    }

    setSaving(true);
    console.log('[NotePreview] FIXED VERSION v3.1 - Starting save with cleaned fields and list handling');
    try {
      // Campi che sono liste di liste e devono essere serializzati correttamente
      const listOfListsFields = [
        'campioni',
        'componenti_organici',
        'componenti_inorganici',
        'documentazione',
        'rapporti'
      ];

      // Create a clean copy with only primitive values (no circular refs)
      const cleanFields = {};
      for (const [key, value] of Object.entries(editedFields)) {
        if (value !== null && value !== undefined) {
          // Se è un campo lista di liste, serializza come JSON
          if (listOfListsFields.includes(key)) {
            if (Array.isArray(value)) {
              cleanFields[key] = JSON.stringify(value);
            } else if (typeof value === 'string') {
              // Se è già una stringa, mantienila (potrebbe essere già JSON)
              cleanFields[key] = value;
            } else {
              cleanFields[key] = JSON.stringify([]);
            }
          }
          // Se è un oggetto complesso (ma non lista di liste), converti in stringa
          else if (typeof value === 'object') {
            cleanFields[key] = String(value);
          }
          // Altrimenti mantieni il valore primitivo
          else {
            cleanFields[key] = value;
          }
        }
      }

      console.log('[NotePreview] Cleaned fields created:', Object.keys(cleanFields));

      // Safely extract entity_type and target_table (in case they have circular refs)
      const safeEntityType = interpretation?.entity_type ? String(interpretation.entity_type) : 'US';
      const safeTargetTable = interpretation?.target_table ? String(interpretation.target_table) : 'us_table';

      // Send edited fields to backend for database insertion
      const requestData = {
        extracted_fields: cleanFields,
        entity_type: safeEntityType,
        target_table: safeTargetTable
      };

      // Add force action if specified (for merge/overwrite)
      if (force_action) {
        requestData.force_action = String(force_action);
      }

      console.log('[NotePreview] Request data prepared, sending to backend...');
      console.log('[NotePreview] Entity type:', safeEntityType, 'Target table:', safeTargetTable);

      const response = await axios.post(`${API_BASE}/notes/${note.serverNoteId}/confirm`, requestData, {
        headers: getAuthHeaders()
      });
      console.log('[NotePreview] Backend response received successfully');

      // Mark note as saved to database in local storage (using local ID)
      await updateAudioNote(note.id, { savedToDb: true });
      console.log('[NotePreview] Note marked as saved to DB in local storage');

      alert('Data saved successfully to database!');
      if (onSave) {
        onSave(response.data);
      }
      setShowDuplicateDialog(false);
      onClose();
    } catch (error) {
      // Check for duplicate error (HTTP 409)
      if (error.response?.status === 409) {
        // Extract duplicate info from error message
        const detail = error.response.data.detail || '';
        const match = detail.match(/US already exists: ([^,]+), Area ([^,]+), US (.+)/);

        if (match) {
          setDuplicateInfo({
            sito: match[1],
            area: match[2],
            us: match[3].split(')')[0],
            unita_tipo: editedFields.unita_tipo || 'US'
          });
          setShowDuplicateDialog(true);
        } else {
          alert(`Duplicate record: ${detail}`);
        }
      } else {
        // Extract error message safely without circular reference issues
        const errorMsg = error.response?.data?.detail ||
                         error.response?.data?.message ||
                         error.message ||
                         'Unknown error occurred';

        // Log only safe values (avoid logging full error object)
        console.error('Error saving:', errorMsg);
        if (error.response?.status) {
          console.error('Status code:', error.response.status);
        }

        alert(`Error saving: ${errorMsg}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleMerge = async () => {
    await handleConfirmAndSave('merge');
  };

  const handleOverwrite = async () => {
    await handleConfirmAndSave('overwrite');
  };

  const handleIgnore = () => {
    alert('Operation cancelled. The note remains in your list.');
  };

  const handleReject = async () => {
    if (!confirm('Reject this note? It will be marked as rejected and not saved to the database.')) {
      return;
    }

    // Check if note has been synced to server
    if (!note.serverNoteId) {
      alert('This note must be synced to the server first. Please sync your notes and try again.');
      return;
    }

    try {
      await axios.post(`${API_BASE}/notes/${note.serverNoteId}/reject`, {}, {
        headers: getAuthHeaders()
      });
      alert('Note rejected');
      onClose();
    } catch (error) {
      alert(`Error rejecting: ${error.message}`);
    }
  };

  return (
    <div className="preview-overlay">
      <div className="preview-modal">
        <div className="preview-header">
          <h2>📝 Note Preview</h2>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>

        <div className="preview-body">
          {/* Processing Status Indicator */}
          {processingStatus && (
            <div className="processing-status-banner">
              <div className="processing-spinner"></div>
              <span>{processingStatus}</span>
            </div>
          )}

          {/* Status */}
          <div className="status-section">
            <span className={`status-badge ${note.status}`}>
              {note.status}
            </span>
            <span className="date">
              {new Date(note.createdAt).toLocaleString('en')}
            </span>
          </div>

          {/* Transcription */}
          <div className="section">
            <h3>🎤 Transcription</h3>
            <div className="transcription-box">
              {note.transcription || 'No transcription available'}
            </div>
            {note.detected_language && (
              <small>Detected language: {note.detected_language}</small>
            )}
          </div>

          {/* AI Interpretation */}
          {interpretation && (
            <>
              <div className="section">
                <h3>🤖 AI Interpretation</h3>
                <div className="interpretation-info">
                  <div className="info-row">
                    <strong>Entity Type:</strong>
                    <span>{interpretation.entity_type}</span>
                  </div>
                  <div className="info-row">
                    <strong>Target Table:</strong>
                    <span>{interpretation.target_table}</span>
                  </div>
                  {interpretation.confidence !== undefined && interpretation.confidence !== null && (
                    <div className="info-row">
                      <strong>Confidence:</strong>
                      <span>{Math.round((interpretation.confidence || 0) * 100)}%</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Stratigraphic Relationships */}
              {interpretation.relationships && interpretation.relationships.length > 0 && (
                <div className="section">
                  <h3>🔗 Stratigraphic Relationships</h3>
                  <div className="relationships-list">
                    {interpretation.relationships.map((rel, idx) => {
                      // Format: ["Copre", "2045", "1", "Scavo archeologico"]
                      const [relType, targetUs, area, site] = rel;
                      return (
                        <div key={idx} className="relationship-item">
                          <span className="rel-type">{relType}</span>
                          <span className="rel-arrow">→</span>
                          <span className="rel-target">
                            US {targetUs}
                            {area && ` (Area ${area})`}
                            {site && ` - ${site}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Extracted Fields */}
              <div className="section">
                <div className="section-header">
                  <h3>📋 Extracted Fields</h3>
                  <button
                    onClick={() => setEditing(!editing)}
                    className="btn-edit"
                  >
                    {editing ? '👁️ View' : '✏️ Edit'}
                  </button>
                </div>

                {editing ? (
                  <div className="fields-edit">
                    {Object.entries(editedFields)
                      .filter(([key]) => key !== 'rapporti')
                      .map(([key, value]) => (
                        <div key={key} className="field-edit-row">
                          <label>{key}:</label>
                          <input
                            type="text"
                            value={value || ''}
                            onChange={(e) => handleFieldChange(key, e.target.value)}
                            className="field-input"
                          />
                        </div>
                      ))}

                    {/* Rapporti editor as separate component with its own styling */}
                    {editedFields.rapporti !== undefined && (
                      <div style={{ marginTop: '1rem' }}>
                        <RapportiEditor
                          value={editedFields.rapporti}
                          onChange={(newValue) => handleFieldChange('rapporti', newValue)}
                          sito={editedFields.sito || ''}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <table className="fields-table">
                    <tbody>
                      {Object.entries(editedFields).map(([key, value]) => (
                        <tr key={key}>
                          <td className="field-name">{key}</td>
                          <td className="field-value">{String(value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="action-buttons">
            <button
              onClick={handleProcessWithAI}
              disabled={processing || saving}
              className="btn btn-process"
            >
              {processing ? '🔄 Processing...' : '🤖 Re-process with AI'}
            </button>

            <button
              onClick={() => handleConfirmAndSave()}
              disabled={processing || saving || !interpretation}
              className="btn btn-confirm"
            >
              {saving ? '💾 Saving...' : '✓ Confirm & Save to Database'}
            </button>

            <button
              onClick={handleReject}
              disabled={processing || saving}
              className="btn btn-reject"
            >
              ✗ Reject
            </button>
          </div>
        </div>
      </div>

      {/* Duplicate US Dialog */}
      {showDuplicateDialog && duplicateInfo && (
        <DuplicateDialog
          duplicateInfo={duplicateInfo}
          onMerge={handleMerge}
          onOverwrite={handleOverwrite}
          onIgnore={handleIgnore}
          onClose={() => setShowDuplicateDialog(false)}
        />
      )}

      {/* Missing Area Dialog */}
      {showAreaDialog && (
        <div className="area-dialog-overlay">
          <div className="area-dialog">
            <h3>⚠️ Required Field Missing</h3>
            <p>The <strong>Area</strong> field is required to save to the database.</p>
            <p>Enter the Area for this US:</p>
            <input
              type="text"
              value={missingArea}
              onChange={(e) => setMissingArea(e.target.value)}
              placeholder="E.g.: A, B, 1000, etc."
              className="area-input"
              autoFocus
            />
            <div className="area-dialog-buttons">
              <button
                onClick={() => {
                  if (missingArea.trim()) {
                    setEditedFields({ ...editedFields, area: missingArea.trim() });
                    setShowAreaDialog(false);
                    setMissingArea('');
                    // Retry save after adding Area
                    setTimeout(() => handleConfirmAndSave(), 100);
                  } else {
                    alert('Enter a value for Area');
                  }
                }}
                className="area-btn area-btn-save"
              >
                💾 Save with Area
              </button>
              <button
                onClick={() => {
                  setShowAreaDialog(false);
                  setMissingArea('');
                }}
                className="area-btn area-btn-cancel"
              >
                ✕ Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .preview-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 20px;
          overflow-y: auto;
        }

        .preview-modal {
          background: white;
          border-radius: 12px;
          width: 100%;
          max-width: 800px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 2px solid #e0e0e0;
          position: sticky;
          top: 0;
          background: white;
          z-index: 10;
        }

        .preview-header h2 {
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

        .preview-body {
          padding: 20px;
        }

        .processing-status-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          margin: -20px -20px 20px -20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-weight: 600;
          font-size: 1rem;
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

        .processing-spinner {
          width: 24px;
          height: 24px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .status-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid #e0e0e0;
        }

        .status-badge {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status-badge.pending {
          background: #fff3cd;
          color: #856404;
        }

        .status-badge.processed {
          background: #cce5ff;
          color: #004085;
        }

        .status-badge.validated {
          background: #d4edda;
          color: #155724;
        }

        .date {
          color: #666;
          font-size: 0.9rem;
        }

        .section {
          margin-bottom: 25px;
        }

        .section h3 {
          margin: 0 0 12px 0;
          font-size: 1.1rem;
          color: #333;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .btn-edit {
          background: #6c757d;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.9rem;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-edit:hover {
          background: #5a6268;
        }

        .transcription-box {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          border-left: 4px solid #2196f3;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .interpretation-info {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #e0e0e0;
        }

        .info-row:last-child {
          border-bottom: none;
        }

        .relationships-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .relationship-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          border-left: 3px solid #2196f3;
        }

        .rel-type {
          font-weight: 600;
          color: #2196f3;
          min-width: 100px;
        }

        .rel-arrow {
          color: #999;
          font-size: 1.2rem;
        }

        .rel-target {
          color: #333;
          flex: 1;
        }

        .fields-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          overflow: hidden;
        }

        .fields-table tr:nth-child(even) {
          background: #f8f9fa;
        }

        .fields-table td {
          padding: 12px;
          border-bottom: 1px solid #e0e0e0;
        }

        .field-name {
          font-weight: 600;
          color: #555;
          width: 30%;
        }

        .field-value {
          color: #333;
        }

        .fields-edit {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .field-edit-row {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .field-edit-row label {
          font-weight: 600;
          color: #555;
          font-size: 0.9rem;
        }

        .field-input {
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
        }

        .field-input:focus {
          outline: none;
          border-color: #2196f3;
        }

        .action-buttons {
          display: flex;
          gap: 10px;
          margin-top: 25px;
          padding-top: 20px;
          border-top: 2px solid #e0e0e0;
          flex-wrap: wrap;
        }

        .btn {
          flex: 1;
          min-width: 150px;
          padding: 12px 20px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-process {
          background: #17a2b8;
          color: white;
        }

        .btn-process:hover:not(:disabled) {
          background: #138496;
        }

        .btn-confirm {
          background: #28a745;
          color: white;
        }

        .btn-confirm:hover:not(:disabled) {
          background: #218838;
        }

        .btn-reject {
          background: #dc3545;
          color: white;
        }

        .btn-reject:hover:not(:disabled) {
          background: #c82333;
        }

        @media (max-width: 600px) {
          .preview-modal {
            max-width: 100%;
            border-radius: 0;
          }

          .action-buttons {
            flex-direction: column;
          }

          .btn {
            width: 100%;
          }
        }

        /* Area Dialog Styles */
        .area-dialog-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 3000;
          padding: 20px;
        }

        .area-dialog {
          background: white;
          border-radius: 12px;
          padding: 30px;
          max-width: 500px;
          width: 100%;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .area-dialog h3 {
          margin: 0 0 15px 0;
          color: #d32f2f;
          font-size: 1.3rem;
        }

        .area-dialog p {
          margin: 10px 0;
          color: #333;
          line-height: 1.5;
        }

        .area-input {
          width: 100%;
          padding: 12px;
          border: 2px solid #ddd;
          border-radius: 8px;
          font-size: 1rem;
          margin: 15px 0;
          box-sizing: border-box;
        }

        .area-input:focus {
          outline: none;
          border-color: #4CAF50;
        }

        .area-dialog-buttons {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }

        .area-btn {
          flex: 1;
          padding: 12px 20px;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .area-btn-save {
          background: #4CAF50;
          color: white;
        }

        .area-btn-save:hover {
          background: #388E3C;
        }

        .area-btn-cancel {
          background: #f44336;
          color: white;
        }

        .area-btn-cancel:hover {
          background: #c62828;
        }
      `}</style>
    </div>
  );
}

export default NotePreview;
