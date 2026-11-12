/**
 * Hanhaga 2027 — /photos Backend (Google Apps Script)
 *
 * SAFETY GUARANTEE:
 * - Google Sheets access is 100% READ-ONLY in execution:
 *   only reads Column D ("שם מלא") from tab "מידע טופס".
 * - This script NEVER writes to, edits, or deletes anything in the Google Sheet.
 * - Photo uploads write ONLY to the dedicated Google Drive folder (1E2CRaFYs9-pESk4aPuqtWPijn-zexdFR).
 */

const SPREADSHEET_ID = "1WeyySIVWUOQTnp8feH8htQkbYJBNmRIuaowyKIXiUnE";
const SHEET_NAME = "מידע טופס";
const NAME_COLUMN_INDEX = 4; // Column D ("שם מלא")
const DRIVE_FOLDER_ID = "1E2CRaFYs9-pESk4aPuqtWPijn-zexdFR"; // Folder: "תמונות מתמיינים"

/**
 * פונקציית אימות מהיר:
 * לחצו על "▷ הפעלה" (Run) על פונקציה זו בעורך כדי לאשר לגוגל גישת קריאה לגיליון פעם אחת.
 */
function authorizeSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  Logger.log("החיבור הצליח! שם הגיליון: " + sheet.getName());
  return "OK";
}

/**
 * GET: Returns candidate names from Column D of "מידע טופס" (Read-Only)
 */
function doGet() {
  try {
    let ss = null;
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    } catch (e) {}
    if (!ss) {
      ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    }

    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      return jsonResponse({
        success: false,
        error: 'לא נמצא גיליון בשם "' + SHEET_NAME + '"'
      });
    }

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return jsonResponse({ success: true, names: [] });
    }

    // Read-only fetch of Column D from row 2 to lastRow
    const rawValues = sheet.getRange(2, NAME_COLUMN_INDEX, lastRow - 1, 1).getValues();
    const seen = {};
    const names = [];

    for (let i = 0; i < rawValues.length; i++) {
      const name = String(rawValues[i][0] || "").trim();
      if (name && !seen[name]) {
        seen[name] = true;
        names.push(name);
      }
    }

    return jsonResponse({
      success: true,
      names: names
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      error: String(err)
    });
  }
}

/**
 * POST: Saves the captured photo to Google Drive folder 1E2CRaFYs9-pESk4aPuqtWPijn-zexdFR
 * File name is strictly "<Candidate Name>.jpg". Does NOT touch Google Sheets at all.
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ success: false, error: "בקשה ריקה (Missing postData)" });
    }

    const payload = JSON.parse(e.postData.contents);
    const rawName = String(payload.name || payload.candidateName || "").trim();
    const imageBase64 = String(payload.imageBase64 || "");

    if (!rawName || !imageBase64) {
      return jsonResponse({ success: false, error: "חסר שם מתמיין או תמונה" });
    }

    // Sanitize filename characters (/ \ : * ? " < > |) while preserving Hebrew/normal text
    const safeName = rawName.replace(/[\\/:*?"<>|]/g, "-").trim();
    const fileName = safeName + ".jpg";

    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);

    // Strip data URL prefix and decode base64 into a JPEG Blob
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "");
    const bytes = Utilities.base64Decode(cleanBase64);
    const blob = Utilities.newBlob(bytes, "image/jpeg", fileName);

    // If a photo with the exact same name already exists in this folder, move the old one to trash
    const existingFiles = folder.getFilesByName(fileName);
    while (existingFiles.hasNext()) {
      existingFiles.next().setTrashed(true);
    }

    const file = folder.createFile(blob);

    return jsonResponse({
      success: true,
      fileName: file.getName(),
      fileId: file.getId()
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      error: String(err)
    });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
