# Product Requirements Document (PRD) & Technical Plan: Multi-Course Portal (`multi-course.md`)

**Architecture Model:** Option A (Logical Cohort Partitioning in a Single Firestore DB) + Approach D (Master Templates & Rollover Blueprints)  
**Target Deployment:** New Year-Agnostic Firebase Project + Custom Domain  
**Document Purpose:** Unified Product & Engineering specification for transforming the portal into a centrally controlled, multi-course, offline-portable platform.

---

## 1. Product Vision & Core User Flows

The platform runs recurring courses (yearly, semi-annual, or concurrent regional/thematic courses). Instead of resetting or redeploying code between cycles, a single **Central Control Page** governs all courses on one Firebase project and custom domain.

### 1.1 Three Distinct Entry Points (URL Architecture)

| Route | Audience | Behavior & Experience |
| :--- | :--- | :--- |
| **`/control`** | Single Global Manager (`super_admin`) | Protected login with **one fixed, immutable username & password** (configured in Firebase Secrets / codebase; cannot be edited via UI). Unlocks full course lifecycle management, templates, exports, and offline course imports. |
| **`/c/<courseSlug>`** *(Course-Specific Link)* | Cadets, Instructors, Assistants, Inspectors, Course Admins | **Completely isolated portal.** Loads directly with **that course's Logo, Name, and isolated database**. Users entering via this link behave 100% as they do in the current single-course app and **have zero visibility or awareness that other courses exist**. |
| **`/`** *(Regular Root Link)* | Anyone visiting the bare domain | Clean RTL **Course Gateway**: displays a dropdown of currently **`active`** courses + an **"המשך לעמוד הקורס"** (Continue to Course Page) button. Selecting a course and clicking Continue navigates directly to `/c/<courseSlug>`, where the standard isolated course login begins. |

> **Sub-route compatibility:** `/c/<courseSlug>/game` launches the Field Game scoped to that specific course (preserving existing `/game` routing logic as well).

### 1.2 Inactive / Archived Course Behavior
- Courses with `status: 'inactive'` are **automatically hidden** from the `/` dropdown.
- Direct visits to `/c/<courseSlug>` for an inactive course display a clean notice (*"קורס זה אינו פעיל כרגע"*) and load **zero** course data.
- From `/control`, the Global Manager can still view an inactive course in **Read-Only Archive Mode**, export it to a portable file, reactivate it, or purge it from Firestore after saving an offline backup.

---

## 2. Central Control Page (`/control`) Requirements

### 2.1 Immutable Single-Manager Authentication
- **Fixed Credentials:** One fixed `username` + `password` pair defined at the server/project configuration level (e.g., Cloud Functions secret / `STAFF_SUPER_ADMIN_HASH` in Firebase Environment Secrets — **never modifiable from any web UI**).
- **Security Best Practice:** While conceptually fixed/hardcoded for governance, store only the **SHA-256 / scrypt hash** (or Firebase Secret Manager value) on the server (`functions/src/routes/superAdmin.ts`), never plaintext secrets in the frontend React bundle.
- **Session Token:** Submitting valid credentials to `POST /api/v1/super-admin/login` mints a Firebase Custom Auth Token with `{ isSuperAdmin: true, role: 'super_admin' }`.

### 2.2 Global Course Management Dashboard
Once signed in to `/control`, the Global Manager sees:
1. **Course List Table / Cards:**
   - Logo thumbnail, Course Name, URL Slug (`/c/<slug>`), Status badge (`פעיל` / `לא פעיל`), Cadet & Staff counts, Created date.
   - Quick Actions per course:
     - **Copy Direct Link** (`https://<new-domain>/c/<slug>`)
     - **Toggle Active / Inactive** (instantly enables/disables access and enforces read-only lock)
     - **Open Course (Admin / Archive View)** (enters `/c/<slug>` with Super Admin banner)
     - **Export Course Package** (`.hanhaga.json` offline package + CSV reports bundle)
     - **Delete Course** (strictly allowed only after course is set `inactive` + confirmation typing the slug, for wiping old data once backed up offline)
