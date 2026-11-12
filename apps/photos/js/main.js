/**
 * Hanhaga 2027 — Simple & Reliable /photos App
 *
 * - Loads candidate names from Column D ("שם מלא") of sheet "מידע טופס"
 *   in Spreadsheet 1WeyySIVWUOQTnp8feH8htQkbYJBNmRIuaowyKIXiUnE (Read-Only).
 * - Captures a photo via camera (or native mobile camera input).
 * - Saves "<Selected Name>.jpg" to Google Drive folder 1E2CRaFYs9-pESk4aPuqtWPijn-zexdFR.
 */

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzHtUR_9Ceec-fLAcrL0ix_6d5v2ejbEbcvqTnPT9rVG6cXb_zJjFUHAClb9fLuo4YguQ/exec";

// DOM Elements
const nameSelect = document.getElementById("nameSelect");
const refreshNamesBtn = document.getElementById("refreshNamesBtn");

const cameraVideo = document.getElementById("cameraVideo");
const photoCanvas = document.getElementById("photoCanvas");
const switchCameraBtn = document.getElementById("switchCameraBtn");
const fileInputFallback = document.getElementById("fileInputFallback");

const statusBox = document.getElementById("statusBox");
const captureBtn = document.getElementById("captureBtn");
const saveBtn = document.getElementById("saveBtn");

// State
let currentStream = null;
let facingMode = "environment"; // Rear camera by default for taking photos of candidates
let hasCapturedPhoto = false;
let capturedDataUrl = null;
let isSaving = false;

/**
 * Displays a status message
 */
function showStatus(message, type = "info") {
  if (!message) {
    statusBox.hidden = true;
    statusBox.textContent = "";
    return;
  }
  statusBox.hidden = false;
  statusBox.className = `status-box ${type}`;
  statusBox.textContent = message;
}

/**
 * Updates button enabled states
 */
function updateActionButtons() {
  const hasName = Boolean(nameSelect.value && nameSelect.value.trim());
  saveBtn.disabled = !hasName || !hasCapturedPhoto || isSaving;
  captureBtn.disabled = isSaving;
  captureBtn.textContent = hasCapturedPhoto ? "🔄 צילום חוזר" : "📸 צילום תמונה";
}

/**
 * Populates the <select> dropdown with names
 */
function populateDropdown(names) {
  const previousValue = nameSelect.value;
  nameSelect.innerHTML = "";

  const defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.textContent =
    names.length > 0
      ? `בחרו שם מתמיין/ת מהרשימה (${names.length})...`
      : "לא נמצאו שמות בגיליון";
  nameSelect.appendChild(defaultOpt);

  names.forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    nameSelect.appendChild(opt);
  });

  if (previousValue && names.includes(previousValue)) {
    nameSelect.value = previousValue;
  }

  updateActionButtons();
}

/**
 * Loads names from Column D of "מידע טופס" via Apps Script (Read-Only)
 */
