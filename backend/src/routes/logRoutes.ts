import express from "express";
import Log from "../models/Logs";

const router = express.Router();

// GET ALL LOGS
router.get("/", async (req, res) => {
  try {
    const logs = await Log.find().sort({ createdAt: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch logs" });
  }
});

export default router;