2. **Create New Course Wizard (with Approach D Blueprints):**
   - **Basic Info:** Course Name (e.g., `"קורס הנהגה"` or custom name), URL Slug (auto-generated or custom Latin slug, e.g., `north`, `winter`, `hanhaga-a`), **Course Logo** (upload PNG/JPG/SVG or select default).
   - **Creation Source (Approach D):**
     - **Blank Course:** Clean empty course ready for setup.
     - **From Master Blueprints (`/templates`):** Pre-loads standard exam templates (without grades), recurring event structure, and default tag catalog.
     - **Rollover / Clone from Existing Course:** Select another course and pick what to copy (exam definitions, event skeletons, tag catalog, and/or selected returning crew members — zero cadets/grades copied).
     - **Import from CSV Roster:** Upload a CSV during creation to immediately populate the initial crew and cadets list.
3. **Import Saved Offline Course (`.hanhaga.json` / CSV):**
   - Upload a previously exported `.hanhaga.json` course package from disk.
   - Preview manifest details (original course name, logo, counts of users/exams/grades/events, integrity checksum verification).
   - Choose target slug (auto-resolve if collision) and initial status (`active` or `inactive`), then restore the entire course cleanly into Firestore!

---

## 3. Portable Offline Course Format & CSV Support

To allow storing old courses completely **offline** (outside Firestore) and re-importing them anytime on demand:

### 3.1 `.hanhaga.json` Full Course Package Specification
A single self-contained, human-inspectable JSON file exported from `/control`:
```json
{
  "schemaVersion": "1.0",
  "exportedAt": "2027-08-01T10:00:00.000Z",
  "checksumSha256": "<sha256-of-payload>",
  "course": {
    "slug": "winter",
    "name": "קורס הנהגה - מחזור חורף",
    "logoBase64OrUrl": "data:image/png;base64,...",
    "status": "inactive",
    "createdAt": "2027-01-10T08:00:00.000Z"
  },
  "config": {
    "staffLoginMethod": "passcode",
    "isSiteClosed": false,
    "tagCatalog": []
  },
  "data": {
    "users": [],
    "exams": [],
    "grades": [],
    "attendance": [],
    "events": [],
    "notes": [],
    "bulletin_boards": []
  }
}
```
* **Self-Contained Logo:** During export, if `logoUrl` points to Firebase Storage, the exporter embeds the image bytes (`data:image/...`) or stores the blob inside the package so that even if Firestore/Storage is later wiped, re-importing the file offline restores the exact visual branding!
* **Integrity Validation:** On import, the backend verifies `schemaVersion` and `checksumSha256` before writing any documents via `BulkWriter`.

### 3.2 CSV Import & Export
* **Export CSV Bundle:** Existing per-table CSV exports (Users, Grades Matrix, Attendance Report, Events) packaged cleanly from `/control` for Excel / Google Sheets archiving.
* **Import CSV Wizard:** Parses UTF-8 (with BOM for Hebrew Excel) CSV files matching columns (`name`, `phone`, `role`, `group`, `school`) with preview validation and duplicate-phone warnings before creating users inside the target course.

---

## 4. New Firebase Project & Custom Domain Setup (Phase 0)

Since the app will be hosted on a **new Firebase project** with a **new custom domain**, complete the following infrastructure setup first:

1. **Provision New Project:** Create a year-agnostic Firebase project (e.g., `hanhaga-portal`), upgrade to **Blaze**, and set a billing budget alert.
2. **Firestore & PITR:** Create Native Firestore DB in a nearby region (`me-west1` or `europe-west1`) and enable **Point-in-Time Recovery (PITR)**.
3. **Firebase Storage:** Enable Storage bucket for course logos (`/course_logos/{courseId}/logo.*`) and bulletin images (`/courses/{courseId}/bulletins/...`), configuring CORS if needed.
4. **Firebase Auth & App Check:**
   - Enable Anonymous Auth + Custom Token authentication.
   - Register a **new reCAPTCHA Enterprise site key** bound to the **new custom domain**.
5. **Hosting & Custom Domain:** Connect the new domain in Firebase Hosting and update repo configs:
   - `.firebaserc` -> new project ID
   - `firebase.json` -> new hosting `site` ID (keep existing CSP headers, `/api/**` rewrite, and `** -> /index.html` SPA rewrite)
   - `apps/main/.env.production` -> new `VITE_FIREBASE_*` keys & new `VITE_FIREBASE_RECAPTCHA_SITE_KEY`
   - `apps/main/src/config/firebase.ts` -> read strictly from `import.meta.env` (remove `hanhaga-2027` fallbacks)
   - `apps/main/index.html` -> update canonical/OG URLs to the new domain
   - `.github/workflows/firebase-hosting-*.yml` -> update `projectId` and GitHub service account secret

