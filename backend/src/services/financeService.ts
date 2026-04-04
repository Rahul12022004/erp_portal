import mongoose from "mongoose";
import ClassFeeStructure from "../models/ClassFeeStructure";
import StudentFeeAssignment from "../models/StudentFeeAssignment";
import StudentFeePayment from "../models/StudentFeePayment";
import Student from "../models/Student";
import Class from "../models/Class";

type LooseRecord = Record<string, unknown>;
type SaveOptions = { session?: mongoose.ClientSession };
type SaveableRecord = LooseRecord & {
  _id: unknown;
  save: (options?: SaveOptions) => Promise<unknown>;
  toObject?: () => LooseRecord;
};
type StructureFilter = {
  school_id: mongoose.Types.ObjectId;
  class_id: string;
  academic_year: string;
  section_id?: string | null;
};
type StudentQuery = {
  schoolId: mongoose.Types.ObjectId;
  class_id: string;
  status: string;
  section_id?: string | null;
};
type AssignmentQuery = {
  school_id: mongoose.Types.ObjectId;
  class_id?: string;
  section_id?: string;
  academic_year?: string;
};

const asRecord = (value: unknown): LooseRecord | null =>
  value && typeof value === "object" ? (value as LooseRecord) : null;

const asMongoFilter = <T extends LooseRecord>(filter: T) => filter as never;

const asDoc = (value: unknown): SaveableRecord | null => {
  const record = asRecord(value);
  if (!record || typeof record.save !== "function") {
    return null;
  }
  return record as SaveableRecord;
};

const toPlainObject = (value: unknown): LooseRecord => {
  const doc = asDoc(value);
  if (doc?.toObject && typeof doc.toObject === "function") {
    return doc.toObject();
  }
  return asRecord(value) || {};
};

const toNumber = (value: unknown) => Number(value || 0);
const toStringValue = (value: unknown) => String(value || "");
const normalizeText = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const buildClassLabel = (name: string, section?: string | null) =>
  [name.trim(), String(section || "").trim()].filter(Boolean).join(" - ");
const isDuplicateKeyError = (error: unknown) => {
  const record = error as { code?: unknown } | null;
  return Number(record?.code) === 11000;
};

const generateReceiptNumber = (schoolId: string): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `RCP-${schoolId.slice(-6)}-${timestamp}-${random}`;
};

const isStudentEligibleForTransport = (student: LooseRecord | null | undefined): boolean => {
  if (!student) return false;
  return student.transport_status === "ACTIVE" || !!student.transport_route_id;
};

const calculateFeeStatus = (
  totalFee: number,
  paidAmount: number,
  dueDate?: string | null
): "PAID" | "PARTIAL" | "UNPAID" | "OVERDUE" => {
  const dueAmount = totalFee - paidAmount;

  if (dueAmount <= 0) {
    return "PAID";
  }

  if (dueAmount > 0 && dueDate) {
    const dueDateObj = new Date(dueDate);
    if (!isNaN(dueDateObj.getTime()) && new Date() > dueDateObj) {
      return "OVERDUE";
    }
  }

  if (paidAmount > 0) {
    return "PARTIAL";
  }

  return "UNPAID";
};

