import Finance from "../models/Finance";
import School from "../../school/models/School";
import Student from "../../students/models/Student";

type StudentFeeSyncArgs = {
  studentId: string;
  schoolId: string;
  transportActiveOverride?: boolean;
};

type FeeComponent = {
  label: string;
  amount: number;
};

type ClassFeeStructureTemplate = {
  className?: string;
  amount?: number;
  transportFee?: number;
  academicYear?: string;
  dueDate?: string;
  feeComponents?: FeeComponent[];
};

type StudentFeeSyncResult = {
  created: boolean;
  financeId: string | null;
  studentId: string;
  schoolId: string;
  academicFee: number;
  transportFee: number;
  totalFee: number;
  paidAmount: number;
  dueAmount: number;
  dueDate: string;
  academicYear: string;
  status: string;
  transportActive: boolean;
};

const normalizeText = (value: unknown) => String(value ?? "").trim();

const normalizeNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeClassKey = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const todayDateInput = () => new Date().toISOString().split("T")[0];

const getLatestFeeStructureForClass = (
  feeStructures: unknown,
  className: string,
  academicYear?: string | null
) => {
  const normalizedClassKey = normalizeClassKey(className);
  const structures = Array.isArray(feeStructures)
    ? (feeStructures as ClassFeeStructureTemplate[])
    : [];

  const matchingStructures = structures.filter((structure) => {
    const structureClassKey = normalizeClassKey(String(structure?.className || ""));
    if (structureClassKey !== normalizedClassKey) {
      return false;
    }

    if (!academicYear) {
      return true;
    }

    return normalizeText(structure?.academicYear) === normalizeText(academicYear);
  });

  return matchingStructures.length > 0
    ? matchingStructures[matchingStructures.length - 1]
    : null;
};

const buildFeeComponents = (academicFee: number, transportFee: number): FeeComponent[] => {
  const components: FeeComponent[] = [];

  if (academicFee > 0) {
    components.push({ label: "Academic Fee", amount: academicFee });
  }

  if (transportFee > 0) {
    components.push({ label: "Transport Fee", amount: transportFee });
  }

  return components;
};

const getComponentAmountByLabel = (feeComponents: unknown, labelMatcher: RegExp) => {
  if (!Array.isArray(feeComponents)) {
    return 0;
  }

  return (feeComponents as Array<{ label?: string; amount?: number }>).reduce((sum, component) => {
    if (labelMatcher.test(String(component?.label || ""))) {
      return sum + normalizeNumber(component?.amount);
    }

    return sum;
  }, 0);
};

const getLatestPaymentDate = (paymentHistory: unknown) => {
  if (!Array.isArray(paymentHistory) || paymentHistory.length === 0) {
    return null;
  }

  const lastItem = paymentHistory[paymentHistory.length - 1] as { paymentDate?: string };
  return normalizeText(lastItem?.paymentDate) || null;
};

const getFeeStatus = (totalFee: number, paidAmount: number, dueDate?: string | null) => {
  const dueAmount = Math.max(totalFee - paidAmount, 0);

  if (dueAmount <= 0) {
    return "paid";
  }

  if (paidAmount > 0) {
    return "partial";
  }

  if (dueDate) {
    const dueTime = new Date(dueDate).getTime();
    if (Number.isFinite(dueTime) && dueTime < Date.now()) {
      return "overdue";
    }
  }

  return "pending";
};

