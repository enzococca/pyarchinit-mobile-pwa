import api from './api';
import axios from 'axios';
import {
  getSyncQueue,
  removeSyncItem,
  updateAudioNote,
  base64ToBlob,
  getAudioNote,
  getAllImages,
  getAllAudioNotes
} from './offlineStorage';
import { API_BASE } from '../config/api';

/**
 * Get authorization headers for API requests
 * Includes X-Project-ID from localStorage for project context
 */
function getAuthHeaders() {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('No authentication token found. Please log in again.');
  }

  const headers = {
    'Authorization': `Bearer ${token}`
  };

  // Add X-Project-ID if available (for multi-project support)
  const projectId = localStorage.getItem('currentProjectId');
  if (projectId) {
    headers['X-Project-ID'] = projectId;
  }

  return headers;
}

/**
 * Check internet connection
 */
export function isOnline() {
  return navigator.onLine;
}

/**
 * Sync all pending data
 */
export async function syncAll(onProgress) {
  if (!isOnline()) {
    throw new Error('No internet connection');
  }

  const queue = await getSyncQueue();
  const total = queue.length;
  let completed = 0;
  let errors = [];

  for (const item of queue) {
    try {
      if (item.type === 'audio_note') {
        await syncAudioNote(item);
      } else if (item.type === 'image') {
        await syncImage(item);
      }

      await removeSyncItem(item.id);
      completed++;
      
      if (onProgress) {
        onProgress({
          total,
          completed,
          current: item
        });
      }

    } catch (error) {
      console.error(`Error syncing item ${item.id}:`, error);
      errors.push({
        item,
        error: error.message
      });
    }
  }

  return {
    total,
    completed,
    errors
  };
}

/**
 * Sync single audio note
 */
async function syncAudioNote(queueItem) {
  const note = await getAudioNote(queueItem.localId);

  // Verify project ID is available
  const projectId = localStorage.getItem('currentProjectId');
  if (!projectId) {
    throw new Error('No project selected. Please select a project before syncing audio notes.');
  }

  // Prepare FormData
  const formData = new FormData();

  // Convert audio from base64 to Blob
  const audioBlob = base64ToBlob(note.audioBlob);
  formData.append('file', audioBlob, note.filename || 'audio.webm');

  formData.append('sito', note.sito);
  if (note.recordedBy) formData.append('recorded_by', note.recordedBy);
  if (note.gpsLat) formData.append('gps_lat', note.gpsLat);
  if (note.gpsLon) formData.append('gps_lon', note.gpsLon);

  console.log('[syncService] Uploading audio note with project ID:', projectId);

  // Upload
  const response = await axios.post(`${API_BASE}/notes/upload-audio`, formData, {
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'multipart/form-data'
    }
  });

  const serverNoteId = response.data.note_id;

  // Start processing
  const processResponse = await axios.post(`${API_BASE}/notes/${serverNoteId}/process`, {}, {
    headers: getAuthHeaders()
  });

  // Extract transcription and interpretation from processing
  const transcription = processResponse.data.transcription?.text;
  const interpretation = processResponse.data.interpretation;

  // Serialize interpretation safely (avoid circular references)
  console.log('[syncService] FIXED VERSION v3.0 - Safe serialization for interpretation');
  let interpretationStr = null;
  if (interpretation) {
    try {
      // Try with normal JSON.stringify first
      interpretationStr = JSON.stringify(interpretation);
    } catch (e) {
      // If it fails due to circular refs, extract only primitive values
      console.warn('[syncService] Circular reference in interpretation, using safe serialization');
      const safeInterpretation = {};
      for (const [key, value] of Object.entries(interpretation)) {
        if (value !== null && value !== undefined) {
          if (typeof value === 'object' && !Array.isArray(value)) {
            // Convert complex objects to strings
            safeInterpretation[key] = String(value);
          } else if (Array.isArray(value)) {
            // Keep arrays but convert complex elements
            safeInterpretation[key] = value.map(v =>
              typeof v === 'object' ? String(v) : v
            );
          } else {
            // Keep primitive values
            safeInterpretation[key] = value;
          }
        }
      }
      interpretationStr = JSON.stringify(safeInterpretation);
    }
  }

  // Update local record with transcription and interpretation
  await updateAudioNote(queueItem.localId, {
    synced: true,
    serverNoteId,
    syncedAt: new Date().toISOString(),
    transcription: transcription || null,
    interpretation: interpretationStr,
    status: processResponse.data.status === 'success' ? 'processed' : 'error'
  });

  return response.data;
}

/**
 * Sync single image
 */
