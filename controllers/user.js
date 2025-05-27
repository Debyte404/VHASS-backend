import { User } from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import sendMail, { sendForgotMail } from "../middlewares/sendMail.js";
import TryCatch from "../middlewares/TryCatch.js";

export const register = TryCatch(async (req, res) => {
  console.log("Registration request received:", { ...req.body, password: req.body.password ? 'exists' : 'undefined' });
  const { email, name, password } = req.body;

  let user = await User.findOne({ email });
  console.log("User search result:", user ? { ...user.toObject(), password: user.password ? 'exists' : 'undefined' } : 'No user found');

  if (user) {
    console.log("User already exists");
    return res.status(400).json({
      message: "User Already exists",
    });
  }

  // Create user directly with User model instead of plain object
  try {
    user = await User.create({
      name,
      email,
      password, // This will be hashed by the pre-save hook
      isVerified: true // Temporarily set to true for testing
    });
    console.log("New user created:", { ...user.toObject(), password: user.password ? 'exists' : 'undefined' });

    const otp = Math.floor(Math.random() * 1000000);
    console.log("Generated OTP:", otp);

    const activationToken = jwt.sign(
      {
        user: {
          name: user.name,
          email: user.email,
          _id: user._id
        },
        otp,
      },
      process.env.Activation_Secret,
      {
        expiresIn: "5m",
      }
    );
    console.log("Activation token generated");

    const data = {
      name,
      otp,
    };

    try {
      console.log("Attempting to send email to:", email);
      await sendMail(email, "E learning", data);
      console.log("Email sent successfully");
    } catch (error) {
      console.error("Error sending email:", error);
      return res.status(500).json({
        message: "Error sending verification email",
      });
    }

    res.status(200).json({
      message: "Otp send to your mail",
      activationToken,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(500).json({
      message: "Error creating user",
      error: error.message
    });
  }
});

export const verifyUser = TryCatch(async (req, res) => {
  const { otp, activationToken } = req.body;

  const verify = jwt.verify(activationToken, process.env.Activation_Secret);

  if (!verify)
    return res.status(400).json({
      message: "Otp Expired",
    });

  if (verify.otp !== otp)
    return res.status(400).json({
      message: "Wrong Otp",
    });

  await User.create({
    name: verify.user.name,
    email: verify.user.email,
    password: verify.user.password,
  });

  res.json({
    message: "User Registered",
  });
});

export const loginUser = TryCatch(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Please enter email and password",
      code: "MISSING_CREDENTIALS"
    });
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return res.status(404).json({
      message: "User not found",
      code: "USER_NOT_FOUND"
    });
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    return res.status(401).json({
      message: "Invalid credentials",
      code: "INVALID_CREDENTIALS"
    });
  }

  // Set user in session for authentication
  req.session.user = {
    _id: user._id,
    email: user.email,
    name: user.name,
    role: user.role
  };

  return res.status(200).json({
    success: true,
    message: `Welcome back ${user.name}`,
    user: req.session.user,
  });
});

export const myProfile = TryCatch(async (req, res) => {
  console.log('Session:', req.session);
  console.log('Session user:', req.session && req.session.user);
  console.log('Passport user:', req.user);
  const user = await User.findById(req.user._id);

  res.json({ user });
});

export const forgotPassword = TryCatch(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user)
    return res.status(404).json({
      message: "No User with this email",
    });

  const token = jwt.sign({ email }, process.env.Forgot_Secret);

  const data = { email, token };

  await sendForgotMail("E learning", data);

  user.resetPasswordExpire = Date.now() + 5 * 60 * 1000;

  await user.save();

  res.json({
    message: "Reset Password Link is send to you mail",
  });
});

export const resetPassword = TryCatch(async (req, res) => {
  const decodedData = jwt.verify(req.query.token, process.env.Forgot_Secret);

  const user = await User.findOne({ email: decodedData.email });

  if (!user)
    return res.status(404).json({
      message: "No user with this email",
    });

  if (user.resetPasswordExpire === null)
    return res.status(400).json({
      message: "Token Expired",
    });

  if (user.resetPasswordExpire < Date.now()) {
    return res.status(400).json({
      message: "Token Expired",
    });
  }

  const password = await bcrypt.hash(req.body.password, 10);

  user.password = password;

  user.resetPasswordExpire = null;

  await user.save();

  res.json({ message: "Password Reset" });
});

export const logoutUser = TryCatch(async (req, res) => {
  // Clear the authentication cookie
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });

  // Clear session if it exists
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
      }
    });
  }

  res.status(200).json({
    message: "Logged out successfully"
  });
});
