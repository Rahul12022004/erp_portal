import express from "express";
import Attendance from "../models/Attendance";
import Staff from "../models/Staff";
import Student from "../models/Student";
import School from "../models/School";
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

const toRadians = (value: number) => (value * Math.PI) / 180;

const haversineDistanceMeters = (
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
) => {
  const earthRadius = 6371000;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(toLat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
};

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
      admissionCompleted: { $ne: false },
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
// 👨‍🏫 GET SELF ATTENDANCE FOR A TEACHER AND DATE
// ==========================
router.get("/self/:schoolId/:teacherId/:date", async (req, res) => {
  try {
    const { schoolId, teacherId, date } = req.params;

    const attendance = await Attendance.findOne({
      schoolId,
      staffId: teacherId,
      date,
    });

    if (!attendance) {
      return res.json({ success: true, data: null });
    }

    return res.json({ success: true, data: attendance });
  } catch (error) {
    console.error("GET SELF ATTENDANCE ERROR:", error);
    return res.status(500).json({ message: "Failed to fetch self attendance" });
  }
});

// ==========================
// 🔒 LOCK SELF ATTENDANCE FOR A TEACHER AND DATE
// ==========================
router.post("/self/lock", async (req, res) => {
  try {
    const { teacherId, schoolId, date } = req.body as {
      teacherId?: string;
      schoolId?: string;
      date?: string;
    };

    if (!teacherId || !schoolId || !date) {
      return res.status(400).json({
        message: "Required fields: teacherId, schoolId, date",
      });
    }

    const attendance = await Attendance.findOne({
      schoolId,
      staffId: teacherId,
      date,
    });

    if (!attendance) {
      return res.status(404).json({
        message: "Self attendance not found for selected date",
      });
    }

    if (attendance.selfLocked) {
      return res.json({ success: true, data: attendance, message: "Attendance is already locked" });
    }

    attendance.selfLocked = true;
    attendance.selfLockedAt = new Date();
    await attendance.save();

    await createLog({
      action: "LOCK_SELF_ATTENDANCE",
      message: `Teacher self attendance locked for ${date}`,
      schoolId,
    });

    return res.json({ success: true, data: attendance });
  } catch (error) {
    console.error("LOCK SELF ATTENDANCE ERROR:", error);
    return res.status(500).json({ message: "Failed to lock self attendance" });
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

// ==========================
// 📍 TEACHER SELF ATTENDANCE WITH LOCATION
// ==========================
router.post("/self", async (req, res) => {
  try {
    const {
      teacherId,
      schoolId,
      date,
      status,
      remarks,
      location,
    } = req.body as {
      teacherId?: string;
      schoolId?: string;
      date?: string;
      status?: string;
      remarks?: string;
      location?: {
        latitude?: number;
        longitude?: number;
        accuracy?: number;
      };
    };

    if (!teacherId || !schoolId || !date || !status) {
      return res.status(400).json({
        message: "Required fields: teacherId, schoolId, date, status",
      });
    }

    const teacher = await Staff.findOne({ _id: teacherId, schoolId, position: /^Teacher$/i }).select("name");
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const school = await School.findById(schoolId).select("schoolInfo.location");
    const schoolLocation = (school as unknown as {
      schoolInfo?: {
        location?: {
          latitude?: number;
          longitude?: number;
          radiusMeters?: number;
        };
      };
    })?.schoolInfo?.location;

    let distanceFromSchoolMeters: number | undefined;
    let isOutsideSchool = false;

    const hasTeacherLocation =
      typeof location?.latitude === "number" && typeof location?.longitude === "number";
    const hasSchoolLocation =
      typeof schoolLocation?.latitude === "number" && typeof schoolLocation?.longitude === "number";

    if (hasTeacherLocation && hasSchoolLocation) {
      distanceFromSchoolMeters = haversineDistanceMeters(
        schoolLocation!.latitude as number,
        schoolLocation!.longitude as number,
        location!.latitude as number,
        location!.longitude as number
      );

      const allowedRadius = schoolLocation?.radiusMeters || 200;
      isOutsideSchool = distanceFromSchoolMeters > allowedRadius;
    }

    const updatePayload = {
      status,
      remarks,
      selfMarked: true,
      location: hasTeacherLocation
        ? {
            latitude: location!.latitude,
            longitude: location!.longitude,
            accuracy: location?.accuracy,
            capturedAt: new Date(),
          }
        : undefined,
      isOutsideSchool,
      distanceFromSchoolMeters,
    };

    const existingAttendance = await Attendance.findOne({ staffId: teacherId, schoolId, date });

    if (existingAttendance?.selfLocked) {
      return res.status(423).json({
        message: "Attendance is locked for this date and cannot be changed",
      });
    }

    let attendance;
    if (existingAttendance) {
      attendance = await Attendance.findByIdAndUpdate(existingAttendance._id, updatePayload, {
        new: true,
      });
    } else {
      attendance = await Attendance.create({
        staffId: teacherId,
        schoolId,
        date,
        ...updatePayload,
      });
    }

    await createLog({
      action: "MARK_SELF_ATTENDANCE",
      message: `Teacher self attendance marked: ${status} for ${date}${isOutsideSchool ? " (outside school)" : ""}`,
      schoolId,
      user: teacher.name,
    });

    return res.json({
      success: true,
      data: attendance,
      meta: {
        isOutsideSchool,
        distanceFromSchoolMeters: distanceFromSchoolMeters || null,
      },
    });
  } catch (error) {
    console.error("MARK SELF ATTENDANCE ERROR:", error);
    return res.status(500).json({ message: "Failed to mark self attendance" });
  }
});

export default router;
