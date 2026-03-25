import express from "express";
import Transport from "../models/Transport";
import { createLog } from "../utils/createLog";

const router = express.Router();

// ==========================
// 🚌 GET TRANSPORT BUSES FOR A SCHOOL
// ==========================
router.get("/:schoolId", async (req, res) => {
  try {
    const buses = await Transport.find({ schoolId: req.params.schoolId })
      .populate("assignedStudents", "name class rollNumber")
      .sort({ createdAt: -1 });

    res.json(buses);
  } catch (error) {
    console.error("GET TRANSPORT ERROR:", error);
    res.status(500).json({ message: "Failed to fetch transport data" });
  }
});

// ==========================
// ➕ CREATE BUS
// ==========================
router.post("/", async (req, res) => {
  try {
    const {
      busNumber,
      routeName,
      driverName,
      driverPhone,
      driverLicenseNumber,
      driverLicensePhoto,
      conductorName,
      conductorPhone,
      conductorInfo,
      routeStops,
      assignedStudents,
      schoolId,
    } = req.body;

    if (
      !busNumber ||
      !routeName ||
      !driverName ||
      !driverPhone ||
      !driverLicenseNumber ||
      !conductorName ||
      !schoolId
    ) {
      return res.status(400).json({
        message:
          "Required fields: busNumber, routeName, driverName, driverPhone, driverLicenseNumber, conductorName, schoolId",
      });
    }

    const transport = await Transport.create({
      busNumber,
      routeName,
      driverName,
      driverPhone,
      driverLicenseNumber,
      driverLicensePhoto,
      conductorName,
      conductorPhone,
      conductorInfo,
      routeStops: Array.isArray(routeStops) ? routeStops : [],
      assignedStudents: Array.isArray(assignedStudents) ? assignedStudents : [],
      schoolId,
    });

    const populatedTransport = await transport.populate("assignedStudents", "name class rollNumber");

    await createLog({
      action: "CREATE_TRANSPORT",
      message: `Bus created: ${busNumber} (${routeName})`,
      schoolId,
    });

    res.status(201).json({ success: true, data: populatedTransport });
  } catch (error) {
    console.error("CREATE TRANSPORT ERROR:", error);
    res.status(500).json({ message: "Failed to create bus" });
  }
});

// ==========================
// ✏️ UPDATE BUS
// ==========================
router.put("/:id", async (req, res) => {
  try {
    const updatedBus = await Transport.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        assignedStudents: Array.isArray(req.body.assignedStudents)
          ? req.body.assignedStudents
          : [],
      },
      { new: true }
    ).populate("assignedStudents", "name class rollNumber");

    if (!updatedBus) {
      return res.status(404).json({ message: "Bus not found" });
    }

    await createLog({
      action: "UPDATE_TRANSPORT",
      message: `Bus updated: ${updatedBus.busNumber}`,
      schoolId: updatedBus.schoolId,
    });

    res.json({ success: true, data: updatedBus });
  } catch (error) {
    console.error("UPDATE TRANSPORT ERROR:", error);
    res.status(500).json({ message: "Failed to update bus" });
  }
});

// ==========================
// 🗑 DELETE BUS
// ==========================
router.delete("/:id", async (req, res) => {
  try {
    const bus = await Transport.findByIdAndDelete(req.params.id);

    if (!bus) {
      return res.status(404).json({ message: "Bus not found" });
    }

    await createLog({
      action: "DELETE_TRANSPORT",
      message: `Bus deleted: ${bus.busNumber}`,
      schoolId: bus.schoolId,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("DELETE TRANSPORT ERROR:", error);
    res.status(500).json({ message: "Failed to delete bus" });
  }
});

export default router;
