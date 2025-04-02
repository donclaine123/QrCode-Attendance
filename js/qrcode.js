// QR Code Generation functionality

// Helper function to check for cookie storage issues and recover if possible
function checkCookieStorageHealth() {
    // Check if we have localStorage data but no cookies
    const userId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');
    const hasCookies = document.cookie.includes('qr_attendance_sid');
    
    if (userId && userRole && !hasCookies) {
        console.log('Cookie storage issue detected: userId in localStorage but no session cookie');
        
        // Add subtle indicator near the QR button
        const qrButton = document.getElementById('generateQRBtn');
        if (qrButton) {
            qrButton.insertAdjacentHTML('afterend', `
                <span id="cookie-indicator" style="font-size: 12px; margin-left: 10px; color: #e67e22;">
                    <i>Using localStorage fallback</i>
                    <button id="fix-cookie-btn" style="border: none; background: #f39c12; color: white; border-radius: 3px; padding: 2px 5px; margin-left: 5px; cursor: pointer; font-size: 10px;">Fix</button>
                </span>
            `);
            
            // Add click handler to the fix button
            document.getElementById('fix-cookie-btn')?.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                recoverSession();
            });
        }
        
        return false;
    }
    
    return true;
}

// Function to recover session from localStorage when cookies aren't working
function recoverSession() {
    const userId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');
    
    if (!userId || !userRole) {
        console.log('No localStorage data to recover session from');
        return;
    }
    
    console.log('Attempting to recover session from localStorage data');
    
    // Show mini loading indicator
    const indicator = document.getElementById('cookie-indicator');
    if (indicator) {
        indicator.innerHTML = '<i>Recovering session...</i>';
    }
    
    // Call reauth endpoint
    fetch(`${API_URL}/auth/reauth`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            userId: userId,
            role: userRole
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Session recovery response:', data);
        
        if (data.success) {
            if (indicator) {
                indicator.innerHTML = '<i style="color: #27ae60;">Session recovered!</i>';
                
                // Remove indicator after 3 seconds
                setTimeout(() => {
                    indicator.style.opacity = '0';
                    setTimeout(() => indicator.remove(), 500);
                }, 3000);
            }
            
            // Check if we got a cookie
            const hasCookie = document.cookie.includes('qr_attendance_sid');
            if (hasCookie) {
                console.log('Cookie successfully set after recovery');
            } else {
                console.log('Cookie still not set after recovery, will continue using localStorage fallback');
            }
        } else {
            if (indicator) {
                indicator.innerHTML = '<i style="color: #e74c3c;">Recovery failed</i>';
            }
        }
    })
    .catch(error => {
        console.error('Session recovery error:', error);
        if (indicator) {
            indicator.innerHTML = '<i style="color: #e74c3c;">Error recovering session</i>';
        }
    });
}

// Check cookie health on page load
document.addEventListener('DOMContentLoaded', function() {
    // Log library status for debugging
    console.log('QR code library status: Loaded ✅');
    
    // Check if QRCode library is available
    if (typeof QRCode === 'function') {
        console.log('QRCode.CorrectLevel: Available ✅');
    } else {
        console.warn('QRCode library not loaded properly ❌');
    }
    
    // Check cookie health
    setTimeout(checkCookieStorageHealth, 1000);
});

