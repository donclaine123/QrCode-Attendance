// QR Code Generation functionality

// Use global API_URL instead of import
// import API_URL from "./config.js";

document.addEventListener('DOMContentLoaded', function() {
    console.log('QR Code dashboard loaded');
    // Initialize dashboard
    initDashboard();
    
    // Add event listeners
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
        console.log('Logout button event listener added');
    } else {
        console.error('Logout button not found');
    }
    
    // Add event listeners for dashboard actions
    const generateQrBtn = document.getElementById('generate-qr-btn');
    const viewAttendanceBtn = document.getElementById('view-attendance-btn');
    
    if (generateQrBtn) {
        generateQrBtn.addEventListener('click', function() {
            generateQRCode();
        });
    }
    
    if (viewAttendanceBtn) {
        viewAttendanceBtn.addEventListener('click', function() {
            viewCurrentSessionAttendance();
        });
    }
    
    // Set up debug listeners
    setupDebugListeners();
});

// Initialize dashboard
async function initDashboard() {
    try {
        console.log("Initializing QR Code dashboard...");
        
        // Get user info from storage
        const userData = StorageUtil.getUserData();
        
        // If no user info in storage, try to authenticate with the server
        if (!userData.userId || !userData.userRole) {
            console.log("No user info in storage, checking authentication...");
            
            // Check authentication status
            const response = await fetch(`${API_URL}/auth/check-auth`, {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log("Authentication successful:", data);
                
                // Store user info using StorageUtil
                const newUserData = {
                    userId: data.user.id,
                    userRole: data.role,
                    userName: `${data.user.firstName} ${data.user.lastName}`
                };
                
                if (StorageUtil.setUserData(newUserData)) {
                    // Update welcome message
                    const welcomeMessage = document.getElementById('welcome-message');
                    if (welcomeMessage) {
                        welcomeMessage.textContent = `Welcome, ${data.user.firstName} ${data.user.lastName}!`;
                    }
                    
                    // Show teacher section
                    const teacherSection = document.getElementById('teacher-section');
                    if (teacherSection) {
                        teacherSection.style.display = 'block';
                    }
                    
                    // Load classes
                    loadClasses();
                } else {
                    console.warn("Failed to store user data, but continuing with server session");
                    // Still proceed with server session
                    const welcomeMessage = document.getElementById('welcome-message');
                    if (welcomeMessage) {
                        welcomeMessage.textContent = `Welcome, ${data.user.firstName} ${data.user.lastName}!`;
                    }
                    
                    const teacherSection = document.getElementById('teacher-section');
                    if (teacherSection) {
                        teacherSection.style.display = 'block';
                    }
                    
                    loadClasses();
                }
            } else {
                console.error("Authentication failed, redirecting to login...");
                window.location.href = getBasePath() + '/index.html';
            }
        } else {
            // User info found in storage
            console.log("User info found in storage:", userData);
            
            // Update welcome message
            const welcomeMessage = document.getElementById('welcome-message');
            if (welcomeMessage) {
                welcomeMessage.textContent = `Welcome, ${userData.userName}!`;
            }
            
            // Show teacher section
            const teacherSection = document.getElementById('teacher-section');
            if (teacherSection) {
                teacherSection.style.display = 'block';
            }
            
            // Load classes
            loadClasses();
        }
    } catch (error) {
        console.error("Error initializing dashboard:", error);
        showError("Failed to initialize dashboard. Please try again.");
    }
}

// Generate QR Code
async function generateQRCode() {
    try {
        const classSelect = document.getElementById('class-select');
        const selectedClassId = classSelect.value;
        
        if (!selectedClassId) {
            showError("Please select a class first");
            return;
        }
        
        const userData = StorageUtil.getUserData();
        console.log(`Generating QR code for class ID: ${selectedClassId}, teacher ID: ${userData.userId}`);
        
        // Create a session for the selected class
        const response = await fetch(`${API_URL}/sessions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                classId: selectedClassId,
                teacherId: userData.userId
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to create session');
        }
        
        const sessionData = await response.json();
        console.log("Session created:", sessionData);
        
        // Store session ID in storage
        StorageUtil.setItem('currentSessionId', sessionData.id);
        StorageUtil.setItem('currentClassId', selectedClassId);
        
        // Generate QR code
        const qrCodeElement = document.getElementById('qrcode');
        qrCodeElement.innerHTML = '';
        
        new QRCode(qrCodeElement, {
            text: JSON.stringify({
                sessionId: sessionData.id,
                classId: selectedClassId,
                teacherId: userData.userId
            }),
            width: 256,
            height: 256
        });
        
        // Enable attendance view button
        const viewAttendanceBtn = document.getElementById('view-attendance-btn');
        if (viewAttendanceBtn) {
            viewAttendanceBtn.disabled = false;
        }
        
        // Start countdown
        startCountdown();
        
    } catch (error) {
        console.error("Error generating QR code:", error);
        showError("Failed to generate QR code. Please try again.");
    }
}

// Load classes
async function loadClasses() {
    try {
        const classSelect = document.getElementById('class-select');
        if (!classSelect) {
            console.error('Class select element not found');
            return;
        }
        
        classSelect.innerHTML = '<option value="">Select a class</option>';
        
        const userData = StorageUtil.getUserData();
        console.log(`Fetching classes for teacher ID: ${userData.userId}`);
        
        const response = await fetch(`${API_URL}/teacher/classes`, {
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'X-User-ID': userData.userId,
                'X-User-Role': userData.userRole
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch classes');
        }
        
        const data = await response.json();
        console.log('Classes data received:', data);
        
        if (data.success && data.classes && data.classes.length > 0) {
            data.classes.forEach(classItem => {
                const option = document.createElement('option');
                option.value = classItem.id;
                option.textContent = classItem.subject;
                classSelect.appendChild(option);
            });
        } else {
            classSelect.innerHTML += '<option disabled>No classes found</option>';
        }
    } catch (error) {
        console.error('Error loading classes:', error);
        showError('Failed to load classes. Please try again.');
    }
}

// View current session attendance
async function viewCurrentSessionAttendance() {
    try {
        const currentSessionId = StorageUtil.getItem('currentSessionId');
        const currentClassId = StorageUtil.getItem('currentClassId');
        
        if (!currentSessionId) {
            alert('No active session found. Generate a QR code first.');
            return;
        }
        
        // Load sessions for this class
        await loadSessions(currentClassId);
        
        // Select the current session
        const sessionSelect = document.getElementById('session-select');
        if (sessionSelect) {
            sessionSelect.value = currentSessionId;
        }
        
        // Load attendance records
        await loadAttendanceRecords();
    } catch (error) {
        console.error('Error viewing current session attendance:', error);
        showError('Failed to view current session attendance. Please try again.');
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
        
        // Clear storage using StorageUtil
        StorageUtil.clearUserData();
        
        // Redirect to login page
        window.location.href = getBasePath() + '/index.html';
    } catch (error) {
        console.error('Logout error:', error);
        // Even if the server request fails, clear storage and redirect
        StorageUtil.clearUserData();
        window.location.href = getBasePath() + '/index.html';
    }
}

// Add a window load event listener to log QR library status
window.addEventListener('load', function() {
  console.log("QR code library status:", typeof QRCode !== 'undefined' ? 'Loaded ✅' : 'Not loaded ❌');
  if (typeof QRCode === 'undefined') {
    console.error("QRCode library not loaded! QR code generation will fail.");
    
    // Add a fallback QRCode implementation
    window.QRCode = function(element, options) {
      if (typeof element === 'string') {
        element = document.getElementById(element);
      }
      if (!element) return;
      
      console.warn("Using fallback QRCode implementation");
      const div = document.createElement('div');
      div.style.border = '1px solid #ccc';
      div.style.padding = '10px';
      div.style.textAlign = 'center';
      div.innerHTML = `
        <p>QR Code could not be generated</p>
        <a href="${options.text}" target="_blank">${options.text}</a>
      `;
      
      element.innerHTML = '';
      element.appendChild(div);
    };
    
    window.QRCode.CorrectLevel = { L: 1, M: 0, Q: 3, H: 2 };
  } else {
    console.log("QRCode.CorrectLevel:", QRCode.CorrectLevel ? "Available ✅" : "Missing ❌");
  }
});