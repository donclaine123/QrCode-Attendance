// 📌 Fetch Attendance Records
async function fetchAttendance(userId) {
  try {
      const response = await fetch(`${API_URL}/auth/attendance?userId=${userId}`);
      const data = await response.json();

      if (data.success) {
          console.log("Attendance records:", data.attendance);
          // TODO: Display attendance on frontend
      } else {
          alert("Failed to fetch attendance.");
      }
  } catch (error) {
      console.error("Attendance Fetching error:", error);
  }
}
