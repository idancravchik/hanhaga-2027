import { Router, Response } from 'express';
import { db, PATHS } from '../config.js';
import { AuthenticatedRequest } from '../types/api.js';
import { requireTier } from '../middleware/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

// GET /api/v1/reports/summary
router.get('/summary', requireTier('read_all', 'full_rw'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const [usersSnap, eventsSnap, attendanceSnap, gradesSnap, examsSnap] = await Promise.all([
      db.collection(PATHS.USERS).where('role', '==', 'student').get(),
      db.collection(PATHS.EVENTS).get(),
      db.collection(PATHS.ATTENDANCE).get(),
      db.collection(PATHS.GRADES).get(),
      db.collection(PATHS.EXAMS).get()
    ]);

    const totalStudents = usersSnap.size;

    // School distribution
    const schoolDistribution: Record<string, number> = {};
    usersSnap.docs.forEach((doc) => {
      const school = doc.data().school || 'לא צוין בית ספר';
      schoolDistribution[school] = (schoolDistribution[school] || 0) + 1;
    });

    // Attendance calculation (excluding 'יום חשיפה')
    const validEvents = eventsSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((e: any) => e.type !== 'יום חשיפה');

    let totalAttendanceChecks = 0;
    let positiveAttendanceCount = 0;

    attendanceSnap.docs.forEach((doc) => {
      const studentAtt = doc.data() || {};
      validEvents.forEach((ev) => {
        const val = studentAtt[ev.id];
        if (val === true) {
          positiveAttendanceCount++;
          totalAttendanceChecks++;
        } else if (val === false || val === 'missing' || val === 'חסר') {
          totalAttendanceChecks++;
        }
      });
    });

    const overallAttendancePercentage = totalAttendanceChecks > 0
      ? Math.round((positiveAttendanceCount / totalAttendanceChecks) * 100)
      : 100;

    // Grades calculation
    let totalGradeScores = 0;
    let gradesCount = 0;

    gradesSnap.docs.forEach((doc) => {
      const g = doc.data();
      const score = Number(g.totalScore);
      if (!isNaN(score) && score > 0) {
        totalGradeScores += score;
        gradesCount++;
      }
    });

    const courseAverage = gradesCount > 0
      ? Number((totalGradeScores / gradesCount).toFixed(1))
      : 0;

    const summary = {
      totalStudents,
      attendance: {
        overallAveragePercentage: overallAttendancePercentage,
        totalValidEvents: validEvents.length,
        totalRecordedAttendanceEntries: totalAttendanceChecks
      },
      grades: {
        courseAverage,
        totalGradesRecorded: gradesCount,
        totalExamsCount: examsSnap.size
      },
      schoolDistribution
    };

    sendSuccess(res, summary);
  } catch (err: any) {
    console.error('Error generating summary report:', err);
    sendError(res, 500, 'REPORT_SUMMARY_ERROR', 'Failed to generate summary report', [], req);
  }
});

export default router;