---

## 5. Firestore Schema (Option A + Approach D)

```text
/system/
  └── settings                      <-- { maintenanceMode }

/templates/                         <-- Approach D Reusable Blueprints
  ├── metadata                      <-- Default tagCatalog, default logo/settings
  ├── exam_templates/{templateId}   <-- Reusable exam definitions & categories
  └── event_templates/{templateId}  <-- Reusable event skeletons

/courses/{courseId}/                <-- courseId == URL slug (lowercase alphanumeric + hyphens)
  │  Doc fields: {
  │    id, slug, name, logoUrl, status: 'active' | 'inactive',
  │    createdAt, updatedAt, clonedFromCourseId
  │  }
  ├── config/settings               <-- { staffLoginMethod, isSiteClosed, tagCatalog }
  ├── users/{phone}                 <-- Cadets & crew strictly scoped to this course
  ├── exams/{examId}
  ├── grades/{gradeId}
  ├── attendance/{studentId}
  ├── notes/{studentId}
  ├── events/{eventId}
  └── bulletin_boards/{boardId}
```

### Why Path Partitioning (`/courses/{courseId}/...`)?
- Zero risk of data bleed between Course A and Course B.
- Per-course settings (`staffLoginMethod`, `isSiteClosed`, `tagCatalog`, `logoUrl`, `name`) never collide.
- Deleting a backed-up course only requires a recursive Admin SDK delete on `courses/{courseId}` without scanning shared global collections.

---

## 6. Security Rules & Custom Auth Claims

### 6.1 Token Claims Issued by Cloud Functions
- **Course User / Staff Login (`POST /api/v1/auth/login` with `courseSlug`):**
  - Verifies course exists and `status === 'active'`.
  - Mints Custom Token with `{ role, courseId, phone }`.
- **Global Manager Login (`POST /api/v1/super-admin/login`):**
  - Validates fixed `username` + `password` against immutable server-side environment secret / SHA-256 hash.
  - Mints Custom Token with `{ role: 'admin', isSuperAdmin: true }`.

### 6.2 `firestore.rules` Design
- **`isSuperAdmin()`:** `request.auth != null && request.auth.token.isSuperAdmin == true`
- **`isCourseActive(courseId)`:** `get(/databases/$(database)/documents/courses/$(courseId)).data.status == 'active'`
- **`hasCourseAccess(courseId)`:** `isSuperAdmin() || (isAuthenticated() && request.auth.token.courseId == courseId)` (with fallback check while session/rules align)
- **Public Metadata Rule (`/courses/{courseId}`):**
  - `allow read: if true;` (exposes only `slug`, `name`, `logoUrl`, `status` for the `/` dropdown and `/c/<slug>` branding — zero PII).
  - `allow write: if false;` (mutations performed exclusively via Cloud Functions Admin SDK).
- **Subcollection Write Lock:**
  - All writes under `/courses/{courseId}/{subcollection}/**` require **`isCourseActive(courseId)`**.
  - When the Global Manager marks a course `inactive`, Firestore itself blocks any accidental write—even from course admins!

---

## 7. Backend & Frontend Technical Breakdown

### 7.1 Backend (`functions/src/`)
- Refactor `functions/src/config.ts`: replace static `PATHS` with `getCoursePaths(courseId)` factory.
- Update existing routes (`auth.ts`, `students.ts`, `exams.ts`, `grades.ts`, `attendance.ts`, `events.ts`, `reports.ts`) to resolve `courseId` from request body / `:courseId` param / `X-Course-Id` header and enforce active-course check on mutations.
- Add `functions/src/routes/superAdmin.ts` & `functions/src/routes/courses.ts`:
  - `POST /api/v1/super-admin/login` (fixed immutable credentials check + rate limiter)
  - `GET /api/v1/courses/public` (active courses list for `/` dropdown + single course metadata for `/c/:slug`)
  - `GET /api/v1/courses` (`super_admin` — all active & inactive courses with counts)
  - `POST /api/v1/courses` (`super_admin` — create new course with logo, Approach D template selection / clone options, and optional CSV roster batch write)
  - `PATCH /api/v1/courses/:courseId` (`super_admin` — update name, logo, or toggle `active`/`inactive`)
  - `GET /api/v1/courses/:courseId/export` (`super_admin` — generate complete portable `.hanhaga.json` bundle with SHA-256 checksum & embedded logo)
  - `POST /api/v1/courses/import` (`super_admin` — validate checksum/schema, upload embedded logo if present, restore full course via `BulkWriter`)
  - `DELETE /api/v1/courses/:courseId` (`super_admin` — only allowed if `status === 'inactive'`, recursive `firestore.recursiveDelete`)

