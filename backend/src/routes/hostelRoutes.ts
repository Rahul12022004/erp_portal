import express from "express";
import Hostel from "../models/Hostel";
import { createLog } from "../utils/createLog";

const router = express.Router();

const DEFAULT_HOSTELS = ["Hostel A", "Hostel B", "Hostel C", "Hostel D"];

const ensureDefaultHostels = async (schoolId: string) => {
  const existingHostels = await Hostel.find({ schoolId }).select("name");
  const existingNames = new Set(existingHostels.map((hostel) => hostel.name));

  const missingHostels = DEFAULT_HOSTELS
    .filter((name) => !existingNames.has(name))
    .map((name) => ({
      name,
      assignedStudents: [],
      schoolId,
    }));

  if (missingHostels.length > 0) {
    await Hostel.insertMany(missingHostels);
  }
};

// ==========================
// 🏠 GET HOSTELS FOR A SCHOOL
// ==========================
router.get("/:schoolId", async (req, res) => {
  try {
    const { schoolId } = req.params;

    await ensureDefaultHostels(schoolId);

    const hostels = await Hostel.find({ schoolId })
      .populate("assignedStudents", "name class rollNumber")
      .sort({ name: 1 });

    res.json(hostels);
  } catch (error) {
    console.error("GET HOSTELS ERROR:", error);
    res.status(500).json({ message: "Failed to fetch hostels" });
  }
});

// ==========================
// ✏️ UPDATE HOSTEL ASSIGNMENTS
// ==========================
router.put("/:id", async (req, res) => {
  try {
    const currentHostel = await Hostel.findById(req.params.id);

    if (!currentHostel) {
      return res.status(404).json({ message: "Hostel not found" });
    }

    const uniqueAssignedStudents = Array.isArray(req.body.assignedStudents)
      ? [...new Set(req.body.assignedStudents)]
      : [];

    if (uniqueAssignedStudents.length > 0) {
      await Hostel.updateMany(
        {
          schoolId: currentHostel.schoolId,
          _id: { $ne: currentHostel._id },
        },
        {
          $pull: {
            assignedStudents: { $in: uniqueAssignedStudents },
          },
        }
      );
    }

    const hostel = await Hostel.findByIdAndUpdate(
      req.params.id,
      {
        assignedStudents: uniqueAssignedStudents,
      },
      { new: true }
    ).populate("assignedStudents", "name class rollNumber");

    if (!hostel) {
      return res.status(404).json({ message: "Hostel not found" });
    }

    await createLog({
      action: "UPDATE_HOSTEL",
      message: `Hostel updated: ${hostel.name}`,
      schoolId: hostel.schoolId,
    });

    res.json({ success: true, data: hostel });
  } catch (error) {
    console.error("UPDATE HOSTEL ERROR:", error);
    res.status(500).json({ message: "Failed to update hostel" });
  }
});

export default router;
