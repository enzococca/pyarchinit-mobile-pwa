/**
 * API Configuration
 * Centralized API base URL with automatic /api suffix
 */

// Get base URL from environment variable or use default
let baseUrl = import.meta.env.VITE_API_URL || '/api';

// Ensure /api suffix is present
if (!baseUrl.endsWith('/api')) {
  baseUrl = baseUrl.replace(/\/$/, '') + '/api'; // Remove trailing slash and add /api
}

export const API_BASE = baseUrl;

// Export for debugging
if (import.meta.env.DEV) {
  console.log('[API Config] Base URL:', API_BASE);
}
