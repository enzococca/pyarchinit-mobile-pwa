import React, { useState, useRef, useEffect } from 'react';
import { Video, X, PlayCircle, PauseCircle, StopCircle, Upload, CheckCircle, XCircle } from 'lucide-react';

/**
 * VideoRecorder - Component for recording videos or uploading from files
 * Supports entity tagging (US, Inventario Materiali, Pottery)
 */
export default function VideoRecorder({ onRecordingComplete }) {
  // Recording state
  const [stream, setStream] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState(null);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);

  // Form state
  const [entityTypes, setEntityTypes] = useState([]);
  const [selectedEntityType, setSelectedEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [sito, setSito] = useState('');
  const [description, setDescription] = useState('');

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // 'success' | 'error'
  const [uploadMessage, setUploadMessage] = useState('');

  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch entity types on mount
  useEffect(() => {
    fetchEntityTypes();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [stream]);

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

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: true
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Errore accesso fotocamera/microfono: ' + error.message);
    }
  };

  const startRecording = async () => {
    if (!stream) {
      await startCamera();
      // Wait for stream to be set
      setTimeout(() => startActualRecording(), 100);
    } else {
      startActualRecording();
    }
  };

  const startActualRecording = () => {
    if (!stream) return;

    chunksRef.current = [];
    
    try {
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 2500000
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const videoUrl = URL.createObjectURL(blob);
        setRecordedVideo(videoUrl);
        setRecordedBlob(blob);

        // Stop stream
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          setStream(null);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setIsPaused(false);

      // Start timer
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Errore avvio registrazione: ' + error.message);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && 
        (mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused')) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }

    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
    chunksRef.current = [];

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const retakeVideo = () => {
    setRecordedVideo(null);
    setRecordedBlob(null);
    setRecordingTime(0);
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('video/')) {
      const videoUrl = URL.createObjectURL(file);
      setRecordedVideo(videoUrl);
      setRecordedBlob(file);
    }
  };

  const uploadVideo = async () => {
    if (!recordedBlob) {
      alert('Nessun video da caricare');
      return;
    }

    setIsUploading(true);
    setUploadStatus(null);
    setUploadMessage('');

    try {
      const token = localStorage.getItem('auth_token');

      const formData = new FormData();
      
      // Create File from Blob if needed
      const videoFile = recordedBlob instanceof File 
        ? recordedBlob 
        : new File([recordedBlob], `video_${Date.now()}.webm`, { type: 'video/webm' });
      
      formData.append('file', videoFile);

      if (selectedEntityType) formData.append('entity_type', selectedEntityType);
      if (entityId) formData.append('entity_id', entityId);
      if (sito) formData.append('sito', sito);
      if (description) formData.append('description', description);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/media/upload-video`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        setUploadStatus('success');
        setUploadMessage(`Video caricato con successo! ${result.entity_tagged ? '(Taggato a entità)' : ''}`);

        // Reset form after success
        setTimeout(() => {
          setRecordedVideo(null);
          setRecordedBlob(null);
          setSelectedEntityType('');
          setEntityId('');
          setDescription('');
          setUploadStatus(null);
          setUploadMessage('');

          if (onRecordingComplete) {
            onRecordingComplete();
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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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

      {/* Video Preview */}
      <div style={{
        position: 'relative',
        background: '#000',
        borderRadius: '12px',
        overflow: 'hidden',
        aspectRatio: '16/9',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        {!recordedVideo ? (
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

            {isRecording && (
              <div style={{
                position: 'absolute',
                top: '16px',
                left: '16px',
                background: '#ef4444',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '9999px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  background: 'white',
                  borderRadius: '50%',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }}></div>
                <span style={{
                  fontFamily: 'monospace',
                  fontWeight: 'bold'
                }}>{formatTime(recordingTime)}</span>
              </div>
            )}

            {!stream && !isRecording && (
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
                  <Video size={64} style={{ opacity: 0.5, margin: '0 auto' }} />
                  <p style={{ fontSize: '18px', margin: 0 }}>Pronto per registrare</p>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                      onClick={startRecording}
                      style={{
                        background: '#ef4444',
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
                      onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
                    >
                      <Video size={20} />
                      Inizia Registrazione
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
                      Carica Video
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ position: 'relative' }}>
            <video
              src={recordedVideo}
              controls
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
            <button
              onClick={retakeVideo}
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
              title="Registra un altro video"
              onMouseEnter={(e) => e.currentTarget.style.background = 'white'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.9)'}
            >
              <X size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {/* Recording Controls */}
      {isRecording && !recordedVideo && (
        <div style={{ display: 'flex', gap: '8px' }}>
          {!isPaused ? (
            <button
              onClick={pauseRecording}
              style={{
                flex: 1,
                background: '#d97706',
                color: 'white',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: '600',
                fontSize: '15px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#b45309'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#d97706'}
            >
              <PauseCircle size={20} />
              Pausa
            </button>
          ) : (
            <button
              onClick={resumeRecording}
              style={{
                flex: 1,
                background: '#10b981',
                color: 'white',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: '600',
                fontSize: '15px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#10b981'}
            >
              <PlayCircle size={20} />
              Riprendi
            </button>
          )}
          <button
            onClick={stopRecording}
            style={{
              flex: 1,
              background: '#ef4444',
              color: 'white',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontWeight: '600',
              fontSize: '15px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
          >
            <StopCircle size={20} />
            Stop
          </button>
          <button
            onClick={cancelRecording}
            style={{
              background: '#718096',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            title="Annulla"
            onMouseEnter={(e) => e.currentTarget.style.background = '#4a5568'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#718096'}
          >
            <X size={20} />
          </button>
        </div>
      )}

      {/* Entity Tagging Form */}
      {recordedVideo && (
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
            <Video size={20} />
            Dettagli Video
          </h3>

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

          {/* Upload Button */}
          <button
            onClick={uploadVideo}
            disabled={isUploading || !sito || (selectedEntityType && !entityId)}
            style={{
              width: '100%',
              background: isUploading || !sito || (selectedEntityType && !entityId)
                ? '#cbd5e0'
                : '#10b981',
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
            onMouseEnter={(e) => {
              if (!isUploading && sito && (!selectedEntityType || entityId)) {
                e.currentTarget.style.background = '#059669';
              }
            }}
            onMouseLeave={(e) => {
              if (!isUploading && sito && (!selectedEntityType || entityId)) {
                e.currentTarget.style.background = '#10b981';
              }
            }}
          >
            {isUploading ? (
              <>
                <Video size={20} style={{
                  animation: 'spin 1s linear infinite'
                }} />
                Caricamento...
              </>
            ) : (
              <>
                <Upload size={20} />
                Carica Video
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
          <li>Registra video direttamente dalla fotocamera o carica da file</li>
          <li>Supporto per pausa/riprendi durante la registrazione</li>
          <li>Puoi taggare il video a US, Inventario Materiali o Ceramica</li>
          <li>Il campo "Sito" è obbligatorio</li>
        </ul>
      </div>
    </div>
  );
}
