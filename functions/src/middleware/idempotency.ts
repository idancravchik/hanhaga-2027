import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/api.js';
import { db, PATHS } from '../config.js';

export function idempotencyHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // Only apply to state-modifying requests
  if (req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'PATCH') {
    next();
    return;
  }

  const rawKey = (req.header('idempotency-key') || req.header('Idempotency-Key') || '').trim();
  if (!rawKey) {
    next();
    return;
  }

  // Namespace by API key hash to prevent key collisions between different consumers
  const callerKey = req.apiKeyInfo?.keyHash || 'anon';
  const compositeId = `${callerKey}_${rawKey.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

  const docRef = db.doc(`${PATHS.IDEMPOTENCY}/${compositeId}`);

  docRef.get().then((docSnap) => {
    if (docSnap.exists) {
      const data = docSnap.data();
      const createdAt = new Date(data?.createdAt || 0).getTime();
      const ttlMs = 24 * 60 * 60 * 1000; // 24 hours

      if (Date.now() - createdAt < ttlMs) {
        res.setHeader('X-Idempotent-Replay', 'true');
        res.status(data?.statusCode || 200).json(data?.body);
        return;
      }
    }

    // Intercept json output to save successful responses
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        docRef.set({
          statusCode: res.statusCode,
          body,
          createdAt: new Date().toISOString()
        }).catch((err) => console.warn('Failed to cache idempotency record:', err));
      }
      return originalJson(body);
    };

    next();
  }).catch((err) => {
    console.error('Idempotency check error:', err);
    next();
  });
}
