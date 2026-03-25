export type FeeInstallment = {
  label: string;
  amount: number;
  dueBy: string;
};

export type NewAdmissionCharges = {
  registrationFee: number;
  admissionFee: number;
  cautionMoney: number;
  totalPayableAtAdmission: number;
};

export type FeeStructureGroup = {
  serialNumber: number;
  key: string;
  heading: string;
  classLabel: string;
  annualFee: number;
  installments: FeeInstallment[];
  newAdmission: NewAdmissionCharges;
};

export type FeeStructureDocument = {
  academicYear: string;
  newAdmissionSection: Array<{
    serialNumber: number;
    classLabel: string;
    registrationFee: number;
    admissionFee: number;
    cautionMoney: number;
    totalPayableAtAdmission: number;
  }>;
  annualFeeSection: Array<{
    serialNumber: number;
    classLabel: string;
    details: string;
    installment1: number;
    installment2: number;
    installment3: number;
    installment4: number;
    totalAnnualFee: number;
  }>;
  notes: string[];
  policy: string[];
};

const CURRENT_YEAR = new Date().getFullYear();

export const DEFAULT_ACADEMIC_YEAR = `${CURRENT_YEAR}-${CURRENT_YEAR + 1}`;

export const FEE_STRUCTURE_GROUPS: FeeStructureGroup[] = [
  {
    serialNumber: 1,
    key: "nursery-prep",
    heading: "Nursery to Prep",
    classLabel: "Nursery / LKG / UKG / Prep",
    annualFee: 48000,
    installments: [
      { label: "Installment I", amount: 12000, dueBy: "10 Apr" },
      { label: "Installment II", amount: 12000, dueBy: "10 Jul" },
      { label: "Installment III", amount: 12000, dueBy: "10 Oct" },
      { label: "Installment IV", amount: 12000, dueBy: "10 Jan" },
    ],
    newAdmission: {
      registrationFee: 1500,
      admissionFee: 8000,
      cautionMoney: 5000,
      totalPayableAtAdmission: 14500,
    },
  },
  {
    serialNumber: 2,
    key: "class-1-2",
    heading: "Class 1 and 2",
    classLabel: "Class 1 - 2",
    annualFee: 52000,
    installments: [
      { label: "Installment I", amount: 13000, dueBy: "10 Apr" },
      { label: "Installment II", amount: 13000, dueBy: "10 Jul" },
      { label: "Installment III", amount: 13000, dueBy: "10 Oct" },
      { label: "Installment IV", amount: 13000, dueBy: "10 Jan" },
    ],
    newAdmission: {
      registrationFee: 1500,
      admissionFee: 9000,
      cautionMoney: 5000,
      totalPayableAtAdmission: 15500,
    },
  },
  {
    serialNumber: 3,
    key: "class-3-5",
    heading: "Class 3 to 5",
    classLabel: "Class 3 - 5",
    annualFee: 60000,
    installments: [
      { label: "Installment I", amount: 15000, dueBy: "10 Apr" },
      { label: "Installment II", amount: 15000, dueBy: "10 Jul" },
      { label: "Installment III", amount: 15000, dueBy: "10 Oct" },
      { label: "Installment IV", amount: 15000, dueBy: "10 Jan" },
    ],
    newAdmission: {
      registrationFee: 1500,
      admissionFee: 10000,
      cautionMoney: 6000,
      totalPayableAtAdmission: 17500,
    },
  },
  {
    serialNumber: 4,
    key: "class-6-8",
    heading: "Class 6 to 8",
    classLabel: "Class 6 - 8",
    annualFee: 72000,
    installments: [
      { label: "Installment I", amount: 18000, dueBy: "10 Apr" },
      { label: "Installment II", amount: 18000, dueBy: "10 Jul" },
      { label: "Installment III", amount: 18000, dueBy: "10 Oct" },
      { label: "Installment IV", amount: 18000, dueBy: "10 Jan" },
    ],
    newAdmission: {
      registrationFee: 2000,
      admissionFee: 12000,
      cautionMoney: 7000,
      totalPayableAtAdmission: 21000,
    },
  },
  {
    serialNumber: 5,
    key: "class-9-10",
    heading: "Class 9 and 10",
    classLabel: "Class 9 - 10",
    annualFee: 84000,
    installments: [
      { label: "Installment I", amount: 21000, dueBy: "10 Apr" },
      { label: "Installment II", amount: 21000, dueBy: "10 Jul" },
      { label: "Installment III", amount: 21000, dueBy: "10 Oct" },
      { label: "Installment IV", amount: 21000, dueBy: "10 Jan" },
    ],
    newAdmission: {
      registrationFee: 2000,
      admissionFee: 14000,
      cautionMoney: 8000,
      totalPayableAtAdmission: 24000,
    },
  },
  {
    serialNumber: 6,
    key: "class-11-12",
    heading: "Higher Classes",
    classLabel: "Class 11 - 12",
    annualFee: 96000,
    installments: [
      { label: "Installment I", amount: 24000, dueBy: "10 Apr" },
      { label: "Installment II", amount: 24000, dueBy: "10 Jul" },
      { label: "Installment III", amount: 24000, dueBy: "10 Oct" },
      { label: "Installment IV", amount: 24000, dueBy: "10 Jan" },
    ],
    newAdmission: {
      registrationFee: 2500,
      admissionFee: 16000,
      cautionMoney: 10000,
      totalPayableAtAdmission: 28500,
    },
  },
];

