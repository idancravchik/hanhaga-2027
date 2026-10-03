import { Router, Response } from 'express';
import { db, PATHS } from '../config.js';
import { AuthenticatedRequest } from '../types/api.js';
import { requireTier } from '../middleware/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

// GET /api/v1/students
router.get('/', requireTier('read_all', 'full_rw'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 100);
    const cursor = (req.query.cursor as string || '').trim();
    const school = (req.query.school as string || '').trim();
    const department = (req.query.department as string || '').trim();

    let q = db.collection(PATHS.USERS).where('role', '==', 'student');

    if (school) {
      q = q.where('school', '==', school);
    }
    if (department) {
      q = q.where('department', '==', department);
    }

    // Order by __name__ (document ID) for stable cursor pagination
    q = q.orderBy('__name__').limit(limit + 1);

    if (cursor) {
      const cursorDoc = await db.doc(`${PATHS.USERS}/${cursor}`).get();
      if (cursorDoc.exists) {
        q = q.startAfter(cursorDoc);
      }
    }

    const snapshot = await q.get();
    const docs = snapshot.docs;
    const hasMore = docs.length > limit;
    const resultDocs = hasMore ? docs.slice(0, limit) : docs;

    const students = resultDocs.map((docSnap) => {
      const data = docSnap.data();
      // SECURITY & PRIVACY RULE: Explicitly exclude sensitive tags as decided in Q6
      const { tags, ...sanitizedData } = data;

      return {
        id: docSnap.id,
        phone: docSnap.id,
        name: sanitizedData.name || sanitizedData.fullName || '',
        fullName: sanitizedData.fullName || sanitizedData.name || '',
        school: sanitizedData.school || '',
        department: sanitizedData.department || sanitizedData.group || '',
        role: sanitizedData.role || 'student',
        createdAt: sanitizedData.createdAt || null
      };
    });

    const nextCursor = hasMore && resultDocs.length > 0 ? resultDocs[resultDocs.length - 1].id : null;

    sendSuccess(res, students, {
      limit,
      nextCursor
    });
  } catch (err: any) {
    console.error('Error fetching students:', err);
    sendError(res, 500, 'FETCH_STUDENTS_ERROR', 'Failed to retrieve students roster', [], req);
  }
});

export default router;
