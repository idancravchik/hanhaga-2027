import express, { Express, Response } from 'express';
import cors from 'cors';
import { onRequest } from 'firebase-functions/v2/https';

import { authenticateApiKey } from './middleware/auth.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { idempotencyHandler } from './middleware/idempotency.js';
import { sendError, sendSuccess } from './utils/response.js';
import { AuthenticatedRequest } from './types/api.js';

import studentsRouter from './routes/students.js';
import eventsRouter from './routes/events.js';
import attendanceRouter from './routes/attendance.js';
import examsRouter from './routes/exams.js';
import gradesRouter from './routes/grades.js';
import reportsRouter from './routes/reports.js';

const app: Express = express();

// Base middleware
app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));

// Health check endpoint (accessible via multiple paths)
const healthHandler = (_req: express.Request, res: Response) => {
  sendSuccess(res, { status: 'healthy', timestamp: new Date().toISOString() });
};
app.get('/health', healthHandler);
app.get('/v1/health', healthHandler);
app.get('/api/v1/health', healthHandler);

// Authenticated API router
const v1Router = express.Router();

v1Router.use(authenticateApiKey);
v1Router.use(rateLimiter);
v1Router.use(idempotencyHandler);

v1Router.use('/students', studentsRouter);
v1Router.use('/events', eventsRouter);
v1Router.use('/attendance', attendanceRouter);
v1Router.use('/exams', examsRouter);
v1Router.use('/grades', gradesRouter);
v1Router.use('/reports', reportsRouter);

// Support both direct Cloud Function url (/v1/...) and Firebase Hosting (/api/v1/...)
app.use('/api/v1', v1Router);
app.use('/v1', v1Router);

// 404 handler
app.use((req: AuthenticatedRequest, res: Response) => {
  sendError(res, 404, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found`, [], req);
});

// Centralized error handler
app.use((err: any, req: AuthenticatedRequest, res: Response, _next: any) => {
  console.error('Unhandled API exception:', err);
  sendError(
    res,
    500,
    'INTERNAL_SERVER_ERROR',
    process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
    [],
    req
  );
});

export const api = onRequest(
  {
    cors: true,
    timeoutSeconds: 60,
    memory: '256MiB'
  },
  app
);

export { app };
