import mongoose from "mongoose";

const schema = new mongoose.Schema({
  // ... existing code ...
  prerequisites: {
    type: [String],
    default: [],
  },
  whoShouldAttend: {
    type: [String],
    default: [],
  },
  syllabus: {
    type: [String],
    default: [],
  },
// ... existing code ...
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  originalPrice: {
    type: Number,
    required: true,
  },
  discountedPrice: {
    type: Number,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
  },
  createdBy: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  prerequisites: {
    type: [String],
    default: [],
  },
  whoShouldAttend: {
    type: [String],
    default: [],
  },
  syllabus: {
    type: [String],
    default: [],
  },
  price: {
    type: Number,
    required: true,
  },
});

export const Courses = mongoose.model("Courses", schema);