const normalizeClassName = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

const getNumericClassLevel = (value: string) => {
  const match = value.match(/(10|11|12|[1-9])/);
  return match ? Number(match[1]) : null;
};

export const getFeeStructureGroupForClass = (className: string) => {
  const normalized = normalizeClassName(className || "");

  if (["nursery", "lkg", "ukg", "prep", "preprimary", "kg"].some((token) => normalized.includes(token))) {
    return FEE_STRUCTURE_GROUPS[0];
  }

  const level = getNumericClassLevel(normalized);

  if (level === null) return FEE_STRUCTURE_GROUPS[1];
  if (level <= 2) return FEE_STRUCTURE_GROUPS[1];
  if (level <= 5) return FEE_STRUCTURE_GROUPS[2];
  if (level <= 8) return FEE_STRUCTURE_GROUPS[3];
  if (level <= 10) return FEE_STRUCTURE_GROUPS[4];
  return FEE_STRUCTURE_GROUPS[5];
};

export const buildAnnualFeeComponents = (className: string) => {
  const group = getFeeStructureGroupForClass(className);
  return group.installments.map((installment) => ({
    label: `${installment.label} (${installment.dueBy})`,
    amount: installment.amount,
  }));
};

export const getCurrentDueDateForClass = (className: string, paidAmount: number) => {
  const group = getFeeStructureGroupForClass(className);
  let cumulative = 0;

  for (const installment of group.installments) {
    cumulative += installment.amount;
    if (paidAmount < cumulative) {
      return installment.dueBy;
    }
  }

  return group.installments[group.installments.length - 1]?.dueBy || "-";
};

export const buildFeeStructureDocument = (academicYear: string = DEFAULT_ACADEMIC_YEAR): FeeStructureDocument => ({
  academicYear,
  newAdmissionSection: FEE_STRUCTURE_GROUPS.map((group) => ({
    serialNumber: group.serialNumber,
    classLabel: group.classLabel,
    registrationFee: group.newAdmission.registrationFee,
    admissionFee: group.newAdmission.admissionFee,
    cautionMoney: group.newAdmission.cautionMoney,
    totalPayableAtAdmission: group.newAdmission.totalPayableAtAdmission,
  })),
  annualFeeSection: FEE_STRUCTURE_GROUPS.map((group) => ({
    serialNumber: group.serialNumber,
    classLabel: group.classLabel,
    details: group.heading,
    installment1: group.installments[0]?.amount || 0,
    installment2: group.installments[1]?.amount || 0,
    installment3: group.installments[2]?.amount || 0,
    installment4: group.installments[3]?.amount || 0,
    totalAnnualFee: group.annualFee,
  })),
  notes: [
    "Transport fee is charged separately and is not included in the academic fee shown above.",
    "Caution money is refundable subject to school clearance norms at the time of withdrawal.",
    "All fee values are expressed in INR and are applicable for the full academic year.",
  ],
  policy: [
    "Installments are payable on or before 10 April, 10 July, 10 October, and 10 January respectively.",
    "Fee once assigned to a student is generated automatically according to the student class group and academic year.",
    "Late payment penalty of INR 50 per day may be levied after the due date until the installment is cleared.",
    "Admission fee and registration fee are non-refundable after confirmation of admission.",
    "Caution money is refundable only after adjustment of dues, library clearance, and return of school property.",
    "Cheques should be issued in favour of the school and must mention student name, class, and contact number on the reverse side.",
    "Dishonoured cheque cases may attract bank charges and late fee penalty in addition to the outstanding amount.",
  ],
});