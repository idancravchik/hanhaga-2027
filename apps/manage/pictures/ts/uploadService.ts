/**
 * Google Apps Script & Google Drive Photo Upload Service
 */

export interface SavePhotoPayload {
  candidateName: string;
  rowIndex: number;
  imageBase64: string;
}

export interface SavePhotoResult {
  success: boolean;
  fileUrl?: string;
  updatedRow?: number;
  error?: string;
}

// ניתן להגדיר כאן את ה-Web App URL שנוצר ב-Google Apps Script
// למשל: "https://script.google.com/macros/s/AKfycbx.../exec"
export const APPS_SCRIPT_WEBAPP_URL = "";

/**
 * Saves candidate photo to Google Drive and updates the Google Sheet row
 */
export async function uploadCandidatePhoto(
  payload: SavePhotoPayload,
  customUrl?: string
): Promise<SavePhotoResult> {
  const endpoint = customUrl || APPS_SCRIPT_WEBAPP_URL;

  // אם טרם הוגדר URL של Apps Script, נשמור מקומית ונדמה הצלחה
  if (!endpoint) {
    console.info(
      "Apps Script Web App URL is not set yet. Storing snapshot locally in localStorage.",
      payload.candidateName
    );

    try {
      const localStoreKey = `photo_${payload.candidateName.replace(/\s+/g, "_")}`;
      localStorage.setItem(
        localStoreKey,
        JSON.stringify({
          candidateName: payload.candidateName,
          rowIndex: payload.rowIndex,
          savedAt: new Date().toISOString(),
          // Store first 100 chars of base64 to avoid quota issues in demo
          preview: payload.imageBase64.substring(0, 100) + "..."
        })
      );
    } catch {
      // Storage quota exceeded or disabled
    }

    // סימולציית השהיית רשת קלה
    await new Promise((resolve) => setTimeout(resolve, 800));

    return {
      success: true,
      fileUrl: `https://drive.google.com/file/d/mock_preview_id/view?usp=drivesdk`,
      updatedRow: payload.rowIndex
    };
  }

  // שליחה ממשית ל-Google Apps Script Web App
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

    const response = await fetch(endpoint, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8" // text/plain מונע בעיות CORS Preflight עם Apps Script
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`שרת החזיר סטטוס שגיאה: ${response.status}`);
    }

    const data = await response.json();
    return data as SavePhotoResult;
  } catch (error: any) {
    console.error("Error uploading photo to Apps Script:", error);
    return {
      success: false,
      error: error?.message || "שגיאה בהתחברות לשרת שמירת התמונות"
    };
  }
}
