// הגדרת כתובת ה-CSV של הגיליון המפורסם
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQmfV0HOZ8ndIoFqLDY1KCDzS_5C0rSENoEM4bBLEu37s4UHN2uqTxzqgBh61KnP_2_a8sC76c18mxz/pub?gid=0&single=true&output=csv";

// משתנה שיחזיק את כל הנתונים של המתמיינים
let candidatesData = [];

// אלמנטים ב-DOM
const userSelect = document.getElementById("userSelect");
const cardImage = document.getElementById("card-image");
const schoolEl = document.getElementById("school");
const genderEl = document.getElementById("gender");
const gradeEl = document.getElementById("grade");
const phoneEl = document.getElementById("telephone");

const baseCourseEl = document.getElementById("base-course");
const groupEl = document.getElementById("group");
const additionalCoursesEl = document.getElementById("additional-courses");

const preferInstructorEl = document.getElementById("prefer-instructor");
const preferLogisticsEl = document.getElementById("prefer-logistics");
const preferSocialEl = document.getElementById("prefer-social");

const gradeInstructEl = document.getElementById("grade-instruct");
const gradeKnotsEl = document.getElementById("grade-knots");
const gradeManageEl = document.getElementById("grade-manage");

const interviewImpressionEl = document.getElementById("interview-impression");
const fitReasonEl = document.getElementById("fit-reason");
const importantTraitEl = document.getElementById("important-trait");
const additionalNotesEl = document.getElementById("additional-notes");

/**
 * מפענח CSV מלא בתקן RFC 4180
 * תומך בירידות שורה ובפסיקים בתוך מרכאות
 */
function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentVal = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // דילוג על מרכאות כפולות מוברחות
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = "";
    } else if ((char === "\r" || char === "\n") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      currentRow.push(currentVal.trim());
      if (currentRow.some((val) => val !== "")) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = "";
    } else {
      currentVal += char;
    }
  }

  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some((val) => val !== "")) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * מציאת אינדקס עמודה לפי ביטויים או מחרוזות מזהות
 */
function findColIndex(headers, matchers, fallback = -1) {
  for (const matcher of matchers) {
    const idx = headers.findIndex((h) => {
      const cleanHeader = h.replace(/\r|\n/g, " ").trim();
      return typeof matcher === "string"
        ? cleanHeader.includes(matcher)
        : matcher.test(cleanHeader);
    });
    if (idx !== -1) return idx;
  }
  return fallback;
}

/**
 * פירמוט מספר טלפון ישראלי
 */
function formatPhone(phone) {
  if (!phone) return "-";
  let clean = phone.toString().replace(/\D/g, "");
  if (clean.startsWith("972")) {
    clean = "0" + clean.slice(3);
  } else if (!clean.startsWith("0") && clean.length === 9) {
    clean = "0" + clean;
  }
  if (clean.length === 10) {
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  }
  return phone;
}

/**
 * החלת מחלקת צבע עבור העדפת תפקיד (רוצה=ירוק, מתלבט=צהוב, מעדיף שלא=אדום)
 */
function applyPreferClass(el, val) {
  el.classList.remove("green", "yellow", "red", "neutral");
  if (!val || val === "-") {
    el.classList.add("neutral");
    return;
  }
  const clean = val.trim();
  if (clean.includes("רוצה")) {
    el.classList.add("green");
  } else if (clean.includes("מתלבט")) {
    el.classList.add("yellow");
  } else if (clean.includes("שלא")) {
    el.classList.add("red");
  } else {
    el.classList.add("neutral");
  }
}

/**
 * החלת ערך וצבע ציון (>=90 ירוק, 75-89 צהוב, <75 אדום)
 */
function applyGrade(el, val) {
  el.classList.remove("green", "yellow", "red", "neutral");
  if (val === undefined || val === null || val === "" || val === "-") {
    el.textContent = "-";
    el.classList.add("neutral");
    return;
  }
  const num = Number(val);
  el.textContent = isNaN(num) ? val : num;
  if (isNaN(num)) {
    el.classList.add("neutral");
    return;
  }
  if (num >= 90) {
    el.classList.add("green");
  } else if (num >= 75) {
    el.classList.add("yellow");
  } else {
    el.classList.add("red");
  }
}

