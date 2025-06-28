// models/Student.js
import mongoose from 'mongoose';
import User from './User.js';

const studentSchema = new mongoose.Schema({
  education: String,
  occupation: String,
  skills: [String],
  interests: [String],
  points: { type: Number, default: 0 },
  leaderboardPosition: Number,
  streak: {
    current: Number,
    longest: Number,
    lastActiveDate: Date
  },
  bookmarkedCourses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  liveClassSessions: [{
    meetingId: String,
    provider: String,
    joinUrl: String,
    startTime: Date,
    endTime: Date,
    attended: Boolean
  }]
});

// ✅ Don’t redefine fields like badges or completedCourses if already in User
// ✅ Only include unique student fields here

const Student = User.discriminator('student', studentSchema);
export default Student;

