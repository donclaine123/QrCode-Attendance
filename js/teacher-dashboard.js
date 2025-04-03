// Teacher Dashboard functionality

document.addEventListener('DOMContentLoaded', function() {
    // Skip initialization if already done by qrcode.js
    if (window.dashboardInitialized) {
        console.log('Dashboard already initialized by qrcode.js, skipping duplicate initialization');
        return;
    }
    
    window.dashboardInitialized = true;
    console.log('Teacher dashboard loaded');
    
    // Initialize the dashboard
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

    // Check if cookies are enabled and warn if not
    checkCookiesEnabled();
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
        // Set a test cookie with JavaScript
        document.cookie = "js_test_cookie=test; path=/; SameSite=None; Secure";
        console.log("Set test cookie via JavaScript:", document.cookie);
        
        // Try to get a cookie from the server
        const response = await fetch(`${API_URL}/debug/cookies`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        
        const data = await response.json();
        console.log("Server cookie test response:", data);
        
        // Display cookie info
        const cookieInfo = document.getElementById('cookieInfo');
        if (cookieInfo) {
            let html = '<h4>Cookie Test Results</h4>';
            html += `<p><strong>JavaScript Cookie Test:</strong> ${document.cookie.includes('js_test_cookie=test') ? '✅ Success' : '❌ Failed'}</p>`;
            html += `<p><strong>Server Cookie Test:</strong> ${data.success ? '✅ Success' : '❌ Failed'}</p>`;
            html += `<p><strong>Server Session Cookie:</strong> ${data.sessionId ? data.sessionId : 'None'}</p>`;
            html += `<p><strong>All Cookies:</strong> ${document.cookie || 'None'}</p>`;
            
            if (data.cookiesReceived) {
                html += '<h5>Cookies Received by Server:</h5>';
                html += '<ul>';
                for (const [name, value] of Object.entries(data.cookiesReceived)) {
                    html += `<li><strong>${name}:</strong> ${value}</li>`;
                }
                html += '</ul>';
            }
            
            if (data.cookiesSet) {
                html += '<h5>Cookies Set by Server:</h5>';
                html += '<ul>';
                for (const cookie of data.cookiesSet) {
                    html += `<li>${cookie}</li>`;
                }
                html += '</ul>';
            }
            
            cookieInfo.innerHTML = html;
            
            // Also show enhanced diagnostics
            enhancedDebugCookies();
        }
    } catch (error) {
        console.error("Cookie test error:", error);
        const cookieInfo = document.getElementById('cookieInfo');
        if (cookieInfo) {
            cookieInfo.innerHTML = `<h4>Cookie Test Error</h4><p>${error.message}</p>`;
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
                // Before making the request, log current cookies
                console.log('Current cookies before request:', document.cookie || 'NONE');
                
                const response = await fetch(`${API_URL}/auth/debug-cookies`, {
                    credentials: 'include',
                    cache: 'no-store' // Prevent caching
                });
                const data = await response.json();
                
                // After the request, check cookies again
                console.log('Current cookies after request:', document.cookie || 'NONE');
                
                // Test if we can set a cookie directly from JavaScript
                const testDate = new Date();
                testDate.setTime(testDate.getTime() + 60000); // 1 minute
                document.cookie = `js_test_cookie=test; path=/; expires=${testDate.toUTCString()}`;
                console.log('Tried to set JS cookie, current cookies:', document.cookie || 'NONE');
                
                if (debugOutput) {
                    let cookieInfo = '';
                    
                    // Check if the session is active
                    let sessionStatus = 'Unknown';
                    if (data.sessionExists === false) {
                        sessionStatus = '<span style="color:red">Not found in database</span>';
                    } else if (data.sessionActive === false) {
                        sessionStatus = '<span style="color:orange">Exists but inactive (is_active=FALSE)</span>';
                    } else if (data.sessionActive === true) {
                        sessionStatus = '<span style="color:green">Active</span>';
                    }
                    
                    // Check current cookies
                    const currentCookies = document.cookie || 'NONE';
                    const cookieColor = currentCookies === 'NONE' ? 'red' : 'green';
                    
                    debugOutput.innerHTML = `
                        <h5>Cookie Debug</h5>
                        <p><strong>Browser cookies:</strong> <span style="color:${cookieColor}">${currentCookies}</span></p>
                        <p><strong>Session ID:</strong> ${data.sessionID}</p>
                        <p><strong>Session status:</strong> ${sessionStatus}</p>
                        <hr>
                        <p><strong>Cookie settings:</strong></p>
                        <pre>${JSON.stringify(data.currentSettings, null, 2)}</pre>
                        <hr>
                        <p><strong>Full server response:</strong></p>
                        <pre>${JSON.stringify(data, null, 2)}</pre>
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
                    credentials: 'include',
                    cache: 'no-store' // Prevent caching
                });
                const data = await response.json();
                
                // Check current cookies
                const currentCookies = document.cookie || 'NONE';
                
                if (debugOutput) {
                    debugOutput.innerHTML = `
                        <h5>Auth Check</h5>
                        <p><strong>Authentication status:</strong> ${data.authenticated ? '<span style="color:green">Authenticated</span>' : '<span style="color:red">Not authenticated</span>'}</p>
                        <p><strong>Current cookies:</strong> ${currentCookies}</p>
                        <p><strong>LocalStorage:</strong> userId=${localStorage.getItem('userId')}, role=${localStorage.getItem('userRole')}</p>
                        <hr>
                        <p><strong>Full response:</strong></p>
                        <pre>${JSON.stringify(data, null, 2)}</pre>
                    `;
                }
            } catch (error) {
                console.error('Auth check error:', error);
                if (debugOutput) debugOutput.innerHTML = `Error: ${error.message}`;
            }
        });
    }
}

// Initialize dashboard
async function initDashboard() {
    try {
        // Debug info - to be expanded with enhancedDebugCookies
        console.log("📝 Dashboard initialization starting...");
        console.log("🍪 Current document.cookie:", document.cookie || "NONE");
        
        const cookiesWorking = areCookiesWorking();
        console.log(`🍪 Cookies working? ${cookiesWorking ? 'YES' : 'NO'}`);
        
        // Create debug section if it doesn't exist
        let debugSection = document.getElementById('debugSection');
        if (!debugSection) {
            debugSection = document.createElement('div');
            debugSection.id = 'debugSection';
            debugSection.className = 'debug-section';
            debugSection.style.margin = '20px';
            debugSection.style.padding = '15px';
            debugSection.style.border = '1px solid #ddd';
            debugSection.style.borderRadius = '5px';
            debugSection.style.backgroundColor = '#f9f9f9';
            document.body.appendChild(debugSection);
            
            const debugTitle = document.createElement('h3');
            debugTitle.textContent = 'Debug Information';
            debugSection.appendChild(debugTitle);
            
            // Add test cookie button
            const testCookieBtn = document.createElement('button');
            testCookieBtn.textContent = 'Test Cookies';
            testCookieBtn.className = 'btn btn-sm';
            testCookieBtn.style.marginRight = '10px';
            testCookieBtn.addEventListener('click', testCookies);
            debugSection.appendChild(testCookieBtn);
            
            // Add session info button
            const sessionInfoBtn = document.createElement('button');
            sessionInfoBtn.textContent = 'Check Session';
            sessionInfoBtn.className = 'btn btn-sm';
            sessionInfoBtn.addEventListener('click', checkSession);
            debugSection.appendChild(sessionInfoBtn);
            
            // Add cookie info div
            const cookieInfo = document.createElement('div');
            cookieInfo.id = 'cookieInfo';
            debugSection.appendChild(cookieInfo);
            
            // Add session info div
            const sessionInfo = document.createElement('div');
            sessionInfo.id = 'sessionInfo';
            debugSection.appendChild(sessionInfo);
        }
        
        // Show cookie diagnostics
        enhancedDebugCookies();
        
        const teacherInfoDiv = document.getElementById('teacherInfo');
        
        console.log('Checking server authentication');
        
        // First, try to authenticate with session cookies only
        const sessionAuthResponse = await fetch(`${API_URL}/auth/check-auth`, {
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        let authenticated = false;
        let authData = null;
        
        if (sessionAuthResponse.ok) {
            authData = await sessionAuthResponse.json();
            console.log('Session auth response:', authData);
            
            if (authData.authenticated) {
                console.log('Successfully authenticated via session');
                authenticated = true;
            } else {
                console.log('Session authentication failed, will try header-based auth');
            }
        } else {
            console.log(`Session auth check failed with status ${sessionAuthResponse.status}`);
        }
        
        // If session authentication failed, try with localStorage headers as fallback
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
        
        // Handle successful authentication
        if (authenticated && authData && authData.user) {
            // Check if user is a teacher
            if (authData.user.role === 'teacher') {
                console.log('Successfully authenticated as teacher');
                
                // Store in localStorage as fallback, but ONLY store the credentials
                // NOT any session-specific information that could cause re-auth
                localStorage.setItem('userId', authData.user.id);
                localStorage.setItem('userRole', 'teacher');
                localStorage.setItem('firstName', authData.user.firstName || '');
                localStorage.setItem('lastName', authData.user.lastName || '');
                
                // Display teacher information
                teacherInfoDiv.innerHTML = `
                    <p>Welcome, ${authData.user.firstName || 'Teacher'} ${authData.user.lastName || ''}!</p>
                    <p>User ID: ${authData.user.id}</p>
                `;
                
                // Load teacher's classes
                await loadClasses();
                return;
            } else if (authData.user.role === 'student') {
                // User is a student, redirect to student dashboard
                console.log('User is a student, redirecting to student dashboard');
                const basePath = getBasePath();
                window.location.href = `${basePath}/pages/student-dashboard.html`;
                return;
            }
        } else {
            console.log('Authentication failed:', authData ? authData.message : 'No response');
        }
        
        // If ALL authentication methods failed AND localStorage data exists, try re-auth as last resort
        // This is where the duplicate session was being created, so only do this if we failed all other methods
        if (!authenticated) {
        const localUserId = localStorage.getItem('userId');
        const localRole = localStorage.getItem('userRole');
        
        if (localUserId && localRole === 'teacher') {
                console.log('Attempting re-auth with localStorage data as last resort');
                
                try {
                    // No need to set headers here since we're explicitly creating a session
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
                            console.log("Successfully re-established session:", reAuthData.sessionId);
            
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
                    }
                } catch (reAuthError) {
                    console.error("Error re-authenticating:", reAuthError);
                }
            }
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
            
            // Display teacher information from localStorage
            const firstName = localStorage.getItem('firstName') || '';
            const lastName = localStorage.getItem('lastName') || '';
            const teacherInfoDiv = document.getElementById('teacherInfo');
            
            teacherInfoDiv.innerHTML = `
                <p>Welcome, ${firstName || 'Teacher'} ${lastName || ''}!</p>
                <p>User ID: ${localUserId}</p>
            `;
            
            // Load teacher's classes using header-based auth
            loadClasses();
            return;
        }
        
        alert('Error initializing dashboard. Please try logging in again.');
        const basePath = getBasePath();
        window.location.href = `${basePath}/index.html`;
    }
}

// Function to check if cookies are enabled and warn if not
function checkCookiesEnabled() {
    try {
        // Set a test cookie
        document.cookie = "testcookie=1; path=/";
        const cookiesEnabled = document.cookie.indexOf("testcookie") !== -1;
        
        if (!cookiesEnabled) {
            console.error("⚠️ COOKIES ARE DISABLED! Authentication will fail!");
            // Add visible warning to page
            const warning = document.createElement('div');
            warning.style.cssText = 'position:fixed;top:0;left:0;right:0;background-color:#f44336;color:white;padding:10px;text-align:center;z-index:9999;';
            warning.innerHTML = '<strong>Warning:</strong> Cookies are disabled in your browser. The QR attendance system requires cookies to work properly.';
            document.body.appendChild(warning);
        } else {
            // Clear test cookie
            document.cookie = "testcookie=1; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
            console.log("✅ Cookies are enabled");
        }
        
        return cookiesEnabled;
    } catch (e) {
        console.error("Error checking cookies:", e);
        return false;
    }
}

// Helper function to log cookie state
function debugCookies() {
    console.log("Current cookies:", document.cookie || "NONE");
    const sessionCookie = document.cookie.split(';').find(c => c.trim().startsWith('qr_attendance_sid='));
    if (sessionCookie) {
        console.log("Found session cookie:", sessionCookie.trim());
    } else {
        console.log("⚠️ NO SESSION COOKIE FOUND!");
    }
}

// Function to check if cookies are properly working for cross-origin requests
function areCookiesWorking() {
    // Try to read the session cookie
    const hasSessionCookie = document.cookie.split(';').some(c => 
        c.trim().startsWith('qr_attendance_sid=')
    );
    
    // Check current cookies
    console.log("Current cookies:", document.cookie || "NONE");
    
    if (!hasSessionCookie) {
        console.warn("⚠️ NO SESSION COOKIE FOUND - cross-origin cookies appear to be blocked by your browser!");
        console.warn("Using localStorage for authentication instead (fallback mechanism)");
    }
    
    return hasSessionCookie;
}

// Add this diagnostic information to the debug buttons
function enhancedDebugCookies() {
    const cookieInfo = document.getElementById('cookieInfo');
    if (!cookieInfo) return;
    
    // Try to detect why cookies might be blocked
    const browser = detectBrowser();
    const isThirdPartyCookiesLikelyBlocked = !areCookiesWorking();
    
    let html = '<h5>Cookie Diagnostic Information</h5>';
    html += `<p><strong>Browser:</strong> ${browser.name} ${browser.version}</p>`;
    html += `<p><strong>Cookies detected:</strong> ${document.cookie ? 'Yes' : 'No'}</p>`;
    html += `<p><strong>Session cookie found:</strong> ${document.cookie.includes('qr_attendance_sid') ? 'Yes' : 'No'}</p>`;
    
    if (isThirdPartyCookiesLikelyBlocked) {
        html += '<div style="background-color:#fff3cd;border:1px solid #ffeeba;padding:10px;margin:10px 0;border-radius:4px;">';
        html += '<h5 style="color:#856404;margin-top:0;">Third-party Cookies Appear to be Blocked</h5>';
        
        switch (browser.name.toLowerCase()) {
            case 'chrome':
                html += '<p>To fix in Chrome:</p>';
                html += '<ol>';
                html += '<li>Go to Settings → Privacy and security → Cookies and other site data</li>';
                html += '<li>Select "Allow all cookies" or add your sites to the allowlist</li>';
                html += '</ol>';
                break;
            case 'firefox':
                html += '<p>To fix in Firefox:</p>';
                html += '<ol>';
                html += '<li>Go to Settings → Privacy & Security</li>';
                html += '<li>Under "Enhanced Tracking Protection" select "Custom"</li>';
                html += '<li>Uncheck "Cookies" or set to "Cross-site tracking cookies"</li>';
                html += '</ol>';
                break;
            case 'safari':
                html += '<p>To fix in Safari:</p>';
                html += '<ol>';
                html += '<li>Go to Safari Preferences → Privacy</li>';
                html += '<li>Uncheck "Prevent cross-site tracking"</li>';
                html += '<li>Ensure "Block all cookies" is not selected</li>';
                html += '</ol>';
                break;
            default:
                html += '<p>To fix this issue:</p>';
                html += '<ol>';
                html += '<li>Check your browser settings and enable third-party/cross-site cookies</li>';
                html += '<li>Or try a different browser</li>';
                html += '</ol>';
        }
        
        html += '<p>The application will use localStorage as a fallback, but this is less secure.</p>';
        html += '</div>';
    }
    
    cookieInfo.innerHTML = html;
}

// Function to detect browser
function detectBrowser() {
    const userAgent = navigator.userAgent;
    let browser = {
        name: 'Unknown',
        version: 'Unknown'
    };
    
    if (userAgent.indexOf("Chrome") > -1) {
        browser.name = "Chrome";
        browser.version = userAgent.match(/Chrome\/([0-9.]+)/)[1];
    } else if (userAgent.indexOf("Safari") > -1) {
        browser.name = "Safari";
        browser.version = userAgent.match(/Version\/([0-9.]+)/)[1];
    } else if (userAgent.indexOf("Firefox") > -1) {
        browser.name = "Firefox";
        browser.version = userAgent.match(/Firefox\/([0-9.]+)/)[1];
    } else if (userAgent.indexOf("MSIE") > -1 || userAgent.indexOf("Trident") > -1) {
        browser.name = "Internet Explorer";
        browser.version = userAgent.match(/(?:MSIE |rv:)([0-9.]+)/)[1];
    } else if (userAgent.indexOf("Edge") > -1) {
        browser.name = "Edge";
        browser.version = userAgent.match(/Edge\/([0-9.]+)/)[1];
    }
    
    return browser;
}

// Load classes for the teacher - update this function to be more robust with cookie issues
async function loadClasses() {
    try {
        const classSelect = document.getElementById('classSelect');
        const attendanceClassSelect = document.getElementById('attendanceClassSelect');
        const classListDiv = document.getElementById('classList');
        
        const userId = localStorage.getItem('userId');
        console.log(`Fetching classes for user ID: ${userId}`);
        
        // Check if cookies are working properly
        const cookiesWorking = areCookiesWorking();
        
        // Prepare fetch options with credentials to ensure cookies are sent
        const fetchOptions = {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        };
        
        // ALWAYS add headers from localStorage as fallback
        // This ensures authentication works even if cookies are blocked
        const userRole = localStorage.getItem('userRole');
        if (userId && userRole) {
            fetchOptions.headers['X-User-ID'] = userId;
            fetchOptions.headers['X-User-Role'] = userRole;
            console.log("Added header authentication as " + (cookiesWorking ? "backup" : "primary method"));
        } else {
            console.warn("No localStorage authentication data found! Login may be required");
        }
        
        console.log("Fetch options:", JSON.stringify(fetchOptions));
        
        // Try the authenticated endpoint
        let response = await fetch(`${API_URL}/auth/teacher-classes/${userId}`, fetchOptions);
        
        console.log(`Classes response status: ${response.status}`);
        
        // If unauthorized, try to refresh authentication
        if (response.status === 401) {
            console.log("Authentication failed, attempting refresh...");
            
            // Try to refresh authentication
            try {
                const authResponse = await fetch(`${API_URL}/auth/check-auth`, {
                    credentials: 'include',
                    headers: {
                        'Accept': 'application/json',
                        'Cache-Control': 'no-cache',
                        'X-User-ID': userId,
                        'X-User-Role': userRole
                    }
                });
                
                if (authResponse.ok) {
                    const authData = await authResponse.json();
                    console.log("Authentication refreshed:", authData);
                    
                    // Try the classes endpoint again after refreshing auth
                    response = await fetch(`${API_URL}/auth/teacher-classes/${userId}`, fetchOptions);
                    console.log(`Retry classes response status: ${response.status}`);
                } else {
                    // If refresh fails and we're using header auth, try re-auth endpoint
                    // This is for cases where cookies are blocked but localStorage is available
                    console.log("Auth refresh failed, attempting re-auth with localStorage data");
                    
                    const reAuthResponse = await fetch(`${API_URL}/auth/reauth`, {
                        method: 'POST',
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            userId: userId,
                            role: userRole
                        })
                    });
                    
                    if (reAuthResponse.ok) {
                        const reAuthData = await reAuthResponse.json();
                        console.log("Re-authentication successful:", reAuthData);
                        
                        // Try the classes endpoint again after re-auth
                        response = await fetch(`${API_URL}/auth/teacher-classes/${userId}`, fetchOptions);
                        console.log(`Final retry response status: ${response.status}`);
                    }
                }
            } catch (authError) {
                console.error("Error refreshing authentication:", authError);
            }
        }
        
        // If still unauthorized, show login button
        if (response.status === 401) {
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
        
        // Include both cookie-based and header-based auth
        const headers = { 
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
        };
        
        // Add fallback header auth
        const userId = localStorage.getItem('userId');
        const userRole = localStorage.getItem('userRole');
        if (userId && userRole) {
            headers['X-User-ID'] = userId;
            headers['X-User-Role'] = userRole;
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
        console.log('Logging out...');
        
        // Store the base path for redirect before clearing localStorage
        const basePath = getBasePath();
        
        // Clear localStorage first
        localStorage.clear();
        
        // Clear session cookies
        document.cookie.split(";").forEach(function(c) { 
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });
        
        // Call server logout endpoint
        const response = await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        if (response.ok) {
        const data = await response.json();
            console.log('Server logout response:', data);
        } else {
            console.warn(`Server logout failed with status: ${response.status}`);
        }
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        // Always redirect to login page with proper path, even if the server logout fails
        const basePath = getBasePath();
        console.log(`Redirecting to ${basePath}/index.html`);
        
        // Use replace instead of href to prevent back-button issues
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

// Add this function to check session status
async function checkSession() {
    try {
        // Try to get session info from the server
        const response = await fetch(`${API_URL}/auth/check-auth`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Cache-Control': 'no-cache',
                'X-User-ID': localStorage.getItem('userId'),
                'X-User-Role': localStorage.getItem('userRole')
            }
        });
        
        const data = await response.json();
        console.log("Session check response:", data);
        
        // Display session info
        const sessionInfo = document.getElementById('sessionInfo');
        if (sessionInfo) {
            let html = '<h4>Session Status</h4>';
            html += `<p><strong>Status:</strong> ${data.authenticated ? '✅ Authenticated' : '❌ Not authenticated'}</p>`;
            html += `<p><strong>Session ID:</strong> ${data.sessionId || 'None'}</p>`;
            
            if (data.user) {
                html += '<h5>User Information:</h5>';
                html += '<ul>';
                for (const [key, value] of Object.entries(data.user)) {
                    html += `<li><strong>${key}:</strong> ${value}</li>`;
                }
                html += '</ul>';
            }
            
            html += '<h5>Headers Sent:</h5>';
            html += `<p>X-User-ID: ${localStorage.getItem('userId') || 'None'}</p>`;
            html += `<p>X-User-Role: ${localStorage.getItem('userRole') || 'None'}</p>`;
            
            sessionInfo.innerHTML = html;
        }
    } catch (error) {
        console.error("Session check error:", error);
        const sessionInfo = document.getElementById('sessionInfo');
        if (sessionInfo) {
            sessionInfo.innerHTML = `<h4>Session Check Error</h4><p>${error.message}</p>`;
        }
    }
} 