/**
 * איפוס כל הכרטיסיות למצב ריק
 */
function renderEmptyState() {
  cardImage.src = "media/placeholder.png";
  schoolEl.textContent = "-";
  genderEl.textContent = "-";
  gradeEl.textContent = "-";
  phoneEl.textContent = "-";

  baseCourseEl.textContent = "-";
  groupEl.textContent = "-";
  additionalCoursesEl.textContent = "-";

  applyPreferClass(preferInstructorEl, null);
  applyPreferClass(preferLogisticsEl, null);
  applyPreferClass(preferSocialEl, null);

  applyGrade(gradeInstructEl, null);
  applyGrade(gradeKnotsEl, null);
  applyGrade(gradeManageEl, null);

  interviewImpressionEl.textContent = "טרם נבחר מתמיין";
  fitReasonEl.textContent = "טרם נבחר מתמיין";
  importantTraitEl.textContent = "טרם נבחר מתמיין";
  additionalNotesEl.textContent = "טרם נבחר מתמיין";
}

/**
 * הצגת נתוני מתמיין נבחר
 */
function renderCandidate(c) {
  if (!c) {
    renderEmptyState();
    return;
  }

  // תמונה
  if (c.photo && c.photo.startsWith("http")) {
    cardImage.src = c.photo;
    cardImage.onerror = () => {
      cardImage.src = "media/placeholder.png";
    };
  } else {
    cardImage.src = "media/placeholder.png";
  }

  // פרטים אישיים
  schoolEl.textContent = c.school || "-";
  genderEl.textContent = c.gender || "-";
  gradeEl.textContent = c.grade || "-";
  phoneEl.textContent = formatPhone(c.phone);

  // קורסים
  baseCourseEl.textContent = c.baseCourse || "-";
  groupEl.textContent = c.group || "-";
  additionalCoursesEl.textContent = c.additionalCourses || "-";

  // העדפות
  applyPreferClass(preferInstructorEl, c.preferInstructor);
  applyPreferClass(preferLogisticsEl, c.preferLogistics);
  applyPreferClass(preferSocialEl, c.preferSocial);

  // ציונים
  applyGrade(gradeInstructEl, c.gradeInstruct);
  applyGrade(gradeKnotsEl, c.gradeKnots);
  applyGrade(gradeManageEl, c.gradeManage);

  // שדות טקסט
  interviewImpressionEl.textContent = c.interviewImpression || "טרם הוזנה התרשמות";
  fitReasonEl.textContent = c.fitReason || "-";
  importantTraitEl.textContent = c.importantTrait || "-";
  additionalNotesEl.textContent = c.additionalNotes || "-";
}

/**
 * שליפת הנתונים מ-Google Sheets ועיבודם
 */
