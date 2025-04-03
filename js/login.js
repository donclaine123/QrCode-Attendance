// Use global API_URL instead of import
// import { API_URL } from "./config.js";

document.addEventListener('DOMContentLoaded', function() {
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
    loginForm.addEventListener('submit', login);
  }

  // Handle registration form submission
  if (registerForm) {
    registerForm.addEventListener('submit', register);
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
      
      // Clear secureStorage
      secureStorage.clear();
      
      // Redirect to login page
      window.location.href = getBasePath() + '/index.html';
    } catch (error) {
      console.error('Logout error:', error);
      // Even if the server request fails, clear storage and redirect
      secureStorage.clear();
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

// Login function
async function login(event) {
  // Prevent default form submission
  event.preventDefault();
  
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const loginBtn = document.getElementById('login-btn');
  const loginError = document.getElementById('login-error');
  
  // Basic validation
  if (!email || !password) {
    loginError.textContent = 'Please enter both email and password';
    loginError.style.display = 'block';
    return;
  }
  
  try {
    // Show loading state
    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';
    loginError.style.display = 'none';
    
    // Make login request
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include', // Important for cookies
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Login successful:', data);
      
      // Store user data in secureStorage
      secureStorage.setItem('userId', data.user.id);
      secureStorage.setItem('userRole', data.role);
      secureStorage.setItem('userName', `${data.user.firstName} ${data.user.lastName}`);
      secureStorage.setItem('userEmail', email);
      secureStorage.setItem('loginTime', new Date().toString());
      
      // Redirect based on role
      if (data.role === 'teacher') {
        window.location.href = getBasePath() + '/pages/teacher-dashboard.html';
      } else {
        window.location.href = getBasePath() + '/pages/student-dashboard.html';
      }
    } else {
      // Show error message
      loginError.textContent = data.message || 'Login failed. Please check your credentials.';
      loginError.style.display = 'block';
      loginBtn.disabled = false;
      loginBtn.textContent = 'Login';
    }
  } catch (error) {
    console.error('Login error:', error);
    loginError.textContent = 'Server error. Please try again later.';
    loginError.style.display = 'block';
    loginBtn.disabled = false;
    loginBtn.textContent = 'Login';
  }
}

// Check if user is already logged in
async function checkAuth() {
  try {
    // First try server-side authentication
    const response = await fetch(`${API_URL}/auth/check-auth`, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.authenticated) {
        // Store user data
        secureStorage.setItem('userId', data.user.id);
        secureStorage.setItem('userRole', data.role);
        secureStorage.setItem('userName', `${data.user.firstName} ${data.user.lastName}`);
        
        // Redirect based on role
        if (data.role === 'teacher') {
          window.location.href = getBasePath() + '/pages/teacher-dashboard.html';
          return true;
        } else {
          window.location.href = getBasePath() + '/pages/student-dashboard.html';
          return true;
        }
      }
    }
    
    // If server auth fails, check secureStorage
    const userId = secureStorage.getItem('userId');
    const userRole = secureStorage.getItem('userRole');
    
    if (userId && userRole) {
      // Redirect based on role from secureStorage
      if (userRole === 'teacher') {
        window.location.href = getBasePath() + '/pages/teacher-dashboard.html';
        return true;
      } else {
        window.location.href = getBasePath() + '/pages/student-dashboard.html';
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Auth check error:', error);
    return false;
  }
}

// Registration form submission
async function register(event) {
  // Prevent default form submission
  event.preventDefault();
  
  const firstName = document.getElementById('register-firstName').value;
  const lastName = document.getElementById('register-lastName').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  const confirmPassword = document.getElementById('register-confirmPassword').value;
  const role = document.querySelector('input[name="register-role"]:checked').value;
  const studentId = document.getElementById('register-studentId').value;
  const registerBtn = document.getElementById('register-btn');
  const registerError = document.getElementById('register-error');
  
  // Basic validation
  if (!firstName || !lastName || !email || !password) {
    registerError.textContent = 'Please fill in all required fields';
    registerError.style.display = 'block';
    return;
  }
  
  if (password !== confirmPassword) {
    registerError.textContent = 'Passwords do not match';
    registerError.style.display = 'block';
    return;
  }
  
  if (role === 'student' && !studentId) {
    registerError.textContent = 'Student ID is required for student accounts';
    registerError.style.display = 'block';
    return;
  }
  
  try {
    // Show loading state
    registerBtn.disabled = true;
    registerBtn.textContent = 'Registering...';
    registerError.style.display = 'none';
    
    // Prepare request data
    const requestData = {
      firstName,
      lastName,
      email,
      password,
      role
    };
    
    // Add student ID if role is student
    if (role === 'student') {
      requestData.studentId = studentId;
    }
    
    // Make registration request
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Show success message and switch to login tab
      document.getElementById('login-tab').click();
      alert('Registration successful! Please check your email to verify your account.');
    } else {
      // Show error message
      registerError.textContent = data.message || 'Registration failed. Please try again.';
      registerError.style.display = 'block';
    }
    
    registerBtn.disabled = false;
    registerBtn.textContent = 'Register';
  } catch (error) {
    console.error('Registration error:', error);
    registerError.textContent = 'Server error. Please try again later.';
    registerError.style.display = 'block';
    registerBtn.disabled = false;
    registerBtn.textContent = 'Register';
  }
}