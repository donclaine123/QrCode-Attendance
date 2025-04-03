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
  checkAuthentication();

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

  // Handle the login form submission
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      await handleLogin(e);
    });
  }

  // Handle registration form submission
  if (registerForm) {
    registerForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const role = document.getElementById('role').value;
      const email = document.getElementById('reg-email').value;
      const firstName = document.getElementById('first-name').value;
      const lastName = document.getElementById('last-name').value;
      const password = document.getElementById('reg-password').value;
      const confirmPassword = document.getElementById('confirm-password').value;
      const studentId = document.getElementById('student-id')?.value || null;
      
      // Check if passwords match
      if (password !== confirmPassword) {
        showError('Passwords do not match');
        return;
      }
      
      // Show loading state
      const submitButton = e.target.querySelector('button[type="submit"]');
      const originalButtonText = submitButton.textContent;
      submitButton.textContent = 'Registering...';
      submitButton.disabled = true;
      
      try {
        const response = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ 
            role, 
            email, 
            firstName, 
            lastName, 
            password, 
            studentId 
          }),
          credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
          showSuccess('Registration successful! You can now log in.');
          // Switch back to login form
          registerSection.style.display = 'none';
          loginSection.style.display = 'block';
        } else {
          showError(data.message || 'Registration failed');
        }
        
        submitButton.textContent = originalButtonText;
        submitButton.disabled = false;
      } catch (error) {
        console.error('Registration error:', error);
        showError('Server error. Please try again later.');
        submitButton.textContent = originalButtonText;
        submitButton.disabled = false;
      }
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
async function login(email, password) {
  try {
    console.log('Attempting login with:', email);
    
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ email, password }),
      credentials: 'include'
    });
    
    console.log('Login response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Login failed:', errorData);
      return {
        success: false,
        message: errorData.message || 'Login failed. Please check your credentials.'
      };
    }

    const data = await response.json();
    console.log('Login successful:', data);
    
    // Store user data in localStorage as fallback
    localStorage.setItem('userId', data.user.id);
    localStorage.setItem('userRole', data.role);
    localStorage.setItem('userName', `${data.user.firstName} ${data.user.lastName}`);
    localStorage.setItem('userEmail', email);
    localStorage.setItem('loginTime', new Date().toISOString());
    
    return {
      success: true,
      message: 'Login successful!',
      userData: {
        id: data.user.id,
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        role: data.role
      }
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      message: 'An error occurred during login. Please try again.'
    };
  }
}

// Check if user is already logged in
async function checkAuthentication() {
  try {
    console.log('Checking authentication status...');
    
    // First try server authentication
    const response = await fetch(`${API_URL}/auth/check-auth`, {
      credentials: 'include'
    });

    const data = await response.json();
    console.log('Auth check response:', data);
    
    if (data.authenticated && data.user) {
      console.log('User is authenticated, checking role:', data.user.role);
      
      // Store user data in localStorage as fallback
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('userRole', data.user.role);
      localStorage.setItem('firstName', data.user.firstName || '');
      localStorage.setItem('lastName', data.user.lastName || '');
      
      const basePath = getBasePath();
      
      // Redirect based on role with correct path
      if (data.user.role === 'teacher') {
        console.log('Redirecting to teacher dashboard');
        window.location.href = `${basePath}/pages/teacher-dashboard.html`;
      } else if (data.user.role === 'student') {
        console.log('Redirecting to student dashboard');
        window.location.href = `${basePath}/pages/student-dashboard.html`;
      }
      return;
    }
    
    // If server auth fails, check localStorage
    const localRole = localStorage.getItem('userRole');
    const localUserId = localStorage.getItem('userId');
    
    if (localUserId && localRole) {
      console.log('Using localStorage authentication, role:', localRole);
      
      const basePath = getBasePath();
      
      // Redirect based on localStorage role with correct path
      if (localRole === 'teacher') {
        console.log('Redirecting to teacher dashboard (localStorage)');
        window.location.href = `${basePath}/pages/teacher-dashboard.html`;
      } else if (localRole === 'student') {
        console.log('Redirecting to student dashboard (localStorage)');
        window.location.href = `${basePath}/pages/student-dashboard.html`;
      }
      return;
    }
    
    // Not authenticated at all
    console.log('User is not authenticated');
    
  } catch (error) {
    console.error('Authentication check error:', error);
    // On error, check localStorage as fallback
    const localRole = localStorage.getItem('userRole');
    const localUserId = localStorage.getItem('userId');
    
    if (localUserId && localRole) {
      console.log('Using localStorage fallback due to server error, role:', localRole);
      if (localRole === 'teacher') {
        window.location.href = '/QrCode-Attendance/pages/teacher-dashboard.html';
      } else if (localRole === 'student') {
        window.location.href = '/QrCode-Attendance/pages/student-dashboard.html';
      }
    }
  }
}

