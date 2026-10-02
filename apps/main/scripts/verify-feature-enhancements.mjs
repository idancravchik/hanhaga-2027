import fs from 'fs';
import path from 'path';

console.log('🧪 Running Verification of New Feature Enhancements...');

let failed = false;

function assert(condition, message) {
    if (!condition) {
        console.error(`❌ FAILED: ${message}`);
        failed = true;
    } else {
        console.log(`✅ PASSED: ${message}`);
    }
}

// 1. Check Year References
const appHtml = fs.readFileSync('index.html', 'utf8');
assert(!appHtml.includes('2027') && !appHtml.includes('תשפ"ז'), 'index.html has no 2027 or תשפ"ז');

const manifest = fs.readFileSync('public/manifest.webmanifest', 'utf8');
assert(!manifest.includes('2027') && !manifest.includes('תשפ"ז'), 'manifest.webmanifest has no 2027 or תשפ"ז');

// 2. Check Tags in UserFormModal
const userModalCode = fs.readFileSync('src/components/users/UserFormModal.tsx', 'utf8');
assert(userModalCode.includes('TAGS_CATALOG'), 'UserFormModal integrates TAGS_CATALOG');
assert(userModalCode.includes('tags: tags'), 'UserFormModal saves tags payload');
assert(userModalCode.includes('toggleTag'), 'UserFormModal supports interactive tag selection');

// 3. Check 3-state Attendance & Ellipse Selector (V, Dot, X)
const attendanceCode = fs.readFileSync('src/components/events/AttendanceReportTable.tsx', 'utf8');
assert(attendanceCode.includes("'missing'"), 'AttendanceReportTable supports "missing" yellow state');
assert(attendanceCode.includes('rounded-full border border-[#dadce0]'), 'AttendanceReportTable renders ellipse selector capsule');
assert(!attendanceCode.includes('מפקד 30 שניות'), 'AttendanceReportTable top banner removed per specification');
assert(!attendanceCode.toLowerCase().includes('חובש'), 'AttendanceReportTable does not contain medic filtering');

// 4. Check Yellow "חסר" Dot in AdminView Reports Tab
const adminViewCode = fs.readFileSync('src/views/AdminView.jsx', 'utf8');
assert(adminViewCode.includes('bg-[#f9ab00]') && adminViewCode.includes('rounded-full bg-white'), 'AdminView reports tab renders white dot on yellow background for missing status');

// 5. Check CSV Export includes 'חסר'
const csvCode = fs.readFileSync('src/utils/csv.ts', 'utf8');
assert(csvCode.includes('\'"חסר"\''), 'CSV export formats missing status as "חסר"');

// 6. Check MobileBottomNav in Views & Top Bar Hidden on Mobile
assert(fs.existsSync('src/components/navigation/MobileBottomNav.tsx'), 'MobileBottomNav.tsx component exists');
assert(adminViewCode.includes('<MobileBottomNav'), 'AdminView renders MobileBottomNav');
assert(adminViewCode.includes('hidden sm:flex'), 'AdminView hides top subview bar on mobile');

const instructorCode = fs.readFileSync('src/views/InstructorView.jsx', 'utf8');
assert(instructorCode.includes('<MobileBottomNav'), 'InstructorView renders MobileBottomNav');
assert(instructorCode.includes('hidden sm:flex'), 'InstructorView hides top subview bar on mobile');

const studentCode = fs.readFileSync('src/views/StudentView.jsx', 'utf8');
assert(studentCode.includes('<MobileBottomNav'), 'StudentView renders MobileBottomNav');

if (failed) {
    console.error('\n🚨 Verification encountered failures.');
    process.exit(1);
} else {
    console.log('\n🌟 All Feature Enhancements Successfully Verified!');
    process.exit(0);
}
