import * as XLSX from "xlsx";

type FetchFn = (
  input: string,
  init?: Record<string, unknown>
) => Promise<{
  ok: boolean;
  json: () => Promise<unknown>;
}>;

type FinanceImportCanonicalField =
  | "studentName"
  | "className"
  | "section"
  | "totalPaid"
  | "grandDue"
  | "totalFee"
  | "fatherName"
  | "mobileNo";

type RawSheetColumn = {
  index: number;
  header: string;
  key: string;
};

type RawSheetRow = {
  rowNumber: number;
  values: Record<string, string>;
};

type WorkbookPreview = {
  sheetName: string;
  columns: RawSheetColumn[];
  sampleRows: RawSheetRow[];
  dataRows: RawSheetRow[];
};

type AiHeaderMappingItem = {
  columnIndex: number | null;
  confidence?: number | null;
  reason?: string | null;
};

type AiHeaderMappingResponse = {
  mapping?: Partial<Record<FinanceImportCanonicalField, AiHeaderMappingItem | null>>;
  ignoredColumnIndexes?: number[];
};

type HeaderMappingEntry = {
  header: string;
  columnIndex: number;
  confidence: number;
  reason: string;
};

export type FinanceImportHeaderMapping = Partial<
  Record<FinanceImportCanonicalField, HeaderMappingEntry | null>
>;

type CanonicalFinanceImportRow = {
  rowNumber: number;
  studentName: string;
  className: string;
  section: string;
  totalPaid: number;
  grandDue: number;
  totalFee: number;
  fatherName: string;
  mobileNo: string;
};

export type FinanceImportPreviewMatchedRow = CanonicalFinanceImportRow & {
  matchedStudentId: string;
  matchedStudentName: string;
  matchSource: "deterministic" | "ai";
  matchConfidence: number;
  pendingAmount: number;
  derivedDue: number;
  grandDueMatches: boolean;
  matchReason: string;
};

export type FinanceImportPreviewSkippedRow = CanonicalFinanceImportRow & {
  reason: string;
  candidateCount: number;
  candidateNames: string[];
  matchConfidence: number | null;
};

export type FinanceImportPreviewMismatchRow = {
  rowNumber: number;
  studentName: string;
  matchedStudentName: string;
  grandDue: number;
  derivedDue: number;
  reason: string;
};

export type FinanceImportPreviewPayload = {
  sheetName: string;
  totalRows: number;
  headerMapping: FinanceImportHeaderMapping;
  mappingConfidence: number;
  matchedRows: FinanceImportPreviewMatchedRow[];
  skippedRows: FinanceImportPreviewSkippedRow[];
  mismatchRows: FinanceImportPreviewMismatchRow[];
  ignoredColumns: Array<{ index: number; header: string }>;
};

export type FinanceImportStudentCandidate = {
  _id: string;
  name: string;
  class: string;
  classSection?: string | null;
  phone?: string | null;
  rollNumber?: string | null;
};

type AiRowMatchResponse = {
  studentId?: string | null;
  confidence?: number | null;
  reason?: string | null;
};

type RowMatchResult =
  | {
      status: "matched";
      student: FinanceImportStudentCandidate;
      source: "deterministic" | "ai";
      confidence: number;
      reason: string;
    }
  | {
      status: "skipped";
      reason: string;
      confidence: number | null;
      candidates: FinanceImportStudentCandidate[];
    };

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_DEFAULT_MODEL = "llama-3.3-70b-versatile";
const HIGH_CONFIDENCE_THRESHOLD = 0.75;

const requiredCanonicalFields: FinanceImportCanonicalField[] = [
  "studentName",
  "totalPaid",
  "grandDue",
  "totalFee",
];

const canonicalHeaderAliases: Record<FinanceImportCanonicalField, string[]> = {
  studentName: ["STUDENT_NAME", "STUDENT NAME", "NAME"],
  className: ["CLASS", "CLS"],
  section: ["SEC", "SECTION"],
  totalPaid: ["T_PAID", "T PAID", "TOTAL PAID", "TOTAL_PAID", "PAID"],
  grandDue: ["G_DUE", "G DUE", "GRAND DUE", "GRAND_DUE", "DUE"],
  totalFee: ["TOT_FEE", "TOT FEE", "TOTAL FEE", "TOTAL_FEE", "FEE"],
  fatherName: ["FATHER_NAME", "FATHER NAME", "FATHER", "GUARDIAN_NAME"],
  mobileNo: ["MOBILE_NO", "MOBILE NO", "MOBILE", "PHONE", "PHONE_NO"],
};

