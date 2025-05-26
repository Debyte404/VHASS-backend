import express from "express";
import {
  getAllWorkshops,
  getSingleWorkshop,
  getMyWorkshops,
  createWorkshop,
  deleteWorkshop,
  phonepeCheckout,
  phonepeStatus
} from "../controllers/workshop.js";
import { isAuth, isAdmin } from "../middlewares/isAuth.js";
import { uploadFiles } from "../middlewares/multer.js";

const router = express.Router();

// CORS Preflight handler for all routes
router.options('*', (req, res) => {
  // const allowedOrigins = [process.env.FRONTEND_URL, 'http://localhost:5173'];
  const allowedOrigins = [process.env.FRONTEND_URL, process.env.PHONEPE_REDIRECT_URL];
  const origin = req.header('Origin');
  
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, token, multipart/form-data, Accept, Cookie');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Vary', 'Origin');
  res.sendStatus(204);
});

// Public routes
router.get("/workshop/all", getAllWorkshops);
router.get("/workshop/:id", getSingleWorkshop);

// Protected routes
router.get("/myworkshop", isAuth, getMyWorkshops);
router.post("/workshop/new", isAuth, isAdmin, uploadFiles.single('poster'), createWorkshop);
router.delete("/workshop/:id", isAuth, isAdmin, (req, res, next) => {
  console.log('Delete Workshop Request - Headers:', req.headers);
  console.log('Delete Workshop Request - Session:', req.session);
  console.log('Delete Workshop Request - User:', req.user);
  next();
}, deleteWorkshop);

// PhonePe payment endpoints
router.post("/workshop/phonepe/checkout/:id", isAuth, phonepeCheckout);
router.post("/workshop/phonepe/status/:transactionId", isAuth, phonepeStatus);

export default router; 