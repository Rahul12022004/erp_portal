<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';

  // ── Types ────────────────────────────────────────────────────────────────────

  type ImportModuleType =
    | 'student-master'
    | 'class-fee'
    | 'student-fee-record'
    | 'transport'
    | 'ledger'
    | 'summary-fee';

  type FieldKey =
    | 'registration_no' | 'student_name' | 'father_name' | 'mother_name'
    | 'mobile_number' | 'email' | 'class' | 'section' | 'address'
    | 'date_of_birth' | 'gender' | 'blood_group' | 'admission_date'
    | 'admission_fee' | 'prospectus_fee' | 'annual_charges' | 'fee_per_month'
    | 'no_of_month' | 'total_fee' | 'other_charges'
    | 'fee_total' | 'paid_amount' | 'due_amount' | 'discount_amount'
    | 'paid_date' | 'payment_mode' | 'receipt_no'
    | 'transport_route' | 'vehicle' | 'transport_status' | 'transport_fee'
    | 'stop_name' | 'boarding_point'
    | 'ledger_id' | 'ledger_names' | 'designation' | 'total_assigned'
    | 'amount_paid' | 'balance_remaining'
    | 'total_students' | 'total_collected' | 'total_outstanding'
    | 'financial_year' | 'average_fee_per_student';

  type Mapping = Partial<Record<FieldKey, string>>;

  type ValidationSummary = {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    duplicateRows: number;
    mismatchRows: number;
  };

  type ValidationError = {
    rowNumber: number;
    messages: string[];
  };

  type DuplicateError = {
    rowNumber: number;
    reason: string;
  };

  type PreviewResponse = {
    moduleType: ImportModuleType;
    aiUsed?: boolean;
    mappingConfidence?: number;
    mappingConfidenceByField?: Partial<Record<FieldKey, number>>;
    suggestedMapping: Mapping;
    appliedMapping: Mapping;
    summary: ValidationSummary;
    errors: ValidationError[];
    duplicates: DuplicateError[];
    sampleCleanRows: Array<Record<string, unknown>>;
  };

  type ValidateResponse = {
    batchId: string;
    summary: ValidationSummary;
    errors: ValidationError[];
    duplicates: DuplicateError[];
    cleanRows: Array<Record<string, unknown>>;
  };

  type HistoryBatch = {
    _id: string;
    module_type: ImportModuleType;
    source_file_name: string;
    sheet_name: string;
    academic_year: string;
    status: 'VALIDATED' | 'IMPORTED' | 'ROLLED_BACK' | 'IMPORT_FAILED';
    summary?: {
      total_rows?: number;
      imported_students?: number;
    };
  };

  // ── Constants ────────────────────────────────────────────────────────────────

  const allFieldLabels: Record<FieldKey, string> = {
    registration_no: 'Registration No',
    student_name: 'Student Name',
    father_name: 'Father Name',
    mother_name: 'Mother Name',
    mobile_number: 'Mobile Number',
    email: 'Email',
    class: 'Class',
    section: 'Section',
    address: 'Address',
    date_of_birth: 'Date of Birth',
    gender: 'Gender',
    blood_group: 'Blood Group',
    admission_date: 'Admission Date',
    admission_fee: 'Admission Fee',
    prospectus_fee: 'Prospectus Fee',
    annual_charges: 'Annual Charges',
    fee_per_month: 'Fee/Month',
    no_of_month: 'No of Month',
    total_fee: 'Total Fee',
    other_charges: 'Other Charges',
    fee_total: 'Fee Total',
    paid_amount: 'Paid Amount',
    due_amount: 'Due Amount',
    discount_amount: 'Discount',
    paid_date: 'Paid Date',
    payment_mode: 'Payment Mode',
    receipt_no: 'Receipt No',
    transport_route: 'Transport Route',
    vehicle: 'Vehicle',
    transport_status: 'Transport Status',
    transport_fee: 'Transport Fee',
    stop_name: 'Stop Name',
    boarding_point: 'Boarding Point',
    ledger_id: 'Ledger ID',
    ledger_names: 'Names',
    designation: 'Designation',
    total_assigned: 'Total Amount Assigned',
    amount_paid: 'Amount Paid',
    balance_remaining: 'Balance Remaining',
    total_students: 'Total Students',
    total_collected: 'Total Collected',
    total_outstanding: 'Total Outstanding',
    financial_year: 'Financial Year',
    average_fee_per_student: 'Average Fee Per Student',
  };

  const normalizedFieldKeyMap: Record<FieldKey, string> = {
    registration_no: 'registrationNo',
    student_name: 'studentName',
    father_name: 'fatherName',
    mother_name: 'motherName',
    mobile_number: 'mobileNumber',
    email: 'email',
    class: 'className',
    section: 'section',
    address: 'address',
    date_of_birth: 'dateOfBirth',
    gender: 'gender',
    blood_group: 'bloodGroup',
    admission_date: 'admissionDate',
    admission_fee: 'admissionFee',
    prospectus_fee: 'prospectusFee',
    annual_charges: 'annualCharges',
    fee_per_month: 'feePerMonth',
    no_of_month: 'noOfMonth',
    total_fee: 'totalFee',
    other_charges: 'otherCharges',
    fee_total: 'feeTotal',
    paid_amount: 'paidAmount',
    due_amount: 'dueAmount',
    discount_amount: 'discountAmount',
    paid_date: 'paidDate',
    payment_mode: 'paymentMode',
    receipt_no: 'receiptNo',
    transport_route: 'transportRoute',
    vehicle: 'vehicle',
    transport_status: 'transportStatus',
    transport_fee: 'transportFee',
    stop_name: 'stopName',
    boarding_point: 'boardingPoint',
    ledger_id: 'ledgerId',
    ledger_names: 'ledgerNames',
    designation: 'designation',
    total_assigned: 'totalAssigned',
    amount_paid: 'amountPaid',
    balance_remaining: 'balanceRemaining',
    total_students: 'totalStudents',
    total_fee: 'totalFee',
    total_collected: 'totalCollected',
    total_outstanding: 'totalOutstanding',
    financial_year: 'financialYear',
    average_fee_per_student: 'averageFeePerStudent',
  };

  const moduleFieldDefinitions: Record<
    ImportModuleType,
    {
      availableFields: FieldKey[];
      requiredFields: FieldKey[];
      hints: Array<{ label: string; suggestedField: FieldKey }>;
      description: string;
    }
  > = {
    'student-master': {
      availableFields: [
        'registration_no', 'student_name', 'father_name', 'mother_name',
        'mobile_number', 'email', 'class', 'section', 'address',
        'date_of_birth', 'gender', 'blood_group', 'admission_date',
      ],
      requiredFields: ['registration_no', 'student_name', 'class'],
      hints: [
        { label: 'Admission/Registration No', suggestedField: 'registration_no' },
        { label: 'Student Name', suggestedField: 'student_name' },
        { label: "Father's Name", suggestedField: 'father_name' },
        { label: "Mother's Name", suggestedField: 'mother_name' },
        { label: 'Mobile/Contact Number', suggestedField: 'mobile_number' },
        { label: 'Class', suggestedField: 'class' },
        { label: 'Section', suggestedField: 'section' },
      ],
      description: 'Import student profile and admission master data',
    },
    'class-fee': {
      availableFields: [
        'class', 'admission_fee', 'prospectus_fee', 'annual_charges',
        'fee_per_month', 'no_of_month', 'total_fee', 'other_charges',
      ],
      requiredFields: ['class', 'fee_per_month', 'no_of_month', 'total_fee'],
      hints: [
        { label: 'Class', suggestedField: 'class' },
        { label: 'Admission Fee', suggestedField: 'admission_fee' },
        { label: 'Prospectus Fee', suggestedField: 'prospectus_fee' },
        { label: 'Annual Charges', suggestedField: 'annual_charges' },
        { label: 'Fee/Month', suggestedField: 'fee_per_month' },
        { label: 'No of Month', suggestedField: 'no_of_month' },
        { label: 'Total Fee', suggestedField: 'total_fee' },
        { label: 'Other Charges', suggestedField: 'other_charges' },
      ],
      description: 'Setup class-wise fee structure and allocations',
    },
    'student-fee-record': {
      availableFields: [
        'registration_no', 'student_name', 'class', 'section',
        'fee_total', 'paid_amount', 'due_amount', 'discount_amount',
        'paid_date', 'payment_mode', 'receipt_no',
      ],
      requiredFields: ['registration_no', 'student_name', 'fee_total'],
      hints: [
        { label: 'Admission/Registration No', suggestedField: 'registration_no' },
        { label: 'Student Name', suggestedField: 'student_name' },
        { label: 'Class', suggestedField: 'class' },
        { label: 'Total Fee', suggestedField: 'fee_total' },
        { label: 'Amount Paid/Received', suggestedField: 'paid_amount' },
        { label: 'Balance/Outstanding', suggestedField: 'due_amount' },
        { label: 'Discount/Concession', suggestedField: 'discount_amount' },
        { label: 'Paid Date', suggestedField: 'paid_date' },
      ],
      description: 'Import student fee payments and outstanding records',
    },
    transport: {
      availableFields: [
        'registration_no', 'student_name', 'class', 'section',
        'transport_route', 'vehicle', 'transport_status', 'transport_fee',
        'stop_name', 'boarding_point',
      ],
      requiredFields: ['registration_no', 'student_name', 'transport_route'],
      hints: [
        { label: 'Admission/Registration No', suggestedField: 'registration_no' },
        { label: 'Student Name', suggestedField: 'student_name' },
        { label: 'Class', suggestedField: 'class' },
        { label: 'Transport Route', suggestedField: 'transport_route' },
        { label: 'Vehicle/Bus No', suggestedField: 'vehicle' },
        { label: 'Transport Status (Active/Inactive)', suggestedField: 'transport_status' },
        { label: 'Transport Fee', suggestedField: 'transport_fee' },
      ],
      description: 'Setup transport routes and student allocations',
    },
    ledger: {
      availableFields: [
        'ledger_id', 'ledger_names', 'designation',
        'total_assigned', 'amount_paid', 'balance_remaining',
      ],
      requiredFields: ['ledger_names', 'total_assigned'],
      hints: [
        { label: 'Ledger ID', suggestedField: 'ledger_id' },
        { label: 'Names', suggestedField: 'ledger_names' },
        { label: 'Designation', suggestedField: 'designation' },
        { label: 'Total Amount Assigned', suggestedField: 'total_assigned' },
        { label: 'Amount Paid', suggestedField: 'amount_paid' },
        { label: 'Balance Remaining', suggestedField: 'balance_remaining' },
      ],
      description: 'Import accounting ledger entries and balances',
    },
    'summary-fee': {
      availableFields: [
        'class', 'section', 'total_students', 'total_fee',
        'total_collected', 'total_outstanding', 'financial_year',
        'average_fee_per_student',
      ],
      requiredFields: ['class', 'financial_year'],
      hints: [
        { label: 'Class', suggestedField: 'class' },
        { label: 'Section', suggestedField: 'section' },
        { label: 'Total Students', suggestedField: 'total_students' },
        { label: 'Total Fee Amount', suggestedField: 'total_fee' },
        { label: 'Total Collected', suggestedField: 'total_collected' },
        { label: 'Outstanding Amount', suggestedField: 'total_outstanding' },
        { label: 'Financial Year', suggestedField: 'financial_year' },
      ],
      description: 'Import summarized historical fee data',
    },
  };

  const importModules: Array<{ value: ImportModuleType; label: string; help: string }> = [
    { value: 'student-master', label: 'Student Master', help: 'Use this for student profile and admission master data.' },
    { value: 'class-fee', label: 'Class Fee', help: 'Use this for class-wise fee setup and student fee allocation.' },
    { value: 'student-fee-record', label: 'Student Fee Record', help: 'Use this for student-wise fee payment and outstanding record imports.' },
    { value: 'transport', label: 'Transport', help: 'Use this for transport route, vehicle, and transport status migration.' },
    { value: 'ledger', label: 'Ledger', help: 'Use this for ledger and opening balance-style records.' },
    { value: 'summary-fee', label: 'Summary Fee', help: 'Use this for summarized historical fee data imports.' },
  ];

  // ── Helper functions ─────────────────────────────────────────────────────────

  function getSchoolId(): string {
    try {
      const school = JSON.parse(localStorage.getItem('school') || 'null');
      return school?._id || '';
    } catch {
      return '';
    }
  }

  function toCsv(rows: Array<Array<string | number>>): string {
    return rows
      .map((cells) => cells.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }

  function downloadTextFile(fileName: string, content: string, mime = 'text/csv;charset=utf-8') {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function isImportedMessage(msg: string): boolean {
    return msg.toLowerCase().includes('imported successfully');
  }

  function toPercent(confidence: number | undefined): string {
    if (typeof confidence !== 'number') return '--';
    return `${Math.round(confidence * 100)}%`;
  }

  function getSampleFieldValue(row: Record<string, unknown>, field: FieldKey, mappedHeader?: string): string {
    const normalizedKey = normalizedFieldKeyMap[field];
    const normalizedValue = row[normalizedKey];
    if (normalizedValue !== undefined && normalizedValue !== null && String(normalizedValue).trim() !== '') {
      return String(normalizedValue);
    }
    if (mappedHeader) {
      const rawValue = row[mappedHeader];
      if (rawValue !== undefined && rawValue !== null) return String(rawValue);
    }
    return '';
  }

  function getFieldLabelsForModule(mt: ImportModuleType): Record<string, string> {
    const result: Record<string, string> = {};
    for (const field of moduleFieldDefinitions[mt].availableFields) {
      result[field] = allFieldLabels[field];
    }
    return result;
  }

  async function fetchDataImport(url: string, options?: RequestInit) {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = `Server error (${response.status})`;
      try {
        const errorData = JSON.parse(errorText);
        errorMsg = errorData?.message || errorMsg;
      } catch {
        errorMsg = `Server error (${response.status}): ${errorText.slice(0, 100)}`;
      }
      throw new Error(errorMsg);
    }
    return response;
  }

  // ── Parse XLSX without external library (read raw CSV/TSV fallback) ──────────
  // We use the FileReader + XLSX shim approach: parse as binary and split rows.
  // For real XLSX support the project should add the 'xlsx' npm package.
  // Here we implement a plain CSV/TSV parser for .csv files and a best-effort
  // raw text parser, matching the React source's use of the xlsx library.

  function parseSheetRows(text: string): { headers: string[]; rows: Array<Record<string, unknown>> } {
    // Detect delimiter
    const firstLine = text.split('\n')[0] || '';
    const delimiter = firstLine.includes('\t') ? '\t' : ',';
    const lines = text.split('\n').filter((l) => l.trim() !== '');
    if (lines.length === 0) return { headers: [], rows: [] };

    const parseRow = (line: string): string[] => {
      const result: string[] = [];
      let inQuote = false;
      let current = '';
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuote && line[i + 1] === '"') { current += '"'; i++; }
          else { inQuote = !inQuote; }
        } else if (ch === delimiter && !inQuote) {
          result.push(current); current = '';
        } else {
          current += ch;
        }
      }
      result.push(current);
      return result;
    };

    const headers = parseRow(lines[0]);
    const rows: Array<Record<string, unknown>> = [];
    for (let i = 1; i < lines.length; i++) {
      const cells = parseRow(lines[i]);
      const row: Record<string, unknown> = {};
      headers.forEach((h, idx) => { row[h] = cells[idx] ?? ''; });
      rows.push(row);
    }
    return { headers, rows };
  }

  // ── State ────────────────────────────────────────────────────────────────────

  let moduleType = $state<ImportModuleType>('student-master');
  let academicYear = $state(`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);
  let customFinancialYearInput = $state('');
  let usingCustomFinancialYear = $state(false);
  let fileName = $state('');
  let sheetName = $state('');
  let sheetNames = $state<string[]>([]);
  let rowsBySheet = $state<Record<string, Array<Record<string, unknown>>>>({});
  let headersBySheet = $state<Record<string, string[]>>({});
  let mapping = $state<Mapping>({});
  let preview = $state<PreviewResponse | null>(null);
  let validation = $state<ValidateResponse | null>(null);
  let batchId = $state('');
  let history = $state<HistoryBatch[]>([]);
  let loading = $state(false);
  let message = $state('');
  let error = $state('');
  let showImportPreview = $state(false);
  let pendingMappingConfirmation = $state(false);
  let showMappingEditor = $state(true);
  let showDataView = $state(false);

  // ── Derived ──────────────────────────────────────────────────────────────────

  const schoolId = $derived(getSchoolId());
  const currentRows = $derived(sheetName ? (rowsBySheet[sheetName] || []) : []);
  const currentHeaders = $derived(sheetName ? (headersBySheet[sheetName] || []) : []);
  const moduleDefinition = $derived(moduleFieldDefinitions[moduleType]);
  const fieldLabels = $derived(getFieldLabelsForModule(moduleType));
  const requiredFields = $derived(moduleDefinition.requiredFields);
  const availableFieldKeys = $derived(moduleDefinition.availableFields);
  const moduleMappingHints = $derived(moduleDefinition.hints);
  const missingRequiredMappings = $derived(requiredFields.filter((f) => !mapping[f]));
  const mappedFields = $derived((availableFieldKeys as FieldKey[]).filter((f) => Boolean(mapping[f])));

  const financialYearOptions = $derived.by(() => {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 2;
    return Array.from({ length: 7 }, (_, index) => {
      const fromYear = startYear + index;
      return `${fromYear}-${fromYear + 1}`;
    });
  });

  const isCustomYearActive = $derived(usingCustomFinancialYear || !financialYearOptions.includes(academicYear));

  const progressPercent = $derived.by(() => {
    let done = 0;
    if (fileName) done += 25;
    if (preview) done += 25;
    if (validation?.batchId) done += 25;
    if (validation?.batchId && isImportedMessage(message)) done += 25;
    return done;
  });

  const processSteps = $derived([
    { num: 1, label: 'Choose Type', status: moduleType ? 'done' : 'pending' },
    { num: 2, label: 'Upload File', status: fileName ? 'done' : 'pending' },
    { num: 3, label: 'Map Columns', status: currentHeaders.length > 0 ? 'done' : 'pending' },
    { num: 4, label: 'Validate', status: validation ? 'done' : preview ? 'active' : 'pending' },
    {
      num: 5,
      label: 'Import',
      status: validation && !isImportedMessage(message)
        ? 'active'
        : batchId && isImportedMessage(message) ? 'done' : 'pending',
    },
  ] as const);

  // ── Effects ──────────────────────────────────────────────────────────────────

  $effect(() => {
    // React to moduleType change — clear state
    const _mt = moduleType;
    mapping = {};
    preview = null;
    validation = null;
    batchId = '';
    message = '';
    error = '';
  });

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleFinancialYearSelect(value: string) {
    if (value === '__custom__') {
      usingCustomFinancialYear = true;
      customFinancialYearInput = academicYear;
      return;
    }
    usingCustomFinancialYear = false;
    academicYear = value;
  }

  function applyCustomFinancialYear() {
    const trimmed = customFinancialYearInput.trim();
    if (!trimmed) return;
    academicYear = trimmed;
    usingCustomFinancialYear = true;
  }

  async function parseWorkbook(file: File) {
    // Use FileReader to read as text (handles CSV/TSV files)
    const text = await file.text();
    const sheetNameVal = file.name.replace(/\.[^.]+$/, '') || 'Sheet1';
    const { headers, rows } = parseSheetRows(text);

    rowsBySheet = { [sheetNameVal]: rows };
    headersBySheet = { [sheetNameVal]: headers };
    sheetNames = [sheetNameVal];
    sheetName = sheetNameVal;
  }

  async function onUploadFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    error = '';
    message = '';
    preview = null;
    validation = null;
    batchId = '';
    showImportPreview = false;
    pendingMappingConfirmation = false;
    showMappingEditor = true;
    fileName = file.name;

    try {
      await parseWorkbook(file);
      message = 'Workbook loaded. Select sheet and run preview.';
    } catch (uploadError) {
      error = uploadError instanceof Error ? uploadError.message : 'Unable to parse workbook';
    }
  }

  async function runPreview(useAiMapping = false) {
    if (!schoolId) { error = 'School session missing. Please login again.'; return; }
    if (!sheetName || currentRows.length === 0) { error = 'Choose a sheet with rows before preview.'; return; }

    loading = true; error = ''; message = '';

    try {
      const response = await fetchDataImport('/api/data-import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, moduleType, useAiMapping, headers: currentHeaders, rows: currentRows, mapping }),
      });
      const payload = await response.json();
      if (!payload?.success) throw new Error(payload?.message || 'Preview failed');

      const data = payload.data as PreviewResponse;
      preview = data;
      mapping = data.appliedMapping || {};
      const needsConfirmation = useAiMapping && Boolean(data.aiUsed);
      pendingMappingConfirmation = needsConfirmation;
      showMappingEditor = !needsConfirmation;
      message = needsConfirmation
        ? 'AI mapping generated. Confirm mapping or open edit mode.'
        : 'Preview generated. Verify mapping and run validation.';
    } catch (previewError) {
      error = previewError instanceof Error ? previewError.message : String(previewError) || 'Preview failed';
    } finally {
      loading = false;
    }
  }

  async function runValidation() {
    if (!schoolId) { error = 'School session missing. Please login again.'; return; }
    if (!sheetName || currentRows.length === 0) { error = 'Choose a sheet with rows before validation.'; return; }
    if (!academicYear.trim()) { error = 'Academic year is required.'; return; }

    loading = true; error = ''; message = '';

    try {
      const response = await fetchDataImport('/api/data-import/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, moduleType, fileName, sheetName, academicYear, rows: currentRows, mapping }),
      });
      const payload = await response.json();
      if (!payload?.success) throw new Error(payload?.message || 'Validation failed');

      const data = payload.data as ValidateResponse;
      validation = data;
      batchId = data.batchId;
      showImportPreview = data.summary.validRows > 0;
      message = `Validation complete. ${data.summary.validRows} clean rows are ready for import.`;
    } catch (validationError) {
      error = validationError instanceof Error ? validationError.message : String(validationError) || 'Validation failed';
    } finally {
      loading = false;
    }
  }

  async function runImport() {
    if (!schoolId || !batchId) { error = 'Validate file before import.'; return; }

    loading = true; error = ''; message = '';

    try {
      const response = await fetchDataImport('/api/data-import/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId,
          batchId,
          duplicateMode: moduleType === 'student-fee-record' ? 'update' : 'skip',
        }),
      });
      const payload = await response.json();
      if (!payload?.success) throw new Error(payload?.message || 'Import failed');

      const result = payload.data?.result;
      message = `Imported successfully: students ${result?.importedStudents || 0}, fee accounts ${result?.importedFeeAccounts || 0}, failures ${result?.failedRows || 0}.`;
      await loadHistory();
    } catch (importError) {
      error = importError instanceof Error ? importError.message : String(importError) || 'Import failed';
    } finally {
      loading = false;
    }
  }

  async function loadHistory() {
    if (!schoolId) return;
    try {
      const response = await fetchDataImport(`/api/data-import/history/${schoolId}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const payload = await response.json();
        if (payload?.success) history = (payload.data || []) as HistoryBatch[];
      }
    } catch {
      // ignore history load errors (non-critical)
    }
  }

  async function rollbackBatch(selectedBatchId: string) {
    if (!schoolId) return;
    loading = true; error = '';

    try {
      const response = await fetchDataImport(`/api/data-import/rollback/${selectedBatchId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId }),
      });
      const payload = await response.json();
      if (!payload?.success) throw new Error(payload?.message || 'Rollback failed');
      message = `Batch ${selectedBatchId} rolled back successfully.`;
      await loadHistory();
    } catch (rollbackError) {
      error = rollbackError instanceof Error ? rollbackError.message : String(rollbackError) || 'Rollback failed';
    } finally {
      loading = false;
    }
  }

  async function reimportBatch(selectedBatchId: string) {
    if (!schoolId) return;
    loading = true; error = '';

    try {
      const response = await fetchDataImport(`/api/data-import/reimport/${selectedBatchId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId }),
      });
      const payload = await response.json();
      if (!payload?.success) throw new Error(payload?.message || 'Re-import failed');
      message = `Re-import complete. New batch: ${payload.data?.newBatchId}`;
      await loadHistory();
    } catch (reimportError) {
      error = reimportError instanceof Error ? reimportError.message : String(reimportError) || 'Re-import failed';
    } finally {
      loading = false;
    }
  }

  function downloadErrorReport() {
    if (!validation) return;
    const rows: Array<Array<string | number>> = [['Type', 'Row Number', 'Details']];
    for (const entry of validation.errors) {
      rows.push(['Validation', entry.rowNumber, entry.messages.join(' | ')]);
    }
    for (const entry of validation.duplicates) {
      rows.push(['Duplicate', entry.rowNumber, entry.reason]);
    }
    downloadTextFile(`import-errors-${Date.now()}.csv`, toCsv(rows));
  }

  function setMappingField(field: FieldKey, value: string) {
    mapping = { ...mapping, [field]: value || undefined };
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  onMount(() => {
    void loadHistory();
  });
</script>

<!-- ── Template ──────────────────────────────────────────────────────────────── -->

<div class="space-y-6">

  <!-- Header / Progress section -->
  <section class="rounded-2xl border border-slate-200 bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 p-6">
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h3 class="text-2xl font-semibold text-slate-900">ERP Data Import and Migration</h3>
        <p class="mt-1 text-sm text-slate-600">
          Upload legacy Excel files, map columns, validate data quality, and import clean historical records safely.
        </p>
        <p class="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
          Financial Year: {academicYear}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <select
          value={isCustomYearActive ? '__custom__' : academicYear}
          onchange={(e) => handleFinancialYearSelect((e.target as HTMLSelectElement).value)}
          class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-amber-500"
        >
          {#each financialYearOptions as yearOption (yearOption)}
            <option value={yearOption}>{yearOption}</option>
          {/each}
          <option value="__custom__">Custom Year...</option>
        </select>

        {#if isCustomYearActive}
          <div class="flex items-center gap-2">
            <input
              bind:value={customFinancialYearInput}
              placeholder="e.g. 2021-2022"
              class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-amber-500"
            />
            <button
              type="button"
              onclick={applyCustomFinancialYear}
              class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Apply
            </button>
          </div>
        {/if}

        <button
          onclick={() => void loadHistory()}
          class="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="9"/>
          </svg>
          Refresh History
        </button>
      </div>
    </div>

    <div class="mt-5 rounded-full bg-white/70 p-1">
      <div
        class="h-3 rounded-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all"
        style="width: {progressPercent}%"
      ></div>
    </div>
    <p class="mt-2 text-xs font-medium uppercase tracking-wide text-slate-600">Progress {progressPercent}%</p>
  </section>

  <!-- Process Steps -->
  <section class="rounded-2xl border border-slate-200 bg-white p-6">
    <h4 class="mb-4 text-lg font-semibold text-slate-900">Process Steps</h4>
    <div class="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
      {#each processSteps as step (step.num)}
        {@const statusColor =
          step.status === 'done'
            ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
            : step.status === 'active'
              ? 'bg-blue-100 text-blue-700 border-blue-300'
              : 'bg-slate-100 text-slate-600 border-slate-300'}
        <div class="rounded-lg border-2 {statusColor} p-3 text-center">
          <p class="text-sm font-bold">{step.num}</p>
          <p class="mt-1 text-xs font-semibold">{step.label}</p>
        </div>
      {/each}
    </div>
  </section>

  <!-- Data View Modal -->
  {#if showDataView && currentRows.length > 0}
    <div class="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-8">
      <div class="flex max-h-[90vh] w-full max-w-6xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <!-- Modal Header -->
        <div class="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 rounded-t-2xl">
          <div>
            <h3 class="text-lg font-bold text-slate-900 flex items-center gap-2">
              <svg class="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>
              </svg>
              Data View
            </h3>
            <p class="mt-0.5 text-xs text-slate-500">
              {fileName}
              {#if sheetNames.length > 1}
                <span class="ml-2 text-slate-400">— Sheet:</span>
              {/if}
            </p>
          </div>
          <div class="flex items-center gap-3">
            {#if sheetNames.length > 1}
              <select
                bind:value={sheetName}
                class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-500"
              >
                {#each sheetNames as name (name)}
                  <option value={name}>{name}</option>
                {/each}
              </select>
            {/if}
            <span class="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              {currentRows.length} rows · {currentHeaders.length} columns
            </span>
            <button
              onclick={() => { showDataView = false; }}
              class="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Column Legend -->
        <div class="border-b border-slate-200 bg-blue-50/60 px-6 py-3">
          <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Column Mapping Status</p>
          <div class="flex flex-wrap gap-2">
            {#each currentHeaders as header (header)}
              {@const mappedField = (Object.entries(mapping) as [string, string][]).find(([, v]) => v === header)?.[0] as FieldKey | undefined}
              {@const isRequired = mappedField ? requiredFields.includes(mappedField) : false}
              {@const isMapped = Boolean(mappedField)}
              <span
                class="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold {isRequired
                  ? 'border-emerald-400 bg-emerald-100 text-emerald-800'
                  : isMapped
                    ? 'border-blue-300 bg-blue-100 text-blue-800'
                    : 'border-slate-300 bg-white text-slate-500'}"
              >
                {header}
                {#if isMapped}
                  <span class="ml-1 rounded-full bg-white/70 px-1.5 text-[10px] font-bold">
                    → {fieldLabels[mappedField!] ?? mappedField}
                  </span>
                {/if}
                {#if isRequired}
                  <span class="text-emerald-600">✓</span>
                {/if}
              </span>
            {/each}
          </div>
          <div class="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-500">
            <span class="flex items-center gap-1"><span class="inline-block h-2.5 w-2.5 rounded-full bg-emerald-200 border border-emerald-400"></span> Required &amp; mapped</span>
            <span class="flex items-center gap-1"><span class="inline-block h-2.5 w-2.5 rounded-full bg-blue-200 border border-blue-300"></span> Mapped (optional)</span>
            <span class="flex items-center gap-1"><span class="inline-block h-2.5 w-2.5 rounded-full bg-white border border-slate-300"></span> Not mapped</span>
          </div>
        </div>

        <!-- Table -->
        <div class="flex-1 overflow-auto">
          <table class="min-w-full text-xs">
            <thead class="sticky top-0 z-10">
              <tr>
                <th class="border-b-2 border-r border-slate-300 bg-slate-200 px-3 py-2.5 text-center font-semibold text-slate-600 text-[11px] w-10">#</th>
                {#each currentHeaders as header (header)}
                  {@const mappedField = (Object.entries(mapping) as [string, string][]).find(([, v]) => v === header)?.[0] as FieldKey | undefined}
                  {@const isRequired = mappedField ? requiredFields.includes(mappedField) : false}
                  {@const isMapped = Boolean(mappedField)}
                  <th
                    class="border-b-2 border-r px-3 py-2.5 text-left font-bold text-[11px] whitespace-nowrap {isRequired
                      ? 'border-emerald-400 bg-emerald-100 text-emerald-900'
                      : isMapped
                        ? 'border-blue-300 bg-blue-100 text-blue-900'
                        : 'border-slate-300 bg-slate-100 text-slate-600'}"
                  >
                    <div>{header}</div>
                    {#if isMapped}
                      <div class="mt-0.5 text-[9px] font-semibold {isRequired ? 'text-emerald-600' : 'text-blue-500'}">
                        ↳ {fieldLabels[mappedField!] ?? mappedField}{isRequired ? ' ★' : ''}
                      </div>
                    {/if}
                  </th>
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each currentRows.slice(0, 200) as row, rowIdx (rowIdx)}
                <tr class={rowIdx % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/50 hover:bg-slate-100'}>
                  <td class="border-b border-r border-slate-200 px-3 py-1.5 text-center text-slate-400 font-mono text-[10px]">
                    {rowIdx + 2}
                  </td>
                  {#each currentHeaders as header (header)}
                    {@const mappedField = (Object.entries(mapping) as [string, string][]).find(([, v]) => v === header)?.[0] as FieldKey | undefined}
                    {@const isRequired = mappedField ? requiredFields.includes(mappedField) : false}
                    {@const isMapped = Boolean(mappedField)}
                    {@const cellValue = String(row[header] ?? '')}
                    {@const isEmpty = cellValue.trim() === ''}
                    <td
                      class="border-b border-r px-3 py-1.5 max-w-[200px] truncate {isRequired
                        ? isEmpty
                          ? 'border-red-200 bg-red-50 text-red-500 italic'
                          : 'border-emerald-100 bg-emerald-50/40 text-emerald-900'
                        : isMapped
                          ? 'border-blue-100 bg-blue-50/30 text-blue-900'
                          : 'border-slate-100 text-slate-600'}"
                      title={cellValue}
                    >
                      {#if isEmpty}
                        <span class="text-[10px] text-slate-300 italic">—</span>
                      {:else}
                        {cellValue}
                      {/if}
                    </td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
          {#if currentRows.length > 200}
            <p class="p-3 text-center text-xs text-slate-400">Showing first 200 of {currentRows.length} rows</p>
          {/if}
        </div>

        <!-- Modal Footer -->
        <div class="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3 rounded-b-2xl">
          <p class="text-xs text-slate-500">
            <span class="font-semibold text-emerald-700">{Object.keys(mapping).filter((k) => mapping[k as FieldKey]).length}</span> columns mapped ·
            <span class="font-semibold text-slate-700">{currentHeaders.length}</span> total columns
          </p>
          <button
            onclick={() => { showDataView = false; }}
            class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Import Preview Modal -->
  {#if showImportPreview && validation}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h3 class="text-xl font-semibold text-slate-900">Review Import</h3>
        <p class="mt-1 text-sm text-slate-600">Confirm destination and preview the data before import.</p>

        <div class="mt-6 grid gap-4">
          <div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h4 class="text-sm font-semibold text-blue-900">Import Destination</h4>
            <div class="mt-3 grid gap-3 md:grid-cols-3">
              <div>
                <p class="text-xs font-medium text-blue-700">Module Type</p>
                <p class="mt-1 text-sm font-semibold text-blue-900">
                  {importModules.find((mod) => mod.value === moduleType)?.label}
                </p>
              </div>
              <div>
                <p class="text-xs font-medium text-blue-700">Academic Year</p>
                <p class="mt-1 text-sm font-semibold text-blue-900">{academicYear}</p>
              </div>
              <div>
                <p class="text-xs font-medium text-blue-700">School</p>
                <p class="mt-1 text-sm font-semibold text-blue-900">{schoolId ? `${schoolId.slice(0, 8)}...` : 'Unknown'}</p>
              </div>
            </div>
          </div>

          <div class="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <h4 class="text-sm font-semibold text-emerald-900">Import Summary</h4>
            <div class="mt-3 grid gap-3 md:grid-cols-4">
              <div>
                <p class="text-xs text-emerald-700">Rows to Import</p>
                <p class="mt-1 text-2xl font-bold text-emerald-900">{validation.summary.validRows}</p>
              </div>
              <div>
                <p class="text-xs text-amber-700">Skipped Invalid</p>
                <p class="mt-1 text-2xl font-bold text-amber-900">{validation.summary.invalidRows}</p>
              </div>
              <div>
                <p class="text-xs text-rose-700">Skipped Duplicates</p>
                <p class="mt-1 text-2xl font-bold text-rose-900">{validation.summary.duplicateRows}</p>
              </div>
              <div>
                <p class="text-xs text-blue-700">Total Rows</p>
                <p class="mt-1 text-2xl font-bold text-blue-900">{validation.summary.totalRows}</p>
              </div>
            </div>
          </div>

          {#if validation.cleanRows.length > 0}
            <div>
              <h4 class="text-sm font-semibold text-slate-900">Sample Data (First 5 Rows)</h4>
              <div class="mt-3 overflow-x-auto rounded-lg border border-slate-200">
                <table class="w-full text-xs">
                  <thead class="bg-slate-100">
                    <tr>
                      {#each mappedFields as field (field)}
                        <th class="border-r border-slate-200 px-3 py-2 text-left font-semibold text-slate-900">
                          {fieldLabels[field]}
                        </th>
                      {/each}
                    </tr>
                  </thead>
                  <tbody>
                    {#each validation.cleanRows.slice(0, 5) as row, idx (idx)}
                      <tr class="border-t border-slate-200 hover:bg-slate-50">
                        {#each mappedFields as field (field)}
                          {@const mappedCol = mapping[field]}
                          {@const value = getSampleFieldValue(row, field, mappedCol)}
                          <td class="border-r border-slate-200 px-3 py-2 text-slate-700">
                            {String(value ?? '').slice(0, 50)}
                          </td>
                        {/each}
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>
          {/if}
        </div>

        <div class="mt-6 flex gap-3">
          <button
            disabled={loading}
            onclick={async () => { await runImport(); showImportPreview = false; }}
            class="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {#if loading}
              <svg class="mr-2 inline h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12a9 9 0 11-6.219-8.56"/>
              </svg>
            {/if}
            Confirm Import
          </button>
          <button
            disabled={loading}
            onclick={() => { showImportPreview = false; }}
            class="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Feedback banner -->
  {#if error || message}
    <div
      class="rounded-xl border px-4 py-3 text-sm {error
        ? 'border-rose-200 bg-rose-50 text-rose-700'
        : 'border-emerald-200 bg-emerald-50 text-emerald-700'}"
    >
      <div class="flex items-start gap-2">
        {#if error}
          <svg class="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        {:else}
          <svg class="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        {/if}
        <span>{error || message}</span>
      </div>
    </div>
  {/if}

  <!-- Main two-column layout -->
  <section class="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">

    <!-- Left: import form -->
    <div class="space-y-6 rounded-2xl border border-slate-200 bg-white p-5">

      <!-- Module type selector -->
      <div class="space-y-3">
        <p class="text-sm font-medium text-slate-700">Import Type</p>
        <div class="flex flex-wrap gap-2">
          {#each importModules as item (item.value)}
            {@const isSelected = moduleType === item.value}
            <button
              type="button"
              onclick={() => { moduleType = item.value; }}
              class="rounded-lg border px-3 py-2 text-sm font-semibold transition-colors {isSelected
                ? 'border-amber-600 bg-amber-100 text-amber-900'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}"
            >
              {item.label}
            </button>
          {/each}
        </div>
      </div>

      <!-- Financial year selector (in form area) -->
      <label class="space-y-2 text-sm font-medium text-slate-700">
        Financial Year
        <select
          value={isCustomYearActive ? '__custom__' : academicYear}
          onchange={(e) => handleFinancialYearSelect((e.target as HTMLSelectElement).value)}
          class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500"
        >
          {#each financialYearOptions as yearOption (yearOption)}
            <option value={yearOption}>{yearOption}</option>
          {/each}
          <option value="__custom__">Custom Year...</option>
        </select>

        {#if isCustomYearActive}
          <div class="flex items-center gap-2">
            <input
              bind:value={customFinancialYearInput}
              placeholder="e.g. 2020-2021"
              class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500"
            />
            <button
              type="button"
              onclick={applyCustomFinancialYear}
              class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Apply
            </button>
          </div>
        {/if}
      </label>

      <!-- Module help text -->
      <p class="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
        {importModules.find((item) => item.value === moduleType)?.help}
      </p>

      <!-- File upload -->
      <div class="rounded-xl border border-dashed border-slate-300 p-5">
        <div class="flex flex-wrap items-center gap-3">
          <label class="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
            </svg>
            Upload Excel Workbook
            <input type="file" accept=".xlsx,.xls,.csv" class="hidden" onchange={onUploadFile} />
          </label>
          {#if currentRows.length > 0}
            <button
              type="button"
              onclick={() => { showDataView = true; }}
              class="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>
              </svg>
              View Data
            </button>
          {/if}
        </div>
        <p class="mt-2 text-xs text-slate-500">Supported: .xlsx, .xls, .csv</p>
        {#if fileName}
          <p class="mt-2 text-sm font-medium text-slate-700">File: {fileName}</p>
        {/if}
      </div>

      <!-- Action buttons -->
      <div class="flex flex-wrap gap-2">
        <button
          disabled={loading || currentRows.length === 0}
          onclick={() => void runPreview()}
          class="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
        >
          {#if loading}
            <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
          {:else}
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/>
              <path d="M9 21V9"/>
            </svg>
          {/if}
          Preview
        </button>

        <button
          disabled={loading || currentRows.length === 0}
          onclick={() => void runPreview(true)}
          class="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {#if loading}
            <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
          {:else}
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          {/if}
          AI Auto-Match
        </button>

        <button
          disabled={loading || currentRows.length === 0 || pendingMappingConfirmation}
          onclick={() => void runValidation()}
          class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {#if loading}
            <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
          {:else}
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          {/if}
          Validate
        </button>

        <button
          disabled={loading || !batchId}
          onclick={() => { showImportPreview = true; }}
          class="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {#if loading}
            <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
          {:else}
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
            </svg>
          {/if}
          Import Clean Data
        </button>

        <button
          disabled={!validation}
          onclick={downloadErrorReport}
          class="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          Download Error Report
        </button>
      </div>

      <!-- Pending AI mapping confirmation -->
      {#if pendingMappingConfirmation}
        <div class="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <p class="text-sm font-semibold text-indigo-900">AI mapping is ready. Please confirm before validation.</p>
          {#if preview?.mappingConfidenceByField && mappedFields.length > 0}
            <div class="mt-3 rounded-lg border border-indigo-200 bg-white p-3">
              <p class="text-xs font-semibold text-indigo-900">
                Field Confidence (overall {toPercent(preview.mappingConfidence)})
              </p>
              <div class="mt-2 grid gap-2 md:grid-cols-2">
                {#each mappedFields as field (field)}
                  <p class="text-xs text-indigo-800">
                    {fieldLabels[field]}: {toPercent(preview.mappingConfidenceByField?.[field])}
                  </p>
                {/each}
              </div>
            </div>
          {/if}
          <div class="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onclick={() => {
                pendingMappingConfirmation = false;
                showMappingEditor = false;
                message = 'AI mapping confirmed. You can run validation now.';
              }}
              class="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              Confirm Mapping
            </button>
            <button
              type="button"
              onclick={() => {
                pendingMappingConfirmation = false;
                showMappingEditor = true;
                message = 'Edit mappings if needed, then run validation.';
              }}
              class="rounded-lg border border-indigo-300 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
            >
              Edit Mapping
            </button>
          </div>
        </div>
      {/if}

      <!-- Column Mapping Editor -->
      {#if currentHeaders.length > 0 && showMappingEditor}
        <div class="rounded-xl border border-slate-200 p-4">
          <h4 class="text-sm font-semibold text-slate-900">Column Mapping</h4>
          <p class="mt-1 text-xs text-slate-500">Map Excel columns to ERP fields. Unmapped fields will be left blank.</p>

          {#if moduleMappingHints.length > 0}
            <div class="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p class="text-xs font-semibold text-blue-900">Suggested Columns For {importModules.find((m) => m.value === moduleType)?.label}</p>
              <div class="mt-2 grid gap-2 md:grid-cols-2">
                {#each moduleMappingHints as hint (`${hint.label}-${hint.suggestedField}`)}
                  <p class="text-xs text-blue-800">{hint.label} -&gt; {fieldLabels[hint.suggestedField]}</p>
                {/each}
              </div>
            </div>
          {/if}

          <div class="mt-3 grid gap-3 md:grid-cols-2">
            {#each availableFieldKeys as field (field)}
              <label class="space-y-1 text-xs font-medium text-slate-600">
                <span class="inline-flex items-center gap-2">
                  <span>{fieldLabels[field]}</span>
                  {#if requiredFields.includes(field)}
                    <span class="text-red-600">*</span>
                  {/if}
                  {#if mapping[field] && preview?.mappingConfidenceByField?.[field] !== undefined}
                    <span class="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                      {toPercent(preview.mappingConfidenceByField[field])}
                    </span>
                  {/if}
                </span>
                <select
                  value={mapping[field] || ''}
                  onchange={(e) => setMappingField(field, (e.target as HTMLSelectElement).value)}
                  class="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-800"
                >
                  <option value="">Not mapped</option>
                  {#each currentHeaders as header (`${field}-${header}`)}
                    <option value={header}>{header}</option>
                  {/each}
                </select>
              </label>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Preview Results -->
      {#if preview}
        <div class="space-y-4 rounded-xl border border-slate-200 p-4">
          <h4 class="text-sm font-semibold text-slate-900">Validation Preview</h4>
          <div class="text-sm text-slate-600">
            Rows loaded: <span class="font-semibold text-slate-800">{currentRows.length}</span>
          </div>

          {#if preview.summary.validRows === 0}
            <div class="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <p class="font-semibold">No clean rows found.</p>
              <p class="mt-1">Most common reasons are missing required mappings or invalid values in required columns.</p>
              {#if missingRequiredMappings.length > 0}
                <p class="mt-1">
                  Required fields not mapped: {missingRequiredMappings.map((f) => fieldLabels[f]).join(', ')}
                </p>
              {/if}
            </div>
          {/if}

          {#if preview.errors.length > 0}
            <div class="max-h-56 overflow-auto rounded-lg border border-rose-200">
              <table class="w-full text-xs">
                <thead class="bg-rose-50 text-rose-700">
                  <tr>
                    <th class="px-3 py-2 text-left">Row</th>
                    <th class="px-3 py-2 text-left">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {#each preview.errors.slice(0, 12) as entry (`pe-${entry.rowNumber}`)}
                    <tr class="border-t border-rose-100">
                      <td class="px-3 py-2 font-medium">{entry.rowNumber}</td>
                      <td class="px-3 py-2">{entry.messages.join(' | ')}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}

          {#if preview.duplicates.length > 0}
            <div class="max-h-48 overflow-auto rounded-lg border border-amber-200">
              <table class="w-full text-xs">
                <thead class="bg-amber-50 text-amber-700">
                  <tr>
                    <th class="px-3 py-2 text-left">Row</th>
                    <th class="px-3 py-2 text-left">Duplicate Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {#each preview.duplicates.slice(0, 12) as entry (`pd-${entry.rowNumber}`)}
                    <tr class="border-t border-amber-100">
                      <td class="px-3 py-2 font-medium">{entry.rowNumber}</td>
                      <td class="px-3 py-2">{entry.reason}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        </div>
      {/if}

    </div>

    <!-- Right: Batch History sidebar -->
    <aside class="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <h4 class="text-base font-semibold text-slate-900">Batch History</h4>
      <p class="text-xs text-slate-500">View import logs, rollback imported batches, or trigger re-import.</p>

      {#if history.length === 0}
        <div class="rounded-lg border border-dashed border-slate-300 p-4 text-xs text-slate-500">
          No batches yet. Validate/import a file to create history.
        </div>
      {:else}
        <div class="max-h-[640px] space-y-3 overflow-auto pr-1">
          {#each history as batch (batch._id)}
            <div class="rounded-xl border border-slate-200 p-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{batch.module_type}</p>
              <p class="mt-1 text-sm font-semibold text-slate-900">{batch.source_file_name}</p>
              <p class="text-xs text-slate-500">{batch.sheet_name} | {batch.academic_year}</p>
              <p class="mt-1 text-xs text-slate-600">Status: <span class="font-semibold">{batch.status}</span></p>
              <p class="text-xs text-slate-500">
                Rows: {batch.summary?.total_rows || 0} | Imported students: {batch.summary?.imported_students || 0}
              </p>

              <div class="mt-3 flex flex-wrap gap-2">
                <button
                  disabled={loading || batch.status === 'ROLLED_BACK'}
                  onclick={() => void rollbackBatch(batch._id)}
                  class="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                >
                  <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 2v6h6"/><path d="M3 13a9 9 0 1 0 3-7.7L3 8"/>
                  </svg>
                  Rollback
                </button>
                <button
                  disabled={loading}
                  onclick={() => void reimportBatch(batch._id)}
                  class="inline-flex items-center gap-1 rounded-md border border-blue-300 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                >
                  <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                  </svg>
                  Re-import
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </aside>

  </section>

</div>
