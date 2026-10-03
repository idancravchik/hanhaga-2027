import { Router, Response } from 'express';
import { z } from 'zod';
import { db, PATHS } from '../config.js';
import { AuthenticatedRequest } from '../types/api.js';
import { requireTier } from '../middleware/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

const AttendanceStatusSchema = z.union([
  z.boolean(),
  z.literal('missing'),
  z.literal('חסר')
]);

const SingleAttendanceSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  eventId: z.string().min(1, 'Event ID is required'),
  status: AttendanceStatusSchema
});

const BatchAttendanceSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required'),
  records: z.array(
    z.object({
      studentId: z.string().min(1, 'Student ID is required'),
      status: AttendanceStatusSchema
    })
  ).min(1, 'At least one record is required').max(500, 'Batch cannot exceed 500 records')
});

// GET /api/v1/attendance
router.get('/', requireTier('attendance_rw', 'read_all', 'full_rw'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const studentId = (req.query.studentId as string || '').trim();
    const eventId = (req.query.eventId as string || '').trim();

    if (studentId) {
      // Fetch attendance history for single student
      const docSnap = await db.doc(`${PATHS.ATTENDANCE}/${studentId}`).get();
      if (!docSnap.exists) {
        sendSuccess(res, { studentId, attendance: {} });
        return;
      }
      const data = docSnap.data() || {};
      if (eventId) {
        sendSuccess(res, { studentId, eventId, status: data[eventId] ?? null });
        return;
      }
      sendSuccess(res, { studentId, attendance: data });
      return;
    }

    if (eventId) {
      // Fetch attendance across all students for a specific event
      const snapshot = await db.collection(PATHS.ATTENDANCE).get();
      const records: Array<{ studentId: string; status: any }> = [];

      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && data[eventId] !== undefined) {
          records.push({
            studentId: docSnap.id,
            status: data[eventId]
          });
        }
      });

      sendSuccess(res, { eventId, totalRecorded: records.length, records });
      return;
    }

    // Return overall summary if no specific filter provided
    const snapshot = await db.collection(PATHS.ATTENDANCE).limit(100).get();
    const result: Record<string, any> = {};
    snapshot.docs.forEach((d) => {
      result[d.id] = d.data();
    });

    sendSuccess(res, result);
  } catch (err: any) {
    console.error('Error fetching attendance:', err);
    sendError(res, 500, 'FETCH_ATTENDANCE_ERROR', 'Failed to retrieve attendance data', [], req);
  }
});

// POST /api/v1/attendance (Single record)
router.post('/', requireTier('attendance_rw', 'full_rw'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parseResult = SingleAttendanceSchema.safeParse(req.body);
    if (!parseResult.success) {
      const details = parseResult.error.issues.map((i) => ({
        field: i.path.join('.'),
        issue: i.message
      }));
      sendError(res, 400, 'VALIDATION_ERROR', 'Invalid attendance payload', details, req);
      return;
    }

    const { studentId, eventId, status } = parseResult.data;
    const cleanStudentId = studentId.replace(/[- ]/g, '');

    const docRef = db.doc(`${PATHS.ATTENDANCE}/${cleanStudentId}`);
    await docRef.set(
      {
        [eventId]: status,
        updatedAt: new Date().toISOString(),
        updatedBy: `api:${req.apiKeyInfo?.name || 'unknown'}`
      },
      { merge: true }
    );

    sendSuccess(
      res,
      {
        studentId: cleanStudentId,
        eventId,
        status,
        updatedAt: new Date().toISOString()
      },
      undefined,
      200
    );
  } catch (err: any) {
    console.error('Error saving single attendance:', err);
    sendError(res, 500, 'SAVE_ATTENDANCE_ERROR', 'Failed to update student attendance', [], req);
  }
});

// POST /api/v1/attendance/batch (Bulk records)
router.post('/batch', requireTier('attendance_rw', 'full_rw'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parseResult = BatchAttendanceSchema.safeParse(req.body);
    if (!parseResult.success) {
      const details = parseResult.error.issues.map((i) => ({
        field: i.path.join('.'),
        issue: i.message
      }));
      sendError(res, 400, 'VALIDATION_ERROR', 'Invalid batch attendance payload', details, req);
      return;
    }

    const { eventId, records } = parseResult.data;
    const nowIso = new Date().toISOString();
    const updatedBy = `api:${req.apiKeyInfo?.name || 'unknown'}`;

    const batch = db.batch();

    records.forEach(({ studentId, status }) => {
      const cleanStudentId = studentId.replace(/[- ]/g, '');
      const docRef = db.doc(`${PATHS.ATTENDANCE}/${cleanStudentId}`);
      batch.set(
        docRef,
        {
          [eventId]: status,
          updatedAt: nowIso,
          updatedBy
        },
        { merge: true }
      );
    });

    await batch.commit();

    sendSuccess(res, {
      eventId,
      processedCount: records.length,
      updatedAt: nowIso
    });
  } catch (err: any) {
    console.error('Error batch updating attendance:', err);
    sendError(res, 500, 'BATCH_ATTENDANCE_ERROR', 'Failed to process batch attendance', [], req);
  }
});

export default router;
