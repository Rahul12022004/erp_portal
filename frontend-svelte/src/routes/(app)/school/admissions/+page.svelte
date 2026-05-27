<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';

  // ── Types ────────────────────────────────────────────────────────────────────

  type Student = {
    _id: string;
    formNumber?: string;
    admissionNumber?: string;
    name: string;
    email: string;
    class: string;
    classSection?: string;
    academicYear?: string;
    rollNumber: string;
    phone?: string;
    address?: string;
    dateOfBirth?: string;
    bloodGroup?: string;
    gender?: string;
    father_name?: string;
    mother_name?: string;
    fatherPhone?: string;
    motherPhone?: string;
    fatherEmail?: string;
    motherEmail?: string;
    fatherAadharNumber?: string;
    motherAadharNumber?: string;
    fatherAadharCardDocument?: string;
    motherAadharCardDocument?: string;
    photo?: string;
    aadharCardDocument?: string;
    bodCertificate?: string;
    rteDocument?: string;
    hasParentConsent?: boolean;
    createdAt?: string;
  };

  type AdmissionForm = {
    formNumber: string;
    formDate: string;
    admissionNumber: string;
    name: string;
    email: string;
    class: string;
    classSection: string;
    academicYear: string;
    rollNumber: string;
    phone: string;
    aadharNumber: string;
    fatherName: string;
    fatherPhone: string;
    fatherEmail: string;
    fatherAadharNumber: string;
    fatherAadharCardDocument: string;
    motherName: string;
    motherPhone: string;
    motherEmail: string;
    motherAadharNumber: string;
    motherAadharCardDocument: string;
    placeOfBirth: string;
    state: string;
    nationality: string;
    religion: string;
    address: string;
    pinCode: string;
    dateOfBirth: string;
    gender: string;
    caste: string;
    motherTongue: string;
    bloodGroup: string;
    identificationMarks: string;
    previousAcademicRecord: string;
    achievements: string;
    generalBehaviour: string;
    medicalHistory: string;
    languagePreferences: string;
    hasParentConsent: boolean;
    needsTransport: boolean;
    busConsent: boolean;
    photo: string;
    rteDocument: string;
    bodCertificate: string;
  };

  type ParsedAdmissionRow = {
    name: string;
    email: string;
    class: string;
    rollNumber: string;
    phone: string;
    address: string;
    dateOfBirth: string;
    gender: string;
  };

  type SchoolClassSummary = {
    _id: string;
    name: string;
    section?: string;
  };

  type SchoolImportClassPreview = {
    name: string;
    section: string;
    label: string;
  };

  type SchoolDataImportRow = {
    rowNumber: number;
    formNumber: string;
    formDate: string;
    admissionNumber: string;
    name: string;
    email: string;
    className: string;
    classSection: string;
    classLabel: string;
    academicYear: string;
    rollNumber: string;
    phone: string;
    address: string;
    dateOfBirth: string;
    gender: string;
    aadharNumber: string;
    religion: string;
    caste: string;
    needsTransport: boolean;
    busConsent: boolean;
  };

  type InvalidSchoolDataImportRow = {
    rowNumber: number;
    reason: string;
  };

  type SchoolDataImportResult = {
    totalRows: number;
    validRows: number;
    invalidRows: InvalidSchoolDataImportRow[];
    classesCreated: string[];
    importedCount: number;
    duplicateCount: number;
    duplicates: InvalidSchoolDataImportRow[];
    failureCount: number;
    failures: InvalidSchoolDataImportRow[];
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function formatDate(d?: string | null) {
    if (!d) return '-';
    try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return d; }
  }

  function getMissingDocs(s: Student): string[] {
    const missing: string[] = [];
    if (!s.rteDocument) missing.push('Right to Education Document');
    if (!s.bodCertificate) missing.push('DOB Certificate');
    if (!s.aadharCardDocument) missing.push('Aadhaar Card');
    return missing;
  }

  function isAdmissionComplete(s: Student) {
    return getMissingDocs(s).length === 0;
  }

  function getRowValue(row: Record<string, unknown>, keys: string[]): string {
    for (const [key, value] of Object.entries(row)) {
      const normalized = key.trim().toLowerCase();
      if (keys.includes(normalized)) return String(value ?? '').trim();
    }
    return '';
  }

  function normalizeDate(value: string): string {
    if (!value) return '';
    const trimmed = value.trim();
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      // XLSX serial date fallback — approximate
      const epoch = new Date(Date.UTC(1899, 11, 30));
      const ms = Number(trimmed) * 86400000;
      const d = new Date(epoch.getTime() + ms);
      if (!isNaN(d.getTime())) {
        return d.toISOString().slice(0, 10);
      }
    }
    const date = new Date(trimmed);
    if (isNaN(date.getTime())) return trimmed;
    return date.toISOString().slice(0, 10);
  }

  function parseAdmissionRows(rows: Record<string, unknown>[]): ParsedAdmissionRow[] {
    return rows
      .map((row) => ({
        name: getRowValue(row, ['name', 'full name', 'student name']),
        email: getRowValue(row, ['email', 'email address']),
        class: getRowValue(row, ['class', 'classname', 'class name']),
        rollNumber: getRowValue(row, ['roll number', 'rollnumber', 'roll no', 'rollno']),
        phone: getRowValue(row, ['phone', 'mobile', 'phone number', 'contact']),
        address: getRowValue(row, ['address', 'student address']),
        dateOfBirth: normalizeDate(getRowValue(row, ['date of birth', 'dob', 'birth date'])),
        gender: getRowValue(row, ['gender', 'sex']),
      }))
      .filter((row) => row.name && row.email && row.class && row.rollNumber);
  }

  function normalizeTextValue(value: unknown): string {
    return String(value ?? '').trim();
  }

  function normalizeUpperText(value: unknown): string {
    return normalizeTextValue(value).toUpperCase();
  }

  function buildClassLabel(className: string, classSection?: string) {
    return classSection ? `${className} - ${classSection}` : className;
  }

  function buildClassKey(className: string, classSection?: string) {
    return `${className.trim().toLowerCase()}::${(classSection || '').trim().toUpperCase()}`;
  }

  function normalizeGenderValue(value: unknown): string {
    const normalized = normalizeTextValue(value).toLowerCase();
    if (!normalized) return '';
    if (normalized.startsWith('m')) return 'Male';
    if (normalized.startsWith('f')) return 'Female';
    return 'Other';
  }

  function buildCombinedAddress(street: string, city: string) {
    return [street.trim(), city.trim()].filter(Boolean).join(', ');
  }

  function isTransportEnabled(value: unknown) {
    const normalized = normalizeTextValue(value).toLowerCase();
    return ['allot', 'allotted', 'yes', 'true', 'assigned'].includes(normalized);
  }

  function parseSchoolDataImportRows(rows: Record<string, unknown>[]) {
    const validRows: SchoolDataImportRow[] = [];
    const invalidRows: InvalidSchoolDataImportRow[] = [];
    const uniqueClasses = new Map<string, SchoolImportClassPreview>();

    rows.forEach((row, index) => {
      const rowNumber = index + 2;
      const className = normalizeTextValue(getRowValue(row, ['cname', 'class', 'classname', 'class name']));
      const classSection = normalizeUpperText(getRowValue(row, ['stusection', 'section', 'class section', 'classsection']));
      const mappedRow: SchoolDataImportRow = {
        rowNumber,
        formNumber: normalizeTextValue(getRowValue(row, ['srno', 'form number', 'form no', 'form_no'])),
        formDate: normalizeDate(getRowValue(row, ['admsn_date', 'admission date', 'form date', 'formdate'])),
        admissionNumber: normalizeTextValue(getRowValue(row, ['reg_no', 'reg no', 'regno', 'admission number', 'admission no'])),
        name: normalizeTextValue(getRowValue(row, ['s_name', 'name', 'full name', 'student name'])),
        email: normalizeTextValue(getRowValue(row, ['email', 'email address'])),
        className,
        classSection,
        classLabel: buildClassLabel(className, classSection),
        academicYear: normalizeTextValue(getRowValue(row, ['stsession', 'academic year', 'academicyear', 'session'])),
        rollNumber: normalizeTextValue(getRowValue(row, ['roll_no', 'roll number', 'rollnumber', 'roll no', 'rollno'])),
        phone:
          normalizeTextValue(getRowValue(row, ['mobile_no', 'phone', 'mobile', 'phone number', 'contact'])) ||
          normalizeTextValue(getRowValue(row, ['mobile_no2', 'alternate mobile', 'phone 2'])),
        address:
          normalizeTextValue(getRowValue(row, ['address', 'student address'])) ||
          buildCombinedAddress(
            normalizeTextValue(getRowValue(row, ['streetorvillage', 'street', 'village'])),
            normalizeTextValue(getRowValue(row, ['city', 'town']))
          ),
        dateOfBirth: normalizeDate(getRowValue(row, ['d_birth', 'date of birth', 'dob', 'birth date'])),
        gender: normalizeGenderValue(getRowValue(row, ['sex', 'gender'])),
        aadharNumber: normalizeTextValue(getRowValue(row, ['adhar', 'adhaar', 'aadhar', 'aadhaar'])),
        religion: normalizeTextValue(getRowValue(row, ['stu_caste', 'religion'])),
        caste: normalizeTextValue(getRowValue(row, ['stu_category', 'caste', 'category'])),
        needsTransport: isTransportEnabled(getRowValue(row, ['transport', 'transport status'])),
        busConsent: isTransportEnabled(getRowValue(row, ['transport', 'transport status'])),
      };

      const missingFields: string[] = [];
      if (!mappedRow.name) missingFields.push('name');
      if (!mappedRow.className) missingFields.push('className');
      if (!mappedRow.classSection) missingFields.push('classSection');
      if (!mappedRow.rollNumber) missingFields.push('rollNumber');

      if (missingFields.length > 0) {
        invalidRows.push({ rowNumber, reason: `Missing required fields: ${missingFields.join(', ')}` });
        return;
      }

      validRows.push(mappedRow);
      uniqueClasses.set(buildClassKey(mappedRow.className, mappedRow.classSection), {
        name: mappedRow.className,
        section: mappedRow.classSection,
        label: mappedRow.classLabel,
      });
    });

    return { validRows, invalidRows, uniqueClasses: Array.from(uniqueClasses.values()) };
  }

  function buildGeneratedImportEmail(schoolId: string, row: Pick<SchoolDataImportRow, 'admissionNumber' | 'rollNumber'>, rowIndex: number) {
    const seed = normalizeTextValue(row.admissionNumber) || normalizeTextValue(row.rollNumber) || String(rowIndex + 1);
    const safeSeed = seed.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase() || `row-${rowIndex + 1}`;
    return `student-${schoolId}-${safeSeed}@import.local`;
  }

  function buildImportDuplicateReason(row: SchoolDataImportRow) {
    return row.admissionNumber
      ? `Student with admission number ${row.admissionNumber} already exists`
      : `Student ${row.name} already exists in ${row.classLabel} with roll number ${row.rollNumber}`;
  }

  function resizeImage(file: File, maxPx: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.onload = (evt) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Invalid image'));
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const scale = Math.min(maxPx / img.width, maxPx / img.height, 1);
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error('Canvas unsupported')); return; }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.src = evt.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function generateFormNumber(count: number) {
    const year = new Date().getFullYear();
    const seq = String(count + 1).padStart(4, '0');
    return `F-${year}-${seq}`;
  }

  function generateAdmissionNumber(count: number) {
    const year = new Date().getFullYear();
    const seq = String(count + 1).padStart(4, '0');
    return `ADM-${year}-${seq}`;
  }

  function escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ── State ────────────────────────────────────────────────────────────────────

  const today = new Date().toISOString().slice(0, 10);

  const emptyForm: AdmissionForm = {
    formNumber: '',
    formDate: today,
    admissionNumber: '',
    name: '',
    email: '',
    class: '',
    classSection: '',
    academicYear: '',
    rollNumber: '',
    phone: '',
    aadharNumber: '',
    fatherName: '',
    fatherPhone: '',
    fatherEmail: '',
    fatherAadharNumber: '',
    fatherAadharCardDocument: '',
    motherName: '',
    motherPhone: '',
    motherEmail: '',
    motherAadharNumber: '',
    motherAadharCardDocument: '',
    placeOfBirth: '',
    state: '',
    nationality: 'Indian',
    religion: '',
    address: '',
    pinCode: '',
    dateOfBirth: '',
    gender: '',
    caste: '',
    motherTongue: '',
    bloodGroup: '',
    identificationMarks: '',
    previousAcademicRecord: '',
    achievements: '',
    generalBehaviour: '',
    medicalHistory: '',
    languagePreferences: '',
    hasParentConsent: false,
    needsTransport: false,
    busConsent: false,
    photo: '',
    rteDocument: '',
    bodCertificate: '',
  };

  let formData = $state<AdmissionForm>({ ...emptyForm });
  let recentAdmissions = $state<Student[]>([]);
  let schoolClasses = $state<SchoolClassSummary[]>([]);
  let loading = $state(true);
  let saving = $state(false);
  let excelSaving = $state(false);
  let excelFileName = $state('');
  let excelAdmissions = $state<ParsedAdmissionRow[]>([]);
  let excelTotalRows = $state(0);
  let schoolDataImportLoading = $state(false);
  let schoolDataImportFileName = $state('');
  let schoolDataImportSheetName = $state('');
  let schoolDataImportRows = $state<SchoolDataImportRow[]>([]);
  let schoolDataImportTotalRows = $state(0);
  let schoolDataImportInvalidRows = $state<InvalidSchoolDataImportRow[]>([]);
  let schoolDataImportClassesToCreate = $state<string[]>([]);
  let schoolDataImportResult = $state<SchoolDataImportResult | null>(null);
  let error = $state('');
  let success = $state('');
  let photoPreview = $state('');
  let rteDocumentName = $state('');
  let bodCertificateName = $state('');
  let fatherAadharCardName = $state('');
  let motherAadharCardName = $state('');
  let idCardStudent = $state<Student | null>(null);
  let docModalStudent = $state<Student | null>(null);
  let docUploading = $state(false);
  let docModalError = $state('');
  let docModalSuccess = $state('');
  let docPatch = $state<Record<string, string>>({});
  let selectedClassFilter = $state('all');
  let statusFilter = $state<'all' | 'complete' | 'pending'>('all');
  let showTransportTerms = $state(false);
  let formOpen = $state(false);

  // schoolId from page data
  const schoolId = $derived($page.data.user?.schoolId ?? '');

  // ── Derived ──────────────────────────────────────────────────────────────────

  const classNameOptions = $derived.by(() => {
    const uniqueClassNames = new Set(
      schoolClasses.map((sc) => normalizeTextValue(sc.name)).filter(Boolean)
    );
    return Array.from(uniqueClassNames).sort((a, b) => a.localeCompare(b));
  });

  const classSectionOptions = $derived.by(() => {
    if (!formData.class) return [];
    const sections = new Set(
      schoolClasses
        .filter((sc) => normalizeTextValue(sc.name) === formData.class)
        .map((sc) => normalizeUpperText(sc.section))
        .filter(Boolean)
    );
    return Array.from(sections).sort((a, b) => a.localeCompare(b));
  });

  const newAdmissions = $derived(
    recentAdmissions.filter((s) => s.formNumber?.startsWith('F-'))
  );

  const classFilterOptions = $derived.by(() => {
    const unique = Array.from(new Set(newAdmissions.map((s) => s.class).filter(Boolean)));
    return unique.sort((a, b) => a.localeCompare(b));
  });

  const filteredAdmissions = $derived.by(() => {
    let list = selectedClassFilter === 'all'
      ? newAdmissions
      : newAdmissions.filter((s) => s.class === selectedClassFilter);
    if (statusFilter === 'complete') list = list.filter(isAdmissionComplete);
    if (statusFilter === 'pending') list = list.filter((s) => !isAdmissionComplete(s));
    return list;
  });

  const printableAdmissionCount = $derived(filteredAdmissions.filter(isAdmissionComplete).length);

  // ── Effects ──────────────────────────────────────────────────────────────────

  // Auto-generate form/admission numbers when admissions list changes
  $effect(() => {
    const count = recentAdmissions.length;
    formData.formNumber = generateFormNumber(count);
    formData.admissionNumber = generateAdmissionNumber(count);
  });

  // Reset classSection when class changes and section no longer valid
  $effect(() => {
    if (classSectionOptions.length === 0) return;
    if (!classSectionOptions.includes(formData.classSection)) {
      formData.classSection = '';
    }
  });

  // ── School session info from page data ───────────────────────────────────────
  const schoolDisplayName = $derived($page.data.user?.schoolName ?? 'School');
  const schoolLogo = $derived($page.data.user?.schoolLogo ?? '');
  const schoolPhone = $derived($page.data.user?.schoolPhone ?? '');
  const schoolEmail = $derived($page.data.user?.schoolEmail ?? '');
  const schoolAddress = $derived($page.data.user?.schoolAddress ?? '');
  const schoolWebsite = $derived($page.data.user?.schoolWebsite ?? '');

  // ── API calls ────────────────────────────────────────────────────────────────

  async function fetchAdmissions() {
    try {
      loading = true;
      error = '';

      const sid = $page.data.user?.schoolId;
      if (!sid) {
        error = 'School not found. Please log in again.';
        recentAdmissions = [];
        schoolClasses = [];
        return;
      }

      const [studentsRes, classesRes] = await Promise.all([
        fetch(`/api/students/${sid}`),
        fetch(`/api/classes/${sid}`),
      ]);

      if (!studentsRes.ok) throw new Error(`Failed to load admissions (${studentsRes.status})`);
      if (!classesRes.ok) throw new Error(`Failed to load classes (${classesRes.status})`);

      const admissionsData = await studentsRes.json().catch(() => []);
      const classesData = await classesRes.json().catch(() => []);
      recentAdmissions = Array.isArray(admissionsData) ? admissionsData : [];
      schoolClasses = Array.isArray(classesData) ? classesData : [];
    } catch (err) {
      console.error('Fetch admissions error:', err);
      recentAdmissions = [];
      schoolClasses = [];
      error = err instanceof Error ? err.message : 'Failed to fetch admissions';
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    fetchAdmissions();
  });

  // ── Doc modal ────────────────────────────────────────────────────────────────

  function openDocModal(student: Student) {
    docModalStudent = student;
    docPatch = {};
    docModalError = '';
    docModalSuccess = '';
  }

  async function handleDocFileSelect(field: string, file: File) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    docPatch = { ...docPatch, [field]: dataUrl };
  }

  async function saveDocModal() {
    if (!docModalStudent) return;
    if (Object.keys(docPatch).length === 0) {
      docModalError = 'No files selected.';
      return;
    }
    try {
      docUploading = true;
      docModalError = '';
      const res = await fetch(`/api/students/${docModalStudent._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(docPatch),
      });
      if (!res.ok) throw new Error('Failed to save documents');
      docModalSuccess = 'Documents saved successfully.';
      // update local ref
      const updatedFields = Object.fromEntries(Object.entries(docPatch).map(([k]) => [k, 'uploaded']));
      docModalStudent = { ...docModalStudent, ...updatedFields };
      docPatch = {};
      await fetchAdmissions();
    } catch (err) {
      docModalError = err instanceof Error ? err.message : 'Upload failed';
    } finally {
      docUploading = false;
    }
  }

  // ── Form submit ──────────────────────────────────────────────────────────────

  async function handleSubmit(e: Event) {
    e.preventDefault();

    if (!formData.hasParentConsent) {
      error = 'Parent consent form is required.';
      return;
    }
    if (!formData.needsTransport && !formData.busConsent) {
      error = 'Parent consent for not taking school bus is required.';
      return;
    }

    try {
      saving = true;
      error = '';
      success = '';

      const sid = $page.data.user?.schoolId;
      if (!sid) {
        error = 'School not found. Please log in again.';
        return;
      }

      const payload = {
        formNumber: formData.formNumber,
        formDate: formData.formDate,
        admissionNumber: formData.admissionNumber,
        name: formData.name,
        email: formData.email,
        class: formData.class,
        classSection: formData.classSection,
        academicYear: formData.academicYear,
        rollNumber: formData.rollNumber,
        phone: formData.phone,
        aadharNumber: formData.aadharNumber,
        father_name: formData.fatherName,
        fatherPhone: formData.fatherPhone,
        fatherEmail: formData.fatherEmail,
        fatherAadharNumber: formData.fatherAadharNumber,
        fatherAadharCardDocument: formData.fatherAadharCardDocument || undefined,
        mother_name: formData.motherName,
        motherPhone: formData.motherPhone,
        motherEmail: formData.motherEmail,
        motherAadharNumber: formData.motherAadharNumber,
        motherAadharCardDocument: formData.motherAadharCardDocument || undefined,
        placeOfBirth: formData.placeOfBirth,
        state: formData.state,
        nationality: formData.nationality,
        religion: formData.religion,
        address: formData.address,
        pinCode: formData.pinCode,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        caste: formData.caste,
        motherTongue: formData.motherTongue,
        bloodGroup: formData.bloodGroup,
        identificationMarks: formData.identificationMarks,
        previousAcademicRecord: formData.previousAcademicRecord,
        achievements: formData.achievements,
        generalBehaviour: formData.generalBehaviour,
        medicalHistory: formData.medicalHistory,
        languagePreferences: formData.languagePreferences.split(',').map((v) => v.trim()).filter(Boolean),
        hasParentConsent: formData.hasParentConsent,
        needsTransport: formData.needsTransport,
        busConsent: formData.busConsent,
        photo: formData.photo || undefined,
        rteDocument: formData.rteDocument || undefined,
        bodCertificate: formData.bodCertificate || undefined,
        schoolId: sid,
      };

      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to admit student');

      success = 'Student admitted successfully.';
      photoPreview = '';
      bodCertificateName = '';
      rteDocumentName = '';
      fatherAadharCardName = '';
      motherAadharCardName = '';
      formData = { ...emptyForm, formDate: new Date().toISOString().slice(0, 10) };
      await fetchAdmissions();
    } catch (err) {
      console.error('Admission save error:', err);
      error = err instanceof Error ? err.message : 'Failed to admit student';
    } finally {
      saving = false;
    }
  }

  // ── Excel import ─────────────────────────────────────────────────────────────

  async function handleExcelFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      excelSaving = true;
      error = '';
      success = '';
      excelFileName = file.name;
      excelAdmissions = [];
      excelTotalRows = 0;

      const XLSX = await import('xlsx');
      const fileBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(fileBuffer, { type: 'array', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) { error = 'Excel file is empty.'; return; }

      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });

      if (rows.length === 0) { error = 'No rows found in the uploaded file.'; return; }

      const admissions = parseAdmissionRows(rows);
      excelTotalRows = rows.length;

      if (admissions.length === 0) {
        error = 'No valid rows found. Required columns: name, email, class, rollNumber.';
        return;
      }

      excelAdmissions = admissions;
      success = `Excel preview ready. ${admissions.length} valid student row(s) found.`;
    } catch (err) {
      console.error('Excel preview error:', err);
      error = err instanceof Error ? err.message : 'Failed to read Excel file';
    } finally {
      input.value = '';
      excelSaving = false;
    }
  }

  async function handleExcelEnroll() {
    if (excelAdmissions.length === 0) {
      error = 'Please upload an Excel file and preview student rows first.';
      return;
    }

    try {
      excelSaving = true;
      error = '';
      success = '';

      const sid = $page.data.user?.schoolId;
      if (!sid) { error = 'School not found. Please log in again.'; return; }

      const requests = excelAdmissions.map((student) =>
        fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...student, schoolId: sid }),
        })
      );

      const results = await Promise.allSettled(requests);
      const failedMessages: string[] = [];
      let successCount = 0;

      for (const result of results) {
        if (result.status === 'fulfilled') {
          if (result.value.ok) {
            successCount += 1;
          } else {
            const responseData = await result.value.json().catch(() => null);
            failedMessages.push(responseData?.message || 'Failed to create one student');
          }
        } else {
          failedMessages.push('Network error while creating one student');
        }
      }

      const failedCount = excelAdmissions.length - successCount;
      if (failedCount === 0) {
        success = `Excel admission completed. ${successCount} students enrolled.`;
        excelAdmissions = [];
        excelFileName = '';
        excelTotalRows = 0;
      } else {
        const details = failedMessages.slice(0, 3).join(' | ');
        error = `Excel admission finished with issues. Success: ${successCount}, Failed: ${failedCount}. ${details}`;
      }

      await fetchAdmissions();
    } catch (err) {
      console.error('Excel admission error:', err);
      error = err instanceof Error ? err.message : 'Failed to process Excel admissions';
    } finally {
      excelSaving = false;
    }
  }

  // ── School data import ───────────────────────────────────────────────────────

  function clearSchoolDataImportPreview() {
    schoolDataImportFileName = '';
    schoolDataImportSheetName = '';
    schoolDataImportRows = [];
    schoolDataImportTotalRows = 0;
    schoolDataImportInvalidRows = [];
    schoolDataImportClassesToCreate = [];
    schoolDataImportResult = null;
  }

  async function handleSchoolDataFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      schoolDataImportLoading = true;
      error = '';
      success = '';
      schoolDataImportResult = null;
      clearSchoolDataImportPreview();

      const sid = $page.data.user?.schoolId;
      if (!sid) { error = 'School not found. Please log in again.'; return; }

      const XLSX = await import('xlsx');
      const fileBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(fileBuffer, { type: 'array', cellDates: true });

      // Find first non-empty sheet
      let selectedSheet: { sheetName: string; rows: Record<string, unknown>[] } | null = null;
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });
        if (rows.length > 0) { selectedSheet = { sheetName, rows }; break; }
      }

      if (!selectedSheet) { error = 'Excel file is empty.'; return; }

      const { validRows, invalidRows, uniqueClasses } = parseSchoolDataImportRows(selectedSheet.rows);
      schoolDataImportFileName = file.name;
      schoolDataImportSheetName = selectedSheet.sheetName;
      schoolDataImportRows = validRows;
      schoolDataImportTotalRows = selectedSheet.rows.length;
      schoolDataImportInvalidRows = invalidRows;

      if (validRows.length === 0) { error = 'No valid rows found for school data import.'; return; }

      let classesToCreate = uniqueClasses.map((sc) => sc.label);

      try {
        const classRes = await fetch(`/api/classes/${sid}`);
        if (classRes.ok) {
          const classData = (await classRes.json()) as SchoolClassSummary[];
          const existingClassKeys = new Set(
            (Array.isArray(classData) ? classData : []).map((sc) =>
              buildClassKey(sc.name || '', sc.section || '')
            )
          );
          classesToCreate = uniqueClasses
            .filter((sc) => !existingClassKeys.has(buildClassKey(sc.name, sc.section)))
            .map((sc) => sc.label);
        }
      } catch (classError) {
        console.warn('Failed to fetch existing classes for preview:', classError);
      }

      schoolDataImportClassesToCreate = classesToCreate;
      success = `School data preview ready. ${validRows.length} valid student row(s) found in ${selectedSheet.sheetName}.`;
    } catch (err) {
      console.error('School data import preview error:', err);
      error = err instanceof Error ? err.message : 'Failed to read school data file';
    } finally {
      input.value = '';
      schoolDataImportLoading = false;
    }
  }

  async function handleSchoolDataImport() {
    if (schoolDataImportRows.length === 0) {
      error = 'Please upload a school data file and preview rows first.';
      return;
    }

    try {
      schoolDataImportLoading = true;
      error = '';
      success = '';
      schoolDataImportResult = null;

      const sid = $page.data.user?.schoolId;
      if (!sid) { error = 'School not found. Please log in again.'; return; }

      let result: SchoolDataImportResult | null = null;
      let shouldTryLegacyFallback = false;

      try {
        const res = await fetch('/api/students/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schoolId: sid, rows: schoolDataImportRows, duplicateMode: 'skip' }),
        });

        const data = await res.json().catch(() => null);
        if (res.ok && data?.success && data?.data) {
          result = data.data as SchoolDataImportResult;
        } else if (res.status === 404) {
          shouldTryLegacyFallback = true;
        } else {
          throw new Error(data?.message || 'Failed to import school data');
        }
      } catch (bulkImportError) {
        if (bulkImportError instanceof Error && /Cannot POST|404|Failed to fetch|NetworkError/i.test(bulkImportError.message)) {
          shouldTryLegacyFallback = true;
        } else {
          throw bulkImportError;
        }
      }

      if (!result && shouldTryLegacyFallback) {
        const [classRes, studentRes] = await Promise.all([
          fetch(`/api/classes/${sid}`),
          fetch(`/api/students/${sid}`),
        ]);

        if (!classRes.ok) throw new Error(`Failed to load classes (${classRes.status})`);
        if (!studentRes.ok) throw new Error(`Failed to load students (${studentRes.status})`);

        const existingClasses = (await classRes.json()) as SchoolClassSummary[];
        const existingStudents = (await studentRes.json()) as Student[];

        const existingClassKeys = new Set(
          (Array.isArray(existingClasses) ? existingClasses : []).map((sc) =>
            buildClassKey(sc.name || '', sc.section || '')
          )
        );

        const existingStudentsByAdmission = new Set(
          (Array.isArray(existingStudents) ? existingStudents : [])
            .map((s) => normalizeTextValue(s.admissionNumber))
            .filter(Boolean)
        );

        const existingStudentsByComposite = new Set(
          (Array.isArray(existingStudents) ? existingStudents : []).map((s) =>
            [normalizeTextValue(s.class), normalizeTextValue(s.rollNumber), normalizeTextValue(s.name).toLowerCase()].join('::')
          )
        );

        const classesCreated: string[] = [];
        const duplicates: InvalidSchoolDataImportRow[] = [];
        const failures: InvalidSchoolDataImportRow[] = [];
        let importedCount = 0;

        for (const row of schoolDataImportRows) {
          const classKey = buildClassKey(row.className, row.classSection);
          if (!existingClassKeys.has(classKey)) {
            const createClassRes = await fetch('/api/classes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: row.className, section: row.classSection, academicYear: row.academicYear, schoolId: sid }),
            });

            const createClassData = await createClassRes.json().catch(() => null);
            if (!createClassRes.ok && createClassData?.message !== 'This class and section already exist') {
              failures.push({ rowNumber: row.rowNumber, reason: createClassData?.message || `Failed to create class ${row.classLabel}` });
              continue;
            }

            existingClassKeys.add(classKey);
            if (!classesCreated.includes(row.classLabel)) classesCreated.push(row.classLabel);
          }

          const normalizedAdmissionNumber = normalizeTextValue(row.admissionNumber);
          const compositeKey = [normalizeTextValue(row.classLabel), normalizeTextValue(row.rollNumber), normalizeTextValue(row.name).toLowerCase()].join('::');

          if (
            (normalizedAdmissionNumber && existingStudentsByAdmission.has(normalizedAdmissionNumber)) ||
            existingStudentsByComposite.has(compositeKey)
          ) {
            duplicates.push({ rowNumber: row.rowNumber, reason: buildImportDuplicateReason(row) });
            continue;
          }

          const createStudentRes = await fetch('/api/students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              formNumber: row.formNumber,
              formDate: row.formDate,
              admissionNumber: row.admissionNumber,
              name: row.name,
              email: row.email || buildGeneratedImportEmail(sid, row, row.rowNumber - 2),
              class: row.classLabel,
              classSection: row.classSection,
              academicYear: row.academicYear,
              rollNumber: row.rollNumber,
              phone: row.phone,
              aadharNumber: row.aadharNumber,
              gender: row.gender,
              dateOfBirth: row.dateOfBirth,
              religion: row.religion,
              caste: row.caste,
              address: row.address,
              needsTransport: row.needsTransport,
              busConsent: row.busConsent,
              schoolId: sid,
            }),
          });

          const createStudentData = await createStudentRes.json().catch(() => null);
          if (!createStudentRes.ok) {
            failures.push({ rowNumber: row.rowNumber, reason: createStudentData?.message || 'Failed to import student' });
            continue;
          }

          importedCount += 1;
          if (normalizedAdmissionNumber) existingStudentsByAdmission.add(normalizedAdmissionNumber);
          existingStudentsByComposite.add(compositeKey);
        }

        result = {
          totalRows: schoolDataImportRows.length,
          validRows: schoolDataImportRows.length,
          invalidRows: schoolDataImportInvalidRows,
          classesCreated,
          importedCount,
          duplicateCount: duplicates.length,
          duplicates,
          failureCount: failures.length,
          failures,
        };
      }

      if (!result) throw new Error('Failed to import school data');

      schoolDataImportResult = result;

      const summaryParts = [
        `${result.importedCount} student(s) imported`,
        `${result.classesCreated.length} class(es) created`,
        `${result.duplicateCount} duplicate(s) skipped`,
      ];
      if (result.failureCount > 0) summaryParts.push(`${result.failureCount} failed`);
      if (result.invalidRows.length > 0) summaryParts.push(`${result.invalidRows.length} invalid row(s)`);

      success = `School data import finished: ${summaryParts.join(', ')}.`;
      await fetchAdmissions();
    } catch (err) {
      console.error('School data import error:', err);
      error = err instanceof Error ? err.message : 'Failed to import school data';
    } finally {
      schoolDataImportLoading = false;
    }
  }

  // ── File select handlers ─────────────────────────────────────────────────────

  async function handlePhotoSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImage(file, 250);
      photoPreview = dataUrl;
      formData.photo = dataUrl;
    } catch {
      error = 'Failed to process photo. Please try a different image.';
    }
    input.value = '';
  }

  async function handleRteDocumentSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToBase64(file);
      rteDocumentName = file.name;
      formData.rteDocument = dataUrl;
    } catch {
      error = 'Failed to process RTE document. Please try again.';
    }
    input.value = '';
  }

  async function handleBodCertificateSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToBase64(file);
      bodCertificateName = file.name;
      formData.bodCertificate = dataUrl;
    } catch {
      error = 'Failed to process BOD Certificate. Please try again.';
    }
    input.value = '';
  }

  async function handleParentAadharCardSelect(e: Event, field: 'fatherAadharCardDocument' | 'motherAadharCardDocument') {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToBase64(file);
      if (field === 'fatherAadharCardDocument') fatherAadharCardName = file.name;
      else motherAadharCardName = file.name;
      formData[field] = dataUrl;
    } catch {
      error = 'Failed to process parent Aadhaar card. Please try again.';
    }
    input.value = '';
  }

  // ── Transport consent ────────────────────────────────────────────────────────

  function downloadTransportConsentForm() {
    alert('PDF: use browser print');
  }

  function acceptTransportTerms() {
    formData.busConsent = true;
    showTransportTerms = false;
  }

  // ── ID card printing ─────────────────────────────────────────────────────────

  function renderCardHtml(
    student: Student,
    sName: string,
    sLogo: string,
    info: { address: string; phone: string; email: string; website: string }
  ) {
    const photoHtml = student.photo
      ? `<img src="${student.photo}" style="width:64px;height:80px;object-fit:cover;border-radius:6px;" />`
      : `<div style="width:64px;height:80px;background:#e5e7eb;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:28px;">&#128100;</div>`;
    const logoHtml = sLogo
      ? `<img src="${sLogo}" style="width:28px;height:28px;object-fit:cover;border-radius:50%;border:1px solid rgba(255,255,255,.45);" />`
      : `<div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.2);font-size:14px;">&#127979;</div>`;

    return `
      <article class="card">
        <div class="hd">${logoHtml}<div><h2>Student Identity Card</h2><p>${escapeHtml(sName)}</p></div></div>
        <div class="bd">
          <div>${photoHtml}</div>
          <div class="info">
            <p class="name">${escapeHtml(student.name)}</p>
            <p>Class: ${escapeHtml(student.class)}${student.classSection ? ` ${escapeHtml(student.classSection)}` : ''}</p>
            <p>Roll No: ${escapeHtml(student.rollNumber)}</p>
            <p>Admission No: ${escapeHtml(student.admissionNumber ?? '-')}</p>
            <p>DOB: ${escapeHtml(student.dateOfBirth ?? '-')}</p>
            <p>Blood Group: ${escapeHtml(student.bloodGroup ?? '-')}</p>
          </div>
        </div>
        <div class="ft"><p>If found, please return to school office</p></div>
      </article>
      <article class="card">
        <div class="hd">${logoHtml}<div><h2>School Information</h2><p>${escapeHtml(sName)}</p></div></div>
        <div class="back">
          <p><strong>Address:</strong> ${escapeHtml(info.address || '-')}</p>
          <p><strong>Phone:</strong> ${escapeHtml(info.phone || '-')}</p>
          <p><strong>Email:</strong> ${escapeHtml(info.email || '-')}</p>
          <p><strong>Website:</strong> ${escapeHtml(info.website || '-')}</p>
          <p><strong>Student:</strong> ${escapeHtml(student.name)} (${escapeHtml(student.admissionNumber ?? '-')})</p>
        </div>
        <div class="ft"><p>This card belongs to ${escapeHtml(student.name)}</p></div>
      </article>
    `;
  }

  function printIdCard() {
    if (!idCardStudent) return;
    if (!isAdmissionComplete(idCardStudent)) {
      error = 'ID card is available only after admission is completed.';
      return;
    }
    const student = idCardStudent;
    const sName = schoolDisplayName;
    const sLogo = schoolLogo;
    const sAddress = schoolAddress;
    const sPhone = schoolPhone;
    const sEmail = schoolEmail;
    const sWebsite = schoolWebsite;

    const photoHtml = student.photo
      ? `<img src="${student.photo}" style="width:80px;height:100px;object-fit:cover;border-radius:6px;" />`
      : `<div style="width:80px;height:100px;background:#e5e7eb;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:36px;">&#128100;</div>`;
    const logoHtml = sLogo
      ? `<img src="${sLogo}" style="width:34px;height:34px;object-fit:cover;border-radius:50%;border:1px solid rgba(255,255,255,.45);" />`
      : `<div style="width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.2);font-size:16px;">&#127979;</div>`;

    const win = window.open('', '_blank', 'width=540,height=440');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>ID Card - ${student.name}</title>
<style>
  body{margin:20px;font-family:Arial,sans-serif;}
  .sheet{display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:760px;}
  .card{width:340px;border:2px solid #1d4ed8;border-radius:12px;overflow:hidden;background:#fff;}
  .hd{background:#1d4ed8;color:white;padding:8px 12px;display:flex;align-items:center;gap:8px;}
  .hdcopy h2{margin:0;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;line-height:1.1;}
  .hdcopy p{margin:2px 0 0;font-size:11px;opacity:.92;line-height:1.2;}
  .bd{display:flex;padding:12px;gap:12px;align-items:flex-start;}
  .info .name{font-size:14px;font-weight:700;margin:0 0 5px;}
  .info p{margin:2px 0;font-size:11px;color:#374151;}
  .ft{background:#eff6ff;border-top:1px solid #bfdbfe;text-align:center;padding:5px;}
  .ft p{margin:0;font-size:10px;color:#6b7280;}
  .back{padding:12px;min-height:154px;}
  .back h3{margin:0 0 8px;font-size:12px;color:#1d4ed8;text-transform:uppercase;letter-spacing:1px;}
  .back p{margin:0 0 6px;font-size:11px;color:#374151;line-height:1.3;}
  .back .label{font-weight:700;color:#0f172a;}
</style></head><body>
<div class="sheet">
  <div class="card">
    <div class="hd">${logoHtml}<div class="hdcopy"><h2>Student Identity Card</h2><p>${sName}</p></div></div>
    <div class="bd">
      <div>${photoHtml}</div>
      <div class="info">
        <p class="name">${student.name}</p>
        <p>Class: ${student.class}${student.classSection ? ' ' + student.classSection : ''}</p>
        <p>Roll No: ${student.rollNumber}</p>
        <p>Admission No: ${student.admissionNumber ?? '-'}</p>
        <p>Date of Birth: ${student.dateOfBirth ?? '-'}</p>
        <p>Blood Group: ${student.bloodGroup ?? '-'}</p>
      </div>
    </div>
    <div class="ft"><p>If found, please return to the school office</p></div>
  </div>
  <div class="card">
    <div class="hd">${logoHtml}<div class="hdcopy"><h2>School Information</h2><p>${sName}</p></div></div>
    <div class="back">
      <h3>Back Side</h3>
      <p><span class="label">Address:</span> ${escapeHtml(sAddress || '-')}</p>
      <p><span class="label">Phone:</span> ${escapeHtml(sPhone || '-')}</p>
      <p><span class="label">Email:</span> ${escapeHtml(sEmail || '-')}</p>
      <p><span class="label">Website:</span> ${escapeHtml(sWebsite || '-')}</p>
      <p><span class="label">Student:</span> ${escapeHtml(student.name)} (${escapeHtml(student.admissionNumber ?? '-')})</p>
    </div>
    <div class="ft"><p>This card belongs to ${escapeHtml(student.name)}</p></div>
  </div>
</div>
<script>window.onload=function(){window.print();};<\/script>
</body></html>`);
    win.document.close();
  }

  function printFilteredIdCards() {
    const printableAdmissions = filteredAdmissions.filter(isAdmissionComplete);
    if (printableAdmissions.length === 0) {
      error = 'No completed admissions available for ID card printing.';
      return;
    }

    const sName = schoolDisplayName;
    const win = window.open('', '_blank', 'width=960,height=760');
    if (!win) return;

    const cardsHtml = printableAdmissions
      .map((s) => renderCardHtml(s, sName, schoolLogo, {
        address: schoolAddress, phone: schoolPhone, email: schoolEmail, website: schoolWebsite,
      }))
      .join('');

    win.document.write(`<!DOCTYPE html><html><head><title>Student ID Cards</title>
      <style>
        @page { size: A4 portrait; margin: 10mm; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Arial, sans-serif; }
        .sheet { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 10mm; }
        .card { border: 2px solid #1d4ed8; border-radius: 10px; overflow: hidden; break-inside: avoid; page-break-inside: avoid; }
        .hd { background: #1d4ed8; color: white; display: flex; align-items: center; gap: 6px; padding: 6px 10px; }
        .hd h2 { margin: 0; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; }
        .hd p { margin: 2px 0 0; font-size: 9px; opacity: 0.85; }
        .bd { display: flex; gap: 10px; padding: 10px; align-items: flex-start; min-height: 100px; }
        .info .name { margin: 0 0 4px; font-size: 12px; font-weight: 700; }
        .info p { margin: 2px 0; font-size: 9px; color: #374151; }
        .back { padding: 10px; min-height: 100px; }
        .back p { margin: 0 0 4px; font-size: 9px; color: #374151; }
        .ft { background: #eff6ff; border-top: 1px solid #bfdbfe; text-align: center; padding: 4px; }
        .ft p { margin: 0; font-size: 8px; color: #6b7280; }
        .card:nth-of-type(4n) { break-after: page; page-break-after: always; }
        .card:last-of-type { break-after: auto; page-break-after: auto; }
      </style>
    </head><body>
      <section class="sheet">${cardsHtml}</section>
      <script>window.onload=function(){window.print();};<\/script>
    </body></html>`);
    win.document.close();
  }
</script>

<!-- ── Template ─────────────────────────────────────────────────────────────── -->

<div class="space-y-6">

  <!-- New Admission collapsible form -->
  <div class="stat-card p-6">
    <button
      type="button"
      class="flex w-full items-center gap-2 text-left"
      onclick={() => (formOpen = !formOpen)}
    >
      <!-- UserPlus icon -->
      <svg class="w-5 h-5 text-blue-600 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
      </svg>
      <h3 class="text-lg font-semibold flex-1">New Admission</h3>
      {#if formOpen}
        <!-- ChevronDown -->
        <svg class="w-5 h-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      {:else}
        <!-- ChevronRight -->
        <svg class="w-5 h-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      {/if}
    </button>

    {#if formOpen}
      {#if success}<p class="text-green-600 text-sm mt-4">{success}</p>{/if}
      {#if error}<p class="text-red-600 text-sm mt-4">{error}</p>{/if}

      <form onsubmit={handleSubmit} class="space-y-4 mt-4">

        <!-- FormSection: Admission and Student Details -->
        <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div class="mb-4 border-b border-slate-100 pb-3">
            <h4 class="text-base font-semibold text-slate-900">Admission and Student Details</h4>
            <p class="mt-1 text-sm text-slate-500">Basic registration, class details, and the student's personal information.</p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label class="space-y-1 text-sm text-slate-700">
              <span class="text-xs font-medium">Form Number</span>
              <input
                type="text"
                readonly
                class="w-full border rounded p-2 bg-gray-50 text-gray-600 cursor-not-allowed"
                value={formData.formNumber}
              />
              <span class="text-xs text-muted-foreground">Auto-generated</span>
            </label>
            <label class="space-y-1 text-sm text-slate-700">
              <span class="text-xs font-medium">Form Date</span>
              <input
                type="date"
                class="w-full border rounded p-2"
                bind:value={formData.formDate}
              />
            </label>
            <label class="space-y-1 text-sm text-slate-700">
              <span class="text-xs font-medium">Admission Number</span>
              <input
                type="text"
                readonly
                class="w-full border rounded p-2 bg-gray-50 text-gray-600 cursor-not-allowed font-medium"
                value={formData.admissionNumber}
              />
              <span class="text-xs text-muted-foreground">Permanent — auto-generated</span>
            </label>
            <label class="space-y-1 text-sm text-slate-700">
              <span class="text-xs font-medium">Full Name</span>
              <input
                type="text"
                placeholder="Full Name"
                class="w-full border rounded p-2"
                bind:value={formData.name}
                required
              />
            </label>
            <label class="space-y-1 text-sm text-slate-700">
              <span class="text-xs font-medium">Email</span>
              <input
                type="email"
                placeholder="Email"
                class="w-full border rounded p-2"
                bind:value={formData.email}
                required
              />
            </label>
            <label class="space-y-1 text-sm text-slate-700">
              <span class="text-xs font-medium">Class</span>
              <select
                class="w-full border rounded p-2"
                bind:value={formData.class}
                onchange={() => { formData.classSection = ''; }}
                required
              >
                <option value="">Select Class</option>
                {#each classNameOptions as className (className)}
                  <option value={className}>{className}</option>
                {/each}
              </select>
            </label>
            <label class="space-y-1 text-sm text-slate-700">
              <span class="text-xs font-medium">Section</span>
              {#if classSectionOptions.length > 0}
                <select
                  class="w-full border rounded p-2"
                  bind:value={formData.classSection}
                >
                  <option value="">Select Section</option>
                  {#each classSectionOptions as section (section)}
                    <option value={section}>{section}</option>
                  {/each}
                </select>
              {:else}
                <input
                  type="text"
                  placeholder="Section"
                  class="w-full border rounded p-2"
                  bind:value={formData.classSection}
                />
              {/if}
            </label>
            <label class="space-y-1 text-sm text-slate-700">
              <span class="text-xs font-medium">Academic Year</span>
              <input
                type="text"
                placeholder="Academic Year (e.g. 2026-2027)"
                class="w-full border rounded p-2"
                bind:value={formData.academicYear}
              />
            </label>
            <label class="space-y-1 text-sm text-slate-700">
              <span class="text-xs font-medium">Roll Number</span>
              <input
                type="text"
                placeholder="Roll Number"
                class="w-full border rounded p-2"
                bind:value={formData.rollNumber}
                required
              />
            </label>
            <label class="space-y-1 text-sm text-slate-700">
              <span class="text-xs font-medium">Phone</span>
              <input
                type="tel"
                placeholder="Phone"
                class="w-full border rounded p-2"
                bind:value={formData.phone}
              />
            </label>
            <label class="space-y-1 text-sm text-slate-700">
              <span class="text-xs font-medium">Aadhar Number</span>
              <input
                type="text"
                placeholder="Aadhar Number"
                class="w-full border rounded p-2"
                bind:value={formData.aadharNumber}
              />
            </label>
            <label class="space-y-1 text-sm text-slate-700">
              <span class="text-xs font-medium">Gender</span>
              <select class="w-full border rounded p-2" bind:value={formData.gender}>
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label class="space-y-1 text-sm text-slate-700">
              <span class="text-xs font-medium">Date Of Birth</span>
              <input type="date" class="w-full border rounded p-2" bind:value={formData.dateOfBirth} />
            </label>
            <div class="space-y-1 text-sm text-slate-700">
              <span class="text-xs font-medium">Date of Birth Certificate</span>
              <div class="border rounded p-2 bg-gray-50">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onchange={handleBodCertificateSelect}
                  class="block text-sm text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {#if bodCertificateName}
                  <div class="mt-2 flex items-center justify-between bg-blue-50 p-1.5 rounded">
                    <p class="text-xs text-gray-700">&#10003; {bodCertificateName}</p>
                    <button
                      type="button"
                      class="text-xs text-red-500 hover:underline"
                      onclick={() => { bodCertificateName = ''; formData.bodCertificate = ''; }}
                    >Remove</button>
                  </div>
                {/if}
                <p class="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX, JPG, or PNG</p>
              </div>
            </div>
            <label class="space-y-1 text-sm text-slate-700">
              <span class="text-xs font-medium">Place Of Birth</span>
              <input type="text" placeholder="Place of Birth" class="w-full border rounded p-2" bind:value={formData.placeOfBirth} />
            </label>
            <label class="space-y-1 text-sm text-slate-700">
              <span class="text-xs font-medium">State</span>
              <input type="text" placeholder="State" class="w-full border rounded p-2" bind:value={formData.state} />
            </label>
            <label class="space-y-1 text-sm text-slate-700">
              <span class="text-xs font-medium">Nationality</span>
              <input type="text" placeholder="Nationality" class="w-full border rounded p-2" bind:value={formData.nationality} />
            </label>
            <label class="space-y-1 text-sm text-slate-700">
              <span class="text-xs font-medium">Religion</span>
              <input type="text" placeholder="Religion" class="w-full border rounded p-2" bind:value={formData.religion} />
            </label>
            <label class="space-y-1 text-sm text-slate-700">
              <span class="text-xs font-medium">Caste</span>
              <input type="text" placeholder="Caste" class="w-full border rounded p-2" bind:value={formData.caste} />
            </label>
            <label class="space-y-1 text-sm text-slate-700">
              <span class="text-xs font-medium">Pin Code</span>
              <input type="text" placeholder="Pin Code" class="w-full border rounded p-2" bind:value={formData.pinCode} />
            </label>
            <label class="space-y-1 text-sm text-slate-700">
              <span class="text-xs font-medium">Mother Tongue</span>
              <input type="text" placeholder="Mother Tongue" class="w-full border rounded p-2" bind:value={formData.motherTongue} />
            </label>
            <label class="space-y-1 text-sm text-slate-700">
              <span class="text-xs font-medium">Blood Group</span>
              <input type="text" placeholder="Blood Group" class="w-full border rounded p-2" bind:value={formData.bloodGroup} />
            </label>
          </div>
        </section>

        <!-- FormSection: Parent Details -->
        <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div class="mb-4 border-b border-slate-100 pb-3">
            <h4 class="text-base font-semibold text-slate-900">Parent Details</h4>
            <p class="mt-1 text-sm text-slate-500">Add father and mother names with their phone numbers, emails, and Aadhaar details.</p>
          </div>
          <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <!-- Father Details -->
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h5 class="mb-3 text-sm font-semibold text-slate-900">Father Details</h5>
              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label class="space-y-1 text-sm text-slate-700 md:col-span-2">
                  <span class="text-xs font-medium">Father Name</span>
                  <input type="text" placeholder="Father Name" class="w-full border rounded p-2" bind:value={formData.fatherName} />
                </label>
                <label class="space-y-1 text-sm text-slate-700">
                  <span class="text-xs font-medium">Father Contact Number</span>
                  <input type="tel" placeholder="Father Contact Number" class="w-full border rounded p-2" bind:value={formData.fatherPhone} />
                </label>
                <label class="space-y-1 text-sm text-slate-700">
                  <span class="text-xs font-medium">Father Email</span>
                  <input type="email" placeholder="father@example.com" class="w-full border rounded p-2" bind:value={formData.fatherEmail} />
                </label>
                <label class="space-y-1 text-sm text-slate-700 md:col-span-2">
                  <span class="text-xs font-medium">Father Aadhaar Number</span>
                  <input type="text" placeholder="Father Aadhaar Number" class="w-full border rounded p-2" bind:value={formData.fatherAadharNumber} />
                </label>
                <div class="space-y-1 text-sm text-slate-700 md:col-span-2">
                  <span class="text-xs font-medium">Father Aadhaar Card Upload</span>
                  <div class="rounded border bg-white p-2">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onchange={(e) => handleParentAadharCardSelect(e, 'fatherAadharCardDocument')}
                      class="block text-sm text-gray-500 file:mr-3 file:rounded file:border-0 file:bg-blue-50 file:px-3 file:py-1 file:text-sm file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {#if fatherAadharCardName}
                      <div class="mt-2 flex items-center justify-between rounded bg-blue-50 p-2">
                        <p class="text-xs text-gray-700">Uploaded: {fatherAadharCardName}</p>
                        <button
                          type="button"
                          class="text-xs text-red-500 hover:underline"
                          onclick={() => { fatherAadharCardName = ''; formData.fatherAadharCardDocument = ''; }}
                        >Remove</button>
                      </div>
                    {/if}
                    <p class="mt-1 text-xs text-muted-foreground">PDF, DOC, DOCX, JPG, or PNG</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Mother Details -->
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h5 class="mb-3 text-sm font-semibold text-slate-900">Mother Details</h5>
              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label class="space-y-1 text-sm text-slate-700 md:col-span-2">
                  <span class="text-xs font-medium">Mother Name</span>
                  <input type="text" placeholder="Mother Name" class="w-full border rounded p-2" bind:value={formData.motherName} />
                </label>
                <label class="space-y-1 text-sm text-slate-700">
                  <span class="text-xs font-medium">Mother Contact Number</span>
                  <input type="tel" placeholder="Mother Contact Number" class="w-full border rounded p-2" bind:value={formData.motherPhone} />
                </label>
                <label class="space-y-1 text-sm text-slate-700">
                  <span class="text-xs font-medium">Mother Email</span>
                  <input type="email" placeholder="mother@example.com" class="w-full border rounded p-2" bind:value={formData.motherEmail} />
                </label>
                <label class="space-y-1 text-sm text-slate-700 md:col-span-2">
                  <span class="text-xs font-medium">Mother Aadhaar Number</span>
                  <input type="text" placeholder="Mother Aadhaar Number" class="w-full border rounded p-2" bind:value={formData.motherAadharNumber} />
                </label>
                <div class="space-y-1 text-sm text-slate-700 md:col-span-2">
                  <span class="text-xs font-medium">Mother Aadhaar Card Upload</span>
                  <div class="rounded border bg-white p-2">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onchange={(e) => handleParentAadharCardSelect(e, 'motherAadharCardDocument')}
                      class="block text-sm text-gray-500 file:mr-3 file:rounded file:border-0 file:bg-blue-50 file:px-3 file:py-1 file:text-sm file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {#if motherAadharCardName}
                      <div class="mt-2 flex items-center justify-between rounded bg-blue-50 p-2">
                        <p class="text-xs text-gray-700">Uploaded: {motherAadharCardName}</p>
                        <button
                          type="button"
                          class="text-xs text-red-500 hover:underline"
                          onclick={() => { motherAadharCardName = ''; formData.motherAadharCardDocument = ''; }}
                        >Remove</button>
                      </div>
                    {/if}
                    <p class="mt-1 text-xs text-muted-foreground">PDF, DOC, DOCX, JPG, or PNG</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- FormSection: Documents -->
        <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div class="mb-4 border-b border-slate-100 pb-3">
            <h4 class="text-base font-semibold text-slate-900">Documents</h4>
            <p class="mt-1 text-sm text-slate-500">Upload the supporting admission documents and review the photo preview.</p>
          </div>

          <!-- Student Photo -->
          <div class="border rounded p-3 bg-gray-50">
            <p class="text-sm font-medium mb-2">Student Photo</p>
            <div class="flex items-center gap-4">
              <div class="w-20 h-24 bg-gray-200 rounded flex items-center justify-center overflow-hidden flex-shrink-0 border">
                {#if photoPreview}
                  <img src={photoPreview} alt="Preview" class="w-full h-full object-cover" />
                {:else}
                  <span class="text-3xl text-gray-400">&#128100;</span>
                {/if}
              </div>
              <input
                type="file"
                accept="image/*"
                onchange={handlePhotoSelect}
                class="block text-sm text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </div>

          <!-- RTE Document -->
          <div class="border rounded p-3 bg-gray-50 mt-4">
            <p class="text-sm font-medium mb-2">RTE (Right to Education) Document</p>
            <div>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onchange={handleRteDocumentSelect}
                class="block text-sm text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {#if rteDocumentName}
                <div class="mt-3 flex items-center justify-between bg-blue-50 p-2 rounded">
                  <p class="text-xs text-gray-700">&#10003; {rteDocumentName}</p>
                  <button
                    type="button"
                    class="text-xs text-red-500 hover:underline"
                    onclick={() => { rteDocumentName = ''; formData.rteDocument = ''; }}
                  >Remove</button>
                </div>
              {/if}
              <p class="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX, JPG, or PNG</p>
            </div>
          </div>
        </section>

        <!-- FormSection: Address Details -->
        <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div class="mb-4 border-b border-slate-100 pb-3">
            <h4 class="text-base font-semibold text-slate-900">Address Details</h4>
            <p class="mt-1 text-sm text-slate-500">Keep the student's residential address and identification notes separate for easier review.</p>
          </div>
          <label class="space-y-1 text-sm text-slate-700">
            <span class="text-xs font-medium">Residential Address</span>
            <textarea
              placeholder="Residential Address"
              class="border rounded p-2 w-full"
              rows={3}
              bind:value={formData.address}
            ></textarea>
          </label>
          <label class="space-y-1 text-sm text-slate-700 mt-4 block">
            <span class="text-xs font-medium">Identification Marks</span>
            <textarea
              placeholder="Identification Marks"
              class="border rounded p-2 w-full"
              rows={2}
              bind:value={formData.identificationMarks}
            ></textarea>
          </label>
        </section>

        <!-- FormSection: Academic and Health -->
        <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div class="mb-4 border-b border-slate-100 pb-3">
            <h4 class="text-base font-semibold text-slate-900">Academic and Health</h4>
            <p class="mt-1 text-sm text-slate-500">Academic background, achievements, behaviour, health notes, and language preferences.</p>
          </div>
          <label class="space-y-1 text-sm text-slate-700 block">
            <span class="text-xs font-medium">Previous Academic Record</span>
            <textarea placeholder="Previous Academic Record" class="border rounded p-2 w-full" rows={2} bind:value={formData.previousAcademicRecord}></textarea>
          </label>
          <label class="space-y-1 text-sm text-slate-700 block mt-4">
            <span class="text-xs font-medium">Achievements</span>
            <textarea placeholder="Achievements" class="border rounded p-2 w-full" rows={2} bind:value={formData.achievements}></textarea>
          </label>
          <label class="space-y-1 text-sm text-slate-700 block mt-4">
            <span class="text-xs font-medium">General Behaviour</span>
            <textarea placeholder="General Behaviour" class="border rounded p-2 w-full" rows={2} bind:value={formData.generalBehaviour}></textarea>
          </label>
          <label class="space-y-1 text-sm text-slate-700 block mt-4">
            <span class="text-xs font-medium">Medical History</span>
            <textarea placeholder="Medical History" class="border rounded p-2 w-full" rows={2} bind:value={formData.medicalHistory}></textarea>
          </label>
          <label class="space-y-1 text-sm text-slate-700 block mt-4">
            <span class="text-xs font-medium">Language Preferences</span>
            <input
              type="text"
              placeholder="Language Preferences (comma separated)"
              class="border rounded p-2 w-full"
              bind:value={formData.languagePreferences}
            />
          </label>
        </section>

        <!-- FormSection: Consent and Transport -->
        <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div class="mb-4 border-b border-slate-100 pb-3">
            <h4 class="text-base font-semibold text-slate-900">Consent and Transport</h4>
            <p class="mt-1 text-sm text-slate-500">Confirm parent consent and capture the student's transport requirement.</p>
          </div>
          <div class="space-y-4">
            <div class="flex items-center gap-3">
              <input
                id="parent-consent"
                type="checkbox"
                bind:checked={formData.hasParentConsent}
                required
              />
              <label for="parent-consent" class="font-medium">Parent Consent Form Signed</label>
            </div>

            <div class="flex items-center gap-3">
              <input
                id="bus-required"
                type="checkbox"
                bind:checked={formData.needsTransport}
                onchange={(e) => {
                  const checked = (e.target as HTMLInputElement).checked;
                  if (checked) {
                    formData.busConsent = false;
                  } else {
                    showTransportTerms = true;
                  }
                }}
              />
              <label for="bus-required" class="font-medium">School Bus Facility Required</label>
            </div>

            {#if formData.needsTransport}
              <div class="rounded-xl border border-border bg-card p-5 shadow-sm">
                <h3 class="mb-4 text-lg font-semibold text-primary">School Transport Details</h3>
                <div class="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-foreground">
                  <p class="font-semibold">Instructions:</p>
                  <ul class="mt-2 list-disc space-y-1 pl-5">
                    <li>Students must arrive at pickup point 5 minutes early.</li>
                    <li>Follow discipline inside the bus.</li>
                    <li>Any damage to bus property will be charged.</li>
                    <li>Bus fee must be paid on time.</li>
                  </ul>
                </div>
              </div>
            {/if}

            {#if !formData.needsTransport}
              <div class="rounded-xl border border-border bg-card p-4">
                <div class="flex items-start gap-3">
                  <input
                    id="no-bus-consent"
                    type="checkbox"
                    bind:checked={formData.busConsent}
                    onchange={(e) => {
                      const checked = (e.target as HTMLInputElement).checked;
                      if (checked) {
                        showTransportTerms = true;
                        formData.busConsent = false;
                      } else {
                        formData.busConsent = false;
                      }
                    }}
                    required
                  />
                  <label for="no-bus-consent" class="font-medium text-foreground">
                    Parent Consent for Not Taking School Bus
                  </label>
                </div>

                <p class="mt-3 text-sm text-muted-foreground">
                  If the student does not use school transport, full responsibility of travel lies with
                  the parent or guardian. The school will not be held responsible for any incident during commute.
                </p>

                <div class="mt-4 rounded-lg border bg-muted/40 px-4 py-3 text-sm text-foreground">
                  <p class="font-semibold">Instructions:</p>
                  <ul class="mt-2 list-disc space-y-1 pl-5">
                    <li>Download the undertaking form before proceeding.</li>
                    <li>Parent or guardian must sign the form physically.</li>
                    <li>Submit the signed form to the school admin.</li>
                    <li>Transport responsibility remains with the parent until the school receives the signed form.</li>
                  </ul>
                </div>

                <div class="mt-4 flex justify-end">
                  <button
                    type="button"
                    onclick={downloadTransportConsentForm}
                    class="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                  >
                    <!-- Download icon -->
                    <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Download Form
                  </button>
                </div>

                {#if formData.busConsent}
                  <div class="mt-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
                    Please sign the downloaded form and submit it to the school admin.
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        </section>

        <button
          type="submit"
          disabled={saving}
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Add Admission'}
        </button>
      </form>
    {/if}
  </div>

  <!-- New Admissions list -->
  <div class="stat-card p-6">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 class="text-lg font-semibold">New Admissions</h3>
        <div class="mt-1 flex gap-1">
          {#each (['all', 'complete', 'pending'] as const) as s (s)}
            <button
              type="button"
              onclick={() => (statusFilter = s)}
              class={`rounded-full px-3 py-0.5 text-xs font-medium border transition-colors ${
                statusFilter === s
                  ? s === 'complete'
                    ? 'bg-green-600 text-white border-green-600'
                    : s === 'pending'
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {s === 'all'
                ? `All (${newAdmissions.length})`
                : s === 'complete'
                ? `Complete (${newAdmissions.filter(isAdmissionComplete).length})`
                : `Pending (${newAdmissions.filter((x) => !isAdmissionComplete(x)).length})`}
            </button>
          {/each}
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <select
          bind:value={selectedClassFilter}
          class="rounded border px-3 py-2 text-sm"
        >
          <option value="all">All Classes</option>
          {#each classFilterOptions as className (className)}
            <option value={className}>{className}</option>
          {/each}
        </select>
        <button
          type="button"
          onclick={printFilteredIdCards}
          disabled={printableAdmissionCount === 0}
          class="inline-flex items-center gap-2 rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <!-- Printer icon -->
          <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          Print ID Cards (Completed)
        </button>
      </div>
    </div>

    {#if loading}
      <p class="text-gray-500">Loading admissions...</p>
    {:else if filteredAdmissions.length === 0}
      <p class="text-gray-500">No admissions yet.</p>
    {:else}
      <div class="max-h-[620px] overflow-y-auto pr-1">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {#each filteredAdmissions as student (student._id)}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_interactive_supports_focus -->
            <div
              class="rounded-xl border bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden border-slate-200 cursor-pointer"
              onclick={() => openDocModal(student)}
              role="button"
              tabindex="0"
              onkeydown={(e) => { if (e.key === 'Enter') openDocModal(student); }}
            >
              <!-- Card header with status colour -->
              <div class={`px-3 py-2 flex items-center justify-between ${isAdmissionComplete(student) ? 'bg-green-600' : 'bg-amber-500'}`}>
                <p class="text-[10px] font-bold tracking-widest uppercase text-white">Student</p>
                <span class="text-[9px] font-semibold text-white uppercase tracking-wide">
                  {isAdmissionComplete(student) ? '✓ Complete' : '⚠ Pending'}
                </span>
              </div>

              <!-- Photo + info -->
              <div class="flex gap-3 p-3 flex-1">
                <div class="w-14 h-16 bg-gray-100 rounded flex items-center justify-center flex-shrink-0 overflow-hidden border">
                  {#if student.photo}
                    <img src={student.photo} alt={student.name} class="w-full h-full object-cover" />
                  {:else}
                    <span class="text-3xl text-gray-400">&#128100;</span>
                  {/if}
                </div>
                <div class="flex-1 min-w-0 text-xs space-y-0.5">
                  <p class="font-bold text-sm text-slate-800 truncate">{student.name}</p>
                  {#if student.admissionNumber}
                    <p class="text-blue-600 font-medium">{student.admissionNumber}</p>
                  {/if}
                  <p class="text-slate-500">
                    {student.class}{student.classSection ? ` · ${student.classSection}` : ''}
                  </p>
                  <p class="text-slate-500">Roll: {student.rollNumber}</p>
                  {#if student.phone}
                    <p class="text-slate-500 truncate">{student.phone}</p>
                  {/if}
                </div>
              </div>

              <!-- Pending docs list -->
              {#if !isAdmissionComplete(student)}
                <div class="mx-3 mb-2 rounded-lg bg-amber-50 border border-amber-200 px-2 py-1.5">
                  <p class="text-[10px] font-semibold text-amber-700 mb-0.5">Documents remaining:</p>
                  <ul class="list-disc list-inside space-y-0.5">
                    {#each getMissingDocs(student) as doc (doc)}
                      <li class="text-[10px] text-amber-600">{doc}</li>
                    {/each}
                  </ul>
                </div>
              {/if}

              <!-- Footer action -->
              <div class="border-t px-3 py-2 bg-slate-50 flex justify-between items-center">
                <span class="text-[10px] text-slate-400">Click to manage documents</span>
                {#if isAdmissionComplete(student)}
                  <button
                    type="button"
                    class="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                    onclick={(e) => { e.stopPropagation(); idCardStudent = student; }}
                  >
                    <!-- IdCard icon -->
                    <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="16" y1="10" x2="16" y2="10"/><path d="M6 15c0-1.7 1.3-3 3-3s3 1.3 3 3"/><circle cx="9" cy="10" r="2"/></svg>
                    ID Card
                  </button>
                {:else}
                  <span class="text-[10px] font-medium text-amber-600">Complete documents to unlock ID Card</span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <!-- ID Card Modal -->
  {#if idCardStudent}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onclick={() => (idCardStudent = null)}
    >
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4"
        onclick={(e) => e.stopPropagation()}
      >
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold text-lg">Student ID Card</h3>
          <button type="button" onclick={() => (idCardStudent = null)} class="text-gray-400 hover:text-gray-600">
            <!-- X icon -->
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="border-2 border-blue-700 rounded-xl overflow-hidden">
          <div class="bg-blue-700 text-white py-2 px-3 flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border border-white/40">
              {#if schoolLogo}
                <img src={schoolLogo} alt={schoolDisplayName} class="w-full h-full object-cover" />
              {:else}
                <span class="text-sm">&#127979;</span>
              {/if}
            </div>
            <div>
              <p class="text-xs font-bold tracking-widest uppercase">Student Identity Card</p>
              <p class="text-xs opacity-80">{schoolDisplayName}</p>
            </div>
          </div>
          <div class="flex p-3 gap-3 bg-white items-start">
            <div class="w-20 h-24 bg-gray-100 rounded flex items-center justify-center flex-shrink-0 overflow-hidden border">
              {#if idCardStudent.photo}
                <img src={idCardStudent.photo} alt={idCardStudent.name} class="w-full h-full object-cover" />
              {:else}
                <span class="text-4xl text-gray-400">&#128100;</span>
              {/if}
            </div>
            <div class="flex-1 text-xs space-y-1">
              <p class="font-bold text-sm">{idCardStudent.name}</p>
              <p>Class: {idCardStudent.class}{idCardStudent.classSection ? ` ${idCardStudent.classSection}` : ''}</p>
              <p>Roll No: {idCardStudent.rollNumber}</p>
              <p>Admission No: {idCardStudent.admissionNumber ?? '-'}</p>
              <p>Date of Birth: {idCardStudent.dateOfBirth ?? '-'}</p>
              <p>Blood Group: {idCardStudent.bloodGroup ?? '-'}</p>
            </div>
          </div>
          <div class="bg-blue-50 border-t px-3 py-1.5 text-center">
            <p class="text-xs text-gray-500">If found, please return to the school office</p>
          </div>
        </div>
        <div class="mt-4 flex justify-end gap-2">
          {#if isAdmissionComplete(idCardStudent)}
            <button
              type="button"
              class="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
              onclick={printIdCard}
            >
              <!-- Printer icon -->
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Print ID Card
            </button>
          {/if}
          <button type="button" class="px-4 py-2 rounded border text-sm hover:bg-gray-50" onclick={() => (idCardStudent = null)}>
            Close
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Document Upload Modal -->
  {#if docModalStudent}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onclick={() => (docModalStudent = null)}
    >
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onclick={(e) => e.stopPropagation()}
      >
        <!-- Header -->
        <div class={`px-5 py-4 flex items-center justify-between ${isAdmissionComplete(docModalStudent) ? 'bg-green-600' : 'bg-amber-500'}`}>
          <div>
            <p class="text-white font-semibold text-sm">{docModalStudent.name}</p>
            <p class="text-white/80 text-xs">{docModalStudent.admissionNumber} · {docModalStudent.class}{docModalStudent.classSection ? ` ${docModalStudent.classSection}` : ''}</p>
          </div>
          <button type="button" onclick={() => (docModalStudent = null)} class="text-white/80 hover:text-white">
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div class="p-5 space-y-4">
          {#if isAdmissionComplete(docModalStudent)}
            <p class="text-green-700 text-sm font-medium text-center py-4">&#10003; Admission is complete. All documents are uploaded.</p>
          {:else}
            <p class="text-sm font-medium text-slate-700">Upload missing documents:</p>

            {#if !docModalStudent.rteDocument}
              <div class="space-y-1">
                <label class="text-xs font-medium text-slate-600">Right to Education Document</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  class="block w-full text-sm text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700"
                  onchange={(e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) handleDocFileSelect('rteDocument', f); }}
                />
              </div>
            {/if}

            {#if !docModalStudent.bodCertificate}
              <div class="space-y-1">
                <label class="text-xs font-medium text-slate-600">Date of Birth Certificate</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  class="block w-full text-sm text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700"
                  onchange={(e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) handleDocFileSelect('bodCertificate', f); }}
                />
              </div>
            {/if}

            {#if !docModalStudent.aadharCardDocument}
              <div class="space-y-1">
                <label class="text-xs font-medium text-slate-600">Aadhaar Card</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  class="block w-full text-sm text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700"
                  onchange={(e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) handleDocFileSelect('aadharCardDocument', f); }}
                />
              </div>
            {/if}
          {/if}

          {#if docModalError}<p class="text-red-600 text-xs">{docModalError}</p>{/if}
          {#if docModalSuccess}<p class="text-green-600 text-xs">{docModalSuccess}</p>{/if}

          <div class="flex justify-end gap-2 pt-2 border-t">
            <button type="button" class="px-4 py-2 rounded border text-sm hover:bg-gray-50" onclick={() => (docModalStudent = null)}>
              Close
            </button>
            {#if !isAdmissionComplete(docModalStudent)}
              <button
                type="button"
                disabled={docUploading || Object.keys(docPatch).length === 0}
                class="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-50"
                onclick={() => saveDocModal()}
              >
                {docUploading ? 'Saving...' : 'Save Documents'}
              </button>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Transport Terms Modal -->
  {#if showTransportTerms}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onclick={() => (showTransportTerms = false)}
    >
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onclick={(e) => e.stopPropagation()}
      >
        <div class="flex items-center justify-between border-b px-6 py-4">
          <h3 class="text-lg font-semibold text-[#750550]">Transport Terms &amp; Conditions</h3>
          <button type="button" onclick={() => (showTransportTerms = false)} class="text-lg text-gray-500 hover:text-gray-700">
            &#x2715;
          </button>
        </div>

        <div class="max-h-[60vh] space-y-4 overflow-y-auto px-6 py-5 text-sm leading-6 text-slate-700">
          <h2 class="text-xl font-semibold text-[#750550]">School Transport Policy</h2>
          <p>This policy outlines the responsibilities of the school and parents regarding student transportation.</p>

          <h3 class="text-lg font-semibold text-[#750550]">1. School Bus Facility</h3>
          <p>The school provides transportation facilities for students who opt for the school bus service. This service is subject to availability and adherence to school rules.</p>

          <h3 class="text-lg font-semibold text-[#750550]">2. Parent Responsibility (Important)</h3>
          <p>If a student does not avail the school bus service, the responsibility of safe transportation to and from the school lies entirely with the parents or guardians.</p>

          <ul class="list-disc space-y-2 pl-5">
            <li>School will not be responsible for any accidents or incidents outside school transport.</li>
            <li>Parents must ensure timely drop-off and pick-up of students.</li>
            <li>Any delays, safety issues, or travel arrangements are solely managed by parents.</li>
          </ul>

          <h3 class="text-lg font-semibold text-[#750550]">3. School Liability</h3>
          <p>The school is only responsible for students during official school transport usage or within school premises.</p>
          <p>For students not using the school bus, the school holds no liability for:</p>
          <ol class="list-decimal space-y-2 pl-5">
            <li>Road accidents or injuries during commute</li>
            <li>Delays or absenteeism due to transport issues</li>
            <li>Any third-party transportation risks</li>
          </ol>

          <h3 class="text-lg font-semibold text-[#750550]">4. Consent</h3>
          <p>By proceeding with admission, parents or guardians acknowledge and agree to these terms and take full responsibility for the child's transportation if not using the school bus service.</p>

          <div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
            Download the undertaking form, sign it physically, and submit it to the school admin.
          </div>
        </div>

        <div class="flex flex-col gap-3 border-t px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onclick={downloadTransportConsentForm}
            class="inline-flex items-center justify-center gap-2 rounded bg-slate-200 px-4 py-2 font-medium text-slate-800 hover:bg-slate-300"
          >
            <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download Form
          </button>
          <button
            type="button"
            onclick={() => { formData.busConsent = false; showTransportTerms = false; }}
            class="rounded bg-slate-100 px-4 py-2 font-medium text-slate-700 hover:bg-slate-200"
          >
            Decline
          </button>
          <button
            type="button"
            onclick={acceptTransportTerms}
            class="rounded bg-[#750550] px-4 py-2 font-medium text-white hover:bg-[#4a0433]"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  {/if}

</div>
