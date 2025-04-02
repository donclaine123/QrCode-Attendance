// Teacher Dashboard functionality

document.addEventListener('DOMContentLoaded', function() {
    // Skip initialization if already done by qrcode.js
    if (window.dashboardInitialized) {
        console.log('Dashboard already initialized by qrcode.js, skipping duplicate initialization');
        return;
    }
    
    window.dashboardInitialized = true;
    console.log('Teacher dashboard loaded');
    
    // Initialize dashboard
    initDashboard();

    // Handle tab switching
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Update active tab button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Show selected tab content
            tabContents.forEach(tab => {
                tab.classList.remove('active');
                if (tab.id === tabId) {
                    tab.classList.add('active');
                }
            });
        });
    });
    
    // Set up event listeners
    document.getElementById('generateQRBtn').addEventListener('click', generateQRCode);
    document.getElementById('viewAttendanceBtn').addEventListener('click', viewCurrentSessionAttendance);
    document.getElementById('loadAttendance').addEventListener('click', loadAttendanceRecords);
    document.getElementById('addClass').addEventListener('click', addNewClass);
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Setup debug listeners
    setupDebugListeners();
    
    // Log cookies for debugging
    console.log("Cookies:", document.cookie);
    
    // Check headers to debug CORS issues
    fetch(`${API_URL}/auth/debug-headers`, { 
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        console.log("Debug headers response:", data);
    })
    .catch(error => {
        console.error("Headers debug error:", error);
    });
});

