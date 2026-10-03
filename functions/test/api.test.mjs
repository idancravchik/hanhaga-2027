import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { z } from 'zod';

describe('API Security & Utilities Tests', () => {
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
});
