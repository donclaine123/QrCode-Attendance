// Teacher Dashboard functionality

// --- Role Check --- 
(function() {
    const userId = sessionStorage.getItem('userId');
    const userRole = sessionStorage.getItem('userRole');
    const expectedRole = 'teacher'; // Role expected for this page

    console.log(`[Role Check - Teacher] Found Role: ${userRole}`);

    if (!userId || userRole !== expectedRole) {
        console.warn(`[Role Check - Teacher] Access denied. Role is ${userRole}, expected ${expectedRole}. Redirecting to login.`);
        // Clear potentially incorrect session data before redirecting
        sessionStorage.clear(); 
        // Use getBasePath if available, otherwise assume root or relative path
        const basePath = typeof getBasePath === 'function' ? getBasePath() : ''; 
        window.location.href = basePath + '/pages/login.html'; // Redirect to main login page
    }
})();
// --- End Role Check --- 

// Remove specific DOMContentLoaded logs if too noisy
// document.addEventListener('DOMContentLoaded', function() {
//     console.log('[TeacherDashboard] DOMContentLoaded - Attaching listeners...');
// ...
// });

let recentAttendanceIntervalId = null; // Variable to hold the interval ID
let viewAttendanceIntervalId = null; // OLD: Interval ID for specific session view (no longer used for polling)
let currentViewSessionId = null; // NEW: Store the ID of the session being viewed

