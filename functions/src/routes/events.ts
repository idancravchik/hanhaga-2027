import { Router, Response } from 'express';
import { db, PATHS } from '../config.js';
import { AuthenticatedRequest } from '../types/api.js';
import { requireTier } from '../middleware/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

// GET /api/v1/events
router.get('/', requireTier('attendance_rw', 'read_all', 'full_rw'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const typeFilter = (req.query.type as string || '').trim();

    let q: FirebaseFirestore.Query = db.collection(PATHS.EVENTS);

    if (typeFilter) {
      q = q.where('type', '==', typeFilter);
    }

    const snapshot = await q.get();

    const events = snapshot.docs.map((docSnap) => {
      const d = docSnap.data();
      return {
        id: docSnap.id,
        title: d.title || '',
        type: d.type || 'מפגש',
        date: d.date || '',
        location: d.location || '',
        description: d.description || ''
      };
    });

    sendSuccess(res, events);
  } catch (err: any) {
    console.error('Error fetching events:', err);
    sendError(res, 500, 'FETCH_EVENTS_ERROR', 'Failed to retrieve course events', [], req);
  }
});

export default router;
