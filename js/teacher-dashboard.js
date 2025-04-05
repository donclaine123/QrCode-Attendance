// Teacher Dashboard functionality

document.addEventListener('DOMContentLoaded', function() {
    // Skip initialization if already done by qrcode.js
    if (window.dashboardInitialized) {
        console.log('Dashboard already initialized by qrcode.js, skipping duplicate initialization');
        return;
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
    
    window.dashboardInitialized = true;
    console.log('Teacher dashboard loaded');
    
    // Initialize the dashboard
    initDashboard();

    // Set up event listeners for navigation in the sidebar
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Prevent default only for dashboard functionality links
            if (this.getAttribute('href') === '#' || this.id === 'logout-btn') {
                e.preventDefault();
            }
            
            // Update active state
            navLinks.forEach(navLink => navLink.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Set up event listeners for dashboard actions
    const generateQrBtn = document.getElementById('generate-qr-btn');
    const manageClassesBtn = document.getElementById('manage-classes-btn');
    const viewAttendanceBtn = document.getElementById('view-attendance-btn');
    const dashboardNav = document.getElementById('dashboard-nav');
    
    if (dashboardNav) {
        dashboardNav.addEventListener('click', function() {
            // Show a welcome screen or hide all sections
            document.getElementById('qr-section').style.display = 'none';
            document.getElementById('classes-section').style.display = 'none';
            document.getElementById('attendance-section').style.display = 'none';
        });
    }
    
    if (generateQrBtn) {
        generateQrBtn.addEventListener('click', function() {
            document.getElementById('qr-section').style.display = 'block';
            document.getElementById('classes-section').style.display = 'none';
            document.getElementById('attendance-section').style.display = 'none';
        });
    }
    
    if (manageClassesBtn) {
        manageClassesBtn.addEventListener('click', function() {
            document.getElementById('qr-section').style.display = 'none';
            document.getElementById('classes-section').style.display = 'block';
            document.getElementById('attendance-section').style.display = 'none';
        });
    }
    
    if (viewAttendanceBtn) {
        viewAttendanceBtn.addEventListener('click', function() {
            document.getElementById('qr-section').style.display = 'none';
            document.getElementById('classes-section').style.display = 'none';
            document.getElementById('attendance-section').style.display = 'block';
        });
    }
    
    // Set up event listeners for QR code generation
    const generateQrCodeBtn = document.getElementById('generate-qr-code-btn');
    const viewCurrentAttendanceBtn = document.getElementById('view-current-attendance-btn');
    
    if (generateQrCodeBtn) {
        generateQrCodeBtn.addEventListener('click', generateQRCode);
    }
    
    if (viewCurrentAttendanceBtn) {
        viewCurrentAttendanceBtn.addEventListener('click', viewCurrentSessionAttendance);
    }
    
    // Set up event listeners for class management
    const addClassBtn = document.getElementById('add-class-btn');
    
    if (addClassBtn) {
        addClassBtn.addEventListener('click', addNewClass);
    }
    
    // Set up event listeners for attendance viewing
    const loadAttendanceBtn = document.getElementById('load-attendance-btn');
    const attendanceClassSelect = document.getElementById('attendance-class-select');
    
    if (loadAttendanceBtn) {
        loadAttendanceBtn.addEventListener('click', loadAttendanceRecords);
    }
    
    if (attendanceClassSelect) {
        attendanceClassSelect.addEventListener('change', function() {
            loadSessions(this.value);
        });
    }
    
    // Set up debug listeners
    setupDebugListeners();
    
    // Log cookies for debugging
    console.log("Cookies:", document.cookie);
    
    // Check headers to debug CORS issues
    fetch(`${API_URL}/auth/debug-headers`, { 
        credentials: 'include',
        headers: {
            'Cache-Control': 'no-cache'
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log("Debug headers response:", data);
        
        // Don't check for cookies here - let the authentication flow handle this properly
        if (document.cookie) {
            console.log("Cookies found:", document.cookie);
        }
    })
    .catch(error => {
        console.error("Headers debug error:", error);
    });
});

// Function to check authentication status
async function checkAuthStatus() {
  try {
    const response = await fetch(`${API_URL}/auth/check-auth`, {
      method: "GET",
      credentials: "include",
      headers: { 
        "Accept": "application/json",
        "Cache-Control": "no-cache"
      }
    });
    
    if (!response.ok) return false;
    const data = await response.json();
    
    // Remove localStorage fallback entirely
    return data.authenticated && data.user?.role === 'teacher';
    
  } catch (error) {
    console.error("Auth check error:", error);
    return false;
  }
}

// Function to test cookies
async function testCookies() {
    try {
        console.log("Testing cookie functionality...");
        const response = await fetch(`${API_URL}/auth/test-cookie`, {
            method: "GET",
            credentials: "include",
            headers: { "Accept": "application/json" }
        });
        
        console.log("Cookie test response:", response);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Cookie test data:", data);
        
        // Show success in debug message
        const debugMessage = document.getElementById("debug-message");
        if (debugMessage) {
            debugMessage.textContent = `Test cookie set. Session ID: ${data.sessionId}`;
            debugMessage.style.color = "green";
        }
        
        // Now check if we can get the cookie back
        setTimeout(async () => {
            try {
                const checkResponse = await fetch(`${API_URL}/auth/debug-cookies`, {
                    method: "GET",
                    credentials: "include",
                    headers: { "Accept": "application/json" }
                });
                
                if (!checkResponse.ok) {
                    throw new Error(`HTTP error! status: ${checkResponse.status}`);
                }
                
                const checkData = await checkResponse.json();
                console.log("Cookie check data:", checkData);
                
                if (debugMessage) {
                    debugMessage.textContent += `\nCookies found: ${JSON.stringify(checkData.cookies)}`;
                }
            } catch (err) {
                console.error("Cookie check error:", err);
                if (debugMessage) {
                    debugMessage.textContent += `\nCookie check error: ${err.message}`;
                    debugMessage.style.color = "red";
                }
            }
        }, 1000);
        
    } catch (error) {
        console.error("Cookie test error:", error);
        const debugMessage = document.getElementById("debug-message");
        if (debugMessage) {
            debugMessage.textContent = `Cookie test error: ${error.message}`;
            debugMessage.style.color = "red";
        }
    }
}

// Function to check auth status and show debug info
async function checkAuthDebug() {
    const debugMessage = document.getElementById("debug-message");
    if (debugMessage) {
        debugMessage.textContent = "Checking authentication status...";
    }
    
    try {
        // Check auth status
        const authCheck = await fetch(`${API_URL}/auth/check-auth`, {
            method: "GET",
            credentials: "include",
            headers: { "Accept": "application/json" }
        });
        
        const authData = await authCheck.json();
        console.log("Auth status:", authData);
        
        if (debugMessage) {
            debugMessage.textContent = "Auth status: " + JSON.stringify(authData, null, 2);
        }
        
        // Check cookies
        const cookieCheck = await fetch(`${API_URL}/auth/debug-cookies`, {
            method: "GET",
            credentials: "include",
            headers: { "Accept": "application/json" }
        });
        
        const cookieData = await cookieCheck.json();
        console.log("Cookie data:", cookieData);
        
        if (debugMessage) {
            debugMessage.textContent += "\n\nCookie data: " + JSON.stringify(cookieData, null, 2);
        }
        
        // Check headers
        const headerCheck = await fetch(`${API_URL}/auth/debug-headers`, {
            method: "GET",
            credentials: "include",
            headers: { "Accept": "application/json" }
        });
        
        const headerData = await headerCheck.json();
        console.log("Header data:", headerData);
        
        if (debugMessage) {
            debugMessage.textContent += "\n\nHeader data: " + JSON.stringify(headerData, null, 2);
        }
        
    } catch (error) {
        console.error("Debug check error:", error);
        if (debugMessage) {
            debugMessage.textContent = "Error checking auth: " + error.message;
        }
    }
}

// Function that attaches event listeners for debug buttons
function setupDebugListeners() {
    // Debug buttons
    const testCookiesBtn = document.getElementById('test-cookies-btn');
    const checkAuthBtn = document.getElementById('check-auth-btn');
    
    if (testCookiesBtn) {
        testCookiesBtn.addEventListener('click', async function() {
            try {
                const response = await fetch(`${API_URL}/auth/debug-cookies`, {
                    credentials: 'include'
                });
                const data = await response.json();
                
                console.log('Cookie test response:', data);
                alert(`Cookie test: ${JSON.stringify(data)}`);
            } catch (error) {
                console.error('Cookie test error:', error);
                alert(`Error: ${error.message}`);
            }
        });
    }
    
    if (checkAuthBtn) {
        checkAuthBtn.addEventListener('click', async function() {
            try {
                // Use the same authentication approach as the main dashboard init
                const userId = sessionStorage.getItem('userId');
                const userRole = sessionStorage.getItem('userRole');
                const headers = {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                };
                
                // Add user headers if available in sessionStorage as fallback
                if (userId && userRole) {
                    headers['X-User-ID'] = userId;
                    headers['X-User-Role'] = userRole;
                }
                
                const response = await fetch(`${API_URL}/auth/check-auth`, {
                    credentials: 'include',
                    headers: headers
                });
                const data = await response.json();
                
                console.log('Auth check response:', data);
                alert(`Auth check: ${JSON.stringify(data)}`);
            } catch (error) {
                console.error('Auth check error:', error);
                alert(`Error: ${error.message}`);
            }
        });
    }
}

// Initialize dashboard
async function initDashboard() {
  try {
    console.log("Initializing teacher dashboard...");
    
    // Get user info from sessionStorage instead of URL parameters
    const userId = sessionStorage.getItem('userId');
    const userRole = sessionStorage.getItem('userRole');
    const userName = sessionStorage.getItem('userName');
    
    // If no user info in sessionStorage, try to authenticate with the server
    if (!userId || !userRole) {
      console.log("No user info in sessionStorage, checking authentication...");
      
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
        
        // Store user info in sessionStorage
        sessionStorage.setItem('userId', data.user.id);
        sessionStorage.setItem('userRole', data.role);
        sessionStorage.setItem('userName', `${data.user.firstName} ${data.user.lastName}`);
        
        // Update welcome message
        document.getElementById('welcome-message').textContent = `Welcome, ${data.user.firstName} ${data.user.lastName}!`;
        
        // Show teacher section
        document.getElementById('teacher-section').style.display = 'block';
        
        // Load classes
        loadClasses();
        
        // Load recent attendance records
        loadRecentAttendanceRecords();
      } else {
        console.error("Authentication failed, redirecting to login...");
        window.location.href = getBasePath() + '/pages/login.html';
      }
    } else {
      // User info found in sessionStorage
      console.log("User info found in sessionStorage:", { userId, userRole, userName });
      
      // Update welcome message
      document.getElementById('welcome-message').textContent = `Welcome, ${userName}!`;
      
      // Show teacher section
      document.getElementById('teacher-section').style.display = 'block';
      
      // Load classes
      loadClasses();
      
      // Load recent attendance records
      loadRecentAttendanceRecords();
    }
  } catch (error) {
    console.error("Error initializing dashboard:", error);
    showError("Failed to initialize dashboard. Please try again.");
    }
}

// Load classes for the teacher
async function loadClasses() {
    try {
        const classSelect = document.getElementById('class-select');
        const attendanceClassSelect = document.getElementById('attendance-class-select');
        const classesContainer = document.getElementById('classes-container');
        
        if (!classSelect || !attendanceClassSelect || !classesContainer) {
            console.error("Required elements for class loading not found");
            return;
        }
        
        const userId = sessionStorage.getItem('userId');
        console.log(`Fetching classes for user ID: ${userId}`);
        console.log(`Session cookies: ${document.cookie}`);
        
        // Prepare headers with auth information
        const headers = {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
        };
        
        // Only add header auth if no valid cookie exists
        if (!document.cookie.includes('qr_attendance_sid')) {
            const userId = sessionStorage.getItem('userId');
            const userRole = sessionStorage.getItem('userRole');
            if (userId && userRole) {
                headers['X-User-ID'] = userId;
                headers['X-User-Role'] = userRole;
            }
        }
        
        // Try the authenticated endpoint with headers
        let response = await fetch(`${API_URL}/auth/teacher-classes/${userId}`, {
            credentials: 'include',
            headers: headers
        });
        
        console.log(`Classes response status: ${response.status}`);
        
        // If unauthorized or error, retry with explicit header-based auth only
        if (response.status === 401 || response.status >= 500) {
            console.log('Using fallback method to fetch classes via header auth');
            
            // Try again with explicit content type
            response = await fetch(`${API_URL}/auth/teacher-classes/${userId}`, {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache',
                    'X-User-ID': userId,
                    'X-User-Role': userRole
                }
            });
            
            console.log(`Fallback response status: ${response.status}`);
            
            if (response.status === 401 || response.status >= 500) {
                console.error('Both authenticated and direct methods failed');
                classesContainer.innerHTML = `
                    <div class="empty-state error">
                        <p>Authentication failed. Please try logging in again.</p>
                        <button class="btn" id="reloginBtn">Login Again</button>
                    </div>
                `;
                
                document.getElementById('reloginBtn')?.addEventListener('click', () => {
                    logout();
                });
                
                return;
            }
        }
        
        const data = await response.json();
        
        // Clear existing options
        classSelect.innerHTML = '<option value="">Select a class</option>';
        attendanceClassSelect.innerHTML = '<option value="">Select a class</option>';
        
        if (data.success) {
            // Clear existing class list
            classesContainer.innerHTML = '';
            
            if (data.classes && data.classes.length > 0) {
                // Add classes to selects and class list
                data.classes.forEach(cls => {
                    // Add to class select for QR generation
                    const option = document.createElement('option');
                    option.value = cls.id;
                    option.textContent = cls.class_name || cls.name;
                    classSelect.appendChild(option);
                    
                    // Add to attendance class select
                    const attOption = document.createElement('option');
                    attOption.value = cls.id;
                    attOption.textContent = cls.class_name || cls.name;
                    attendanceClassSelect.appendChild(attOption);
                    
                    // Add to class list
                    const classCard = document.createElement('div');
                    classCard.className = 'class-card';
                    classCard.innerHTML = `
                        <h3>${cls.class_name || cls.name}</h3>
                        <p>${cls.subject || 'No subject'}</p>
                        <p class="description">${cls.description || 'No description'}</p>
                        <button class="btn btn-sm btn-danger delete-class" data-id="${cls.id}">Delete</button>
                    `;
                    classesContainer.appendChild(classCard);
                });
                
                // Add event listeners to delete buttons
                document.querySelectorAll('.delete-class').forEach(button => {
                    button.addEventListener('click', async function() {
                        const classId = this.getAttribute('data-id');
                        if (confirm('Are you sure you want to delete this class?')) {
                            await deleteClass(classId);
                        }
                    });
                });
            } else {
                classesContainer.innerHTML = `
                    <div class="empty-state">
                        <p>You haven't created any classes yet.</p>
                        <p>Add your first class using the form below.</p>
                    </div>
                `;
            }
        } else {
            classesContainer.innerHTML = `
                <div class="empty-state error">
                    <p>Failed to load classes: ${data.message || 'Unknown error'}</p>
                    <p>Please try again or contact support.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading classes:', error);
        const classesContainer = document.getElementById('classes-container');
        if (classesContainer) {
            classesContainer.innerHTML = `
            <div class="empty-state error">
                <p>Error loading classes: ${error.message}</p>
                <p>Please check your connection and try again.</p>
            </div>
        `;
        }
    }
}

// Add a new class
async function addNewClass() {
    const className = document.getElementById('class-name').value.trim();
    const classSubject = document.getElementById('subject').value.trim();
    const classDescription = document.getElementById('description').value.trim();
    const statusDiv = document.getElementById('classes-list');
    
    if (!className) {
        statusDiv.innerHTML = '<div class="error-message">Please enter a class name</div>' + statusDiv.innerHTML;
        return;
    }
    
    try {
        statusDiv.innerHTML = '<div class="processing-status">Adding class...</div>' + statusDiv.innerHTML;
        
        const response = await fetch(`${API_URL}/auth/classes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                name: className,
                subject: classSubject,
                description: classDescription
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            statusDiv.innerHTML = '<div class="success-message">Class added successfully!</div>' + statusDiv.innerHTML;
            document.getElementById('class-name').value = '';
            document.getElementById('subject').value = '';
            document.getElementById('description').value = '';
            await loadClasses(); // Reload classes
        } else {
            statusDiv.innerHTML = `<div class="error-message">Error: ${data.message}</div>` + statusDiv.innerHTML;
        }
    } catch (error) {
        console.error('Error adding class:', error);
        statusDiv.innerHTML = '<div class="error-message">Server error. Please try again.</div>' + statusDiv.innerHTML;
    }
}

// Delete a class
async function deleteClass(classId) {
    try {
        const response = await fetch(`${API_URL}/auth/classes/${classId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            await loadClasses(); // Reload classes
        } else {
            alert(`Error: ${data.message}`);
        }
    } catch (error) {
        console.error('Error deleting class:', error);
        alert('Server error. Please try again.');
    }
}

// Load sessions for a class
async function loadSessions(classId) {
    const sessionSelect = document.getElementById('session-select');
    sessionSelect.innerHTML = '<option value="">Select a session</option>';
    
    if (!classId) {
        sessionSelect.innerHTML += '<option disabled>Please select a class first</option>';
        return;
    }
    
    try {
        console.log(`Loading sessions for class ID: ${classId}`);
        
        // Prepare headers with existing auth info
        const headers = { 
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
        };
        
        // Only add header auth if no valid cookie exists
        if (!document.cookie.includes('qr_attendance_sid')) {
            const userId = sessionStorage.getItem('userId');
            const userRole = sessionStorage.getItem('userRole');
            if (userId && userRole) {
                headers['X-User-ID'] = userId;
                headers['X-User-Role'] = userRole;
            }
        }
        
        const response = await fetch(`${API_URL}/auth/class-sessions/${classId}`, {
            method: 'GET',
            credentials: 'include',
            headers: headers
        });
        
        // Handle Unauthorized error specifically
        if (response.status === 401) {
            console.error('Authentication failed when loading sessions');
            sessionSelect.innerHTML += '<option disabled>Authentication failed. Please try logging in again.</option>';
            return;
        }
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Sessions data received:', data);
        
        if (data.success && data.sessions && data.sessions.length > 0) {
            data.sessions.forEach(session => {
                const option = document.createElement('option');
                option.value = session.session_id || session.id; 
                
                // Format date safely with error handling
                let formattedDate = 'Unknown Date';
                try {
                    if (session.created_at) {
                        const sessionDate = new Date(session.created_at);
                        if (!isNaN(sessionDate.getTime())) {
                            formattedDate = sessionDate.toLocaleString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: true
                            });
                        }
                    }
                } catch (dateError) {
                    console.error('Error formatting date:', dateError, session);
                }
                
                option.textContent = `Session #${session.id} - ${formattedDate}`;
                sessionSelect.appendChild(option);
            });
            
            console.log(`Loaded ${data.sessions.length} sessions successfully`);
        } else {
            sessionSelect.innerHTML += '<option disabled>No sessions found</option>';
        }
    } catch (error) {
        console.error('Error loading sessions:', error);
        sessionSelect.innerHTML += `<option disabled>Error loading sessions: ${error.message}</option>`;
    }
}