async function loadNames() {
  nameSelect.innerHTML = '<option value="">טוען שמות מהגיליון...</option>';
  showStatus("טוען רשימת שמות מגיליון מידע טופס...", "info");

  try {
    const separator = APPS_SCRIPT_URL.includes("?") ? "&" : "?";
    const res = await fetch(`${APPS_SCRIPT_URL}${separator}action=names&_t=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data && data.success && Array.isArray(data.names)) {
      populateDropdown(data.names);
      showStatus("", "info");
      return;
    }
    if (data && data.error) {
      throw new Error(data.error);
    }
  } catch (err) {
    console.error("Apps Script name fetch failed:", err);
    populateDropdown([]);
    showStatus("שגיאה בטעינת שמות מהגיליון: " + (err.message || err), "error");
  }
}

/**
 * Starts the camera video stream
 */
async function startCamera() {
  if (currentStream) {
    currentStream.getTracks().forEach((t) => t.stop());
    currentStream = null;
  }

  // Mirror video only when using front ("user") camera
  if (facingMode === "user") {
    cameraVideo.classList.add("mirrored");
  } else {
    cameraVideo.classList.remove("mirrored");
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showStatus("הדפדפן לא תומך במצלמה חיה. השתמשו בכפתור בחירת תמונה מהמכשיר למטה.", "info");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: 1280 },
        height: { ideal: 960 }
      },
      audio: false
    });
    currentStream = stream;
    cameraVideo.srcObject = stream;
  } catch (err) {
    console.warn("Camera access error:", err);
    showStatus("לא ניתנה הרשאה למצלמה. ניתן לצלם דרך הכפתור 'צילום/בחירת תמונה מהמכשיר'.", "info");
  }
}

/**
 * Captures current video frame onto canvas
 */
function handleCaptureToggle() {
  if (hasCapturedPhoto) {
    // Retake: switch back to live video
    hasCapturedPhoto = false;
    capturedDataUrl = null;
    photoCanvas.hidden = true;
    cameraVideo.hidden = false;
    switchCameraBtn.hidden = false;
    showStatus("", "info");
    updateActionButtons();
    return;
  }

  if (!cameraVideo.videoWidth || !cameraVideo.videoHeight) {
    // If live stream isn't active, trigger native mobile camera input
    fileInputFallback.click();
    return;
  }

  const width = cameraVideo.videoWidth;
  const height = cameraVideo.videoHeight;
  photoCanvas.width = width;
  photoCanvas.height = height;

  const ctx = photoCanvas.getContext("2d");
  ctx.save();
  if (facingMode === "user") {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(cameraVideo, 0, 0, width, height);
  ctx.restore();

  capturedDataUrl = photoCanvas.toDataURL("image/jpeg", 0.88);
  hasCapturedPhoto = true;

  cameraVideo.hidden = true;
  photoCanvas.hidden = false;
  switchCameraBtn.hidden = true;

  if (!nameSelect.value) {
    showStatus("התמונה צולמה! כעת בחרו שם מהרשימה ולחצו על שמירה לדרייב.", "info");
  } else {
    showStatus(`מוכן לשמירה בשם: ${nameSelect.value}.jpg`, "info");
  }

  updateActionButtons();
}

/**
 * Handles fallback image selection / mobile camera capture
 */
function handleFileFallback(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 1280;
      let w = img.width;
      let h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      photoCanvas.width = w;
      photoCanvas.height = h;
      const ctx = photoCanvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);

      capturedDataUrl = photoCanvas.toDataURL("image/jpeg", 0.88);
      hasCapturedPhoto = true;

      cameraVideo.hidden = true;
      photoCanvas.hidden = false;
      switchCameraBtn.hidden = true;

      showStatus(
        nameSelect.value
          ? `מוכן לשמירה בשם: ${nameSelect.value}.jpg`
          : "התמונה נטענה! בחרו שם מהרשימה ולחצו על שמירה לדרייב.",
        "info"
      );
      updateActionButtons();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
  event.target.value = "";
}

/**
 * Uploads the captured photo to Google Drive via Apps Script
 */
async function handleSaveToDrive() {
  if (isSaving) return;

  const selectedName = (nameSelect.value || "").trim();
  if (!selectedName) {
    showStatus("נא לבחור שם מתמיין/ת מהרשימה לפני השמירה.", "error");
    nameSelect.focus();
    return;
  }

  if (!hasCapturedPhoto || !capturedDataUrl) {
    showStatus("נא לצלם תמונה לפני השמירה.", "error");
    return;
  }

  isSaving = true;
  updateActionButtons();
  saveBtn.textContent = "⏳ שומר לדרייב...";
  showStatus(`מעלה את "${selectedName}.jpg" לתיקיית הדרייב...`, "info");

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: {
        // text/plain avoids CORS preflight rejection on Google Apps Script endpoints
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({
        name: selectedName,
        imageBase64: capturedDataUrl
      })
    });

    if (!response.ok) {
      throw new Error(`שגיאת שרת (${response.status})`);
    }

    const result = await response.json();
    if (!result || !result.success) {
      throw new Error((result && result.error) || "שמירת התמונה נכשלה");
    }

    showStatus(`✅ נשמר בהצלחה בדרייב: ${result.fileName || selectedName + ".jpg"}`, "success");

    // Reset for the next candidate
    nameSelect.value = "";
    hasCapturedPhoto = false;
    capturedDataUrl = null;
    photoCanvas.hidden = true;
    cameraVideo.hidden = false;
    switchCameraBtn.hidden = false;
  } catch (err) {
    console.error("Upload failed:", err);
    showStatus(`❌ שגיאה בשמירה: ${err.message || err}`, "error");
  } finally {
    isSaving = false;
    saveBtn.textContent = "💾 שמירה לדרייב";
    updateActionButtons();
  }
}

// Event Listeners
nameSelect.addEventListener("change", () => {
  if (hasCapturedPhoto && nameSelect.value) {
    showStatus(`מוכן לשמירה בשם: ${nameSelect.value}.jpg`, "info");
  }
  updateActionButtons();
});

refreshNamesBtn.addEventListener("click", () => {
  loadNames();
});

switchCameraBtn.addEventListener("click", () => {
  facingMode = facingMode === "environment" ? "user" : "environment";
  startCamera();
});

captureBtn.addEventListener("click", handleCaptureToggle);
fileInputFallback.addEventListener("change", handleFileFallback);
saveBtn.addEventListener("click", handleSaveToDrive);

// Initialize on load
document.addEventListener("DOMContentLoaded", () => {
  startCamera();
  loadNames();
});
