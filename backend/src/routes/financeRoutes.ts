import express from "express";
import Finance from "../models/Finance";
import School from "../models/School";
import Student from "../models/Student";
import Staff from "../models/Staff";
import mongoose from "mongoose";
import { createLog } from "../utils/createLog";
import { sendStudentFeeReceiptEmail } from "../utils/sendEmail";
import {
  buildAppliedStudentFeeStructure,
  findClassFeeStructure,
  normalizeClassFeeStructure,
} from "../utils/classFeeStructure";

const router = express.Router();

const buildDefaultFeeComponents = (amount: number) => [
  { label: "Tuition Fee", amount },
];

const normalizeFeeComponents = (amount: number, feeComponents: unknown) => {
  if (!Array.isArray(feeComponents) || feeComponents.length === 0) {
    return amount > 0 ? buildDefaultFeeComponents(amount) : [];
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

  if (normalized.length > 0) {
    return normalized;
  }

  return amount > 0 ? buildDefaultFeeComponents(amount) : [];
};

const getFeeComponentsTotal = (feeComponents: Array<{ label: string; amount: number }>) =>
  feeComponents.reduce((sum, component) => sum + Number(component.amount || 0), 0);

const getStudentFeeStatus = (amount: number, paidAmount: number) => {
  if (amount > 0 && paidAmount >= amount) return "paid";
  if (paidAmount > 0) return "partial";
  return "pending";
};

const resolveStudentFeeValues = (amount: unknown, feeComponents: unknown) => {
  let normalizedAmount = Number(amount || 0);
  const normalizedFeeComponents = normalizeFeeComponents(normalizedAmount, feeComponents);
  const derivedAmount = getFeeComponentsTotal(normalizedFeeComponents);

  if (derivedAmount > 0) {
    normalizedAmount = derivedAmount;
  }

  return {
    normalizedAmount,
    normalizedFeeComponents,
  };
};

const makeReceiptNumber = () => `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
const makeTransactionId = () => `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

const buildStudentFeeSummary = (
  student: any,
  finance: any,
  fallbackDueDate?: string | null
) => {
  const totalFee = Number(finance?.amount || 0);
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
    status: finance?.status || getStudentFeeStatus(totalFee, paidAmount),
    paymentStatus: finance?.status || getStudentFeeStatus(totalFee, paidAmount),
    dueDate: finance?.dueDate || fallbackDueDate || null,
    academicYear: finance?.academicYear || null,
    feeComponents,
    latestReceipt,
    paymentHistory: Array.isArray(finance?.paymentHistory) ? finance.paymentHistory : [],
  };
};

const applyClassFeeStructureToStudents = async (schoolId: string, classFeeStructure: ReturnType<typeof normalizeClassFeeStructure>) => {
  const students = await Student.find({
    schoolId,
    class: classFeeStructure.className,
  }).select("_id name class needsTransport");

  if (students.length === 0) {
    return;
  }

  const existingFinances = await Finance.find({
    schoolId,
    type: "student_fee",
    studentId: { $in: students.map((student) => student._id) },
  }).select("_id studentId paidAmount paymentHistory paymentDate");

  const financeByStudentId = new Map<string, any>();
  existingFinances.forEach((finance) => {
    financeByStudentId.set(String(finance.studentId), finance);
  });

  const bulkOperations = students.map((student) => {
    const existingFinance = financeByStudentId.get(String(student._id));
    const appliedStudentFee = buildAppliedStudentFeeStructure(
      classFeeStructure,
      Boolean((student as any).needsTransport)
    );
    const paidAmount = Number(existingFinance?.paidAmount || 0);
    const nextStatus = getStudentFeeStatus(appliedStudentFee.totalAmount, paidAmount);
    const basePayload = {
      amount: appliedStudentFee.totalAmount,
      dueDate: classFeeStructure.dueDate || undefined,
      academicYear: classFeeStructure.academicYear || undefined,
      feeComponents: appliedStudentFee.feeComponents,
      description: `Common fee structure for ${classFeeStructure.className}`,
      status: nextStatus,
    };

    if (existingFinance) {
      return {
        updateOne: {
          filter: { _id: existingFinance._id },
          update: basePayload,
        },
      };
    }

    return {
      insertOne: {
        document: {
          type: "student_fee",
          studentId: student._id,
          paidAmount: 0,
          paymentHistory: [],
          schoolId,
          ...basePayload,
        },
      },
    };
  });

  if (bulkOperations.length > 0) {
    await Finance.bulkWrite(bulkOperations);
  }
};