document.addEventListener('DOMContentLoaded', function() {
    console.log('Teacher dashboard initializing...');
    initDashboard();

    // Start polling for recent attendance records every 10 seconds
    // Clear any existing interval first (safety measure)
    if (recentAttendanceIntervalId) {
        clearInterval(recentAttendanceIntervalId);
    }
   
    console.log(`Polling for recent attendance started (Interval ID: ${recentAttendanceIntervalId})`);

    // Check if the specific listener *for attendance class select* has already been attached 
    // (e.g., by qrcode.js if it loaded first and attached it - although it shouldn't anymore)
    // This is a more granular check than the broad flag.
    const attendanceClassSelect = document.getElementById('attendance-class-select');
    if (attendanceClassSelect && !attendanceClassSelect.dataset.listenerAttached) {
        console.log('[TeacherDashboard] Attaching CHANGE listener to #attendance-class-select');
        attendanceClassSelect.addEventListener('change', function() {
            console.log('[TeacherDashboard] #attendance-class-select CHANGE event fired. Value:', this.value);
            // --- STOP POLLING VIEW ATTENDANCE --- 
            if (viewAttendanceIntervalId) {
                clearInterval(viewAttendanceIntervalId);
                viewAttendanceIntervalId = null;
                console.log('[TeacherDashboard] Stopped specific session polling due to class change.');
            }
            // --- END STOP POLLING ---
            loadSessions(this.value);
            const attendanceRecordsDiv = document.getElementById('attendance-records');
            if(attendanceRecordsDiv) attendanceRecordsDiv.innerHTML = ''; 
        });
        attendanceClassSelect.dataset.listenerAttached = 'true'; // Mark as attached
    } else if (attendanceClassSelect) {
        console.log('[TeacherDashboard] CHANGE listener already attached to #attendance-class-select.');
    }

    // Attach other listeners unconditionally as they are specific to this dashboard
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
    
    // Attach sidebar navigation listeners
    console.log('[TeacherDashboard] Attaching listeners to .nav-link elements');
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
            
            // Show/hide sections based on clicked link ID
            const overview = document.getElementById('dashboard-overview');
            const qrSection = document.getElementById('qr-section');
            const classesSection = document.getElementById('classes-section');
            const attendanceSection = document.getElementById('attendance-section');
            const pageTitle = document.querySelector('.page-title'); // Get the title element
            const pageSubtitle = document.querySelector('.page-subtitle'); // Get the subtitle element

            if (overview) overview.style.display = (this.id === 'dashboard-nav') ? 'block' : 'none';
            if (qrSection) qrSection.style.display = (this.id === 'generate-qr-btn') ? 'block' : 'none';
            if (classesSection) classesSection.style.display = (this.id === 'manage-classes-btn') ? 'block' : 'none';
            if (attendanceSection) attendanceSection.style.display = (this.id === 'view-attendance-btn') ? 'block' : 'none';

            // Show/hide the title and subtitle based on the active section
            const isQrSectionActive = this.id === 'generate-qr-btn';
            if (pageTitle) pageTitle.style.display = isQrSectionActive ? 'block' : 'none';
            if (pageSubtitle) pageSubtitle.style.display = isQrSectionActive ? 'block' : 'none';
        });
    });
    
    // Attach session select listener (now safe to attach here)
    const sessionSelect = document.getElementById('session-select'); 
    if (sessionSelect && !sessionSelect.dataset.listenerAttached) {
        console.log('[TeacherDashboard] Attaching CHANGE listener to #session-select');
        sessionSelect.addEventListener('change', async function() {
            // --- STOP POLLING VIEW ATTENDANCE --- 
            if (viewAttendanceIntervalId) {
                clearInterval(viewAttendanceIntervalId);
                viewAttendanceIntervalId = null;
                console.log('[TeacherDashboard] Stopped specific session polling due to date change.');
            }
            // --- END STOP POLLING ---
            
            const attendanceRecordsDiv = document.getElementById('attendance-records');
            const sectionChoicesDiv = document.getElementById('section-choices');
            const sectionButtonsContainer = document.getElementById('section-buttons-container');
            
            // Clear previous attendance and section choices
            if (attendanceRecordsDiv) attendanceRecordsDiv.innerHTML = '';
            
            // --- Show Loading State for Sections --- 
            if (sectionButtonsContainer) {
                 sectionButtonsContainer.innerHTML = '<p class="loading-indicator">Loading sections...</p>';
            }
            if (sectionChoicesDiv) sectionChoicesDiv.style.display = 'block'; // Show the container
            // --- End Loading State ---

            const selectedOption = this.options[this.selectedIndex];
            const classId = document.getElementById('attendance-class-select').value;
            const sessionDate = selectedOption.getAttribute('data-session-date');

            if (this.value && classId && sessionDate) { 
                console.log(`Session selected. Fetching sections for Class ${classId} on Date ${sessionDate}`);
                try {
                    const response = await fetch(`${API_URL}/auth/sessions-on-date?classId=${classId}&date=${sessionDate}`, {
                        method: 'GET',
                        credentials: 'include',
                        headers: {
                            'Accept': 'application/json',
                            'Cache-Control': 'no-cache'
                        }
                    });
                    
                    if (!response.ok) {
                         throw new Error(`Failed to fetch sections: ${response.status}`);
                     }
                     
                     const data = await response.json();
                     console.log("Sections data:", data);
                     
                     // --- Populate Sections or Show Message --- 
                     if (sectionButtonsContainer) sectionButtonsContainer.innerHTML = ''; // Clear loading message
                     if (data.success && data.sections && data.sections.length > 0) {
                         if (sectionChoicesDiv) sectionChoicesDiv.style.display = 'block';
                         
                         data.sections.forEach(sec => {
                             const button = document.createElement('button');
                             button.textContent = sec.section || 'No Section';
                             button.className = 'btn btn-secondary section-choice-btn';
                             button.setAttribute('data-session-id', sec.session_id);
                             
                             // --- MODIFIED: Clear view attendance interval on SECTION button click ---
                             button.addEventListener('click', function() {
                                 // --- STOP POLLING VIEW ATTENDANCE (Keep this for safety) ---
                                 if (viewAttendanceIntervalId) {
                                     clearInterval(viewAttendanceIntervalId);
                                     viewAttendanceIntervalId = null;
                                     // console.log('[TeacherDashboard] Stopped specific session polling due to section button click.'); // Log not needed
                                 }
                                 // --- END STOP POLLING ---
                                 
                                 const specificSessionId = this.getAttribute('data-session-id');
                                 currentViewSessionId = specificSessionId; // Store the current session ID
                                 console.log(`Loading attendance for selected section's session ID: ${specificSessionId}`);
                                 loadAttendanceRecords(specificSessionId); 
                             });
                             
                             if (sectionButtonsContainer) sectionButtonsContainer.appendChild(button);
                         });
                         
                     } else {
                         if (sectionChoicesDiv) sectionChoicesDiv.style.display = 'block'; // Still show container
                         if (sectionButtonsContainer) sectionButtonsContainer.innerHTML = '<p class="empty-message">No attendance sections found for this date.</p>';
                         if (attendanceRecordsDiv) attendanceRecordsDiv.innerHTML = ''; // Clear any previous records
                     }
                } catch (error) {
                    console.error('Error fetching sections:', error);
                    // --- Show Section Fetch Error --- 
                    if (sectionButtonsContainer) {
                        sectionButtonsContainer.innerHTML = `<p class="error-message">Error loading sections: ${error.message}</p>`;
                    }
                    if (sectionChoicesDiv) sectionChoicesDiv.style.display = 'block'; // Show container even on error
                }
            }
        });
        sessionSelect.dataset.listenerAttached = 'true';
    } else if (sessionSelect) {
         console.log('[TeacherDashboard] CHANGE listener already attached to #session-select.');
    }

    // Initialize the dashboard logic (fetches user data, classes, etc.) if not already done
    if (!window.dashboardInitialized) { 
        console.log('[TeacherDashboard] Initializing dashboard logic (initDashboard)...');
        initDashboard(); // This function internally shows #teacher-section on success
        window.dashboardInitialized = true; 
    } else {
        console.log ('[TeacherDashboard] Dashboard logic already initialized by another script.');
        // Manually show the main container if initDashboard was skipped but we have user info
        // This ensures the container is visible even if qrcode.js initialized first.
        if (sessionStorage.getItem('userId') && sessionStorage.getItem('userRole') === 'teacher') {
             const teacherSection = document.getElementById('teacher-section');
             if(teacherSection) {
                 console.log('[TeacherDashboard] Manually showing #teacher-section because initDashboard was skipped.');
                 teacherSection.style.display = 'block';
             } else {
                 console.error('[TeacherDashboard] Cannot manually show #teacher-section, element not found.');
             }
             // Also ensure welcome message is updated if initDashboard was skipped
             const userName = sessionStorage.getItem('userName');
             const welcomeMsg = document.getElementById('welcome-message');
             if(welcomeMsg && userName) {
                welcomeMsg.textContent = `Welcome, ${userName}!`;
             }
             // We might also need to trigger loadClasses and loadRecentAttendanceRecords here
             // if they weren't called by qrcode.js's initialization.
             // Let's add them just in case, guarded by checks.
             if (document.getElementById('class-select')) loadClasses();
             if (document.getElementById('recent-attendance-table')) loadRecentAttendanceRecords();
        } else {
             console.log('[TeacherDashboard] Skipping manual show of #teacher-section, user info not in session storage.');
             // Optional: redirect to login if no user info is found here either?
             // window.location.href = getBasePath() + '/pages/login.html';
        }
    }
    
    // Ensure initial view is correct (Dashboard overview) - Runs Unconditionally
    console.log('[TeacherDashboard] Setting initial section visibility within #teacher-section.');
    const overview = document.getElementById('dashboard-overview');
    const qrSection = document.getElementById('qr-section');
    const classesSection = document.getElementById('classes-section');
    const attendanceSection = document.getElementById('attendance-section');
    if (overview) overview.style.display = 'block';
    if (qrSection) qrSection.style.display = 'none';
    if (classesSection) classesSection.style.display = 'none';
    if (attendanceSection) attendanceSection.style.display = 'none';
    // Set initial active nav link
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.getElementById('dashboard-nav')?.classList.add('active');

    // Set up event listeners for dashboard actions
    const generateQrBtn = document.getElementById('generate-qr-btn');
    const manageClassesBtn = document.getElementById('manage-classes-btn');
    const viewAttendanceBtn = document.getElementById('view-attendance-btn');
    const dashboardNav = document.getElementById('dashboard-nav');
    
    if (dashboardNav) {
        dashboardNav.addEventListener('click', function() {
            // Show dashboard overview, hide other sections
            document.getElementById('dashboard-overview').style.display = 'block';
            document.getElementById('qr-section').style.display = 'none';
            document.getElementById('classes-section').style.display = 'none';
            document.getElementById('attendance-section').style.display = 'none';
        });
    }
    
    if (generateQrBtn) {
        generateQrBtn.addEventListener('click', function() {
            document.getElementById('dashboard-overview').style.display = 'none'; // Hide overview
            document.getElementById('qr-section').style.display = 'block';
            document.getElementById('classes-section').style.display = 'none';
            document.getElementById('attendance-section').style.display = 'none';
        });
    }
    
    if (manageClassesBtn) {
        manageClassesBtn.addEventListener('click', function() {
            document.getElementById('dashboard-overview').style.display = 'none'; // Hide overview
            document.getElementById('qr-section').style.display = 'none';
            document.getElementById('classes-section').style.display = 'block';
            document.getElementById('attendance-section').style.display = 'none';
        });
    }
    
    if (viewAttendanceBtn) {
        viewAttendanceBtn.addEventListener('click', function() {
            document.getElementById('dashboard-overview').style.display = 'none'; // Hide overview
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

    // Add event listener for the Refresh Attendance button
    const refreshBtn = document.getElementById('refresh-attendance-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            if (currentViewSessionId) {
                console.log(`Refreshing attendance for session ID: ${currentViewSessionId}`);
                loadAttendanceRecords(currentViewSessionId); // Reload using the stored ID
            } else {
                console.log('Refresh button clicked, but no session is currently selected/viewed.');
                // Optional: Show a small message to the user
                const recordsDiv = document.getElementById('attendance-records');
                if (recordsDiv && !recordsDiv.querySelector('table')) { // Only show if no records are displayed
                    recordsDiv.innerHTML = '<p class="info-message">Please select a class, date, and section first.</p>';
                }
            }
        });
    }

    // Add event listener for the Refresh Recent Attendance button
    const refreshRecentBtn = document.getElementById('refresh-recent-attendance-btn');
    if (refreshRecentBtn) {
        refreshRecentBtn.addEventListener('click', function() {
            console.log('Refreshing recent attendance records...');
            loadRecentAttendanceRecords();
        });
    }
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
    console.log("Initializing Teacher Dashboard...");
    // ... (existing code to get userId, userRole, welcome message) ...
    const userId = sessionStorage.getItem('userId');
    const userRole = sessionStorage.getItem('userRole');
    const userName = sessionStorage.getItem('userName'); // Get userName
    const welcomeMessage = document.getElementById('welcome-message');
    const teacherSection = document.getElementById('teacher-section');

    if (welcomeMessage && userRole === 'teacher') {
        welcomeMessage.textContent = `Welcome, ${userName || 'Teacher'}! Manage your classes and attendance here.`;
    }

    if (teacherSection && userRole === 'teacher') {
        teacherSection.style.display = 'block';
        console.log("Teacher section displayed");

        try {
            console.log("Loading classes...");
            await loadClasses(); 
            console.log("Loading recent attendance...");
            await loadRecentAttendanceRecords(); 
            console.log("Loading active QR sessions...");
            await loadActiveQrSessions(); // 📌 Call the new function here
            console.log("Setting up navigation...");
            // setupDashboardNavigation(); // 📌 Commented out - Function not defined and logic handled by listeners
            console.log("Dashboard initialization complete.");
        } catch (error) {
            console.error("Error during dashboard initialization:", error);
            if (welcomeMessage) {
                 welcomeMessage.textContent = 'Error loading dashboard components. Please refresh.';
            }
        }

    } else if (userRole !== 'teacher') {
        console.warn('User is not a teacher, hiding teacher section.');
        if (welcomeMessage) {
             welcomeMessage.textContent = 'Access denied. Teacher role required.';
        }
        // Optionally redirect or disable features
    } else {
        console.error('Teacher section element not found.');
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

// Load sessions (now distinct dates) for a class
async function loadSessions(classId) {
    const sessionSelect = document.getElementById('session-select');
    const sectionChoicesDiv = document.getElementById('section-choices');
    const sectionButtonsContainer = document.getElementById('section-buttons-container');
    const recordsDiv = document.getElementById('attendance-records');

    // --- Show Loading State for Dates --- 
    sessionSelect.innerHTML = '<option value="" disabled selected>Loading dates...</option>';
    sessionSelect.disabled = true;
    if (sectionButtonsContainer) sectionButtonsContainer.innerHTML = ''; // Clear previous sections
    if (sectionChoicesDiv) sectionChoicesDiv.style.display = 'none'; // Hide section choices
    if (recordsDiv) recordsDiv.innerHTML = ''; // Clear previous records
    // --- End Loading State ---
    
    if (!classId) {
        sessionSelect.innerHTML = '<option disabled selected>Please select a class first</option>';
        // Keep disabled
        return;
    }
    
    try {
        console.log(`Loading DISTINCT DATES for class ID: ${classId}`);

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
        console.log('Distinct dates data received:', data);
        
        // --- Populate Dates or Show No Dates --- 
        sessionSelect.innerHTML = '<option value="" disabled selected>Select date</option>'; // Reset placeholder
        if (data.success && data.dates && data.dates.length > 0) {
            data.dates.forEach(dateStr => { // Iterate through date strings
                const option = document.createElement('option');
                option.value = dateStr; // Value is the YYYY-MM-DD date string

                // Format date for display (e.g., "Apr 5, 2025")
                let displayDate = 'Unknown Date';
                try {
                   const dateObj = new Date(dateStr + 'T00:00:00'); // Add time to parse correctly
                   if (!isNaN(dateObj.getTime())) {
                       displayDate = dateObj.toLocaleDateString('en-US', {
                                year: 'numeric',
                           month: 'long', // Use 'long' for full month name
                           day: 'numeric'
                       });
                   }
                } catch (e) { console.error("Error parsing date for display:", e); }

                // Set option text
                option.textContent = `Session - ${displayDate}`;
                // Keep the YYYY-MM-DD date in the data attribute for the next step
                option.setAttribute('data-session-date', dateStr);
                sessionSelect.appendChild(option);
            });

            console.log(`Loaded ${data.dates.length} distinct dates successfully`);
        } else {
            sessionSelect.innerHTML += '<option disabled>No session dates found</option>';
        }
    } catch (error) {
        console.error('Error loading distinct session dates:', error);
        sessionSelect.innerHTML = '<option value="" disabled selected>Error loading dates</option>'; // Show error state
        sessionSelect.innerHTML += `<option disabled>Error: ${error.message}</option>`;
    } finally {
        // --- Re-enable Dropdown --- 
        sessionSelect.disabled = false;
        // --- End Re-enable ---
    }
}

// Load attendance records for a session
async function loadAttendanceRecords(specificSessionId = null) {
    // --- STOP PREVIOUS POLLING for this specific view --- 
    if (viewAttendanceIntervalId) {
        clearInterval(viewAttendanceIntervalId);
        viewAttendanceIntervalId = null;
        console.log('[loadAttendanceRecords] Cleared previous specific session polling interval.');
    }
    // --- END STOP POLLING ---
    
    // Use the provided sessionId if available, otherwise try to get from button/context if needed
    const sessionId = specificSessionId; 
    const recordsDiv = document.getElementById('attendance-records');
    
    // --- Show Loading State for Records --- 
    // Clear previous content and show loading message immediately
    if (recordsDiv) {
        recordsDiv.innerHTML = '<p class="loading-indicator">Loading attendance records...</p>'; 
    } else {
        console.error("Attendance records div not found!");
        return; // Cannot proceed without the container
    }
    // --- End Loading State ---
    
    if (!sessionId) {
        recordsDiv.innerHTML = '<div class="error-message">Please select a class, date, and section.</div>';
        return;
    }
    
    try {
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
            
            // Get section information to display
            const sectionInfo = data.section ? `<p class="session-section">Section: ${data.section}</p>` : '';
            
            // Create attendance table
            let tableHTML = `
                <div class="attendance-header">
                    <h3>${data.className || 'Unknown Class'}</h3>
                    <p>Subject: ${data.subject || 'Unknown Subject'}</p>
                    ${sectionInfo}
                </div>
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
            // Stop polling if there was an API error (Keep this clearInterval)
            if (viewAttendanceIntervalId) {
                clearInterval(viewAttendanceIntervalId);
                viewAttendanceIntervalId = null;
                console.log('[loadAttendanceRecords] Stopped polling due to API error.');
            }
        }
    } catch (error) {
        console.error('Error loading attendance records:', error);
        recordsDiv.innerHTML = `<div class="error-message">Server error: ${error.message}. Please try again.</div>`;
        // Stop polling if there was a network/fetch error (Keep this clearInterval)
        if (viewAttendanceIntervalId) {
            clearInterval(viewAttendanceIntervalId);
            viewAttendanceIntervalId = null;
            console.log('[loadAttendanceRecords] Stopped polling due to fetch error.');
        }
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
    
        // Set the session select to the current session
        document.getElementById('session-select').value = currentSessionId; 
        
        // We might need to manually trigger the section loading or attendance loading here 
        // if just setting the sessionSelect value doesn't fire the change event reliably, 
        // or if we want it to load immediately after clicking 'View Current'.
        // For now, let's rely on the change event listener.
        
        // REMOVED: We don't want to load attendance directly here anymore, 
        // the session select 'change' listener handles section fetching first.
        // await loadAttendanceRecords();
        
    } catch (error) {
        console.error('Error viewing current attendance:', error);
        alert('Error loading current attendance data. Please try again.');
    }
}

// Logout function
async function logout() {
    console.log("Logging out and stopping polling...");
    // Stop recent attendance polling
    if (recentAttendanceIntervalId) {
        clearInterval(recentAttendanceIntervalId);
        console.log(`Polling stopped (Interval ID: ${recentAttendanceIntervalId})`);
        recentAttendanceIntervalId = null;
    }
    // Stop specific view attendance polling
    if (viewAttendanceIntervalId) {
        clearInterval(viewAttendanceIntervalId);
        console.log(`Polling stopped (Interval ID: ${viewAttendanceIntervalId})`);
        viewAttendanceIntervalId = null;
    }
    
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
    
    tableBody.innerHTML = ''; // Clear previous records

    if (!records || records.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center">No attendance records found</td></tr>`; // Update colspan
        return;
    }
    
    records.forEach(record => {
        const row = document.createElement('tr');
        
        // Format date to be more readable
        const dateObj = new Date(record.attendance_date + 'T00:00:00'); // Ensure correct parsing
        const formattedDate = dateObj.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
        
        // Use the time directly from the backend query
        const formattedTime = record.attendance_time || 'N/A'; 
        const sectionDisplay = record.section || 'N/A'; // Handle null sections

        row.innerHTML = `
            <td>${record.class_name}</td>
            <td>${sectionDisplay}</td>
            <td>${formattedDate}</td>
            <td>${formattedTime}</td>
            <td>${record.present_count}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// 📌 NEW: Function to fetch and display active QR sessions
// Make it globally accessible
window.loadActiveQrSessions = async function() {
    const activeSessionsSection = document.getElementById('active-sessions-section');
    const tableBody = document.querySelector('#active-sessions-table tbody');
    if (!tableBody || !activeSessionsSection) return;

    tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Loading active sessions...</td></tr>'; // Show loading state

    try {
        // console.log(`[loadActiveQrSessions] Fetching from /auth/active-sessions...`);
        const response = await fetchWithAuth(`/auth/active-sessions`); 
        // console.log(`[loadActiveQrSessions] Response status: ${response.status}`);
        
        const data = await response.json();
        // console.log('[loadActiveQrSessions] Response data:', data);

        if (data.success && data.sessions && data.sessions.length > 0) {
            // console.log(`[loadActiveQrSessions] Found ${data.sessions.length} active sessions. Displaying section.`);
            activeSessionsSection.style.display = 'block';
            tableBody.innerHTML = ''; // Clear loading state

            data.sessions.forEach(session => {
                const row = tableBody.insertRow();

                const expires = new Date(session.expires_at_iso); // Use ISO string
                const now = new Date();
                const isExpired = expires < now;
                const status = isExpired ? 'Expired' : 'Active';

                // Format expiration time (example: HH:MM:SS on YYYY-MM-DD)
                const formattedExpires = expires.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
                                       ' on ' + expires.toLocaleDateString();

                row.innerHTML = `
                    <td>${session.class_name || session.subject || 'N/A'}</td>
                    <td>${session.section || 'N/A'}</td>
                    <td>${formattedExpires}</td>
                    <td><span class="status-${status.toLowerCase()}">${status}</span></td>
                    <td>
                        <button class="action-btn show-qr-btn">Show QR</button>
                        <button class="action-btn delete-btn">Delete</button>
                    </td>
                `;

                // Store session data on buttons for easy access
                const showBtn = row.querySelector('.show-qr-btn');
                const deleteBtn = row.querySelector('.delete-btn');

                if (showBtn) {
                    showBtn.dataset.sessionId = session.session_id;
                    showBtn.dataset.qrCodeUrl = session.qrCodeUrl;
                    showBtn.dataset.expiresAtIso = session.expires_at_iso;
                    showBtn.dataset.section = session.section || ''; // Store section
                    showBtn.dataset.subject = session.subject || ''; // Store subject
                    showBtn.addEventListener('click', handleShowActiveQr);
                }
                if (deleteBtn) {
                    deleteBtn.dataset.sessionId = session.session_id;
                    deleteBtn.addEventListener('click', handleDeleteActiveSession);
                }
            });
        } else if (data.success) {
             // console.log('[loadActiveQrSessions] No active sessions found. Displaying message.');
             activeSessionsSection.style.display = 'block'; 
             // Update the table body to show a message
             tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No active sessions found.</td></tr>';
        } else { // if !data.success
            console.error(`[loadActiveQrSessions] API call failed: ${data.message}`);
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">Error loading sessions: ${data.message}</td></tr>`;
            activeSessionsSection.style.display = 'block'; // Show section to display error
        }
    } catch (error) {
        console.error('Error fetching active sessions:', error);
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">Network error loading active sessions.</td></tr>`;
        activeSessionsSection.style.display = 'block'; // Show section to display error
    }
}

// 📌 NEW: Handler for "Show QR" button click
function handleShowActiveQr(event) {
    const button = event.target;
    const { sessionId, qrCodeUrl, expiresAtIso, section, subject } = button.dataset;

    // console.log(`Showing QR for active session: ${sessionId}`);
    const qrSection = document.getElementById('qr-section');
    if (qrSection) {
        // console.log('[handleShowActiveQr] Ensuring #qr-section is visible.');
        qrSection.style.display = 'block'; 
    } else {
        console.error('[handleShowActiveQr] Cannot find #qr-section to make visible.');
        // Optionally hide other sections if needed
        // document.getElementById('active-sessions-section').style.display = 'none';
        // document.getElementById('classes-section').style.display = 'none';
        // ... etc
    }

    const qrCodeDiv = document.getElementById('qr-code-container');
    if (!qrCodeDiv) {
        console.error("QR Code container not found!");
        alert("Error: Cannot find QR code display area.");
        return;
    }

    // --- Start: Modified Clearing Logic --- 
    // Remove only previous QR-specific elements, not the status div
    const existingIframe = qrCodeDiv.querySelector('#qr-code-iframe');
    if(existingIframe) qrCodeDiv.removeChild(existingIframe);
    const existingLinkContainer = qrCodeDiv.querySelector('.direct-link-container');
    if(existingLinkContainer) qrCodeDiv.removeChild(existingLinkContainer);
    const existingFallback = qrCodeDiv.querySelector('.qr-fallback'); 
    if(existingFallback) qrCodeDiv.removeChild(existingFallback);
    
    // Ensure status div exists and clear its text content if needed
    const statusDiv = document.getElementById('status-message');
    if (statusDiv) {
        statusDiv.innerHTML = ''; // Clear any previous status text
        statusDiv.className = ''; // Reset class
    } else {
        console.error("[handleShowActiveQr] #status-message div not found within #qr-code-container!");
        // Cannot proceed without status div, maybe add it dynamically? For now, return.
        return; 
    }
    // --- End: Modified Clearing Logic --- 

    // --- Start: Add QR Code Image/Iframe Rendering --- 
    const loadingMsg = document.createElement('div');
    loadingMsg.style.textAlign = 'center';
    loadingMsg.style.padding = '20px';
    loadingMsg.innerHTML = 'Loading QR code...';
    qrCodeDiv.appendChild(loadingMsg);

    const img = new Image();
    img.crossOrigin = 'Anonymous';

    img.onload = function() {
        if (loadingMsg.parentNode === qrCodeDiv) { // Check if still attached
            qrCodeDiv.removeChild(loadingMsg);
        }
        // Create iframe to display the image
        const iframe = document.createElement('iframe');
        const imgHTML = `<html><body style="margin:0; display:flex; justify-content:center; align-items:center; height:100%;"><img src="${img.src}" alt="QR Code" style="max-width:100%; max-height:100%;"></body></html>`;
        const blob = new Blob([imgHTML], {type: 'text/html'});
        iframe.src = URL.createObjectURL(blob);
        iframe.id = 'qr-code-iframe'; // Add ID for styling
        iframe.width = '280'; // Match styling
        iframe.height = '280';
        iframe.style.border = 'none';
        iframe.style.display = 'block';
        iframe.style.margin = '0 auto';
        qrCodeDiv.appendChild(iframe);
        // console.log("Active session QR code rendered via blob URL iframe");

        // Call the display function AFTER image iframe is appended
        if (typeof displayQrCodeDetails === 'function') {
             displayQrCodeDetails(sessionId, qrCodeUrl, expiresAtIso, section);
        } else {
             console.error('displayQrCodeDetails function is not available.');
             alert('Error: Could not display QR code details.');
        }

        // Release blob URL after iframe loads
        iframe.onload = () => { setTimeout(() => URL.revokeObjectURL(iframe.src), 100); };
    };

    img.onerror = function() {
        console.error("Failed to load QR code image from API for active session.");
         if (loadingMsg.parentNode === qrCodeDiv) { 
             qrCodeDiv.removeChild(loadingMsg);
         }
         // Show fallback link if image fails
         qrCodeDiv.innerHTML = `
            <div style="text-align: center; padding: 20px; border: 1px solid #ff6b6b; border-radius: 8px; margin: 20px 0; background-color: #fff9f9;">
              <p style="margin-bottom: 10px; color: #d63031; font-weight: bold;">QR Code image failed to load. Please use this link:</p>
              <a href="${qrCodeUrl}" target="_blank" style="color: #0984e3; font-weight: bold;">${qrCodeUrl}</a>
          </div>
        `;
        // Still call display details to show status, timer, and *proper* direct link
        if (typeof displayQrCodeDetails === 'function') {
             displayQrCodeDetails(sessionId, qrCodeUrl, expiresAtIso, section);
        } else {
             console.error('displayQrCodeDetails function is not available.');
             alert('Error: Could not display QR code details.');
        }
    };
    
    // Use the same QR server API source
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrCodeUrl)}`;
    // --- End: Add QR Code Image/Iframe Rendering --- 

    // Check if the display function from qrcode.js is available (MOVED INSIDE img.onload/onerror)
    /*
    if (typeof displayQrCodeDetails === 'function') {
         displayQrCodeDetails(sessionId, qrCodeUrl, expiresAtIso, section);

         // Optional: scroll to the QR code display area
         const qrContainer = document.getElementById('qr-code-container');
         if (qrContainer) {
             qrContainer.scrollIntoView({ behavior: 'smooth' });
         }
    } else {
        console.error('displayQrCodeDetails function is not available. Make sure qrcode.js exposes it.');
        alert('Error: Could not display QR code. Function unavailable.');
    }
    */
}

// 📌 NEW: Handler for "Delete" button click
async function handleDeleteActiveSession(event) {
    const button = event.target;
    const sessionId = button.dataset.sessionId;

    if (!confirm(`Are you sure you want to delete session ${sessionId}? This will expire the QR code immediately.`)) {
        return;
    }

    // console.log(`Deleting active session: ${sessionId}`);
    button.textContent = 'Deleting...';
    button.disabled = true;

    try {
        // CORRECTED FETCH URL based on server.js routing
        const response = await fetchWithAuth(`/auth/sessions/${sessionId}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        
        if (data.success) {
            // Remove the row from the table
            button.closest('tr').remove();
             // Check if table body is empty, if so hide section or show message
            const tableBody = document.querySelector('#active-sessions-table tbody');
             if (tableBody && tableBody.rows.length === 0) {
                 document.getElementById('active-sessions-section').style.display = 'none';
                 // Or: tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No active sessions found.</td></tr>';
             }
            // Potentially clear the main QR display if it was showing this session
            // clearQrDisplay(); // Hypothetical function
        } else {
            alert(`Error deleting session: ${data.message}`);
            button.textContent = 'Delete';
            button.disabled = false;
        }
    } catch (error) {
        console.error('Error deleting session:', error);
        alert('Network error deleting session.');
        button.textContent = 'Delete';
        button.disabled = false;
    }
}

