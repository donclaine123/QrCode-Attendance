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

// Check if cookies are enabled
function areCookiesEnabled() {
    // Try to set a test cookie
    document.cookie = "testcookie=1; SameSite=None; Secure";
    const cookiesEnabled = document.cookie.indexOf("testcookie") !== -1;
    
    // Display warning if cookies are disabled
    if (!cookiesEnabled) {
        const warningDiv = document.createElement('div');
        warningDiv.className = 'cookie-warning';
        warningDiv.innerHTML = `
            <div class="alert alert-warning" role="alert">
                <strong>Cookies appear to be disabled!</strong> This may affect your login experience.
                <a href="#" class="cookie-help-link">Why do I need cookies?</a>
            </div>
        `;
        document.body.insertBefore(warningDiv, document.body.firstChild);
        
        // Add cookie help modal
        const helpModal = document.createElement('div');
        helpModal.innerHTML = `
            <div class="modal fade" id="cookieHelpModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Why Cookies Are Needed</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <p>This application uses cookies to keep you logged in and provide a seamless experience.</p>
                            <p>Without cookies, you may experience issues with:</p>
                            <ul>
                                <li>Staying logged in</li>
                                <li>QR code generation</li>
                                <li>Attendance tracking</li>
                            </ul>
                            <p>We will still try to authenticate you using alternative methods, but the experience may be limited.</p>
                            <h6>How to enable cookies:</h6>
                            <p><strong>Chrome:</strong> Settings → Privacy and security → Cookies and other site data → Allow all cookies</p>
                            <p><strong>Firefox:</strong> Settings → Privacy & Security → Cookies and Site Data → Enable cookies</p>
                            <p><strong>Edge:</strong> Settings → Cookies and site permissions → Manage and delete cookies and site data → Allow</p>
                            <p><strong>Safari:</strong> Settings → Privacy → Website tracking → Unselect "Prevent cross-site tracking"</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(helpModal);
        
        // Add event listener to the help link
        document.querySelector('.cookie-help-link').addEventListener('click', function(e) {
            e.preventDefault();
            const modal = new bootstrap.Modal(document.getElementById('cookieHelpModal'));
            modal.show();
        });
    }
    
    return cookiesEnabled;
}

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();
    
    try {
        // Get form data - with null checks to avoid "Cannot read properties of null" errors
        const emailElement = document.getElementById('email');
        const passwordElement = document.getElementById('password');
        
        if (!emailElement || !passwordElement) {
            showMessage('Error: Form elements not found', 'error');
            console.error('Form elements not found', { 
                emailElement: !!emailElement, 
                passwordElement: !!passwordElement 
            });
            return;
        }
        
        const email = emailElement.value;
        const password = passwordElement.value;
        
        // Get the selected user type (teacher or student)
        const userTypeElement = document.querySelector('input[name="userType"]:checked');
        const userType = userTypeElement ? userTypeElement.value : 'teacher'; // Default to teacher if nothing selected
        
        // Validate input
        if (!email || !password) {
            showMessage('Please enter both email and password', 'error');
            return;
        }
        
        // Check if cookies are enabled and show a warning if not
        const cookiesEnabled = areCookiesEnabled();
        if (!cookiesEnabled) {
            console.warn('Cookies are disabled. Will use localStorage fallback for authentication.');
        }
        
        // Show loading state
        const loginBtn = document.querySelector('#loginForm button[type="submit"]') || 
                          document.querySelector('#login-form button[type="submit"]');
        if (loginBtn) {
            loginBtn.disabled = true;
            loginBtn.innerHTML = 'Logging in...';
        }
        
        // Send login request
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            console.log('Login successful:', data);
            
            // Store important user data in localStorage for fallback authentication
            localStorage.setItem('userId', data.user.id);
            localStorage.setItem('userRole', data.role);
            localStorage.setItem('firstName', data.user.firstName || '');
            localStorage.setItem('lastName', data.user.lastName || '');
            
            // Check if cookies are working - if not, show a warning
            if (!cookiesEnabled) {
                showMessage('Login successful, but cookies are disabled. Some features may not work correctly.', 'warning');
                // Small delay to ensure user sees the message
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
            
            // Redirect based on role
            const basePath = getBasePath();
            window.location.href = `${basePath}${data.redirect || (data.role === 'teacher' ? '/pages/teacher-dashboard.html' : '/pages/student-dashboard.html')}`;
        } else {
            // Reset button state
            if (loginBtn) {
                loginBtn.disabled = false;
                loginBtn.innerHTML = 'Login';
            }
            
            // Show error message
            const errorMessage = data.message || 'Login failed. Please check your credentials.';
            showMessage(errorMessage, 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        
        // Reset button state
        const loginBtn = document.querySelector('#loginForm button[type="submit"]') || 
                         document.querySelector('#login-form button[type="submit"]');
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.innerHTML = 'Login';
        }
        
        showMessage('An error occurred during login. Please try again.', 'error');
    }
}

// Helper function to show messages to the user
function showMessage(message, type = 'info') {
    const messageContainer = document.getElementById('messageContainer');
    
    if (!messageContainer) {
        // Create message container if it doesn't exist
        const newContainer = document.createElement('div');
        newContainer.id = 'messageContainer';
        newContainer.style.position = 'fixed';
        newContainer.style.top = '10px';
        newContainer.style.left = '50%';
        newContainer.style.transform = 'translateX(-50%)';
        newContainer.style.zIndex = '9999';
        newContainer.style.width = '80%';
        newContainer.style.maxWidth = '500px';
        document.body.appendChild(newContainer);
        
        const alertDiv = createAlertElement(message, type);
        newContainer.appendChild(alertDiv);
    } else {
        // Clear existing messages
        messageContainer.innerHTML = '';
        const alertDiv = createAlertElement(message, type);
        messageContainer.appendChild(alertDiv);
    }
}

// Helper function to create alert elements
function createAlertElement(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'error' ? 'danger' : type}`;
    alertDiv.innerHTML = message;
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        alertDiv.style.opacity = '0';
        alertDiv.style.transition = 'opacity 0.5s';
        setTimeout(() => alertDiv.remove(), 5000);
    }, 5000);
    
    return alertDiv;
}