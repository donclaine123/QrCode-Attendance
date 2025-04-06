// QR Code Generation functionality

let currentCountdownInterval = null; // Added: Store interval ID globally

// 📌 NEW: Reusable function to display QR Code details and start timer
// Make it globally accessible
window.displayQrCodeDetails = function(sessionId, qrCodeUrl, expiresAtIso, section) {
    console.log("displayQrCodeDetails called for session:", sessionId);
    
    const qrCodeDiv = document.getElementById('qr-code-container') || document.getElementById('qrcode');
    const statusDiv = document.getElementById('status-message') || document.getElementById('status') || document.getElementById('qr-code-container'); // Find status message div

    if (!qrCodeDiv || !statusDiv) {
        console.error("Cannot display QR details: Container or status element not found.");
        return;
    }

    // Clear previous interval if it exists
    if (currentCountdownInterval) {
        clearInterval(currentCountdownInterval);
        currentCountdownInterval = null;
        console.log("Cleared previous countdown interval.");
    }

    // Display success message and timer placeholder
    statusDiv.innerHTML = `
        <div class="success-message">
          QR Code generated successfully for class session!<br>
          <small>Session ID: ${sessionId}</small>
          ${section ? `<br><small>Section: ${section}</small>` : ''}
        </div>
        <div id="expiration-timer">
          This QR code will expire in <span id="countdown">--:--</span>
        </div>
      `;
    statusDiv.className = 'success'; // Add success class for styling
    
    // Add Direct QR Code Link (ensure it's not duplicated)
    // Remove existing link first if present
    const existingLink = qrCodeDiv.querySelector('.direct-link-container');
    if (existingLink) {
        qrCodeDiv.removeChild(existingLink);
    }
    const linkContainer = document.createElement('div');
    linkContainer.className = 'direct-link-container'; // Add class for potential removal
    linkContainer.style.textAlign = 'center';
    linkContainer.style.marginTop = '10px';
    linkContainer.innerHTML = `<a href="${qrCodeUrl}" id="direct-link" target="_blank">Direct QR Code Link</a>`; // Use ID for styling
    // TEMPORARILY COMMENT OUT TO TEST INTERFERENCE
    // qrCodeDiv.appendChild(linkContainer); 
    console.log("[displayQrCodeDetails] Direct link container prepared, but NOT appended (for testing).");

    // Set up the countdown timer
    const countdownEl = document.getElementById('countdown');
    if (countdownEl) {
        let timeLeft = 0;
        if (expiresAtIso) {
            try {
                const expiresAt = new Date(expiresAtIso);
                const now = new Date();
                timeLeft = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
                console.log(`Countdown starting: ${timeLeft} seconds remaining.`);
            } catch (dateError) {
                console.error("Error parsing expiration date:", expiresAtIso, dateError);
                timeLeft = 0; // Default to expired if parsing fails
            }
        } else {
             console.warn("No expiration time provided for countdown.");
        }

        // Initial display
        if (timeLeft > 0) {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            countdownEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        } else {
             countdownEl.textContent = "Expired";
             countdownEl.style.color = "red";
        }

        // Start the countdown interval if time is left
        if (timeLeft > 0) {
            currentCountdownInterval = setInterval(() => {
                timeLeft--;

                if (timeLeft <= 0) {
                    clearInterval(currentCountdownInterval);
                    currentCountdownInterval = null; // Clear global ID
                    countdownEl.textContent = "Expired";
                    countdownEl.style.color = "red";

                    // Update status message to indicate expiration
                    const timerDiv = document.getElementById('expiration-timer');
                    if (timerDiv) {
                        timerDiv.innerHTML += `<br><span style="color: red; font-weight: bold;">QR code has expired. Generate a new one or use an active session.</span>`;
                    }

                    // Optional: Clear the QR code display area after expiration
                    // if (qrCodeDiv) { qrCodeDiv.innerHTML = '<p style="text-align: center; color: red;">QR Code Expired</p>'; }

                } else {
                    // Format minutes:seconds
                    const minutes = Math.floor(timeLeft / 60);
                    const seconds = timeLeft % 60;
                    countdownEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                    // Change color when less than 1 minute
                    if (timeLeft < 60) {
                        countdownEl.style.color = "orange"; // Use orange or red for warning
                    }
                }
            }, 1000);
        }
    }

    // Save the current session ID for attendance tracking
    sessionStorage.setItem('currentQrSessionId', sessionId);
    console.log("Set currentQrSessionId:", sessionId);

    // Note: Enabling/Disabling attendance button might be better handled elsewhere
    // based on whether *any* active session is displayed, not just this one.
}

