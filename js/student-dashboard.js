// Use global API_URL instead of import
// import API_URL from "./config.js";

document.addEventListener('DOMContentLoaded', function() {
    console.log('Student dashboard loaded');
    // Initialize dashboard
    initDashboard();
    
    // Load attendance history
    loadAttendanceHistory();
    
    // Add event listeners
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
        console.log('Logout button event listener added');
    } else {
        console.error('Logout button not found');
    }
});

// Initialize dashboard
async function initDashboard() {
    try {
        const welcomeMessage = document.getElementById('welcome-message');
        const loadingSection = document.getElementById('loading-section');
        const studentSection = document.getElementById('student-section');
        const authDebug = document.getElementById('auth-debug');
        
        // Try using URL parameters first (from login redirect)
        const urlParams = new URLSearchParams(window.location.search);
        const urlUserId = urlParams.get('userId');
        const urlRole = urlParams.get('role');
        const urlFirstName = urlParams.get('firstName');
        const urlLastName = urlParams.get('lastName');
        
        if (urlUserId && urlRole === 'student') {
            console.log('Using URL parameters for authentication');
            
            // Store the user info in localStorage
            localStorage.setItem('userId', urlUserId);
            localStorage.setItem('userRole', 'student');
            if (urlFirstName) localStorage.setItem('firstName', urlFirstName);
            if (urlLastName) localStorage.setItem('lastName', urlLastName);
            
            // Display welcome message
            if (welcomeMessage) {
                welcomeMessage.textContent = `Welcome, ${urlFirstName || 'Student'} ${urlLastName || ''}!`;
            }
            
            // Show student section
            if (loadingSection) loadingSection.style.display = 'none';
            if (studentSection) studentSection.style.display = 'block';
            return;
        }
        
        // Check if user info is in localStorage
        const localUserId = localStorage.getItem('userId');
        const localRole = localStorage.getItem('userRole');
        
        if (localUserId && localRole === 'student') {
            console.log('Using localStorage for authentication');
            
            // Display welcome message
            const firstName = localStorage.getItem('firstName') || '';
            const lastName = localStorage.getItem('lastName') || '';
            if (welcomeMessage) {
                welcomeMessage.textContent = `Welcome, ${firstName || 'Student'} ${lastName || ''}!`;
            }
            
            // Show student section
            if (loadingSection) loadingSection.style.display = 'none';
            if (studentSection) studentSection.style.display = 'block';
            return;
        }
        
        // If no URL params or localStorage, try session-based auth
        console.log('Checking server authentication');
        const response = await fetch(`${API_URL}/auth/check-auth`, {
            credentials: 'include'
        });
        
        const data = await response.json();
        console.log('Auth check response:', data);
        
        if (data.authenticated && data.user.role === 'student') {
            console.log('Successfully authenticated via server session');
            
            // Store in localStorage for next time
            localStorage.setItem('userId', data.user.id);
            localStorage.setItem('userRole', 'student');
            if (data.user.firstName) localStorage.setItem('firstName', data.user.firstName);
            if (data.user.lastName) localStorage.setItem('lastName', data.user.lastName);
            
            // Display welcome message
            if (welcomeMessage) {
                welcomeMessage.textContent = `Welcome, ${data.user.firstName || data.user.name || data.user.email || 'Student'}!`;
            }
            
            // Show student section
            if (loadingSection) loadingSection.style.display = 'none';
            if (studentSection) studentSection.style.display = 'block';
        } else {
            console.log('Not authenticated, redirecting to login');
            const basePath = getBasePath();
            window.location.href = `${basePath}/index.html`;
        }
        
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        if (authDebug) {
            authDebug.textContent = `Error: ${error.message}`;
        }
        alert('Error initializing dashboard. Please try logging in again.');
        const basePath = getBasePath();
        window.location.href = `${basePath}/index.html`;
    }
}

// Load attendance history
async function loadAttendanceHistory() {
    try {
        const historyDiv = document.getElementById('attendanceHistory');
        historyDiv.innerHTML = '<p>Loading your attendance history...</p>';
        
        const response = await fetch(`${API_URL}/auth/student-attendance-history`, {
            credentials: 'include'
        });
        
        const data = await response.json();
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
        const historyDiv = document.getElementById('attendanceHistory');
        historyDiv.innerHTML = `
            <div class="error-state">
                <h3>Error Loading History</h3>
                <p>There was an error loading your attendance history. Please try again later.</p>
            </div>
        `;
    }
}

// Record attendance from QR code
async function recordAttendance() {
    try {
        const sessionId = localStorage.getItem('currentSessionId');
        
        if (!sessionId) {
            alert('No QR session found. Please scan a valid QR code.');
            return;
        }
        
        const btnElement = document.getElementById('recordAttendanceBtn');
        const statusElement = document.getElementById('attendanceStatus');
        
        // Disable button and show processing
        btnElement.disabled = true;
        btnElement.textContent = 'Processing...';
        statusElement.innerHTML = '<p class="processing">Recording your attendance...</p>';
        
        const response = await fetch(`${API_URL}/record-attendance`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                session_id: sessionId
            })
        });
        
        const data = await response.json();
        console.log('Attendance recording response:', data);
        
        if (data.success) {
            statusElement.innerHTML = `
                <div class="success-message">
                    <p>Attendance recorded successfully!</p>
                    <p>Subject: ${data.subject || 'N/A'}</p>
                    <p>Time: ${formatDateToUTC8(new Date())}</p>
                </div>
            `;
            
            // Clear session data after successful recording
            localStorage.removeItem('currentSessionId');
            localStorage.removeItem('currentTeacherId');
            
            // Reload attendance history
            loadAttendanceHistory();
            
            // Hide the QR attendance section after a delay
            setTimeout(() => {
                document.getElementById('qrAttendance').style.display = 'none';
            }, 5000);
        } else {
            statusElement.innerHTML = `<div class="error-message">${data.message || 'Error recording attendance'}</div>`;
        }
        
        // Re-enable button
        btnElement.disabled = false;
        btnElement.textContent = 'Record Attendance';
        
    } catch (error) {
        console.error('Attendance recording error:', error);
        const statusElement = document.getElementById('attendanceStatus');
        statusElement.innerHTML = `<div class="error-message">Server error: ${error.message}. Please try again.</div>`;
        
        // Re-enable button
        const btnElement = document.getElementById('recordAttendanceBtn');
        btnElement.disabled = false;
        btnElement.textContent = 'Record Attendance';
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

// Logout function
async function logout() {
    try {
        console.log('Logging out...');
        
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
        window.location.href = `${basePath}/index.html`;
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