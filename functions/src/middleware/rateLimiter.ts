import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/api.js';
import { RATE_LIMIT } from '../config.js';
import { sendError } from '../utils/response.js';

interface RateLimitBucket {
  count: number;
  resetTime: number;
}

const buckets = new Map<string, RateLimitBucket>();

function cleanupStaleBuckets(): void {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (now > bucket.resetTime) {
      buckets.delete(key);
    }
  }
}

export function rateLimiter(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // Periodically clean up when map grows
  if (buckets.size > 200) {
    cleanupStaleBuckets();
  }

  const key = req.apiKeyInfo?.keyHash || req.ip || 'anonymous';
  const now = Date.now();
  const limit = RATE_LIMIT.MAX_REQUESTS;
  const windowMs = RATE_LIMIT.WINDOW_MS;

  let bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetTime) {
    bucket = {
      count: 0,
      resetTime: now + windowMs
    };
    buckets.set(key, bucket);
  }

  bucket.count++;

  const remaining = Math.max(0, limit - bucket.count);
  const resetEpochSeconds = Math.ceil(bucket.resetTime / 1000);

  res.setHeader('X-RateLimit-Limit', limit.toString());
  res.setHeader('X-RateLimit-Remaining', remaining.toString());
  res.setHeader('X-RateLimit-Reset', resetEpochSeconds.toString());

  if (bucket.count > limit) {
    sendError(
      res,
      429,
      'RATE_LIMIT_EXCEEDED',
      `Rate limit exceeded. Uniform policy is ${limit} requests per minute.`,
      [],
      req
    );
    return;
  }

  next();
}
