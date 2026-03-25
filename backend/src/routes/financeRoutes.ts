import express from "express";
import Finance from "../models/Finance";
import Student from "../models/Student";
import Staff from "../models/Staff";
import mongoose from "mongoose";
import { createLog } from "../utils/createLog";
import { sendStudentFeeReceiptEmail } from "../utils/sendEmail";
import {
  buildAnnualFeeComponents,
  buildFeeStructureDocument,
  DEFAULT_ACADEMIC_YEAR,
  getCurrentDueDateForClass,
  getFeeStructureGroupForClass,
} from "../utils/feeStructure";

const router = express.Router();
const DEFAULT_STUDENT_FEE_AMOUNT = 10000;

const buildDefaultFeeComponents = (amount: number) => [
  { label: "Tuition Fee", amount },
];

const normalizeFeeComponents = (amount: number, feeComponents: unknown) => {
  if (!Array.isArray(feeComponents) || feeComponents.length === 0) {
    return buildDefaultFeeComponents(amount);
  }

  const normalized = feeComponents
    .map((component) => {
      const label = String((component as { label?: unknown })?.label || "").trim();
      const componentAmount = Number((component as { amount?: unknown })?.amount || 0);
      if (!label || componentAmount <= 0) {
        return null;
      }
      return { label, amount: componentAmount };
    })
    .filter(Boolean) as Array<{ label: string; amount: number }>;

  return normalized.length > 0 ? normalized : buildDefaultFeeComponents(amount);
};

const makeReceiptNumber = () => `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
const makeTransactionId = () => `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

const buildStudentFeeSummary = (
  student: any,
  finance: any,
  fallbackDueDate: string
) => {
  const totalFee = Number(finance?.amount || DEFAULT_STUDENT_FEE_AMOUNT);
  const paidAmount = Number(finance?.paidAmount || 0);
  const pendingBalance = Math.max(totalFee - paidAmount, 0);
  const feeComponents = normalizeFeeComponents(totalFee, finance?.feeComponents);
  const latestReceipt = Array.isArray(finance?.paymentHistory) && finance.paymentHistory.length > 0
    ? finance.paymentHistory[finance.paymentHistory.length - 1]
    : null;

  return {
    financeId: finance?._id || null,
    student,
    totalFee,
    paidAmount,
    remainingAmount: pendingBalance,
    pendingBalance,
    status: finance?.status || "pending",
    paymentStatus: finance?.status || "pending",
    dueDate: finance?.dueDate || fallbackDueDate,
    academicYear: finance?.academicYear || null,
    feeComponents,
    latestReceipt,
    paymentHistory: Array.isArray(finance?.paymentHistory) ? finance.paymentHistory : [],
  };
};

const getDefaultFeeDueDate = () => {
  const now = new Date();
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return lastDayOfMonth.toISOString().split("T")[0];
};

router.get("/:schoolId/fee-structure", async (req, res) => {
  try {
    const academicYear = String(req.query.academicYear || DEFAULT_ACADEMIC_YEAR);
    res.json(buildFeeStructureDocument(academicYear));
  } catch (error) {
    console.error("GET FEE STRUCTURE ERROR:", error);
    res.status(500).json({ message: "Failed to fetch fee structure" });
  }
});

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
      .map(student => {
        const group = getFeeStructureGroupForClass(String(student.class || ""));

        return {
          type: "student_fee" as const,
          studentId: student._id,
          amount: group.annualFee,
          paidAmount: 0,
          dueDate: getCurrentDueDateForClass(String(student.class || ""), 0),
          status: "pending" as const,
          description: `Default fee record for ${student.name}`,
          feeComponents: buildAnnualFeeComponents(String(student.class || "")),
          schoolId: req.params.schoolId,
        };
      });

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
      const feeGroup = getFeeStructureGroupForClass(String(student.class || ""));
      const totalFee = feeGroup.annualFee;
      const paidAmount = Number(finance?.paidAmount || 0);
      const dueDate = getCurrentDueDateForClass(String(student.class || ""), paidAmount);
      const computedStatus = paidAmount >= totalFee ? "paid" : paidAmount > 0 ? "partial" : "pending";

      return buildStudentFeeSummary(
        student,
        {
          ...finance?.toObject?.(),
          amount: totalFee,
          dueDate,
          feeComponents: buildAnnualFeeComponents(String(student.class || "")),
          status: computedStatus,
        },
        dueDate || getDefaultFeeDueDate()
      );
    });

    res.json(summary);
  } catch (error) {
    console.error("GET STUDENT FEES SUMMARY ERROR:", error);
    res.status(500).json({ message: "Failed to fetch student fees summary" });
  }
});

