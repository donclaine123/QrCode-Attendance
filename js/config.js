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
    // Construct the final URL correctly
    let finalUrl;
    if (url.startsWith('http') || url.startsWith('/api')) {
      // If URL is absolute or already starts with /api, use it as is
      finalUrl = url;
    } else {
      // Otherwise, prepend API_URL
      // Ensure no double slashes if url starts with /
      finalUrl = `${API_URL}${url.startsWith('/') ? url : '/' + url}`;
    }
    console.log(`[fetchWithAuth] Fetching: ${finalUrl}`);

    // First attempt using cookies
    const response = await fetch(finalUrl, mergedOptions);
    
    // If unauthorized and we have stored credentials, try with Authorization header
    if (response.status === 401 && sessionStorage.getItem('userEmail') && sessionStorage.getItem('userPassword')) {
      const email = sessionStorage.getItem('userEmail');
      const password = sessionStorage.getItem('userPassword');
      const base64Credentials = btoa(`${email}:${password}`);
      
      console.log("Retrying with Authorization header");
      
      // Retry with Authorization header
      mergedOptions.headers['Authorization'] = `Basic ${base64Credentials}`;
      return fetch(finalUrl, mergedOptions);
    }
    
    return response;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    throw error;
  }
}