const canonicalReferenceHeaders: Record<FinanceImportCanonicalField, string> = {
  studentName: "STUDENT_NAME",
  className: "CLASS",
  section: "SEC",
  totalPaid: "T_PAID",
  grandDue: "G_DUE",
  totalFee: "TOT_FEE",
  fatherName: "FATHER_NAME",
  mobileNo: "MOBILE_NO",
};

const normalizeHeader = (value: string) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const normalizeText = (value: unknown) => String(value ?? "").trim();

const normalizeName = (value: unknown) =>
  normalizeText(value)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 ]/g, "");

const normalizeClass = (value: unknown) =>
  normalizeText(value)
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/[^A-Z0-9 ]/g, "")
    .trim();

const normalizeSection = (value: unknown) =>
  normalizeText(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const normalizePhone = (value: unknown) => {
  const digits = String(value ?? "").replace(/\D+/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
};

const toNumber = (value: unknown) => {
  const normalized =
    typeof value === "number"
      ? value
      : Number(String(value ?? "").replace(/,/g, "").trim());

  return Number.isFinite(normalized) ? normalized : 0;
};

const cleanJson = (value: string) => value.replace(/```json|```/gi, "").trim();

const buildFetchFn = () => {
  const maybeFetch = (globalThis as typeof globalThis & { fetch?: FetchFn }).fetch;
  return typeof maybeFetch === "function" ? maybeFetch : undefined;
};

const createGroqRequest = async <T>({
  systemPrompt,
  userPrompt,
  maxTokens,
}: {
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
}): Promise<T | null> => {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || GROQ_DEFAULT_MODEL;
  const fetchFn = buildFetchFn();

  if (!apiKey || !fetchFn) {
    return null;
  }

  const response = await fetchFn(GROQ_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  const rawText = payload?.choices?.[0]?.message?.content?.toString?.() || "";
  const cleaned = cleanJson(rawText);

  if (!cleaned) {
    return null;
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
};

const hasMeaningfulValue = (row: unknown[]) =>
  row.some((value) => String(value ?? "").trim() !== "");

const readWorkbookPreview = (buffer: Buffer): WorkbookPreview => {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true, raw: false });

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      defval: "",
      raw: false,
    });
    const firstNonEmptyRowIndex = rows.findIndex(hasMeaningfulValue);

    if (firstNonEmptyRowIndex === -1) {
      continue;
    }

    const headerRow = rows[firstNonEmptyRowIndex] || [];
    const columns: RawSheetColumn[] = headerRow.map((headerValue, index) => ({
      index,
      header: normalizeText(headerValue),
      key: `col_${index}`,
    }));

    const dataRows = rows
      .slice(firstNonEmptyRowIndex + 1)
      .map((row, offset) => {
        if (!hasMeaningfulValue(row)) {
          return null;
        }

        const values = columns.reduce<Record<string, string>>((accumulator, column) => {
          accumulator[column.key] = normalizeText(row[column.index]);
          return accumulator;
        }, {});

        return {
          rowNumber: firstNonEmptyRowIndex + offset + 2,
          values,
        };
      })
      .filter(Boolean) as RawSheetRow[];

    if (dataRows.length === 0) {
      continue;
    }

    return {
      sheetName,
      columns,
      sampleRows: dataRows.slice(0, 5),
      dataRows,
    };
  }

  throw new Error("No non-empty sheet found in the uploaded workbook");
};

const buildHeaderMappingPrompt = (sheet: WorkbookPreview) => {
  const columns = sheet.columns.map((column) => ({
    index: column.index,
    header: column.header,
  }));
  const sampleRows = sheet.sampleRows.map((row) => ({
    rowNumber: row.rowNumber,
    values: sheet.columns.reduce<Record<string, string>>((accumulator, column) => {
      accumulator[String(column.index)] = row.values[column.key] || "";
      return accumulator;
    }, {}),
  }));

  return JSON.stringify(
    {
      canonicalSchema: canonicalReferenceHeaders,
      rules: [
        "Map uploaded columns to the canonical schema.",
        "Unnamed or unrelated columns must be ignored.",
        "Return only JSON.",
        "Use null when a canonical field is not present.",
      ],
      columns,
      sampleRows,
    },
    null,
    2
  );
};

