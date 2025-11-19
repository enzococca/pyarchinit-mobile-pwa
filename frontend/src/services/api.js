/**
 * API Service - Axios instance con configurazione centralizzata
 *
 * Features:
 * - Base URL configurabile via environment
 * - Interceptor per aggiungere JWT token automaticamente
 * - Gestione errori centralizzata
 * - Support per X-Project-ID header (gestito da ProjectContext)
 */
import axios from 'axios';
import { API_BASE } from '../config/api';

// Crea istanza axios con base URL
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - Aggiunge JWT token
api.interceptors.request.use(
  (config) => {
    // Ottieni token da localStorage
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // X-Project-ID è gestito da ProjectContext
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Gestione errori centralizzata
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Gestisci errori comuni
    if (error.response) {
      const { status } = error.response;

      if (status === 401) {
        // Token non valido o scaduto - redirect a login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } else if (status === 403) {
        // Accesso negato
        console.error('Access denied:', error.response.data);
      } else if (status === 404) {
        // Risorsa non trovata
        console.error('Resource not found:', error.response.data);
      } else if (status >= 500) {
        // Errore server
        console.error('Server error:', error.response.data);
      }
    } else if (error.request) {
      // Richiesta inviata ma nessuna risposta
      console.error('No response from server:', error.request);
    } else {
      // Errore durante setup richiesta
      console.error('Request setup error:', error.message);
    }

    return Promise.reject(error);
  }
);

export default api;
