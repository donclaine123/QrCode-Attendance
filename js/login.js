const API_URL = "https://qrattendance-backend-production.up.railway.app";
// const API_URL = "http://localhost:5000";

// 📌 Login Function
async function login(email, password) {
  try {
      const response = await fetch(`${API_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (data.success) {
          alert(`Login successful! Role: ${data.role}`);
          localStorage.setItem("userId", data.userId);
          localStorage.setItem("role", data.role);

          // Redirect based on role
          if (data.role === "teacher") {
              window.location.href = "pages/dashboard.html"; 
          } else if (data.role === "student") {
              window.location.href = "pages/student-dashboard.html";
          }
      } else {
          alert(data.message);
      }
  } catch (error) {
      console.error("Login error:", error);
      alert("Server error. Please try again later.");
  }
}

// 📌 Register Function
async function register(role, email, firstName, lastName, password, studentId) {
  try {
      const response = await fetch(`${API_URL}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role, email, firstName, lastName, password, studentId }),
      });

      const data = await response.json();
      alert(data.message);

      if (data.success) {
          // Automatically switch to login section after successful registration
          document.getElementById("register-section").classList.add("hidden");
          document.getElementById("login-section").classList.remove("hidden");
      }
  } catch (error) {
      console.error("Registration error:", error);
  }
}

// 📌 Show Register Section when "Register" button is clicked
document.getElementById('show-register').addEventListener('click', function () {
  document.getElementById('login-section').classList.add('hidden');
  document.getElementById('register-section').classList.remove('hidden');
});

// 📌 Handle "Back to Login" button click
document.getElementById('register-form').insertAdjacentHTML(
  'beforeend',
  '<button type="button" id="back-to-login">Back to Login</button>'
);
document.getElementById('back-to-login').addEventListener('click', function () {
  document.getElementById('register-section').classList.add('hidden');
  document.getElementById('login-section').classList.remove('hidden');
});

// 📌 Attach Login Form Event Listener
document.getElementById("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  await login(email, password);
});

// 📌 Attach Register Form Event Listener
document.getElementById("register-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const role = document.getElementById("role").value;
  const email = document.getElementById("reg-email").value;
  const firstName = document.getElementById("first-name").value;
  const lastName = document.getElementById("last-name").value;
  const password = document.getElementById("reg-password").value;
  const studentId = document.getElementById("student-id")?.value || null; // Only for students

  await register(role, email, firstName, lastName, password, studentId);
});