export const financeService = {
  async syncAllAssignmentsForSchool(schoolId: string, academicYear?: string) {
    const query: LooseRecord = {
      school_id: new mongoose.Types.ObjectId(schoolId),
      is_active: true,
    };

    if (academicYear) {
      query.academic_year = academicYear;
    }

    const structures = await ClassFeeStructure.find(asMongoFilter(query));
    const results = await Promise.all(
      structures.map(async (structure) => {
        const structureDoc = asDoc(structure);
        if (!structureDoc) return 0;
        const syncResult = await this.syncStudentAssignmentsForStructure(schoolId, structureDoc);
        return syncResult.assignedCount;
      })
    );
    const assignedCount = results.reduce((sum, count) => sum + count, 0);

    return {
      structuresSynced: structures.length,
      assignedCount,
    };
  },

  async getStudentsForStructure(
    schoolId: string,
    classId: string,
    className?: string,
    classSection?: string | null,
    session?: mongoose.ClientSession
  ) {
    const trimmedClassName = String(className || "").trim();
    const trimmedClassSection = String(classSection || "").trim();

    const classLabels = Array.from(
      new Set(
        [
          trimmedClassName,
          buildClassLabel(trimmedClassName, trimmedClassSection),
          [trimmedClassName, trimmedClassSection].filter(Boolean).join(" "),
        ]
          .map((value) => String(value || "").trim())
          .filter(Boolean)
      )
    );

    const orFilters: LooseRecord[] = [];

    if (mongoose.Types.ObjectId.isValid(classId)) {
      orFilters.push({ class_id: new mongoose.Types.ObjectId(classId) });
    }

    if (classLabels.length > 0) {
      orFilters.push({ class: { $in: classLabels } });
    }

    if (trimmedClassName) {
      if (trimmedClassSection) {
        const basePattern = `^${escapeRegex(trimmedClassName)}(?:\\s*[-\\s]\\s*${escapeRegex(trimmedClassSection)})?$`;
        orFilters.push({ class: { $regex: basePattern, $options: "i" } });
      } else {
        orFilters.push({ class: { $regex: `^${escapeRegex(trimmedClassName)}$`, $options: "i" } });
      }
    }

    if (orFilters.length === 0) {
      return [] as LooseRecord[];
    }

    const students = await Student.find(
      asMongoFilter({
        schoolId: new mongoose.Types.ObjectId(schoolId),
        status: "Active",
        $or: orFilters,
      } as never)
    ).session(session ?? null);

    const normalizedClassLabels = new Set(classLabels.map((value) => normalizeText(value)));

    return students
      .map((student) => asRecord(student))
      .filter((record): record is LooseRecord => Boolean(record))
      .filter((record) => {
        const matchesClassId =
          mongoose.Types.ObjectId.isValid(classId) &&
          toStringValue(record.class_id) === classId;
        const matchesClassLabel = normalizedClassLabels.has(normalizeText(record.class));

        return matchesClassId || matchesClassLabel;
      });
  },

  async syncStudentAssignmentsForStructure(
    schoolId: string,
    structureInput: SaveableRecord | LooseRecord,
    session?: mongoose.ClientSession
  ) {
    const structure = asDoc(structureInput) || (asRecord(structureInput) as SaveableRecord | null);
    const classId = toStringValue(structure?.class_id);

    let className = "";
    let classSection: string | null = null;

    if (mongoose.Types.ObjectId.isValid(classId)) {
      const classDoc = await Class.findById(classId).session(session ?? null);
      if (classDoc) {
        className = toStringValue(classDoc.name);
        classSection = toStringValue(classDoc.section) || null;
      }
    }

    const students = await this.getStudentsForStructure(
      schoolId,
      classId,
      className,
      classSection,
      session
    );

    await Promise.all(
      students.map((student) =>
        this.createOrUpdateStudentFeeAssignment(
          schoolId,
          toStringValue(student._id),
          toStringValue(structure?._id),
          toStringValue(structure?.academic_year),
          structure,
          student,
          session
        )
      )
    );

    return {
      assignedCount: students.length,
      className,
      classSection,
    };
  },

  /**
   * Create or update class fee structure and auto-assign to students
   */
  async saveClassFeeStructure(
    schoolId: string,
    data: {
      class_id: string;
      section_id?: string | null;
      academic_year: string;
      academic_fee: number;
      default_transport_fee: number;
      other_fee?: number;
      fee_breakdown?: Array<{ label: string; amount: number }>;
      due_date: string;
      created_by?: string;
    }
  ) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find or create class fee structure
      const filter: StructureFilter = {
        school_id: new mongoose.Types.ObjectId(schoolId),
        class_id: data.class_id,
        academic_year: data.academic_year,
      };
      if (data.section_id) {
        filter.section_id = data.section_id;
      } else {
        filter.section_id = null;
      }

      let structure = asDoc(
        await ClassFeeStructure.findOne(asMongoFilter(filter)).session(session)
      );

      if (structure) {
        // Update existing
        structure.academic_fee = data.academic_fee;
        structure.default_transport_fee = data.default_transport_fee;
        structure.other_fee = data.other_fee || 0;
        structure.fee_breakdown = data.fee_breakdown || [];
        structure.due_date = data.due_date;
        structure.is_active = true;
        if (data.created_by) {
          structure.created_by = new mongoose.Types.ObjectId(data.created_by);
        }
        await structure.save({ session });
      } else {
        // Create new
        const newStructure = new ClassFeeStructure({
          school_id: new mongoose.Types.ObjectId(schoolId),
          class_id: data.class_id,
          section_id: data.section_id || null,
          academic_year: data.academic_year,
          academic_fee: data.academic_fee,
          default_transport_fee: data.default_transport_fee,
          other_fee: data.other_fee || 0,
          fee_breakdown: data.fee_breakdown || [],
          due_date: data.due_date,
          is_active: true,
          created_by: data.created_by ? new mongoose.Types.ObjectId(data.created_by) : undefined,
        });
        structure = asDoc(await newStructure.save({ session }));
      }

      if (!structure) {
        throw new Error("Failed to persist class fee structure");
      }

      const syncResult = await this.syncStudentAssignmentsForStructure(schoolId, structure, session);

      await session.commitTransaction();

      return {
        structure: toPlainObject(structure),
        assignedCount: syncResult.assignedCount,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  },

  /**
   * Create or update student fee assignment
   */
  async createOrUpdateStudentFeeAssignment(
    schoolId: string,
    studentId: string,
    classFeeStructureId: string,
    academicYear: string,
    structure?: SaveableRecord | null,
    student?: LooseRecord | null,
    session?: mongoose.ClientSession
  ) {
    // Fetch structure if not provided
    if (!structure) {
      structure = asDoc(
        await ClassFeeStructure.findById(classFeeStructureId).session(session ?? null)
      );
    }
    if (!structure) {
      throw new Error("Class fee structure not found");
    }

    // Fetch student if not provided
    if (!student) {
      student = asRecord(await Student.findById(studentId).session(session ?? null));
    }
    if (!student) {
      throw new Error("Student not found");
    }

    // Check for existing assignment
    let assignment = asDoc(await StudentFeeAssignment.findOne(
      asMongoFilter({
        school_id: new mongoose.Types.ObjectId(schoolId),
        student_id: new mongoose.Types.ObjectId(studentId),
        class_fee_structure_id: new mongoose.Types.ObjectId(classFeeStructureId),
        academic_year: academicYear,
      })
    ).session(session ?? null));

    // Calculate fees
    const academicFee = toNumber(structure.academic_fee);
    const otherFee = toNumber(structure.other_fee);

    // Transport fee only if student is eligible
    let transportFee = 0;
    if (isStudentEligibleForTransport(student)) {
      transportFee = toNumber(structure.default_transport_fee);
    }

    const discountAmount = 0;
    const totalFee = academicFee + transportFee + otherFee - discountAmount;
    const paidAmount = assignment ? toNumber(assignment.paid_amount) : 0;
    const dueAmount = Math.max(totalFee - paidAmount, 0);

    const feeStatus = calculateFeeStatus(totalFee, paidAmount, toStringValue(structure.due_date));

    if (assignment) {
      assignment.academic_fee = academicFee;
      assignment.transport_fee = transportFee;
      assignment.other_fee = otherFee;
      assignment.total_fee = totalFee;
      assignment.due_amount = dueAmount;
      assignment.fee_status = feeStatus;
      assignment.due_date = toStringValue(structure.due_date);
      await assignment.save({ session });
    } else {
      try {
        const newAssignment = new StudentFeeAssignment({
          school_id: new mongoose.Types.ObjectId(schoolId),
          student_id: new mongoose.Types.ObjectId(studentId),
          class_fee_structure_id: new mongoose.Types.ObjectId(classFeeStructureId),
          academic_year: academicYear,
          academic_fee: academicFee,
          transport_fee: transportFee,
          other_fee: otherFee,
          discount_amount: discountAmount,
          total_fee: totalFee,
          paid_amount: 0,
          due_amount: dueAmount,
          fee_status: "UNPAID" as const,
          due_date: toStringValue(structure.due_date),
          last_payment_date: null,
        });
        assignment = asDoc(await newAssignment.save({ session }));
      } catch (error) {
        if (!isDuplicateKeyError(error)) {
          throw error;
        }

        // Another concurrent sync created it first; load and refresh values.
        assignment = asDoc(
          await StudentFeeAssignment.findOne(
            asMongoFilter({
              school_id: new mongoose.Types.ObjectId(schoolId),
              student_id: new mongoose.Types.ObjectId(studentId),
              class_fee_structure_id: new mongoose.Types.ObjectId(classFeeStructureId),
              academic_year: academicYear,
            })
          ).session(session ?? null)
        );

        if (!assignment) {
          throw error;
        }

        assignment.academic_fee = academicFee;
        assignment.transport_fee = transportFee;
        assignment.other_fee = otherFee;
        assignment.total_fee = totalFee;
        assignment.due_amount = Math.max(totalFee - toNumber(assignment.paid_amount), 0);
        assignment.fee_status = calculateFeeStatus(
          totalFee,
          toNumber(assignment.paid_amount),
          toStringValue(structure.due_date)
        );
        assignment.due_date = toStringValue(structure.due_date);
        await assignment.save({ session });
      }
    }

    return toPlainObject(assignment);
  },

  /**
   * Record a student payment
   */
  async recordPayment(
    schoolId: string,
    studentFeeAssignmentId: string,
    paymentData: {
      payment_date: string;
      payment_amount: number;
      payment_mode: string;
      reference_no?: string;
      remarks?: string;
      created_by?: string;
    }
  ) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Fetch assignment
      const assignment = asDoc(
        await StudentFeeAssignment.findById(studentFeeAssignmentId)
          .populate("class_fee_structure_id")
          .populate("student_id", "transport_status transport_route_id")
          .session(session)
      );
      if (!assignment) {
        throw new Error("Fee assignment not found");
      }

      const structure = asRecord(assignment.class_fee_structure_id);
      const student = asRecord(assignment.student_id);

      if (structure) {
        const recalculatedAcademicFee = toNumber(structure.academic_fee);
        const recalculatedTransportFee = isStudentEligibleForTransport(student)
          ? toNumber(structure.default_transport_fee)
          : 0;
        const recalculatedOtherFee = toNumber(structure.other_fee);
        const recalculatedDiscount = toNumber(assignment.discount_amount);
        const recalculatedTotalFee = Math.max(
          recalculatedAcademicFee + recalculatedTransportFee + recalculatedOtherFee - recalculatedDiscount,
          0
        );
        const recalculatedPaidAmount = toNumber(assignment.paid_amount);
        const recalculatedDueAmount = Math.max(recalculatedTotalFee - recalculatedPaidAmount, 0);

        assignment.academic_fee = recalculatedAcademicFee;
        assignment.transport_fee = recalculatedTransportFee;
        assignment.other_fee = recalculatedOtherFee;
        assignment.total_fee = recalculatedTotalFee;
        assignment.due_amount = recalculatedDueAmount;
        assignment.fee_status = calculateFeeStatus(
          recalculatedTotalFee,
          recalculatedPaidAmount,
          toStringValue(assignment.due_date)
        );
      }

      // Validate payment amount
      const dueAmount = toNumber(assignment.due_amount);
      if (paymentData.payment_amount <= 0) {
        throw new Error("Payment amount must be greater than 0");
      }
      if (paymentData.payment_amount > dueAmount) {
        throw new Error(`Payment cannot exceed due amount of ${dueAmount}`);
      }

      // Create payment record
      const receiptNo = generateReceiptNumber(schoolId);
      const studentIdRef = asRecord(assignment.student_id)?._id || assignment.student_id;
      const newPayment = new StudentFeePayment({
        school_id: new mongoose.Types.ObjectId(schoolId),
        student_fee_assignment_id: new mongoose.Types.ObjectId(studentFeeAssignmentId),
        student_id: studentIdRef,
        payment_date: paymentData.payment_date,
        payment_amount: paymentData.payment_amount,
        payment_mode: paymentData.payment_mode || "cash",
        reference_no: paymentData.reference_no || "",
        remarks: paymentData.remarks || "",
        receipt_no: receiptNo,
        created_by: paymentData.created_by ? new mongoose.Types.ObjectId(paymentData.created_by) : undefined,
      });
      const payment = await newPayment.save({ session });

      // Update assignment - increment paid amount and recalculate
      const newPaidAmount = toNumber(assignment.paid_amount) + paymentData.payment_amount;
      const newDueAmount = Math.max(toNumber(assignment.total_fee) - newPaidAmount, 0);
      const newFeeStatus = calculateFeeStatus(toNumber(assignment.total_fee), newPaidAmount, toStringValue(assignment.due_date));

      assignment.paid_amount = newPaidAmount;
      assignment.due_amount = newDueAmount;
      assignment.fee_status = newFeeStatus;
      assignment.last_payment_date = paymentData.payment_date;
      await assignment.save({ session });

      await session.commitTransaction();

      return {
        payment: toPlainObject(payment),
        assignment: toPlainObject(assignment),
        receipt_no: receiptNo,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  },

  /**
   * Get student fee assignments for a class
   */
  async getStudentFeeAssignments(
    schoolId: string,
    filters: {
      class_id?: string;
      section_id?: string;
      academic_year?: string;
      search?: string;
    }
  ) {
    const query: AssignmentQuery = { school_id: new mongoose.Types.ObjectId(schoolId) };

    if (filters.class_id) {
      query.class_id = filters.class_id;
    }
    if (filters.section_id) {
      query.section_id = filters.section_id;
    }
    if (filters.academic_year) {
      query.academic_year = filters.academic_year;
    }

    let assignments = await StudentFeeAssignment.find(asMongoFilter(query))
      .populate("student_id", "name class class_id roll_no registration_no section_id transport_status")
      .populate("class_fee_structure_id");

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      assignments = assignments.filter((assignment) => {
        const student = asRecord(assignment.student_id);
        return (
          toStringValue(student?.name).toLowerCase().includes(searchLower) ||
          toStringValue(student?.roll_no).toLowerCase().includes(searchLower) ||
          toStringValue(student?.registration_no).toLowerCase().includes(searchLower)
        );
      });
    }

    return assignments;
  },

  /**
   * Get payment history for a student
   */
  async getStudentPaymentHistory(schoolId: string, studentId: string) {
    const payments = await StudentFeePayment.find(asMongoFilter({
      school_id: new mongoose.Types.ObjectId(schoolId),
      student_id: new mongoose.Types.ObjectId(studentId),
    })).sort({ payment_date: -1 });

    return payments;
  },

  /**
   * Update student transport status and recalculate fees
   */
  async updateStudentTransportStatus(
    schoolId: string,
    studentId: string,
    newTransportStatus: string
  ) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Update student
      const student = await Student.findByIdAndUpdate(
        studentId,
        { transport_status: newTransportStatus },
        { new: true, session }
      );

      if (!student) {
        throw new Error("Student not found");
      }

      // Find all active fee assignments for this student
      const assignments = await StudentFeeAssignment.find(asMongoFilter({
        school_id: new mongoose.Types.ObjectId(schoolId),
        student_id: new mongoose.Types.ObjectId(studentId),
        fee_status: { $ne: "PAID" }, // Only update unpaid/partial
      })).session(session);

      // Recalculate transport fee for each assignment
      for (const assignment of assignments) {
        const assignmentRecord = asRecord(assignment) || {};
        const structure = asRecord(
          await ClassFeeStructure.findById(assignmentRecord.class_fee_structure_id).session(session)
        );

        const isEligible = isStudentEligibleForTransport(asRecord(student));
        const newTransportFee = isEligible ? toNumber(structure?.default_transport_fee) : 0;
        const oldTransportFee = toNumber(assignmentRecord.transport_fee);

        if (newTransportFee !== oldTransportFee) {
          const transportFeeDelta = newTransportFee - oldTransportFee;
          const newTotalFee = toNumber(assignmentRecord.total_fee) + transportFeeDelta;
          const newDueAmount = Math.max(newTotalFee - toNumber(assignmentRecord.paid_amount), 0);
          const newFeeStatus = calculateFeeStatus(newTotalFee, toNumber(assignmentRecord.paid_amount), toStringValue(assignmentRecord.due_date));

          assignmentRecord.transport_fee = newTransportFee;
          assignmentRecord.total_fee = newTotalFee;
          assignmentRecord.due_amount = newDueAmount;
          assignmentRecord.fee_status = newFeeStatus;
          const assignmentDoc = asDoc(assignment);
          if (assignmentDoc) {
            await assignmentDoc.save({ session });
          }
        }
      }

      await session.commitTransaction();

      return {
        student: toPlainObject(student),
        updatedAssignments: assignments.length,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  },

  /**
   * Get class fee structure with student count info
   */
  async getClassFeeStructuresWithStats(schoolId: string) {
    const structures = await ClassFeeStructure.find(asMongoFilter({
      school_id: new mongoose.Types.ObjectId(schoolId),
    }));

    const stats = await Promise.all(
      structures.map(async (structure) => {
        const assignedCount = await StudentFeeAssignment.countDocuments({
          school_id: new mongoose.Types.ObjectId(schoolId),
          class_fee_structure_id: structure._id,
        } as never);

        const paidCount = await StudentFeeAssignment.countDocuments({
          school_id: new mongoose.Types.ObjectId(schoolId),
          class_fee_structure_id: structure._id,
          fee_status: "PAID",
        } as never);

        const pendingCount = await StudentFeeAssignment.countDocuments({
          school_id: new mongoose.Types.ObjectId(schoolId),
          class_fee_structure_id: structure._id,
          fee_status: { $in: ["UNPAID", "PARTIAL", "OVERDUE"] },
        } as never);

        return {
          ...toPlainObject(structure),
          assignedCount,
          paidCount,
          pendingCount,
        };
      })
    );

    return stats;
  },
};
