// Use global API_URL instead of import
// import { API_URL } from "./config.js";

document.addEventListener('DOMContentLoaded', function() {
  // Get form elements
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const showRegisterBtn = document.getElementById('show-register');
  const showLoginBtn = document.getElementById('show-login');
  const loginSection = document.getElementById('login-section');
  const registerSection = document.getElementById('register-section');
  const verificationSection = document.getElementById('verification-section');
  const verificationEmailElement = document.getElementById('verification-email');
  const proceedToLoginBtn = document.getElementById('proceed-to-login-btn');
  const roleSelect = document.getElementById('role');
  const studentIdField = document.getElementById('student-id-field');
  const errorMsgElement = document.getElementById('errorMsg');

  // Check if user is already logged in
  checkAuthentication();

  // Add password strength indicator
  const passwordInput = document.getElementById('reg-password');
  const strengthMeterFill = document.getElementById('strength-meter-fill');
  const strengthText = document.getElementById('strength-text');
  
  if (passwordInput && strengthMeterFill && strengthText) {
    passwordInput.addEventListener('input', () => {
      const password = passwordInput.value;
      let strength = 0;
      let feedback = '';
      
      if (password.length >= 8) strength += 25;
      if (/[A-Z]/.test(password)) strength += 25;
      if (/[0-9]/.test(password)) strength += 25;
      if (/[^A-Za-z0-9]/.test(password)) strength += 25;
      
      strengthMeterFill.style.width = `${strength}%`;
      
      if (strength <= 25) {
        strengthMeterFill.style.backgroundColor = '#ef4444'; // Red
        feedback = 'Weak';
      } else if (strength <= 50) {
        strengthMeterFill.style.backgroundColor = '#f59e0b'; // Orange
        feedback = 'Fair';
      } else if (strength <= 75) {
        strengthMeterFill.style.backgroundColor = '#3b82f6'; // Blue
        feedback = 'Good';
      } else {
        strengthMeterFill.style.backgroundColor = '#10b981'; // Green
        feedback = 'Strong';
      }
      
      strengthText.textContent = feedback;
    });
  }
  
  // Role selection toggle functionality
  const roleToggleOptions = document.querySelectorAll('.role-toggle-option');
  
  if (roleToggleOptions.length && roleSelect) {
    // Set initial value based on active toggle
    const activeOption = document.querySelector('.role-toggle-option.active');
    if (activeOption) {
      roleSelect.value = activeOption.dataset.value;
    }
    
    // Add click handlers to toggle options
    roleToggleOptions.forEach(option => {
      option.addEventListener('click', function() {
        // Remove active class from all options
        roleToggleOptions.forEach(opt => opt.classList.remove('active'));
        
        // Add active class to clicked option
        this.classList.add('active');
        
        // Update the hidden select value
        roleSelect.value = this.dataset.value;
        
        // Trigger change event on select for any listeners
        const event = new Event('change');
        roleSelect.dispatchEvent(event);
        
        // Show/hide student ID field if needed
        const studentIdInput = document.getElementById('student-id');
        if (studentIdField && studentIdInput) {
          if (this.dataset.value === 'student') {
            studentIdField.style.display = 'block';
            studentIdInput.disabled = false;
            studentIdInput.setAttribute('required', 'required');
          } else {
            studentIdField.style.display = 'none';
            studentIdInput.disabled = true;
            studentIdInput.removeAttribute('required');
          }
        }
      });
    });
  }

  // Optional: Ensure initial state is correct on load
  if (roleSelect && studentIdField) {
    const studentIdInput = document.getElementById('student-id');
    if (roleSelect.value === 'student') {
      studentIdField.style.display = 'block';
      studentIdInput.disabled = false;
      studentIdInput.setAttribute('required', 'required');
    } else {
      studentIdField.style.display = 'none';
      studentIdInput.disabled = true;
      studentIdInput.removeAttribute('required');
    }
  }

  // Show registration form
  if (showRegisterBtn) {
    showRegisterBtn.addEventListener('click', function() {
      loginSection.style.display = 'none';
      registerSection.style.display = 'block';
    });
  }

  // Show login form (using the "Log in" link in the register form)
  if (showLoginBtn) {
    showLoginBtn.addEventListener('click', function() {
      registerSection.style.display = 'none';
      verificationSection.classList.remove('visible');
      verificationSection.style.display = 'none';
      loginSection.style.display = 'block';
    });
  }

  // Handle login form submission
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      
      // Show loading state
      const submitButton = e.target.querySelector('button[type="submit"]');
      const originalButtonText = submitButton.textContent;
      submitButton.textContent = 'Logging in...';
      submitButton.disabled = true;
      
      try {
        const result = await login(email, password);
        
        if (result.success) {
          console.log('Login successful, redirecting...');
          
          // Increase delay to ensure session is properly established
          // before any other requests are made
          setTimeout(() => {
            const basePath = getBasePath();
            
            // Redirect based on role without URL parameters
            if (result.userData.role === 'teacher') {
              window.location.href = `${basePath}/pages/teacher-dashboard.html`;
            } else if (result.userData.role === 'student') {
              window.location.href = `${basePath}/pages/student-dashboard.html`;
            }
          }, 1000); // Increased from 500ms to 1000ms
        } else {
          showError(result.message);
          submitButton.textContent = originalButtonText;
          submitButton.disabled = false;
        }
      } catch (error) {
        console.error('Login error:', error);
        showError('An error occurred during login. Please try again.');
        submitButton.textContent = originalButtonText;
        submitButton.disabled = false;
      }
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
      
      // --- Clear previous email error state --- 
      const emailInput = document.getElementById('reg-email');
      const emailErrorMsg = document.getElementById('email-error-message');
      emailInput?.classList.remove('input-error');
      if (emailErrorMsg) emailErrorMsg.textContent = '';
      // --- End Clear Error State ---

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

        if (!response.ok) {
            // --- Specific Email Error Handling --- 
            if (response.status === 400 && data.message && data.message.toLowerCase().includes('email already registered')) {
                if (emailInput) emailInput.classList.add('input-error');
                if (emailErrorMsg) emailErrorMsg.textContent = data.message; // Show specific message
                showError(''); // Clear the general error message or show a generic one
            } else {
                 // --- General Error Handling --- 
                showError(data.message || `Registration failed with status: ${response.status}`);
            }
            // --- End Error Handling ---

            submitButton.textContent = originalButtonText;
            submitButton.disabled = false;
            return; // Stop execution here
        }
        
        // Original success logic (data.success should be true if response.ok)
        // Check if verification is required based on backend response
        if (data.requiresVerification) {
            // Display the verification prompt
            if (verificationEmailElement && data.email) {
                verificationEmailElement.textContent = data.email;
            }
            registerSection.style.display = 'none';
            loginSection.style.display = 'none';
            verificationSection.style.display = 'block';
            setTimeout(() => {
                verificationSection.classList.add('visible');
            }, 10); 
        } else {
            // Original behavior: Registration successful, no verification needed
            showSuccess('Registration successful! You can now log in.'); 
            registerSection.style.display = 'none';
            loginSection.style.display = 'block';
        }
        
        submitButton.textContent = originalButtonText;
        submitButton.disabled = false;
      } catch (error) {
        console.error('Registration error (Network/Fetch): ', error);
        showError('Network error or could not connect to server. Please try again later.');
        submitButton.textContent = originalButtonText;
        submitButton.disabled = false;
      }
    });
  }

  // Add listener for the 'Proceed to Login' button in the verification section
  if (proceedToLoginBtn) {
      proceedToLoginBtn.addEventListener('click', () => {
          verificationSection.classList.remove('visible');
          setTimeout(() => {
              verificationSection.style.display = 'none';
              loginSection.style.display = 'block'; 
          }, 500);
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
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Redirect to login page
      window.location.href = getBasePath() + '/index.html';
    } catch (error) {
      console.error('Logout error:', error);
      // Even if the server request fails, clear local storage and redirect
      sessionStorage.clear();
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
    
    // Store user data in sessionStorage
    sessionStorage.setItem('userId', data.user.id);
    sessionStorage.setItem('userRole', data.role);
    sessionStorage.setItem('loginTime', convertToUTC8(new Date()));
    
    // 📌 ONLY update name fields if provided by check-auth response
    if (data.user.firstName && data.user.lastName) {
        console.log('Updating names from check-auth response');
        sessionStorage.setItem('firstName', data.user.firstName);
        sessionStorage.setItem('lastName', data.user.lastName);
        sessionStorage.setItem('userName', `${data.user.firstName} ${data.user.lastName}`);
    } else {
        // Otherwise, keep the existing name values from initial login
        console.log('Names not in check-auth response, keeping existing sessionStorage values.');
    }
    
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
      
      // Always store/update ID and Role
      sessionStorage.setItem('userId', data.user.id);
      sessionStorage.setItem('userRole', data.user.role);
      
      // 📌 ONLY update name fields if provided by check-auth response
      if (data.user.firstName && data.user.lastName) {
          console.log('Updating names from check-auth response');
          sessionStorage.setItem('firstName', data.user.firstName);
          sessionStorage.setItem('lastName', data.user.lastName);
          sessionStorage.setItem('userName', `${data.user.firstName} ${data.user.lastName}`);
      } else {
          // Otherwise, keep the existing name values from initial login
          console.log('Names not in check-auth response, keeping existing sessionStorage values.');
      }
      
      const basePath = getBasePath();
      
      // 📌 Add a short delay before redirecting
      setTimeout(() => {
          if (data.user.role === 'teacher') {
            console.log('Redirecting to teacher dashboard');
            window.location.href = `${basePath}/pages/teacher-dashboard.html`;
          } else if (data.user.role === 'student') {
            console.log('Redirecting to student dashboard');
            window.location.href = `${basePath}/pages/student-dashboard.html`;
          }
      }, 150); // 150ms delay should be sufficient

      return; // Exit checkAuthentication after starting timeout
    }
    
    // If server auth fails, check sessionStorage
    const localRole = sessionStorage.getItem('userRole');
    const localUserId = sessionStorage.getItem('userId');
    
    if (localUserId && localRole) {
      console.log('Using sessionStorage authentication, role:', localRole);
      
      const basePath = getBasePath();
      
      // 📌 Add a short delay before redirecting (SessionStorage fallback)
      setTimeout(() => {
          if (localRole === 'teacher') {
            console.log('Redirecting to teacher dashboard (sessionStorage)');
            window.location.href = `${basePath}/pages/teacher-dashboard.html`;
          } else if (localRole === 'student') {
            console.log('Redirecting to student dashboard (sessionStorage)');
            window.location.href = `${basePath}/pages/student-dashboard.html`;
          }
       }, 150); 

      return; // Exit after starting timeout
    }
    
    // Not authenticated at all
    console.log('User is not authenticated');
    
  } catch (error) {
    console.error('Authentication check error:', error);
    // On error, check sessionStorage as fallback
    const localRole = sessionStorage.getItem('userRole');
    const localUserId = sessionStorage.getItem('userId');
    
    if (localUserId && localRole) {
      console.log('Using sessionStorage fallback due to server error, role:', localRole);
      // 📌 Add a short delay before redirecting (Server error fallback)
      setTimeout(() => {
        if (localRole === 'teacher') {
          window.location.href = '/QrCode-Attendance/pages/teacher-dashboard.html';
        } else if (localRole === 'student') {
          window.location.href = '/QrCode-Attendance/pages/student-dashboard.html';
        }
      }, 150);
    }
  }
}

// Helper function to convert UTC date to UTC+8
function convertToUTC8(date) {
  // Create a new date object with UTC+8 hours
  const utc8Date = new Date(date.getTime() + (8 * 60 * 60 * 1000));
  
  // Format the date to readable format
  return utc8Date.toISOString().replace('Z', '+08:00');
}