// Use global API_URL instead of import
// import API_URL from "./config.js";

// Student Dashboard functionality

// --- Role Check --- 
(function() {
    const userId = sessionStorage.getItem('userId');
    const userRole = sessionStorage.getItem('userRole');
    const expectedRole = 'student'; // Role expected for this page

    console.log(`[Role Check - Student] Found Role: ${userRole}`);

    if (!userId || userRole !== expectedRole) {
        console.warn(`[Role Check - Student] Access denied. Role is ${userRole}, expected ${expectedRole}. Redirecting to login.`);
        // Clear potentially incorrect session data before redirecting
        sessionStorage.clear(); 
        // Use getBasePath if available, otherwise assume root or relative path
        const basePath = typeof getBasePath === 'function' ? getBasePath() : ''; 
        window.location.href = basePath + '/index.html'; // Redirect to main login/index page
    }
})();
// --- End Role Check --- 

document.addEventListener('DOMContentLoaded', function() {
    console.log('Student dashboard loaded');
    setupMobileMenu(); // Call the setup function for the mobile menu
    // Initialize dashboard
    initDashboard();
    
    // Load attendance history
    loadAttendanceHistory();
    
    // Add event listeners
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout(this);
        });
        console.log('Logout button event listener added');
    } else {
        console.error('Logout button not found');
    }
    
    // Add event listener for scan QR button
    const scanQrBtn = document.getElementById('scan-qr-btn');
    
    if (scanQrBtn) {
        scanQrBtn.addEventListener('click', function() {
            document.getElementById('qr-scanner-section').style.display = 'block';
            // Update active navigation
            setActiveNav('nav-scan');
        });
    }
    
    // Listen for attendance recorded events from scanner.js
    document.addEventListener('attendance-recorded', function(event) {
        console.log('Attendance recorded event received:', event.detail);
        // Reload attendance history when scanner.js records attendance
        loadAttendanceHistory();
    });
    
    // Setup navigation event listeners
    setupNavigation();
    
    // Set up debug listeners
    setupDebugListeners();
});

// Set up navigation menu
function setupNavigation() {
    const navLinks = document.querySelectorAll('.sidebar .nav-link');
    const sections = {
        'nav-scan': document.getElementById('qr-scanner-section'),
        'nav-attendance': document.getElementById('attendance-section'),
        'nav-profile': document.getElementById('profile-section')
    };
    const dashboardActions = document.querySelector('.dashboard-actions'); // Get the button container

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Prevent default for links managing dashboard sections
            if (sections[this.id]) {
                e.preventDefault();
                // Hide all sections
                Object.values(sections).forEach(section => {
                    if (section) section.style.display = 'none';
                });
                // Show the target section
                if (sections[this.id]) {
                    sections[this.id].style.display = 'block';
                    // Show/hide the main scan button based on the active section
                    if (dashboardActions) {
                        dashboardActions.style.display = (this.id === 'nav-scan') ? 'block' : 'none';
                    }
                    // Load data if profile section is shown
                    if (this.id === 'nav-profile') {
                        loadProfileData();
                    }
                }
                // Set active nav link
                setActiveNav(this.id);
            } else if (this.id === 'logout-btn') {
                e.preventDefault();
                logout();
            }
            // Allow default for other links like 'Home'
        });
    });
}

// Set active navigation item
function setActiveNav(navId) {
    // Remove active class from all nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Add active class to selected nav link
    const activeNav = document.getElementById(navId);
    if (activeNav) {
        activeNav.classList.add('active');
    }
}

