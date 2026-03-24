import express from "express";
import Finance from "../models/Finance";
import Student from "../models/Student";
import Staff from "../models/Staff";
import mongoose from "mongoose";
import { createLog } from "../utils/createLog";

const router = express.Router();
const DEFAULT_STUDENT_FEE_AMOUNT = 10000;

const getDefaultFeeDueDate = () => {
  const now = new Date();
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return lastDayOfMonth.toISOString().split("T")[0];
};

// ==========================
// � GET STUDENT FEES SUMMARY
// ==========================
router.get("/:schoolId/students/summary", async (req, res) => {
  try {
    const students = await Student.find({ schoolId: req.params.schoolId })
        .select("name email class rollNumber phone address dateOfBirth gender")
        .sort({ name: 1 });

    let finances = await Finance.find({
        schoolId: req.params.schoolId,
        type: "student_fee"
      })
      .sort({ createdAt: -1 })
      .populate("studentId", "name email class rollNumber phone address dateOfBirth gender");

    const existingStudentFeeIds = new Set(
      finances
        .filter(finance => finance.studentId)
        .map(finance =>
          String((finance.studentId && typeof finance.studentId === "object" && "_id" in finance.studentId)
            ? (finance.studentId as { _id: mongoose.Types.ObjectId })._id
            : finance.studentId)
        )
    );

    const missingStudentFees = students
      .filter(student => !existingStudentFeeIds.has(String(student._id)))
      .map(student => ({
        type: "student_fee" as const,
        studentId: student._id,
        amount: DEFAULT_STUDENT_FEE_AMOUNT,
        paidAmount: 0,
        dueDate: getDefaultFeeDueDate(),
        status: "pending" as const,
        description: `Default fee record for ${student.name}`,
        schoolId: req.params.schoolId,
      }));

    if (missingStudentFees.length > 0) {
      await Finance.insertMany(missingStudentFees);
      finances = await Finance.find({
        schoolId: req.params.schoolId,
        type: "student_fee"
      }).populate("studentId", "name email class rollNumber phone address dateOfBirth gender");
    }

    const financeByStudentId = new Map();
    finances
      .filter(finance => finance.studentId)
      .forEach(finance => {
        const studentId = String((finance.studentId && typeof finance.studentId === "object" && "_id" in finance.studentId)
          ? (finance.studentId as { _id: mongoose.Types.ObjectId })._id
          : finance.studentId);

        if (!financeByStudentId.has(studentId)) {
          financeByStudentId.set(studentId, finance);
        }
      });

    const summary = students.map(student => {
      const finance = financeByStudentId.get(String(student._id));

      return {
        financeId: finance?._id || null,
        student,
        totalFee: finance?.amount || DEFAULT_STUDENT_FEE_AMOUNT,
        paidAmount: finance?.paidAmount || 0,
        remainingAmount: Math.max((finance?.amount || DEFAULT_STUDENT_FEE_AMOUNT) - (finance?.paidAmount || 0), 0),
        status: finance?.status || "pending",
        dueDate: finance?.dueDate || getDefaultFeeDueDate(),
        academicYear: finance?.academicYear || null,
      };
    });

    res.json(summary);
  } catch (error) {
    console.error("GET STUDENT FEES SUMMARY ERROR:", error);
    res.status(500).json({ message: "Failed to fetch student fees summary" });
  }
});

// ==========================
// 📊 GET STAFF SALARIES SUMMARY
// ==========================
router.get("/:schoolId/staff/summary", async (req, res) => {
  try {
    const [staffMembers, finances] = await Promise.all([
      Staff.find({ schoolId: req.params.schoolId })
        .select("name email position phone department qualification dateOfBirth gender status joinDate")
        .sort({ name: 1 }),
      Finance.find({
        schoolId: req.params.schoolId,
        type: "staff_salary"
      })
        .sort({ createdAt: -1 })
        .populate("staffId", "name email position phone department qualification dateOfBirth gender status joinDate"),
    ]);

    const financeByStaffId = new Map();
    finances
      .filter(finance => finance.staffId)
      .forEach(finance => {
        const staffId = String((finance.staffId && typeof finance.staffId === "object" && "_id" in finance.staffId)
          ? (finance.staffId as { _id: mongoose.Types.ObjectId })._id
          : finance.staffId);

        if (!financeByStaffId.has(staffId)) {
          financeByStaffId.set(staffId, finance);
        }
      });

    const summary = staffMembers.map(staff => {
      const finance = financeByStaffId.get(String(staff._id));

      return {
        financeId: finance?._id || null,
        staff,
        salary: finance?.amount || 0,
        paidAmount: finance?.paidAmount || 0,
        status: finance?.status || "pending",
        paymentDate: finance?.paymentDate || null,
        academicYear: finance?.academicYear || null,
      };
    });

    res.json(summary);
  } catch (error) {
    console.error("GET STAFF SALARIES SUMMARY ERROR:", error);
    res.status(500).json({ message: "Failed to fetch staff salaries summary" });
  }
});

