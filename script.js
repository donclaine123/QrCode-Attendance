const API_BASE_URL = "https://qrattendance-backend-production.up.railway.app";
let currentUserId = null; // Store the logged-in user's ID
let videoStream = null; // Store the video stream

// Define video and canvas elements globally
const video = document.getElementById('qr-video');
const canvas = document.getElementById('qr-canvas');
const resultElement = document.getElementById('scan-result');

// Simulate login functionality
document.getElementById('login-form').addEventListener('submit', async function (e) {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();

    if (data.success) {
      currentUserId = data.userId; // Store the user ID
      document.getElementById('login-section').classList.add('hidden');
      if (data.role === "teacher") {
        document.getElementById('teacher-section').classList.remove('hidden');
      } else if (data.role === "student") {
        document.getElementById('student-section').classList.remove('hidden');
      }
    } else {
      alert("Invalid credentials");
    }
  } catch (err) {
    console.error("Login error:", err);
    alert("Failed to log in. Please check the console for details.");
  }
});

// Handle QR code generation
document.getElementById('qr-generator-form').addEventListener('submit', async function (e) {
  e.preventDefault();
  const sessionId = document.getElementById('session-id').value;

  try {
    const response = await fetch(`${API_BASE_URL}/generate-qr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, userId: currentUserId }), // Pass the teacher's userId
    });
    const data = await response.json();

    if (data.success) {
      document.getElementById('qr-code-display').innerHTML = `<img src="${data.qrCodeUrl}" alt="QR Code">`;
    } else {
      alert("Failed to generate QR code");
    }
  } catch (err) {
    console.error("QR generation error:", err);
  }
});

// Handle "View Attendance" button click
document.getElementById('view-attendance').addEventListener('click', async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/attendance?userId=${currentUserId}`); // Pass the teacher's userId
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();

    if (data.success) {
      const attendanceRecords = data.attendance
        .map(record => 
          `Student ID: ${record.studentId}, Session: ${record.sessionId}, Status: <strong>${record.status}</strong>`
        )
        .join('<br>');

      document.getElementById('attendance-list').innerHTML = attendanceRecords 
        ? `<h3>Attendance Records:</h3> ${attendanceRecords}`
        : "<p>No attendance records found.</p>";
    } else {
      alert("Failed to fetch attendance records.");
    }
  } catch (err) {
    console.error("Fetch error:", err);
    alert("Failed to fetch attendance records. Please check the console for details.");
  }
});

// Initialize the scanner only when "Scan QR Code" button is clicked
document.getElementById('scan-once').addEventListener('click', () => {
  startScanner();
});

// Function to start the scanner
function startScanner() {
  if (videoStream) return; // Prevent opening multiple streams

  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then((stream) => {
      videoStream = stream;
      video.srcObject = stream;
      video.play();
      scanQRCode(); // Start scanning
    })
    .catch((err) => {
      console.error('Error accessing camera:', err);
      alert("Camera access denied. Please allow camera permissions.");
    });
}

// Scan QR code
function scanQRCode() {
  const canvasContext = canvas.getContext('2d');

  const scanInterval = setInterval(() => {
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      canvasContext.translate(canvas.width, 0);
      canvasContext.scale(-1, 1);
      canvasContext.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = canvasContext.getImageData(0, 0, canvas.width, canvas.height);
      const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (qrCode) {
        clearInterval(scanInterval); // Stop scanning loop
        processQRData(qrCode.data);
      }
    }
  }, 500);
}

// Process scanned QR code
function processQRData(qrData) {
  fetch(`${API_BASE_URL}/scan-qr`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ qrData, studentId: currentUserId }),
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        alert("Attendance marked successfully!");
        resultElement.textContent = "Attendance marked successfully!";
        stopScanner(); // Close camera after successful scan
      } else {
        alert(data.message || "Invalid QR code");
        resultElement.textContent = data.message || "Invalid QR code";
      }
    })
    .catch(err => {
      console.error("Scan error:", err);
      alert("Failed to mark attendance. Please try again.");
      resultElement.textContent = "Failed to mark attendance. Please try again.";
    });
}

// Stop the scanner (closes camera)
function stopScanner() {
  if (videoStream) {
    videoStream.getTracks().forEach(track => track.stop()); // Stop video stream
    video.srcObject = null;
    videoStream = null;
  }
}

// Teacher Dashboard: View Attendance
document.getElementById('view-attendance').addEventListener('click', async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/attendance`);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();

    if (data.success) {
      const attendanceRecords = data.attendance
        .map(record => 
          `Student ID: ${record.studentId}, Session: ${record.sessionId}, Status: <strong>${record.status}</strong>`
        )
        .join('<br>');

      document.getElementById('attendance-list').innerHTML = attendanceRecords 
        ? `<h3>Attendance Records:</h3> ${attendanceRecords}`
        : "<p>No attendance records found.</p>";
    } else {
      alert("Failed to fetch attendance records.");
    }
  } catch (err) {
    console.error("Fetch error:", err);
    alert("Failed to fetch attendance records. Please check the console for details.");
  }
});

// Show/hide Student ID field based on role selection
document.getElementById('role').addEventListener('change', function () {
  const studentIdField = document.getElementById('student-id-field');
  if (this.value === 'student') {
    studentIdField.classList.remove('hidden');
  } else {
    studentIdField.classList.add('hidden');
  }
});

// Handle registration form submission
document.getElementById('register-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const role = document.getElementById('role').value;
  const email = document.getElementById('reg-email').value;
  const firstName = document.getElementById('first-name').value;
  const lastName = document.getElementById('last-name').value;
  const password = document.getElementById('reg-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  const studentId = role === 'student' ? document.getElementById('student-id').value : null;

  // Validate passwords match
  if (password !== confirmPassword) {
    alert("Passwords do not match!");
    return;
  }

  // Validate student ID (if role is student)
  if (role === 'student' && !studentId) {
    alert("Student ID is required!");
    return;
  }

  // Prepare registration data
  const registrationData = {
    role,
    email,
    firstName,
    lastName,
    password,
    studentId,
  };

  try {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(registrationData),
    });
    const data = await response.json();

    if (data.success) {
      alert("Registration successful! Please log in.");
      document.getElementById('register-section').classList.add('hidden');
      document.getElementById('login-section').classList.remove('hidden');
    } else {
      alert(data.message || "Registration failed. Please try again.");
    }
  } catch (err) {
    console.error("Registration error:", err);
    alert("Failed to register. Please check the console for details.");
  }
});

// Show Register Section when "Register" button is clicked
document.getElementById('show-register').addEventListener('click', function () {
  document.getElementById('login-section').classList.add('hidden');
  document.getElementById('register-section').classList.remove('hidden');
});

// Optional: Add a "Back to Login" button in the Register Section
document.getElementById('register-form').insertAdjacentHTML(
  'beforeend',
  '<button type="button" id="back-to-login">Back to Login</button>'
);

// Handle "Back to Login" button click
document.getElementById('back-to-login').addEventListener('click', function () {
  document.getElementById('register-section').classList.add('hidden');
  document.getElementById('login-section').classList.remove('hidden');
});

