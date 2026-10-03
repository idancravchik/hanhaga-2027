import { Request } from 'express';

export type ApiKeyTier = 'attendance_rw' | 'read_all' | 'full_rw';

export interface ApiKeyRecord {
  keyHash: string;
  name: string;
  tier: ApiKeyTier;
  isActive: boolean;
  createdAt: string;
  lastUsedAt?: string;
}

export interface AuthenticatedRequest extends Request {
  apiKeyInfo?: ApiKeyRecord;
  requestId?: string;
}

export interface PaginationMeta {
  limit: number;
  nextCursor?: string | null;
  total?: number;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  pagination?: PaginationMeta;
}

export interface ApiErrorDetail {
  field?: string;
  issue: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
    requestId?: string;
  };
}
