import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;

    if (!uri) {
      throw new Error("MONGO_URI not found ❌");
    }

    await mongoose.connect(uri);

    console.log("MongoDB Connected ✅");
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

export default connectDB;