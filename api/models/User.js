import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter your name"],
    },
    email: {
      type: String,
      required: [true, "Please enter your email"],
      unique: true,
    },
    password: {
      type: String,
      required: [true, "Please enter your password"],
      minLength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    mainrole: {
      type: String,
      default: "user",
    },
    subscription: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Courses",
      default: [],
    },
    workshopSubscription: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Workshop",
      default: [],
    },
    avatar: {
      type: String,
      default: "",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    resetPasswordToken: String,
    resetPasswordExpire: String,
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: String,
    verificationTokenExpire: Date,
    // Add Google authentication fields
    googleId: {
      type: String,
      sparse: true,
    },
    isGoogleUser: {
      type: Boolean,
      default: false,
    }
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
schema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
schema.methods.comparePassword = async function (password) {
  console.log('comparePassword called with:', {
    providedPassword: password ? 'exists' : 'undefined',
    storedPassword: this.password ? 'exists' : 'undefined',
    userId: this._id
  });
  
  if (!password || !this.password) {
    console.error('Missing password data:', {
      providedPassword: !!password,
      storedPassword: !!this.password
    });
    throw new Error('Password data is missing');
  }
  
  return await bcrypt.compare(password, this.password);
};

// JWT token generation removed in favor of session-based authentication
export const User = mongoose.model("User", schema);
