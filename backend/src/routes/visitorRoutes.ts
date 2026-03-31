import express from "express";
import Visitor from "../models/Visitor";
import { createLog } from "../utils/createLog";

const router = express.Router();

const formatDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

const formatTime = (date: Date) => {
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const suffix = hours >= 12 ? "PM" : "AM";
  const normalizedHours = hours % 12 || 12;
  return `${String(normalizedHours).padStart(2, "0")}:${minutes} ${suffix}`;
};

const generatePassId = () =>
  `VP-${Date.now().toString().slice(-8)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

router.get("/school/:schoolId", async (req, res) => {
  try {
    const visitors = await Visitor.find({ schoolId: req.params.schoolId }).sort({
      createdAt: -1,
      regDate: -1,
    });

    res.json(visitors);
  } catch (error) {
    console.error("FETCH VISITORS ERROR:", error);
    res.status(500).json({ message: "Failed to fetch visitor passes" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);

    if (!visitor) {
      return res.status(404).json({ message: "Visitor pass not found" });
    }

    res.json(visitor);
  } catch (error) {
    console.error("FETCH VISITOR ERROR:", error);
    res.status(500).json({ message: "Failed to fetch visitor pass" });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      schoolId,
      regDate,
      requestMode,
      passStatus,
      fullName,
      photo,
      idType,
      idNumber,
      idProof,
      idProofFileName,
      mobile,
      email,
      address,
      visitDate,
      entryTime,
      exitTime,
      visitType,
      purpose,
      personToMeetType,
      personToMeet,
      department,
      studentClass,
      studentName,
      approvalStatus,
    } = req.body;

    if (!schoolId) {
      return res.status(400).json({ message: "schoolId is required" });
    }

    const now = new Date();
    const visitor = await Visitor.create({
      schoolId,
      passId: generatePassId(),
      regDate: regDate || formatDate(now),
      requestMode,
      passStatus,
      fullName,
      photo,
      idType,
      idNumber,
      idProof,
      idProofFileName,
      mobile,
      email,
      address,
      visitDate: visitDate || formatDate(now),
      entryTime: entryTime || formatTime(now),
      exitTime,
      visitType,
      purpose,
      personToMeetType,
      personToMeet,
      department,
      studentClass,
      studentName,
      approvalStatus,
    });

    await createLog({
      action: "CREATE_VISITOR_PASS",
      message: `Visitor pass created for ${visitor.fullName || "Visitor"}`,
      schoolId,
    });

    res.status(201).json({ success: true, data: visitor });
  } catch (error) {
    console.error("CREATE VISITOR ERROR:", error);
    res.status(500).json({ message: "Failed to create visitor pass" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const updatedVisitor = await Visitor.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          regDate: req.body.regDate,
          requestMode: req.body.requestMode,
          passStatus: req.body.passStatus,
          fullName: req.body.fullName,
          photo: req.body.photo,
          idType: req.body.idType,
          idNumber: req.body.idNumber,
          idProof: req.body.idProof,
          idProofFileName: req.body.idProofFileName,
          mobile: req.body.mobile,
          email: req.body.email,
          address: req.body.address,
          visitDate: req.body.visitDate,
          entryTime: req.body.entryTime,
          exitTime: req.body.exitTime,
          visitType: req.body.visitType,
          purpose: req.body.purpose,
          personToMeetType: req.body.personToMeetType,
          personToMeet: req.body.personToMeet,
          department: req.body.department,
          studentClass: req.body.studentClass,
          studentName: req.body.studentName,
          approvalStatus: req.body.approvalStatus,
        },
      },
      { new: true }
    );

    if (!updatedVisitor) {
      return res.status(404).json({ message: "Visitor pass not found" });
    }

    await createLog({
      action: "UPDATE_VISITOR_PASS",
      message: `Visitor pass updated for ${updatedVisitor.fullName || "Visitor"}`,
      schoolId: updatedVisitor.schoolId,
    });

    res.json({ success: true, data: updatedVisitor });
  } catch (error) {
    console.error("UPDATE VISITOR ERROR:", error);
    res.status(500).json({ message: "Failed to update visitor pass" });
  }
});

router.patch("/scan-exit", async (req, res) => {
  try {
    const { schoolId, passId } = req.body;

    if (!schoolId || !passId) {
      return res.status(400).json({ message: "schoolId and passId are required" });
    }

    const now = new Date();
    const visitor = await Visitor.findOneAndUpdate(
      { schoolId, passId },
      {
        $set: {
          exitTime: formatTime(now),
          passStatus: "Approved",
        },
      },
      { new: true },
    );

    if (!visitor) {
      return res.status(404).json({ message: "Visitor pass not found for scan" });
    }

    await createLog({
      action: "SCAN_VISITOR_EXIT",
      message: `Visitor exit scanned for ${visitor.fullName || "Visitor"} (${visitor.passId})`,
      schoolId,
    });

    res.json({ success: true, data: visitor });
  } catch (error) {
    console.error("SCAN VISITOR EXIT ERROR:", error);
    res.status(500).json({ message: "Failed to scan visitor exit" });
  }
});

export default router;