// Initialize dashboard
async function initDashboard() {
    try {
        console.log("Initializing student dashboard...");
        
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
                const welcomeMessage = document.getElementById('welcome-message');
            if (welcomeMessage) {
                    welcomeMessage.textContent = `Welcome, ${data.user.firstName} ${data.user.lastName}!`;
            }
            
            // Show student section
                const studentSection = document.getElementById('student-section');
                if (studentSection) {
                    studentSection.style.display = 'block';
                }
                
                // No longer need to load enrolled classes
            } else {
                console.error("Authentication failed, redirecting to login...");
                window.location.href = getBasePath() + '/pages/login.html';
            }
        } else {
            // User info found in sessionStorage
            console.log("User info found in sessionStorage:", { userId, userRole, userName });
            
            // Update welcome message
            const welcomeMessage = document.getElementById('welcome-message');
            if (welcomeMessage) {
                welcomeMessage.textContent = `Welcome, ${userName}!`;
            }
        }
    } catch (error) {
        console.error("Error initializing dashboard:", error);
        showError("Failed to initialize dashboard. Please try again.");
    }
}

// Load attendance history
async function loadAttendanceHistory() {
    try {
        const historyDiv = document.getElementById('attendance-records');
        if (!historyDiv) {
            console.error("Attendance records element not found");
            return;
        }
        
        historyDiv.innerHTML = '<p>Loading your attendance history...</p>';
        
        const response = await fetch(`${API_URL}/auth/student-attendance-history`, {
            credentials: 'include'
        });
        
        const data = await response.json();
        console.log('DEBUG: Raw attendance history data received:', data.history); // Log the raw data
        console.log('Attendance history data:', data);
        
        if (data.success && data.history && data.history.length > 0) {
            let historyHTML = `
                <h3>Recent Attendance</h3>
                <div class="history-list">
            `;
            
            data.history.forEach(record => {
                // Format timestamp for display - parse the UTC+8 timestamp 
                let formattedTime = 'Unknown Time';
                try {
                    if (record.timestamp) {
                        // The timestamp is already in UTC+8 format from the server
                        const recordTime = new Date(record.timestamp);
                        
                        if (!isNaN(recordTime.getTime())) {
                            // Use locale string for proper formatted display
                            formattedTime = recordTime.toLocaleString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                            });
                        }
                    }
                } catch (timeError) {
                    console.error('Error formatting time:', timeError);
                }
                
                historyHTML += `
                    <div class="history-item">
                        <div class="history-subject">${record.subject}</div>
                        ${record.section ? `<div class="history-section">Section: ${record.section}</div>` : ''}
                        <div class="history-teacher">Teacher: ${record.teacherName}</div>
                        <div class="history-time">Recorded: ${formattedTime}</div>
                    </div>
                `;
            });
            
            historyHTML += `</div>`;
            historyDiv.innerHTML = historyHTML;
        } else {
            historyDiv.innerHTML = `
                <div class="empty-state">
                    <h3>No Attendance Records</h3>
                    <p>You haven't recorded any attendance yet. Scan a QR code from your teacher to begin.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading attendance history:', error);
        const historyDiv = document.getElementById('attendance-records');
        if (historyDiv) {
        historyDiv.innerHTML = `
            <div class="error-state">
                <h3>Error Loading History</h3>
                <p>There was an error loading your attendance history. Please try again later.</p>
            </div>
        `;
        }
    }
}

// Record attendance from QR code
async function recordAttendance() {
    // --- Get session ID (keep existing logic) ---
    const sessionId = sessionStorage.getItem('currentSessionId');
        if (!sessionId) {
        // Use the modal for this feedback too
        alert('Error: No QR session found. Please scan a valid QR code.');
            return;
        }
        
    // --- Get Button Element (keep existing logic) ---
    const btnElement = document.getElementById('record-attendance-btn');
    if (!btnElement) {
        console.error("Record attendance button not found");
        alert('Error: UI element missing. Cannot record attendance.');
        return;
    }
        
    // --- Disable button and show processing (optional: add a processing modal/indicator) ---
        btnElement.disabled = true;
        btnElement.textContent = 'Processing...';
    // Consider adding a subtle processing indicator if needed
        
    try {
        // --- Fetch Request (keep existing logic) ---
        const response = await fetch(`${API_URL}/auth/record-attendance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ session_id: sessionId })
        });
        
        const data = await response.json();
        console.log('Attendance recording response:', data);
        
        // --- Handle Response using Modal ---
        if (data.success) {
            // Format details for the modal
            const details = `Subject: <strong>${data.subject || 'N/A'}</strong><br>Time: <strong>${formatDateToUTC8(new Date())}</strong>`;
            alert(`Attendance Recorded!\nSubject: ${data.subject || 'N/A'}\nTime: ${formatDateToUTC8(new Date())}`);
            
            // Clear session data after successful recording
            sessionStorage.removeItem('currentSessionId');
            sessionStorage.removeItem('currentTeacherId');
            
            // Reload attendance history
            loadAttendanceHistory();
        } else {
            // Show error in modal
            alert(`Recording Failed: ${data.message || 'Error recording attendance'}`);
        }
        // --- End Modal Handling ---
        
    } catch (error) {
        console.error('Attendance recording error:', error);
        // --- Show Catch Error in Modal ---
        alert(`Server Error: ${error.message}`);
        // --- End Modal Handling ---
    } finally {
        // --- Re-enable button (always run) ---
        if (btnElement) {
        btnElement.disabled = false;
            btnElement.textContent = 'Record Attendance'; // Or whatever the original text was
        }
    }
}

