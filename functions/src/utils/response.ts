import { Response } from 'express';
import { AuthenticatedRequest, ApiSuccessResponse, ApiErrorResponse, PaginationMeta, ApiErrorDetail } from '../types/api.js';

export function sendSuccess<T>(
  res: Response,
  data: T,
  pagination?: PaginationMeta,
  statusCode = 200
): void {
  const payload: ApiSuccessResponse<T> = {
    success: true,
    data
  };

  if (pagination) {
    payload.pagination = pagination;
  }

  res.status(statusCode).json(payload);
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: ApiErrorDetail[],
  req?: AuthenticatedRequest
): void {
  const payload: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      requestId: req?.requestId || `req_${Math.random().toString(36).substring(2, 10)}`
    }
  };

  if (details && details.length > 0) {
    payload.error.details = details;
  }

  res.status(statusCode).json(payload);
}
