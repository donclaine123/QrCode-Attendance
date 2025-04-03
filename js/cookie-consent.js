/**
 * Cookie Consent Banner
 * Handles displaying a cookie consent banner and managing cookie preferences
 */

// Create and display the cookie consent banner if not already accepted
function initCookieConsent() {
  // Check if user has already accepted cookies
  if (localStorage.getItem('cookiesAccepted') === 'true') {
    return;
  }
  
  // Create banner elements
  const banner = document.createElement('div');
  banner.className = 'cookie-consent-banner';
  banner.style.cssText = `
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: rgba(33, 37, 41, 0.95);
    color: white;
    padding: 15px 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
    z-index: 9999;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    font-family: 'Arial', sans-serif;
  `;
  
  const content = document.createElement('div');
  content.className = 'cookie-content';
  content.innerHTML = `
    <h3 style="margin: 0 0 10px 0; font-size: 18px;">Cookie Consent</h3>
    <p style="margin: 0 0 15px 0; font-size: 14px; line-height: 1.5;">
      This website uses cookies to ensure you get the best experience. Cookies are essential for authentication and 
      session management in this attendance system. Without cookies, some features may not work properly.
    </p>
  `;
  
  const actions = document.createElement('div');
  actions.className = 'cookie-actions';
  actions.style.cssText = `
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  `;
  
  const acceptButton = document.createElement('button');
  acceptButton.textContent = 'Accept Cookies';
  acceptButton.className = 'cookie-accept-btn';
  acceptButton.style.cssText = `
    background-color: #28a745;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    font-size: 14px;
  `;
  
  const settingsButton = document.createElement('button');
  settingsButton.textContent = 'Cookie Settings';
  settingsButton.className = 'cookie-settings-btn';
  settingsButton.style.cssText = `
    background-color: transparent;
    color: white;
    border: 1px solid white;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  `;
  
  // Add event listeners
  acceptButton.addEventListener('click', () => {
    acceptCookies();
    banner.remove();
  });
  
  settingsButton.addEventListener('click', () => {
    showCookieSettings();
  });
  
  // Assemble the banner
  actions.appendChild(acceptButton);
  actions.appendChild(settingsButton);
  content.appendChild(actions);
  banner.appendChild(content);
  
  // Add to document
  document.body.appendChild(banner);
}

// Handle cookie acceptance
function acceptCookies() {
  // Save preference to localStorage
  localStorage.setItem('cookiesAccepted', 'true');
  
  // Create a test cookie to see if cookies are actually working
  document.cookie = 'test_cookie=1; path=/; SameSite=None; Secure';
  
  // Check if cookies are actually enabled
  setTimeout(() => {
    if (!document.cookie.includes('test_cookie')) {
      showCookieHelp();
    }
  }, 500);
}

