import express from "express";
import Announcement from "../models/Announcement";
import { createLog } from "../utils/createLog";

const router = express.Router();

// ==========================
// 📢 GET ANNOUNCEMENTS FOR A SCHOOL
// ==========================
router.get("/:schoolId", async (req, res) => {
  try {
    const announcements = await Announcement.find({ schoolId: req.params.schoolId })
      .sort({ createdAt: -1 }); // Most recent first

    res.json(announcements);
  } catch (error) {
    console.error("GET ANNOUNCEMENTS ERROR:", error);
    res.status(500).json({ message: "Failed to fetch announcements" });
  }
});

// ==========================
// ➕ CREATE ANNOUNCEMENT
// ==========================
router.post("/", async (req, res) => {
  try {
    const { title, message, author, schoolId } = req.body;

    if (!title || !message || !author || !schoolId) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const announcement = await Announcement.create({
      title,
      message,
      author,
      schoolId,
    });

    await createLog({
      action: "CREATE_ANNOUNCEMENT",
      message: `Announcement created: ${title}`,
      schoolId,
    });

    res.json({ success: true, data: announcement });
  } catch (error) {
    console.error("CREATE ANNOUNCEMENT ERROR:", error);
    res.status(500).json({ message: "Failed to create announcement" });
  }
});

// ==========================
// 🗑 DELETE ANNOUNCEMENT
// ==========================
router.delete("/:id", async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    await createLog({
      action: "DELETE_ANNOUNCEMENT",
      message: `Announcement deleted: ${announcement.title}`,
      schoolId: announcement.schoolId,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("DELETE ANNOUNCEMENT ERROR:", error);
    res.status(500).json({ message: "Failed to delete announcement" });
  }
});

export default router;