import { Router, Response } from 'express';
import { db, PATHS } from '../config.js';
import { AuthenticatedRequest } from '../types/api.js';
import { requireTier } from '../middleware/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

// GET /api/v1/exams
router.get('/', requireTier('read_all', 'full_rw'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const snapshot = await db.collection(PATHS.EXAMS).get();

    const exams = snapshot.docs.map((docSnap) => {
      const d = docSnap.data();
      return {
        id: docSnap.id,
        title: d.title || '',
        date: d.date || '',
        categories: d.categories || [],
        showVerbalOnly: Boolean(d.showVerbalOnly),
        isStudentVisible: Boolean(d.isStudentVisible)
      };
    });

    sendSuccess(res, exams);
  } catch (err: any) {
    console.error('Error fetching exams:', err);
    sendError(res, 500, 'FETCH_EXAMS_ERROR', 'Failed to retrieve exams list', [], req);
  }
});

export default router;