// Load attendance records for a session
async function loadAttendanceRecords() {
    const sessionId = document.getElementById('session-select').value;
    const recordsDiv = document.getElementById('attendance-records');
    
    if (!sessionId) {
        recordsDiv.innerHTML = '<div class="error-message">Please select a session</div>';
        return;
    }
    
    try {
        recordsDiv.innerHTML = '<p>Loading attendance records...</p>';
        console.log(`Loading attendance for session ID: ${sessionId}`);
        
        // Include both cookie-based and header-based auth
        const headers = { 
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
        };
        
        // Add fallback header auth
        const userId = sessionStorage.getItem('userId');
        const userRole = sessionStorage.getItem('userRole');
        if (userId && userRole) {
            headers['X-User-ID'] = userId;
            headers['X-User-Role'] = userRole;
        }
        
        const response = await fetch(`${API_URL}/teacher/attendance/${sessionId}`, {
            method: 'GET',
            credentials: 'include',
            headers: headers
        });
        
        // Handle Unauthorized error specifically
        if (response.status === 401) {
            console.error('Authentication failed when loading attendance records');
            recordsDiv.innerHTML = '<div class="error-message">Authentication failed. Please try logging in again.</div>';
            return;
        }
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Attendance data received:', data);
        
        if (data.success) {
            if (!data.attendanceRecords || data.attendanceRecords.length === 0) {
                recordsDiv.innerHTML = '<p class="empty-message">No attendance records found for this session.</p>';
                return;
            }
            
            // Create attendance table
            let tableHTML = `
                <table class="attendance-table">
                    <thead>
                        <tr>
                            <th>Student ID</th>
                            <th>Student Name</th>
                            <th>Date & Time</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            data.attendanceRecords.forEach(record => {
                // Format time safely with error handling for UTC+8 time
                let timeDisplay = 'Unknown Time';
                try {
                    if (record.timestamp) {
                        // The server is already providing UTC+8 time, so we can parse directly
                        const recordTime = new Date(record.timestamp);
                        if (!isNaN(recordTime.getTime())) {
                            // Format with date and time for complete information
                            timeDisplay = recordTime.toLocaleString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: true
                            });
                        }
                    }
                } catch (timeError) {
                    console.error('Error formatting time:', timeError, record);
                }
                
                tableHTML += `
                    <tr>
                        <td>${record.student_number || record.student_id || 'Unknown'}</td>
                        <td>${record.student_name || 'Unknown'}</td>
                        <td>${timeDisplay}</td>
                    </tr>
                `;
            });
            
            tableHTML += `
                    </tbody>
                </table>
            `;
            
            recordsDiv.innerHTML = tableHTML;
        } else {
            recordsDiv.innerHTML = `<div class="error-message">Error: ${data.message || 'Failed to load attendance records'}</div>`;
        }
    } catch (error) {
        console.error('Error loading attendance records:', error);
        recordsDiv.innerHTML = `<div class="error-message">Server error: ${error.message}. Please try again.</div>`;
    }
}

// View attendance for the current session
async function viewCurrentSessionAttendance() {
    try {
        const currentSessionId = sessionStorage.getItem('currentQrSessionId');
    
    if (!currentSessionId) {
            alert('No active session. Please generate a QR code first.');
        return;
    }
    
        // Switch to the attendance view
        const viewAttendanceBtn = document.getElementById('view-attendance-btn');
        if (viewAttendanceBtn) {
            viewAttendanceBtn.click();
        } else {
            // If button not found, show the attendance section directly
            document.getElementById('qr-section').style.display = 'none';
            document.getElementById('classes-section').style.display = 'none';
            document.getElementById('attendance-section').style.display = 'block';
            
            // Also update active class in navigation
            document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
            document.querySelector('#view-attendance-btn').classList.add('active');
        }
    
        // Set the class select to match the current session
        const classId = document.getElementById('class-select').value;
        document.getElementById('attendance-class-select').value = classId;
    
    // Load sessions for this class
    await loadSessions(classId);
    
        // Set the session select to the current session
        document.getElementById('session-select').value = currentSessionId;
        
        // Load attendance records for this session
        await loadAttendanceRecords();
        
    } catch (error) {
        console.error('Error viewing current attendance:', error);
        alert('Error loading current attendance data. Please try again.');
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
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Redirect to login page
    window.location.href = getBasePath() + '/pages/login.html';
    } catch (error) {
        console.error('Logout error:', error);
    // Even if the server request fails, clear local storage and redirect
    sessionStorage.clear();
    window.location.href = getBasePath() + '/pages/login.html';
  }
}

// Helper function to get base path - same as in login.js
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

// Event listener for attendance class select
document.addEventListener('DOMContentLoaded', function() {
    const attendanceClassSelect = document.getElementById('attendance-class-select');
    attendanceClassSelect.addEventListener('change', function() {
        loadSessions(this.value);
    });
}); 

// Function to load recent attendance records
async function loadRecentAttendanceRecords() {
    const tableBody = document.querySelector('#recent-attendance-table tbody');
    if (!tableBody) return;
    
    // Show loading state
    tableBody.innerHTML = '<tr><td colspan="3" class="text-center">Loading recent attendance records...</td></tr>';
    
    try {
        const teacherId = sessionStorage.getItem('userId');
        if (!teacherId) {
            console.error('Teacher ID not found in session storage');
            return;
        }
        
        // Prepare headers with auth information
        const headers = {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
        };
        
        // Add fallback header auth
        const userId = sessionStorage.getItem('userId');
        const userRole = sessionStorage.getItem('userRole');
        if (userId && userRole) {
            headers['X-User-ID'] = userId;
            headers['X-User-Role'] = userRole;
        }
        
        // Updated endpoint to match the backend route pattern
        const response = await fetch(`${API_URL}/auth/recent-attendance-summary`, {
            method: 'GET',
            credentials: 'include',
            headers: headers
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch attendance records: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.records && data.records.length > 0) {
            displayAttendanceRecords(data.records);
        } else {
            tableBody.innerHTML = '<tr><td colspan="3" class="text-center">No attendance records found</td></tr>';
        }
    } catch (error) {
        console.error('Error fetching recent attendance records:', error);
        tableBody.innerHTML = `<tr><td colspan="3" class="text-center">Error loading records: ${error.message}</td></tr>`;
    }
}

function displayAttendanceRecords(records) {
    const tableBody = document.querySelector('#recent-attendance-table tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    records.forEach(record => {
        const row = document.createElement('tr');
        
        // Format date to be more readable
        const dateObj = new Date(record.attendance_date);
        const formattedDate = dateObj.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
        
        row.innerHTML = `
            <td>${record.class_name}</td>
            <td>${formattedDate}</td>
            <td>${record.present_count}</td>
        `;
        
        tableBody.appendChild(row);
    });
} 
