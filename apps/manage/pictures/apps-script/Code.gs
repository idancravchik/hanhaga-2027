/**
 * Google Apps Script Web App
 * Hanhaga 2027 — Candidate Photo Upload & Google Sheets Sync
 * 
 * הוראות התקנה:
 * 1. פתח את גיליון מיוני מש"בים ב-Google Sheets.
 * 2. בתפריט העליון לחץ על: Extensions (תוספים) > Apps Script.
 * 3. מחק את הקוד הקיים והדבק את הקוד מקובץ זה.
 * 4. לחץ על Deploy (פריסה) > New deployment (פריסה חדשה).
 * 5. בחר בגלגל השיניים סוג: Web app.
 * 6. Execute as: Me (החשבון שלך).
 * 7. Who has access: Anyone (כל אחד, גם אנונימי - נדרש כדי שהאפליקציה תוכל לשלוח POST ללא אימות OAuth מורכב).
 * 8. לחץ Deploy והעתק את ה-Web App URL שנוצר.
 * 9. הדבק את ה-URL בתוך apps/manage/pictures/ts/uploadService.ts
 */

const FOLDER_NAME = "תמונות מתמיינים";
const PHOTO_COLUMN_HEADER = "תמונת פנים"; // שם עמודת התמונה בגיליון

function doPost(e) {
  try {
    const contents = JSON.parse(e.postData.contents);
    const candidateName = contents.candidateName;
    const rowIndex = contents.rowIndex; // אינדקס שורה (1-based) אם הועבר
    const imageBase64 = contents.imageBase64; // data:image/jpeg;base64,...

    if (!candidateName || !imageBase64) {
      return responseJSON({ success: false, error: "Missing candidateName or imageBase64" });
    }

    // 1. קבלת או יצירת תיקיית Drive
    const folder = getOrCreateFolder(FOLDER_NAME);

    // 2. המרת Base64 לקובץ Blob ב-Drive
    const base64Data = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
    const decodedBlob = Utilities.newBlob(
      Utilities.base64Decode(base64Data),
      "image/jpeg",
      candidateName + "_" + Utilities.formatDate(new Date(), "GMT+3", "yyyyMMdd_HHmmss") + ".jpg"
    );

    const file = folder.createFile(decodedBlob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const fileUrl = file.getUrl();

    // 3. עדכון הגיליון הפעיל
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    // מציאת עמודת תמונת פנים
    let photoColIdx = -1;
    for (let c = 0; c < headers.length; c++) {
      if (String(headers[c]).trim().includes(PHOTO_COLUMN_HEADER) || String(headers[c]).trim().includes("תמונה")) {
        photoColIdx = c + 1; // 1-based ל-Sheets
        break;
      }
    }

    // ברירת מחדל לעמודה 14 אם לא נמצאה
    if (photoColIdx === -1) {
      photoColIdx = 14;
    }

    let targetRow = -1;
    if (rowIndex && rowIndex > 1 && rowIndex <= data.length) {
      targetRow = rowIndex;
    } else {
      // מציאת השורה לפי שם המתמיין
      for (let r = 1; r < data.length; r++) {
        const rowText = String(data[r].join(" "));
        if (rowText.includes(candidateName)) {
          targetRow = r + 1;
          break;
        }
      }
    }

    if (targetRow > 0) {
      sheet.getRange(targetRow, photoColIdx).setValue(fileUrl);
    }

    return responseJSON({
      success: true,
      fileUrl: fileUrl,
      updatedRow: targetRow
    });

  } catch (error) {
    return responseJSON({
      success: false,
      error: error.toString()
    });
  }
}

function doGet(e) {
  return responseJSON({ status: "ready", service: "Hanhaga Pictures Sync" });
}

function getOrCreateFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(folderName);
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
