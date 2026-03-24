import express from "express";

import Maintenance from "../models/Maintenance";
import { createLog } from "../utils/createLog";

const router = express.Router();

// ==========================
// 📚 GET MAINTENANCE RECORDS FOR A SCHOOL
// ==========================
router.get("/:schoolId", async (req, res) => {
  try {
    const records = await Maintenance.find({ schoolId: req.params.schoolId }).sort({
      maintenanceDate: -1,
      createdAt: -1,
    });

    res.json(records);
  } catch (error) {
    console.error("GET MAINTENANCE ERROR:", error);
    res.status(500).json({ message: "Failed to fetch maintenance records" });
  }
});

// ==========================
// ➕ CREATE MAINTENANCE RECORD
// ==========================
router.post("/", async (req, res) => {
  try {
    const {
      title,
      location,
      workDone,
      raisedBy,
      technician,
      maintenanceDate,
      schoolId,
    } = req.body;

    if (
      !title ||
      !location ||
      !workDone ||
      !raisedBy ||
      !technician ||
      !maintenanceDate ||
      !schoolId
    ) {
      return res.status(400).json({
        message:
          "Required fields: title, location, workDone, raisedBy, technician, maintenanceDate, schoolId",
      });
    }

    const record = await Maintenance.create({
      title,
      location,
      workDone,
      raisedBy,
      technician,
      maintenanceDate,
      schoolId,
    });

    await createLog({
      action: "CREATE_MAINTENANCE_RECORD",
      message: `Maintenance recorded: ${title} at ${location}`,
      schoolId,
    });

    res.json({ success: true, data: record });
  } catch (error) {
    console.error("CREATE MAINTENANCE ERROR:", error);
    res.status(500).json({ message: "Failed to create maintenance record" });
  }
});

// ==========================
// 🗑 DELETE MAINTENANCE RECORD
// ==========================
router.delete("/:id", async (req, res) => {
  try {
    const record = await Maintenance.findByIdAndDelete(req.params.id);

    if (!record) {
      return res.status(404).json({ message: "Maintenance record not found" });
    }

    await createLog({
      action: "DELETE_MAINTENANCE_RECORD",
      message: `Maintenance record deleted: ${record.title}`,
      schoolId: record.schoolId,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("DELETE MAINTENANCE ERROR:", error);
    res.status(500).json({ message: "Failed to delete maintenance record" });
  }
});

export default router;