async function loadData() {
  try {
    // הוספת חותמת זמן למניעת מטמון (cache-busting)
    const url = `${SHEET_CSV_URL}&_t=${Date.now()}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`שגיאה בטעינת הנתונים: ${response.status} ${response.statusText}`);
    }

    const csvText = await response.text();
    const rows = parseCSV(csvText);

    if (rows.length < 2) {
      console.warn("הקובץ אינו מכיל שורות נתונים.");
      return;
    }

    const headers = rows[0];

    // מיפוי אינדקסים של עמודות
    const idIdx = findColIndex(headers, ["Submission ID"], 0);
    const nameIdx = findColIndex(headers, ["שם מלא"], 3);
    const roleChoiceIdx = findColIndex(headers, ["Untitled multiple choice field", "מש\"צ"], 4);
    const gradeLevelIdx = findColIndex(headers, ["שכבה"], 5);
    const phoneIdx = findColIndex(headers, ["טלפון"], 6);
    const photoIdx = findColIndex(headers, ["תמונת פנים", "storage.tally.so"], 13);
    const schoolIdx = findColIndex(headers, ["בבית ספר", "אני פעיל כמש\"צ"], 14);
    const baseCourseIdx = findColIndex(headers, ["בסיסי במסגרת"], 15);
    const groupIdx = findColIndex(headers, ["הנהגה במחלקה"], 16);
    const additionalCoursesIdx = findColIndex(headers, ["קורסים נוספים"], 17);

    const preferInstructIdx = findColIndex(headers, ["[מדריכ/ה]"], 18);
    const preferLogisticsIdx = findColIndex(headers, ["[מנהלנ/ית]"], 19);
    const preferSocialIdx = findColIndex(headers, ["[צלמ/ת]"], 20);

    const fitReasonIdx = findColIndex(headers, ["מתאים למנהל/להדריך", "מתאים"], 21);
    const importantTraitIdx = findColIndex(headers, ["התכונה הכי חשובה", "תכונה חשובה"], 22);
    const additionalNotesIdx = findColIndex(headers, ["עוד משהו"], 24);

    const gradeInstructIdx = findColIndex(headers, ["הדרכה"], 25);
    const gradeKnotsIdx = findColIndex(headers, ["כפיתות"], 26);
    const gradeManageIdx = findColIndex(headers, ["ניהול"], 27);

    // עמודת התרשמות מראיון - לפי שם עמודה או עמודה AC (אינדקס 28)
    const interviewImpressionIdx = findColIndex(headers, ["התרשמות מראיון", "התרשמות"], 28);

    candidatesData = [];

    // עיבוד שורות המתמיינים
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const fullName = (row[nameIdx] || "").trim();
      if (!fullName) continue;

      const subId = (row[idIdx] || `row_${r}`).trim();

      // המרת מש"צ/מש"צית לזכר/נקבה
      const rawRole = (row[roleChoiceIdx] || "").trim();
      let genderVal = rawRole;
      if (rawRole.includes("מש\"צית")) {
        genderVal = "נקבה";
      } else if (rawRole.includes("מש\"צ")) {
        genderVal = "זכר";
      }

      candidatesData.push({
        id: subId,
        name: fullName,
        gender: genderVal,
        grade: row[gradeLevelIdx] || "",
        phone: row[phoneIdx] || "",
        photo: row[photoIdx] || "",
        school: row[schoolIdx] || "",
        baseCourse: row[baseCourseIdx] || "",
        group: row[groupIdx] || "",
        additionalCourses: row[additionalCoursesIdx] || "",
        preferInstructor: row[preferInstructIdx] || "",
        preferLogistics: row[preferLogisticsIdx] || "",
        preferSocial: row[preferSocialIdx] || "",
        fitReason: row[fitReasonIdx] || "",
        importantTrait: row[importantTraitIdx] || "",
        additionalNotes: row[additionalNotesIdx] || "",
        gradeInstruct: row[gradeInstructIdx] || "",
        gradeKnots: row[gradeKnotsIdx] || "",
        gradeManage: row[gradeManageIdx] || "",
        interviewImpression:
          interviewImpressionIdx !== -1 && row[interviewImpressionIdx]
            ? row[interviewImpressionIdx].trim()
            : ""
      });
    }

    // אכלוס ה-select
    populateSelect();
  } catch (error) {
    console.error("שגיאה בטעינת נתוני המתמיינים:", error);
  }
}

/**
 * אכלוס רשימת הבחירה ב-HTML
 */
function populateSelect() {
  userSelect.innerHTML = '<option value="" selected>בחר מתמיין</option>';

  candidatesData.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    userSelect.appendChild(opt);
  });
}

// האזנה לבחירת מתמיין
userSelect.addEventListener("change", (e) => {
  const selectedId = e.target.value;
  if (!selectedId) {
    renderEmptyState();
    return;
  }

  const candidate = candidatesData.find((c) => c.id === selectedId);
  renderCandidate(candidate);
});

// טעינה ראשונית בהפעלת הדף
document.addEventListener("DOMContentLoaded", () => {
  renderEmptyState();
  loadData();
});