// Add utility function for formatting date if not already present
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// Ensure initDashboard is called on page load
// Make sure this isn't called twice if qrcode.js also calls it
if (!window.dashboardInitialized) {
    document.addEventListener('DOMContentLoaded', initDashboard);
    window.dashboardInitialized = true; 
}

// Helper function to show error messages (if not already defined)
function showError(message) {
    console.error("Dashboard Error:", message);
    // You might want to display this in a dedicated error area on the page
    // const errorDiv = document.getElementById('dashboard-error-message');
    // if (errorDiv) { errorDiv.textContent = message; errorDiv.style.display = 'block'; }
}

// Generate QR Code
async function generateQRCode() {
    const classSelect = document.getElementById('class-select');
    const sectionInput = document.getElementById('qr-section-input');
    const durationSelect = document.getElementById('duration-select');
    const generateButton = document.getElementById('generate-qr-code-btn'); // Get button for loading state
    
    // Get elements for the NEW QR display structure
    const qrCodeContainer = document.getElementById('qr-code-container');
    const qrImageWrapper = qrCodeContainer?.querySelector('.qr-image-wrapper');
    const qrTimerSpan = document.getElementById('qr-timer');
    const qrSectionDisplay = document.getElementById('qr-section-display');
    const qrSessionIdDisplay = document.getElementById('qr-session-id-display');
    const qrOpenBtn = document.getElementById('qr-open-btn');
    const directLinkContainer = document.getElementById('direct-link-container');

    // More specific check to identify the missing element
    const missingElements = [];
    if (!classSelect) missingElements.push('#class-select');
    if (!generateButton) missingElements.push('#generate-qr-code-btn');
    if (!qrCodeContainer) missingElements.push('#qr-code-container');
    // It's safer to check for children *after* confirming the parent exists
    if (qrCodeContainer && !qrImageWrapper) missingElements.push('.qr-image-wrapper (inside #qr-code-container)'); 
    if (!qrTimerSpan) missingElements.push('#qr-timer');
    if (!qrSectionDisplay) missingElements.push('#qr-section-display');
    if (!qrSessionIdDisplay) missingElements.push('#qr-session-id-display');
    if (!qrOpenBtn) missingElements.push('#qr-open-btn');
    if (!directLinkContainer) missingElements.push('#direct-link-container');

    if (missingElements.length > 0) {
        const errorMsg = `Error: UI is incomplete. Cannot generate QR code. Missing: ${missingElements.join(', ')}`;
        console.error(errorMsg);
        alert(errorMsg); // Show detailed alert
        return;
    }

    const classId = classSelect.value;
    const className = classSelect.options[classSelect.selectedIndex]?.text;
    const section = sectionInput.value.trim();
    const durationMinutes = durationSelect.value; // NEW: Get selected duration
    const teacherId = sessionStorage.getItem('userId');

    if (!classId) {
        statusDiv.innerHTML = '<p class="error-message">Please select a class.</p>';
        return;
    }
    if (!teacherId) {
         statusDiv.innerHTML = '<p class="error-message">Teacher ID not found. Please log in again.</p>';
         return;
    }
    
    statusDiv.innerHTML = '<p class="processing-status">Generating QR Code...</p>';
    
    try {
        // Prepare headers with auth information
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json' // Expect JSON back
        };
        
        // Fallback header auth (if needed)
        if (!document.cookie.includes('qr_attendance_sid')) {
            const userId = sessionStorage.getItem('userId');
            const userRole = sessionStorage.getItem('userRole');
            if (userId && userRole) {
                headers['X-User-ID'] = userId;
                headers['X-User-Role'] = userRole;
            }
        }
        
        const response = await fetch(`${API_URL}/auth/generate-qr`, {
            method: 'POST',
            credentials: 'include',
            headers: headers,
            body: JSON.stringify({
                class_id: classId,
                subject: className, // Send class name as subject
                teacher_id: teacherId,
                section: section || null, // Send section or null
                duration: parseInt(durationMinutes) // NEW: Send duration as integer
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
             console.log("QR Code Generated:", data);
             // Store current session ID for viewing attendance
             sessionStorage.setItem('currentQrSessionId', data.sessionId);

             // Render QR code using the same method as handleShowActiveQr
             renderQrCodeIframe(data.qrCodeUrl, data.sessionId, data.expiresAt, data.section);
             
             // Refresh the active sessions list immediately
             if (typeof loadActiveQrSessions === 'function') {
                 loadActiveQrSessions();
             }
             
        } else {
            console.error("QR Code generation failed:", data.message);
            statusDiv.innerHTML = `<p class="error-message">Failed to generate QR code: ${data.message}</p>`;
        }
    } catch (error) {
        console.error('Error generating QR code:', error);
        statusDiv.innerHTML = `<p class="error-message">Error generating QR code: ${error.message}. Please check the connection.</p>`;
    }
}

// NEW: Helper function to render QR code iframe (extracted from handleShowActiveQr)
function renderQrCodeIframe(qrCodeUrl, sessionId, expiresAtIso, section) {
    const qrCodeDiv = document.getElementById('qr-code-container');
    const statusDiv = document.getElementById('status-message');

    if (!qrCodeDiv || !statusDiv) {
        console.error("QR Code container or status message div not found in renderQrCodeIframe!");
        return;
    }
    
    // --- Clear previous QR/Status (similar to generateQRCode) --- 
    const existingIframe = qrCodeDiv.querySelector('#qr-code-iframe');
    if(existingIframe) qrCodeDiv.removeChild(existingIframe);
    const existingLinkContainer = qrCodeDiv.querySelector('.direct-link-container');
    if(existingLinkContainer) qrCodeDiv.removeChild(existingLinkContainer);
    const existingFallback = qrCodeDiv.querySelector('.qr-fallback');
    if(existingFallback) qrCodeDiv.removeChild(existingFallback);
    statusDiv.innerHTML = ''; 
    statusDiv.className = '';
    // --- End Clearing ---

    const loadingMsg = document.createElement('div');
    loadingMsg.style.textAlign = 'center';
    loadingMsg.style.padding = '20px';
    loadingMsg.innerHTML = 'Loading QR code...';
    qrCodeDiv.appendChild(loadingMsg);

    const img = new Image();
    img.crossOrigin = 'Anonymous';

    img.onload = function() {
        if (loadingMsg.parentNode === qrCodeDiv) {
            qrCodeDiv.removeChild(loadingMsg);
        }
        const iframe = document.createElement('iframe');
        const imgHTML = `<html><body style="margin:0; display:flex; justify-content:center; align-items:center; height:100%;"><img src="${img.src}" alt="QR Code" style="max-width:100%; max-height:100%;"></body></html>`;
        const blob = new Blob([imgHTML], {type: 'text/html'});
        iframe.src = URL.createObjectURL(blob);
        iframe.id = 'qr-code-iframe';
        iframe.width = '280';
        iframe.height = '280';
        iframe.style.border = 'none';
        iframe.style.display = 'block';
        iframe.style.margin = '0 auto';
        qrCodeDiv.appendChild(iframe);

        if (typeof displayQrCodeDetails === 'function') {
            displayQrCodeDetails(sessionId, qrCodeUrl, expiresAtIso, section);
        } else {
            console.error('displayQrCodeDetails function is not available.');
            statusDiv.innerHTML = '<p class="error-message">Error: Could not display QR code details.</p>';
        }
        iframe.onload = () => { setTimeout(() => URL.revokeObjectURL(iframe.src), 100); };
    };

    img.onerror = function() {
        console.error("Failed to load QR code image from API.");
        if (loadingMsg.parentNode === qrCodeDiv) {
            qrCodeDiv.removeChild(loadingMsg);
        }
        qrCodeDiv.innerHTML += ` 
           <div style="text-align: center; padding: 20px; border: 1px solid #ff6b6b; border-radius: 8px; margin: 20px 0; background-color: #fff9f9;" class="qr-fallback"> 
             <p style="margin-bottom: 10px; color: #d63031; font-weight: bold;">QR Code image failed to load. Please use this link:</p>
             <a href="${qrCodeUrl}" target="_blank" style="color: #0984e3; font-weight: bold;">${qrCodeUrl}</a>
           </div>
        `;
        if (typeof displayQrCodeDetails === 'function') {
            displayQrCodeDetails(sessionId, qrCodeUrl, expiresAtIso, section);
        } else {
            console.error('displayQrCodeDetails function is not available.');
             statusDiv.innerHTML = '<p class="error-message">Error: Could not display QR code details.</p>';
        }
    };

    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrCodeUrl)}`;
}

// 📌 NEW: Function to display QR Code details (timer, link, etc.)
// This should be globally accessible if called from different handlers
let qrCodeTimerIntervalId = null; // Hold timer ID

window.displayQrCodeDetails = function(sessionId, qrCodeUrl, expiresAtIso, section) {
    const statusDiv = document.getElementById('status-message');
    const qrCodeDiv = document.getElementById('qr-code-container'); // Needed for appending link
    if (!statusDiv || !qrCodeDiv) {
        console.error("Status message div or QR Code container not found for details!");
        return;
    }

    // Clear previous timer if any
    if (qrCodeTimerIntervalId) {
        clearInterval(qrCodeTimerIntervalId);
        qrCodeTimerIntervalId = null;
    }

    const expires = new Date(expiresAtIso);
    const sectionText = section ? `, Section ${section}` : '';
    
    // Initial status message
    statusDiv.innerHTML = `<p class="success-message">QR Code for session ${sessionId}${sectionText} generated. It expires in: <span id="timer">Calculating...</span></p>`;
    const timerSpan = document.getElementById('timer');

    function updateTimer() {
        const now = new Date();
        const diff = expires.getTime() - now.getTime();

        if (diff <= 0) {
            clearInterval(qrCodeTimerIntervalId);
            qrCodeTimerIntervalId = null;
            if(timerSpan) timerSpan.textContent = "Expired";
            statusDiv.querySelector('.success-message')?.classList.add('expired'); // Add class for styling
            // Refresh active sessions list when timer expires
            if (typeof loadActiveQrSessions === 'function') {
                loadActiveQrSessions(); 
            }
            return;
        }

        const minutes = Math.floor(diff / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        if (timerSpan) {
             timerSpan.textContent = `${minutes}m ${seconds}s`;
        }
    }

    updateTimer(); // Call immediately
    qrCodeTimerIntervalId = setInterval(updateTimer, 1000); // Update every second

    // Add direct link below the status/timer
    const linkContainer = document.createElement('div');
    linkContainer.className = 'direct-link-container';
    linkContainer.innerHTML = `
        <p>Direct QR Code Link:</p>
        <a href="${qrCodeUrl}" target="_blank" class="direct-link">${qrCodeUrl}</a>
    `;
    qrCodeDiv.appendChild(linkContainer);
}
