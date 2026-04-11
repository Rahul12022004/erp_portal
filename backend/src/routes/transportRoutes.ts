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
      rcDocument,
      rcExpiryDate,
      pollutionDocument,
      pollutionExpiryDate,
      insuranceDocument,
      insuranceExpiryDate,
      fitnessCertificateDocument,
      fitnessExpiryDate,
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
      rcDocument,
      rcExpiryDate,
      pollutionDocument,
      pollutionExpiryDate,
      insuranceDocument,
      insuranceExpiryDate,
      fitnessCertificateDocument,
      fitnessExpiryDate,
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
// ⛽ ADD DRIVER READING & FUEL SLIP
// ==========================
router.post("/:id/readings", async (req, res) => {
  try {
    const { odometerReading, fuelAmount, fuelSlip, fuelSlipFileName, readingDate } = req.body;

    if (odometerReading === undefined || odometerReading === null || Number.isNaN(Number(odometerReading))) {
      return res.status(400).json({ message: "Valid odometerReading is required" });
    }

    const bus = await Transport.findById(req.params.id);
    if (!bus) {
      return res.status(404).json({ message: "Bus not found" });
    }

    const currentDriverName = String(bus.driverName || "").trim();
    const logs = Array.isArray((bus as any).readingLogs) ? (bus as any).readingLogs : [];

    const lastForSameDriver = [...logs]
      .filter((log: any) => String(log.driverName || "").trim().toLowerCase() === currentDriverName.toLowerCase())
      .sort((a: any, b: any) => new Date(b.readingDate || b.createdAt || 0).getTime() - new Date(a.readingDate || a.createdAt || 0).getTime())[0];

    const currentReading = Number(odometerReading);
    const previousReading = lastForSameDriver ? Number(lastForSameDriver.odometerReading) : undefined;
    const distanceKm = previousReading !== undefined ? currentReading - previousReading : undefined;

    if (distanceKm !== undefined && distanceKm < 0) {
      return res.status(400).json({
        message: `Odometer reading cannot be less than previous reading (${previousReading}) for this driver`,
      });
    }

    (bus as any).readingLogs = [
      ...logs,
      {
        readingDate: readingDate ? new Date(readingDate) : new Date(),
        driverName: currentDriverName,
        odometerReading: currentReading,
        previousReading,
        distanceKm,
        fuelAmount: fuelAmount !== undefined && fuelAmount !== null && String(fuelAmount).trim() !== "" ? Number(fuelAmount) : undefined,
        fuelSlip: typeof fuelSlip === "string" ? fuelSlip : undefined,
        fuelSlipFileName: typeof fuelSlipFileName === "string" ? fuelSlipFileName : undefined,
      },
    ];

    await bus.save();

    await createLog({
      action: "ADD_TRANSPORT_READING",
      message: `Reading added for bus ${bus.busNumber} (${currentDriverName})`,
      schoolId: (bus as any).schoolId,
    });

    const updatedBus = await Transport.findById(req.params.id).populate("assignedStudents", "name class rollNumber");
    res.status(201).json({ success: true, data: updatedBus });
  } catch (error) {
    console.error("ADD TRANSPORT READING ERROR:", error);
    res.status(500).json({ message: "Failed to add transport reading" });
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
