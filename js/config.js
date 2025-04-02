// API configuration
const API_URL = "https://qrattendance-backend-production.up.railway.app";

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
        <p>Cannot connect to the backend server at ${API_URL}</p>
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
    if (response.status === 401 && localStorage.getItem('userEmail') && localStorage.getItem('userPassword')) {
      const email = localStorage.getItem('userEmail');
      const password = localStorage.getItem('userPassword');
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