// Show cookie settings modal
function showCookieSettings() {
  // Create modal container
  const modal = document.createElement('div');
  modal.className = 'cookie-settings-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;
  
  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';
  modalContent.style.cssText = `
    background-color: white;
    border-radius: 8px;
    width: 90%;
    max-width: 500px;
    padding: 20px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
    max-height: 80vh;
    overflow-y: auto;
  `;
  
  modalContent.innerHTML = `
    <h3 style="margin-top: 0; color: #333;">Cookie Settings</h3>
    
    <div style="margin-bottom: 15px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <label style="font-weight: bold; color: #333;">Essential Cookies</label>
        <span style="background: #e9ecef; color: #495057; font-size: 12px; padding: 2px 6px; border-radius: 3px;">Required</span>
      </div>
      <p style="margin: 0; font-size: 14px; color: #666;">
        These cookies are necessary for the website to function properly and cannot be disabled.
        They are used for authentication and session management.
      </p>
    </div>
    
    <hr style="border: 0; border-top: 1px solid #eee; margin: 15px 0;">
    
    <h4 style="color: #333;">Browser Cookie Settings</h4>
    <p style="font-size: 14px; color: #666;">
      If you're experiencing issues with login or sessions, your browser might be blocking third-party cookies.
      Here's how to enable them:
    </p>
    
    <div style="background-color: #f8f9fa; padding: 12px; border-radius: 4px; margin-bottom: 15px;">
      <h5 style="margin-top: 0; color: #333;">Chrome</h5>
      <ol style="font-size: 13px; color: #666; padding-left: 20px; margin-bottom: 0;">
        <li>Go to Settings → Privacy and security → Cookies and other site data</li>
        <li>Select "Allow all cookies" or add this site to the allowlist</li>
      </ol>
    </div>
    
    <div style="background-color: #f8f9fa; padding: 12px; border-radius: 4px; margin-bottom: 15px;">
      <h5 style="margin-top: 0; color: #333;">Firefox</h5>
      <ol style="font-size: 13px; color: #666; padding-left: 20px; margin-bottom: 0;">
        <li>Go to Settings → Privacy & Security → Enhanced Tracking Protection</li>
        <li>Select "Custom" and uncheck "Cookies" or set to "Cross-site tracking cookies"</li>
      </ol>
    </div>
    
    <div style="background-color: #f8f9fa; padding: 12px; border-radius: 4px; margin-bottom: 15px;">
      <h5 style="margin-top: 0; color: #333;">Safari</h5>
      <ol style="font-size: 13px; color: #666; padding-left: 20px; margin-bottom: 0;">
        <li>Go to Safari Preferences → Privacy</li>
        <li>Uncheck "Prevent cross-site tracking"</li>
        <li>Ensure "Block all cookies" is not selected</li>
      </ol>
    </div>
    
    <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 15px;">
      <button id="close-settings" style="background-color: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Close</button>
      <button id="save-settings" style="background-color: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">Save & Accept</button>
    </div>
  `;
  
  // Add event listeners for modal buttons
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
  
  document.getElementById('close-settings').addEventListener('click', () => {
    modal.remove();
  });
  
  document.getElementById('save-settings').addEventListener('click', () => {
    acceptCookies();
    modal.remove();
    
    // Remove the cookie banner if it's still there
    const banner = document.querySelector('.cookie-consent-banner');
    if (banner) banner.remove();
  });
  
  // Close when clicking outside the modal
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Show help if cookies are blocked even after acceptance
function showCookieHelp() {
  const helpBanner = document.createElement('div');
  helpBanner.className = 'cookie-help-banner';
  helpBanner.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background-color: #fff3cd;
    color: #856404;
    border: 1px solid #ffeeba;
    border-radius: 4px;
    padding: 15px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    max-width: 320px;
    z-index: 9998;
    font-family: 'Arial', sans-serif;
  `;
  
  helpBanner.innerHTML = `
    <h4 style="margin-top: 0; margin-bottom: 8px; font-size: 16px;">Cookies Blocked</h4>
    <p style="margin-bottom: 10px; font-size: 13px;">
      It appears your browser is still blocking cookies. This may affect your ability to log in or stay logged in.
    </p>
    <button id="show-cookie-help" style="background-color: #856404; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 13px;">How to Fix</button>
    <button id="dismiss-cookie-help" style="background: none; border: none; color: #856404; text-decoration: underline; cursor: pointer; font-size: 13px; padding: 6px 12px;">Dismiss</button>
  `;
  
  document.body.appendChild(helpBanner);
  
  document.getElementById('show-cookie-help').addEventListener('click', () => {
    showCookieSettings();
    helpBanner.remove();
  });
  
  document.getElementById('dismiss-cookie-help').addEventListener('click', () => {
    helpBanner.remove();
  });
  
  // Auto-dismiss after 10 seconds
  setTimeout(() => {
    if (document.body.contains(helpBanner)) {
      helpBanner.remove();
    }
  }, 10000);
}

// Check cookie status when the page loads
document.addEventListener('DOMContentLoaded', () => {
  // Wait a bit to let other scripts load first
  setTimeout(() => {
    initCookieConsent();
  }, 1000);
}); 