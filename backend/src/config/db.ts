import mongoose from "mongoose";

let databaseConnected = false;
let lastDatabaseError: string | null = null;
let reconnectInFlight: Promise<void> | null = null;
let lastReconnectAttemptAt = 0;

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

export async function ensureDatabaseConnection(minRetryIntervalMs = 5000) {
  if (databaseConnected) {
    return true;
  }

  if (reconnectInFlight) {
    await reconnectInFlight;
    return databaseConnected;
  }

  const now = Date.now();
  if (now - lastReconnectAttemptAt < minRetryIntervalMs) {
    return databaseConnected;
  }

  lastReconnectAttemptAt = now;
  reconnectInFlight = connectDB().finally(() => {
    reconnectInFlight = null;
  });

  await reconnectInFlight;
  return databaseConnected;
}

const connectDB = async () => {
  const defaultLocalUri = "mongodb://127.0.0.1:27017/erp_portal";

  const candidateUris =
    process.env.NODE_ENV === "production"
      ? [process.env.PROD_MONGO_URI?.trim(), process.env.MONGO_URI?.trim(), defaultLocalUri]
      : [process.env.LOCAL_MONGO_URI?.trim(), process.env.MONGO_URI?.trim(), defaultLocalUri];

  const urisToTry = [...new Set(candidateUris.filter((uri): uri is string => Boolean(uri)))];

  if (process.env.NODE_ENV === "production") {
    if (!process.env.PROD_MONGO_URI && !process.env.MONGO_URI) {
      console.warn("PROD_MONGO_URI and MONGO_URI not found. Falling back to local MongoDB at mongodb://127.0.0.1:27017/erp_portal");
    }
  } else {
    if (!process.env.LOCAL_MONGO_URI && !process.env.MONGO_URI) {
      console.warn("LOCAL_MONGO_URI and MONGO_URI not found. Falling back to local MongoDB at mongodb://127.0.0.1:27017/erp_portal");
    }
  }

  let lastError: unknown = null;

  for (const uri of urisToTry) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
      });

      databaseConnected = true;
      lastDatabaseError = null;
      console.log(`MongoDB Connected ✅ (${uri})`);
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`MongoDB connect failed for ${uri}. Reason: ${message}`);
    }
  }

  databaseConnected = false;
  const message = lastError instanceof Error ? lastError.message : String(lastError);
  lastDatabaseError = message;
  console.warn("MongoDB connection unavailable. Running backend without DB connection.");
  console.warn(`Reason: ${message}`);
  console.warn(
    "Start MongoDB locally or set backend/.env MONGO_URI to a reachable MongoDB instance."
  );
};

export default connectDB;