import { Courses } from "../models/Courses.js";
import { Lecture } from "../models/Lecture.js";
import { Workshop } from "../models/Workshop.js";
import { rm } from "fs";
import { promisify } from "util";
import fs from "fs";
import { User } from "../models/User.js";
import path from "path";
import { Workshop } from "../models/Workshop.js";

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const unlinkAsync = promisify(fs.unlink);
const existsAsync = promisify(fs.exists);

// Helper function to safely delete file
const safeDeleteFile = async (filePath) => {
  try {
    const exists = await existsAsync(filePath);
    if (exists) {
      await unlinkAsync(filePath);
      console.log("File deleted:", filePath);
    } else {
      console.log("File does not exist:", filePath);
    }
  } catch (error) {
    console.log("Error handling file:", filePath, error.message);
  }
};

export const createCourse = async (req, res, next) => {
  console.log('Creating course - Full Request body:', req.body);
  console.log('Creating course - Request file:', req.file);
  console.log('Creating course - Request files:', req.files);

  // Validate required fields
  const { title, description, createdBy, duration, price, category } = req.body;
  
  if (!title || !description || !createdBy || !duration || !price || !category) {
    return res.status(400).json({
      message: "Missing required fields",
      requiredFields: ["title", "description", "createdBy", "duration", "price", "category"]
    });
  }

  // Handle file upload
  const image = req.file || req.files?.file;

  try {
    const course = await Courses.create({
      title,
      description,
      createdBy,
      image: image?.path,
      duration: Number(duration),
      price: Number(price),
      category,
      syllabus: req.body.syllabus ? JSON.parse(req.body.syllabus) : [],
      whoShouldAttend: req.body.whoShouldAttend ? JSON.parse(req.body.whoShouldAttend) : [],
      prerequisites: req.body.prerequisites ? JSON.parse(req.body.prerequisites) : [],
    });

    console.log('Course created successfully:', course);

    res.status(201).json({
      message: "Course Created Successfully",
      course
    });
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({
      message: "Failed to create course",
      error: error.message,
      details: error.errors || {}
    });
  } finally {
    next();
  }
};

export const addLectures = async (req, res, next) => {
  console.log('=== LECTURE CREATION DEBUG START ===');
  console.log('Request Headers:', req.headers);
  console.log('Request Params:', req.params);
  console.log('Request Body:', req.body);
  console.log('Request Files:', req.files);
  console.log('Request File:', req.file);

  try {
    // Validate required fields
    if (!req.params.id) {
      return res.status(400).json({
        message: "Course ID is required"
      });
    }

    const course = await Courses.findById(req.params.id);

    if (!course)
      return res.status(404).json({
        message: "No Course with this id",
      });

    // Validate title and description
    const { title, description } = req.body;
    if (!title || !description) {
      return res.status(400).json({
        message: "Title and description are required"
      });
    }

    // Handle file upload
    const files = req.files;
    const lectureData = {
      title,
      description,
      course: course._id,
    };

    // Comprehensive file check
    const file = files?.file?.[0] || req.file || req.body.file;
    console.log('Processed File:', file);

    // Add video if file exists
    if (file) {
      lectureData.video = file.path || file;
      console.log('Video Path:', lectureData.video);
    }

    // Create lecture
    const lecture = await Lecture.create(lectureData);

    console.log('Lecture created successfully:', lecture);
    console.log('=== LECTURE CREATION DEBUG END ===');

    res.status(201).json({
      message: "Lecture Added Successfully",
      lecture,
    });
  } catch (error) {
    console.error('=== LECTURE CREATION ERROR ===');
    console.error('Full Error Object:', error);
    
    // Detailed error handling
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return res.status(400).json({
        message: 'Validation Error',
        errors: errors
      });
    }
    
    // Generic server error with detailed logging
    res.status(500).json({
      message: 'Failed to add lecture',
      error: error.message,
      name: error.name,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    next();
  }
};

export const deleteLecture = async (req, res, next) => {
  console.log('Deleting lecture - Lecture ID:', req.params.id);

  try {
    const lecture = await Lecture.findById(req.params.id);
    if (!lecture) {
      return res.status(404).json({ message: "Lecture not found" });
    }

    await safeDeleteFile(lecture.video);
    await lecture.deleteOne();

    console.log('Lecture deleted successfully');

    res.json({ message: "Lecture Deleted Successfully" });
  } catch (error) {
    console.error('Error deleting lecture:', error);
    res.status(500).json({
      message: "Failed to delete lecture",
      error: error.message
    });
  } finally {
    next();
  }
};

export const deleteCourse = async (req, res, next) => {
  console.log('Deleting course - Course ID:', req.params.id);

  try {
    const course = await Courses.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const lectures = await Lecture.find({ course: course._id });

    // Delete lecture videos
    await Promise.all(
      lectures.map(async (lecture) => {
        await safeDeleteFile(lecture.video);
      })
    );

    // Delete course image
    await safeDeleteFile(course.image);

    // Delete lectures from database
    await Lecture.deleteMany({ course: req.params.id });

    // Delete course from database
    await course.deleteOne();

    // Remove course from user subscriptions
    await User.updateMany({}, { $pull: { subscription: req.params.id } });

    console.log('Course deleted successfully');

    res.json({
      message: "Course Deleted Successfully",
    });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({
      message: "Failed to delete course",
      error: error.message
    });
  } finally {
    next();
  }
};

export const getAllStats = async (req, res, next) => {
  try {
    // const totalCoures = (await Courses.find()).length;
    const totalCourses = await Courses.countDocuments({});
    // const totalLectures = (await Lecture.find()).length;
    const totalLectures = await Lecture.countDocuments({});
    // const totalUsers = (await User.find()).length;
    const totalUsers = await User.countDocuments({});

    const totalWorkshops = await Workshop.countDocuments({}); // Placeholder for workshop count if needed

    const stats = {
      courses : totalCourses,
      lectures : totalLectures,
      users : totalUsers,
      workshops : totalWorkshops,
    };

    // res.json({ stats });
    res.json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      message: "Failed to retrieve stats",
      error: error.message
    });
  } finally {
    next();
  }
};

export const getAllUser = async (req, res, next) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } }).select("-password");
    res.json({ users });
  } catch (error) {
    console.error('Error getting all users:', error);
    res.status(500).json({
      message: "Failed to retrieve users",
      error: error.message
    });
  } finally {
    next();
  }
} // Added closing bracket here

export const updateRole = async (req, res, next) => {
  try {
    const { id, role } = req.body;

    const user = await User.findById(id);

    if (!user) return res.status(404).json({ message: "User not found" });

    user.role = role;
    user.mainrole = role;
    await user.save();

    res.json({
      message: "Role Updated",
      user,
    });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({
      message: "Failed to update role",
      error: error.message
    });
  } finally {
    next();
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { name, email, avatar } = req.body;

    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (email) user.email = email;
    if (avatar) user.avatar = avatar;

    await user.save();

    res.json({
      message: "Profile Updated",
      user,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      message: "Failed to update profile",
      error: error.message
    });
  } finally {
    next();
  }
};
