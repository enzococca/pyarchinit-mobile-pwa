import React, { useState, useEffect, useRef } from 'react';
import { Box, Upload, CheckCircle, XCircle, FileUp, X, RefreshCw } from 'lucide-react';

/**
 * Scan3DCapture - Component for uploading 3D models (LiDAR scans, photogrammetry)
 * Supports: .obj, .ply, .usdz, .glb, .gltf, .fbx
 */
export default function Scan3DCapture({ onScanComplete }) {
  // File state
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  // Form state
  const [entityTypes, setEntityTypes] = useState([]);
  const [selectedEntityType, setSelectedEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [sito, setSito] = useState('');
  const [description, setDescription] = useState('');
  const [scanType, setScanType] = useState('lidar'); // 'lidar' | 'photogrammetry'

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // 'success' | 'error'
  const [uploadMessage, setUploadMessage] = useState('');

  // Hover states
  const [hoverSelectFile, setHoverSelectFile] = useState(false);
  const [hoverUploadArea, setHoverUploadArea] = useState(false);
  const [hoverRemoveFile, setHoverRemoveFile] = useState(false);
  const [hoverUpload, setHoverUpload] = useState(false);

  const fileInputRef = useRef(null);

  const SUPPORTED_FORMATS = ['.obj', '.ply', '.usdz', '.glb', '.gltf', '.fbx'];

  // Fetch entity types on mount
  useEffect(() => {
    fetchEntityTypes();
  }, []);

  const fetchEntityTypes = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/media/entity-types`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const types = await response.json();
        setEntityTypes(types);
      }
    } catch (error) {
      console.error('Error fetching entity types:', error);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check file extension
    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!SUPPORTED_FORMATS.includes(extension)) {
      alert(`Formato non supportato. Usa uno di: ${SUPPORTED_FORMATS.join(', ')}`);
      return;
    }

    setSelectedFile(file);

    // Create preview info
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    setFilePreview({
      name: file.name,
      size: sizeInMB,
      type: extension.substring(1).toUpperCase()
    });
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const upload3DModel = async () => {
    if (!selectedFile) {
      alert('Nessun file selezionato');
      return;
    }

    setIsUploading(true);
    setUploadStatus(null);
    setUploadMessage('');

    try {
      const token = localStorage.getItem('auth_token');

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('scan_type', scanType);

      if (selectedEntityType) formData.append('entity_type', selectedEntityType);
      if (entityId) formData.append('entity_id', entityId);
      if (sito) formData.append('sito', sito);
      if (description) formData.append('description', description);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/media/upload-3d`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        setUploadStatus('success');
        setUploadMessage(`Modello 3D caricato con successo! ${result.entity_tagged ? '(Taggato a entità)' : ''}`);

        // Reset form after success
        setTimeout(() => {
          clearFile();
          setSelectedEntityType('');
          setEntityId('');
          setDescription('');
          setScanType('lidar');
          setUploadStatus(null);
          setUploadMessage('');

          if (onScanComplete) {
            onScanComplete();
          }
        }, 2000);
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Errore durante il caricamento');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      setUploadMessage(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Upload Status Message */}
      {uploadStatus && (
        <div style={{
          padding: '16px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: uploadStatus === 'success' ? '#f0fdf4' : '#fef2f2',
          color: uploadStatus === 'success' ? '#166534' : '#991b1b',
          border: uploadStatus === 'success' ? '1px solid #bbf7d0' : '1px solid #fecaca'
        }}>
          {uploadStatus === 'success' ? (
            <CheckCircle size={20} />
          ) : (
            <XCircle size={20} />
          )}
          <span style={{ fontWeight: '500' }}>{uploadMessage}</span>
        </div>
      )}

      {/* File Upload Area */}
      <div
        style={{
          border: '2px dashed #d1d5db',
          borderRadius: '12px',
          padding: '32px',
          textAlign: 'center',
          background: hoverUploadArea ? '#f9fafb' : '#f3f4f6',
          transition: 'all 0.2s'
        }}
        onMouseEnter={() => setHoverUploadArea(true)}
        onMouseLeave={() => setHoverUploadArea(false)}
      >
        {!filePreview ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            <Box size={64} style={{ color: '#9ca3af' }} />
            <div>
              <p style={{
                fontSize: '18px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px',
                marginTop: 0
              }}>
                Carica Modello 3D
              </p>
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                margin: 0
              }}>
                Formati supportati: {SUPPORTED_FORMATS.join(', ')}
              </p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: hoverSelectFile ? '#5568d3' : '#667eea',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: '600',
                fontSize: '15px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={() => setHoverSelectFile(true)}
              onMouseLeave={() => setHoverSelectFile(false)}
            >
              <FileUp size={20} />
              Seleziona File
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{
                  background: '#dbeafe',
                  padding: '12px',
                  borderRadius: '8px'
                }}>
                  <Box size={32} style={{ color: '#2563eb' }} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{
                    fontWeight: '500',
                    color: '#111827',
                    margin: 0,
                    marginBottom: '4px'
                  }}>
                    {filePreview.name}
                  </p>
                  <p style={{
                    fontSize: '14px',
                    color: '#6b7280',
                    margin: 0
                  }}>
                    {filePreview.type} • {filePreview.size} MB
                  </p>
                </div>
              </div>
              <button
                onClick={clearFile}
                style={{
                  color: hoverRemoveFile ? '#4b5563' : '#9ca3af',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Rimuovi file"
                onMouseEnter={() => setHoverRemoveFile(true)}
                onMouseLeave={() => setHoverRemoveFile(false)}
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={SUPPORTED_FORMATS.join(',')}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Form */}
      {filePreview && (
        <div style={{
          background: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <h3 style={{
            fontWeight: '600',
            fontSize: '16px',
            color: '#1a202c',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            margin: 0
          }}>
            <Box size={20} />
            Dettagli Scansione 3D
          </h3>

          {/* Scan Type */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#4a5568',
              marginBottom: '6px'
            }}>
              Tipo Scansione *
            </label>
            <select
              value={scanType}
              onChange={(e) => setScanType(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #cbd5e0',
                borderRadius: '8px',
                fontSize: '15px',
                outline: 'none',
                transition: 'all 0.2s',
                background: 'white'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#667eea';
                e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#cbd5e0';
                e.target.style.boxShadow = 'none';
              }}
            >
              <option value="lidar">LiDAR (iPhone Pro/iPad Pro)</option>
              <option value="photogrammetry">Fotogrammetria</option>
            </select>
          </div>

          {/* Sito */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#4a5568',
              marginBottom: '6px'
            }}>
              Sito *
            </label>
            <input
              type="text"
              value={sito}
              onChange={(e) => setSito(e.target.value)}
              placeholder="es. Pompei"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #cbd5e0',
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
                e.target.style.borderColor = '#cbd5e0';
                e.target.style.boxShadow = 'none';
              }}
              required
            />
          </div>

          {/* Entity Type */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#4a5568',
              marginBottom: '6px'
            }}>
              Tipo Entità (opzionale)
            </label>
            <select
              value={selectedEntityType}
              onChange={(e) => setSelectedEntityType(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #cbd5e0',
                borderRadius: '8px',
                fontSize: '15px',
                outline: 'none',
                transition: 'all 0.2s',
                background: 'white'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#667eea';
                e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#cbd5e0';
                e.target.style.boxShadow = 'none';
              }}
            >
              <option value="">-- Nessuna --</option>
              {entityTypes.map((type) => (
                <option key={type.entity_type} value={type.entity_type}>
                  {type.display_name}
                </option>
              ))}
            </select>
          </div>

          {/* Entity ID */}
          {selectedEntityType && (
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#4a5568',
                marginBottom: '6px'
              }}>
                ID Entità *
              </label>
              <input
                type="number"
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                placeholder="es. 1001"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #cbd5e0',
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
                  e.target.style.borderColor = '#cbd5e0';
                  e.target.style.boxShadow = 'none';
                }}
                required={!!selectedEntityType}
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#4a5568',
              marginBottom: '6px'
            }}>
              Descrizione (opzionale)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Aggiungi note sulla scansione..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #cbd5e0',
                borderRadius: '8px',
                fontSize: '15px',
                outline: 'none',
                transition: 'all 0.2s',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#667eea';
                e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#cbd5e0';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Upload Button */}
          <button
            onClick={upload3DModel}
            disabled={isUploading || !sito || (selectedEntityType && !entityId)}
            style={{
              width: '100%',
              background: isUploading || !sito || (selectedEntityType && !entityId)
                ? '#cbd5e0'
                : hoverUpload ? '#059669' : '#10b981',
              color: 'white',
              padding: '14px',
              borderRadius: '8px',
              border: 'none',
              cursor: isUploading || !sito || (selectedEntityType && !entityId)
                ? 'not-allowed'
                : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontWeight: '600',
              fontSize: '16px',
              transition: 'all 0.2s',
              boxShadow: isUploading || !sito || (selectedEntityType && !entityId)
                ? 'none'
                : '0 2px 4px rgba(16, 185, 129, 0.3)'
            }}
            onMouseEnter={() => {
              if (!isUploading && sito && (!selectedEntityType || entityId)) {
                setHoverUpload(true);
              }
            }}
            onMouseLeave={() => setHoverUpload(false)}
          >
            {isUploading ? (
              <>
                <RefreshCw size={20} style={{
                  animation: 'spin 1s linear infinite'
                }} />
                Caricamento...
              </>
            ) : (
              <>
                <Upload size={20} />
                Carica Modello 3D
              </>
            )}
          </button>
        </div>
      )}

      {/* Info Card */}
      <div style={{
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
          <li>Supporto per iPhone Pro/iPad Pro con sensore LiDAR</li>
          <li>Formati supportati: OBJ, PLY, USDZ, GLB, GLTF, FBX</li>
          <li>Puoi taggare il modello a US, Inventario Materiali o Ceramica</li>
          <li>Il campo "Sito" è obbligatorio</li>
          <li>Consigliato: usa app come "3D Scanner App" o "Polycam" per acquisire scansioni LiDAR</li>
        </ul>
      </div>
    </div>
  );
}
