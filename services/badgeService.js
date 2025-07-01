import Badge from '../models/Badge.js';
import User from '../models/User.js';

export const checkAndAssignBadges = async (userId) => {
  const user = await User.findById(userId)
    .populate('completedCourses', '_id')  // We only need _id here
    .populate('badges', '_id')            // Already earned badges
    .lean();                              // Use lean for performance (we'll re-query if needed)

  if (!user) return;

  const allBadges = await Badge.find({ isActive: true });
  const earnedBadgeIds = user.badges.map(b => b._id.toString());
  const completedCourses = user.completedCourses?.map(c => c._id.toString()) || [];
  const assessmentResults = user.assessmentResults || [];

  const newlyEarnedBadges = [];

  for (const badge of allBadges) {
    if (earnedBadgeIds.includes(badge._id.toString())) continue;

    let qualifies = false;

    // 🎯 1. Course Completion
    if (badge.criteria === 'course_completion') {
      if (badge.course) {
        if (completedCourses.includes(badge.course.toString())) {
          qualifies = true;
        }
      } else {
        if (completedCourses.length >= badge.threshold) {
          qualifies = true;
        }
      }
    }

    // 🧪 2. Assessment Score (percentage-based)
    else if (badge.criteria === 'assessment_score') {
      const passedCount = assessmentResults.filter(result => {
        if (!result.totalPoints || result.totalPoints === 0) return false;
        const percentage = (result.score / result.totalPoints) * 100;

        const meetsScore = badge.minScore ? percentage >= badge.minScore : true;
        const courseMatch = badge.course ? result.course.toString() === badge.course.toString() : true;

        return result.passed && meetsScore && courseMatch;
      }).length;

      if (passedCount >= badge.threshold) {
        qualifies = true;
      }
    }

    // 🧠 Later: add logic for 'streak', 'community', 'custom'

    // ✅ Assign badge if qualified
    if (qualifies) {
      newlyEarnedBadges.push(badge._id);
      console.log(`✅ Badge assigned: ${badge.name} to user ${userId}`);
    }
  }

  // 🧾 Only update if new badges earned
  if (newlyEarnedBadges.length > 0) {
    await User.findByIdAndUpdate(userId, {
      $addToSet: { badges: { $each: newlyEarnedBadges } }
    });
  }
};
