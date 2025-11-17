import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, RefreshCw, Upload, Image, CheckCircle, XCircle } from 'lucide-react';

/**
 * PhotoCapture - Component for capturing photos with camera or uploading from gallery
 * Supports entity tagging (US, Inventario Materiali, Pottery)
 */
export default function PhotoCapture({ onCaptureComplete }) {
  // Camera state
  const [stream, setStream] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'user' | 'environment'

  // Capture state
  const [capturedImage, setCapturedImage] = useState(null);
  const [capturedFile, setCapturedFile] = useState(null);

  // Form state
  const [entityTypes, setEntityTypes] = useState([]);
  const [selectedEntityType, setSelectedEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [sito, setSito] = useState('');
  const [area, setArea] = useState('');
  const [us, setUs] = useState('');
  const [numeroInventario, setNumeroInventario] = useState('');
  const [description, setDescription] = useState('');

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // 'success' | 'error'
  const [uploadMessage, setUploadMessage] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch entity types on mount
  useEffect(() => {
    fetchEntityTypes();
  }, []);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const fetchEntityTypes = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      console.log('[PhotoCapture] Fetching entity types from:', `${import.meta.env.VITE_API_URL}/api/media/entity-types`);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/media/entity-types`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('[PhotoCapture] Entity types response status:', response.status);

      if (response.ok) {
        const types = await response.json();
        console.log('[PhotoCapture] Entity types loaded:', types);
        setEntityTypes(types);
      } else {
        const errorText = await response.text();
        console.error('[PhotoCapture] Failed to fetch entity types:', response.status, errorText);
      }
    } catch (error) {
      console.error('[PhotoCapture] Error fetching entity types:', error);
    }
  };

  const startCamera = async () => {
    try {
      // Stop existing stream if any
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      setIsCameraActive(true);
      setCapturedImage(null);
      setCapturedFile(null);
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Errore accesso fotocamera: ' + error.message);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  const switchCamera = async () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);

    if (isCameraActive) {
      stopCamera();
      setTimeout(() => startCamera(), 100);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Set canvas size to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      const imageUrl = URL.createObjectURL(blob);
      setCapturedImage(imageUrl);

      // Create File object from blob
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const file = new File([blob], `photo_${timestamp}.jpg`, { type: 'image/jpeg' });
      setCapturedFile(file);

      stopCamera();
    }, 'image/jpeg', 0.95);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setCapturedFile(null);
    startCamera();
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const imageUrl = URL.createObjectURL(file);
      setCapturedImage(imageUrl);
      setCapturedFile(file);
      stopCamera();
    }
  };

  const uploadPhoto = async () => {
    if (!capturedFile) {
      alert('Nessuna foto da caricare');
      return;
    }

    setIsUploading(true);
    setUploadStatus(null);
    setUploadMessage('');

    try {
      const token = localStorage.getItem('auth_token');

      const formData = new FormData();
      formData.append('file', capturedFile);

      if (selectedEntityType) formData.append('entity_type', selectedEntityType);
      if (entityId) formData.append('entity_id', entityId);
      if (sito) formData.append('sito', sito);
      if (area) formData.append('area', area);
      if (us) formData.append('us', us);
      if (numeroInventario) formData.append('numero_inventario', numeroInventario);
      if (description) formData.append('description', description);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/media/upload-photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        setUploadStatus('success');
        setUploadMessage(`Foto caricata con successo! ${result.entity_tagged ? '(Taggata a entità)' : ''}`);

        // Reset form after success
        setTimeout(() => {
          setCapturedImage(null);
          setCapturedFile(null);
          setSelectedEntityType('');
          setEntityId('');
          setArea('');
          setUs('');
          setNumeroInventario('');
          setDescription('');
          setUploadStatus(null);
          setUploadMessage('');

          if (onCaptureComplete) {
            onCaptureComplete();
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

      {/* Camera View or Captured Image */}
      <div style={{
        position: 'relative',
        background: '#000',
        borderRadius: '12px',
        overflow: 'hidden',
        aspectRatio: '4/3',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        {!capturedImage ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />

            {isCameraActive && (
              <div style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                display: 'flex',
                gap: '8px'
              }}>
                <button
                  onClick={switchCamera}
                  style={{
                    background: 'rgba(255,255,255,0.9)',
                    padding: '12px',
                    borderRadius: '50%',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  title="Cambia fotocamera"
                  onMouseEnter={(e) => e.currentTarget.style.background = 'white'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.9)'}
                >
                  <RefreshCw size={20} />
                </button>
                <button
                  onClick={stopCamera}
                  style={{
                    background: 'rgba(239, 68, 68, 0.9)',
                    padding: '12px',
                    borderRadius: '50%',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                  title="Chiudi fotocamera"
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgb(239, 68, 68)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.9)'}
                >
                  <X size={20} />
                </button>
              </div>
            )}

            {!isCameraActive && (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{
                  textAlign: 'center',
                  color: 'white',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  alignItems: 'center'
                }}>
                  <Camera size={64} style={{ opacity: 0.5 }} />
                  <p style={{ fontSize: '18px', margin: 0 }}>Fotocamera non attiva</p>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                      onClick={startCamera}
                      style={{
                        background: '#667eea',
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
                      onMouseEnter={(e) => e.currentTarget.style.background = '#5568d3'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#667eea'}
                    >
                      <Camera size={20} />
                      Avvia Fotocamera
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        background: '#718096',
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
                      onMouseEnter={(e) => e.currentTarget.style.background = '#4a5568'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#718096'}
                    >
                      <Upload size={20} />
                      Carica da Galleria
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ position: 'relative' }}>
            <img
              src={capturedImage}
              alt="Captured"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
            <button
              onClick={retakePhoto}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(255,255,255,0.9)',
                padding: '12px',
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              title="Scatta un'altra foto"
              onMouseEnter={(e) => e.currentTarget.style.background = 'white'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.9)'}
            >
              <RefreshCw size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Hidden file input for gallery upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Capture Button */}
      {isCameraActive && !capturedImage && (
        <button
          onClick={capturePhoto}
          style={{
            width: '100%',
            background: '#667eea',
            color: 'white',
            padding: '16px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '18px',
            fontWeight: '600',
            transition: 'all 0.2s',
            boxShadow: '0 2px 4px rgba(102, 126, 234, 0.3)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#5568d3'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#667eea'}
        >
          <Camera size={24} />
          Scatta Foto
        </button>
      )}

      {/* Entity Tagging Form */}
      {capturedImage && (
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
            <Image size={20} />
            Dettagli Foto
          </h3>

          {/* Entity Type Selector */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#4a5568',
              marginBottom: '6px'
            }}>
              Tipo Entità *
            </label>
            <select
              value={selectedEntityType}
              onChange={(e) => {
                setSelectedEntityType(e.target.value);
                // Reset all fields when entity type changes
                setSito('');
                setArea('');
                setUs('');
                setNumeroInventario('');
              }}
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
              required
            >
              <option value="">-- Seleziona Tipo --</option>
              {entityTypes.map((type) => (
                <option key={type.entity_type} value={type.entity_type}>
                  {type.display_name}
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic Fields Based on Entity Type */}
          {selectedEntityType === 'US' && (
            <>
              {/* Sito (readonly for now, but shown as input) */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#4a5568',
                  marginBottom: '6px'
                }}>
                  Sito
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
                />
              </div>

              {/* Area */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#4a5568',
                  marginBottom: '6px'
                }}>
                  Area *
                </label>
                <input
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="es. A"
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

              {/* US */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#4a5568',
                  marginBottom: '6px'
                }}>
                  US *
                </label>
                <input
                  type="text"
                  value={us}
                  onChange={(e) => setUs(e.target.value)}
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
                  required
                />
              </div>
            </>
          )}

          {selectedEntityType === 'INVENTARIO_MATERIALI' && (
            <>
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

              {/* Numero Inventario */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#4a5568',
                  marginBottom: '6px'
                }}>
                  Numero Inventario *
                </label>
                <input
                  type="number"
                  value={numeroInventario}
                  onChange={(e) => setNumeroInventario(e.target.value)}
                  placeholder="es. 12345"
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
            </>
          )}

          {selectedEntityType === 'POTTERY' && (
            <>
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

              {/* Area */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#4a5568',
                  marginBottom: '6px'
                }}>
                  Area *
                </label>
                <input
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="es. A"
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

              {/* US */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#4a5568',
                  marginBottom: '6px'
                }}>
                  US *
                </label>
                <input
                  type="text"
                  value={us}
                  onChange={(e) => setUs(e.target.value)}
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
                  required
                />
              </div>
            </>
          )}

          {/* Description - Common for all types */}
          {selectedEntityType && (
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
                placeholder="Aggiungi note o descrizione..."
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
          )}

          {/* Upload Button */}
          <button
            onClick={uploadPhoto}
            disabled={
              isUploading ||
              !selectedEntityType ||
              (selectedEntityType === 'US' && (!area || !us)) ||
              (selectedEntityType === 'INVENTARIO_MATERIALI' && (!sito || !numeroInventario)) ||
              (selectedEntityType === 'POTTERY' && (!sito || !area || !us))
            }
            style={{
              width: '100%',
              background: (
                isUploading ||
                !selectedEntityType ||
                (selectedEntityType === 'US' && (!area || !us)) ||
                (selectedEntityType === 'INVENTARIO_MATERIALI' && (!sito || !numeroInventario)) ||
                (selectedEntityType === 'POTTERY' && (!sito || !area || !us))
              )
                ? '#cbd5e0'
                : '#10b981',
              color: 'white',
              padding: '14px',
              borderRadius: '8px',
              border: 'none',
              cursor: (
                isUploading ||
                !selectedEntityType ||
                (selectedEntityType === 'US' && (!area || !us)) ||
                (selectedEntityType === 'INVENTARIO_MATERIALI' && (!sito || !numeroInventario)) ||
                (selectedEntityType === 'POTTERY' && (!sito || !area || !us))
              )
                ? 'not-allowed'
                : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontWeight: '600',
              fontSize: '16px',
              transition: 'all 0.2s',
              boxShadow: (
                isUploading ||
                !selectedEntityType ||
                (selectedEntityType === 'US' && (!area || !us)) ||
                (selectedEntityType === 'INVENTARIO_MATERIALI' && (!sito || !numeroInventario)) ||
                (selectedEntityType === 'POTTERY' && (!sito || !area || !us))
              )
                ? 'none'
                : '0 2px 4px rgba(16, 185, 129, 0.3)'
            }}
            onMouseEnter={(e) => {
              const isDisabled =
                isUploading ||
                !selectedEntityType ||
                (selectedEntityType === 'US' && (!area || !us)) ||
                (selectedEntityType === 'INVENTARIO_MATERIALI' && (!sito || !numeroInventario)) ||
                (selectedEntityType === 'POTTERY' && (!sito || !area || !us));
              if (!isDisabled) {
                e.currentTarget.style.background = '#059669';
              }
            }}
            onMouseLeave={(e) => {
              const isDisabled =
                isUploading ||
                !selectedEntityType ||
                (selectedEntityType === 'US' && (!area || !us)) ||
                (selectedEntityType === 'INVENTARIO_MATERIALI' && (!sito || !numeroInventario)) ||
                (selectedEntityType === 'POTTERY' && (!sito || !area || !us));
              if (!isDisabled) {
                e.currentTarget.style.background = '#10b981';
              }
            }}
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
                Carica Foto
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
          <li>La foto viene automaticamente ridimensionata (originale, thumb, resize)</li>
          <li>Puoi taggarla a US, Inventario Materiali o Ceramica</li>
          <li>Il campo "Sito" è obbligatorio</li>
          <li>Se selezioni un'entità, devi inserire anche l'ID</li>
        </ul>
      </div>
    </div>
  );
}