// ==========================
// 💰 GET FINANCE RECORDS FOR A SCHOOL
// ==========================
router.get("/:schoolId", async (req, res) => {
  try {
    const finances = await Finance.find({ schoolId: req.params.schoolId })
      .populate("studentId", "name email class rollNumber phone address dateOfBirth gender")
      .populate("staffId", "name email position phone department qualification dateOfBirth gender status joinDate")
      .sort({ createdAt: -1 });

    res.json(finances);
  } catch (error) {
    console.error("GET FINANCE ERROR:", error);
    res.status(500).json({ message: "Failed to fetch finance records" });
  }
});

// ==========================
// ➕ CREATE FINANCE RECORD
// ==========================
router.post("/", async (req, res) => {
  try {
    const {
      type,
      studentId,
      staffId,
      amount,
      paidAmount,
      dueDate,
      paymentDate,
      status,
      description,
      academicYear,
      category,
      transactionType,
      schoolId
    } = req.body;

    if (!type || !amount || !schoolId) {
      return res.status(400).json({ message: "Required fields: type, amount, schoolId" });
    }

    // Validate type-specific requirements
    if (type === "student_fee" && !studentId) {
      return res.status(400).json({ message: "studentId required for student_fee type" });
    }
    if (type === "staff_salary" && !staffId) {
      return res.status(400).json({ message: "staffId required for staff_salary type" });
    }
    if (type === "other" && (!category || !transactionType)) {
      return res.status(400).json({ message: "category and transactionType required for other type" });
    }

    const finance = await Finance.create({
      type,
      studentId,
      staffId,
      amount,
      paidAmount: paidAmount || 0,
      dueDate,
      paymentDate,
      status: status || "pending",
      description,
      academicYear,
      category,
      transactionType,
      schoolId,
    });

    await createLog({
      action: "CREATE_FINANCE",
      message: `Finance record created: ${type} - $${amount}`,
      schoolId,
    });

    res.status(201).json(finance);
  } catch (error) {
    console.error("CREATE FINANCE ERROR:", error);
    res.status(500).json({ message: "Failed to create finance record" });
  }
});

// ==========================
// ✏️ UPDATE FINANCE RECORD
// ==========================
router.put("/:id", async (req, res) => {
  try {
    const {
      amount,
      paidAmount,
      dueDate,
      paymentDate,
      status,
      description,
      academicYear,
      category,
      transactionType
    } = req.body;

    const finance = await Finance.findByIdAndUpdate(
      req.params.id,
      {
        amount,
        paidAmount,
        dueDate,
        paymentDate,
        status,
        description,
        academicYear,
        category,
        transactionType,
      },
      { new: true }
    ).populate("studentId", "name email class rollNumber phone address dateOfBirth gender")
     .populate("staffId", "name email position phone department qualification dateOfBirth gender status joinDate");

    if (!finance) {
      return res.status(404).json({ message: "Finance record not found" });
    }

    await createLog({
      action: "UPDATE_FINANCE",
      message: `Finance record updated: ${finance.type} - $${amount}`,
      schoolId: finance.schoolId,
    });

    res.json(finance);
  } catch (error) {
    console.error("UPDATE FINANCE ERROR:", error);
    res.status(500).json({ message: "Failed to update finance record" });
  }
});

// ==========================
// 🗑️ DELETE FINANCE RECORD
// ==========================
router.delete("/:id", async (req, res) => {
  try {
    const finance = await Finance.findByIdAndDelete(req.params.id);

    if (!finance) {
      return res.status(404).json({ message: "Finance record not found" });
    }

    await createLog({
      action: "DELETE_FINANCE",
      message: `Finance record deleted: ${finance.type} - $${finance.amount}`,
      schoolId: finance.schoolId,
    });

    res.json({ message: "Finance record deleted successfully" });
  } catch (error) {
    console.error("DELETE FINANCE ERROR:", error);
    res.status(500).json({ message: "Failed to delete finance record" });
  }
});

export default router;