const buildNormalizedFeeStructure = (
  school: Record<string, unknown> | null,
  student: Record<string, unknown>,
  existingFinance: Record<string, unknown> | null,
  transportActive: boolean
) => {
  const latestStructure = getLatestFeeStructureForClass(
    school?.feeStructures,
    String(student.class || ""),
    normalizeText(student.academicYear) || normalizeText(existingFinance?.academicYear) || null
  );

  const existingFeeComponents = Array.isArray(existingFinance?.feeComponents)
    ? existingFinance.feeComponents
    : [];

  const academicFee = latestStructure
    ? normalizeNumber(latestStructure.amount)
    : Math.max(
        normalizeNumber(existingFinance?.amount) -
          getComponentAmountByLabel(existingFeeComponents, /transport/i),
        0
      );

  const templateTransportFee = latestStructure
    ? normalizeNumber(latestStructure.transportFee)
    : getComponentAmountByLabel(existingFeeComponents, /transport/i);

  const transportFee = transportActive ? templateTransportFee : 0;
  const feeComponents = buildFeeComponents(academicFee, transportFee);
  const totalFee = feeComponents.reduce((sum, component) => sum + component.amount, 0);
  const paidAmount = normalizeNumber(existingFinance?.paidAmount);
  const dueAmount = Math.max(totalFee - paidAmount, 0);
  const dueDate =
    normalizeText(latestStructure?.dueDate) ||
    normalizeText(existingFinance?.dueDate) ||
    todayDateInput();
  const academicYear =
    normalizeText(latestStructure?.academicYear) ||
    normalizeText(student.academicYear) ||
    normalizeText(existingFinance?.academicYear) ||
    "";
  const status = getFeeStatus(totalFee, paidAmount, dueDate);
  const paymentDate =
    getLatestPaymentDate(existingFinance?.paymentHistory) ||
    normalizeText(existingFinance?.paymentDate) ||
    (paidAmount > 0 ? todayDateInput() : "");

  return {
    academicFee,
    transportFee,
    feeComponents,
    totalFee,
    paidAmount,
    dueAmount,
    dueDate,
    academicYear,
    status,
    paymentDate,
  };
};

const asRecord = (value: unknown) =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : null;

export async function syncLegacyStudentFeeRecord({
  studentId,
  schoolId,
  transportActiveOverride,
}: StudentFeeSyncArgs): Promise<StudentFeeSyncResult | null> {
  const [student, school, existingFinance] = await Promise.all([
    Student.findOne({ _id: studentId, schoolId }).select(
      "name class academicYear needsTransport schoolId"
    ).lean(),
    School.findById(schoolId).select("feeStructures").lean(),
    Finance.findOne({
      schoolId,
      type: "student_fee",
      studentId,
    }).sort({ createdAt: -1 }).lean(),
  ]);

  const studentRecord = asRecord(student);
  const schoolRecord = asRecord(school);
  const existingFinanceRecord = asRecord(existingFinance);

  if (!studentRecord || !schoolRecord) {
    return null;
  }

  const transportActive =
    typeof transportActiveOverride === "boolean"
      ? transportActiveOverride
      : Boolean(studentRecord.needsTransport);
  const studentRecordId = studentRecord._id as never;

  const normalized = buildNormalizedFeeStructure(
    schoolRecord,
    studentRecord,
    existingFinanceRecord,
    transportActive
  );

  if (!existingFinanceRecord && normalized.totalFee <= 0) {
    return null;
  }

  const payload = {
    type: "student_fee" as const,
    studentId: studentRecordId,
    amount: normalized.totalFee,
    paidAmount: normalized.paidAmount,
    dueDate: normalized.dueDate,
    paymentDate: normalized.paymentDate || undefined,
    status: normalized.status,
    description: `Common fee structure for ${studentRecord.class}`,
    academicYear: normalized.academicYear,
    feeComponents: normalized.feeComponents,
    schoolId,
  };

  if (existingFinanceRecord?._id) {
    const updatedFinance = await Finance.findByIdAndUpdate(existingFinanceRecord._id as never, payload, {
      new: true,
    });

    return {
      created: false,
      financeId: updatedFinance?._id ? String(updatedFinance._id) : String(existingFinanceRecord._id),
      studentId: String(studentRecord._id),
      schoolId,
      academicFee: normalized.academicFee,
      transportFee: normalized.transportFee,
      totalFee: normalized.totalFee,
      paidAmount: normalized.paidAmount,
      dueAmount: normalized.dueAmount,
      dueDate: normalized.dueDate,
      academicYear: normalized.academicYear,
      status: normalized.status,
      transportActive,
    };
  }

  const financeDoc = await Finance.create({
    ...payload,
    paymentHistory: [],
  } as any);

  return {
    created: true,
    financeId: financeDoc?._id ? String(financeDoc._id) : null,
    studentId: String(studentRecord._id),
    schoolId,
    academicFee: normalized.academicFee,
    transportFee: normalized.transportFee,
    totalFee: normalized.totalFee,
    paidAmount: normalized.paidAmount,
    dueAmount: normalized.dueAmount,
    dueDate: normalized.dueDate,
    academicYear: normalized.academicYear,
    status: normalized.status,
    transportActive,
  };
}

export async function deleteStudentFinanceArtifacts(studentId: string, schoolId: string) {
  await Promise.all([
    Finance.deleteMany({
      schoolId,
      type: "student_fee",
      studentId,
    }),
  ]);
}
