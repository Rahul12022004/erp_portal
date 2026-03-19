import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db";
import schoolRoutes from "./routes/schoolRoutes";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect DB
connectDB();

// Routes
app.use("/api/schools", schoolRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("API Running 🚀");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});