router.get("/:schoolId/students/:studentId/receipt-summary", async (req, res) => {
  try {
    const [student, finance] = await Promise.all([
      Student.findOne({ _id: req.params.studentId, schoolId: req.params.schoolId })
        .select("name email class rollNumber phone address dateOfBirth gender"),
      Finance.findOne({
        schoolId: req.params.schoolId,
        type: "student_fee",
        studentId: req.params.studentId,
      })
        .populate("studentId", "name email class rollNumber phone address dateOfBirth gender")
        .sort({ createdAt: -1 }),
    ]);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const feeGroup = getFeeStructureGroupForClass(String((student as any).class || ""));
    const totalFee = feeGroup.annualFee;
    const paidAmount = Number((finance as any)?.paidAmount || 0);
    const dueDate = getCurrentDueDateForClass(String((student as any).class || ""), paidAmount);
    const computedStatus = paidAmount >= totalFee ? "paid" : paidAmount > 0 ? "partial" : "pending";

    const summary = buildStudentFeeSummary(
      student,
      {
        ...(finance as any)?.toObject?.(),
        amount: totalFee,
        dueDate,
        feeComponents: buildAnnualFeeComponents(String((student as any).class || "")),
        status: computedStatus,
      },
      dueDate || getDefaultFeeDueDate()
    );
    res.json(summary);
  } catch (error) {
    console.error("GET STUDENT RECEIPT SUMMARY ERROR:", error);
    res.status(500).json({ message: "Failed to fetch fee receipt summary" });
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
      status,
      description,
      academicYear,
      category,
      transactionType,
      schoolId,
      feeComponents,
      paymentDate: requestedPaymentDate,
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
    let normalizedAmount = Number(amount);
    let normalizedPaidAmount = Number(paidAmount || 0);
    const paymentDate = String(requestedPaymentDate || new Date().toISOString().split("T")[0]);
    let normalizedFeeComponents = type === "student_fee"
      ? normalizeFeeComponents(normalizedAmount, feeComponents)
      : [];
    let normalizedDueDate = dueDate;

    if (type === "student_fee") {
      const student = await Student.findById(studentId).select("class name");
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      const feeGroup = getFeeStructureGroupForClass(String((student as any).class || ""));
      normalizedAmount = feeGroup.annualFee;
      normalizedFeeComponents = buildAnnualFeeComponents(String((student as any).class || ""));
      normalizedDueDate = getCurrentDueDateForClass(String((student as any).class || ""), normalizedPaidAmount);
    }

    const finance = await Finance.create({
      type,
      studentId,
      staffId,
      amount: normalizedAmount,
      paidAmount: normalizedPaidAmount,
      dueDate: normalizedDueDate,
      paymentDate,
      status: status || "pending",
      description,
      academicYear,
      category,
      transactionType,
      feeComponents: normalizedFeeComponents,
      paymentHistory:
        type === "student_fee" && normalizedPaidAmount > 0
          ? [
              {
                receiptNumber: makeReceiptNumber(),
                transactionId: makeTransactionId(),
                paymentDate,
                amountPaid: normalizedPaidAmount,
                sentToEmail: false,
              },
            ]
          : [],
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
      status,
      description,
      academicYear,
      category,
      transactionType,
      feeComponents,
      paymentDate: requestedPaymentDate,
    } = req.body;

    const existingFinance = await Finance.findById(req.params.id);

    if (!existingFinance) {
      return res.status(404).json({ message: "Finance record not found" });
    }

    const nextAmount = Number(amount ?? existingFinance.amount ?? 0);
    const nextPaidAmount = Number(paidAmount ?? existingFinance.paidAmount ?? 0);
    const previousPaidAmount = Number(existingFinance.paidAmount || 0);
    const paymentDelta = Math.max(nextPaidAmount - previousPaidAmount, 0);
    const nextPaymentDate = String(
      requestedPaymentDate || existingFinance.paymentDate || new Date().toISOString().split("T")[0]
    );
    let resolvedNextAmount = nextAmount;
    let resolvedDueDate = dueDate;
    let nextFeeComponents = existingFinance.type === "student_fee"
      ? normalizeFeeComponents(nextAmount, feeComponents ?? existingFinance.feeComponents)
      : existingFinance.feeComponents || [];

    if (existingFinance.type === "student_fee" && existingFinance.studentId) {
      const student = await Student.findById(existingFinance.studentId).select("class");
      const feeGroup = getFeeStructureGroupForClass(String((student as any)?.class || ""));
      resolvedNextAmount = feeGroup.annualFee;
      nextFeeComponents = buildAnnualFeeComponents(String((student as any)?.class || ""));
      resolvedDueDate = getCurrentDueDateForClass(String((student as any)?.class || ""), nextPaidAmount);
    }
    const nextPaymentHistory = Array.isArray(existingFinance.paymentHistory)
      ? existingFinance.paymentHistory.map((item: any) => ({
          receiptNumber: item.receiptNumber,
          transactionId: item.transactionId,
          paymentDate: item.paymentDate,
          amountPaid: Number(item.amountPaid || 0),
          sentToEmail: Boolean(item.sentToEmail),
          createdAt: item.createdAt,
        }))
      : [];

    if (existingFinance.type === "student_fee" && paymentDelta > 0) {
      nextPaymentHistory.push({
        receiptNumber: makeReceiptNumber(),
        transactionId: makeTransactionId(),
        paymentDate: nextPaymentDate,
        amountPaid: paymentDelta,
        sentToEmail: false,
        createdAt: new Date().toISOString(),
      });
    }

    const finance = await Finance.findByIdAndUpdate(
      req.params.id,
      {
        amount: resolvedNextAmount,
        paidAmount: nextPaidAmount,
        dueDate: resolvedDueDate,
        paymentDate: nextPaymentDate,
        status,
        description,
        academicYear,
        category,
        transactionType,
        feeComponents: nextFeeComponents,
        paymentHistory: nextPaymentHistory,
      },
      { new: true }
    ).populate("studentId", "name email class rollNumber phone address dateOfBirth gender")
     .populate("staffId", "name email position phone department qualification dateOfBirth gender status joinDate");

    if (!finance) {
      return res.status(404).json({ message: "Finance record not found" });
    }

    await createLog({
      action: "UPDATE_FINANCE",
      message: `Finance record updated: ${finance.type} - $${resolvedNextAmount}`,
      schoolId: finance.schoolId,
    });

    res.json(finance);
  } catch (error) {
    console.error("UPDATE FINANCE ERROR:", error);
    res.status(500).json({ message: "Failed to update finance record" });
  }
});

router.post("/:id/send-receipt", async (req, res) => {
  try {
    const { receiptNumber } = req.body || {};

    const finance = await Finance.findById(req.params.id)
      .populate("studentId", "name email class")
      .populate("schoolId", "name");

    if (!finance || finance.type !== "student_fee" || !finance.studentId) {
      return res.status(404).json({ message: "Student fee record not found" });
    }

    const paymentHistory = Array.isArray(finance.paymentHistory) ? finance.paymentHistory : [];
    const receipt = receiptNumber
      ? paymentHistory.find((item: any) => item.receiptNumber === receiptNumber)
      : paymentHistory[paymentHistory.length - 1];

    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found for this fee record" });
    }

    const student = finance.studentId as any;
    if (!student.email) {
      return res.status(400).json({ message: "Student email not available" });
    }

    const totalFee = Number(finance.amount || 0);
    const paidAmount = Number(finance.paidAmount || 0);
    const pendingBalance = Math.max(totalFee - paidAmount, 0);

    await sendStudentFeeReceiptEmail({
      studentName: student.name,
      studentEmail: student.email,
      className: student.class,
      schoolName: (finance.schoolId as any)?.name || "School",
      paymentDate: receipt.paymentDate,
      transactionId: receipt.transactionId,
      amountPaid: Number(receipt.amountPaid || 0),
      receiptNumber: receipt.receiptNumber,
      totalFee,
      paidAmount,
      pendingBalance,
      dueDate: finance.dueDate || null,
      paymentStatus: String(finance.status || "pending"),
      feeComponents: normalizeFeeComponents(totalFee, finance.feeComponents),
    });

    const updatedPaymentHistory = paymentHistory.map((item: any) => ({
      ...item,
      sentToEmail:
        item.receiptNumber === receipt.receiptNumber ? true : Boolean(item.sentToEmail),
    }));

    await Finance.findByIdAndUpdate(req.params.id, {
      paymentHistory: updatedPaymentHistory,
    });

    res.json({ success: true, message: `Receipt sent to ${student.email}` });
  } catch (error) {
    console.error("SEND FEE RECEIPT ERROR:", error);
    const message = error instanceof Error ? error.message : "Failed to send fee receipt";
    res.status(500).json({ message });
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
