import React, { useState, useRef, useEffect } from 'react';
import { X, Square, Save, Trash2, Edit3, Plus } from 'lucide-react';

/**
 * ImageAnnotator - Tropy-style image annotation component
 *
 * Allows users to:
 * - Draw rectangular selections on images
 * - Add notes to selections
 * - View, edit, and delete annotations
 * - Works with touch and mouse events for mobile support
 */
export default function ImageAnnotator({ mediaId, imageSrc, onClose }) {
  const [annotations, setAnnotations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState(null);
  const [currentRect, setCurrentRect] = useState(null);
  const [drawMode, setDrawMode] = useState(false);

  // Selected annotation state
  const [selectedAnnotation, setSelectedAnnotation] = useState(null);
  const [editingNote, setEditingNote] = useState('');
  const [showNoteDialog, setShowNoteDialog] = useState(false);

  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);

  // Load existing annotations
  useEffect(() => {
    if (mediaId) {
      loadAnnotations();
    }
  }, [mediaId]);

  // Redraw canvas when annotations change
  useEffect(() => {
    redrawCanvas();
  }, [annotations, currentRect]);

  const loadAnnotations = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/annotations/media/${mediaId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAnnotations(data);
      }
    } catch (err) {
      console.error('Error loading annotations:', err);
      setError('Errore nel caricamento delle annotazioni');
    }
  };

  const saveAnnotation = async (rect, note) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');

      // Get image dimensions for normalization
      const img = imageRef.current;
      const normalizedRect = {
        media_id: mediaId,
        x: rect.x / img.width,
        y: rect.y / img.height,
        width: rect.width / img.width,
        height: rect.height / img.height,
        note: note || '',
        color: '#ff0000'
      };

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/annotations/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(normalizedRect)
        }
      );

      if (response.ok) {
        await loadAnnotations();
        setCurrentRect(null);
        setDrawMode(false);
        setShowNoteDialog(false);
        setEditingNote('');
      } else {
        throw new Error('Errore nel salvataggio');
      }
    } catch (err) {
      console.error('Error saving annotation:', err);
      setError('Errore nel salvataggio dell\'annotazione');
    } finally {
      setLoading(false);
    }
  };

  const deleteAnnotation = async (annotationId) => {
    if (!confirm('Eliminare questa annotazione?')) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/annotations/${annotationId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.ok) {
        await loadAnnotations();
        setSelectedAnnotation(null);
      }
    } catch (err) {
      console.error('Error deleting annotation:', err);
      setError('Errore nell\'eliminazione dell\'annotazione');
    }
  };

  const updateAnnotationNote = async (annotationId, note) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/annotations/${annotationId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ note })
        }
      );

      if (response.ok) {
        await loadAnnotations();
        setSelectedAnnotation(null);
        setEditingNote('');
      }
    } catch (err) {
      console.error('Error updating annotation:', err);
      setError('Errore nell\'aggiornamento della nota');
    }
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw existing annotations
    annotations.forEach(annotation => {
      const x = annotation.x * img.width;
      const y = annotation.y * img.height;
      const width = annotation.width * img.width;
      const height = annotation.height * img.height;

      ctx.strokeStyle = annotation.color || '#ff0000';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);

      // Highlight selected annotation
      if (selectedAnnotation && selectedAnnotation.id === annotation.id) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
        ctx.fillRect(x, y, width, height);
      }
    });

    // Draw current rectangle being drawn
    if (currentRect) {
      ctx.strokeStyle = '#0066ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
      ctx.setLineDash([]);
    }
  };

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    let clientX, clientY;
    if (e.type.startsWith('touch')) {
      clientX = e.touches[0]?.clientX || e.changedTouches[0]?.clientX;
      clientY = e.touches[0]?.clientY || e.changedTouches[0]?.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const handleStart = (e) => {
    if (!drawMode) return;

    e.preventDefault();
    const pos = getCoordinates(e);
    setStartPos(pos);
    setIsDrawing(true);
  };

  const handleMove = (e) => {
    if (!isDrawing || !startPos) return;

    e.preventDefault();
    const pos = getCoordinates(e);

    const rect = {
      x: Math.min(startPos.x, pos.x),
      y: Math.min(startPos.y, pos.y),
      width: Math.abs(pos.x - startPos.x),
      height: Math.abs(pos.y - startPos.y)
    };

    setCurrentRect(rect);
  };

  const handleEnd = (e) => {
    if (!isDrawing || !currentRect) return;

    e.preventDefault();
    setIsDrawing(false);
    setStartPos(null);

    // Only save if rectangle is large enough (min 10x10 pixels)
    if (currentRect.width > 10 && currentRect.height > 10) {
      setShowNoteDialog(true);
    } else {
      setCurrentRect(null);
    }
  };

  const handleCanvasClick = (e) => {
    if (drawMode) return;

    const pos = getCoordinates(e);
    const img = imageRef.current;

    // Check if click is inside any annotation
    const clicked = annotations.find(annotation => {
      const x = annotation.x * img.width;
      const y = annotation.y * img.height;
      const width = annotation.width * img.width;
      const height = annotation.height * img.height;

      return pos.x >= x && pos.x <= x + width && pos.y >= y && pos.y <= y + height;
    });

    setSelectedAnnotation(clicked || null);
  };

  const handleImageLoad = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;

    if (canvas && img) {
      canvas.width = img.width;
      canvas.height = img.height;
      redrawCanvas();
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
      background: 'rgba(0,0,0,0.9)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '16px',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
          Annotazioni Immagine
        </h2>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: 'white',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Toolbar */}
      <div style={{
        background: '#2d3748',
        padding: '12px 16px',
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setDrawMode(!drawMode)}
          style={{
            background: drawMode ? '#667eea' : '#4a5568',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: '500'
          }}
        >
          {drawMode ? <Square size={18} /> : <Plus size={18} />}
          {drawMode ? 'Disegna (attivo)' : 'Nuova annotazione'}
        </button>

        <div style={{ color: '#a0aec0', fontSize: '14px' }}>
          {drawMode ? 'Trascina per disegnare un rettangolo' : 'Clicca su un\'annotazione per modificarla'}
        </div>

        <div style={{ marginLeft: 'auto', color: '#a0aec0', fontSize: '14px' }}>
          {annotations.length} {annotations.length === 1 ? 'annotazione' : 'annotazioni'}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div style={{
          background: '#fed7d7',
          color: '#742a2a',
          padding: '12px 16px',
          borderLeft: '4px solid #f56565'
        }}>
          {error}
        </div>
      )}

      {/* Image viewer with canvas overlay */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
      >
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img
            ref={imageRef}
            src={imageSrc}
            alt="Annotated image"
            onLoad={handleImageLoad}
            style={{
              maxWidth: '100%',
              maxHeight: 'calc(100vh - 200px)',
              display: 'block'
            }}
          />
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              cursor: drawMode ? 'crosshair' : 'pointer',
              touchAction: 'none'
            }}
          />
        </div>
      </div>

      {/* Selected annotation info panel */}
      {selectedAnnotation && !drawMode && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          background: 'white',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          maxWidth: '300px',
          zIndex: 1001
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '12px'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#2d3748' }}>
              Annotazione
            </h3>
            <button
              onClick={() => deleteAnnotation(selectedAnnotation.id)}
              style={{
                background: 'none',
                border: 'none',
                color: '#e53e3e',
                cursor: 'pointer',
                padding: 0
              }}
              title="Elimina"
            >
              <Trash2 size={18} />
            </button>
          </div>

          <p style={{
            margin: 0,
            fontSize: '14px',
            color: '#4a5568',
            lineHeight: '1.5'
          }}>
            {selectedAnnotation.note || 'Nessuna nota'}
          </p>

          <button
            onClick={() => {
              setEditingNote(selectedAnnotation.note || '');
              setShowNoteDialog(true);
            }}
            style={{
              marginTop: '12px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontWeight: '500'
            }}
          >
            <Edit3 size={16} />
            Modifica nota
          </button>
        </div>
      )}

      {/* Note dialog */}
      {showNoteDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1002,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '100%'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
              {selectedAnnotation ? 'Modifica nota' : 'Aggiungi nota'}
            </h3>

            <textarea
              value={editingNote}
              onChange={(e) => setEditingNote(e.target.value)}
              placeholder="Inserisci una nota per questa annotazione..."
              autoFocus
              style={{
                width: '100%',
                minHeight: '120px',
                padding: '12px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '15px',
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />

            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '16px'
            }}>
              <button
                onClick={() => {
                  if (selectedAnnotation) {
                    updateAnnotationNote(selectedAnnotation.id, editingNote);
                  } else {
                    saveAnnotation(currentRect, editingNote);
                  }
                }}
                disabled={loading}
                style={{
                  flex: 1,
                  background: loading ? '#cbd5e0' : '#667eea',
                  color: 'white',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Save size={18} />
                {loading ? 'Salvataggio...' : 'Salva'}
              </button>

              <button
                onClick={() => {
                  setShowNoteDialog(false);
                  setEditingNote('');
                  setCurrentRect(null);
                  setSelectedAnnotation(null);
                }}
                style={{
                  flex: 1,
                  background: '#e2e8f0',
                  color: '#4a5568',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