const findExactHeaderMatch = (field: FinanceImportCanonicalField, columns: RawSheetColumn[]) => {
  const aliases = canonicalHeaderAliases[field].map(normalizeHeader);
  return columns.find((column) => aliases.includes(normalizeHeader(column.header)));
};

const resolveHeaderMapping = async (sheet: WorkbookPreview): Promise<{
  headerMapping: FinanceImportHeaderMapping;
  ignoredColumns: Array<{ index: number; header: string }>;
  mappingConfidence: number;
}> => {
  const aiResponse = await createGroqRequest<AiHeaderMappingResponse>({
    systemPrompt:
      "You map Excel headers to a strict canonical schema for school finance import. Return only raw JSON with shape {\"mapping\": { ... }, \"ignoredColumnIndexes\": []}.",
    userPrompt: buildHeaderMappingPrompt(sheet),
    maxTokens: 600,
  });

  const headerMapping: FinanceImportHeaderMapping = {};

  (Object.keys(canonicalReferenceHeaders) as FinanceImportCanonicalField[]).forEach((field) => {
    const aiMapping = aiResponse?.mapping?.[field];
    const aiColumn =
      typeof aiMapping?.columnIndex === "number"
        ? sheet.columns.find((column) => column.index === aiMapping.columnIndex) || null
        : null;
    const exactColumn = findExactHeaderMatch(field, sheet.columns);
    const resolvedColumn = exactColumn || aiColumn;

    if (!resolvedColumn) {
      headerMapping[field] = null;
      return;
    }

    headerMapping[field] = {
      header: resolvedColumn.header,
      columnIndex: resolvedColumn.index,
      confidence: Math.max(
        exactColumn ? 0.99 : 0,
        Math.min(Math.max(Number(aiMapping?.confidence || 0.65), 0), 1)
      ),
      reason:
        (exactColumn
          ? "Exact header match"
          : String(aiMapping?.reason || "").trim()) || "AI-mapped header",
    };
  });

  const missingRequired = requiredCanonicalFields.filter(
    (field) => !headerMapping[field]
  );
  if (missingRequired.length > 0) {
    throw new Error(
      `Failed to map required columns: ${missingRequired
        .map((field) => canonicalReferenceHeaders[field])
        .join(", ")}`
    );
  }

  const ignoredColumnIndexes = new Set<number>(aiResponse?.ignoredColumnIndexes || []);
  const mappedIndexes = new Set(
    Object.values(headerMapping)
      .filter(Boolean)
      .map((entry) => (entry as HeaderMappingEntry).columnIndex)
  );

  const ignoredColumns = sheet.columns
    .filter(
      (column) =>
        ignoredColumnIndexes.has(column.index) || !mappedIndexes.has(column.index)
    )
    .map((column) => ({
      index: column.index,
      header: column.header || `Column ${column.index + 1}`,
    }));

  const confidences = Object.values(headerMapping)
    .filter(Boolean)
    .map((entry) => Number((entry as HeaderMappingEntry).confidence || 0));
  const mappingConfidence =
    confidences.length > 0
      ? Number(
          (
            confidences.reduce((sum, confidence) => sum + confidence, 0) /
            confidences.length
          ).toFixed(2)
        )
      : 0;

  return { headerMapping, ignoredColumns, mappingConfidence };
};

const mapRowsToCanonicalSchema = (
  sheet: WorkbookPreview,
  headerMapping: FinanceImportHeaderMapping
) => {
  const getMappedValue = (
    row: RawSheetRow,
    field: FinanceImportCanonicalField
  ) => {
    const mapping = headerMapping[field];
    if (!mapping) {
      return "";
    }

    const key = `col_${mapping.columnIndex}`;
    return normalizeText(row.values[key]);
  };

  return sheet.dataRows
    .map<CanonicalFinanceImportRow | null>((row) => {
      const mappedRow: CanonicalFinanceImportRow = {
        rowNumber: row.rowNumber,
        studentName: getMappedValue(row, "studentName"),
        className: getMappedValue(row, "className"),
        section: getMappedValue(row, "section"),
        totalPaid: Math.max(toNumber(getMappedValue(row, "totalPaid")), 0),
        grandDue: Math.max(toNumber(getMappedValue(row, "grandDue")), 0),
        totalFee: Math.max(toNumber(getMappedValue(row, "totalFee")), 0),
        fatherName: getMappedValue(row, "fatherName"),
        mobileNo: getMappedValue(row, "mobileNo"),
      };

      const hasSignal =
        mappedRow.studentName ||
        mappedRow.className ||
        mappedRow.section ||
        mappedRow.totalPaid > 0 ||
        mappedRow.grandDue > 0 ||
        mappedRow.totalFee > 0;

      return hasSignal ? mappedRow : null;
    })
    .filter(Boolean) as CanonicalFinanceImportRow[];
};