async function syncImage(queueItem) {
  const imageData = queueItem.data;

  // Prepare FormData
  const formData = new FormData();

  // Convert image from base64 to Blob
  const imageBlob = base64ToBlob(imageData.imageBlob);
  formData.append('file', imageBlob, imageData.filename || 'image.jpg');
  
  formData.append('entity_type', imageData.entityType);
  formData.append('entity_id', imageData.entityId);
  formData.append('sito', imageData.sito);
  
  if (imageData.us) formData.append('us', imageData.us);
  if (imageData.descrizione) formData.append('descrizione', imageData.descrizione);
  if (imageData.photographer) formData.append('photographer', imageData.photographer);
  if (imageData.tags) formData.append('tags', imageData.tags);

  // Upload
  const response = await axios.post(`${API_BASE}/media/upload-image`, formData, {
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'multipart/form-data'
    }
  });

  return response.data;
}

/**
 * Sync single item manually
 */
export async function syncItem(queueItemId) {
  const queue = await getSyncQueue();
  const item = queue.find(i => i.id === queueItemId);

  if (!item) {
    throw new Error('Item not found in queue');
  }

  if (item.type === 'audio_note') {
    await syncAudioNote(item);
  } else if (item.type === 'image') {
    await syncImage(item);
  }

  await removeSyncItem(item.id);
}

/**
 * Setup auto-sync when coming back online
 */
export function setupAutoSync(onSyncComplete) {
  window.addEventListener('online', async () => {
    console.log('Connection restored, starting sync...');

    try {
      const result = await syncAll((progress) => {
        console.log(`Sync: ${progress.completed}/${progress.total}`);
      });

      if (onSyncComplete) {
        onSyncComplete(result);
      }
    } catch (error) {
      console.error('Auto-sync error:', error);
    }
  });
}

/**
 * Fetch with offline fallback
 */
export async function fetchWithOffline(url, options = {}) {
  if (!isOnline()) {
    throw new Error('Offline - data not available');
  }

  try {
    // Merge auth headers with any provided headers
    const headers = {
      ...getAuthHeaders(),
      ...(options.headers || {})
    };

    const response = await axios(url, { ...options, headers });
    return response.data;
  } catch (error) {
    if (error.code === 'ERR_NETWORK') {
      throw new Error('Network error');
    }
    throw error;
  }
}

/**
 * Get sync statistics
 */
export async function getSyncStats() {
  const queue = await getSyncQueue();

  const stats = {
    total: queue.length,
    byType: {
      audio_notes: 0,
      images: 0
    },
    oldestItem: null,
    newestItem: null
  };

  for (const item of queue) {
    if (item.type === 'audio_note') stats.byType.audio_notes++;
    if (item.type === 'image') stats.byType.images++;
  }

  if (queue.length > 0) {
    const sorted = [...queue].sort((a, b) =>
      new Date(a.addedAt) - new Date(b.addedAt)
    );
    stats.oldestItem = sorted[0];
    stats.newestItem = sorted[sorted.length - 1];
  }

  return stats;
}

/**
 * Fetch processed notes from server and update local database
 */
export async function refreshProcessedNotes() {
  if (!isOnline()) {
    throw new Error('No internet connection');
  }

  try {
    // Get notes list from server
    const response = await axios.get(`${API_BASE}/notes`, {
      headers: getAuthHeaders()
    });

    // Verify that serverNotes is a valid array
    const serverNotes = response.data?.notes || response.data || [];
    if (!Array.isArray(serverNotes)) {
      console.warn('Server notes is not an array:', typeof serverNotes);
      return { updated: 0, total: 0 };
    }

    let updated = 0;

    // For each note with serverNoteId, fetch details from server
    const localNotes = await getAllAudioNotes();

    for (const localNote of localNotes) {
      if (localNote.serverNoteId) {
        // Find corresponding note from server
        const serverNote = serverNotes.find(n => n.id === localNote.serverNoteId);

        if (serverNote && serverNote.status === 'processed' && serverNote.transcription) {
          // Update local note with server data
          await updateAudioNote(localNote.id, {
            transcription: serverNote.transcription,
            interpretation: serverNote.ai_interpretation || null,
            status: 'processed'
          });
          updated++;
        }
      }
    }

    return { updated, total: localNotes.length };
  } catch (error) {
    // Extract only safe properties from error
    const safeError = {
      message: error.message || 'Unknown error',
      status: error.response?.status,
      statusText: error.response?.statusText
    };
    console.error('Error refreshing notes:', safeError);
    throw new Error(safeError.message);
  }
}
