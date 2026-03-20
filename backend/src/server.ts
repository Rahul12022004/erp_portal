import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db";

import schoolRoutes from "./routes/schoolRoutes";
import logRoutes from "./routes/logRoutes"; // ✅ ADD THIS

dotenv.config();

const app = express();

// ==========================
// 🔧 MIDDLEWARE
// ==========================
app.use(cors());
app.use(express.json());

// ==========================
// 🗄 DATABASE
// ==========================
connectDB();

// ==========================
// 🚀 ROUTES
// ==========================
app.use("/api/schools", schoolRoutes);
app.use("/api/logs", logRoutes); // ✅ ADD THIS

// ==========================
// 🧪 TEST ROUTE
// ==========================
app.get("/", (req, res) => {
  res.send("API Running 🚀");
});

// ==========================
// 🚀 SERVER START
// ==========================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});