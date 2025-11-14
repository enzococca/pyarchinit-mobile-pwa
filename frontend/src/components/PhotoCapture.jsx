import React, { useState, useRef } from 'react';
import { saveImageOffline } from '../services/offlineStorage';

export default function PhotoCapture({ 
  entityType, 
  entityId, 
  sito, 
  us,
  photographer,
  onPhotoCapture 
}) {
  const [capturedImage, setCapturedImage] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [descrizione, setDescrizione] = useState('');
  const [tags, setTags] = useState('');
  
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Apri file picker per caricare da galleria
  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  // Gestisci file selezionato da galleria
  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Valida tipo
    if (!file.type.startsWith('image/')) {
      alert('Seleziona un file immagine');
      return;
    }

    // Crea preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setCapturedImage(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Apri camera nativa
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Camera posteriore
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      setShowCamera(true);

    } catch (error) {
      console.error('Errore accesso camera:', error);
      alert('Impossibile accedere alla camera. Usa "Carica da Galleria"');
    }
  };

  // Scatta foto
  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) return;

    // Set canvas dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    // Convert to data URL
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);

    // Close camera
    closeCamera();
  };

  // Chiudi camera
  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  // Salva immagine
  const saveImage = async () => {
    if (!capturedImage) return;

    try {
      // Converti data URL a Blob
      const blob = dataURLtoBlob(capturedImage);
      
      // Ottieni GPS se disponibile
      let gpsLat = null;
      let gpsLon = null;
      
      if (navigator.geolocation) {
        try {
          const position = await getCurrentPosition();
          gpsLat = position.coords.latitude;
          gpsLon = position.coords.longitude;
        } catch (e) {
          console.log('GPS non disponibile');
        }
      }

      // Salva in locale
      const imageId = await saveImageOffline(
        {
          entityType,
          entityId,
          sito,
          us,
          descrizione,
          photographer,
          tags,
          filename: `photo_${Date.now()}.jpg`,
          gpsLat,
          gpsLon
        },
        blob
      );

      alert('Foto salvata. Verrà sincronizzata quando online.');
      
      // Reset
      setCapturedImage(null);
      setDescrizione('');
      setTags('');
      
      if (onPhotoCapture) {
        onPhotoCapture(imageId);
      }

    } catch (error) {
      console.error('Errore salvataggio foto:', error);
      alert('Errore salvataggio foto');
    }
  };

  // Scarta foto
  const discardImage = () => {
    setCapturedImage(null);
    setDescrizione('');
    setTags('');
  };

  // Utility functions
  const dataURLtoBlob = (dataURL) => {
    const parts = dataURL.split(',');
    const mime = parts[0].match(/:(.*?);/)[1];
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const getCurrentPosition = () => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 5000
      });
    });
  };

  return (
    <div className="photo-capture">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {!showCamera && !capturedImage && (
        <div className="capture-buttons">
          <button onClick={openCamera} className="btn-camera">
            📷 Scatta Foto
          </button>
          <button onClick={openFilePicker} className="btn-gallery">
            🖼️ Carica da Galleria
          </button>
        </div>
      )}

      {showCamera && (
        <div className="camera-view">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline
            className="video-preview"
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          
          <div className="camera-controls">
            <button onClick={closeCamera} className="btn-cancel">
              ❌ Annulla
            </button>
            <button onClick={capturePhoto} className="btn-capture">
              📸 Scatta
            </button>
          </div>
        </div>
      )}

      {capturedImage && (
        <div className="image-review">
          <img src={capturedImage} alt="Captured" className="preview-image" />
          
          <div className="metadata-form">
            <input
              type="text"
              placeholder="Descrizione (opzionale)"
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
              className="input-field"
            />
            
            <input
              type="text"
              placeholder="Tags (es: ceramica,frammento)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="input-field"
            />
            
            <div className="info-text">
              <small>
                Tipo: {entityType} | ID: {entityId} | Sito: {sito}
                {us && ` | US: ${us}`}
              </small>
            </div>
          </div>

          <div className="action-buttons">
            <button onClick={discardImage} className="btn-discard">
              🗑️ Scarta
            </button>
            <button onClick={saveImage} className="btn-save">
              💾 Salva
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .photo-capture {
          padding: 1rem;
        }

        .capture-buttons {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .capture-buttons button {
          padding: 1.2rem;
          font-size: 1.1rem;
          font-weight: 600;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          color: white;
        }

        .btn-camera {
          background: #2196f3;
        }

        .btn-gallery {
          background: #4caf50;
        }

        .camera-view {
          position: relative;
        }

        .video-preview {
          width: 100%;
          border-radius: 8px;
          background: #000;
        }

        .camera-controls {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }

        .camera-controls button {
          flex: 1;
          padding: 1rem;
          font-size: 1rem;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        }

        .btn-cancel {
          background: #f44336;
          color: white;
        }

        .btn-capture {
          background: #2196f3;
          color: white;
        }

        .image-review {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .preview-image {
          width: 100%;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .metadata-form {
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
        }

        .input-field {
          padding: 0.8rem;
          font-size: 1rem;
          border: 1px solid #ddd;
          border-radius: 6px;
        }

        .info-text {
          padding: 0.5rem;
          background: #f5f5f5;
          border-radius: 4px;
        }

        .action-buttons {
          display: flex;
          gap: 1rem;
        }

        .action-buttons button {
          flex: 1;
          padding: 1rem;
          font-size: 1rem;
          font-weight: 600;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          color: white;
        }

        .btn-save {
          background: #4caf50;
        }

        .btn-discard {
          background: #f44336;
        }
      `}</style>
    </div>
  );
}
