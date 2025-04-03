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
    if (response.status === 401 && sessionStorage.getItem('userEmail') && sessionStorage.getItem('userPassword')) {
      const email = sessionStorage.getItem('userEmail');
      const password = sessionStorage.getItem('userPassword');
      const base64Credentials = btoa(`${email}:${password}`);
      
      console.log("Retrying with Authorization header");
      
      // Retry with Authorization header
      mergedOptions.headers['Authorization'] = `Basic ${base64Credentials}`;
      return fetch(`${API_URL}${url}`, mergedOptions);
    }
    
    return response;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    throw error;
  }
}

// Create a secure storage wrapper to handle restricted storage access
// This will be used instead of directly accessing sessionStorage
window.secureStorage = (function() {
  // In-memory fallback storage when browser storage is not available
  const memoryStorage = {};
  
  // Check if sessionStorage is available
  let storageAvailable = false;
  try {
    const testKey = '__storage_test__';
    sessionStorage.setItem(testKey, testKey);
    sessionStorage.removeItem(testKey);
    storageAvailable = true;
    console.log("SessionStorage is available ✅");
  } catch (e) {
    storageAvailable = false;
    console.warn("SessionStorage is not available ⚠️, using memory fallback");
  }
  
  // Helper function to set a cookie
  function setCookie(name, value, days = 1) {
    try {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      const expires = "; expires=" + date.toUTCString();
      document.cookie = name + "=" + encodeURIComponent(value) + expires + "; path=/; SameSite=Lax";
      return true;
    } catch (e) {
      console.error("Error setting cookie:", e);
      return false;
    }
  }
  
  // Helper function to get a cookie
  function getCookie(name) {
    try {
      const nameEQ = name + "=";
      const ca = document.cookie.split(';');
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) {
          return decodeURIComponent(c.substring(nameEQ.length, c.length));
        }
      }
      return null;
    } catch (e) {
      console.error("Error getting cookie:", e);
      return null;
    }
  }
  
  // Helper function to delete a cookie
  function deleteCookie(name) {
    try {
      document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/';
      return true;
    } catch (e) {
      console.error("Error deleting cookie:", e);
      return false;
    }
  }
  
  return {
    setItem: function(key, value) {
      try {
        if (storageAvailable) {
          sessionStorage.setItem(key, value);
        } else {
          // Try cookie as fallback
          const cookieSuccess = setCookie(key, value);
          if (!cookieSuccess) {
            // Use memory as last resort
            memoryStorage[key] = value;
          }
        }
        return true;
      } catch (e) {
        console.warn(`Failed to store '${key}' in any storage:`, e);
        // Use memory as last resort
        memoryStorage[key] = value;
        return false;
      }
    },
    
    getItem: function(key) {
      try {
        if (storageAvailable) {
          return sessionStorage.getItem(key);
        } else {
          // Try cookie as fallback
          const cookieValue = getCookie(key);
          if (cookieValue !== null) {
            return cookieValue;
          }
          // Use memory as last resort
          return memoryStorage[key] || null;
        }
      } catch (e) {
        console.warn(`Failed to retrieve '${key}' from any storage:`, e);
        // Use memory as last resort
        return memoryStorage[key] || null;
      }
    },
    
    removeItem: function(key) {
      try {
        if (storageAvailable) {
          sessionStorage.removeItem(key);
        } else {
          // Try to remove cookie as fallback
          deleteCookie(key);
        }
        // Always clear from memory storage
        delete memoryStorage[key];
        return true;
      } catch (e) {
        console.warn(`Failed to remove '${key}' from storage:`, e);
        // At least clear from memory
        delete memoryStorage[key];
        return false;
      }
    },
    
    clear: function() {
      try {
        if (storageAvailable) {
          sessionStorage.clear();
        }
        // Clear all user cookies
        const cookies = document.cookie.split(";");
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i];
          const eqPos = cookie.indexOf("=");
          const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
          deleteCookie(name);
        }
        // Clear memory storage
        Object.keys(memoryStorage).forEach(key => {
          delete memoryStorage[key];
        });
        return true;
      } catch (e) {
        console.warn("Failed to clear storage:", e);
        // At least clear memory storage
        Object.keys(memoryStorage).forEach(key => {
          delete memoryStorage[key];
        });
        return false;
      }
    }
  };
})();

