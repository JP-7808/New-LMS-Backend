// models/Student.js
import mongoose from 'mongoose';
import User from './User.js';

const studentSchema = new mongoose.Schema({
  education: {
    type: String,
    trim: true
  },
  occupation: {
    type: String,
    trim: true
  },
  skills: {
    type: [String]
  },
  interests: {
    type: [String]
  },
  points: {
    type: Number,
    default: 0
  },
  badges: [{
    name: String,
    dateEarned: {
      type: Date,
      default: Date.now
    },
    icon: String
  }],
  enrolledCourses: [{
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    },
    enrollmentDate: {
      type: Date,
      default: Date.now
    },
    completed: {
      type: Boolean,
      default: false
    },
    completionDate: Date,
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  }],
  liveClassSessions: [{
    meetingId: String,
    provider: String, // 'zoom', 'jitsi', etc.
    joinUrl: String,
    startTime: Date,
    endTime: Date,
    attended: Boolean
  }],
  leaderboardPosition: Number,
  streak: {
    current: Number,
    longest: Number,
    lastActiveDate: Date
  },
  
});

export default User.discriminator('student', studentSchema); // Changed 'Student' to 'student'