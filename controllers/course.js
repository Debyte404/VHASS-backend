// Removed import of instance (Razorpay) from "../index.js"
// import { instance } from "../index.js";
import TryCatch from "../middlewares/TryCatch.js";
import { Courses } from "../models/Courses.js";
import { Lecture } from "../models/Lecture.js";
import { User } from "../models/User.js";
import { Progress } from "../models/Progress.js";
import pkg from 'pg-sdk-node';
import mongoose from "mongoose";
import { randomUUID } from 'crypto';
const { PhonePeClient, StandardCheckoutPayRequest, StandardCheckoutClient, Env, CreateSdkOrderRequest } = pkg;

// Initialize PhonePe SDK client
// const client = new PhonePeClient({
//   merchantId: 'SU2505141931362838820920',
//   saltKey: '33418406-0957-4ae0-a07a-a6383760ba05',
//   saltIndex: 1,
//   env: 'PRODUCTION',
// });

// Initialize PhonePe StandardCheckoutClient
const clientId = 'SU2505141931362838820920';
const clientSecret = '33418406-0957-4ae0-a07a-a6383760ba05';
const clientVersion = 1;
const env = Env.PRODUCTION;
const client = StandardCheckoutClient.getInstance(clientId, clientSecret, clientVersion, env);

export const getAllCourses = TryCatch(async (req, res) => {
  const courses = await Courses.find();
  // console.log('Courses from database:', courses);
  res.json({
    courses,
  });
});

export const getSingleCourse = TryCatch(async (req, res) => {
  const course = await Courses.findById(req.params.id);

  res.json({
    course,
  });
});

export const fetchLectures = TryCatch(async (req, res) => {
  const lectures = await Lecture.find({ course: req.params.id });

  const user = await User.findById(req.user._id);

  if (user.role === "admin") {
    return res.json({ lectures });
  }

  if (!user.subscription.includes(req.params.id))
    return res.status(400).json({
      message: "You have not subscribed to this course",
    });

  res.json({ lectures });
});

export const fetchLecture = TryCatch(async (req, res) => {
  const lecture = await Lecture.findById(req.params.id);

  const user = await User.findById(req.user._id);

  if (user.role === "admin") {
    return res.json({ lecture });
  }

  if (!user.subscription.includes(lecture.course))
    return res.status(400).json({
      message: "You have not subscribed to this course",
    });

  res.json({ lecture });
});

export const getMyCourses = TryCatch(async (req, res) => {
  const courses = await Courses.find({ _id: req.user.subscription });

  res.json({
    courses,
  });
});

export const addProgress = TryCatch(async (req, res) => {
  const progress = await Progress.findOne({
    user: req.user._id,
    course: req.query.course,
  });

  const { lectureId } = req.query;

  if (progress.completedLectures.includes(lectureId)) {
    return res.json({
      message: "Progress recorded",
    });
  }

  progress.completedLectures.push(lectureId);

  await progress.save();

  res.status(201).json({
    message: "new Progress added",
  });
});

export const getYourProgress = TryCatch(async (req, res) => {
  const progress = await Progress.find({
    user: req.user._id,
    course: req.query.course,
  });

  if (!progress) return res.status(404).json({ message: "null" });

  const allLectures = (await Lecture.find({ course: req.query.course })).length;

  const completedLectures = progress[0].completedLectures.length;

  const courseProgressPercentage = (completedLectures * 100) / allLectures;

  res.json({
    courseProgressPercentage,
    completedLectures,
    allLectures,
    progress,
  });
});

export const phonepeCheckout = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const course = await Courses.findById(req.params.id);
    if (!user || !course) {
      return res.status(404).json({ message: 'User or course not found' });
    }
    if (user.subscription.includes(course._id)) {
      return res.status(400).json({ message: 'You already have this course' });
    }
    const merchantOrderId = randomUUID();
    const amount = Math.round(Number(course.price) * 100); // in paise
    // const redirectUrl = `http://localhost:5173/payment-success/${course._id}`;
    const redirectUrl = `${process.env.PHONEPE_REDIRECT_URL}/payment-success/${course._id}`;
    const request = StandardCheckoutPayRequest.builder()
      .merchantOrderId(merchantOrderId)
      .amount(amount)
      .redirectUrl(redirectUrl)
      .build();
    const response = await client.pay(request);
    const checkoutPageUrl = response.redirectUrl;
    res.json({ checkoutPageUrl });
  } catch (err) {
    console.error('PhonePe API Error:', err.response?.data || err.message);
    res.status(500).json({
      message: 'Payment gateway error',
      error: err.response?.data || err.message
    });
  }
};

export const phonepeStatus = TryCatch(async (req, res) => {
  const transactionId = req.params.transactionId;
  console.log("phonepeStatus (course) – transactionId:", transactionId);
  // (Placeholder – in production, use phonepe-kit or PhonePe API to check status)
  res.json({ status: "pending", transactionId });
});

// Add createCourse function
export const createCourse = TryCatch(async (req, res) => {
  console.log('Creating course - Request body:', req.body);
  
  const { 
    title, 
    description, 
    originalPrice,
    discountedPrice,
    category, 
    duration, 
    createdBy,
    poster,
    syllabus,
    whoShouldAttend,
    prerequisites 
  } = req.body;
  
  // Validate required fields
  if (!title || !description || !originalPrice || !discountedPrice || !category || !duration || !createdBy || !poster) {
    return res.status(400).json({
      success: false,
      message: "Please provide all required fields",
      missingFields: {
        title: !title,
        description: !description,
        originalPrice: !originalPrice,
        discountedPrice: !discountedPrice,
        category: !category,
        duration: !duration,
        createdBy: !createdBy,
        poster: !poster
      }
    });
  }

  try {
    // Validate data types and prices
    if (isNaN(Number(originalPrice)) || isNaN(Number(discountedPrice)) || isNaN(Number(duration))) {
      return res.status(400).json({
        success: false,
        message: "Prices and duration must be valid numbers"
      });
    }

    // Validate that discounted price is less than original price
    if (Number(discountedPrice) >= Number(originalPrice)) {
      return res.status(400).json({
        success: false,
        message: "Discounted price must be less than original price"
      });
    }

    const course = await Courses.create({
      title,
      description,
      originalPrice: Number(originalPrice),
      discountedPrice: Number(discountedPrice),
      price: Number(discountedPrice),
      category,
      duration: Number(duration),
      createdBy,
      image: poster,
      syllabus: syllabus || [],
      whoShouldAttend: whoShouldAttend || [],
      prerequisites: prerequisites || []
    });

    console.log('Course created successfully:', course);

    return res.status(201).json({
      success: true,
      message: "Course created successfully",
      course
    });
  } catch (error) {
    console.error('Error creating course:', error);
    
    // Handle specific MongoDB errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        error: Object.values(error.errors).map(err => err.message)
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A course with this title already exists"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create course",
      error: error.message
    });
  }
});

// Utility: Ensure all courses have a price field
export async function ensureCoursePrices() {
  const courses = await Courses.find();
  for (const course of courses) {
    if (typeof course.price !== 'number' || isNaN(course.price) || course.price <= 0) {
      let newPrice = Number(course.discountedPrice) || Number(course.originalPrice) || 1000;
      course.price = newPrice;
      await course.save();
      console.log(`Updated course ${course._id} with price:`, newPrice);
    }
  }
}

// Call this function manually from a script or at server start for a one-time fix
// ensureCoursePrices();