// Process login form submission
async function handleLogin(event) {
    const email = document.getElementById('email')?.value;
    const password = document.getElementById('password')?.value;
    
    // Fix for the null reference error - add null check and fallback
    const userTypeElement = document.querySelector('input[name="userType"]:checked');
    const userType = userTypeElement ? userTypeElement.value : 'teacher'; // Default to teacher if not found
    
    // Validate required fields
    if (!email || !password) {
        // Show error without trying to access non-existent elements
        console.error('Email or password is missing');
        const errorElement = document.getElementById('errorMsg');
        if (errorElement) {
            errorElement.textContent = 'Email and password are required';
            errorElement.style.display = 'block';
            errorElement.className = 'error-message';
        }
        return;
    }
    
    try {
        // First check if cookies are accepted
        if (localStorage.getItem('cookiesAccepted') !== 'true') {
            // Show cookie consent banner before proceeding
            const errorElement = document.getElementById('errorMsg');
            if (errorElement) {
                errorElement.textContent = 'Please accept cookies before logging in.';
                errorElement.style.display = 'block';
                errorElement.className = 'error-message';
            }
            
            // Initialize cookie consent banner
            if (typeof initCookieConsent === 'function') {
                initCookieConsent();
            } else {
                console.error('Cookie consent function not found!');
            }
            
            return;
        }
    
        // Show loading state - safely access elements
        const loginBtn = document.querySelector('#loginForm button[type="submit"]') || 
                         document.querySelector('#login-form button[type="submit"]');
        
        if (!loginBtn) {
            console.error('Login button not found in the DOM');
            return; // Exit if we can't find the login button
        }
        
        const originalBtnText = loginBtn.innerHTML;
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<span class="spinner"></span> Logging in...';
        
        // Clear previous error messages - safely
        const loginError = document.getElementById('loginError');
        const errorMsg = document.getElementById('errorMsg');
        if (loginError) loginError.textContent = '';
        if (errorMsg) errorMsg.style.display = 'none';
        
        // API URL is defined globally or use a default
        const apiUrl = window.API_URL || 'https://qrattendance-backend-production.up.railway.app';
        
        const response = await fetch(`${apiUrl}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password,
                userType
            }),
            credentials: 'include' // Important for storing cookies!
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Save user data in localStorage for fallback authentication
            localStorage.setItem('userId', data.user.id);
            localStorage.setItem('userName', data.user.name || `${data.user.firstName} ${data.user.lastName}`);
            localStorage.setItem('userEmail', data.user.email || email);
            localStorage.setItem('userRole', userType);
            localStorage.setItem('isAuthenticated', 'true');
            localStorage.setItem('loginTime', new Date().toISOString());
            
            // Check if cookies are being set properly
            setTimeout(() => {
                // Wait a bit to allow cookies to be set
                const hasCookies = document.cookie.length > 0;
                const hasSessionCookie = document.cookie.includes('qr_attendance_sid');
                
                if (!hasSessionCookie) {
                    console.warn("⚠️ WARNING: Session cookie not detected! This may affect your login session.");
                    console.warn("Your browser may be blocking third-party cookies needed for authentication.");
                    console.warn("The application will attempt to use localStorage as a fallback for authentication.");
                    
                    // Show cookie help instead of inline warning
                    if (typeof showCookieHelp === 'function') {
                        showCookieHelp();
                    }
                }
                
                // Continue with redirection regardless of cookie status
                redirectToDashboard(userType);
            }, 500);
        } else {
            // Display error message - safely handle potential missing elements
            if (loginError) {
                loginError.textContent = data.message || 'Login failed. Please check your credentials.';
            } else if (errorMsg) {
                errorMsg.textContent = data.message || 'Login failed. Please check your credentials.';
                errorMsg.style.display = 'block';
                errorMsg.className = 'error-message';
            } else {
                console.error('Login failed:', data.message || 'Unknown error');
                alert('Login failed: ' + (data.message || 'Please check your credentials.'));
            }
            
            // Reset button
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.innerHTML = originalBtnText;
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        
        // Handle error display safely
        const loginError = document.getElementById('loginError');
        const errorMsg = document.getElementById('errorMsg');
        
        if (loginError) {
            loginError.textContent = 'An error occurred during login. Please try again.';
        } else if (errorMsg) {
            errorMsg.textContent = 'An error occurred during login. Please try again.';
            errorMsg.style.display = 'block'; 
            errorMsg.className = 'error-message';
        } else {
            alert('Login error: ' + error.message);
        }
        
        // Reset button - safely
        const loginBtn = document.querySelector('#loginForm button[type="submit"]') || 
                         document.querySelector('#login-form button[type="submit"]');
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.innerHTML = 'Log In';
        }
    }
}

// Helper function to redirect to the dashboard based on user type
function redirectToDashboard(userType) {
    const basePath = window.location.pathname.includes('/pages/') 
        ? '..' 
        : '.';
        
    if (userType === 'teacher') {
        window.location.href = `${basePath}/pages/teacher-dashboard.html`;
    } else {
        window.location.href = `${basePath}/pages/student-dashboard.html`;
    }
}