router.get("/:schoolId/class-fee-structures", async (req, res) => {
  try {
    const school = await School.findById(req.params.schoolId).select("feeStructures");
    res.json(Array.isArray((school as any)?.feeStructures) ? (school as any).feeStructures : []);
  } catch (error) {
    console.error("GET CLASS FEE STRUCTURES ERROR:", error);
    res.status(500).json({ message: "Failed to fetch class fee structures" });
  }
});

router.put("/:schoolId/class-fee-structures", async (req, res) => {
  try {
    const school = await School.findById(req.params.schoolId);

    if (!school) {
      return res.status(404).json({ message: "School not found" });
    }

    const normalizedStructure = normalizeClassFeeStructure(req.body);

    if (!normalizedStructure.className) {
      return res.status(400).json({ message: "Class is required" });
    }

    if (normalizedStructure.amount <= 0 && normalizedStructure.transportFee <= 0) {
      return res.status(400).json({ message: "Enter a valid fee amount" });
    }

    const existingStructures = Array.isArray((school as any).feeStructures) ? (school as any).feeStructures : [];
    const nextStructures = existingStructures.filter(
      (item: any) => String(item?.className || "").trim() !== normalizedStructure.className
    );

    nextStructures.push({
      className: normalizedStructure.className,
      amount: normalizedStructure.amount,
      transportFee: normalizedStructure.transportFee,
      academicYear: normalizedStructure.academicYear,
      dueDate: normalizedStructure.dueDate,
      feeComponents: normalizedStructure.feeComponents,
    });

    (school as any).feeStructures = nextStructures;
    await school.save();

    await applyClassFeeStructureToStudents(req.params.schoolId, normalizedStructure);

    await createLog({
      action: "UPDATE_CLASS_FEE_STRUCTURE",
      message: `Common fee structure saved for ${normalizedStructure.className}`,
      schoolId: school._id,
    });

    res.json(Array.isArray((school as any).feeStructures) ? (school as any).feeStructures : []);
  } catch (error) {
    console.error("UPDATE CLASS FEE STRUCTURES ERROR:", error);
    res.status(500).json({ message: "Failed to save class fee structure" });
  }
});


