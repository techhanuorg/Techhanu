/**
 * TechHanu — Google Apps Script Backend for Enquiry Form
 * 
 * SETUP INSTRUCTIONS:
 * ==================
 * 1. Go to https://script.google.com/
 * 2. Create a new project (name it: TechHanu Enquiry Form)
 * 3. Delete existing code and paste this entire file
 * 4. Update SPREADSHEET_ID below with your Google Sheet ID
 * 5. Click Deploy > New Deployment
 *    - Type: Web App
 *    - Execute as: Me (your Google account)
 *    - Who has access: Anyone
 * 6. Authorize the app when prompted
 * 7. Copy the Web App URL
 * 8. In index.html, set: const APPS_SCRIPT_URL = 'PASTE_URL_HERE'
 * 
 * GOOGLE SHEET SETUP:
 * ===================
 * 1. Create a new Google Sheet: https://sheets.google.com
 * 2. Copy the Sheet ID from the URL:
 *    https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
 * 3. Paste the ID in SPREADSHEET_ID below
 * 4. Rename the first tab to "Enquiries" (or update SHEET_NAME)
 * 5. The script auto-creates headers on first enquiry
 */

// ===========================================
// CONFIGURATION — Update these values
// ===========================================
const SPREADSHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE';
const SHEET_NAME = 'Enquiries';
// ===========================================

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'TechHanu Enquiry API is running.' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return createErrorResponse('Invalid request format.');
    }

    const name = sanitize(data.name || '');
    const business = sanitize(data.business || '');
    const email = sanitize(data.email || '');
    const phone = sanitize(data.phone || '');
    const wa = sanitize(data.wa || '');
    const service = sanitize(data.service || '');
    const volume = sanitize(data.volume || '');
    const message = sanitize(data.message || '');

    if (!name || name.length < 2) return createErrorResponse('Full name is required.');
    if (!business) return createErrorResponse('Business name is required.');
    if (!isValidEmail(email)) return createErrorResponse('Valid email is required.');
    if (!isValidPhone(phone)) return createErrorResponse('Valid phone is required.');
    if (!service) return createErrorResponse('Service field is required.');

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) return createErrorResponse('Sheet not found. Check SHEET_NAME.');

    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Timestamp', 'Full Name', 'Business / Organization',
        'Email', 'Phone', 'WhatsApp Number', 'Service Required',
        'Expected Enquiry Volume', 'Message', 'Source', 'Status'
      ]);
    }

    sheet.appendRow([
      new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      name, business, email, phone, wa, service, volume, message, 'Website', 'New'
    ]);

    return createSuccessResponse('Enquiry received successfully.');

  } catch (err) {
    console.error('Error:', err.toString());
    return createErrorResponse('Server error. Please try again.');
  }
}

function sanitize(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/<[^>]*>/g, '').replace(/[\r\n]{3,}/g, '\n\n').trim().substring(0, 2000);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  const cleaned = phone.replace(/[\s+\-()]/g, '').slice(-10);
  return /^[6-9]\d{9}$/.test(cleaned);
}

function createSuccessResponse(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: true, message: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}

function createErrorResponse(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: false, error: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}
