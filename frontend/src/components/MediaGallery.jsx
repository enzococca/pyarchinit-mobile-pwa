import React, { useState, useEffect } from 'react';
import { Images, Video, Box, Download, X, Filter, RefreshCw } from 'lucide-react';

/**
 * Media card component with hover states
 */
function MediaCard({ item, onSelect, downloadMedia, getMediaIcon }) {
  const [hoveredCard, setHoveredCard] = useState(false);
  const [hoveredDownload, setHoveredDownload] = useState(false);

  return (
    <div
      onClick={() => onSelect(item)}
      onMouseEnter={() => setHoveredCard(true)}
      onMouseLeave={() => setHoveredCard(false)}
      style={{
        background: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: hoveredCard ? '0 10px 15px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.1)',
        transition: 'all 0.2s',
        cursor: 'pointer'
      }}
    >
      {/* Thumbnail */}
      <div style={{
        aspectRatio: '1',
        background: '#f7fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {item.media_type === 'image' && item.id_media ? (
          <img
            src={`${import.meta.env.VITE_API_URL}/api/media/download/${item.id_media}/thumb`}
            alt={item.filename}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentElement.innerHTML = `<div style="display: flex; flex-direction: column; align-items: center; gap: 8px; color: #cbd5e0;"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg><span style="font-size: 12px;">Immagine non disponibile</span></div>`;
            }}
          />
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            color: '#cbd5e0'
          }}>
            {getMediaIcon(item.media_type)}
            <span style={{
              fontSize: '12px',
              textTransform: 'uppercase'
            }}>
              {item.media_type}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '12px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '8px'
        }}>
          {getMediaIcon(item.media_type)}
          <button
            onClick={(e) => {
              e.stopPropagation();
              downloadMedia(item.id_media);
            }}
            onMouseEnter={() => setHoveredDownload(true)}
            onMouseLeave={() => setHoveredDownload(false)}
            style={{
              color: hoveredDownload ? '#667eea' : '#cbd5e0',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              padding: 0,
              display: 'flex',
              alignItems: 'center'
            }}
            title="Scarica"
          >
            <Download size={16} />
          </button>
        </div>
        <p style={{
          fontSize: '14px',
          fontWeight: '500',
          color: '#1a202c',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          margin: 0
        }}>
          {item.filename}
        </p>
        {item.description && (
          <p style={{
            fontSize: '12px',
            color: '#718096',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginTop: '4px',
            marginBottom: 0
          }}>
            {item.description}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Download buttons component with hover states
 */
function DownloadButtons({ selectedMedia, downloadMedia }) {
  const [hoveredThumb, setHoveredThumb] = useState(false);
  const [hoveredResize, setHoveredResize] = useState(false);
  const [hoveredOriginal, setHoveredOriginal] = useState(false);

  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      {selectedMedia.media_type === 'image' && (
        <>
          <button
            onClick={() => downloadMedia(selectedMedia.id_media, 'thumb')}
            onMouseEnter={() => setHoveredThumb(true)}
            onMouseLeave={() => setHoveredThumb(false)}
            style={{
              flex: 1,
              background: hoveredThumb ? '#e2e8f0' : '#f1f5f9',
              color: '#4a5568',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              fontWeight: '500',
              fontSize: '14px'
            }}
          >
            <Download size={16} />
            Thumb
          </button>
          <button
            onClick={() => downloadMedia(selectedMedia.id_media, 'resize')}
            onMouseEnter={() => setHoveredResize(true)}
            onMouseLeave={() => setHoveredResize(false)}
            style={{
              flex: 1,
              background: hoveredResize ? '#e2e8f0' : '#f1f5f9',
              color: '#4a5568',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              fontWeight: '500',
              fontSize: '14px'
            }}
          >
            <Download size={16} />
            Resize
          </button>
        </>
      )}
      <button
        onClick={() => downloadMedia(selectedMedia.id_media, 'original')}
        onMouseEnter={() => setHoveredOriginal(true)}
        onMouseLeave={() => setHoveredOriginal(false)}
        style={{
          flex: 1,
          background: hoveredOriginal ? '#5568d3' : '#667eea',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '8px',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition: 'all 0.2s',
          fontWeight: '500',
          fontSize: '14px'
        }}
      >
        <Download size={16} />
        Originale
      </button>
    </div>
  );
}

/**
 * MediaGallery - Component for viewing all captured media
 * Shows photos, videos, and 3D models with filtering options
 */
export default function MediaGallery() {
  const [mediaItems, setMediaItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all' | 'image' | 'video' | '3d_model'
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState(null);

  useEffect(() => {
    loadMedia();
  }, []);

  useEffect(() => {
    filterMedia();
  }, [selectedFilter, mediaItems]);

  const loadMedia = async () => {
    setIsLoading(true);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/media/my-media`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setMediaItems(data);
      } else {
        console.error('Failed to load media:', response.statusText);
        setMediaItems([]);
      }

    } catch (error) {
      console.error('Error loading media:', error);
      setMediaItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filterMedia = () => {
    if (selectedFilter === 'all') {
      setFilteredItems(mediaItems);
    } else {
      setFilteredItems(mediaItems.filter(item => item.media_type === selectedFilter));
    }
  };

  const getMediaIcon = (type) => {
    switch (type) {
      case 'image':
        return <Images size={20} style={{ color: '#667eea' }} />;
      case 'video':
        return <Video size={20} style={{ color: '#a855f7' }} />;
      case '3d_model':
        return <Box size={20} style={{ color: '#10b981' }} />;
      default:
        return <Images size={20} style={{ color: '#718096' }} />;
    }
  };

  const downloadMedia = async (mediaId, size = 'original') => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/media/download/${mediaId}/${size}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `media_${mediaId}_${size}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading media:', error);
      alert('Errore durante il download');
    }
  };

  const filters = [
    { id: 'all', label: 'Tutti', icon: Images },
    { id: 'image', label: 'Foto', icon: Images },
    { id: 'video', label: 'Video', icon: Video },
    { id: '3d_model', label: '3D', icon: Box }
  ];

  // Hover states
  const [hoveredRefresh, setHoveredRefresh] = useState(false);
  const [hoveredFilter, setHoveredFilter] = useState(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Filter Bar */}
      <div style={{
        background: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '16px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px'
        }}>
          <h3 style={{
            fontWeight: '500',
            fontSize: '16px',
            color: '#1a202c',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            margin: 0
          }}>
            <Filter size={20} />
            Filtra Media
          </h3>
          <button
            onClick={loadMedia}
            onMouseEnter={() => setHoveredRefresh(true)}
            onMouseLeave={() => setHoveredRefresh(false)}
            style={{
              color: hoveredRefresh ? '#5568d3' : '#667eea',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '14px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <RefreshCw size={16} />
            Ricarica
          </button>
        </div>

        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto'
        }}>
          {filters.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSelectedFilter(id)}
              onMouseEnter={() => setHoveredFilter(id)}
              onMouseLeave={() => setHoveredFilter(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                background: selectedFilter === id ? '#667eea' : (hoveredFilter === id ? '#f7fafc' : '#f1f5f9'),
                color: selectedFilter === id ? 'white' : '#4a5568',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '14px'
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Media Grid */}
      {isLoading ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: '48px',
          paddingBottom: '48px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <RefreshCw size={48} style={{
              margin: '0 auto 16px',
              color: '#667eea',
              animation: 'spin 1s linear infinite'
            }} />
            <p style={{ color: '#718096', margin: 0 }}>Caricamento media...</p>
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div style={{
          background: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          padding: '48px',
          textAlign: 'center'
        }}>
          <Images size={64} style={{ margin: '0 auto 16px', color: '#cbd5e0' }} />
          <h3 style={{
            fontSize: '18px',
            fontWeight: '500',
            color: '#1a202c',
            marginBottom: '8px',
            marginTop: 0
          }}>
            Nessun media trovato
          </h3>
          <p style={{
            color: '#718096',
            marginBottom: '16px',
            marginTop: 0
          }}>
            {selectedFilter === 'all'
              ? 'Inizia a catturare foto, video o scansioni 3D!'
              : `Nessun ${filters.find(f => f.id === selectedFilter)?.label.toLowerCase()} trovato`
            }
          </p>
          <button
            onClick={() => setSelectedFilter('all')}
            onMouseEnter={(e) => e.currentTarget.style.color = '#5568d3'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#667eea'}
            style={{
              color: '#667eea',
              fontSize: '14px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Mostra tutti
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          {filteredItems.map((item) => (
            <MediaCard
              key={item.id_media}
              item={item}
              onSelect={setSelectedMedia}
              downloadMedia={downloadMedia}
              getMediaIcon={getMediaIcon}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedMedia && (
        <div
          onClick={() => setSelectedMedia(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 50
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '12px',
              maxWidth: '672px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '16px',
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{
                fontWeight: '500',
                fontSize: '16px',
                color: '#1a202c',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: 0
              }}>
                {getMediaIcon(selectedMedia.media_type)}
                Dettagli Media
              </h3>
              <button
                onClick={() => setSelectedMedia(null)}
                onMouseEnter={(e) => e.currentTarget.style.color = '#4a5568'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#cbd5e0'}
                style={{
                  color: '#cbd5e0',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div style={{
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              {/* Preview */}
              {selectedMedia.media_type === 'image' && (
                <img
                  src={`${import.meta.env.VITE_API_URL}/api/media/download/${selectedMedia.id_media}/resize`}
                  alt={selectedMedia.filename}
                  style={{
                    width: '100%',
                    borderRadius: '8px'
                  }}
                  onError={(e) => {
                    e.target.src = `${import.meta.env.VITE_API_URL}/api/media/download/${selectedMedia.id_media}/original`;
                  }}
                />
              )}

              {selectedMedia.media_type === 'video' && (
                <video
                  src={selectedMedia.filepath}
                  controls
                  style={{
                    width: '100%',
                    borderRadius: '8px'
                  }}
                />
              )}

              {/* Info */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div>
                  <p style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#4a5568',
                    margin: 0,
                    marginBottom: '4px'
                  }}>
                    Nome File
                  </p>
                  <p style={{
                    fontSize: '14px',
                    color: '#1a202c',
                    margin: 0
                  }}>
                    {selectedMedia.filename}
                  </p>
                </div>

                {selectedMedia.description && (
                  <div>
                    <p style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#4a5568',
                      margin: 0,
                      marginBottom: '4px'
                    }}>
                      Descrizione
                    </p>
                    <p style={{
                      fontSize: '14px',
                      color: '#1a202c',
                      margin: 0
                    }}>
                      {selectedMedia.description}
                    </p>
                  </div>
                )}

                <div>
                  <p style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#4a5568',
                    margin: 0,
                    marginBottom: '4px'
                  }}>
                    Tipo
                  </p>
                  <p style={{
                    fontSize: '14px',
                    color: '#1a202c',
                    textTransform: 'uppercase',
                    margin: 0
                  }}>
                    {selectedMedia.filetype}
                  </p>
                </div>
              </div>

              {/* Download Buttons */}
              <DownloadButtons
                selectedMedia={selectedMedia}
                downloadMedia={downloadMedia}
              />
            </div>
          </div>
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
          <li>Visualizza tutti i media catturati</li>
          <li>Filtra per tipo: Foto, Video o Modelli 3D</li>
          <li>Clicca su un elemento per vedere i dettagli</li>
          <li>Scarica le versioni originali, ridimensionate o thumbnail</li>
        </ul>
      </div>
    </div>
  );
}
