import multer from "multer";
import { v4 as uuid } from "uuid";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists with absolute path
const uploadsDir = path.join(path.dirname(__dirname), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadsDir);
  },
  filename(req, file, cb) {
    const id = uuid();
    const extName = file.originalname.split(".").pop().toLowerCase();
    const fileName = `${id}.${extName}`;
    cb(null, fileName);
  },
});

const fileFilter = (req, file, cb) => {
  // Accept images and videos
  const allowedImageTypes = /\.(jpg|jpeg|png|gif|webp)$/i;
  const allowedVideoTypes = /\.(mp4|webm|mov|avi|mkv)$/i;
  
  if (!file.originalname.match(allowedImageTypes) && !file.originalname.match(allowedVideoTypes)) {
    req.fileValidationError = 'Only image and video files are allowed!';
    return cb(new Error('Only image and video files are allowed!'), false);
  }
  cb(null, true);
};

export const uploadFiles = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max file size for videos
  }
});

export const upload = uploadFiles.fields([
  { name: 'file', maxCount: 1 },
  { name: 'image', maxCount: 1 }
]);

// Error handling middleware
export const handleMulterError = (error, req, res, next) => {
  console.error('Multer Error - Full Error Object:', error);
  console.error('Multer Error - Request Details:', {
    method: req.method,
    path: req.path,
    body: req.body,
    files: req.files,
    file: req.file,
    headers: req.headers
  });
  
  if (error instanceof multer.MulterError) {
    // Multer-specific errors
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          message: 'File upload failed',
          error: 'File is too large. Maximum file size is 5MB.',
          details: {
            code: error.code,
            fieldName: error.field,
            fileSize: error.size
          }
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          message: 'File upload failed',
          error: 'Too many files uploaded. Maximum 1 file allowed.',
          details: {
            code: error.code
          }
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          message: 'File upload failed',
          error: 'Unexpected file field name.',
          details: {
            code: error.code,
            fieldName: error.field
          }
        });
      default:
        return res.status(400).json({
          message: 'File upload failed',
          error: 'Unknown file upload error',
          details: {
            code: error.code,
            message: error.message
          }
        });
    }
  } else if (error) {
    // Other errors
    return res.status(500).json({
      message: 'Internal server error',
      error: 'File upload failed',
      details: {
        name: error.name,
        message: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      }
    });
  }
  
  // If no file was uploaded
  if (!req.file) {
    return res.status(400).json({
      error: 'No file uploaded. Please select a file to upload.',
      code: 'NO_FILE_UPLOADED'
    });
  }

  next();
};
