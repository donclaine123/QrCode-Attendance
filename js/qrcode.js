// QR Code Generation functionality

// Function to generate the QR code for a class session
async function generateQRCode() {
  console.log("generateQRCode called");
  
  const classSelect = document.getElementById('class-select');
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
  console.log("Selected class ID:", selectedClassId);
  
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

  try {
    // Get teacher ID from session or localStorage fallback
    const teacherId = sessionStorage.getItem('userId') || localStorage.getItem('userId');
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
    const userRole = sessionStorage.getItem('userRole') || localStorage.getItem('userRole');
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
        teacher_id: teacherId
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
          teacher_id: teacherId
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
      
      // Generate QR code using the library
      try {
        // Check if QRCode is defined
        if (typeof QRCode === 'undefined') {
          throw new Error("QRCode library is not loaded");
        }
        
        // Clear any previous content (with null check)
        if (qrCodeDiv) qrCodeDiv.innerHTML = '';
        else {
          throw new Error("QR code container element not found");
        }
        
        // Create a dedicated div for the QR code
        const qrDiv = document.createElement('div');
        qrDiv.id = 'qrcode';
        qrDiv.style.margin = '20px auto';
        qrCodeDiv.appendChild(qrDiv);
        
        // Create new QR code with proper error handling
        console.log("Creating QR code with options:", {
          text: qrCodeUrl,
          width: 256,
          height: 256,
          correctLevel: QRCode.CorrectLevel ? QRCode.CorrectLevel.H : 2
        });
        
        // Try various QR code library initialization methods
        try {
          new QRCode(qrDiv, {
            text: qrCodeUrl,
            width: 256,
            height: 256,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel ? QRCode.CorrectLevel.H : 2
          });
        } catch (innerError) {
          console.error("First QR code method failed:", innerError);
          
          // Try alternate QR code library methods
          try {
            // Some QR libraries use different initialization
            if (typeof QRCode.generateHTML === 'function') {
              qrDiv.innerHTML = QRCode.generateHTML(qrCodeUrl, {
                ecclevel: 'H',
                size: 256,
                modulesize: 8
              });
            } else if (typeof qrcode === 'function') {
              qrDiv.innerHTML = qrcode(0, 'H', qrCodeUrl);
            } else {
              throw new Error("No compatible QR code generation method found");
            }
          } catch (alternateError) {
            console.error("All QR code methods failed:", alternateError);
            throw alternateError;
          }
        }
        
        console.log("QR code generation attempted");
      } catch (qrError) {
        console.error("QR code library error:", qrError);
        if (qrCodeDiv) {
          // Visual fallback if QR library fails
          qrCodeDiv.innerHTML = `
            <div class="qr-fallback">
              <p>QR Code library couldn't be loaded. Please use this link:</p>
              <a href="${qrCodeUrl}" target="_blank">${qrCodeUrl}</a>
              
              <!-- Add a visual QR code using HTML/CSS as last resort -->
              <div style="margin: 20px auto; width: 256px; background: white; padding: 10px;">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeUrl)}" 
                     alt="QR Code"
                     style="display: block; margin: 0 auto; max-width: 100%;" />
              </div>
            </div>
          `;
        }
      }
      
      // Display success message and URL with expiration timer
      if (statusDiv) {
        statusDiv.innerHTML = `
          <div class="success-message">
            QR Code generated successfully for class session!<br>
            <small>Session ID: ${sessionId}</small>
          </div>
          <p>QR Code URL: <a href="${qrCodeUrl}" target="_blank">${qrCodeUrl}</a></p>
          <div class="expiration-timer">
            <p>This QR code will expire in <span id="countdown">10:00</span></p>
          </div>
        `;
      }
      
      // Set up the countdown timer
      const countdownEl = document.getElementById('countdown');
      if (countdownEl) {
        let timeLeft = 10 * 60; // 10 minutes in seconds
        
        // Parse the expiration time from the response if available
        if (data.expiresAt) {
          const expiresAt = new Date(data.expiresAt);
          const now = new Date();
          timeLeft = Math.max(0, Math.floor((expiresAt - now) / 1000));
          
          // Cap at reasonable value (10 minutes) to prevent display issues
          if (timeLeft > 10 * 60) {
            timeLeft = 10 * 60;
            console.warn("Expiration time too far in future, capping at 10 minutes");
          }
        }
        
        // Start the countdown
        const countdownInterval = setInterval(() => {
          timeLeft--;
          
          if (timeLeft <= 0) {
            clearInterval(countdownInterval);
            countdownEl.textContent = "Expired";
            countdownEl.style.color = "red";
            
            // Disable the attendance button
            const attendanceBtn = document.getElementById('viewAttendanceBtn') || document.getElementById('view-current-attendance-btn');
            if (attendanceBtn) {
              attendanceBtn.disabled = true;
            }
            
            // Update status
            if (statusDiv) {
              statusDiv.innerHTML += `
                <div class="error-message">
                  QR code has expired. Please generate a new one.
                </div>
              `;
            }
            
            // Clear the QR code
            if (qrCodeDiv) {
              qrCodeDiv.innerHTML = `
                <div class="qr-fallback">
                  <p>QR Code has expired. Please generate a new one.</p>
                </div>
              `;
            }
          } else {
            // Format minutes:seconds
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            countdownEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            // Change color when less than 1 minute
            if (timeLeft < 60) {
              countdownEl.style.color = "red";
            }
          }
        }, 1000);
      }
      
      // Save the current session ID for attendance tracking
      sessionStorage.setItem('currentQrSessionId', sessionId);
      
      // Enable the attendance view button
      const attendanceBtn = document.getElementById('viewAttendanceBtn') || document.getElementById('view-current-attendance-btn');
      if (attendanceBtn) {
        attendanceBtn.disabled = false;
      }
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
  }
}

// Function to populate class dropdown
async function populateClassDropdown() {
  const classSelect = document.getElementById('class-select');
  const teacherId = sessionStorage.getItem('userId') || localStorage.getItem('userId');
  
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
    const userRole = sessionStorage.getItem('userRole') || localStorage.getItem('userRole');
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
    const teacherId = sessionStorage.getItem('userId') || localStorage.getItem('userId');
    const userRole = sessionStorage.getItem('userRole') || localStorage.getItem('userRole');
    
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
    console.error("QRCode library not loaded! QR code generation will fall back to an external API.");
    
    // Define a global QRCode constructor to use as fallback
    window.QRCode = function(element, options) {
      console.log("Using fallback QRCode implementation with external API");
      if (typeof element === 'string') {
        element = document.getElementById(element);
      }
      
      if (!element) {
        console.error("QR code element not found");
        return;
      }
      
      // Clear element
      element.innerHTML = '';
      
      // Create QR code using external API
      const qrImg = document.createElement('img');
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(options.text)}`;
      qrImg.alt = 'QR Code';
      qrImg.style.display = 'block';
      qrImg.style.margin = '0 auto';
      qrImg.style.maxWidth = '100%';
      
      element.appendChild(qrImg);
    };
    
    // Add CorrectLevel property to maintain compatibility
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