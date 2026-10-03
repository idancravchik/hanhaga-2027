import { Router, Response } from 'express';
import { z } from 'zod';
import { db, PATHS } from '../config.js';
import { AuthenticatedRequest } from '../types/api.js';
import { requireTier } from '../middleware/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

const SingleGradeSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  examId: z.string().min(1, 'Exam ID is required'),
  scores: z.record(z.string(), z.number().min(0, 'Scores must be positive numbers')),
  verbalComment: z.string().optional()
});

const BatchGradeSchema = z.object({
  examId: z.string().min(1, 'Exam ID is required'),
  records: z.array(
    z.object({
      studentId: z.string().min(1, 'Student ID is required'),
      scores: z.record(z.string(), z.number().min(0, 'Scores must be positive numbers')),
      verbalComment: z.string().optional()
    })
  ).min(1, 'At least one record is required').max(500, 'Batch limit is 500 records')
});

function computeTotalScore(scores?: Record<string, number>): number {
  if (!scores) return 0;
  return Object.values(scores).reduce((acc, val) => acc + (Number(val) || 0), 0);
}

// GET /api/v1/grades
router.get('/', requireTier('read_all', 'full_rw'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const examId = (req.query.examId as string || '').trim();
    const studentId = (req.query.studentId as string || '').trim();

    let q: FirebaseFirestore.Query = db.collection(PATHS.GRADES);

    if (examId) {
      q = q.where('examId', '==', examId);
    }
    if (studentId) {
      const cleanStudentId = studentId.replace(/[- ]/g, '');
      q = q.where('studentId', '==', cleanStudentId);
    }

    const snapshot = await q.get();

    const grades = snapshot.docs.map((docSnap) => {
      const d = docSnap.data();
      const totalScore = computeTotalScore(d.scores);

      return {
        id: docSnap.id,
        studentId: d.studentId,
        examId: d.examId,
        scores: d.scores || {},
        totalScore,
        verbalComment: d.verbalComment || '',
        updatedAt: d.updatedAt || null
      };
    });

    sendSuccess(res, grades);
  } catch (err: any) {
    console.error('Error fetching grades:', err);
    sendError(res, 500, 'FETCH_GRADES_ERROR', 'Failed to retrieve grades records', [], req);
  }
});

// POST /api/v1/grades (Single grade record)
router.post('/', requireTier('full_rw'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parseResult = SingleGradeSchema.safeParse(req.body);
    if (!parseResult.success) {
      const details = parseResult.error.issues.map((i) => ({
        field: i.path.join('.'),
        issue: i.message
      }));
      sendError(res, 400, 'VALIDATION_ERROR', 'Invalid grade submission payload', details, req);
      return;
    }

    const { studentId, examId, scores, verbalComment } = parseResult.data;
    const cleanStudentId = studentId.replace(/[- ]/g, '');
    const gradeDocId = `${cleanStudentId}_${examId}`;

    const totalScore = computeTotalScore(scores);
    const nowIso = new Date().toISOString();

    const payload = {
      id: gradeDocId,
      studentId: cleanStudentId,
      examId,
      scores,
      totalScore,
      verbalComment: verbalComment || '',
      updatedAt: nowIso,
      updatedBy: `api:${req.apiKeyInfo?.name || 'unknown'}`
    };

    await db.doc(`${PATHS.GRADES}/${gradeDocId}`).set(payload, { merge: true });

    sendSuccess(res, payload, undefined, 200);
  } catch (err: any) {
    console.error('Error submitting grade:', err);
    sendError(res, 500, 'SUBMIT_GRADE_ERROR', 'Failed to save student grade', [], req);
  }
});

// POST /api/v1/grades/batch (Bulk grade records)
router.post('/batch', requireTier('full_rw'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parseResult = BatchGradeSchema.safeParse(req.body);
    if (!parseResult.success) {
      const details = parseResult.error.issues.map((i) => ({
        field: i.path.join('.'),
        issue: i.message
      }));
      sendError(res, 400, 'VALIDATION_ERROR', 'Invalid batch grades payload', details, req);
      return;
    }

    const { examId, records } = parseResult.data;
    const nowIso = new Date().toISOString();
    const updatedBy = `api:${req.apiKeyInfo?.name || 'unknown'}`;

    const batch = db.batch();

    records.forEach(({ studentId, scores, verbalComment }) => {
      const cleanStudentId = studentId.replace(/[- ]/g, '');
      const gradeDocId = `${cleanStudentId}_${examId}`;
      const totalScore = computeTotalScore(scores);

      const docRef = db.doc(`${PATHS.GRADES}/${gradeDocId}`);
      batch.set(
        docRef,
        {
          id: gradeDocId,
          studentId: cleanStudentId,
          examId,
          scores,
          totalScore,
          verbalComment: verbalComment || '',
          updatedAt: nowIso,
          updatedBy
        },
        { merge: true }
      );
    });

    await batch.commit();

    sendSuccess(res, {
      examId,
      processedCount: records.length,
      updatedAt: nowIso
    });
  } catch (err: any) {
    console.error('Error batch updating grades:', err);
    sendError(res, 500, 'BATCH_GRADES_ERROR', 'Failed to process batch grades', [], req);
  }
});

export default router;
