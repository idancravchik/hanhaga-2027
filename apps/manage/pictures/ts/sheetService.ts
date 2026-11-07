/**
 * Google Sheet CSV Data Fetcher & Parser
 * Candidate Roster Loader
 */

export interface CandidateItem {
  id: string;
  name: string;
  rowIndex: number; // 1-based index in the Google Sheet
  group?: string;
  hasPhoto?: boolean;
}

export const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQmfV0HOZ8ndIoFqLDY1KCDzS_5C0rSENoEM4bBLEu37s4UHN2uqTxzqgBh61KnP_2_a8sC76c18mxz/pub?gid=0&single=true&output=csv";

// Fallback candidates if network/sheet is not yet populated
export const FALLBACK_CANDIDATES: CandidateItem[] = [
  { id: "row_1", name: "אורי לוי", rowIndex: 2, group: "קבוצה 1" },
  { id: "row_2", name: "נועה כהן", rowIndex: 3, group: "קבוצה 1" },
  { id: "row_3", name: "איתי אברהם", rowIndex: 4, group: "קבוצה 2" },
  { id: "row_4", name: "מיה רוזנברג", rowIndex: 5, group: "קבוצה 2" },
  { id: "row_5", name: "דניאל שפירא", rowIndex: 6, group: "קבוצה 3" },
  { id: "row_6", name: "עומר גולדשטיין", rowIndex: 7, group: "קבוצה 3" },
  { id: "row_7", name: "תמר ברקוביץ'", rowIndex: 8, group: "קבוצה 4" },
  { id: "row_8", name: "שירה מזרחי", rowIndex: 9, group: "קבוצה 4" },
  { id: "row_9", name: "רועי כץ", rowIndex: 10, group: "קבוצה 5" }
];

/**
 * RFC 4180 compliant CSV parser
 */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
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
 * Finds column index by name matchers
 */
function findColIndex(headers: string[], matchers: (string | RegExp)[], fallback = -1): number {
  for (const matcher of matchers) {
    const idx = headers.findIndex((h) => {
      const cleanHeader = h.replace(/\r|\n/g, " ").trim();
      return typeof matcher === "string" ? cleanHeader.includes(matcher) : matcher.test(cleanHeader);
    });
    if (idx !== -1) return idx;
  }
  return fallback;
}

/**
 * Loads candidates from Google Sheets CSV
 */
export async function loadCandidatesFromSheet(): Promise<CandidateItem[]> {
  try {
    const url = `${SHEET_CSV_URL}&_t=${Date.now()}`;
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Failed to fetch sheet CSV: ${response.status}. Using fallback roster.`);
      return FALLBACK_CANDIDATES;
    }

    const csvText = await response.text();
    const rows = parseCSV(csvText);

    if (rows.length < 2) {
      console.warn("Sheet CSV returned no data rows. Using fallback roster.");
      return FALLBACK_CANDIDATES;
    }

    const headers = rows[0];
    const nameIdx = findColIndex(headers, ["שם מלא", "שם", "שם פרטי ומשפחה"], 3);
    const photoIdx = findColIndex(headers, ["תמונת פנים", "תמונה", "storage.tally.so"], 13);
    const groupIdx = findColIndex(headers, ["הנהגה במחלקה", "קבוצה", "שכבה"], 16);

    const candidates: CandidateItem[] = [];

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const fullName = (row[nameIdx] || "").trim();
      if (!fullName) continue;

      const groupVal = groupIdx !== -1 && row[groupIdx] ? row[groupIdx].trim() : undefined;
      const photoVal = photoIdx !== -1 && row[photoIdx] ? row[photoIdx].trim() : undefined;

      candidates.push({
        id: `row_${r + 1}`,
        name: fullName,
        rowIndex: r + 1, // 1-based Google Sheet row
        group: groupVal,
        hasPhoto: Boolean(photoVal && photoVal.startsWith("http"))
      });
    }

    if (candidates.length === 0) {
      return FALLBACK_CANDIDATES;
    }

    return candidates;
  } catch (error) {
    console.warn("Error fetching candidates from sheet:", error);
    return FALLBACK_CANDIDATES;
  }
}
