type FeeComponent = {
  label: string;
  amount: number;
};

type ClassFeeStructureInput = {
  className?: unknown;
  amount?: unknown;
  transportFee?: unknown;
  academicYear?: unknown;
  dueDate?: unknown;
};

export type NormalizedClassFeeStructure = {
  className: string;
  amount: number;
  transportFee: number;
  academicYear: string;
  dueDate: string;
  feeComponents: FeeComponent[];
  totalAmount: number;
};

export type AppliedStudentFeeStructure = {
  feeComponents: FeeComponent[];
  totalAmount: number;
};

export const buildClassFeeComponents = (amount: number, transportFee: number): FeeComponent[] => {
  const normalizedAmount = Math.max(Number(amount || 0), 0);
  const normalizedTransportFee = Math.max(Number(transportFee || 0), 0);

  const feeComponents: FeeComponent[] = [];

  if (normalizedAmount > 0) {
    feeComponents.push({ label: "Tuition Fee", amount: normalizedAmount });
  }

  if (normalizedTransportFee > 0) {
    feeComponents.push({ label: "Transport Fee", amount: normalizedTransportFee });
  }

  return feeComponents;
};

export const normalizeClassFeeStructure = (
  input: ClassFeeStructureInput,
  fallback?: Partial<NormalizedClassFeeStructure>
): NormalizedClassFeeStructure => {
  const className = String(input.className ?? fallback?.className ?? "").trim();
  const amount = Math.max(Number(input.amount ?? fallback?.amount ?? 0), 0);
  const transportFee = Math.max(Number(input.transportFee ?? fallback?.transportFee ?? 0), 0);
  const academicYear = String(input.academicYear ?? fallback?.academicYear ?? "").trim();
  const dueDate = String(input.dueDate ?? fallback?.dueDate ?? "").trim();
  const feeComponents = buildClassFeeComponents(amount, transportFee);

  return {
    className,
    amount,
    transportFee,
    academicYear,
    dueDate,
    feeComponents,
    totalAmount: feeComponents.reduce((sum, component) => sum + component.amount, 0),
  };
};

export const findClassFeeStructure = (school: any, className: string) => {
  const normalizedClassName = String(className || "").trim();
  const feeStructures = Array.isArray(school?.feeStructures) ? school.feeStructures : [];

  return feeStructures.find(
    (item: any) => String(item?.className || "").trim() === normalizedClassName
  ) || null;
};

export const buildAppliedStudentFeeStructure = (
  classFeeStructure: NormalizedClassFeeStructure,
  needsTransport: boolean
): AppliedStudentFeeStructure => {
  const feeComponents: FeeComponent[] = [];

  if (classFeeStructure.amount > 0) {
    feeComponents.push({ label: "Tuition Fee", amount: classFeeStructure.amount });
  }

  if (needsTransport && classFeeStructure.transportFee > 0) {
    feeComponents.push({ label: "Transport Fee", amount: classFeeStructure.transportFee });
  }

  return {
    feeComponents,
    totalAmount: feeComponents.reduce((sum, component) => sum + component.amount, 0),
  };
};
