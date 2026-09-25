/**
 * Vault API Client Service
 * Configured via VITE_API_BASE_URL environment variable
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

/**
 * Normalizes URL and ensures trailing slash consistency
 */
function getEndpointUrl(path) {
  const normalizedBase = API_BASE_URL.replace(/\/+$/, '');
  const cleanPath = path.replace(/^\/+/, '');
  
  // If base already contains /api and path starts with api/, avoid duplication
  if (normalizedBase.endsWith('/api') && cleanPath.startsWith('api/')) {
    return `${normalizedBase.slice(0, -4)}/${cleanPath}`;
  }
  
  // If base doesn't end with /api and path doesn't start with api/, append cleanly
  return `${normalizedBase}/${cleanPath}`;
}

/**
 * Check backend health status
 * Calls GET /api/health
 */
export async function checkBackendHealth() {
  try {
    const url = getEndpointUrl('health');
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      success: true,
      data,
      url
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Failed to connect to backend',
      url: getEndpointUrl('health')
    };
  }
}

export { API_BASE_URL };
