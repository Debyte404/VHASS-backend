import mongoose from "mongoose";

export const connectDb = async () => {
  try {
    const options = {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      family: 4 // Use IPv4, skip trying IPv6
    };

    await mongoose.connect(process.env.MONGODB_URI, options);
    console.log("Database Connected Successfully");
  } catch (error) {
    console.error("Database Connection Error:", error);
    process.exit(1); // Exit the process if database connection fails
  }
};
