import express from "express";
import Attendance from "../models/Attendance";
import Staff from "../models/Staff";
import Student from "../models/Student";
import { createLog } from "../utils/createLog";

const router = express.Router();

interface PopulatedAttendance {
  staffId: {
    _id: string;
    name: string;
    position: string;
  };
  date: string;
  status: string;
  remarks?: string;
}

// ==========================
// 📊 GET ATTENDANCE REPORT
// ==========================
router.get("/report/:schoolId", async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { startDate, endDate, position } = req.query;

    const query: any = {
      schoolId,
      staffId: { $exists: true, $ne: null },
    };

    if (startDate && endDate) {
      query.date = { $gte: startDate as string, $lte: endDate as string };
    }

    let attendanceRecords = await Attendance.find(query)
      .populate("staffId", "name position")
      .sort({ date: -1 });

    if (position) {
      attendanceRecords = attendanceRecords.filter((a) => {
        const populated = a as unknown as PopulatedAttendance;
        return populated.staffId?.position === position;
      });
    }

    res.json(attendanceRecords);
  } catch (error) {
    console.error("GET ATTENDANCE REPORT ERROR:", error);
    res.status(500).json({ message: "Failed to fetch attendance report" });
  }
});

// ==========================
// 👨‍🎓 GET STUDENT ATTENDANCE FOR A CLASS AND DATE
// ==========================
router.get("/students/:schoolId/:className/:date", async (req, res) => {
  try {
    const { schoolId, className, date } = req.params;

    const students = await Student.find({
      schoolId,
      class: className,
    }).sort({ rollNumber: 1, name: 1 });

    const studentIds = students.map((student) => student._id);

    const attendanceRecords = studentIds.length
      ? await Attendance.find({
          schoolId,
          date,
          studentId: { $in: studentIds },
        })
      : [];

    const attendanceMap = new Map(
      attendanceRecords.map((attendanceRecord) => [
        attendanceRecord.studentId?.toString(),
        attendanceRecord,
      ])
    );

    const result = students.map((student) => {
      const attendance = attendanceMap.get(student._id.toString());

      return {
        studentId: student._id,
        name: student.name,
        email: student.email,
        rollNumber: student.rollNumber,
        class: student.class,
        status: attendance?.status || null,
        remarks: attendance?.remarks || "",
        attendanceId: attendance?._id || null,
      };
    });

    res.json(result);
  } catch (error) {
    console.error("GET STUDENT ATTENDANCE ERROR:", error);
    res.status(500).json({ message: "Failed to fetch student attendance" });
  }
});

// ==========================
// 📅 GET ATTENDANCE FOR A DATE
// ==========================
router.get("/:schoolId/:date", async (req, res) => {
  try {
    const { schoolId, date } = req.params;
    const { position } = req.query;

    const staffQuery: { schoolId: string; position?: RegExp } = { schoolId };

    if (typeof position === "string" && position.trim()) {
      staffQuery.position = new RegExp(`^${position.trim()}$`, "i");
    }

    const staff = await Staff.find(staffQuery).sort({ name: 1 });

    const attendanceRecords = await Attendance.find({
      schoolId,
      date,
      staffId: { $exists: true, $ne: null },
    });

    const attendanceMap = new Map(
      attendanceRecords
        .filter((attendanceRecord) => attendanceRecord.staffId)
        .map((attendanceRecord) => [
          attendanceRecord.staffId!.toString(),
          attendanceRecord,
        ])
    );

    const result = staff.map((staffMember) => {
      const attendance = attendanceMap.get(staffMember._id.toString());

      return {
        staffId: staffMember._id,
        name: staffMember.name,
        position: staffMember.position,
        status: attendance?.status || null,
        remarks: attendance?.remarks || "",
        attendanceId: attendance?._id || null,
      };
    });

    res.json(result);
  } catch (error) {
    console.error("GET ATTENDANCE ERROR:", error);
    res.status(500).json({ message: "Failed to fetch attendance" });
  }
});

// ==========================
// ➕ MARK STUDENT ATTENDANCE
// ==========================
router.post("/students", async (req, res) => {
  try {
    const { studentId, schoolId, date, status, remarks } = req.body;

    if (!studentId || !schoolId || !date || !status) {
      return res.status(400).json({
        message: "Required fields: studentId, schoolId, date, status",
      });
    }

    const existingAttendance = await Attendance.findOne({
      studentId,
      schoolId,
      date,
    });

    let attendance;
    if (existingAttendance) {
      attendance = await Attendance.findByIdAndUpdate(
        existingAttendance._id,
        { status, remarks },
        { new: true }
      );
    } else {
      attendance = await Attendance.create({
        studentId,
        schoolId,
        date,
        status,
        remarks,
      });
    }

    await createLog({
      action: "MARK_STUDENT_ATTENDANCE",
      message: `Student attendance marked: ${status} for ${date}`,
      schoolId,
    });

    res.json({ success: true, data: attendance });
  } catch (error) {
    console.error("MARK STUDENT ATTENDANCE ERROR:", error);
    res.status(500).json({ message: "Failed to mark student attendance" });
  }
});

// ==========================
// ➕ MARK ATTENDANCE
// ==========================
router.post("/", async (req, res) => {
  try {
    const { staffId, schoolId, date, status, remarks } = req.body;

    if (!staffId || !schoolId || !date || !status) {
      return res.status(400).json({ message: "Required fields: staffId, schoolId, date, status" });
    }

    const existingAttendance = await Attendance.findOne({ staffId, schoolId, date });

    let attendance;
    if (existingAttendance) {
      attendance = await Attendance.findByIdAndUpdate(
        existingAttendance._id,
        { status, remarks },
        { new: true }
      );
    } else {
      attendance = await Attendance.create({
        staffId,
        schoolId,
        date,
        status,
        remarks,
      });
    }

    await createLog({
      action: "MARK_ATTENDANCE",
      message: `Attendance marked: ${status} for ${date}`,
      schoolId,
    });

    res.json({ success: true, data: attendance });
  } catch (error) {
    console.error("MARK ATTENDANCE ERROR:", error);
    res.status(500).json({ message: "Failed to mark attendance" });
  }
});

export default router;
