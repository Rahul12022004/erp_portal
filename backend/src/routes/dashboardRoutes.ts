import express from "express";
import Announcement from "../models/Announcement";
import Attendance from "../models/Attendance";
import Class from "../models/Class";
import Finance from "../models/Finance";
import School from "../models/School";
import Staff from "../models/Staff";
import Student from "../models/Student";

const router = express.Router();

// GET DASHBOARD DATA FOR A TEACHER
router.get("/teacher/:schoolId/:teacherId", async (req, res) => {
  try {
    const { schoolId, teacherId } = req.params;
    const today = new Date().toISOString().split("T")[0];

    const [teacher, classes, announcements, attendanceToday, attendanceHistory] = await Promise.all([
      Staff.findOne({ _id: teacherId, schoolId, position: /^Teacher$/i }),
      Class.find({ schoolId, classTeacher: teacherId }).sort({ name: 1 }),
      Announcement.find({ schoolId }).sort({ createdAt: -1 }).limit(5),
      Attendance.findOne({ schoolId, staffId: teacherId, date: today }),
      Attendance.find({ schoolId, staffId: teacherId }).select("status"),
    ]);

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const classNames = classes.map((classItem) => classItem.name);
    const students = classNames.length > 0
      ? await Student.find({ schoolId, class: { $in: classNames } }).select("name class rollNumber")
      : [];

    const classStudentCounts = students.reduce((acc, student) => {
      acc[student.class] = (acc[student.class] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const classItems = classes.map((classItem) => ({
      id: String(classItem._id),
      name: classItem.name,
      section: classItem.section || "",
      stream: classItem.stream || "",
      academicYear: classItem.academicYear || "",
      meetLink: classItem.meetLink || "",
      students: classStudentCounts[classItem.name] || 0,
    }));

    const digitalClasses = classItems.filter((classItem) => classItem.meetLink);

    const attendanceRate = attendanceHistory.length
      ? Math.round(
          (attendanceHistory.filter(
            (record) => record.status === "Present" || record.status === "Half Day"
          ).length /
            attendanceHistory.length) *
            100
        )
      : 0;

    const stats = {
      assignedClasses: classItems.length,
      totalStudents: students.length,
      digitalClasses: digitalClasses.length,
      attendanceToday: attendanceToday?.status || "Not Marked",
      attendanceRate,
    };

    const notifications = announcements.map((announcement) => ({
      id: String(announcement._id),
      title: announcement.title,
      desc: announcement.message,
      time: new Date(announcement.createdAt).toLocaleString(),
      author: announcement.author,
    }));

    res.json({
      stats,
      classes: classItems,
      digitalClasses,
      notifications,
    });
  } catch (err) {
    console.error("Teacher dashboard fetch error:", err);
    res.status(500).json({ message: "Failed to fetch teacher dashboard data" });
  }
});

// GET DASHBOARD DATA FOR A SCHOOL
router.get("/:schoolId", async (req, res) => {
  try {
    const schoolId = req.params.schoolId;

    const school = await School.findById(schoolId);
    if (!school) return res.status(404).json({ message: "School not found" });

    const [
      totalClasses,
      totalStudents,
      totalTeachers,
      announcements,
      students,
      attendanceRecords,
      financeRecords,
    ] = await Promise.all([
      Class.countDocuments({ schoolId }),
      Student.countDocuments({ schoolId }),
      Staff.countDocuments({ schoolId, position: /^Teacher$/i }),
      Announcement.find({ schoolId }).sort({ createdAt: -1 }).limit(5),
      Student.find({ schoolId }).select("class"),
      Attendance.find({
        schoolId,
        staffId: { $exists: true, $ne: null },
      }).select("status date"),
      Finance.find({ schoolId }).select("type amount paidAmount transactionType createdAt"),
    ]);

    const notifications = announcements.map((announcement) => ({
      id: String(announcement._id),
      title: announcement.title,
      desc: announcement.message,
      time: new Date(announcement.createdAt).toLocaleString(),
      author: announcement.author,
      type: "announcement",
    }));

    const classCountMap = students.reduce((acc, student) => {
      if (!student.class) {
        return acc;
      }

      acc[student.class] = (acc[student.class] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const classData = Object.entries(classCountMap)
      .map(([name, count]) => ({
        name,
        students: count,
      }))
      .sort((a, b) => b.students - a.students);

    const attendanceRate = attendanceRecords.length
      ? Math.round(
          (attendanceRecords.filter(
            (record) => record.status === "Present" || record.status === "Half Day"
          ).length /
            attendanceRecords.length) *
            100
        )
      : 0;

    const monthBuckets = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - index));

      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      return {
        key: monthKey,
        month: date.toLocaleString("en-US", { month: "short" }),
        fees: 0,
        expense: 0,
        profit: 0,
      };
    });

    const financeMap = new Map(monthBuckets.map((bucket) => [bucket.key, bucket]));

    financeRecords.forEach((record) => {
      const date = new Date(record.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const bucket = financeMap.get(monthKey);

      if (!bucket) {
        return;
      }

      if (record.type === "student_fee") {
        bucket.fees += record.paidAmount || 0;
      } else if (record.type === "staff_salary") {
        bucket.expense += record.paidAmount || 0;
      } else if (record.type === "other") {
        if (record.transactionType === "income") {
          bucket.fees += record.amount || 0;
        } else if (record.transactionType === "expense") {
          bucket.expense += record.amount || 0;
        }
      }
    });

    const financeData = monthBuckets.map((bucket) => ({
      month: bucket.month,
      fees: bucket.fees,
      expense: bucket.expense,
      profit: bucket.fees - bucket.expense,
    }));

    const stats = {
      totalClasses,
      totalStudents,
      totalTeachers,
      attendance: attendanceRate,
    };

    res.json({
      stats,
      classData,
      financeData,
      notifications,
    });
  } catch (err) {
    console.error("Dashboard fetch error:", err);
    res.status(500).json({ message: "Failed to fetch dashboard data" });
  }
});

export default router;
