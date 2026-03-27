import mongoose from "mongoose";

let databaseConnected = false;
let lastDatabaseError: string | null = null;

mongoose.connection.on("connected", () => {
  databaseConnected = true;
  lastDatabaseError = null;
});

mongoose.connection.on("disconnected", () => {
  databaseConnected = false;
});

mongoose.connection.on("error", (error) => {
  databaseConnected = false;
  lastDatabaseError = error.message;
});

export function getDatabaseStatus() {
  return {
    connected: databaseConnected,
    readyState: mongoose.connection.readyState,
    lastError: lastDatabaseError,
  };
}

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI?.trim() || "mongodb://127.0.0.1:27017/erp_portal";

    if (!process.env.MONGO_URI) {
      console.warn("MONGO_URI not found. Falling back to local MongoDB at mongodb://127.0.0.1:27017/erp_portal");
    }

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });

    databaseConnected = true;
    lastDatabaseError = null;
    console.log("MongoDB Connected ✅");
  } catch (error) {
    databaseConnected = false;
    const message = error instanceof Error ? error.message : String(error);
    lastDatabaseError = message;
    console.warn("MongoDB connection unavailable. Running backend without DB connection.");
    console.warn(`Reason: ${message}`);
    console.warn(
      "Start MongoDB locally or set backend/.env MONGO_URI to a reachable MongoDB instance."
    );
  }
};

export default connectDB;