const tokenizeName = (value: string) =>
  normalizeName(value)
    .split(" ")
    .filter(Boolean);

const getCandidateScore = (
  row: CanonicalFinanceImportRow,
  student: FinanceImportStudentCandidate
) => {
  const rowName = normalizeName(row.studentName);
  const studentName = normalizeName(student.name);
  const rowTokens = tokenizeName(row.studentName);
  const studentTokens = tokenizeName(student.name);
  let score = 0;

  if (rowName && studentName && rowName === studentName) {
    score += 120;
  }

  if (rowName && studentName && (rowName.includes(studentName) || studentName.includes(rowName))) {
    score += 35;
  }

  const sharedTokens = rowTokens.filter((token) => studentTokens.includes(token)).length;
  score += sharedTokens * 12;

  if (normalizeClass(row.className) && normalizeClass(row.className) === normalizeClass(student.class)) {
    score += 18;
  }

  if (
    normalizeSection(row.section) &&
    normalizeSection(row.section) === normalizeSection(student.classSection)
  ) {
    score += 12;
  }

  if (
    normalizePhone(row.mobileNo) &&
    normalizePhone(row.mobileNo) === normalizePhone(student.phone)
  ) {
    score += 40;
  }

  return score;
};

const getLikelyCandidates = (
  row: CanonicalFinanceImportRow,
  students: FinanceImportStudentCandidate[]
) =>
  [...students]
    .map((student) => ({
      student,
      score: getCandidateScore(row, student),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 6)
    .map((item) => item.student);

const resolveDeterministicMatch = (
  row: CanonicalFinanceImportRow,
  students: FinanceImportStudentCandidate[]
): RowMatchResult | null => {
  const normalizedStudentName = normalizeName(row.studentName);
  if (!normalizedStudentName) {
    return {
      status: "skipped",
      reason: "Student name is missing",
      confidence: null,
      candidates: [],
    };
  }

  let candidates = students.filter(
    (student) => normalizeName(student.name) === normalizedStudentName
  );

  if (candidates.length === 0) {
    return null;
  }

  const normalizedClassName = normalizeClass(row.className);
  if (normalizedClassName) {
    const classMatched = candidates.filter(
      (student) => normalizeClass(student.class) === normalizedClassName
    );
    if (classMatched.length > 0) {
      candidates = classMatched;
    }
  }

  const normalizedSection = normalizeSection(row.section);
  if (normalizedSection) {
    const sectionMatched = candidates.filter(
      (student) => normalizeSection(student.classSection) === normalizedSection
    );
    if (sectionMatched.length > 0) {
      candidates = sectionMatched;
    }
  }

  const normalizedMobile = normalizePhone(row.mobileNo);
  if (normalizedMobile) {
    const mobileMatched = candidates.filter(
      (student) => normalizePhone(student.phone) === normalizedMobile
    );
    if (mobileMatched.length > 0) {
      candidates = mobileMatched;
    }
  }

  if (candidates.length === 1) {
    return {
      status: "matched",
      student: candidates[0],
      source: "deterministic",
      confidence: 1,
      reason: "Exact student-name match resolved with class/section/mobile filters",
    };
  }

  return {
    status: "skipped",
    reason: "Multiple students share this name after deterministic matching",
    confidence: null,
    candidates,
  };
};

const resolveAiMatch = async (
  row: CanonicalFinanceImportRow,
  candidates: FinanceImportStudentCandidate[]
): Promise<RowMatchResult> => {
  if (candidates.length === 0) {
    return {
      status: "skipped",
      reason: "No likely student candidates found for AI review",
      confidence: null,
      candidates: [],
    };
  }

  const aiResponse = await createGroqRequest<AiRowMatchResponse>({
    systemPrompt:
      "You match a finance-import row to one student candidate. Return only raw JSON with keys studentId, confidence, reason. If unsure, return studentId null.",
    userPrompt: JSON.stringify(
      {
        row,
        candidates: candidates.map((candidate) => ({
          studentId: candidate._id,
          name: candidate.name,
          className: candidate.class,
          section: candidate.classSection || "",
          mobileNo: candidate.phone || "",
          rollNumber: candidate.rollNumber || "",
        })),
        rule: "Choose exactly one candidate only when confidence is high. Otherwise return studentId null.",
      },
      null,
      2
    ),
    maxTokens: 250,
  });

  const selectedCandidate = candidates.find(
    (candidate) => candidate._id === aiResponse?.studentId
  );
  const confidence = Number(aiResponse?.confidence || 0);

  if (!selectedCandidate || confidence < HIGH_CONFIDENCE_THRESHOLD) {
    return {
      status: "skipped",
      reason:
        String(aiResponse?.reason || "").trim() ||
        "AI could not confidently resolve the student match",
      confidence: Number.isFinite(confidence) && confidence > 0 ? confidence : null,
      candidates,
    };
  }

  return {
    status: "matched",
    student: selectedCandidate,
    source: "ai",
    confidence: confidence,
    reason: String(aiResponse?.reason || "").trim() || "AI resolved the student match",
  };
};

const resolveRowMatch = async (
  row: CanonicalFinanceImportRow,
  students: FinanceImportStudentCandidate[]
): Promise<RowMatchResult> => {
  const deterministicResult = resolveDeterministicMatch(row, students);

  if (deterministicResult?.status === "matched") {
    return deterministicResult;
  }

  const likelyCandidates =
    deterministicResult?.candidates && deterministicResult.candidates.length > 0
      ? deterministicResult.candidates
      : getLikelyCandidates(row, students);

  if (likelyCandidates.length === 0) {
    return (
      deterministicResult || {
        status: "skipped",
        reason: "No student matched this row",
        confidence: null,
        candidates: [],
      }
    );
  }

  return resolveAiMatch(row, likelyCandidates);
};

export const buildFinanceImportPreview = async ({
  fileBuffer,
  students,
}: {
  fileBuffer: Buffer;
  students: FinanceImportStudentCandidate[];
}): Promise<FinanceImportPreviewPayload> => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error(
      "GROQ_API_KEY is not configured in backend/.env. Add it before using AI finance import."
    );
  }

  const sheet = readWorkbookPreview(fileBuffer);
  const { headerMapping, ignoredColumns, mappingConfidence } = await resolveHeaderMapping(sheet);
  const canonicalRows = mapRowsToCanonicalSchema(sheet, headerMapping);

  const matchedRows: FinanceImportPreviewMatchedRow[] = [];
  const skippedRows: FinanceImportPreviewSkippedRow[] = [];
  const mismatchRows: FinanceImportPreviewMismatchRow[] = [];

  for (const row of canonicalRows) {
    const matchResult = await resolveRowMatch(row, students);
    const derivedDue = Math.max(Number((row.totalFee - row.totalPaid).toFixed(2)), 0);
    const grandDueMatches = Math.abs(row.grandDue - derivedDue) <= 0.01;

    if (matchResult.status === "matched") {
      matchedRows.push({
        ...row,
        matchedStudentId: matchResult.student._id,
        matchedStudentName: matchResult.student.name,
        matchSource: matchResult.source,
        matchConfidence: Number(matchResult.confidence.toFixed(2)),
        pendingAmount: derivedDue,
        derivedDue,
        grandDueMatches,
        matchReason: matchResult.reason,
      });

      if (!grandDueMatches) {
        mismatchRows.push({
          rowNumber: row.rowNumber,
          studentName: row.studentName,
          matchedStudentName: matchResult.student.name,
          grandDue: row.grandDue,
          derivedDue,
          reason: `G_DUE ${row.grandDue} does not match derived pending balance ${derivedDue}`,
        });
      }

      continue;
    }

    skippedRows.push({
      ...row,
      reason: matchResult.reason,
      candidateCount: matchResult.candidates.length,
      candidateNames: matchResult.candidates.map((candidate) => candidate.name),
      matchConfidence: matchResult.confidence
        ? Number(matchResult.confidence.toFixed(2))
        : null,
    });
  }

  return {
    sheetName: sheet.sheetName,
    totalRows: canonicalRows.length,
    headerMapping,
    mappingConfidence,
    matchedRows,
    skippedRows,
    mismatchRows,
    ignoredColumns,
  };
};
