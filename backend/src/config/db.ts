import mongoose from "mongoose";
import { loadEnvironment } from "./env";

let lastDatabaseError: string | null = null;

export function getDatabaseStatus() {
  return {
    connected: mongoose.connection.readyState === 1,
    readyState: mongoose.connection.readyState,
    lastError: lastDatabaseError,
  };
}

function getMongoUri() {
  loadEnvironment();

  const mongoUri = process.env.MONGO_URI?.trim();

  if (!mongoUri) {
    throw new Error("Missing MONGO_URI. Set it in backend/.env (dev) or backend/.env.production (prod)");
  }

  const isSrvUri = mongoUri.startsWith("mongodb+srv://");
  const isDirectUri = mongoUri.startsWith("mongodb://");

  if (!isSrvUri && !isDirectUri) {
    throw new Error("MONGO_URI must start with mongodb+srv:// or mongodb://");
  }

  return mongoUri;
}

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (mongoose.connection.readyState === 2) {
    return mongoose;
  }

  const mongoUri = getMongoUri();

  try {
    const connection = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });
    lastDatabaseError = null;
    console.log("MongoDB connected successfully");
    return connection;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    lastDatabaseError = message;
    console.error(`MongoDB connection failed: ${message}`);
    process.exit(1);
  }
};

export default connectDB;