// Function to generate the QR code for a class session
async function generateQRCode() {
  console.log("generateQRCode called");
  
  const classSelect = document.getElementById('classSelect');
  const statusDiv = document.getElementById('status');
  const qrCodeDiv = document.getElementById('qrcode');
  const selectedClassId = classSelect.value;
  
  console.log("Selected class ID:", selectedClassId);
  
  // Clear previous QR code and status
  qrCodeDiv.innerHTML = '';
  statusDiv.textContent = 'Generating QR code...';
  
  if (!selectedClassId) {
    statusDiv.textContent = 'Please select a class first.';
    return;
  }

  try {
    // Get teacher ID from session or localStorage fallback
    const teacherId = localStorage.getItem('userId');
    console.log("Teacher ID:", teacherId);
    
    // Get the selected class
    const selectedClass = document.getElementById('classSelect');
    const selectedClassId = selectedClass.value;
    
    if (!selectedClassId) {
      statusDiv.innerHTML = '<div class="error-message">Please select a class</div>';
      return;
    }
    
    const selectedOption = selectedClass.options[selectedClass.selectedIndex];
    
    // Get subject from the selected option text
    let subject = "";
    if (selectedOption && selectedOption.textContent) {
      subject = selectedOption.textContent;
    }
    
    // Create a session for the selected class
    console.log("Fetching from:", `${API_URL}/auth/generate-qr`);
    const response = await fetch(`${API_URL}/auth/generate-qr`, {
      method: 'POST',
      credentials: 'include', // Important for cookies
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subject: subject,
        class_id: selectedClassId,
        teacher_id: teacherId
      })
    });

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
        
        // Clear any previous content
        qrCodeDiv.innerHTML = '';
        
        // Create new QR code with proper error handling
        console.log("Creating QR code with options:", {
          text: qrCodeUrl,
          width: 256,
          height: 256,
          correctLevel: QRCode.CorrectLevel ? QRCode.CorrectLevel.H : 2
        });
        
        new QRCode(qrCodeDiv, {
          text: qrCodeUrl,
          width: 256,
          height: 256,
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel ? QRCode.CorrectLevel.H : 2
        });
        
        console.log("QR code generated successfully");
      } catch (qrError) {
        console.error("QR code library error:", qrError);
        qrCodeDiv.innerHTML = `
          <div class="qr-fallback">
            <p>QR Code could not be generated. Please use this link:</p>
            <a href="${qrCodeUrl}" target="_blank">${qrCodeUrl}</a>
          </div>
        `;
      }
      
      // Display success message and URL with expiration timer
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
            const attendanceBtn = document.getElementById('viewAttendanceBtn');
            if (attendanceBtn) {
              attendanceBtn.disabled = true;
            }
            
            // Update status
            statusDiv.innerHTML += `
              <div class="error-message">
                QR code has expired. Please generate a new one.
              </div>
            `;
            
            // Clear the QR code
            qrCodeDiv.innerHTML = `
              <div class="qr-fallback">
                <p>QR Code has expired. Please generate a new one.</p>
              </div>
            `;
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
      localStorage.setItem('currentSessionId', sessionId);
      
      // Enable the attendance view button
      const attendanceBtn = document.getElementById('viewAttendanceBtn');
      if (attendanceBtn) {
        attendanceBtn.disabled = false;
      }
    } else {
      statusDiv.innerHTML = `<div class="error-message">Error: ${data.message}</div>`;
    }
  } catch (error) {
    console.error('Error generating QR code:', error);
    statusDiv.innerHTML = `<div class="error-message">Server connection error. Please try again.</div>`;
  }
}

// Function to populate class dropdown
async function populateClassDropdown() {
  const classSelect = document.getElementById('classSelect');
  const teacherId = localStorage.getItem('userId');
  
  if (!classSelect || !teacherId) return;
  
  try {
    const response = await fetch(`${API_URL}/auth/teacher-classes/${teacherId}`, {
      method: 'GET',
      credentials: 'include' // Important for cookies
    });

    const data = await response.json();

    if (data.success) {
      // Clear current options
      classSelect.innerHTML = '<option value="">Select a class</option>';
      
      // Add classes to dropdown
      data.classes.forEach(cls => {
        const option = document.createElement('option');
        option.value = cls.id;
        option.textContent = `${cls.class_name} (${cls.subject})`;
        classSelect.appendChild(option);
      });
    } else {
      console.error('Failed to fetch classes:', data.message);
    }
  } catch (error) {
    console.error('Error fetching classes:', error);
  }
}

// Function to view attendance for the current session
async function viewAttendance() {
  try {
    // Check if the element exists
    const statusDiv = document.getElementById('status');
    const attendanceDiv = document.getElementById('attendanceList');
    
    // Safe check for elements existing
    if (!statusDiv || !attendanceDiv) {
      console.error('Required DOM elements not found for viewAttendance');
      return;
    }
    
    const sessionId = localStorage.getItem('currentSessionId');
    
    if (!sessionId) {
      statusDiv.textContent = 'No active session found. Please generate a QR code first.';
      return;
    }

    statusDiv.textContent = 'Loading attendance data...';
    attendanceDiv.innerHTML = '';
    
    const response = await fetch(`${API_URL}/auth/attendance-reports?session_id=${sessionId}`, {
      method: 'GET',
      credentials: 'include' // Important for cookies
    });

    const data = await response.json();

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