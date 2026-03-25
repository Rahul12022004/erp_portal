import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;

    if (!uri) {
      console.error("MONGO_URI not found ❌");
      return;
    }

    await mongoose.connect(uri);

    console.log("MongoDB Connected ✅");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    console.error("Server will continue running; check MONGO_URI and database network access.");
  }
};

export default connectDB;