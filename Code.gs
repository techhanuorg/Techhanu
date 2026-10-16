/**
 * TechHanu - Google Apps Script Backend for Enquiry Form
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open Google Sheets (https://sheets.google.com) and create a sheet named "TechHanu Enquiries".
 * 2. Copy the Spreadsheet ID from the URL (the string between /d/ and /edit).
 * 3. Go to Google Apps Script (https://script.google.com/) and paste this code.
 * 4. Replace SPREADSHEET_ID below with your actual Google Sheet ID.
 * 5. Click Deploy > New Deployment > Web App:
 *    - Execute as: Me (your Google account)
 *    - Who has access: Anyone
 * 6. Copy the Web App URL and update APPS_SCRIPT_URL in index.html (or leave default if already connected).
 */

const SPREADSHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE'; // Replace with your real Google Sheet ID
const SHEET_NAME = 'Enquiries';

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'ok',
      service: 'TechHanu Enquiry API',
      configured: SPREADSHEET_ID !== 'YOUR_GOOGLE_SHEET_ID_HERE'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createErrorResponse('No payload received.');
    }

    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return createErrorResponse('Invalid request format.');
    }

    // Honeypot bot protection
    if (data.website_hp && data.website_hp.length > 0) {
      return createSuccessResponse('Enquiry received.'); // Silently drop bot submissions
    }

    const name = sanitize(data.name || '');
    const business = sanitize(data.business || '');
    const email = sanitize(data.email || '');
    const phone = sanitize(data.phone || '');
    const wa = sanitize(data.wa || '');
    const service = sanitize(data.service || '');
    const volume = sanitize(data.volume || '');
    const message = sanitize(data.message || '');

    if (!name || name.length < 2) return createErrorResponse('Full name is required (min 2 characters).');
    if (!business) return createErrorResponse('Business or organization name is required.');
    if (!isValidEmail(email)) return createErrorResponse('A valid email address is required.');
    if (!isValidPhone(phone)) return createErrorResponse('A valid 10-digit mobile number is required.');
    if (!service) return createErrorResponse('Please select the service required.');

    if (SPREADSHEET_ID === 'YOUR_GOOGLE_SHEET_ID_HERE' || !SPREADSHEET_ID) {
      return createErrorResponse('Spreadsheet ID is not configured on server.');
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
    }

    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Timestamp (IST)',
        'Full Name',
        'Business / Organization',
        'Email Address',
        'Phone Number',
        'WhatsApp Number',
        'Service Requested',
        'Volume / Scope',
        'Project Requirements',
        'Source',
        'Status'
      ]);
      sheet.getRange(1, 1, 1, 11).setFontWeight('bold').setBackground('#f1f5f9');
    }

    sheet.appendRow([
      new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      name,
      business,
      email,
      phone,
      wa || phone,
      service,
      volume || 'N/A',
      message || 'N/A',
      'Website Form',
      'New'
    ]);

    return createSuccessResponse('Enquiry received successfully.');
  } catch (err) {
    return createErrorResponse('Server error: ' + err.toString());
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
