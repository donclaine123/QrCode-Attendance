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

// Main function to initialize the dashboard
async function initDashboard() {
    try {
        console.log("Student dashboard initialization starting...");
        
        const welcomeMessage = document.getElementById('welcomeMessage');
        const studentSection = document.getElementById('studentSection');
        const loadingIndicator = document.getElementById('loadingIndicator');
        
        if (loadingIndicator) {
            loadingIndicator.style.display = 'block';
        }
        
        // AUTHENTICATION FLOW:
        // 1. First try to authenticate using session cookies (most secure)
        // 2. If that fails, use header-based authentication with localStorage credentials (fallback)
        // 3. Only if both fail and localStorage credentials exist, use reauth endpoint (last resort)
        
        // Step 1: Try to authenticate with session cookies first
        let authenticated = false;
        let authData = null;
        
        try {
            const sessionAuthResponse = await fetch(`${API_URL}/auth/check-auth`, {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });
            
            if (sessionAuthResponse.ok) {
                authData = await sessionAuthResponse.json();
                console.log('Session auth response:', authData);
                
                if (authData.authenticated) {
                    console.log('Successfully authenticated via session cookies');
                    authenticated = true;
                }
            } else {
                console.log(`Session auth check failed with status ${sessionAuthResponse.status}`);
            }
        } catch (sessionAuthError) {
            console.error('Session auth error:', sessionAuthError);
        }
        
        // Step 2: If session authentication failed, try with localStorage headers
        if (!authenticated) {
            const userId = localStorage.getItem('userId');
            const userRole = localStorage.getItem('userRole');
            
            if (userId && userRole) {
                console.log('Attempting header-based authentication as fallback');
                
                try {
                    const headerAuthResponse = await fetch(`${API_URL}/auth/check-auth`, {
                        credentials: 'include',
                        headers: {
                            'Accept': 'application/json',
                            'Cache-Control': 'no-cache',
                            'X-User-ID': userId,
                            'X-User-Role': userRole
                        }
                    });
                    
                    if (headerAuthResponse.ok) {
                        authData = await headerAuthResponse.json();
                        console.log('Header-based auth response:', authData);
                        
                        if (authData.authenticated) {
                            console.log('Successfully authenticated via header-based auth');
                            authenticated = true;
                        }
                    }
                } catch (headerAuthError) {
                    console.error('Header-based auth error:', headerAuthError);
                }
            } else {
                console.log('No localStorage credentials available for fallback authentication');
            }
        }
        
        // Handle successful authentication from either method
        if (authenticated && authData && authData.user) {
            // Check if user is a student
            if (authData.user.role === 'student') {
                console.log('Successfully authenticated as student');
                
                // Store in localStorage as fallback, but ONLY update if the data is more complete
                if (authData.user.id) localStorage.setItem('userId', authData.user.id);
                if (authData.user.role) localStorage.setItem('userRole', 'student');
                if (authData.user.firstName) localStorage.setItem('firstName', authData.user.firstName);
                if (authData.user.lastName) localStorage.setItem('lastName', authData.user.lastName);
                
                // Display welcome message
                if (welcomeMessage) {
                    welcomeMessage.textContent = `Welcome, ${authData.user.firstName || 'Student'} ${authData.user.lastName || ''}!`;
                }
                
                // Load the student's attendance history
                if (studentSection) {
                    studentSection.style.display = 'block';
                }
                
                // Load attendance history
                await loadAttendanceHistory();
                
                // Hide loading indicator
                if (loadingIndicator) {
                    loadingIndicator.style.display = 'none';
                }
                
                return;
            } else if (authData.user.role === 'teacher') {
                // User is a teacher, redirect to teacher dashboard
                console.log('User is a teacher, redirecting to teacher dashboard');
                const basePath = getBasePath();
                window.location.href = `${basePath}/pages/teacher-dashboard.html`;
                return;
            }
        }
        
        // Step 3: If ALL authentication methods failed AND localStorage data exists, 
        // do token-based re-authentication as last resort
        if (!authenticated) {
            const localUserId = localStorage.getItem('userId');
            const localRole = localStorage.getItem('userRole');
            
            if (localUserId && localRole === 'student') {
                console.log('Attempting token-based re-authentication as last resort');
                
                try {
                    const reAuthResponse = await fetch(`${API_URL}/auth/reauth`, {
                        method: 'POST',
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            userId: localUserId,
                            role: localRole
                        })
                    });
                    
                    if (reAuthResponse.ok) {
                        const reAuthData = await reAuthResponse.json();
                        console.log("Re-authentication response:", reAuthData);
                        
                        if (reAuthData.success) {
                            console.log("Successfully re-established authentication:", reAuthData.sessionId);
                            
                            // Update localStorage with fresh data if available
                            if (reAuthData.user) {
                                if (reAuthData.user.firstName) 
                                    localStorage.setItem('firstName', reAuthData.user.firstName);
                                if (reAuthData.user.lastName) 
                                    localStorage.setItem('lastName', reAuthData.user.lastName);
                            }
                            
                            // Display student information from localStorage or reAuthData
                            const firstName = reAuthData.user?.firstName || localStorage.getItem('firstName') || '';
                            const lastName = reAuthData.user?.lastName || localStorage.getItem('lastName') || '';
                            
                            if (welcomeMessage) {
                                welcomeMessage.textContent = `Welcome, ${firstName || 'Student'} ${lastName || ''}!`;
                                welcomeMessage.innerHTML += '<small>(Authenticated via localStorage)</small>';
                            }
                            
                            // Show student section
                            if (studentSection) {
                                studentSection.style.display = 'block';
                            }
                            
                            // Load attendance history
                            await loadAttendanceHistory();
                            
                            // Hide loading indicator
                            if (loadingIndicator) {
                                loadingIndicator.style.display = 'none';
                            }
                            
                            return;
                        }
                    } else {
                        console.error("Re-authentication failed:", await reAuthResponse.text());
                    }
                } catch (reAuthError) {
                    console.error("Re-authentication error:", reAuthError);
                }
            }
            
            // If we get here, all authentication methods have failed
            console.error("ALL AUTHENTICATION METHODS FAILED");
            
            // Hide loading indicator
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
            
            // Show login required message
            const mainContent = document.querySelector('.container') || document.body;
            const authErrorDiv = document.createElement('div');
            authErrorDiv.className = 'auth-error';
            authErrorDiv.innerHTML = `
                <div class="alert alert-danger">
                    <p><strong>Authentication Failed</strong></p>
                    <p>Your session has expired or you are not logged in.</p>
                    <p>Please <a href="../index.html">log in again</a> to access the dashboard.</p>
                </div>
            `;
            
            // Add a login button for convenience
            const loginButton = document.createElement('button');
            loginButton.className = 'btn btn-primary';
            loginButton.textContent = 'Return to Login';
            loginButton.addEventListener('click', function() {
                // Clear any stale auth data
                localStorage.removeItem('sessionId');
                window.location.href = '../index.html';
            });
            authErrorDiv.querySelector('.alert').appendChild(loginButton);
            
            mainContent.prepend(authErrorDiv);
            
            // Hide student section
            if (studentSection) {
                studentSection.style.display = 'none';
            }
        }
    } catch (error) {
        console.error("Dashboard initialization error:", error);
        
        // Hide loading indicator
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
        
        // Show error message
        const mainContent = document.querySelector('.container') || document.body;
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <div class="alert alert-danger">
                <p><strong>Error Initializing Dashboard</strong></p>
                <p>${error.message || 'Unknown error occurred'}</p>
                <p>Please try refreshing the page or <a href="../index.html">log in again</a>.</p>
            </div>
        `;
        mainContent.prepend(errorDiv);
        
        // Hide student section
        const studentSection = document.getElementById('studentSection');
        if (studentSection) {
            studentSection.style.display = 'none';
        }
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

// Helper function to get the base path
function getBasePath() {
    const path = window.location.pathname;
    return path.substring(0, path.lastIndexOf('/'));
} 