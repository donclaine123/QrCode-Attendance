// Use global API_URL instead of import
// import { API_URL } from "./config.js";

document.addEventListener('DOMContentLoaded', function() {
  console.log('Login page loaded');
  
  // Get form elements
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const showRegisterBtn = document.getElementById('show-register');
  const loginSection = document.getElementById('login-section');
  const registerSection = document.getElementById('register-section');
  const roleSelect = document.getElementById('role');
  const studentIdField = document.getElementById('student-id-field');
  const errorMsgElement = document.getElementById('errorMsg');

  // Check if user is already logged in
  checkAuth();

  // Show/hide student ID field based on role selection
  if (roleSelect && studentIdField) {
    roleSelect.addEventListener('change', function() {
      if (this.value === 'student') {
        studentIdField.style.display = 'block';
      } else {
        studentIdField.style.display = 'none';
      }
    });
  }

  // Show registration form
  if (showRegisterBtn) {
    showRegisterBtn.addEventListener('click', function() {
      loginSection.style.display = 'none';
      registerSection.style.display = 'block';
    });
  }

  // Back to login button
  const backToLoginBtn = document.getElementById('back-to-login');
  if (backToLoginBtn) {
    backToLoginBtn.addEventListener('click', function() {
      registerSection.style.display = 'none';
      loginSection.style.display = 'block';
    });
  } else if (registerForm) {
    // Add back to login button if it doesn't exist
    registerForm.insertAdjacentHTML(
      'beforeend',
      '<button type="button" id="back-to-login">Back to Login</button>'
    );
    document.getElementById('back-to-login').addEventListener('click', function() {
      registerSection.style.display = 'none';
      loginSection.style.display = 'block';
    });
  }

  // Handle login form submission
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      login();
    });
  }

  // Handle registration form submission
  if (registerForm) {
    registerForm.addEventListener('submit', function(e) {
      e.preventDefault();
      register();
    });
  }

  // Logout function
  async function logout() {
    try {
      // Call the logout endpoint
      const response = await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      // Clear localStorage
      localStorage.clear();
      
      // Redirect to login page
      window.location.href = getBasePath() + '/index.html';
    } catch (error) {
      console.error('Logout error:', error);
      // Even if the server request fails, clear local storage and redirect
      localStorage.clear();
      window.location.href = getBasePath() + '/index.html';
    }
  }

  // Add event listener for logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function(e) {
      e.preventDefault();
      logout();
    });
  }

  function showError(message) {
    if (!errorMsgElement) return;
    errorMsgElement.textContent = message;
    errorMsgElement.style.display = 'block';
    errorMsgElement.className = 'error-message';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      errorMsgElement.style.display = 'none';
    }, 5000);
  }

  function showSuccess(message) {
    if (!errorMsgElement) return;
    errorMsgElement.textContent = message;
    errorMsgElement.style.display = 'block';
    errorMsgElement.className = 'success-message';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      errorMsgElement.style.display = 'none';
    }, 5000);
  }
});

// Get base path for redirects - handles both local and production
function getBasePath() {
  // Check if we're in production (Netlify)
  const isProduction = window.location.hostname.includes('netlify.app');
  
  if (isProduction) {
    // In production, paths should be relative to root
    return '';
  } else {
    // In local development, include the QrCode-Attendance prefix
    return '/QrCode-Attendance';
  }
}

// Check authentication status
async function checkAuth() {
  try {
    console.log("Checking authentication status...");
    
    // First try server authentication
    const response = await fetch(`${API_URL}/auth/check-auth`, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log("Authentication successful:", data);
      
      // Store user info in localStorage
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('userRole', data.role);
      localStorage.setItem('userName', `${data.user.firstName} ${data.user.lastName}`);
      
      // Redirect based on role
      if (data.role === 'teacher') {
        window.location.href = getBasePath() + '/teacher-dashboard.html';
      } else if (data.role === 'student') {
        window.location.href = getBasePath() + '/student-dashboard.html';
      }
    } else {
      // If server auth fails, check localStorage as fallback
      const userId = localStorage.getItem('userId');
      const userRole = localStorage.getItem('userRole');
      
      if (userId && userRole) {
        console.log("Using localStorage fallback for authentication");
        if (userRole === 'teacher') {
          window.location.href = getBasePath() + '/teacher-dashboard.html';
        } else if (userRole === 'student') {
          window.location.href = getBasePath() + '/student-dashboard.html';
        }
      }
    }
  } catch (error) {
    console.error("Error checking authentication:", error);
    // If there's an error, clear localStorage and stay on login page
    localStorage.clear();
  }
}

// Login function
async function login() {
  try {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    // Disable login button and show loading state
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.textContent = 'Logging in...';
    }
    
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log("Login successful:", data);
      
      // Store user info in localStorage
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('userRole', data.role);
      localStorage.setItem('userName', `${data.user.firstName} ${data.user.lastName}`);
      
      // Redirect based on role
      if (data.role === 'teacher') {
        window.location.href = getBasePath() + '/teacher-dashboard.html';
      } else if (data.role === 'student') {
        window.location.href = getBasePath() + '/student-dashboard.html';
      }
    } else {
      const errorData = await response.json();
      showError(errorData.message || 'Login failed. Please try again.');
    }
  } catch (error) {
    console.error("Login error:", error);
    showError("Server connection error. Please try again.");
  } finally {
    // Re-enable login button
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Login';
    }
  }
}

// Register function
async function register() {
  try {
    const firstName = document.getElementById('register-first-name').value;
    const lastName = document.getElementById('register-last-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const role = document.getElementById('register-role').value;
    
    // Disable register button and show loading state
    const registerBtn = document.getElementById('register-btn');
    if (registerBtn) {
      registerBtn.disabled = true;
      registerBtn.textContent = 'Registering...';
    }
    
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        password,
        role
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log("Registration successful:", data);
      
      // Store user info in localStorage
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('userRole', data.role);
      localStorage.setItem('userName', `${data.user.firstName} ${data.user.lastName}`);
      
      // Redirect based on role
      if (data.role === 'teacher') {
        window.location.href = getBasePath() + '/teacher-dashboard.html';
      } else if (data.role === 'student') {
        window.location.href = getBasePath() + '/student-dashboard.html';
      }
    } else {
      const errorData = await response.json();
      showError(errorData.message || 'Registration failed. Please try again.');
    }
  } catch (error) {
    console.error("Registration error:", error);
    showError("Server connection error. Please try again.");
  } finally {
    // Re-enable register button
    const registerBtn = document.getElementById('register-btn');
    if (registerBtn) {
      registerBtn.disabled = false;
      registerBtn.textContent = 'Register';
    }
  }
}

// Logout function
async function logout() {
  try {
    // Call the logout endpoint
    const response = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    // Clear localStorage
    localStorage.clear();
    
    // Redirect to login page
    window.location.href = getBasePath() + '/index.html';
  } catch (error) {
    console.error('Logout error:', error);
    // Even if the server request fails, clear local storage and redirect
    localStorage.clear();
    window.location.href = getBasePath() + '/index.html';
  }
}