### 7.2 Frontend (`apps/main/src/`)
- **Router / Entry Resolver (`CourseContext.tsx` & `App.tsx`):**
  - Parse `window.location.pathname`:
    - `/control` -> render `SuperAdminLoginView` / `ControlCenterView`
    - `/c/:slug` (or `/c/:slug/game`) -> resolve course metadata by `slug`. If `active`, mount full isolated app shell branded with `course.name` and `course.logoUrl`. If `inactive` (and user is not `super_admin`), render inactive notice.
    - `/` -> render `CourseGatewayView`: clean branded card with dropdown of all `active` courses + **"המשך לעמוד הקורס"** button navigating to `/c/<selectedSlug>`.
- **Isolated Course Shell (`LoginView`, `AdminView`, `InstructorView`, `StudentView`, `GameView`):**
  - Replace hardcoded `"קורס הנהגה"` / `/logo.png` in headers and login card with dynamic `currentCourse.name` and `currentCourse.logoUrl` (while keeping global defaults on `/` and `/control`).
  - Update `<title>` dynamically (`document.title = currentCourse.name`).
  - Replace all `artifacts/${appId}` references across the 13 source files with `courseCollection(db, courseId, ...)` helpers.
  - Display a Read-Only Archive Banner when a `super_admin` previews an `inactive` course and disable mutation buttons.
- **UI Components for `/control` (`views/control/`):**
  - `ControlLoginView.tsx` (username + password form; zero "forgot/edit password" flows).
  - `CourseManagerDashboard.tsx` (course grid, status switches, direct link copy, quick export, safe delete).
  - `CreateCourseWizardModal.tsx` (name, slug, logo uploader, Approach D blueprint/clone picker, CSV roster uploader).
  - `ImportCourseModal.tsx` (drag-and-drop `.hanhaga.json` file inspector, checksum check, slug assignment, restore button).
  - `TemplatesManagerModal.tsx` (edit Approach D reusable exam & event blueprints).

---

## 8. Phased Implementation Plan

### Phase 1: Infrastructure & New Project Cutover
- [ ] Provision new Firebase project, enable Blaze, PITR, Auth, Storage, App Check, Custom Domain.
- [ ] Configure `.env`, `.firebaserc`, `firebase.json`, `index.html`, and GitHub Actions for the new project/domain.

### Phase 2: Backend Multi-Course Engine & Security
- [ ] Refactor `functions/src/config.ts` and all existing API routes to be `courseId`-aware.
- [ ] Implement `/api/v1/super-admin/login` (immutable credentials check) & `/api/v1/courses/**` (CRUD, Approach D cloning, `.hanhaga.json` export & import, recursive delete).
- [ ] Deploy updated `firestore.rules` with `isSuperAdmin()`, course-scoped isolation, and `isCourseActive(courseId)` write lock.

### Phase 3: Frontend Routing, Course Branding & Gateway
- [ ] Build `CourseContext` + `src/config/paths.ts` and refactor all 13 `artifacts/` references.
- [ ] Implement `/` Gateway view (active course dropdown + "המשך לעמוד הקורס" redirect).
- [ ] Implement `/c/:slug` isolated course views with dynamic `course.name` & `course.logoUrl` (zero multi-course awareness for end users).

### Phase 4: `/control` Dashboard, CSV & Offline Portable Bundles
- [ ] Build `/control` fixed-credential login & Global Course Control Dashboard.
- [ ] Build Create Course Wizard (Logo upload, Approach D blueprint cloning, CSV user import).
- [ ] Build `.hanhaga.json` offline course export & verified one-click re-import UI.
- [ ] Update `scripts/backup-firestore.mjs` & `scripts/verify-backup.mjs` for multi-course schema.

### Phase 5: Verification & Launch
- [ ] Run `npm run lint`, `npm run type-check`, and `npm run build`.
- [ ] Expand Playwright E2E suite to verify: `/` gateway dropdown -> `/c/:slug` redirect, isolated course branding (logo + name), inactive course blocking, `/control` fixed login, export/import roundtrip, and WCAG 2.1 AA compliance.
- [ ] Deploy to the new Firebase project and verify live on the custom domain.
