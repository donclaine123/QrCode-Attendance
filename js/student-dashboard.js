// Use global API_URL instead of import
// import API_URL from "./config.js";

document.addEventListener('DOMContentLoaded', function() {
    console.log('Student dashboard loaded');
    // Initialize dashboard
    initDashboard();
    
    // Load attendance history
    loadAttendanceHistory();
    
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
    const scanQrBtn = document.getElementById('scan-qr-btn');
    const viewAttendanceBtn = document.getElementById('view-attendance-btn');
    
    if (scanQrBtn) {
        scanQrBtn.addEventListener('click', function() {
            document.getElementById('qr-scanner-section').style.display = 'block';
            document.getElementById('attendance-section').style.display = 'none';
        });
    }
    
    if (viewAttendanceBtn) {
        viewAttendanceBtn.addEventListener('click', function() {
            document.getElementById('qr-scanner-section').style.display = 'none';
            document.getElementById('attendance-section').style.display = 'block';
        });
    }
    
    // Set up debug listeners
    setupDebugListeners();
});

// Initialize dashboard
async function initDashboard() {
    try {
        console.log("Initializing student dashboard...");
        
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
                    
                    // Show student section
                    const studentSection = document.getElementById('student-section');
                    if (studentSection) {
                        studentSection.style.display = 'block';
                    }
                    
                    // Load enrolled classes
                    loadEnrolledClasses();
                } else {
                    console.warn("Failed to store user data, but continuing with server session");
                    // Still proceed with server session
                    const welcomeMessage = document.getElementById('welcome-message');
                    if (welcomeMessage) {
                        welcomeMessage.textContent = `Welcome, ${data.user.firstName} ${data.user.lastName}!`;
                    }
                    
                    const studentSection = document.getElementById('student-section');
                    if (studentSection) {
                        studentSection.style.display = 'block';
                    }
                    
                    loadEnrolledClasses();
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
            
            // Show student section
            const studentSection = document.getElementById('student-section');
            if (studentSection) {
                studentSection.style.display = 'block';
            }
            
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

// Load enrolled classes
async function loadEnrolledClasses() {
    try {
        const classSelect = document.getElementById('attendance-class-select');
        if (!classSelect) {
            console.error('Class select element not found');
            return;
        }
        
        classSelect.innerHTML = '<option value="">Select a class</option>';
        
        const userData = StorageUtil.getUserData();
        console.log(`Fetching enrolled classes for student ID: ${userData.userId}`);
        
        const response = await fetch(`${API_URL}/student/enrolled-classes`, {
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'X-User-ID': userData.userId,
                'X-User-Role': userData.userRole
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch enrolled classes');
        }
        
        const data = await response.json();
        console.log('Enrolled classes data received:', data);
        
        if (data.success && data.classes && data.classes.length > 0) {
            data.classes.forEach(classItem => {
                const option = document.createElement('option');
                option.value = classItem.id;
                option.textContent = classItem.subject;
                classSelect.appendChild(option);
            });
        } else {
            classSelect.innerHTML += '<option disabled>No enrolled classes found</option>';
        }
    } catch (error) {
        console.error('Error loading enrolled classes:', error);
        showError('Failed to load enrolled classes. Please try again.');
    }
}

// Record attendance
async function recordAttendance() {
    try {
        const sessionId = StorageUtil.getItem('currentSessionId');
        
        if (!sessionId) {
            alert('No QR session found. Please scan a valid QR code.');
            return;
        }
        
        const userData = StorageUtil.getUserData();
        console.log(`Recording attendance for student ID: ${userData.userId}, session ID: ${sessionId}`);
        
        const response = await fetch(`${API_URL}/attendance/record`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                student_id: userData.userId,
                session_id: sessionId
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to record attendance');
        }
        
        const data = await response.json();
        console.log('Attendance recorded:', data);
        
        // Clear session data after successful recording
        StorageUtil.removeItem('currentSessionId');
        StorageUtil.removeItem('currentTeacherId');
        
        // Reload attendance history
        loadAttendanceHistory();
        
        alert('Attendance recorded successfully!');
    } catch (error) {
        console.error('Error recording attendance:', error);
        showError('Failed to record attendance. Please try again.');
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
                const userId = localStorage.getItem('userId');
                const userRole = localStorage.getItem('userRole');
                const headers = {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                };
                
                // Add user headers if available in localStorage as fallback
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