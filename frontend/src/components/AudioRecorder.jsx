import React, { useState, useRef, useEffect } from 'react';
import { saveAudioNoteOffline } from '../services/offlineStorage';

export default function AudioRecorder({ sito, recordedBy, onRecordingComplete }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    return () => {
      // Cleanup
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      // Richiedi permesso microfono
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      streamRef.current = stream;

      // Determina tipo MIME supportato
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm'
        : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType,
        audioBitsPerSecond: 128000
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        
        // Stop stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);

      // Timer
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Errore avvio registrazione:', error);
      alert('Errore accesso microfono. Verifica i permessi.');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      clearInterval(timerRef.current);
    }
  };

  const saveRecording = async () => {
    if (!audioBlob) return;

    try {
      // Converti blob a base64
      const base64 = await blobToBase64(audioBlob);
      
      // Ottieni coordinate GPS se disponibili
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
      const noteId = await saveAudioNoteOffline({
        audioBlob: base64,
        filename: `note_${Date.now()}.webm`,
        duration,
        sito,
        recordedBy,
        gpsLat,
        gpsLon
      });

      alert('Nota salvata in locale. Verrà sincronizzata quando online.');
      
      // Reset
      setAudioBlob(null);
      setDuration(0);
      
      if (onRecordingComplete) {
        onRecordingComplete(noteId);
      }

    } catch (error) {
      console.error('Errore salvataggio:', error);
      alert('Errore salvataggio nota');
    }
  };

  const discardRecording = () => {
    setAudioBlob(null);
    setDuration(0);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Utility: blob to base64
  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Utility: get GPS position
  const getCurrentPosition = () => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      });
    });
  };

  return (
    <div className="audio-recorder">
      <div className="recorder-display">
        <div className="duration">{formatDuration(duration)}</div>
        
        {isRecording && (
          <div className="recording-indicator">
            <span className="pulse"></span>
            {isPaused ? 'IN PAUSA' : 'REGISTRAZIONE'}
          </div>
        )}
      </div>

      {!isRecording && !audioBlob && (
        <>
          <div className="examples-box">
            <h4>💡 Esempi di note vocali:</h4>
            <div className="example-item">
              <strong>US (Unità Stratigrafica):</strong>
              <p>"US 2045, strato di terra marrone scuro con inclusi di laterizi frammentati, periodo romano imperiale, scavato il 15 novembre"</p>
            </div>
            <div className="example-item">
              <strong>Materiale:</strong>
              <p>"Frammento di ceramica a vernice nera, diametro circa 8 centimetri, trovato in US 3012, possibile periodo tardo repubblicano"</p>
            </div>
            <div className="example-item">
              <strong>Struttura:</strong>
              <p>"Muro in opera quadrata, orientamento nord-sud, altezza conservata 1.2 metri, larghezza 0.6 metri, buono stato di conservazione"</p>
            </div>
          </div>

          <button
            className="btn-record"
            onClick={startRecording}
          >
            🎤 INIZIA REGISTRAZIONE
          </button>
        </>
      )}

      {isRecording && (
        <div className="recording-controls">
          {!isPaused ? (
            <button onClick={pauseRecording}>⏸️ Pausa</button>
          ) : (
            <button onClick={resumeRecording}>▶️ Riprendi</button>
          )}
          
          <button onClick={stopRecording}>⏹️ Stop</button>
        </div>
      )}

      {audioBlob && (
        <div className="playback-controls">
          <audio 
            src={URL.createObjectURL(audioBlob)} 
            controls 
            style={{ width: '100%', marginBottom: '1rem' }}
          />
          
          <div className="action-buttons">
            <button onClick={saveRecording} className="btn-save">
              💾 Salva Nota
            </button>
            <button onClick={discardRecording} className="btn-discard">
              🗑️ Scarta
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .audio-recorder {
          padding: 1.5rem;
          background: #f5f5f5;
          border-radius: 12px;
          margin: 1rem 0;
        }

        .recorder-display {
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .duration {
          font-size: 3rem;
          font-weight: bold;
          color: #333;
          font-variant-numeric: tabular-nums;
        }

        .recording-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 0.5rem;
          color: #d32f2f;
          font-weight: 600;
        }

        .pulse {
          width: 12px;
          height: 12px;
          background: #d32f2f;
          border-radius: 50%;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .btn-record {
          width: 100%;
          padding: 1.2rem;
          font-size: 1.1rem;
          font-weight: 600;
          background: #2196f3;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }

        .btn-record:active {
          transform: scale(0.98);
        }

        .recording-controls {
          display: flex;
          gap: 1rem;
        }

        .recording-controls button {
          flex: 1;
          padding: 1rem;
          font-size: 1rem;
          border: none;
          border-radius: 8px;
          background: #666;
          color: white;
          cursor: pointer;
        }

        .action-buttons {
          display: flex;
          gap: 1rem;
        }

        .action-buttons button {
          flex: 1;
          padding: 1rem;
          font-size: 1rem;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        }

        .btn-save {
          background: #4caf50;
          color: white;
        }

        .btn-discard {
          background: #f44336;
          color: white;
        }

        .examples-box {
          background: #fff;
          border: 2px dashed #2196f3;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1.5rem;
        }

        .examples-box h4 {
          margin: 0 0 1rem 0;
          color: #2196f3;
          font-size: 1rem;
        }

        .example-item {
          margin-bottom: 1rem;
          padding: 0.75rem;
          background: #f8f9fa;
          border-radius: 6px;
          border-left: 3px solid #2196f3;
        }

        .example-item:last-child {
          margin-bottom: 0;
        }

        .example-item strong {
          display: block;
          color: #333;
          margin-bottom: 0.25rem;
          font-size: 0.9rem;
        }

        .example-item p {
          margin: 0;
          color: #666;
          font-size: 0.85rem;
          font-style: italic;
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
}
