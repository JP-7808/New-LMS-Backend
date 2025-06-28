import express from 'express';
import { protect, authorize, checkVerified } from '../middleware/auth.js';
import {
  getStudentProfile,
  updateStudentProfile,
  enrollInCourse,
  getEnrolledCourses,
  getCourseProgress,
  updateProgress,
  completeLecture,
  getCourseAssessments,
  getAssessment,
  submitAssessment,
  getCertificates,
  getNotifications,
  markNotificationAsRead,
  createSupportTicket,
  getSupportTickets,
  checkStudentStatus,
  getAssessmentResult,
  bookmarkCourse,
  removeBookmark,
  getBookmarkedCourses,
  getStudentBadges
} from '../controllers/studentController.js';

const router = express.Router();

// Protect all routes
router.use(protect);
router.use(authorize('student'));
router.use(checkVerified);
// router.use(checkApproved);

// Profile routes
router.route('/profile')
  .get(getStudentProfile)
  .put(updateStudentProfile);

router.get('/profile/status', checkStudentStatus);

// Course enrollment and progress
router.route('/courses')
  .get(getEnrolledCourses)
  .post(enrollInCourse);

router.route('/courses/:courseId/progress')
  .get(getCourseProgress)
  .put(updateProgress);


// Bookmark Courses
router.patch('/courses/:courseId/bookmark', bookmarkCourse);
router.delete('/courses/:courseId/bookmark', removeBookmark);
router.get('/courses/bookmarked', getBookmarkedCourses);

  
router.put('/courses/:courseId/lectures/:lectureId/complete', completeLecture);

// Assessments
router.route('/courses/:courseId/assessments')
  .get(getCourseAssessments);

router.route('/courses/:courseId/assessments/:assessmentId')
  .get(getAssessment);

router.post('/courses/:courseId/assessments/:assessmentId/submit', submitAssessment);

// results Assessment
router.get('/courses/:courseId/assessments/:assessmentId/result', getAssessmentResult);

// Certificates
router.get('/certificates', getCertificates);

// badges
router.get('/:id/badges', protect, getStudentBadges);

// Notifications
router.route('/notifications')
  .get(getNotifications);

router.put('/notifications/:id/read', markNotificationAsRead);

// Support
router.route('/support')
  .get(getSupportTickets)
  .post(createSupportTicket);

export default router;