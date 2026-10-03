import { Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { db, PATHS } from '../config.js';
import { AuthenticatedRequest, ApiKeyRecord, ApiKeyTier } from '../types/api.js';
import { sendError } from '../utils/response.js';

export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey.trim()).digest('hex');
}

export async function authenticateApiKey(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const requestId = `req_${crypto.randomUUID().slice(0, 8)}`;
  req.requestId = requestId;

  const rawKey = (req.header('x-api-key') || req.header('X-API-Key') || '').trim();

  if (!rawKey) {
    sendError(res, 401, 'MISSING_API_KEY', 'API key must be provided in X-API-Key request header', [], req);
    return;
  }

  try {
    const keyHash = hashApiKey(rawKey);
    const keyDoc = await db.doc(`${PATHS.API_KEYS}/${keyHash}`).get();

    if (!keyDoc.exists) {
      sendError(res, 401, 'INVALID_API_KEY', 'Provided API key is invalid or not found', [], req);
      return;
    }

    const keyData = keyDoc.data() as ApiKeyRecord;

    if (!keyData.isActive) {
      sendError(res, 401, 'REVOKED_API_KEY', 'This API key has been revoked or deactivated', [], req);
      return;
    }

    req.apiKeyInfo = keyData;

    // Async update lastUsedAt in background without blocking request
    keyDoc.ref.set({ lastUsedAt: new Date().toISOString() }, { merge: true }).catch(() => {});

    next();
  } catch (err: any) {
    console.error('Authentication error:', err);
    sendError(res, 500, 'AUTH_INTERNAL_ERROR', 'Authentication failed due to internal error', [], req);
  }
}

export function requireTier(...allowedTiers: ApiKeyTier[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const userTier = req.apiKeyInfo?.tier;

    if (!userTier) {
      sendError(res, 401, 'UNAUTHORIZED', 'No authentication info found', [], req);
      return;
    }

    // full_rw always has access to everything
    if (userTier === 'full_rw') {
      next();
      return;
    }

    // check if current tier matches one of allowedTiers
    if (allowedTiers.includes(userTier)) {
      next();
      return;
    }

    sendError(
      res,
      403,
      'INSUFFICIENT_PERMISSIONS',
      `Forbidden: Your API key tier ('${userTier}') does not have permission for this resource. Required tiers: ${allowedTiers.join(', ')}`,
      [],
      req
    );
  };
}
