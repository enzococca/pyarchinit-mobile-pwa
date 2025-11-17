import React, { useState } from 'react';
import PhotoCapture from './PhotoCapture';
import VideoRecorder from './VideoRecorder';
import Scan3DCapture from './Scan3DCapture';
import MediaGallery from './MediaGallery';
import { Camera, Video, Box, Images } from 'lucide-react';

/**
 * MediaCapture - Main component for capturing and managing media
 * Supports: Photos, Videos, 3D scans (LiDAR)
 */
export default function MediaCapture() {
  const [activeTab, setActiveTab] = useState('photo'); // 'photo' | 'video' | '3d' | 'gallery'
  const [refreshGallery, setRefreshGallery] = useState(0);

  const handleMediaCaptured = () => {
    // Trigger gallery refresh
    setRefreshGallery(prev => prev + 1);
  };

  const tabs = [
    { id: 'photo', label: 'Foto', icon: Camera },
    { id: 'video', label: 'Video', icon: Video },
    { id: '3d', label: 'Scansione 3D', icon: Box },
    { id: 'gallery', label: 'Galleria', icon: Images }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8f9fa'
    }}>
      {/* Header */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #e0e0e0',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '16px 20px'
        }}>
          <h1 style={{
            fontSize: '22px',
            fontWeight: '700',
            color: '#1a202c',
            marginBottom: '4px'
          }}>
            Cattura Media
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#718096'
          }}>
            Documenta reperti, US e contesti archeologici
          </p>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          borderTop: '1px solid #e0e0e0',
          background: 'white',
          overflowX: 'auto'
        }}>
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                flex: 1,
                minWidth: '100px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '14px 16px',
                fontWeight: '600',
                fontSize: '14px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: activeTab === id ? '#edf2ff' : 'white',
                color: activeTab === id ? '#667eea' : '#718096',
                borderBottom: activeTab === id ? '3px solid #667eea' : '3px solid transparent'
              }}
            >
              <Icon size={20} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '20px'
      }}>
        {activeTab === 'photo' && (
          <PhotoCapture onCaptureComplete={handleMediaCaptured} />
        )}
        {activeTab === 'video' && (
          <VideoRecorder onRecordingComplete={handleMediaCaptured} />
        )}
        {activeTab === '3d' && (
          <Scan3DCapture onScanComplete={handleMediaCaptured} />
        )}
        {activeTab === 'gallery' && (
          <MediaGallery key={refreshGallery} />
        )}
      </div>
    </div>
  );
}