// Helper function to format dates in UTC+8
function formatDateToUTC8(date) {
    try {
        // Convert to UTC+8
        const utc8Date = new Date(date.getTime() + (8 * 60 * 60 * 1000));
        return utc8Date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    } catch (error) {
        console.error('Date formatting error:', error);
        return 'Unknown Date';
    }
}

// Function to show error messages
function showError(message) {
    console.error(message);
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

// Logout function
async function logout(logoutButtonElement) {
    // Modal elements
    const modalOverlay = document.getElementById('status-modal-overlay');
    const modalIconContainer = document.getElementById('status-modal-icon-container');
    const modalMessage = document.getElementById('status-modal-message');

    if (!modalOverlay || !modalIconContainer || !modalMessage) {
        console.error("Status modal elements not found for logout action!");
        // Proceed without modal if elements are missing
    } else {
        // --- Show Loading Modal ---
        modalIconContainer.innerHTML = '<div class="spinner"></div>';
        modalMessage.textContent = 'Logging out...';
        modalOverlay.classList.add('visible');
        if (logoutButtonElement) logoutButtonElement.disabled = true;
        // --- End Show Loading Modal ---
    }

    console.log("Logging out...");
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

// --- NEW PROFILE FUNCTIONS --- 

async function loadProfileData() {
    const studentIdInput = document.getElementById('profile-student-id');
    const firstNameInput = document.getElementById('profile-first-name');
    const lastNameInput = document.getElementById('profile-last-name');
    const profileMessage = document.getElementById('profile-message');

    if (!studentIdInput || !firstNameInput || !lastNameInput || !profileMessage) {
        console.error('Profile form elements not found');
        return;
    }

    profileMessage.textContent = 'Loading profile...';
    profileMessage.className = 'info-message'; // Use a generic info class

    try {
        const response = await fetchWithAuth(`${API_URL}/auth/profile`); // Use helper function
        const data = await response.json();

        if (data.success && data.user) {
            studentIdInput.value = data.user.student_id || 'N/A';
            firstNameInput.value = data.user.first_name || '';
            lastNameInput.value = data.user.last_name || '';
            profileMessage.textContent = ''; // Clear loading message
            profileMessage.className = '';
        } else {
            console.error('Failed to load profile data:', data.message);
            profileMessage.textContent = `Error loading profile: ${data.message || 'Unknown error'}`;
            profileMessage.className = 'error-message';
        }
    } catch (error) {
        console.error('Error fetching profile data:', error);
        profileMessage.textContent = `Network error loading profile: ${error.message}`;
        profileMessage.className = 'error-message';
    }
}

async function handleProfileUpdate(event) {
    event.preventDefault(); // Prevent default form submission

    const firstNameInput = document.getElementById('profile-first-name');
    const lastNameInput = document.getElementById('profile-last-name');
    const profileMessage = document.getElementById('profile-message');
    const saveButton = document.getElementById('save-profile-btn');

    if (!firstNameInput || !lastNameInput || !profileMessage || !saveButton) {
        console.error('Profile form elements for update not found');
        return;
    }

    const originalButtonText = saveButton.textContent;
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';
    profileMessage.textContent = '';
    profileMessage.className = '';

    const updatedProfile = {
        firstName: firstNameInput.value.trim(),
        lastName: lastNameInput.value.trim()
    };

    try {
        const response = await fetchWithAuth(`${API_URL}/auth/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedProfile)
        });
        
        const data = await response.json();
        
        if (data.success) {
            profileMessage.textContent = 'Profile updated successfully!';
            profileMessage.className = 'success-message';
            
            // Update sessionStorage and welcome message
            sessionStorage.setItem('firstName', updatedProfile.firstName);
            sessionStorage.setItem('lastName', updatedProfile.lastName);
            const newUserName = `${updatedProfile.firstName} ${updatedProfile.lastName}`;
            sessionStorage.setItem('userName', newUserName);
            const welcomeMsg = document.getElementById('welcome-message');
            if (welcomeMsg) {
                welcomeMsg.textContent = `Welcome, ${newUserName}!`;
            }

            // Hide message after a delay
            setTimeout(() => { 
                profileMessage.textContent = ''; 
                profileMessage.className = '';
            }, 3000);

        } else {
            profileMessage.textContent = `Error updating profile: ${data.message || 'Unknown error'}`;
            profileMessage.className = 'error-message';
        }

    } catch (error) {
        console.error('Error updating profile:', error);
        profileMessage.textContent = `Network error updating profile: ${error.message}`;
        profileMessage.className = 'error-message';
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = originalButtonText;
    }
}

// Attach listener to profile form WITHIN the main DOMContentLoaded or init function
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation(); // Call the setup function
    
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }
    // Initial section hiding should be handled by setupNavigation or init logic
});

// --- END PROFILE FUNCTIONS --- 

// Function to show attendance popup (NOW USES GLOBAL MODAL)
async function showAttendancePopup(sessionId, teacherId, subject) {
    console.log("Processing attendance automatically via global modal...");

    // Use setTimeout to ensure DOM is ready before accessing/showing modal
    setTimeout(async () => {
        console.log("DEBUG: Inside setTimeout for showAttendancePopup");
        // --- Get Modal Elements INSIDE setTimeout ---
        const modalOverlay = document.getElementById('status-modal-overlay');
        const modalIconContainer = document.getElementById('status-modal-icon-container');
        const modalMessage = document.getElementById('status-modal-message');

        console.log("DEBUG: modalOverlay:", modalOverlay);
        console.log("DEBUG: modalIconContainer:", modalIconContainer);
        console.log("DEBUG: modalMessage:", modalMessage);

        if (!modalOverlay || !modalIconContainer || !modalMessage) {
            console.error("DEBUG: Status modal elements NOT found, showing alert.");
            alert("Processing attendance... Check console for details."); // Fallback alert
            // Attempt to record attendance without modal feedback if elements are missing
            await recordAttendanceFetch(sessionId); 
            return; // Exit setTimeout callback
        } else {
            console.log("DEBUG: Status modal elements FOUND, showing modal.");
            // --- Show Loading Modal ---
            modalIconContainer.innerHTML = '<div class="spinner"></div>';
            modalMessage.textContent = 'Analyzing QR & Recording...';
            modalOverlay.classList.add('visible');
            // --- End Show Loading Modal ---
        }

        // Now perform the fetch and update logic
        await recordAttendanceFetch(sessionId, modalOverlay, modalIconContainer, modalMessage);

    }, 50); // 50ms delay - adjust if needed, but keep small
}

// Separate function for the fetch/update logic to keep it clean
async function recordAttendanceFetch(sessionId, modalOverlay = null, modalIconContainer = null, modalMessage = null) {
    try {
        // Corrected endpoint path to include /auth
        const response = await fetch(`${API_URL}/auth/record-attendance`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ session_id: sessionId })
        });
        
        const data = await response.json();
        console.log('Attendance recording response:', data);

        // --- Update Status Modal with Result ---
        if (modalIconContainer && modalMessage) { // Only update if elements exist
            if (data.success) {
                modalIconContainer.innerHTML = '<span class="status-icon success">✅</span>';
                modalMessage.innerHTML = `Attendance Recorded!<br><small>Subject: ${data.subject || 'N/A'}<br>Time: ${formatLocalDateTime(new Date())}</small>`; // Include details
                // Dispatch event for history update
                document.dispatchEvent(new CustomEvent('attendance-recorded', {
                    detail: { success: true, subject: data.subject, timestamp: new Date().toISOString() }
                }));
            } else {
                modalIconContainer.innerHTML = '<span class="status-icon error">❌</span>';
                modalMessage.textContent = `Recording Failed: ${data.message || 'Unknown error'}`;
            }
        }

        // --- Fallback Alert if Modal Elements Missing ---
        if (!modalIconContainer || !modalMessage) {
            alert(data.success ? `Attendance Recorded!\nSubject: ${data.subject || 'N/A'}` : `Recording Failed: ${data.message || 'Unknown error'}`);
        }

    } catch (error) {
        console.error('Attendance recording error:', error);
        // --- Update Status Modal with Network Error ---
        if (modalIconContainer && modalMessage) {
            modalIconContainer.innerHTML = '<span class="status-icon error">❌</span>';
            modalMessage.textContent = `Server Error: ${error.message}`;
        } else {
            alert(`Server Error: ${error.message}`);
        }
    } finally {
        // --- Hide Modal After Delay ---
        if (modalOverlay) {
            setTimeout(() => {
                modalOverlay.classList.remove('visible');
            }, 2000); // Hide after 2 seconds
        }
        // --- End Hide Modal ---
    }
}

// --- Mobile Menu Toggle --- 
function setupMobileMenu() {
    const toggleBtn = document.getElementById('mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('mobile-menu-overlay'); // Get overlay

    if (toggleBtn && sidebar && overlay) { // Check overlay exists
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
            overlay.classList.toggle('visible'); // Toggle overlay visibility
            // Hide button when menu opens, show when it closes (on mobile)
            if (window.innerWidth <= 768) { // Only apply on mobile view
                toggleBtn.style.display = sidebar.classList.contains('mobile-open') ? 'none' : 'block';
            }
        });

        // Optional: Close menu when clicking a nav link inside
        sidebar.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                // Only close if it's currently open (for mobile view)
                if (sidebar.classList.contains('mobile-open')) {
                    sidebar.classList.remove('mobile-open');
                    overlay.classList.remove('visible'); // Hide overlay
                    // Ensure button reappears when menu closes via link click
                    if (window.innerWidth <= 768) {
                        toggleBtn.style.display = 'block'; 
                    }
                }
            });
        });

        // Optional: Close menu when clicking outside (on main content)
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.addEventListener('click', (event) => {
                if (sidebar.classList.contains('mobile-open') && !sidebar.contains(event.target) && !toggleBtn.contains(event.target)) {
                    sidebar.classList.remove('mobile-open');
                    overlay.classList.remove('visible'); // Hide overlay
                    // Ensure button reappears when menu closes via outside click
                    if (window.innerWidth <= 768) {
                         toggleBtn.style.display = 'block';
                    }
                }
            });
        }

        // Add listener to overlay to close menu
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('mobile-open');
            overlay.classList.remove('visible');
            if (window.innerWidth <= 768) { // Show toggle button
                toggleBtn.style.display = 'block'; 
            }
        });
    } else {
        console.warn("Mobile menu toggle button, sidebar, or overlay not found.");
    }
}
// --- End Mobile Menu Toggle --- 