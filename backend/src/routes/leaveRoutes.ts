import express from "express";

import LeaveApplication from "../models/LeaveApplication";
import Staff from "../models/Staff";
import { createLog } from "../utils/createLog";

const router = express.Router();

// ==========================
// 📚 GET ALL LEAVE APPLICATIONS FOR A SCHOOL
// ==========================
router.get("/school/:schoolId", async (req, res) => {
  try {
    const { schoolId } = req.params;

    const leaves = await LeaveApplication.find({ schoolId })
      .populate("teacherId", "name email position")
      .sort({ createdAt: -1 });

    res.json(leaves);
  } catch (error) {
    console.error("GET SCHOOL LEAVES ERROR:", error);
    res.status(500).json({ message: "Failed to fetch leave applications" });
  }
});

// ==========================
// 📚 GET LEAVE APPLICATIONS FOR A TEACHER
// ==========================
router.get("/:schoolId/:teacherId", async (req, res) => {
  try {
    const { schoolId, teacherId } = req.params;

    const leaves = await LeaveApplication.find({ schoolId, teacherId }).sort({
      createdAt: -1,
    });

    res.json(leaves);
  } catch (error) {
    console.error("GET LEAVES ERROR:", error);
    res.status(500).json({ message: "Failed to fetch leave applications" });
  }
});

// ==========================
// ➕ CREATE LEAVE APPLICATION
// ==========================
router.post("/", async (req, res) => {
  try {
    const { title, description, leaveType, fileName, fileData, teacherId, schoolId } = req.body;

    if (!title || !description || !leaveType || !teacherId || !schoolId) {
      return res.status(400).json({
        message: "Required fields: title, description, leaveType, teacherId, schoolId",
      });
    }

    if (!["Paid", "Unpaid", "Emergency"].includes(leaveType)) {
      return res.status(400).json({ message: "Invalid leave type" });
    }

    const teacher = await Staff.findOne({
      _id: teacherId,
      schoolId,
      position: /^Teacher$/i,
    }).select("name");

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    if (leaveType === "Unpaid" || leaveType === "Emergency") {
      const existingTypeCount = await LeaveApplication.countDocuments({
        schoolId,
        teacherId,
        leaveType,
        status: { $ne: "Rejected" },
      });

      const maxAllowed = leaveType === "Unpaid" ? 4 : 3;

      if (existingTypeCount >= maxAllowed) {
        return res.status(400).json({
          message: `${leaveType} leave limit reached. Allowed: ${maxAllowed}`,
        });
      }
    }

    const leave = await LeaveApplication.create({
      title,
      description,
      leaveType,
      fileName,
      fileData,
      teacherId,
      schoolId,
      status: "Pending",
    });

    await createLog({
      action: "CREATE_LEAVE_APPLICATION",
      message: `${leaveType} leave applied: ${title}`,
      user: teacher.name,
      schoolId,
    });

    res.json({ success: true, data: leave });
  } catch (error) {
    console.error("CREATE LEAVE ERROR:", error);
    res.status(500).json({ message: "Failed to create leave application" });
  }
});

// ==========================
// ✏️ UPDATE LEAVE STATUS
// ==========================
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    if (!["Pending", "Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const leave = await LeaveApplication.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!leave) {
      return res.status(404).json({ message: "Leave application not found" });
    }

    await createLog({
      action: "UPDATE_LEAVE_STATUS",
      message: `Leave status updated to ${status}: ${leave.title}`,
      schoolId: leave.schoolId,
    });

    res.json({ success: true, data: leave });
  } catch (error) {
    console.error("UPDATE LEAVE STATUS ERROR:", error);
    res.status(500).json({ message: "Failed to update leave status" });
  }
});

export default router;
