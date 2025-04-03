// API configuration
const API_URL = "/api";

// Make API_URL available globally instead of using export
window.API_URL = API_URL;

// Log the API URL for debugging
console.log("API URL configured as:", API_URL);

// Default fetch options to apply credentials
const defaultFetchOptions = {
  credentials: "include", // Always include credentials
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json"
  }
};

// In-memory fallback storage when sessionStorage is not available
const memoryStorage = {};

// Enhanced safe storage access function to handle storage access restrictions
function safeStorageGet(key, storage = sessionStorage) {
  try {
    // First try to access the specified storage
    const value = storage.getItem(key);
    if (value !== null) {
      return value;
    }
    
    // If not found in primary storage, check memory fallback
    return memoryStorage[key] || null;
  } catch (error) {
    console.warn(`Storage access error for key ${key}:`, error);
    
    // Fall back to memory storage
    return memoryStorage[key] || null;
  }
}

function safeStorageSet(key, value, storage = sessionStorage) {
  try {
    // Try to set in the specified storage
    storage.setItem(key, value);
    
    // Also store in memory as backup
    memoryStorage[key] = value;
    return true;
  } catch (error) {
    console.warn(`Storage access error for key ${key}:`, error);
    
    // Fall back to memory storage
    memoryStorage[key] = value;
    return false;
  }
}

function safeStorageRemove(key, storage = sessionStorage) {
  try {
    // Try to remove from the specified storage
    storage.removeItem(key);
    
    // Also remove from memory
    delete memoryStorage[key];
    return true;
  } catch (error) {
    console.warn(`Storage access error for key ${key}:`, error);
    
    // Fall back to memory storage
    delete memoryStorage[key];
    return false;
  }
}

function safeStorageClear(storage = sessionStorage) {
  try {
    // Try to clear the specified storage
    storage.clear();
    
    // Also clear memory storage
    Object.keys(memoryStorage).forEach(key => {
      delete memoryStorage[key];
    });
    return true;
  } catch (error) {
    console.warn(`Storage clear error:`, error);
    
    // Fall back to clearing memory storage
    Object.keys(memoryStorage).forEach(key => {
      delete memoryStorage[key];
    });
    return false;
  }
}

// Verify that the backend server is running
(async function() {
  try {
    const healthResponse = await fetch(`${API_URL}/health`, {
      credentials: "include"
    });
    
    if (healthResponse.ok) {
      const data = await healthResponse.json();
      console.log("✅ Backend server is running and reachable");
      console.log("Health check session ID:", data.sessionID);
      console.log("Cookies:", document.cookie);
    } else {
      console.warn("⚠️ Backend server responded but health check failed");
      console.warn("Status:", healthResponse.status);
    }
  } catch (error) {
    console.error("❌ Backend server is not reachable:", error.message);
    console.error("Please make sure the backend server is running at:", API_URL);
    
    // Show a user-friendly error message
    if (document.body) {
      const errorDiv = document.createElement('div');
      errorDiv.style.backgroundColor = '#ffdddd';
      errorDiv.style.padding = '20px';
      errorDiv.style.margin = '20px';
      errorDiv.style.border = '1px solid #ff0000';
      errorDiv.style.borderRadius = '5px';
      errorDiv.innerHTML = `
        <h3>Connection Error</h3>
        <p>Cannot connect to the backend server</p>
        <p>Please make sure the server is running and try again.</p>
      `;
      document.body.prepend(errorDiv);
    }
  }
})();

// Helper function to make authenticated fetch requests
async function fetchWithAuth(url, options = {}) {
  // Combine default options with provided options
  const mergedOptions = {
    ...defaultFetchOptions,
    ...options,
    headers: {
      ...defaultFetchOptions.headers,
      ...(options.headers || {})
    }
  };
  
  try {
    // First attempt using cookies
    const response = await fetch(`${API_URL}${url}`, mergedOptions);
    
    // If unauthorized and we have stored credentials, try with Authorization header
    if (response.status === 401) {
      const userEmail = safeStorageGet('userEmail');
      const userPassword = safeStorageGet('userPassword');
      
      if (userEmail && userPassword) {
        const base64Credentials = btoa(`${userEmail}:${userPassword}`);
        
        console.log("Retrying with Authorization header");
        
        // Retry with Authorization header
        mergedOptions.headers['Authorization'] = `Basic ${base64Credentials}`;
        return fetch(`${API_URL}${url}`, mergedOptions);
      }
    }
    
    return response;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    throw error;
  }
}

