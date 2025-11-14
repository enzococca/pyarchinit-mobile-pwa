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

const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Verifica connessione internet
 */
export function isOnline() {
  return navigator.onLine;
}

/**
 * Sincronizza tutti i dati pending
 */
export async function syncAll(onProgress) {
  if (!isOnline()) {
    throw new Error('Nessuna connessione internet');
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
      console.error(`Errore sync item ${item.id}:`, error);
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
 * Sincronizza singola nota audio
 */
async function syncAudioNote(queueItem) {
  const note = await getAudioNote(queueItem.localId);
  
  // Prepara FormData
  const formData = new FormData();
  
  // Converti audio da base64 a Blob
  const audioBlob = base64ToBlob(note.audioBlob);
  formData.append('file', audioBlob, note.filename || 'audio.webm');
  
  formData.append('sito', note.sito);
  if (note.recordedBy) formData.append('recorded_by', note.recordedBy);
  if (note.gpsLat) formData.append('gps_lat', note.gpsLat);
  if (note.gpsLon) formData.append('gps_lon', note.gpsLon);

  // Upload
  const response = await axios.post(`${API_BASE}/notes/upload-audio`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

  const serverNoteId = response.data.note_id;

  // Avvia processing
  const processResponse = await axios.post(`${API_BASE}/notes/${serverNoteId}/process`);

  // Estrai trascrizione e interpretazione dal processing
  const transcription = processResponse.data.transcription?.text;
  const interpretation = processResponse.data.interpretation;

  // Serializza interpretation in modo sicuro (evita circular references)
  console.log('[syncService] FIXED VERSION v3.0 - Safe serialization for interpretation');
  let interpretationStr = null;
  if (interpretation) {
    try {
      // Prova prima con JSON.stringify normale
      interpretationStr = JSON.stringify(interpretation);
    } catch (e) {
      // Se fallisce per circular refs, estrai solo i valori primitivi
      console.warn('[syncService] Circular reference in interpretation, using safe serialization');
      const safeInterpretation = {};
      for (const [key, value] of Object.entries(interpretation)) {
        if (value !== null && value !== undefined) {
          if (typeof value === 'object' && !Array.isArray(value)) {
            // Converti oggetti complessi in stringhe
            safeInterpretation[key] = String(value);
          } else if (Array.isArray(value)) {
            // Mantieni array ma converti elementi complessi
            safeInterpretation[key] = value.map(v =>
              typeof v === 'object' ? String(v) : v
            );
          } else {
            // Mantieni valori primitivi
            safeInterpretation[key] = value;
          }
        }
      }
      interpretationStr = JSON.stringify(safeInterpretation);
    }
  }

  // Aggiorna record locale con trascrizione e interpretazione
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
 * Sincronizza singola immagine
 */
async function syncImage(queueItem) {
  const imageData = queueItem.data;
  
  // Prepara FormData
  const formData = new FormData();
  
  // Converti immagine da base64 a Blob
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
      'Content-Type': 'multipart/form-data'
    }
  });

  return response.data;
}

/**
 * Sincronizza singolo item manualmente
 */
export async function syncItem(queueItemId) {
  const queue = await getSyncQueue();
  const item = queue.find(i => i.id === queueItemId);
  
  if (!item) {
    throw new Error('Item non trovato in queue');
  }

  if (item.type === 'audio_note') {
    await syncAudioNote(item);
  } else if (item.type === 'image') {
    await syncImage(item);
  }

  await removeSyncItem(item.id);
}

/**
 * Setup auto-sync quando torna online
 */
export function setupAutoSync(onSyncComplete) {
  window.addEventListener('online', async () => {
    console.log('Connessione ripristinata, avvio sincronizzazione...');
    
    try {
      const result = await syncAll((progress) => {
        console.log(`Sync: ${progress.completed}/${progress.total}`);
      });
      
      if (onSyncComplete) {
        onSyncComplete(result);
      }
    } catch (error) {
      console.error('Errore auto-sync:', error);
    }
  });
}

/**
 * Fetch con fallback offline
 */
export async function fetchWithOffline(url, options = {}) {
  if (!isOnline()) {
    throw new Error('Offline - dati non disponibili');
  }

  try {
    const response = await axios(url, options);
    return response.data;
  } catch (error) {
    if (error.code === 'ERR_NETWORK') {
      throw new Error('Errore di rete');
    }
    throw error;
  }
}

/**
 * Ottieni statistiche sync
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
 * Recupera note processate dal server e aggiorna database locale
 */
export async function refreshProcessedNotes() {
  if (!isOnline()) {
    throw new Error('Nessuna connessione internet');
  }

  try {
    // Ottieni lista note dal server
    const response = await axios.get(`${API_BASE}/notes`);

    // Verifica che serverNotes sia un array valido
    const serverNotes = response.data?.notes || response.data || [];
    if (!Array.isArray(serverNotes)) {
      console.warn('Server notes is not an array:', typeof serverNotes);
      return { updated: 0, total: 0 };
    }

    let updated = 0;

    // Per ogni nota con serverNoteId, recupera i dettagli dal server
    const localNotes = await getAllAudioNotes();

    for (const localNote of localNotes) {
      if (localNote.serverNoteId) {
        // Trova la nota corrispondente dal server
        const serverNote = serverNotes.find(n => n.id === localNote.serverNoteId);

        if (serverNote && serverNote.status === 'processed' && serverNote.transcription) {
          // Aggiorna la nota locale con i dati del server
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
    // Estrai solo le proprietà sicure dall'errore
    const safeError = {
      message: error.message || 'Unknown error',
      status: error.response?.status,
      statusText: error.response?.statusText
    };
    console.error('Errore refresh note:', safeError);
    throw new Error(safeError.message);
  }
}
