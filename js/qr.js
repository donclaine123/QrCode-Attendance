// 📌 Generate QR Code Function
async function generateQRCode(sessionId, userId) {
  try {
      const response = await fetch(`${API_URL}/auth/generate-qr`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, userId }),
      });

      const data = await response.json();
      if (data.success) {
          document.getElementById("qr-code").src = data.qrCodeUrl; // Display QR code
      } else {
          alert("Failed to generate QR code.");
      }
  } catch (error) {
      console.error("QR Code Generation error:", error);
  }
}

// 📌 Scan QR Code Function
async function scanQRCode(qrData, studentId) {
  try {
      const response = await fetch(`${API_URL}/auth/scan-qr`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qrData, studentId }),
      });

      const data = await response.json();
      alert(data.message);
  } catch (error) {
      console.error("QR Scan error:", error);
  }
}
