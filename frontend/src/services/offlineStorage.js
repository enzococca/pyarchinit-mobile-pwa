import { openDB } from 'idb';

const DB_NAME = 'pyarchinit-mobile';
const DB_VERSION = 1;

// Store names
const STORES = {
  AUDIO_NOTES: 'audioNotes',
  IMAGES: 'images',
  SYNC_QUEUE: 'syncQueue',
  SETTINGS: 'settings'
};

/**
 * Inizializza database IndexedDB
 */
export async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Store note audio
      if (!db.objectStoreNames.contains(STORES.AUDIO_NOTES)) {
        const audioStore = db.createObjectStore(STORES.AUDIO_NOTES, {
          keyPath: 'id',
          autoIncrement: true
        });
        audioStore.createIndex('status', 'status');
        audioStore.createIndex('sito', 'sito');
        audioStore.createIndex('createdAt', 'createdAt');
      }

      // Store immagini
      if (!db.objectStoreNames.contains(STORES.IMAGES)) {
        const imageStore = db.createObjectStore(STORES.IMAGES, {
          keyPath: 'id',
          autoIncrement: true
        });
        imageStore.createIndex('entityType', 'entityType');
        imageStore.createIndex('entityId', 'entityId');
        imageStore.createIndex('synced', 'synced');
      }

      // Queue sincronizzazione
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, {
          keyPath: 'id',
          autoIncrement: true
        });
        syncStore.createIndex('type', 'type');
        syncStore.createIndex('priority', 'priority');
      }

      // Settings
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS);
      }
    }
  });
}

/**
 * Salva nota audio in locale
 */
export async function saveAudioNoteOffline(note) {
  const db = await initDB();
  const noteData = {
    ...note,
    status: 'offline',
    synced: false,
    createdAt: new Date().toISOString()
  };
  
  const id = await db.add(STORES.AUDIO_NOTES, noteData);
  
  // Aggiungi a queue sync
  await addToSyncQueue({
    type: 'audio_note',
    localId: id,
    data: noteData,
    priority: 1
  });
  
  return id;
}

/**
 * Salva immagine in locale
 */
export async function saveImageOffline(imageData, blob) {
  const db = await initDB();
  
  // Converti blob a base64 per storage
  const base64 = await blobToBase64(blob);
  
  const data = {
    ...imageData,
    imageBlob: base64,
    synced: false,
    createdAt: new Date().toISOString()
  };
  
  const id = await db.add(STORES.IMAGES, data);
  
  // Aggiungi a queue sync
  await addToSyncQueue({
    type: 'image',
    localId: id,
    data: data,
    priority: 2
  });
  
  return id;
}

/**
 * Aggiungi item a queue sincronizzazione
 */
export async function addToSyncQueue(item) {
  const db = await initDB();
  return db.add(STORES.SYNC_QUEUE, {
    ...item,
    addedAt: new Date().toISOString(),
    attempts: 0
  });
}

/**
 * Ottieni queue sincronizzazione
 */
export async function getSyncQueue() {
  const db = await initDB();
  const tx = db.transaction(STORES.SYNC_QUEUE, 'readonly');
  const index = tx.store.index('priority');
  return index.getAll();
}

/**
 * Rimuovi item da queue dopo sync
 */
export async function removeSyncItem(id) {
  const db = await initDB();
  return db.delete(STORES.SYNC_QUEUE, id);
}

/**
 * Ottieni tutte le note audio
 */
export async function getAllAudioNotes() {
  const db = await initDB();
  return db.getAll(STORES.AUDIO_NOTES);
}

/**
 * Ottieni nota audio specifica
 */
export async function getAudioNote(id) {
  const db = await initDB();
  return db.get(STORES.AUDIO_NOTES, id);
}

/**
 * Aggiorna nota audio
 */
export async function updateAudioNote(id, updates) {
  const db = await initDB();
  const note = await db.get(STORES.AUDIO_NOTES, id);
  if (!note) throw new Error('Nota non trovata');

  const updated = { ...note, ...updates };
  await db.put(STORES.AUDIO_NOTES, updated);
  return updated;
}

/**
 * Elimina nota audio singola
 */
export async function deleteAudioNote(id) {
  const db = await initDB();
  // Rimuovi anche dalla sync queue se presente
  const queue = await getSyncQueue();
  const queueItem = queue.find(item => item.type === 'audio_note' && item.localId === id);
  if (queueItem) {
    await db.delete(STORES.SYNC_QUEUE, queueItem.id);
  }
  return db.delete(STORES.AUDIO_NOTES, id);
}

/**
 * Elimina note audio multiple
 */
export async function deleteAudioNotes(ids) {
  const db = await initDB();
  const results = [];
  for (const id of ids) {
    try {
      // Rimuovi anche dalla sync queue se presente
      const queue = await getSyncQueue();
      const queueItem = queue.find(item => item.type === 'audio_note' && item.localId === id);
      if (queueItem) {
        await db.delete(STORES.SYNC_QUEUE, queueItem.id);
      }
      await db.delete(STORES.AUDIO_NOTES, id);
      results.push({ id, success: true });
    } catch (error) {
      results.push({ id, success: false, error: error.message });
    }
  }
  return results;
}

/**
 * Ottieni tutte le immagini
 */
export async function getAllImages() {
  const db = await initDB();
  return db.getAll(STORES.IMAGES);
}

/**
 * Ottieni immagini per entità
 */
export async function getImagesByEntity(entityType, entityId) {
  const db = await initDB();
  const tx = db.transaction(STORES.IMAGES, 'readonly');
  const index = tx.store.index('entityType');
  const all = await index.getAll(entityType);
  return all.filter(img => img.entityId === entityId);
}

/**
 * Salva/recupera settings
 */
export async function saveSetting(key, value) {
  const db = await initDB();
  await db.put(STORES.SETTINGS, value, key);
}

export async function getSetting(key) {
  const db = await initDB();
  return db.get(STORES.SETTINGS, key);
}

/**
 * Utility: blob to base64
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Utility: base64 to blob
 */
export function base64ToBlob(base64) {
  const parts = base64.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
}

/**
 * Conta items non sincronizzati
 */
export async function getUnsyncedCount() {
  const queue = await getSyncQueue();
  return queue.length;
}

/**
 * Pulisci dati vecchi (>30 giorni e sincronizzati)
 */
export async function cleanupOldData() {
  const db = await initDB();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  // Pulisci note audio
  const notes = await db.getAll(STORES.AUDIO_NOTES);
  for (const note of notes) {
    if (note.synced && new Date(note.createdAt) < thirtyDaysAgo) {
      await db.delete(STORES.AUDIO_NOTES, note.id);
    }
  }
  
  // Pulisci immagini
  const images = await db.getAll(STORES.IMAGES);
  for (const img of images) {
    if (img.synced && new Date(img.createdAt) < thirtyDaysAgo) {
      await db.delete(STORES.IMAGES, img.id);
    }
  }
}
