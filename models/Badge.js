const badgeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: String,
  icon: {
    type: String,
    required: true
  },
  criteria: {
    type: String,
    enum: ['course_completion', 'streak', 'assessment_score', 'community', 'custom'],
    required: true
  },
  threshold: Number, // e.g., 5 courses completed, 7-day streak, etc.
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }, // if badge is course-specific
  isSecret: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Badge', badgeSchema);