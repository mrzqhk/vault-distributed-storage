/**
 * Vault API Client Service
 * Configured via VITE_API_BASE_URL environment variable
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

/**
 * Normalizes URL and ensures trailing slash consistency
 */
export function getEndpointUrl(path) {
  const normalizedBase = API_BASE_URL.replace(/\/+$/, '');
  const cleanPath = path.replace(/^\/+/, '');
  
  if (normalizedBase.endsWith('/api') && cleanPath.startsWith('api/')) {
    return `${normalizedBase.slice(0, -4)}/${cleanPath}`;
  }
  
  return `${normalizedBase}/${cleanPath}`;
}

/**
 * In-memory live event log subscriber for the event stream
 */
const eventListeners = new Set();

export function subscribeToEvents(callback) {
  eventListeners.add(callback);
  return () => eventListeners.delete(callback);
}

export function emitEvent(event) {
  const payload = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toTimeString().split(' ')[0],
    ...event
  };
  eventListeners.forEach((cb) => {
    try {
      cb(payload);
    } catch (e) {
      console.error('Error in event subscriber:', e);
    }
  });
  return payload;
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
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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

/**
 * Fetch list of objects from store
 * Calls GET /api/v1/objects
 */
export async function fetchObjects() {
  try {
    const url = getEndpointUrl('v1/objects');
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      objects: Array.isArray(data) ? data : data.objects || [],
      total: data.total ?? (Array.isArray(data) ? data.length : (data.objects?.length || 0))
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      objects: []
    };
  }
}

/**
 * Fetch storage nodes status
 * Calls GET /api/v1/nodes
 */
export async function fetchNodes() {
  try {
    const url = getEndpointUrl('v1/nodes');
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      nodes: data.nodes || [],
      healthy_count: data.healthy_count ?? (data.nodes ? data.nodes.filter(n => n.healthy).length : 0)
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      nodes: []
    };
  }
}

/**
 * Upload an object to Vault
 * Calls POST /api/v1/objects
 */
export async function uploadObject(formData) {
  try {
    const url = getEndpointUrl('v1/objects');
    const response = await fetch(url, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => null);
      throw new Error(errJson?.error?.message || `HTTP ${response.status}: Upload failed`);
    }

    const data = await response.json();
    emitEvent({
      type: 'OBJECT WRITE',
      target: data.key || 'uploaded-file',
      detail: `${data.replication_factor || 3} replicas committed`
    });
    if (data.checksum_sha256) {
      emitEvent({
        type: 'CHECKSUM',
        target: 'SHA-256',
        detail: `${data.checksum_sha256.substring(0, 16)}... verified`
      });
    }

    return {
      success: true,
      data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Delete an object from Vault
 * Calls DELETE /api/v1/objects/:id
 */
export async function deleteObject(objectId, objectKey = '') {
  try {
    const url = getEndpointUrl(`v1/objects/${encodeURIComponent(objectId)}`);
    const response = await fetch(url, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Delete failed`);
    }

    emitEvent({
      type: 'OBJECT PURGE',
      target: objectKey || objectId,
      detail: 'Replicas removed from cluster'
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Compute SHA-256 in browser for integrity verification demonstration
 */
export async function calculateSha256(text) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return '';
  }
}

export { API_BASE_URL };