// ==========================
// � GET STUDENT FEES SUMMARY
// ==========================
router.get("/:schoolId/students/summary", async (req, res) => {
  try {
    const [students, finances, school] = await Promise.all([
      Student.find({ schoolId: req.params.schoolId })
        .select("name email class rollNumber phone address dateOfBirth gender needsTransport")
        .sort({ name: 1 }),
      Finance.find({
        schoolId: req.params.schoolId,
        type: "student_fee"
      })
        .sort({ createdAt: -1 })
        .populate("studentId", "name email class rollNumber phone address dateOfBirth gender needsTransport"),
      School.findById(req.params.schoolId).select("feeStructures"),
    ]);

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
      const classFeeStructure = findClassFeeStructure(school, String(student.class || ""));
      const normalizedClassFeeStructure = classFeeStructure
        ? normalizeClassFeeStructure(classFeeStructure)
        : null;
      const appliedStudentFee = normalizedClassFeeStructure
        ? buildAppliedStudentFeeStructure(normalizedClassFeeStructure, Boolean((student as any).needsTransport))
        : null;

      return buildStudentFeeSummary(
        student,
        finance?.toObject?.() || (
          normalizedClassFeeStructure && appliedStudentFee
            ? {
                amount: appliedStudentFee.totalAmount,
                dueDate: normalizedClassFeeStructure.dueDate || null,
                academicYear: normalizedClassFeeStructure.academicYear || null,
                feeComponents: appliedStudentFee.feeComponents,
                status: "pending",
                paidAmount: 0,
                paymentHistory: [],
              }
            : null
        ),
        finance?.dueDate || normalizedClassFeeStructure?.dueDate || null
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
    const [student, finance, school] = await Promise.all([
      Student.findOne({ _id: req.params.studentId, schoolId: req.params.schoolId })
        .select("name email class rollNumber phone address dateOfBirth gender needsTransport"),
      Finance.findOne({
        schoolId: req.params.schoolId,
        type: "student_fee",
        studentId: req.params.studentId,
      })
        .populate("studentId", "name email class rollNumber phone address dateOfBirth gender needsTransport")
        .sort({ createdAt: -1 }),
      School.findById(req.params.schoolId).select("feeStructures"),
    ]);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const classFeeStructure = findClassFeeStructure(school, String((student as any).class || ""));
    const normalizedClassFeeStructure = classFeeStructure
      ? normalizeClassFeeStructure(classFeeStructure)
      : null;
    const appliedStudentFee = normalizedClassFeeStructure
      ? buildAppliedStudentFeeStructure(normalizedClassFeeStructure, Boolean((student as any).needsTransport))
      : null;

    const summary = buildStudentFeeSummary(
      student,
      (finance as any)?.toObject?.() || (
        normalizedClassFeeStructure && appliedStudentFee
          ? {
              amount: appliedStudentFee.totalAmount,
              dueDate: normalizedClassFeeStructure.dueDate || null,
              academicYear: normalizedClassFeeStructure.academicYear || null,
              feeComponents: appliedStudentFee.feeComponents,
              status: "pending",
              paidAmount: 0,
              paymentHistory: [],
            }
          : null
      ),
      (finance as any)?.dueDate || normalizedClassFeeStructure?.dueDate || null
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
      paymentType: requestedPaymentType,
    } = req.body;

    if (!type || !schoolId) {
      return res.status(400).json({ message: "Required fields: type, schoolId" });
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
    let normalizedAmount = Number(amount || 0);
    let normalizedPaidAmount = Number(paidAmount || 0);
    const paymentDate = String(requestedPaymentDate || new Date().toISOString().split("T")[0]);
    const paymentType = String(requestedPaymentType || "cash").toLowerCase();
    let normalizedFeeComponents = type === "student_fee"
      ? normalizeFeeComponents(normalizedAmount, feeComponents)
      : [];
    let normalizedDueDate = dueDate;

    if (type === "student_fee") {
      const student = await Student.findById(studentId).select("name");
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      const resolvedValues = resolveStudentFeeValues(normalizedAmount, feeComponents);
      normalizedAmount = resolvedValues.normalizedAmount;
      normalizedFeeComponents = resolvedValues.normalizedFeeComponents;
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
                paymentType,
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
      paymentType: requestedPaymentType,
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
    const nextPaymentType = String(requestedPaymentType || "cash").toLowerCase();
    let resolvedNextAmount = nextAmount;
    let resolvedDueDate = dueDate;
    let nextFeeComponents = existingFinance.type === "student_fee"
      ? normalizeFeeComponents(nextAmount, feeComponents ?? existingFinance.feeComponents)
      : existingFinance.feeComponents || [];

    if (existingFinance.type === "student_fee" && existingFinance.studentId) {
      const resolvedValues = resolveStudentFeeValues(nextAmount, feeComponents ?? existingFinance.feeComponents);
      resolvedNextAmount = resolvedValues.normalizedAmount;
      nextFeeComponents = resolvedValues.normalizedFeeComponents;
      resolvedDueDate = dueDate ?? existingFinance.dueDate;
    }
    const nextPaymentHistory = Array.isArray(existingFinance.paymentHistory)
      ? existingFinance.paymentHistory.map((item: any) => ({
          receiptNumber: item.receiptNumber,
          transactionId: item.transactionId,
          paymentDate: item.paymentDate,
          amountPaid: Number(item.amountPaid || 0),
          paymentType: String(item.paymentType || "cash"),
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
        paymentType: nextPaymentType,
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
      paymentType: receipt.paymentType || "cash",
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