// Function to generate the QR code for a class session
async function generateQRCode() {
  console.log("generateQRCode called");
  
  const classSelect = document.getElementById('class-select');
  const sectionInput = document.getElementById('qr-section-input');
  const generateBtn = document.getElementById('generate-qr-code-btn'); // Get the button
  
  if (!classSelect) {
    console.error("Element with ID 'class-select' not found");
    alert("Error: Could not find class selection element");
    return;
  }
  
  // Find the container for QR code
  const qrCodeDiv = document.getElementById('qr-code-container');
  // Find the dedicated status div
  const statusDiv = document.getElementById('status-message'); 
  
  const selectedClassId = classSelect.value;
  const sectionValue = sectionInput ? sectionInput.value.trim() : '';
  
  console.log("Selected class ID:", selectedClassId);
  console.log("Section:", sectionValue);
  
  // Check if we have a place to show the QR code and status
  if (!qrCodeDiv) {
    console.error("QR code container element (#qr-code-container) not found");
    alert("Error: Could not find QR code container");
    return;
  }
   if (!statusDiv) {
    console.error("Status message element (#status-message) not found");
    // We might continue without status, but log it
   }
  
  // Clear previous QR code and status (use specific elements)
  qrCodeDiv.innerHTML = ''; // Clear the main container (will re-add status div later)
  if (statusDiv) {
      statusDiv.textContent = 'Generating QR code...';
      qrCodeDiv.appendChild(statusDiv); // Ensure status div is inside container after clearing
  } else {
      // If statusDiv doesn't exist, maybe add a temporary message to qrCodeDiv
      qrCodeDiv.innerHTML = '<p>Generating QR code...</p>';
  }
  

  if (!selectedClassId) {
    if (statusDiv) statusDiv.textContent = 'Please select a class first.';
    else qrCodeDiv.innerHTML = '<p>Please select a class first.</p>';
    return;
  }
  
  // Disable button to prevent double clicks
  if (generateBtn) generateBtn.disabled = true;

  try {
    // Get teacher ID from sessionStorage
    const teacherId = sessionStorage.getItem('userId');
    console.log("Teacher ID:", teacherId);
    
    if (!teacherId) {
      console.error("No teacher ID found in storage");
      if (statusDiv) statusDiv.innerHTML = '<div class="error-message">Error: No teacher ID found. Please log in again.</div>';
      return;
    }
    
    // No need to get selected class again, we already have it from 'classSelect' above
    // Use the existing classSelect and selectedClassId instead of trying to find it again
    
    const selectedOption = classSelect.options[classSelect.selectedIndex];
    
    // Get subject from the selected option text
    let subject = "";
    if (selectedOption && selectedOption.textContent) {
      subject = selectedOption.textContent;
    }
    
    // Create a session for the selected class
    console.log("Fetching from:", `${API_URL}/auth/generate-qr`);
    
    // Build auth headers from session data
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cache-Control': 'no-cache'
    };
    
    // Add user ID and role to headers as fallback authentication
    const userRole = sessionStorage.getItem('userRole');
    if (teacherId && userRole) {
      headers['X-User-ID'] = teacherId;
      headers['X-User-Role'] = userRole;
    }
    
    console.log("Request headers:", headers);
    console.log("Cookies:", document.cookie);
    
    // First try with credentials and headers
    let response = await fetch(`${API_URL}/auth/generate-qr`, {
      method: 'POST',
      credentials: 'include',
      headers: headers,
      body: JSON.stringify({
        subject: subject,
        class_id: selectedClassId,
        teacher_id: teacherId,
        section: sectionValue
      })
    });
    
    console.log("First attempt status:", response.status);
    
    // If unauthorized, try with a more direct approach for Netlify deployment
    if (response.status === 401) {
      console.log("Retrying with different auth approach for Netlify...");
      
      // For Netlify, we need to try a different endpoint pattern
      const netlifyURL = `/api/auth/generate-qr`;
      console.log("Retrying with URL:", netlifyURL);
      
      response = await fetch(netlifyURL, {
        method: 'POST',
        credentials: 'include',
        headers: headers,
        body: JSON.stringify({
          subject: subject,
          class_id: selectedClassId,
          teacher_id: teacherId,
          section: sectionValue
        })
      });
      
      console.log("Second attempt status:", response.status);
    }

    console.log("Response status:", response.status);
    const data = await response.json();
    console.log("Response data:", data);

    if (data.success) {
      // Session created successfully, now generate QR code
      const sessionId = data.sessionId;
      const qrCodeUrl = data.qrCodeUrl;
      const expiresAtIso = data.expiresAt; // Assuming backend sends ISO string
      const section = data.section;

      console.log("QR Code URL:", qrCodeUrl);
      
      // Ensure statusDiv is found again after potential DOM changes
      const currentStatusDiv = document.getElementById('status-message');

      if (!qrCodeDiv) { /* Check qrCodeDiv again just in case */
          console.error("Cannot generate QR: Container element lost.");
          if (generateBtn) generateBtn.disabled = false;
          return;
      }
      
      // Clear only QR content, leave status message if it exists
      // Find iframe if it exists and remove it
      const existingIframe = qrCodeDiv.querySelector('#qr-code-iframe');
      if(existingIframe) qrCodeDiv.removeChild(existingIframe);
      // Find link container if it exists and remove it
      const existingLinkContainer = qrCodeDiv.querySelector('.direct-link-container');
      if(existingLinkContainer) qrCodeDiv.removeChild(existingLinkContainer);
      
      // Update status message if found
      if (currentStatusDiv) currentStatusDiv.textContent = 'Loading QR Code Image...'; 

      // Generate QR code image using external API
      try {
        const img = new Image();
        img.crossOrigin = 'Anonymous';

        const loadingMsg = document.createElement('div');
        loadingMsg.style.textAlign = 'center';
        loadingMsg.style.padding = '20px';
        loadingMsg.innerHTML = 'Loading QR code...';
        qrCodeDiv.appendChild(loadingMsg);

        img.onload = function() {
            if (loadingMsg && loadingMsg.parentNode) {
                qrCodeDiv.removeChild(loadingMsg);
            }
            // Create an iframe using srcdoc
            const iframe = document.createElement('iframe');
            iframe.id = 'qr-code-iframe';
            iframe.width = '280'; 
            iframe.height = '280';
            iframe.style.border = 'none';
            iframe.style.display = 'block';
            iframe.style.margin = '0 auto';
            // Embed the image directly using srcdoc
            iframe.srcdoc = `
              <!DOCTYPE html>
              <html>
              <head><style>body{margin:0; display:flex; justify-content:center; align-items:center; height:100%;}</style></head>
              <body><img src="${img.src}" alt="QR Code" style="max-width:100%; max-height:100%;"></body>
              </html>
            `;
            qrCodeDiv.appendChild(iframe);
            console.log("QR code rendered via srcdoc iframe");
            
            // Now call the display function AFTER iframe is appended
            console.log('[generateQRCode] Calling window.displayQrCodeDetails...');
            window.displayQrCodeDetails(sessionId, qrCodeUrl, expiresAtIso, section); 
            console.log('[generateQRCode] Returned from window.displayQrCodeDetails.');
            console.log('[generateQRCode] qrCodeDiv outerHTML AFTER displayQrCodeDetails:', qrCodeDiv.outerHTML);

            // No need to revoke Blob URL
        };

        img.onerror = function() {
            console.error("Failed to load QR code image from API.");
             if (loadingMsg && loadingMsg.parentNode) {
                 qrCodeDiv.removeChild(loadingMsg);
             }
             // Show fallback link - ENSURE it targets qrCodeDiv correctly
             const fallbackDiv = document.createElement('div');
             fallbackDiv.innerHTML = `
                <div style="text-align: center; padding: 20px; border: 1px solid #ff6b6b; border-radius: 8px; margin: 20px 0; background-color: #fff9f9;">
                  <p style="margin-bottom: 10px; color: #d63031; font-weight: bold;">QR Code image failed to load. Please use this link:</p>
                  <a href="${qrCodeUrl}" target="_blank" style="color: #0984e3; font-weight: bold;">${qrCodeUrl}</a>
              </div>
            `;
            // Remove potential iframe before adding fallback
            const existingIframeOnError = qrCodeDiv.querySelector('#qr-code-iframe');
            if(existingIframeOnError) qrCodeDiv.removeChild(existingIframeOnError);
            qrCodeDiv.appendChild(fallbackDiv); // Append fallback to main container

            // Still call display details to show status, timer, and *proper* direct link
            window.displayQrCodeDetails(sessionId, qrCodeUrl, expiresAtIso, section);
        };

        img.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrCodeUrl)}`;
        console.log("QR image loading:", img.src);

      } catch (qrError) {
        console.error("Error setting up QR code display:", qrError);
        qrCodeDiv.innerHTML = `<div class="error-message">Error displaying QR code.</div>`;
         // Call display details even on error to show status/link
         displayQrCodeDetails(sessionId, qrCodeUrl, expiresAtIso, section);
      }

    } else { // if (!data.success)
        if (statusDiv) {
            statusDiv.innerHTML = `<div class="error-message">Error generating session: ${data.message}</div>`;
            statusDiv.className = 'error'; // Add error class
        }
        // Clear QR area on error
        if(qrCodeDiv) qrCodeDiv.innerHTML = '';
    }
  } catch (error) {
    console.error('Error in generateQRCode fetch:', error);
    const statusDiv = document.getElementById('status-message') || document.getElementById('status') || document.getElementById('qr-code-container');
    if (statusDiv) {
    statusDiv.innerHTML = `<div class="error-message">Server connection error. Please try again.</div>`;
        statusDiv.className = 'error';
    }
     const qrCodeDiv = document.getElementById('qr-code-container') || document.getElementById('qrcode');
     if(qrCodeDiv) qrCodeDiv.innerHTML = '';
  } finally {
    // Re-enable button regardless of success or failure
    const generateBtn = document.getElementById('generate-qr-code-btn');
    if (generateBtn) generateBtn.disabled = false;
  }
}

// Function to populate class dropdown
async function populateClassDropdown() {
  const classSelect = document.getElementById('class-select');
  const teacherId = sessionStorage.getItem('userId');
  
  if (!classSelect) {
    console.error("Class select element not found");
    return;
  }
  
  if (!teacherId) {
    console.error("Teacher ID not found in storage");
    classSelect.innerHTML = '<option value="">Error: Please log in again</option>';
    return;
  }
  
  try {
    classSelect.innerHTML = '<option value="">Loading classes...</option>';
    
    // Build auth headers from session data
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    };
    
    // Add user ID and role to headers as fallback authentication
    const userRole = sessionStorage.getItem('userRole');
    if (teacherId && userRole) {
      headers['X-User-ID'] = teacherId;
      headers['X-User-Role'] = userRole;
    }
    
    console.log(`Fetching classes for teacher ID: ${teacherId}`);
    console.log("Request headers:", headers);
    console.log("Cookies:", document.cookie);
    
    // First try with credentials only (cookie-based auth)
    let response = await fetch(`${API_URL}/auth/teacher-classes/${teacherId}`, {
      method: 'GET',
      credentials: 'include',
      headers: headers
    });
    
    console.log("First attempt status:", response.status);
    
    // If unauthorized, try with a more direct approach for Netlify deployment
    if (response.status === 401) {
      console.log("Retrying with different auth approach for Netlify...");
      
      // For Netlify, we need to try a different endpoint pattern
      // Try the full request again with explicit auth headers
      const netlifyURL = `/api/auth/teacher-classes/${teacherId}`;
      console.log("Retrying with URL:", netlifyURL);
      
      response = await fetch(netlifyURL, {
        method: 'GET',
        credentials: 'include',
        headers: headers
      });
      
      console.log("Second attempt status:", response.status);
    }
    
    // Process the response
    if (response.ok) {
    const data = await response.json();
      console.log("Classes data:", data);

    if (data.success) {
      // Clear current options
      classSelect.innerHTML = '<option value="">Select a class</option>';
      
      // Add classes to dropdown
        if (data.classes && data.classes.length > 0) {
      data.classes.forEach(cls => {
        const option = document.createElement('option');
        option.value = cls.id;
            option.textContent = cls.class_name || cls.name;
            if (cls.subject) {
              option.textContent += ` (${cls.subject})`;
            }
        classSelect.appendChild(option);
      });
          console.log(`Added ${data.classes.length} classes to dropdown`);
        } else {
          classSelect.innerHTML += '<option disabled value="">No classes found</option>';
          console.log("No classes found in response");
        }
      } else {
        console.error('Failed to fetch classes:', data.message);
        classSelect.innerHTML = `<option value="">Error: ${data.message}</option>`;
      }
    } else {
      // Handle non-OK response
      let errorMessage = `Server error (${response.status})`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        console.error("Couldn't parse error response:", e);
      }
      
      console.error('Failed to fetch classes:', errorMessage);
      classSelect.innerHTML = `<option value="">Error: ${errorMessage}</option>`;
      
      // If we get a 401, show a more helpful message with a reload option
      if (response.status === 401) {
        console.error("Authentication failed. Showing login prompt.");
        classSelect.innerHTML = `
          <option value="">Error: Authentication failed</option>
          <option value="reload">🔄 Click to reload and try again</option>
        `;
        
        // Add event listener to handle the reload option
        classSelect.addEventListener('change', function(e) {
          if (e.target.value === 'reload') {
            window.location.reload();
          }
        });
      }
    }
  } catch (error) {
    console.error('Error fetching classes:', error);
    classSelect.innerHTML = '<option value="">Server error</option>';
  }
}

// Function to view attendance for the current session
async function viewAttendance() {
  try {
    // Check if the element exists
    const statusDiv = document.getElementById('status') || document.getElementById('qr-code-container');
    const attendanceDiv = document.getElementById('attendanceList') || document.getElementById('attendance-records');
    
    // Safe check for elements existing
    if (!statusDiv && !attendanceDiv) {
      console.error('Required DOM elements not found for viewAttendance');
      alert("Error: Cannot find attendance display elements");
      return;
    }
    
    // Get session ID from sessionStorage first, then fall back to localStorage
    const sessionId = sessionStorage.getItem('currentQrSessionId') || localStorage.getItem('currentSessionId');
    
    if (!sessionId) {
      if (statusDiv) statusDiv.textContent = 'No active session found. Please generate a QR code first.';
      return;
    }

    if (statusDiv) statusDiv.textContent = 'Loading attendance data...';
    if (attendanceDiv) attendanceDiv.innerHTML = '';
    
    // Get auth data
    const teacherId = sessionStorage.getItem('userId');
    const userRole = sessionStorage.getItem('userRole');
    
    if (!teacherId || !userRole) {
      console.error("No teacher ID or role found in storage");
      if (statusDiv) statusDiv.innerHTML = '<div class="error-message">Error: No user data found. Please log in again.</div>';
      return;
    }

    // Build auth headers
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    };
    
    // Add user ID and role to headers as fallback authentication
    if (teacherId && userRole) {
      headers['X-User-ID'] = teacherId;
      headers['X-User-Role'] = userRole;
    }
    
    console.log(`Fetching attendance for session ID: ${sessionId}`);
    console.log("Request headers:", headers);
    console.log("Cookies:", document.cookie);
    
    // First try with credentials only
    let response = await fetch(`${API_URL}/auth/attendance-reports?session_id=${sessionId}`, {
      method: 'GET',
      credentials: 'include',
      headers: headers
    });
    
    console.log("First attempt status:", response.status);
    
    // If unauthorized, try with a more direct approach for Netlify deployment
    if (response.status === 401) {
      console.log("Retrying with different auth approach for Netlify...");
      
      // For Netlify, we need to try a different endpoint pattern
      const netlifyURL = `/api/auth/attendance-reports?session_id=${sessionId}`;
      console.log("Retrying with URL:", netlifyURL);
      
      response = await fetch(netlifyURL, {
        method: 'GET',
        credentials: 'include',
        headers: headers
      });
      
      console.log("Second attempt status:", response.status);
    }

    console.log("Response status:", response.status);
    const data = await response.json();
    console.log("Response data:", data);

    if (data.success) {
      if (data.attendance && data.attendance.length > 0) {
        // Get subject from response
        const subject = data.subject || 'Unknown Subject';
        
        // Create table with subject header
        let tableHtml = `
          <div class="attendance-header">
            <h3>Subject: ${subject}</h3>
          </div>
          <table class="attendance-table">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>Check-in Time</th>
              </tr>
            </thead>
            <tbody>
        `;
        
        // Add rows for each attendee
        data.attendance.forEach(student => {
          const checkInTime = new Date(student.timestamp).toLocaleTimeString();
          tableHtml += `
            <tr>
              <td>${student.studentNumber}</td>
              <td>${student.studentName}</td>
              <td>${checkInTime}</td>
            </tr>
          `;
        });
        
        tableHtml += `</tbody></table>`;
        attendanceDiv.innerHTML = tableHtml;
        statusDiv.textContent = `Attendance for ${subject} - ${data.attendance.length} students present`;
      } else {
        // Show subject name even when no students have checked in
        const subject = data.subject || 'Unknown Subject';
        attendanceDiv.innerHTML = `
          <div class="attendance-header">
            <h3>Subject: ${subject}</h3>
          </div>
          <p>No students have checked in yet.</p>
        `;
        statusDiv.textContent = `Waiting for students to check in to ${subject} class...`;
      }
    } else {
      statusDiv.innerHTML = `<div class="error-message">Error: ${data.message}</div>`;
    }
  } catch (error) {
    console.error('Error fetching attendance:', error);
    // Don't try to update DOM if we can't find the elements
    if (document.getElementById('status')) {
      document.getElementById('status').innerHTML = `<div class="error-message">Server connection error. Please try again.</div>`;
    }
  }
}

// Add a window load event listener to log QR library status and initialize the class dropdown
window.addEventListener('load', function() {
  console.log("QR code library status:", typeof QRCode !== 'undefined' ? 'Loaded ✅' : 'Not loaded ❌');
  if (typeof QRCode === 'undefined') {
    console.error("QRCode library not loaded! QR code generation will fail.");
    
    // Add a fallback QRCode implementation
    window.QRCode = function(element, options) {
      if (typeof element === 'string') {
        element = document.getElementById(element);
      }
      if (!element) return;
      
      console.warn("Using fallback QRCode implementation");
      const div = document.createElement('div');
      div.style.border = '1px solid #ccc';
      div.style.padding = '10px';
      div.style.textAlign = 'center';
      div.innerHTML = `
        <p>QR Code could not be generated</p>
        <a href="${options.text}" target="_blank">${options.text}</a>
      `;
      
      element.innerHTML = '';
      element.appendChild(div);
    };
    
    window.QRCode.CorrectLevel = { L: 1, M: 0, Q: 3, H: 2 };
  } else {
    console.log("QRCode.CorrectLevel:", QRCode.CorrectLevel ? "Available ✅" : "Missing ❌");
  }
  
  // Check if we're on a page with class selection (teacher dashboard)
  if (document.getElementById('class-select')) {
    console.log("Initializing class dropdown");
      populateClassDropdown();
    }
});

document.addEventListener('DOMContentLoaded', function() {
    console.log('[QRCode] DOMContentLoaded running...');
    
    // Always attach the listener specific to this script's core function
    const generateQrCodeBtn = document.getElementById('generate-qr-code-btn');
    if (generateQrCodeBtn) {
        // Use a flag to prevent attaching the listener more than once if this script somehow runs twice
        if (!generateQrCodeBtn.dataset.listenerAttached) {
             console.log('[QRCode] Attaching CLICK listener to #generate-qr-code-btn');
             generateQrCodeBtn.addEventListener('click', generateQRCode);
             generateQrCodeBtn.dataset.listenerAttached = 'true';
    } else {
             console.log('[QRCode] CLICK listener already attached to #generate-qr-code-btn.');
        }
    }

    // Check the *specific* elements that might overlap with teacher-dashboard.js
    // Example: If this script ALSO tried to attach listeners to the dropdowns, 
    // we would check flags for those specific elements before attaching here.
    
    // const attendanceClassSelect = document.getElementById('attendance-class-select');
    // if (attendanceClassSelect && !attendanceClassSelect.dataset.listenerAttached) {
    //     console.log('[QRCode] Attaching CHANGE listener to #attendance-class-select (SHOULD NOT HAPPEN IF TEACHER DASHBOARD LOADED)');
    //     // Attach listener... 
    //     attendanceClassSelect.dataset.listenerAttached = 'true';
    // } else if (attendanceClassSelect) {
    //      console.log('[QRCode] Listener already attached to #attendance-class-select by another script.');
    // }

    // Initialize things needed ONLY for QR generation if not already done
    if (!window.dashboardInitialized) { // Use flag only to prevent double *initialization*, not listener attachment
        console.log('[QRCode] Initializing QR code related logic (e.g., populating class dropdown)...');
        if (document.getElementById('class-select')) {
             populateClassDropdown(); // This is likely needed for QR generation
        }
        window.dashboardInitialized = true; // Mark initialization done
    } else {
         console.log('[QRCode] Dashboard logic already initialized, skipping QR-specific init.');
    }
});