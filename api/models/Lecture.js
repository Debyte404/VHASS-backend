import mongoose from "mongoose";

const schema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Lecture title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters long'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Lecture description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters long'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  video: {
    type: String,
    required: false,
    validate: {
      validator: function(v) {
        // Optional validation for video path
        return !v || v.length > 0;
      },
      message: 'Invalid video path'
    }
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Courses",
    required: [true, 'Course reference is required']
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  // Add more robust error handling
  strict: true,
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Add a pre-save hook for additional validation
schema.pre('save', function(next) {
  // Example of custom validation logic
  if (this.title && this.title.length < 3) {
    next(new Error('Title must be at least 3 characters long'));
  } else {
    next();
  }
});

// Optional: Add a virtual for easier debugging
schema.virtual('lectureInfo').get(function() {
  return `${this.title} (${this.course})`;
});

export const Lecture = mongoose.model("Lecture", schema);