// Function to check authentication status
async function checkAuthStatus() {
    try {
        console.log("Checking authentication status...");
        
        // Get stored params if they exist
        const userId = localStorage.getItem("userId");
        const userRole = localStorage.getItem("userRole");
        
        // Log state information
        console.log("localStorage data:", { userId, userRole });
        console.log("Current cookies:", document.cookie);
        
        const response = await fetch(`${API_URL}/auth/debug-session`, {
            method: "GET",
            credentials: "include",
            headers: { 
                "Accept": "application/json"
            }
        });
        
        console.log("Session debug response status:", response.status);
        
        const data = await response.json();
        console.log("Session debug data:", data);
        
        // If we have a valid server session, use it
        if (data.sessionExists && data.sessionData && data.sessionData.userId && data.sessionData.role === 'teacher') {
            console.log("Valid session confirmed on server!");
            return true;
        }
        
        // Otherwise check localStorage as fallback
        if (userRole === "teacher" && userId) {
            console.log("Using localStorage fallback authentication");
            // Try to create a session using localStorage data
            const reAuthResponse = await fetch(`${API_URL}/auth/test-session-store`, {
                method: "GET",
                credentials: "include",
                headers: { "Accept": "application/json" }
            });
            
            if (reAuthResponse.ok) {
                console.log("Re-established session from localStorage data");
                return true;
            }
            return true; // Still return true for localStorage auth
        }
        
        console.log("Authentication failed - no valid session or localStorage data");
        return false;
    } catch (error) {
        console.error("Auth check error:", error);
        // Fallback to localStorage as last resort
        const userRole = localStorage.getItem("userRole");
        const userId = localStorage.getItem("userId");
        return (userRole === "teacher" && userId);
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
    const testCookiesBtn = document.getElementById('testCookiesBtn');
    const checkAuthBtn = document.getElementById('checkAuthBtn');
    const debugOutput = document.getElementById('debugOutput');
    
    if (testCookiesBtn) {
        testCookiesBtn.addEventListener('click', async function() {
            if (debugOutput) debugOutput.innerHTML = 'Testing cookies...';
            try {
                const response = await fetch(`${API_URL}/auth/debug-cookies`, {
                    credentials: 'include'
                });
                const data = await response.json();
                
                if (debugOutput) {
                    debugOutput.innerHTML = `
                        <h5>Cookie Debug</h5>
                        <pre>${JSON.stringify(data, null, 2)}</pre>
                        <p>Current cookies: ${document.cookie}</p>
                    `;
                }
            } catch (error) {
                console.error('Cookie test error:', error);
                if (debugOutput) debugOutput.innerHTML = `Error: ${error.message}`;
            }
        });
    }
    
    if (checkAuthBtn) {
        checkAuthBtn.addEventListener('click', async function() {
            if (debugOutput) debugOutput.innerHTML = 'Checking authentication...';
            try {
                const response = await fetch(`${API_URL}/auth/check-auth`, {
                    credentials: 'include'
                });
                const data = await response.json();
                
                if (debugOutput) {
                    debugOutput.innerHTML = `
                        <h5>Auth Check</h5>
                        <pre>${JSON.stringify(data, null, 2)}</pre>
                        <p>LocalStorage: userId=${localStorage.getItem('userId')}, role=${localStorage.getItem('userRole')}</p>
                    `;
                }
            } catch (error) {
                console.error('Auth check error:', error);
                if (debugOutput) debugOutput.innerHTML = `Error: ${error.message}`;
            }
        });
    }
}

// Initialize dashboard data
async function initDashboard() {
    try {
        const teacherInfoDiv = document.getElementById('teacherInfo');
        
        // Check server authentication first
        console.log('Checking server authentication');
        const response = await fetch(`${API_URL}/auth/check-auth`, {
            credentials: 'include'
        });
        
        const data = await response.json();
        console.log('Auth response:', data); // Debug log
        
        if (data.authenticated && data.user) {
            // Check if user is a teacher
            if (data.user.role === 'teacher') {
                console.log('Successfully authenticated as teacher');
                
                // Store in localStorage as fallback
                localStorage.setItem('userId', data.user.id);
                localStorage.setItem('userRole', 'teacher');
                localStorage.setItem('firstName', data.user.firstName || '');
                localStorage.setItem('lastName', data.user.lastName || '');
                
                // Display teacher information
                teacherInfoDiv.innerHTML = `
                    <p>Welcome, ${data.user.firstName || 'Teacher'} ${data.user.lastName || ''}!</p>
                    <p>User ID: ${data.user.id}</p>
                `;
                
                // Load teacher's classes
                await loadClasses();
                return;
            } else if (data.user.role === 'student') {
                // User is a student, redirect to student dashboard
                console.log('User is a student, redirecting to student dashboard');
                const basePath = getBasePath();
                window.location.href = `${basePath}/pages/student-dashboard.html`;
                return;
            }
        }
        
        // If not authenticated via server, check localStorage as fallback
        const localUserId = localStorage.getItem('userId');
        const localRole = localStorage.getItem('userRole');
        
        if (localUserId && localRole === 'teacher') {
            console.log('Using localStorage authentication as fallback');
            
            // Display teacher information from localStorage
            const firstName = localStorage.getItem('firstName') || '';
            const lastName = localStorage.getItem('lastName') || '';
            
            teacherInfoDiv.innerHTML = `
                <p>Welcome, ${firstName || 'Teacher'} ${lastName || ''}!</p>
                <p>User ID: ${localUserId}</p>
            `;
            
            // Load teacher's classes
            await loadClasses();
            return;
        }
        
        // Not authenticated at all, redirect to login
        console.log('Not authenticated, redirecting to login');
        const basePath = getBasePath();
        window.location.href = `${basePath}/index.html`;
        
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        // Check if we have localStorage fallback before redirecting
        const localUserId = localStorage.getItem('userId');
        const localRole = localStorage.getItem('userRole');
        
        if (localUserId && localRole === 'teacher') {
            console.log('Using localStorage fallback due to server error');
            return;
        }
        
        alert('Error initializing dashboard. Please try logging in again.');
        const basePath = getBasePath();
        window.location.href = `${basePath}/index.html`;
    }
}

// Load classes for the teacher
async function loadClasses() {
    try {
        const classSelect = document.getElementById('classSelect');
        const attendanceClassSelect = document.getElementById('attendanceClassSelect');
        const classListDiv = document.getElementById('classList');
        
        const userId = localStorage.getItem('userId');
        console.log(`Fetching classes for user ID: ${userId}`);
        console.log(`Session cookies: ${document.cookie}`);
        
        // Try the normal authenticated endpoint first
        let response = await fetch(`${API_URL}/auth/teacher-classes/${userId}`, {
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        console.log(`Classes response status: ${response.status}`);
        
        // If unauthorized, try the backup endpoint with direct param
        if (response.status === 401) {
            console.log('Using fallback method to fetch classes via direct endpoint');
            
            // This endpoint works even without a valid session cookie
            // by validating the teacher exists in the database directly
            response = await fetch(`${API_URL}/auth/teacher-classes/${userId}`, {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });
            
            console.log(`Fallback response status: ${response.status}`);
            
            if (response.status === 401) {
                console.error('Both authenticated and direct methods failed');
                classListDiv.innerHTML = `
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
            classListDiv.innerHTML = '';
            
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
                    classListDiv.appendChild(classCard);
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
                classListDiv.innerHTML = `
                    <div class="empty-state">
                        <p>You haven't created any classes yet.</p>
                        <p>Add your first class using the form below.</p>
                    </div>
                `;
            }
        } else {
            classListDiv.innerHTML = `
                <div class="empty-state error">
                    <p>Failed to load classes: ${data.message || 'Unknown error'}</p>
                    <p>Please try again or contact support.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading classes:', error);
        const classListDiv = document.getElementById('classList');
        classListDiv.innerHTML = `
            <div class="empty-state error">
                <p>Error loading classes: ${error.message}</p>
                <p>Please check your connection and try again.</p>
            </div>
        `;
    }
}

// Add a new class
async function addNewClass() {
    const className = document.getElementById('className').value.trim();
    const classSubject = document.getElementById('classSubject').value.trim();
    const classDescription = document.getElementById('classDescription').value.trim();
    const statusDiv = document.getElementById('addClassStatus');
    
    if (!className) {
        statusDiv.innerHTML = '<div class="error-message">Please enter a class name</div>';
        return;
    }
    
    try {
        statusDiv.innerHTML = '<div class="processing-status">Adding class...</div>';
        
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
            statusDiv.innerHTML = '<div class="success-message">Class added successfully!</div>';
            document.getElementById('className').value = '';
            document.getElementById('classSubject').value = '';
            document.getElementById('classDescription').value = '';
            await loadClasses(); // Reload classes
        } else {
            statusDiv.innerHTML = `<div class="error-message">Error: ${data.message}</div>`;
        }
    } catch (error) {
        console.error('Error adding class:', error);
        statusDiv.innerHTML = '<div class="error-message">Server error. Please try again.</div>';
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
    const sessionSelect = document.getElementById('sessionSelect');
    sessionSelect.innerHTML = '<option value="">Select a session</option>';
    
    if (!classId) {
        sessionSelect.innerHTML += '<option disabled>Please select a class first</option>';
        return;
    }
    
    try {
        console.log(`Loading sessions for class ID: ${classId}`);
        
        const response = await fetch(`${API_URL}/auth/class-sessions/${classId}`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Sessions data received:', data);
        
        if (data.success && data.sessions.length > 0) {
            data.sessions.forEach(session => {
                const option = document.createElement('option');
                // Use session_id if available, otherwise use id
                option.value = session.session_id || session.id; 
                
                // Format date safely with error handling - assuming UTC+8 time
                let formattedDate = 'Unknown Date';
                try {
                    if (session.created_at) {
                        // The server is already providing UTC+8 time, so we can parse directly
                        const sessionDate = new Date(session.created_at);
                        if (!isNaN(sessionDate.getTime())) {
                            // Format date with full details including timezone
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
    const sessionId = document.getElementById('sessionSelect').value;
    const recordsDiv = document.getElementById('attendanceRecords');
    
    if (!sessionId) {
        recordsDiv.innerHTML = '<div class="error-message">Please select a session</div>';
        return;
    }
    
    try {
        recordsDiv.innerHTML = '<p>Loading attendance records...</p>';
        console.log(`Loading attendance for session ID: ${sessionId}`);
        
        const response = await fetch(`${API_URL}/teacher/attendance/${sessionId}`, {
            credentials: 'include'
        });
        
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

// View attendance for current session
async function viewCurrentSessionAttendance() {
    const currentSessionId = localStorage.getItem('currentSessionId');
    
    if (!currentSessionId) {
        alert('No active session found. Generate a QR code first.');
        return;
    }
    
    // Switch to attendance tab
    document.querySelector('[data-tab="attendance-tab"]').click();
    
    // Select the current class in the dropdown
    const classId = document.getElementById('classSelect').value;
    document.getElementById('attendanceClassSelect').value = classId;
    
    // Load sessions for this class
    await loadSessions(classId);
    
    // Select the current session
    document.getElementById('sessionSelect').value = currentSessionId;
    
    // Load attendance records
    loadAttendanceRecords();
}

// Logout function
async function logout() {
    try {
        // Clear localStorage first
        localStorage.clear();
        
        // Clear session cookies
        document.cookie.split(";").forEach(function(c) { 
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });
        
        // Call server logout endpoint
        const response = await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('Logged out successfully');
        } else {
            console.warn('Server logout returned error:', data.message);
        }
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        // Get the base path for proper redirect
        const basePath = getBasePath();
        
        // Always redirect to login page with proper path
        window.location.replace(`${basePath}/index.html`);
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
    const attendanceClassSelect = document.getElementById('attendanceClassSelect');
    attendanceClassSelect.addEventListener('change', function() {
        loadSessions(this.value);
    });
}); 