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
                document.getElementById('welcome-message').textContent = `Welcome, ${data.user.firstName} ${data.user.lastName}!`;
                
                // Show student section
                document.getElementById('student-section').style.display = 'block';
                
                // Load enrolled classes
                loadEnrolledClasses();
            } else {
                console.error("Authentication failed, redirecting to login...");
                window.location.href = getBasePath() + '/index.html';
            }
        } else {
            // User info found in sessionStorage
            console.log("User info found in sessionStorage:", { userId, userRole, userName });
            
            // Update welcome message
            document.getElementById('welcome-message').textContent = `Welcome, ${userName}!`;
            
            // Show student section
            document.getElementById('student-section').style.display = 'block';
            
            // Load enrolled classes
            loadEnrolledClasses();
        }
    } catch (error) {
        console.error("Error initializing dashboard:", error);
        showError("Failed to initialize dashboard. Please try again.");
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