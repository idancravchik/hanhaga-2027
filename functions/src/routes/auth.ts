import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { db, adminAuth, PATHS } from '../config.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

const AUTHORIZED_PASSCODE_HASH = '2441b25cc6a2a3d9831706510f8de574dd684da6a26bce45d3c7e896543a4608';

export function normalizePhoneServer(p?: string | number | null): string {
  if (!p) return '';
  let clean = p.toString().replace(/\D/g, '');
  if (clean.startsWith('972')) {
    clean = '0' + clean.substring(3);
  }
  if (clean.length === 9 && !clean.startsWith('0')) {
    clean = '0' + clean;
  }
  return clean;
}

export function normalizeNameServer(name?: string | null): string {
  if (!name) return '';
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/["׳`׳’']/g, '');
}

export function isPasscodeValidServer(passcode?: string | null): boolean {
  if (!passcode) return false;
  const clean = passcode.trim();
  const envPasscode = (process.env.STAFF_PASSCODE || '').trim();
  if (envPasscode && clean === envPasscode) {
    return true;
  }
  const digest = crypto.createHash('sha256').update(clean, 'utf8').digest('hex');
  return digest === AUTHORIZED_PASSCODE_HASH;
}

// POST /api/v1/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, phone, passcode, mode } = req.body || {};
    const normName = normalizeNameServer(name);
    const normPhone = normalizePhoneServer(phone);

    if (!normName || normName.length < 2 || normName.length > 100) {
      sendError(res, 400, 'INVALID_INPUT', 'הכנס שם מלא תקין');
      return;
    }

    if (!normPhone || normPhone.length < 9 || normPhone.length > 10) {
      sendError(res, 400, 'INVALID_INPUT', 'הכנס מספר טלפון תקין (9-10 ספרות)');
      return;
    }

    if (mode === 'staff' && !isPasscodeValidServer(passcode)) {
      sendError(res, 401, 'UNAUTHORIZED', 'פרטי ההתחברות שגויים או שאינם מורשים בכרטיסייה זו');
      return;
    }

    const userDoc = await db.doc(`${PATHS.USERS}/${normPhone}`).get();
    if (!userDoc.exists) {
      sendError(res, 401, 'UNAUTHORIZED', 'פרטי ההתחברות שגויים או שאינם מורשים בכרטיסייה זו');
      return;
    }

    const data = userDoc.data() || {};
    const regName = normalizeNameServer(data.name || data.fullName);
    if (regName !== normName) {
      sendError(res, 401, 'UNAUTHORIZED', 'פרטי ההתחברות שגויים או שאינם מורשים בכרטיסייה זו');
      return;
    }

    const userRole = (data.role || 'student').toLowerCase();
    if (mode === 'student' && userRole !== 'student') {
      sendError(res, 401, 'UNAUTHORIZED', 'פרטי ההתחברות שגויים או שאינם מורשים בכרטיסייה זו');
      return;
    }
    if (mode === 'staff' && userRole === 'student') {
      sendError(res, 401, 'UNAUTHORIZED', 'פרטי ההתחברות שגויים או שאינם מורשים בכרטיסייה זו');
      return;
    }

    let customToken: string | null = null;
    try {
      customToken = await adminAuth.createCustomToken(normPhone, {
        role: userRole,
        phone: normPhone
      });
    } catch (tokenErr) {
      console.warn('Custom token generation skipped or failed in current environment:', tokenErr);
    }

    sendSuccess(res, {
      profile: {
        id: userDoc.id,
        phone: userDoc.id,
        ...data,
        role: userRole
      },
      customToken
    });
  } catch (err: any) {
    console.error('Auth login error:', err);
    sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'שגיאה בשרת האימות');
  }
});

export default router;
