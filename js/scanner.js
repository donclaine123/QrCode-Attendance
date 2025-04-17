// Use global API_URL instead of import
// import API_URL from "./config.js";

document.addEventListener("DOMContentLoaded", async () => {
  // Elements
  const video = document.getElementById("video");
  const canvas = document.getElementById("canvas");
  const scannerBox = document.getElementById("scannerBox");
  const startScanBtn = document.getElementById("startScanBtn");
  const scanStatus = document.getElementById("scanStatus");
  const loadingSection = document.getElementById("loading-section");
  const studentSection = document.getElementById("student-section");
  const authDebug = document.getElementById("auth-debug");
  const logoutBtn = document.getElementById("logoutBtn");
  const welcomeMessage = document.getElementById("welcome-message");
  
  // Debug buttons
  const testCookiesBtn = document.getElementById("test-cookies-btn");
  const checkAuthBtn = document.getElementById("check-auth-btn");
  const debugMessage = document.getElementById("debug-message");

  let scanning = false;
  let stream = null;

  // Scan loop
  let animationFrameId = null; // Keep track of the animation frame

  // Check authentication first
  try {
    console.log("Checking authentication on page load...");
    let isAuthenticated = false;
    
    if (authDebug) {
      authDebug.textContent = "Checking authentication...";
    }
    
    // Try using URL parameters first
    const urlParams = new URLSearchParams(window.location.search);
    const urlUserId = urlParams.get('userId');
    const urlRole = urlParams.get('role');
    
    // Get attendance parameters if they exist
    const sessionId = urlParams.get('session');
    const teacherId = urlParams.get('teacher');
    const subject = urlParams.get('subject');
    
    if (urlUserId && urlRole === 'student') {
      console.log("Using URL parameters for authentication");
      isAuthenticated = true;
      
      // Store user data in sessionStorage
      sessionStorage.setItem('userId', urlUserId);
      sessionStorage.setItem('userRole', 'student');
      
      const firstName = urlParams.get('firstName');
      const lastName = urlParams.get('lastName');
      
      if (firstName) sessionStorage.setItem('firstName', firstName);
      if (lastName) sessionStorage.setItem('lastName', lastName);
      
      if (authDebug) {
        authDebug.textContent = "Authentication from URL parameters successful!";
      }
      
      if (welcomeMessage && firstName) {
        welcomeMessage.textContent = `Welcome, ${firstName}!`;
      }
    }
    // Check sessionStorage if URL parameters aren't available
    else if (sessionStorage.getItem('userId') && sessionStorage.getItem('userRole') === 'student') {
      console.log("Using sessionStorage for authentication");
      isAuthenticated = true;
      
      if (authDebug) {
        authDebug.textContent = "Authentication from sessionStorage successful!";
      }
      
      if (welcomeMessage && sessionStorage.getItem('firstName')) {
        welcomeMessage.textContent = `Welcome, ${sessionStorage.getItem('firstName')}!`;
      }
    }
    // Finally, try session-based authentication
    else {
      console.log("Trying session-based authentication");
      // First try session-based authentication
      const authResponse = await fetch(`${API_URL}/auth/check-auth`, {
        method: "GET",
        credentials: "include",
        headers: { "Accept": "application/json" }
      });
      
      if (authDebug) {
        authDebug.textContent += "\nAuth status: " + authResponse.status;
      }
      
      // If response is successful and user is authenticated
      if (authResponse.ok) {
        const authData = await authResponse.json();
        console.log("Auth data:", authData);
        
        if (authData.authenticated && authData.user.role === 'student') {
          console.log("User is authenticated as student");
          isAuthenticated = true;
          
          // Store in sessionStorage for future use
          sessionStorage.setItem('userId', authData.user.id);
          sessionStorage.setItem('userRole', 'student');
          if (authData.user.firstName) sessionStorage.setItem('firstName', authData.user.firstName);
          if (authData.user.lastName) sessionStorage.setItem('lastName', authData.user.lastName);
          
          if (authDebug) {
            authDebug.textContent += "\nAuthentication successful! Loading dashboard...";
          }
          
          if (welcomeMessage && authData.user && authData.user.firstName) {
            welcomeMessage.textContent = `Welcome, ${authData.user.firstName}!`;
          }
        }
      }
    }
    
    // Final authentication result handling
    if (isAuthenticated) {
      if (loadingSection) loadingSection.style.display = "none";
      if (studentSection) studentSection.style.display = "block";
      
      // Set up event listeners
      setupEventListeners();
      
      // Auto-record attendance if session parameters are in URL
      if (sessionId && teacherId) {
        console.log("Auto-processing attendance from URL parameters");
        scanStatus.textContent = "Processing attendance from QR code...";
        
        // Create attendance popup
        await showAttendancePopup(sessionId, teacherId, subject);
      }
    } else {
      // Not authenticated, redirect to login
      console.log("Not authenticated, redirecting to login");
      if (authDebug) {
        authDebug.textContent += "\nNot authenticated. Redirecting to login page...";
      }
      
      // Clear any existing authentication data
      sessionStorage.clear();
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
      
      // Redirect to login page
      window.location.replace("login.html");
    }
  } catch (error) {
    console.error("Authentication error:", error);
    
    if (authDebug) {
      authDebug.textContent += "\nAuthentication error: " + error.message;
    }
    
    // Clear any existing authentication data
    sessionStorage.clear();
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    
    // Redirect to login page
    window.location.replace("login.html");
  }

  function setupEventListeners() {
    // Start scanner button
    if (startScanBtn) {
      startScanBtn.addEventListener("click", toggleScanner);
    }
    
    // Debug buttons
    if (testCookiesBtn) {
      testCookiesBtn.addEventListener("click", testCookies);
    }
    
    if (checkAuthBtn) {
      checkAuthBtn.addEventListener("click", checkAuthDebug);
    }
  }

  async function toggleScanner() {
    if (scanning) {
      stopScanner();
      startScanBtn.textContent = "Start Scanner";
    } else {
      await startScanner();
      startScanBtn.textContent = "Stop Scanner";
    }
    scanning = !scanning;
  }

  async function startScanner() {
    try {
      scanStatus.textContent = "Requesting camera access...";
      
      // Request camera access with more specific constraints
      stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      // Set up video element
      video.srcObject = stream;
      video.setAttribute("playsinline", true);
      
      // Wait for video to be ready before starting
      video.onloadedmetadata = function() {
        console.log("Video metadata loaded. Video dimensions:", video.videoWidth, "x", video.videoHeight);
        video.play()
          .then(() => {
            console.log("Video playback started successfully");
            
            // Show the scanner UI
            video.style.display = "block";
            scannerBox.style.display = "block";
            
            // Create a viewfinder overlay
            scannerBox.innerHTML = `
              <div class="viewfinder-container">
                <div class="corner top-left"></div>
                <div class="corner top-right"></div>
                <div class="corner bottom-left"></div>
                <div class="corner bottom-right"></div>
                <div class="scanner-line"></div>
              </div>
            `;
            
            scanStatus.textContent = "Camera active. Position QR code in the viewfinder.";
            
            // Start scanning for QR codes
            scanQRCode();
          })
          .catch(playError => {
            console.error("Error playing video:", playError);
            scanStatus.textContent = "Error starting video playback. Please try again.";
          });
      };
      
      // Handle errors in video element
      video.onerror = function() {
        console.error("Video element error:", video.error);
        scanStatus.textContent = "Video error: " + (video.error ? video.error.message : "Unknown error");
      };
      
    } catch (error) {
      console.error("Error accessing camera:", error);
      scanStatus.textContent = `Error: Could not access camera. ${error.name}: ${error.message}`;
      
      // Check for specific errors
      if (error.name === "NotAllowedError") {
        scanStatus.textContent = "Camera access denied. Please grant camera permission.";
      } else if (error.name === "NotFoundError") {
        scanStatus.textContent = "No camera found. Please make sure your device has a camera.";
      } else if (error.name === "NotReadableError") {
        scanStatus.textContent = "Camera is in use by another application or not available.";
      }
    }
  }

  function stopScanner() {
    console.log("Stopping scanner");
    
    // Hide the scanner UI elements
    video.style.display = "none";
    scannerBox.style.display = "none";
    
    // Stop the video stream
    if (stream) {
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      stream = null;
    }
    
    // Clear the video source
    if (video.srcObject) {
      video.srcObject = null;
    }
    
    // Reset scan status
    scanStatus.textContent = "Scanner stopped.";
  }

  function scanQRCode() {
    if (!scanning || !video || video.readyState !== video.HAVE_ENOUGH_DATA) {
      if (scanning) animationFrameId = requestAnimationFrame(scanQRCode); // Keep trying if video not ready
      return;
    }

    try {
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      // Use jsQR library to detect QR code
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code && code.data) {
        // Found a QR code! Stop scanning and handle it.
        scanning = false;
        stopScanner(); // Stop camera, etc.
        startScanBtn.textContent = "Start Scanner"; // Reset button text
        handleQrCode(code); // Call the handler function
        return; // Exit the loop
      } else {
        // No QR code found, continue scanning
        animationFrameId = requestAnimationFrame(scanQRCode);
      }
    } catch (error) {
      console.error("Error during QR Scanning loop:", error);
      scanStatus.textContent = "Error during scan. Please try again.";
      stopScanner();
      startScanBtn.textContent = "Start Scanner";
      scanning = false;
    }
  }

  // Function to handle the detected QR code data (shows modal and navigates)
  function handleQrCode(code) {
    if (code && code.data) {
        console.log(`QR Code detected: ${code.data}`);
        // scanStatus.textContent = 'QR Code Detected! Processing...'; // Modal shows this now
        // video.pause(); // stopScanner already handles pausing/stopping video

        // --- Show Loading Modal ---
        const modalOverlay = document.getElementById('status-modal-overlay');
        const modalIconContainer = document.getElementById('status-modal-icon-container');
        const modalMessage = document.getElementById('status-modal-message');

        if (!modalOverlay || !modalIconContainer || !modalMessage) {
            console.error("Status modal elements not found for scan action!");
            // Proceed without modal if elements are missing, but log error
        } else {
            modalIconContainer.innerHTML = '<div class="spinner"></div>';
            modalMessage.textContent = 'Processing scan...';
            modalOverlay.classList.add('visible');
        }
        // --- End Show Loading Modal ---

        // Stop the scanner animation/loop (redundant if called from scanQRCode, but safe)
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }

        // Navigate to the backend endpoint for processing
        // The modal will remain visible until the browser navigates
        console.log(`Navigating to: ${code.data}`);
        window.location.href = code.data;

    } else {
        console.warn("handleQrCode called with invalid code object");
        scanStatus.textContent = 'Error handling QR code.';
    }
  }

  // Function to test cookies
  async function testCookies() {
    try {
      console.log("Testing cookie functionality...");
      const response = await fetch(`${API_URL}/auth/test-cookie`, {
        method: "GET",
        credentials: "include"
      });
      
      const data = await response.json();
      console.log("Cookie test data:", data);
      
      if (debugMessage) {
        debugMessage.textContent = `Test cookie set. Session ID: ${data.sessionId}`;
        debugMessage.style.color = "green";
      }
    } catch (error) {
      console.error("Cookie test error:", error);
      if (debugMessage) {
        debugMessage.textContent = `Cookie test error: ${error.message}`;
        debugMessage.style.color = "red";
      }
    }
  }

  // Function to check auth and show debug info
  async function checkAuthDebug() {
    if (debugMessage) {
      debugMessage.textContent = "Checking authentication status...";
    }
    
    try {
      // Use the same authentication approach as in other areas
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
        method: "GET",
        credentials: "include",
        headers: headers
      });
      
      const data = await response.json();
      console.log("Auth status:", data);
      
      if (debugMessage) {
        debugMessage.textContent = "Auth status: " + JSON.stringify(data, null, 2);
      }
    } catch (error) {
      console.error("Auth debug error:", error);
      if (debugMessage) {
        debugMessage.textContent = "Error checking auth: " + error.message;
      }
    }
  }

  // Function to show attendance popup (NOW USES GLOBAL MODAL)
  async function showAttendancePopup(sessionId, teacherId, subject) {
    console.log("Processing attendance automatically via global modal...");
    
    // Optional: Show a subtle processing indicator if needed
    // document.getElementById('some-indicator').style.display = 'block';

    // Reference the global modal function (ensure student-dashboard.js is loaded first)
    if (typeof showFeedbackModal !== 'function') {
        console.error("showFeedbackModal function not found! Cannot display feedback.");
        // Fallback to alert if modal function isn't available
        alert("Processing attendance... Check console for details.");
        // Still attempt to record attendance
    }
    
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
        
        // Use the global modal function for feedback
        if (typeof showFeedbackModal === 'function') {
            if (data.success) {
                const details = `Subject: <strong>${data.subject || 'N/A'}</strong><br>Time: <strong>${formatLocalDateTime(new Date())}</strong>`;
                showFeedbackModal(true, 'Attendance Recorded!', details);
                
                // Dispatch event for history update
                document.dispatchEvent(new CustomEvent('attendance-recorded', { 
                  detail: { success: true, subject: data.subject, timestamp: new Date().toISOString() }
                }));
            } else {
                showFeedbackModal(false, 'Recording Failed', data.message || 'Error recording attendance');
            }
        } else {
            // Fallback alert if modal function wasn't found
            alert(data.success ? `Success: ${data.message}` : `Error: ${data.message}`);
        }

    } catch (error) {
        console.error('Attendance recording error:', error);
        // Use the global modal function for error feedback
        if (typeof showFeedbackModal === 'function') {
            showFeedbackModal(false, 'Server Error', `Could not connect or process request: ${error.message}. Please try again.`);
        } else {
            alert(`Server Error: ${error.message}`); // Fallback
        }
    } finally {
        // Optional: Hide processing indicator if shown
        // document.getElementById('some-indicator').style.display = 'none';
    }
  }
});

// Helper function needed by modal display (REMOVED UTC+8 offset)
function formatLocalDateTime(date) { // Renamed from formatDateToUTC8
    try {
        // Just format the provided date using locale settings
        return date.toLocaleString('en-US', {
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