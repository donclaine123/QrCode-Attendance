// QR Code Generation functionality

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
  
  // Find the container for QR code - use qr-code-container as primary, fall back to qrcode
  const qrCodeDiv = document.getElementById('qr-code-container') || document.getElementById('qrcode');
  // Find status div - use qr-code-container as fallback if status doesn't exist
  const statusDiv = document.getElementById('status') || document.getElementById('qr-code-container');
  
  const selectedClassId = classSelect.value;
  const sectionValue = sectionInput ? sectionInput.value.trim() : '';
  
  console.log("Selected class ID:", selectedClassId);
  console.log("Section:", sectionValue);
  
  // Check if we have a place to show the QR code
  if (!qrCodeDiv) {
    console.error("QR code container element not found");
    alert("Error: Could not find QR code container");
    return;
  }
  
  // Clear previous QR code and status (with null checks)
  if (qrCodeDiv) qrCodeDiv.innerHTML = '';
  if (statusDiv) statusDiv.textContent = 'Generating QR code...';
  
  if (!selectedClassId) {
    if (statusDiv) statusDiv.textContent = 'Please select a class first.';
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
      
      // Create the URL for direct login
      const qrCodeUrl = data.qrCodeUrl;
      console.log("QR Code URL:", qrCodeUrl);
      
      // STORE the current session ID and URL for the "View Attendance" button
      sessionStorage.setItem('currentQrSessionId', sessionId);
      sessionStorage.setItem('currentQrCodeUrl', qrCodeUrl); 
      
      // Display Session ID and Expiry Countdown
      const infoDiv = document.createElement('div');
      infoDiv.id = 'qr-info';
      infoDiv.innerHTML = `
        <p>Session ID: ${sessionId}</p>
        ${data.section ? `<p>Section: ${data.section}</p>` : ''}
        <p id="qr-expiry">This QR code will expire in <span id="qr-timer">--:--</span></p>
      `;
      qrCodeDiv.appendChild(infoDiv);
      startExpiryTimer(data.expiresAt); // Start countdown
      
      // Generate QR code image
      const qrImage = document.createElement('img');
      qrImage.alt = "Attendance QR Code";
      qrImage.style.maxWidth = '250px'; // Ensure image fits container
      qrImage.style.height = 'auto';
      qrImage.style.marginTop = '10px';
      qrCodeDiv.appendChild(qrImage);
      
      // Use the qrcode.js library to generate the QR code directly into the img tag's src
      // NOTE: This relies on the qrcode.min.js library being included in the HTML
      if (typeof QRCode !== 'undefined') {
          const qr = new QRCode(document.createElement('div'), { // Temporary div
              text: qrCodeUrl,
              width: 250,
              height: 250,
              colorDark : "#000000",
              colorLight : "#ffffff",
              correctLevel : QRCode.CorrectLevel.H
          });
          // Access the generated image data URL from the library's canvas/img
          // This might vary slightly depending on the library version, check its internals if needed
          const qrCanvas = qr._el.querySelector('canvas');
          const qrImgElement = qr._el.querySelector('img');
          if (qrCanvas) {
              qrImage.src = qrCanvas.toDataURL();
          } else if (qrImgElement) {
              qrImage.src = qrImgElement.src;
          } else {
             console.error("Could not extract QR code image from QRCode.js library.");
             qrImage.alt = "Error generating QR Code image.";
          }
      } else {
          console.error("QRCode library is not loaded. Cannot generate QR code image.");
          qrImage.alt = "QRCode library missing.";
      }
      
      // Add Direct Link Button
      const directLink = document.createElement('a');
      directLink.href = qrCodeUrl;
      directLink.textContent = "Direct QR Code Link";
      directLink.target = "_blank"; // Open in new tab
      directLink.className = "btn btn-link"; // Optional styling
      directLink.style.display = 'block';
      directLink.style.marginTop = '15px';
      qrCodeDiv.appendChild(directLink);
      
      if (statusDiv) statusDiv.textContent = 'QR Code generated successfully!';
      
    } else {
      if (statusDiv) {
      statusDiv.innerHTML = `<div class="error-message">Error: ${data.message}</div>`;
      }
    }
  } catch (error) {
    console.error('Error generating QR code:', error);
    if (statusDiv) {
    statusDiv.innerHTML = `<div class="error-message">Server connection error. Please try again.</div>`;
    }
  } finally {
    // Re-enable button regardless of success or failure
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