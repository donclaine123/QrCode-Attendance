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

document.addEventListener('DOMContentLoaded', function() {
    // REMOVED: Don't skip the whole setup anymore. Allow listeners to attach.
    // if (window.dashboardInitialized) {
    //     console.log('[TeacherDashboard] DOMContentLoaded - Already initialized, skipping listener attachment.');
    //     return;
    // }
    console.log('[TeacherDashboard] DOMContentLoaded - Attaching listeners...');

    // Check if the specific listener *for attendance class select* has already been attached 
    // (e.g., by qrcode.js if it loaded first and attached it - although it shouldn't anymore)
    // This is a more granular check than the broad flag.
    const attendanceClassSelect = document.getElementById('attendance-class-select');
    if (attendanceClassSelect && !attendanceClassSelect.dataset.listenerAttached) {
        console.log('[TeacherDashboard] Attaching CHANGE listener to #attendance-class-select');
        attendanceClassSelect.addEventListener('change', function() {
            console.log('[TeacherDashboard] #attendance-class-select CHANGE event fired. Value:', this.value);
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

            if (overview) overview.style.display = (this.id === 'dashboard-nav') ? 'block' : 'none';
            if (qrSection) qrSection.style.display = (this.id === 'generate-qr-btn') ? 'block' : 'none';
            if (classesSection) classesSection.style.display = (this.id === 'manage-classes-btn') ? 'block' : 'none';
            if (attendanceSection) attendanceSection.style.display = (this.id === 'view-attendance-btn') ? 'block' : 'none';
        });
    });
    
    // Attach session select listener (now safe to attach here)
    const sessionSelect = document.getElementById('session-select'); 
    if (sessionSelect && !sessionSelect.dataset.listenerAttached) {
        console.log('[TeacherDashboard] Attaching CHANGE listener to #session-select');
        sessionSelect.addEventListener('change', async function() {
            const attendanceRecordsDiv = document.getElementById('attendance-records');
            const sectionChoicesDiv = document.getElementById('section-choices');
            const sectionButtonsContainer = document.getElementById('section-buttons-container');
            
            // Clear previous attendance and section choices
            if (attendanceRecordsDiv) attendanceRecordsDiv.innerHTML = '';
            if (sectionButtonsContainer) sectionButtonsContainer.innerHTML = '';
            if (sectionChoicesDiv) sectionChoicesDiv.style.display = 'none';

            const selectedOption = this.options[this.selectedIndex];
            const classId = document.getElementById('attendance-class-select').value;
            const sessionDate = selectedOption.getAttribute('data-session-date');

            if (this.value && classId && sessionDate) { // Only proceed if we have class, session, and date
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
                     
                     if (data.success && data.sections && data.sections.length > 0) {
                         // Display section choices
                         if (sectionChoicesDiv) sectionChoicesDiv.style.display = 'block';
                         
                         data.sections.forEach(sec => {
                             const button = document.createElement('button');
                             button.textContent = sec.section || 'No Section';
                             button.className = 'btn btn-secondary section-choice-btn';
                             button.setAttribute('data-session-id', sec.session_id);
                             
                             button.addEventListener('click', function() {
                                 const specificSessionId = this.getAttribute('data-session-id');
                                 console.log(`Loading attendance for selected section's session ID: ${specificSessionId}`);
                                 // Pass the specific session ID directly to the function
                                 loadAttendanceRecords(specificSessionId); 
                             });
                             
                             if (sectionButtonsContainer) sectionButtonsContainer.appendChild(button);
                         });
                         
                     } else {
                         // Clear the records div and show a specific message
                         console.log('No sections found for this class/date.');
                         if (attendanceRecordsDiv) {
                            attendanceRecordsDiv.innerHTML = '<p class="empty-message">No attendance sections found for this date.</p>';
                         }
                         // REMOVED: Do not call loadAttendanceRecords() as a fallback here.
                         // loadAttendanceRecords(); 
                     }
                     
                } catch (error) {
                    console.error('Error fetching sections:', error);
                    if (attendanceRecordsDiv) attendanceRecordsDiv.innerHTML = `<div class="error-message">Error loading section choices: ${error.message}</div>`;
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
async function loadSessions(classId) { // Renaming to loadSessionDates might be clearer later
    const sessionSelect = document.getElementById('session-select');
    // Also get the section choices div to hide it when class changes
    const sectionChoicesDiv = document.getElementById('section-choices');
    const sectionButtonsContainer = document.getElementById('section-buttons-container');

    sessionSelect.innerHTML = '<option value="">Select date</option>'; // Change placeholder text
    if (sectionButtonsContainer) sectionButtonsContainer.innerHTML = ''; // Clear section buttons
    if (sectionChoicesDiv) sectionChoicesDiv.style.display = 'none'; // Hide section choices
    
    if (!classId) {
        sessionSelect.innerHTML = '<option disabled>Please select a class first</option>';
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
        
        // --- UPDATED LOGIC ---
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
        sessionSelect.innerHTML += `<option disabled>Error loading dates: ${error.message}</option>`;
    }
}

// Load attendance records for a session
async function loadAttendanceRecords(specificSessionId = null) {
    // Use the provided sessionId if available, otherwise get it from the dropdown
    const sessionId = specificSessionId || document.getElementById('session-select').value;
    const recordsDiv = document.getElementById('attendance-records');
    
    if (!sessionId) {
        // Updated error message to reflect the initial selection is by date
        recordsDiv.innerHTML = '<div class="error-message">Please select a date and then a section.</div>';
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
async function loadActiveQrSessions() {
    const activeSessionsSection = document.getElementById('active-sessions-section');
    const tableBody = document.querySelector('#active-sessions-table tbody');
    if (!tableBody || !activeSessionsSection) return;

    tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Loading active sessions...</td></tr>'; // Show loading state

    try {
        // CORRECTED FETCH URL again based on server.js routing
        const response = await fetchWithAuth(`/auth/active-sessions`); // Use /auth prefix
        const data = await response.json();

        if (data.success && data.sessions.length > 0) {
            activeSessionsSection.style.display = 'block'; // Show the section if there are sessions
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
             activeSessionsSection.style.display = 'none'; // Hide if no active sessions
            // Optional: Keep the section visible and show "No active sessions"
            // tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No active sessions found.</td></tr>';
            // activeSessionsSection.style.display = 'block';
        } else {
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

    console.log(`Showing QR for active session: ${sessionId}`);

    // Check if the display function from qrcode.js is available
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
}

// 📌 NEW: Handler for "Delete" button click
async function handleDeleteActiveSession(event) {
    const button = event.target;
    const sessionId = button.dataset.sessionId;

    if (!confirm(`Are you sure you want to delete session ${sessionId}? This will expire the QR code immediately.`)) {
        return;
    }

    console.log(`Deleting active session: ${sessionId}`);
    button.textContent = 'Deleting...';
    button.disabled = true;

    try {
        const response = await fetchWithAuth(`${API_URL}/qr/sessions/${sessionId}`, {
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

// ... rest of the file ...
