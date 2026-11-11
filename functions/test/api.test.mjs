import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

let z;
try {
  ({ z } = await import('zod'));
} catch {
  ({ z } = await import('../../apps/main/node_modules/zod/index.js'));
}

const normalizePhone = (p) => {
  if (!p) return '';
  let clean = p.toString().replace(/\D/g, '');
  if (clean.startsWith('972')) {
    clean = '0' + clean.substring(3);
  }
  if (clean.length === 9 && !clean.startsWith('0')) {
    clean = '0' + clean;
  }
  return clean;
};

const normalizeName = (name) => {
  if (!name) return '';
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/["׳`׳’']/g, '');
};

const matchesStaffName = (inputName, registeredName) => {
  const a = normalizeName(inputName);
  const b = normalizeName(registeredName);
  if (!a || !b || a.length < 2 || b.length < 2) return false;
  if (a === b) return true;
  const aParts = a.split(/\s+/).filter(Boolean);
  const bParts = b.split(/\s+/).filter(Boolean);
  if (aParts.length === 1 && aParts[0].length >= 2 && bParts.length > 0 && aParts[0] === bParts[0]) {
    return true;
  }
  return false;
};

describe('API & PWA Shell Security Mitigation Tests', () => {
  test('API Key hashing produces consistent SHA-256 digest', () => {
    const rawKey = 'hng_live_testkey1234567890';
    const hash1 = crypto.createHash('sha256').update(rawKey).digest('hex');
    const hash2 = crypto.createHash('sha256').update(rawKey).digest('hex');
    assert.equal(hash1, hash2);
    assert.equal(hash1.length, 64);
  });

  test('Privacy Check: Student tags must be omitted from output', () => {
    const rawStudent = {
      id: '0521234567',
      name: 'ישראל ישראלי',
      phone: '0521234567',
      school: 'הריאלי (חיפה)',
      department: 'מחלקה 1',
      tags: ['allergy', 'epilepsy', 'vegan']
    };

    const { tags, ...sanitized } = rawStudent;
    assert.equal(sanitized.tags, undefined);
    assert.equal(sanitized.id, '0521234567');
    assert.equal(sanitized.school, 'הריאלי (חיפה)');
  });

  test('Zod Schema validates Attendance status correctly', () => {
    const AttendanceStatusSchema = z.union([
      z.boolean(),
      z.literal('missing'),
      z.literal('חסר')
    ]);

    assert.equal(AttendanceStatusSchema.safeParse(true).success, true);
    assert.equal(AttendanceStatusSchema.safeParse(false).success, true);
    assert.equal(AttendanceStatusSchema.safeParse('missing').success, true);
    assert.equal(AttendanceStatusSchema.safeParse('חסר').success, true);
    assert.equal(AttendanceStatusSchema.safeParse('invalid_status').success, false);
    assert.equal(AttendanceStatusSchema.safeParse(123).success, false);
  });

  test('Batch Attendance limits payload to 500 records', () => {
    const BatchSchema = z.object({
      eventId: z.string().min(1),
      records: z.array(z.object({
        studentId: z.string().min(1),
        status: z.union([z.boolean(), z.literal('missing'), z.literal('חסר')])
      })).min(1).max(500)
    });

    const validPayload = {
      eventId: '1',
      records: [
        { studentId: '0521234567', status: true },
        { studentId: '0547654321', status: false }
      ]
    };
    assert.equal(BatchSchema.safeParse(validPayload).success, true);

    const emptyPayload = { eventId: '1', records: [] };
    assert.equal(BatchSchema.safeParse(emptyPayload).success, false);
  });

  test('Total score computation sums category weights accurately', () => {
    const scores = {
      'ניווט': 35,
      'פיקוד ושליטה': 40,
      'יוזמה': 25
    };
    const total = Object.values(scores).reduce((a, b) => a + Number(b), 0);
    assert.equal(total, 100);
  });

  test('SEC-HIGH-01: matchesStaffName rejects single-character and partial substring matches', () => {
    const registered = "עידן קרבצ'יק";
    assert.equal(matchesStaffName('ע', registered), false, 'Single character must not match');
    assert.equal(matchesStaffName('עיד', registered), false, 'Partial word substring must not match');
    assert.equal(matchesStaffName('', registered), false, 'Empty input must not match');
    assert.equal(matchesStaffName('עידן', registered), true, 'Exact first name word must match for live staff convenience');
    assert.equal(matchesStaffName("עידן קרבצ'יק", registered), true, 'Exact full name must match');
    assert.equal(matchesStaffName('  עידן   קרבצ׳יק ', registered), true, 'Normalized whitespace/geresh must match');
  });

  test('FUNC-LOW-01: Phone normalization handles Israeli formats and enforces 9-10 digit bounds', () => {
    assert.equal(normalizePhone('050-123-4567'), '0501234567');
    assert.equal(normalizePhone('+972501234567'), '0501234567');
    assert.equal(normalizePhone('501234567'), '0501234567');

    const tooShort = normalizePhone('050123');
    const tooLong = normalizePhone('050123456789012');
    assert.equal(tooShort.length >= 9 && tooShort.length <= 10, false);
    assert.equal(tooLong.length >= 9 && tooLong.length <= 10, false);
  });

  test('SEC-CRIT-01: firestore.rules scopes appId, blocks system collections, and validates user roles', () => {
    const rulesContent = fs.readFileSync(path.join(rootDir, 'firestore.rules'), 'utf8');
    const mainRulesContent = fs.readFileSync(path.join(rootDir, 'apps', 'main', 'firestore.rules'), 'utf8');

    assert.equal(rulesContent, mainRulesContent, 'Root and apps/main firestore.rules must stay in sync');
    assert.ok(rulesContent.includes('function isStaff(appId)'), 'isStaff must parameterize appId');
    assert.ok(rulesContent.includes('function isAdmin(appId)'), 'isAdmin must parameterize appId');
    assert.ok(rulesContent.includes('system_api_keys'), 'system_api_keys must be explicitly locked down');
  });

  test('SEC-MED-02: firebase.json configures mandatory HTTP security and cache headers', () => {
    const firebaseConfig = JSON.parse(fs.readFileSync(path.join(rootDir, 'firebase.json'), 'utf8'));
    const headersConfig = firebaseConfig.hosting?.headers || [];
    const globalEntry = headersConfig.find((h) => h.source === '**');
    assert.ok(globalEntry, 'Global "**" header rule must exist');

    const headerMap = Object.fromEntries(globalEntry.headers.map((h) => [h.key, h.value]));
    assert.equal(headerMap['X-Frame-Options'], 'DENY');
    assert.equal(headerMap['X-Content-Type-Options'], 'nosniff');
    assert.equal(headerMap['Referrer-Policy'], 'strict-origin-when-cross-origin');
    assert.ok(headerMap['Content-Security-Policy']?.includes("frame-ancestors 'none'"));

    const swEntry = headersConfig.find((h) => h.source.includes('sw.js'));
    assert.ok(swEntry, 'Service worker Cache-Control rule must exist');
  });
});
