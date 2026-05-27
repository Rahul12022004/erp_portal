<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';

  // ── types ───────────────────────────────────────────────────────────────────

  type MainTab = 'tc' | 'bonafide' | 'hall' | 'nodue' | 'students' | 'staff' | 'financial';
  type HallTab = 'individual' | 'online';
  type HallExamType = 'mid-sem' | 'final';

  type StudentRecord = {
    _id: string;
    name: string;
    class: string;
    rollNumber?: string;
    admissionNumber?: string;
  };

  type ExamRecord = {
    _id: string;
    title: string;
    examType: string;
    className: string;
    subject: string;
    examDate: string;
    startTime: string;
    endTime: string;
    instructions?: string;
  };

  type ClassRecord = {
    name?: string;
    section?: string;
  };

  type SchoolInfo = {
    name: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    logo: string;
  };

  type SchoolSession = {
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    phone?: string;
    contact?: string;
    email?: string;
    website?: string;
    logo?: string;
    schoolInfo?: {
      name?: string;
      address?: string;
      phone?: string;
      email?: string;
      website?: string;
      logo?: string;
    };
    adminInfo?: {
      image?: string;
    };
  };

  // ── helpers ─────────────────────────────────────────────────────────────────

  function formatDate(d?: string | null) {
    if (!d) return '-';
    try {
      return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return d;
    }
  }

  function readSchoolSession(): SchoolSession {
    try {
      return JSON.parse(localStorage.getItem('school') || '{}') as SchoolSession;
    } catch {
      return {};
    }
  }

  function getSchoolInfo(overrides: Partial<SchoolInfo> = {}): SchoolInfo {
    try {
      const school = readSchoolSession();
      const schoolData = school.schoolInfo || {};
      const baseAddress = String(schoolData.address || school.address || '').trim();
      const fallbackAddressParts = [school.city, school.state, school.pincode]
        .map((part) => String(part || '').trim())
        .filter(Boolean);

      const baseInfo: SchoolInfo = {
        name: String(schoolData.name || school.name || 'School ERP').trim() || 'School ERP',
        address: baseAddress || fallbackAddressParts.join(', ') || 'School Campus Address',
        phone: String(schoolData.phone || school.phone || school.contact || '').trim() || '+91-XXXXXXXXXX',
        email: String(schoolData.email || school.email || '').trim() || 'info@school.edu',
        website: String(schoolData.website || school.website || '').trim(),
        logo: String(schoolData.logo || school.logo || '').trim(),
      };

      return {
        ...baseInfo,
        ...Object.fromEntries(
          Object.entries(overrides).filter(([, value]) => String(value || '').trim())
        ),
      } as SchoolInfo;
    } catch {
      return {
        name: String(overrides.name || 'School ERP').trim() || 'School ERP',
        address: String(overrides.address || 'School Campus Address').trim() || 'School Campus Address',
        phone: String(overrides.phone || '+91-XXXXXXXXXX').trim() || '+91-XXXXXXXXXX',
        email: String(overrides.email || 'info@school.edu').trim() || 'info@school.edu',
        website: String(overrides.website || '').trim(),
        logo: String(overrides.logo || '').trim(),
      };
    }
  }

  function normalizeText(value: string) {
    return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function schoolInitials(name: string) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'SC';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
  }

  function toClassLabel(classItem: ClassRecord) {
    const name = String(classItem.name || '').trim();
    const section = String(classItem.section || '').trim();
    if (!name) return '';
    return section ? `${name} - ${section}` : name;
  }

  function matchesExamType(examType: string, selectedType: HallExamType) {
    const type = normalizeText(examType);
    if (selectedType === 'final') {
      return /(final|annual|year end|year-end)/i.test(type);
    }
    return /(mid|midterm|mid term|mid-sem|mid sem|semester|half yearly|half-yearly)/i.test(type);
  }

  function formatExamDate(date: string) {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return date;
    return parsed.toLocaleDateString();
  }

  async function blobToDataUrl(blob: Blob): Promise<string | null> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  }

  async function loadImageElement(url: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = url;
    });
  }

  async function rasterizeImageToDataUrl(url: string): Promise<string | null> {
    const image = await loadImageElement(url);
    if (!image) return null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth || image.width || 96;
      canvas.height = image.naturalHeight || image.height || 96;
      const context = canvas.getContext('2d');
      if (!context) return null;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/png');
    } catch {
      return null;
    }
  }

  async function imageUrlToDataUrl(url: string): Promise<string | null> {
    if (!url) return null;
    if (/^data:image\/(png|jpe?g|webp);/i.test(url)) return url;
    if (url.startsWith('data:image/')) return rasterizeImageToDataUrl(url);
    try {
      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        const dataUrl = await blobToDataUrl(blob);
        if (dataUrl) return dataUrl;
      }
    } catch { /* fall through */ }
    return rasterizeImageToDataUrl(url);
  }

  function getImageFormat(dataUrl: string) {
    const match = dataUrl.match(/^data:image\/(png|jpe?g|webp)/i);
    const format = match?.[1]?.toLowerCase() || 'png';
    if (format === 'jpg' || format === 'jpeg') return 'JPEG';
    if (format === 'webp') return 'WEBP';
    return 'PNG';
  }

  function buildSchoolContactLine(schoolInfo: SchoolInfo) {
    return [schoolInfo.phone, schoolInfo.email, schoolInfo.website]
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .join(' | ');
  }

  function formatGeneratedLabel(value?: Date | string) {
    const source = value instanceof Date ? value : value ? new Date(value) : new Date();
    if (Number.isNaN(source.getTime())) return new Date().toLocaleDateString('en-IN');
    return source.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function getLogoCandidates(session: SchoolSession, schoolInfo: SchoolInfo): string[] {
    const rawCandidates = [
      schoolInfo.logo,
      session.schoolInfo?.logo,
      session.logo,
      session.adminInfo?.image,
    ]
      .map((value) => String(value || '').trim())
      .filter(Boolean);

    const expanded: string[] = [];
    rawCandidates.forEach((value) => {
      expanded.push(value);
      if (value.startsWith('/')) {
        expanded.push(`${value}`);
      }
    });
    return Array.from(new Set(expanded));
  }

  async function resolveSchoolLogoDataUrl(schoolInfo: SchoolInfo): Promise<string | null> {
    const session = readSchoolSession();
    const candidates = getLogoCandidates(session, schoolInfo);
    for (const candidate of candidates) {
      const dataUrl = await imageUrlToDataUrl(candidate);
      if (dataUrl) return dataUrl;
    }
    return null;
  }

  async function getBrandedSchoolInfo(overrides: Partial<SchoolInfo> = {}) {
    const schoolInfo = getSchoolInfo(overrides);
    return {
      ...schoolInfo,
      logoDataUrl: await resolveSchoolLogoDataUrl(schoolInfo),
    };
  }

  // ── reactive state ───────────────────────────────────────────────────────────

  const schoolId = $derived($page.data.user?.schoolId ?? '');

  const initialSchoolInfo = getSchoolInfo();

  let tab = $state<MainTab>('students');
  let hallTab = $state<HallTab>('individual');

  // Hall ticket state
  let hallClassName = $state('');
  let hallExamType = $state<HallExamType>('mid-sem');
  let hallLoading = $state(false);
  let hallClassOptions = $state<string[]>([]);
  let hallClassLoading = $state(false);
  let hallClassLoadError = $state('');

  // No Due Certificate state
  let noDueSchoolName = $state(initialSchoolInfo.name);
  let noDueSchoolAddress = $state(initialSchoolInfo.address);
  let noDueSchoolPhone = $state(initialSchoolInfo.phone);
  let noDueSchoolEmail = $state(initialSchoolInfo.email);
  let noDueClassName = $state('');
  let noDueStudentName = $state('');
  let noDueRollNo = $state('');
  let noDueAdmissionNo = $state('');
  let noDueAcademicYear = $state(`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);
  let noDueIssuedBy = $state('Principal');
  let noDueRemarks = $state('No dues are pending against the student as on date.');
  let noDueLoading = $state(false);

  // Transfer Certificate state
  let tcSchoolName = $state(initialSchoolInfo.name);
  let tcSchoolAddress = $state(initialSchoolInfo.address);
  let tcSchoolPhone = $state(initialSchoolInfo.phone);
  let tcSchoolEmail = $state(initialSchoolInfo.email);
  let tcBoardName = $state('Central Board of Secondary Education');
  let tcCertificateNo = $state('');
  let tcAdmissionNo = $state('');
  let tcStudentName = $state('');
  let tcFatherName = $state('');
  let tcMotherName = $state('');
  let tcDob = $state('');
  let tcClassLastStudied = $state('');
  let tcResult = $state('Pass');
  let tcPromotionClass = $state('');
  let tcDues = $state('No');
  let tcConduct = $state('Good');
  let tcLeavingDate = $state('');
  let tcReason = $state('Parent request');
  let tcIssueDate = $state(new Date().toISOString().slice(0, 10));
  let tcIssuedBy = $state('Principal');
  let tcLoading = $state(false);

  // Bonafide Certificate state
  let bonafideSchoolName = $state(initialSchoolInfo.name);
  let bonafideSchoolAddress = $state(initialSchoolInfo.address);
  let bonafideSchoolPhone = $state(initialSchoolInfo.phone);
  let bonafideSchoolEmail = $state(initialSchoolInfo.email);
  let bonafideStudentName = $state('');
  let bonafideClassName = $state('');
  let bonafideAdmissionNo = $state('');
  let bonafideRollNo = $state('');
  let bonafidePurpose = $state('For official use');
  let bonafideSession = $state(`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);
  let bonafideIssueDate = $state(new Date().toISOString().slice(0, 10));
  let bonafideIssuedBy = $state('Principal');
  let bonafideLoading = $state(false);

  // Student / Staff / Financial report state
  let studentReportLoading = $state(false);
  let staffReportLoading = $state(false);
  let financialReportLoading = $state(false);

  // Toast / message helper
  let toastMsg = $state('');
  let toastType = $state<'success' | 'error'>('success');
  let toastVisible = $state(false);
  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    if (toastTimer) clearTimeout(toastTimer);
    toastMsg = msg;
    toastType = type;
    toastVisible = true;
    toastTimer = setTimeout(() => { toastVisible = false; }, 3500);
  }

  const hallExamTypeLabel = $derived(hallExamType === 'final' ? 'Final Exam' : 'Mid-Sem Exam');

  // ── load hall classes ────────────────────────────────────────────────────────

  async function loadHallClasses() {
    const sid = schoolId;
    if (!sid) {
      hallClassOptions = [];
      hallClassLoadError = 'School session not found. Please log in again.';
      return;
    }

    hallClassLoading = true;
    hallClassLoadError = '';

    try {
      const [classesRes, examsRes, studentsRes] = await Promise.all([
        fetch(`/api/classes/${sid}`),
        fetch(`/api/exams/school/${sid}`),
        fetch(`/api/students/${sid}`),
      ]);

      const classesData: ClassRecord[] = classesRes.ok ? await classesRes.json() : [];
      const examsData: ExamRecord[] = examsRes.ok ? await examsRes.json() : [];
      const studentsData: StudentRecord[] = studentsRes.ok ? await studentsRes.json() : [];

      const mergedClasses = new Set<string>([
        ...classesData.map(toClassLabel).filter(Boolean),
        ...examsData.map((exam) => String(exam.className || '').trim()).filter(Boolean),
        ...studentsData.map((student) => String(student.class || '').trim()).filter(Boolean),
      ]);

      const sortedOptions = Array.from(mergedClasses).sort((a, b) => a.localeCompare(b));
      hallClassOptions = sortedOptions;

      if (!hallClassName && sortedOptions.length > 0) {
        hallClassName = sortedOptions[0];
      }

      if (sortedOptions.length === 0) {
        hallClassLoadError = 'No classes found. Create class/exam first or enter class manually.';
      }
    } catch {
      hallClassOptions = [];
      hallClassLoadError = 'Unable to load classes right now.';
    } finally {
      hallClassLoading = false;
    }
  }

  // ── effects ──────────────────────────────────────────────────────────────────

  $effect(() => {
    if (tab === 'hall' && hallTab === 'individual') {
      loadHallClasses();
    }
  });

  onMount(() => {
    const handleSessionUpdate = () => {
      if (tab === 'hall' && hallTab === 'individual') {
        loadHallClasses();
      }
    };
    window.addEventListener('school-session-updated', handleSessionUpdate);
    return () => window.removeEventListener('school-session-updated', handleSessionUpdate);
  });

  // ── PDF helpers using browser print ─────────────────────────────────────────

  // Since jsPDF is a React/npm dependency not available in SvelteKit directly,
  // we use window.print() with a hidden iframe containing formatted content,
  // or alert the user to use browser print.
  // For full fidelity we dynamically import jspdf if available, else fall back.

  type JsPDF = {
    internal: { pageSize: { getWidth(): number } };
    setFontSize(n: number): void;
    setFont(family: string, style: string): void;
    setTextColor(r: number, g: number, b: number): void;
    setDrawColor(r: number, g: number, b: number): void;
    setFillColor(r: number, g: number, b: number): void;
    setLineWidth(w: number): void;
    text(text: string | string[], x: number, y: number, options?: Record<string, unknown>): void;
    line(x1: number, y1: number, x2: number, y2: number): void;
    rect(x: number, y: number, w: number, h: number, style?: string): void;
    roundedRect(x: number, y: number, w: number, h: number, rx: number, ry: number, style?: string): void;
    addImage(dataUrl: string, format: string, x: number, y: number, w: number, h: number): void;
    splitTextToSize(text: string, maxWidth: number): string[];
    addPage(): void;
    save(filename: string): void;
    lastAutoTable?: { finalY?: number };
  };

  async function loadJsPDF(): Promise<{ jsPDF: new (options?: Record<string,unknown>) => JsPDF; autoTable: (doc: JsPDF, opts: Record<string,unknown>) => void } | null> {
    try {
      const [jspdfMod, autoTableMod] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);
      return { jsPDF: (jspdfMod as unknown as { default: new (o?: Record<string,unknown>) => JsPDF }).default ?? (jspdfMod as unknown as { jsPDF: new (o?: Record<string,unknown>) => JsPDF }).jsPDF, autoTable: (autoTableMod as unknown as { default: (doc: JsPDF, opts: Record<string,unknown>) => void }).default };
    } catch {
      return null;
    }
  }

  function addSchoolLetterhead(doc: JsPDF, schoolInfo: SchoolInfo & { logoDataUrl?: string | null }, options: { title: string; generatedAt?: Date | string; accentColor?: [number,number,number]; subtitle?: string }) {
    const accent = options.accentColor || [37, 99, 235];
    const pageWidth = doc.internal.pageSize.getWidth();
    const top = 10;
    const left = 10;
    const right = pageWidth - 10;
    const logoX = 14;
    const logoY = 14;
    const logoSize = 18;
    const textX = logoX + logoSize + 6;
    const titleX = pageWidth - 14;
    const addressLines = doc.splitTextToSize(schoolInfo.address || 'School Campus Address', Math.max(68, pageWidth - textX - 76));
    const contactLines = doc.splitTextToSize(buildSchoolContactLine(schoolInfo) || 'Phone | Email | Website', Math.max(68, pageWidth - textX - 76));
    const subtitleLines = options.subtitle ? doc.splitTextToSize(options.subtitle, 56) : [];
    const leftBottomY = 20 + addressLines.length * 4.2 + contactLines.length * 4.2;
    const rightBottomY = 18 + subtitleLines.length * 4.2;
    const contentBottom = Math.max(logoY + logoSize, leftBottomY, rightBottomY + 8);
    const boxHeight = Math.max(30, contentBottom - top + 6);
    const separatorY = top + boxHeight + 2;

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(left, top, right - left, boxHeight, 3, 3, 'F');
    doc.setDrawColor(accent[0], accent[1], accent[2]);
    doc.setLineWidth(0.4);
    doc.line(left + 4, separatorY, right - 4, separatorY);

    if (schoolInfo.logoDataUrl) {
      try {
        doc.addImage(schoolInfo.logoDataUrl, getImageFormat(schoolInfo.logoDataUrl), logoX, logoY, logoSize, logoSize);
      } catch {
        doc.setFillColor(accent[0], accent[1], accent[2]);
        doc.roundedRect(logoX, logoY, logoSize, logoSize, 3, 3, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(schoolInitials(schoolInfo.name), logoX + logoSize / 2, logoY + 11, { align: 'center' });
        doc.setTextColor(15, 23, 42);
      }
    } else {
      doc.setFillColor(accent[0], accent[1], accent[2]);
      doc.roundedRect(logoX, logoY, logoSize, logoSize, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(schoolInitials(schoolInfo.name), logoX + logoSize / 2, logoY + 11, { align: 'center' });
      doc.setTextColor(15, 23, 42);
    }

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(schoolInfo.name || 'School ERP', textX, 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(addressLines, textX, 24);
    doc.text(contactLines, textX, 24 + addressLines.length * 4.2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(options.title, titleX, 18, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Generated: ${formatGeneratedLabel(options.generatedAt)}`, titleX, 24, { align: 'right' });
    if (subtitleLines.length > 0) {
      doc.text(subtitleLines, titleX, 29, { align: 'right' });
    }
    return separatorY + 5;
  }

  // ── Student Report ───────────────────────────────────────────────────────────

  async function handleDownloadStudentReport() {
    const sid = schoolId;
    if (!sid) { showToast('School not found. Please log in again.', 'error'); return; }
    studentReportLoading = true;
    try {
      const res = await fetch(`/api/students/${sid}`);
      if (!res.ok) throw new Error('Failed to fetch students');
      const data = await res.json() as Record<string, unknown>[];
      const libs = await loadJsPDF();
      if (!libs) { alert('PDF: use browser print instead'); return; }
      const { jsPDF, autoTable } = libs;
      const schoolInfo = await getBrandedSchoolInfo();
      const generatedAt = new Date();
      const doc = new jsPDF({ orientation: 'landscape' });
      const startY = addSchoolLetterhead(doc, schoolInfo, { title: 'Student Details Report', generatedAt, accentColor: [37, 99, 235] });
      autoTable(doc, {
        startY,
        head: [['Roll No', 'Name', 'Email', 'Class', 'Gender', 'DOB', 'Phone', 'House', 'Transport']],
        body: data.map(s => [
          s.rollNumber ?? '', s.name ?? '', s.email ?? '', s.class ?? '',
          s.gender ?? '', s.dateOfBirth ?? '', s.phone ?? '',
          s.house ?? '—', s.needsTransport ? 'Yes' : 'No',
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [37, 99, 235] },
        alternateRowStyles: { fillColor: [239, 246, 255] },
      } as Record<string,unknown>);
      doc.save(`students_${new Date().toISOString().slice(0, 10)}.pdf`);
      showToast('Student details PDF downloaded!');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Download failed', 'error');
    } finally {
      studentReportLoading = false;
    }
  }

  // ── Staff Report ─────────────────────────────────────────────────────────────

  async function handleDownloadStaffReport() {
    const sid = schoolId;
    if (!sid) { showToast('School not found. Please log in again.', 'error'); return; }
    staffReportLoading = true;
    try {
      const res = await fetch(`/api/staff/${sid}`);
      if (!res.ok) throw new Error('Failed to fetch staff');
      const data = await res.json() as Record<string, unknown>[];
      const libs = await loadJsPDF();
      if (!libs) { alert('PDF: use browser print instead'); return; }
      const { jsPDF, autoTable } = libs;
      const schoolInfo = await getBrandedSchoolInfo();
      const generatedAt = new Date();
      const doc = new jsPDF({ orientation: 'landscape' });
      const startY = addSchoolLetterhead(doc, schoolInfo, { title: 'Staff & Teacher Details Report', generatedAt, accentColor: [22, 163, 74] });
      autoTable(doc, {
        startY,
        head: [['Name', 'Email', 'Position', 'Phone', 'Qualification', 'Experience', 'Status', 'Join Date']],
        body: data.map(s => [
          s.name ?? '', s.email ?? '', s.position ?? '', s.phone ?? '',
          s.qualification ?? '', s.experience ?? '', s.status ?? '', s.joinDate ?? '',
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [22, 163, 74] },
        alternateRowStyles: { fillColor: [240, 253, 244] },
      } as Record<string,unknown>);
      doc.save(`staff_${new Date().toISOString().slice(0, 10)}.pdf`);
      showToast('Staff details PDF downloaded!');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Download failed', 'error');
    } finally {
      staffReportLoading = false;
    }
  }

  // ── Financial Report ─────────────────────────────────────────────────────────

  async function handleDownloadFinancialReport() {
    const sid = schoolId;
    if (!sid) { showToast('School not found. Please log in again.', 'error'); return; }
    financialReportLoading = true;
    try {
      const res = await fetch(`/api/finance/${sid}/students/summary?legacy=true`);
      if (!res.ok) throw new Error('Failed to fetch financial data');
      const data = await res.json() as Array<{
        student: Record<string, unknown>;
        totalFee: number;
        paidAmount: number;
        remainingAmount: number;
        status: string;
        dueDate: string;
      }>;
      const libs = await loadJsPDF();
      if (!libs) { alert('PDF: use browser print instead'); return; }
      const { jsPDF, autoTable } = libs;
      const schoolInfo = await getBrandedSchoolInfo();
      const generatedAt = new Date();
      const totalFees = data.reduce((s, r) => s + (r.totalFee || 0), 0);
      const totalPaid = data.reduce((s, r) => s + (r.paidAmount || 0), 0);
      const totalDue  = data.reduce((s, r) => s + (r.remainingAmount || 0), 0);
      const doc = new jsPDF({ orientation: 'landscape' });
      const startY = addSchoolLetterhead(doc, schoolInfo, { title: 'Financial Report', generatedAt, accentColor: [217, 119, 6] });
      autoTable(doc, {
        startY,
        head: [['Student Name', 'Class', 'Roll No', 'Total Fee (Rs)', 'Paid (Rs)', 'Due (Rs)', 'Status', 'Due Date']],
        body: [
          ...data.map(r => [
            String(r.student?.name ?? ''),
            String(r.student?.class ?? ''),
            String(r.student?.rollNumber ?? ''),
            String(r.totalFee),
            String(r.paidAmount),
            String(r.remainingAmount),
            r.status,
            r.dueDate,
          ]),
          ['', '', 'TOTAL', String(totalFees), String(totalPaid), String(totalDue), '', ''],
        ],
        styles: { fontSize: 8 },
        headStyles: { fillColor: [217, 119, 6] },
        alternateRowStyles: { fillColor: [255, 251, 235] },
        didParseCell: (cellData: Record<string,unknown>) => {
          const d = cellData as { row: { index: number }; cell: { styles: Record<string,string> }; table: { body: unknown[] } };
          if (d.row.index === d.table.body.length - 1) {
            d.cell.styles.fontStyle = 'bold';
          }
        },
      } as Record<string,unknown>);
      doc.save(`financial_report_${new Date().toISOString().slice(0, 10)}.pdf`);
      showToast('Financial report PDF downloaded!');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Download failed', 'error');
    } finally {
      financialReportLoading = false;
    }
  }

  // ── Hall Tickets ─────────────────────────────────────────────────────────────

  async function handleDownloadHallTickets() {
    const sid = schoolId;
    if (!sid) { showToast('School not found. Please log in again.', 'error'); return; }
    const selectedClass = hallClassName.trim();
    if (!selectedClass) { showToast('Please enter class name', 'error'); return; }
    hallLoading = true;
    try {
      const [studentsRes, examsRes] = await Promise.all([
        fetch(`/api/students/${sid}`),
        fetch(`/api/exams/school/${sid}`),
      ]);
      if (!studentsRes.ok) throw new Error('Failed to fetch students');
      if (!examsRes.ok) throw new Error('Failed to fetch exams');
      const students = await studentsRes.json() as StudentRecord[];
      const exams = await examsRes.json() as ExamRecord[];
      const libs = await loadJsPDF();
      if (!libs) { alert('PDF: use browser print instead'); return; }
      const { jsPDF, autoTable } = libs;
      const schoolInfo = await getBrandedSchoolInfo();
      const generatedAt = new Date();
      const classKey = normalizeText(selectedClass);
      const classStudents = students.filter(s => normalizeText(s.class) === classKey);
      if (classStudents.length === 0) throw new Error('No students found for selected class');
      const classExams = exams
        .filter(e => normalizeText(e.className) === classKey)
        .filter(e => matchesExamType(e.examType, hallExamType))
        .sort((a, b) => {
          const dateDiff = String(a.examDate).localeCompare(String(b.examDate));
          if (dateDiff !== 0) return dateDiff;
          return String(a.startTime).localeCompare(String(b.startTime));
        });
      if (classExams.length === 0) throw new Error(`No ${hallExamTypeLabel} schedule found for this class`);
      const doc = new jsPDF();
      classStudents.forEach((student, index) => {
        if (index > 0) doc.addPage();
        const startY = addSchoolLetterhead(doc, schoolInfo, {
          title: `${hallExamTypeLabel} Hall Ticket`,
          generatedAt,
          accentColor: [37, 99, 235],
          subtitle: selectedClass,
        });
        autoTable(doc, {
          startY,
          theme: 'grid',
          styles: { fontSize: 9 },
          body: [
            ['Student Name', student.name || '-'],
            ['Class', selectedClass],
            ['Roll Number', student.rollNumber || '-'],
            ['Admission Number', student.admissionNumber || '-'],
          ],
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 48 }, 1: { cellWidth: 130 } },
        } as Record<string,unknown>);
        const afterStudent = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY;
        autoTable(doc, {
          startY: afterStudent ? afterStudent + 6 : 72,
          head: [['S. No.', 'Subject', 'Date', 'Time', 'Instructions']],
          body: classExams.map((exam, examIndex) => [
            String(examIndex + 1),
            exam.subject || exam.title || '-',
            formatExamDate(exam.examDate),
            `${exam.startTime} - ${exam.endTime}`,
            exam.instructions?.trim() || 'Follow exam hall rules and carry school ID card.',
          ]),
          styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
          headStyles: { fillColor: [37, 99, 235] },
          columnStyles: { 0: { cellWidth: 14 }, 1: { cellWidth: 34 }, 2: { cellWidth: 24 }, 3: { cellWidth: 26 }, 4: { cellWidth: 86 } },
        } as Record<string,unknown>);
        const lastY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 250;
        doc.setFontSize(9);
        doc.text('General Instructions:', 14, Math.min(lastY + 8, 270));
        doc.text('1. Reach exam hall at least 30 minutes before start time.', 14, Math.min(lastY + 14, 276));
        doc.text('2. Bring this hall ticket and valid school ID card.', 14, Math.min(lastY + 20, 282));
      });
      const safeClassName = selectedClass.replace(/[^a-zA-Z0-9_-]/g, '-');
      doc.save(`hall-tickets-${safeClassName}-${hallExamType}-${new Date().toISOString().slice(0, 10)}.pdf`);
      showToast(`Hall tickets downloaded for ${classStudents.length} students`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to download hall tickets', 'error');
    } finally {
      hallLoading = false;
    }
  }

  // ── No Due Certificate ────────────────────────────────────────────────────────

  async function handleDownloadNoDueCertificate() {
    if (!noDueStudentName.trim()) { showToast('Please enter student name', 'error'); return; }
    if (!noDueClassName.trim()) { showToast('Please enter class name', 'error'); return; }
    noDueLoading = true;
    try {
      const libs = await loadJsPDF();
      if (!libs) { alert('PDF: use browser print instead'); return; }
      const { jsPDF } = libs;
      const issueDate = new Date();
      const issueDateLabel = issueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
      const dateCode = `${issueDate.getFullYear()}${String(issueDate.getMonth() + 1).padStart(2, '0')}${String(issueDate.getDate()).padStart(2, '0')}`;
      const certificateNo = `NDC-${dateCode}-${String(issueDate.getTime()).slice(-3)}`;
      const schoolInfo = await getBrandedSchoolInfo({
        name: noDueSchoolName.trim() || undefined,
        address: noDueSchoolAddress.trim() || undefined,
        phone: noDueSchoolPhone.trim() || undefined,
        email: noDueSchoolEmail.trim() || undefined,
      });
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      doc.setDrawColor(15, 118, 110);
      doc.setLineWidth(0.7);
      doc.rect(10, 10, 190, 277);
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.3);
      doc.rect(14, 14, 182, 269);
      let contentStartY = addSchoolLetterhead(doc, schoolInfo, { title: 'No Due Certificate', generatedAt: issueDate, accentColor: [15, 118, 110] });
      let metaY = contentStartY + 8;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(19);
      doc.text(noDueSchoolName.trim() || 'School ERP', 105, 28, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.text(noDueSchoolAddress.trim() || 'School Campus Address', 105, 35, { align: 'center' });
      doc.text(`Phone: ${noDueSchoolPhone.trim() || '-'}    Email: ${noDueSchoolEmail.trim() || '-'}`, 105, 41, { align: 'center' });
      doc.setDrawColor(15, 118, 110);
      doc.setLineWidth(0.4);
      doc.line(20, 47, 190, 47);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('NO DUE CERTIFICATE', 105, 60, { align: 'center' });
      contentStartY = addSchoolLetterhead(doc, schoolInfo, { title: 'No Due Certificate', generatedAt: issueDate, accentColor: [15, 118, 110] });
      metaY = contentStartY + 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(`Certificate No: ${certificateNo}`, 20, metaY);
      doc.text(`Date: ${issueDateLabel}`, 150, metaY);
      const statement = [
        `This is to certify that ${noDueStudentName.trim()} ${noDueRollNo.trim() ? `(Roll No: ${noDueRollNo.trim()})` : ''}`,
        `of class ${noDueClassName.trim()} ${noDueAdmissionNo.trim() ? `(Admission No: ${noDueAdmissionNo.trim()})` : ''}`,
        `for the academic year ${noDueAcademicYear.trim() || '-'} has cleared all dues payable to the school.`,
        noDueRemarks.trim() || 'No dues are pending against the student as on date.',
      ].join(' ');
      const wrapped = doc.splitTextToSize(statement, 165);
      const statementY = metaY + 18;
      doc.text(wrapped, 22, statementY);
      const detailsTopY = Math.max(150, statementY + wrapped.length * 6 + 16);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.rect(20, detailsTopY, 170, 52);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Student Details', 24, detailsTopY + 10);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.text(`Student Name: ${noDueStudentName.trim()}`, 24, detailsTopY + 19);
      doc.text(`Class: ${noDueClassName.trim()}`, 24, detailsTopY + 26);
      doc.text(`Roll Number: ${noDueRollNo.trim() || '-'}`, 24, detailsTopY + 33);
      doc.text(`Admission Number: ${noDueAdmissionNo.trim() || '-'}`, 24, detailsTopY + 40);
      doc.text(`Academic Year: ${noDueAcademicYear.trim() || '-'}`, 24, detailsTopY + 47);
      doc.setFont('helvetica', 'normal');
      doc.text('Authorized Signatory', 150, 250, { align: 'center' });
      doc.line(125, 244, 175, 244);
      doc.setFont('helvetica', 'bold');
      doc.text(noDueIssuedBy.trim() || 'Principal', 150, 256, { align: 'center' });
      const safeStudent = noDueStudentName.trim().replace(/[^a-zA-Z0-9_-]/g, '-') || 'student';
      doc.save(`no-due-certificate-${safeStudent}-${dateCode}.pdf`);
      showToast('No Due Certificate downloaded successfully.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to generate no due certificate', 'error');
    } finally {
      noDueLoading = false;
    }
  }

  // ── Transfer Certificate ─────────────────────────────────────────────────────

  async function handleDownloadTransferCertificate() {
    if (!tcStudentName.trim()) { showToast('Please enter student name', 'error'); return; }
    if (!tcClassLastStudied.trim()) { showToast('Please enter class last studied', 'error'); return; }
    tcLoading = true;
    try {
      const libs = await loadJsPDF();
      if (!libs) { alert('PDF: use browser print instead'); return; }
      const { jsPDF, autoTable } = libs;
      const now = new Date();
      const autoNo = `TC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getTime()).slice(-4)}`;
      const certificateNo = tcCertificateNo.trim() || autoNo;
      const issueDate = tcIssueDate ? new Date(tcIssueDate) : now;
      const issueDateLabel = issueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
      const schoolInfo = await getBrandedSchoolInfo({
        name: tcSchoolName.trim() || undefined,
        address: tcSchoolAddress.trim() || undefined,
        phone: tcSchoolPhone.trim() || undefined,
        email: tcSchoolEmail.trim() || undefined,
      });
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      doc.setDrawColor(60, 93, 148);
      doc.setLineWidth(0.8);
      doc.rect(9, 9, 192, 279);
      doc.setLineWidth(0.35);
      doc.rect(13, 13, 184, 271);
      let contentStartY = addSchoolLetterhead(doc, schoolInfo, {
        title: 'Transfer Certificate',
        generatedAt: issueDate,
        accentColor: [60, 93, 148],
        subtitle: (tcBoardName || 'Board of Education').toUpperCase(),
      });
      let metaY = contentStartY + 8;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`S. No: ${certificateNo}`, 16, 20);
      doc.setFontSize(17);
      doc.text((tcBoardName || 'Board of Education').toUpperCase(), 105, 30, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text((tcSchoolName || 'School Name').toUpperCase(), 105, 40, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(tcSchoolAddress || 'School Address', 105, 46, { align: 'center' });
      doc.text(`Phone: ${tcSchoolPhone || '-'}   Email: ${tcSchoolEmail || '-'}`, 105, 51, { align: 'center' });
      doc.setDrawColor(60, 93, 148);
      doc.setLineWidth(0.3);
      doc.line(18, 56, 192, 56);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('TRANSFER CERTIFICATE', 105, 66, { align: 'center' });
      contentStartY = addSchoolLetterhead(doc, schoolInfo, {
        title: 'Transfer Certificate',
        generatedAt: issueDate,
        accentColor: [60, 93, 148],
        subtitle: (tcBoardName || 'Board of Education').toUpperCase(),
      });
      metaY = contentStartY + 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(`Certificate No: ${certificateNo}`, 16, metaY);
      doc.text(`Date of Issue: ${issueDateLabel}`, 194, metaY, { align: 'right' });
      autoTable(doc, {
        startY: metaY + 8,
        theme: 'grid',
        styles: { fontSize: 9.6, cellPadding: 2.6, lineColor: [180, 190, 205], lineWidth: 0.2 },
        columnStyles: { 0: { cellWidth: 78, fontStyle: 'bold' }, 1: { cellWidth: 96 } },
        body: [
          ['1. Certificate No.', certificateNo],
          ['2. Admission No.', tcAdmissionNo || '-'],
          ['3. Name of Student', tcStudentName],
          ['4. Father\'s Name', tcFatherName || '-'],
          ['5. Mother\'s Name', tcMotherName || '-'],
          ['6. Date of Birth', tcDob || '-'],
          ['7. Class Last Studied', tcClassLastStudied],
          ['8. Result of Last Examination', tcResult || '-'],
          ['9. Promoted to Class', tcPromotionClass || '-'],
          ['10. Any Dues', tcDues || 'No'],
          ['11. General Conduct', tcConduct || 'Good'],
          ['12. Date of Leaving', tcLeavingDate || '-'],
          ['13. Reason for Leaving', tcReason || '-'],
          ['14. Date of Issue', issueDateLabel],
        ],
      } as Record<string,unknown>);
      const finalY = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 220;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.text('This is to certify that the above information is correct as per school records.', 16, finalY + 10);
      doc.line(22, 262, 80, 262);
      doc.line(132, 262, 188, 262);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Class Teacher', 51, 268, { align: 'center' });
      doc.text(tcIssuedBy || 'Principal', 160, 268, { align: 'center' });
      const safeStudent = tcStudentName.trim().replace(/[^a-zA-Z0-9_-]/g, '-') || 'student';
      doc.save(`transfer-certificate-${safeStudent}-${now.toISOString().slice(0, 10)}.pdf`);
      showToast('Transfer Certificate downloaded successfully.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to generate transfer certificate', 'error');
    } finally {
      tcLoading = false;
    }
  }

  // ── Bonafide Certificate ─────────────────────────────────────────────────────

  async function handleDownloadBonafideCertificate() {
    if (!bonafideStudentName.trim()) { showToast('Please enter student name', 'error'); return; }
    if (!bonafideClassName.trim()) { showToast('Please enter class name', 'error'); return; }
    bonafideLoading = true;
    try {
      const libs = await loadJsPDF();
      if (!libs) { alert('PDF: use browser print instead'); return; }
      const { jsPDF } = libs;
      const now = new Date();
      const issueDate = bonafideIssueDate ? new Date(bonafideIssueDate) : now;
      const issueDateLabel = issueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
      const refNo = `BON-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getTime()).slice(-4)}`;
      const schoolInfo = await getBrandedSchoolInfo({
        name: bonafideSchoolName.trim() || undefined,
        address: bonafideSchoolAddress.trim() || undefined,
        phone: bonafideSchoolPhone.trim() || undefined,
        email: bonafideSchoolEmail.trim() || undefined,
      });
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      doc.setDrawColor(30, 64, 175);
      doc.setLineWidth(0.8);
      doc.rect(10, 10, 190, 277);
      doc.setLineWidth(0.3);
      doc.rect(14, 14, 182, 269);
      let contentStartY = addSchoolLetterhead(doc, schoolInfo, { title: 'Bonafide Certificate', generatedAt: issueDate, accentColor: [30, 64, 175] });
      let metaY = contentStartY + 8;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text((bonafideSchoolName || 'School Name').toUpperCase(), 105, 30, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.text(`Ref No: ${refNo}`, 16, metaY);
      doc.text(`Date: ${issueDateLabel}`, 194, metaY, { align: 'right' });
      doc.setDrawColor(30, 64, 175);
      doc.line(20, 54, 190, 54);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('BONAFIDE CERTIFICATE', 105, 66, { align: 'center' });
      contentStartY = addSchoolLetterhead(doc, schoolInfo, { title: 'Bonafide Certificate', generatedAt: issueDate, accentColor: [30, 64, 175] });
      metaY = contentStartY + 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      const para = [
        `This is to certify that ${bonafideStudentName.trim()}${bonafideAdmissionNo.trim() ? ` (Admission No: ${bonafideAdmissionNo.trim()})` : ''}`,
        `${bonafideRollNo.trim() ? `Roll No: ${bonafideRollNo.trim()},` : ''} is a bonafide student of this institution,`,
        `studying in class ${bonafideClassName.trim()} during the academic session ${bonafideSession.trim() || '-'}.`,
        `This certificate is issued on request for the purpose of ${bonafidePurpose.trim() || 'official use'}.`,
      ].join(' ');
      const wrappedPara = doc.splitTextToSize(para, 165);
      const bodyStartY = metaY + 18;
      doc.text(wrappedPara, 22, bodyStartY);
      const bodyEndY = bodyStartY + wrappedPara.length * 6;
      doc.setFontSize(10);
      doc.text('This certificate is valid only with authorized signature and school seal.', 22, bodyEndY + 12);
      doc.line(130, 248, 188, 248);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.text(bonafideIssuedBy || 'Principal', 159, 255, { align: 'center' });
      doc.text('Authorized Signatory', 159, 261, { align: 'center' });
      const safeStudent = bonafideStudentName.trim().replace(/[^a-zA-Z0-9_-]/g, '-') || 'student';
      doc.save(`bonafide-certificate-${safeStudent}-${now.toISOString().slice(0, 10)}.pdf`);
      showToast('Bonafide certificate downloaded successfully.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to generate bonafide certificate', 'error');
    } finally {
      bonafideLoading = false;
    }
  }

  // ── reset helpers ────────────────────────────────────────────────────────────

  function resetTcSchoolInfo() {
    const info = getSchoolInfo();
    tcSchoolName = info.name;
    tcSchoolAddress = info.address;
    tcSchoolPhone = info.phone;
    tcSchoolEmail = info.email;
  }

  function resetBonafideSchoolInfo() {
    const info = getSchoolInfo();
    bonafideSchoolName = info.name;
    bonafideSchoolAddress = info.address;
    bonafideSchoolPhone = info.phone;
    bonafideSchoolEmail = info.email;
  }

  function resetNoDueSchoolInfo() {
    const info = getSchoolInfo();
    noDueSchoolName = info.name;
    noDueSchoolAddress = info.address;
    noDueSchoolPhone = info.phone;
    noDueSchoolEmail = info.email;
  }

  const TABS = [
    { id: 'students',  label: 'Student Details' },
    { id: 'staff',     label: 'Staff / Teacher' },
    { id: 'financial', label: 'Financial Report' },
    { id: 'tc',        label: 'Download TC' },
    { id: 'bonafide',  label: 'Bonafide' },
    { id: 'hall',      label: 'Hall Ticket' },
    { id: 'nodue',     label: 'No Due Certificate' },
  ] as const;
</script>

<!-- Toast notification -->
{#if toastVisible}
  <div class="fixed top-5 right-5 z-50 px-5 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all
    {toastType === 'success' ? 'bg-green-600' : 'bg-red-600'}">
    {toastMsg}
  </div>
{/if}

<div class="p-6 bg-gray-50 min-h-screen space-y-6">

  <h1 class="text-2xl font-semibold">Downloads</h1>

  <!-- MAIN TABS -->
  <div class="flex gap-2 flex-wrap">
    {#each TABS as t (t.id)}
      <button
        type="button"
        onclick={() => { tab = t.id as MainTab; }}
        class="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium border transition-colors
          {tab === t.id
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}"
      >
        {#if ['students', 'staff', 'financial'].includes(t.id)}
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        {/if}
        {t.label}
      </button>
    {/each}
  </div>

  <!-- ================= STUDENT DETAILS ================= -->
  {#if tab === 'students'}
    <div class="bg-white rounded-xl p-6 shadow-sm space-y-4 max-w-lg">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div>
          <p class="font-semibold text-gray-800">Student Details Report</p>
          <p class="text-xs text-gray-500">All student records including class, contact, and house info.</p>
        </div>
      </div>
      <button
        type="button"
        disabled={studentReportLoading}
        onclick={() => handleDownloadStudentReport()}
        class="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        style="background:#2563eb"
      >
        {#if studentReportLoading}
          <svg class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          Preparing PDF...
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download Student Details (PDF)
        {/if}
      </button>
    </div>
  {/if}

  <!-- ================= STAFF ================= -->
  {#if tab === 'staff'}
    <div class="bg-white rounded-xl p-6 shadow-sm space-y-4 max-w-lg">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <p class="font-semibold text-gray-800">Teacher &amp; Staff Details Report</p>
          <p class="text-xs text-gray-500">All staff &amp; teacher records including position, contact, and status.</p>
        </div>
      </div>
      <button
        type="button"
        disabled={staffReportLoading}
        onclick={() => handleDownloadStaffReport()}
        class="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md text-white text-sm font-medium hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        style="background:#16a34a"
      >
        {#if staffReportLoading}
          <svg class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          Preparing PDF...
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download Staff Details (PDF)
        {/if}
      </button>
    </div>
  {/if}

  <!-- ================= FINANCIAL ================= -->
  {#if tab === 'financial'}
    <div class="bg-white rounded-xl p-6 shadow-sm space-y-4 max-w-lg">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p class="font-semibold text-gray-800">Financial Report</p>
          <p class="text-xs text-gray-500">Student fee summary — total fee, paid, due, and status for every student.</p>
        </div>
      </div>
      <button
        type="button"
        disabled={financialReportLoading}
        onclick={() => handleDownloadFinancialReport()}
        class="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md text-white text-sm font-medium hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        style="background:#d97706"
      >
        {#if financialReportLoading}
          <svg class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          Preparing PDF...
        {:else}
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download Financial Report (PDF)
        {/if}
      </button>
    </div>
  {/if}

  <!-- ================= DOWNLOAD TC ================= -->
  {#if tab === 'tc'}
    <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <h3 class="text-lg font-semibold text-slate-900">Transfer Certificate</h3>
      <p class="text-sm text-slate-500">Certificate layout is styled similar to your sample. Update fields and download PDF.</p>

      <div class="grid gap-3 md:grid-cols-2">
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Board Name" bind:value={tcBoardName} />
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Certificate No (auto if blank)" bind:value={tcCertificateNo} />
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="School Name" bind:value={tcSchoolName} />
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="School Contact" bind:value={tcSchoolPhone} />
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 md:col-span-2" placeholder="School Address" bind:value={tcSchoolAddress} />
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="School Email" bind:value={tcSchoolEmail} />
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Issued By" bind:value={tcIssuedBy} />
      </div>

      <div class="grid gap-3 md:grid-cols-2">
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Student Name" bind:value={tcStudentName} />
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Admission Number" bind:value={tcAdmissionNo} />
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Father Name" bind:value={tcFatherName} />
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Mother Name" bind:value={tcMotherName} />
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Date of Birth" bind:value={tcDob} />
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Class Last Studied" bind:value={tcClassLastStudied} />
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Result" bind:value={tcResult} />
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Promoted to Class" bind:value={tcPromotionClass} />
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Any Dues" bind:value={tcDues} />
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="General Conduct" bind:value={tcConduct} />
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Date of Leaving" bind:value={tcLeavingDate} />
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Date of Issue (YYYY-MM-DD)" bind:value={tcIssueDate} />
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 md:col-span-2" placeholder="Reason for Leaving" bind:value={tcReason} />
      </div>

      <div class="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={tcLoading}
          onclick={() => handleDownloadTransferCertificate()}
          class="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {#if tcLoading}
            <svg class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            Generating...
          {:else}
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Transfer Certificate
          {/if}
        </button>
        <button
          type="button"
          onclick={resetTcSchoolInfo}
          class="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Reset School Info
        </button>
      </div>
    </div>
  {/if}

  <!-- ================= BONAFIDE ================= -->
  {#if tab === 'bonafide'}
    <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <h3 class="text-lg font-semibold text-slate-900">Bonafide Certificate</h3>
      <p class="text-sm text-slate-500">Fill in school and student details, then generate the bonafide certificate PDF.</p>

      <div class="grid gap-3 md:grid-cols-2">
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="School Name" bind:value={bonafideSchoolName} />
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="School Contact" bind:value={bonafideSchoolPhone} />
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 md:col-span-2" placeholder="School Address" bind:value={bonafideSchoolAddress} />
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="School Email" bind:value={bonafideSchoolEmail} />
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Issued By" bind:value={bonafideIssuedBy} />
      </div>

      <div class="grid gap-3 md:grid-cols-2">
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Student Name" bind:value={bonafideStudentName} />
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Class Name" bind:value={bonafideClassName} />
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Admission Number" bind:value={bonafideAdmissionNo} />
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Roll Number" bind:value={bonafideRollNo} />
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Academic Session" bind:value={bonafideSession} />
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Date of Issue (YYYY-MM-DD)" bind:value={bonafideIssueDate} />
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 md:col-span-2" placeholder="Purpose" bind:value={bonafidePurpose} />
      </div>

      <div class="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={bonafideLoading}
          onclick={() => handleDownloadBonafideCertificate()}
          class="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {#if bonafideLoading}
            <svg class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            Generating...
          {:else}
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Bonafide Certificate
          {/if}
        </button>
        <button
          type="button"
          onclick={resetBonafideSchoolInfo}
          class="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Reset School Info
        </button>
      </div>
    </div>
  {/if}

  <!-- ================= HALL TICKET ================= -->
  {#if tab === 'hall'}
    <div class="space-y-4">
      <div class="flex gap-3">
        <button
          type="button"
          onclick={() => { hallTab = 'individual'; }}
          class="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium border transition-colors
            {hallTab === 'individual'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}"
        >
          Individual Hall Ticket
        </button>
        <button
          type="button"
          onclick={() => { hallTab = 'online'; }}
          class="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium border transition-colors
            {hallTab === 'online'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}"
        >
          Online Individual Hall Ticket
        </button>
      </div>

      {#if hallTab === 'individual'}
        <div class="flex flex-wrap gap-4">
          <select
            bind:value={hallClassName}
            disabled={hallClassLoading || hallClassOptions.length === 0}
            class="w-[220px] px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed bg-white"
          >
            <option value="" disabled selected>{hallClassLoading ? 'Loading classes...' : 'Select Class'}</option>
            {#each hallClassOptions as classOption (classOption)}
              <option value={classOption}>{classOption}</option>
            {/each}
          </select>

          <select
            bind:value={hallExamType}
            class="w-[200px] px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="mid-sem">Mid-Sem Exam</option>
            <option value="final">Final Exam</option>
          </select>

          <button
            type="button"
            disabled={hallLoading}
            onclick={() => handleDownloadHallTickets()}
            class="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {#if hallLoading}
              <svg class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              Preparing Hall Tickets...
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Hall Tickets (All Students)
            {/if}
          </button>

          <button
            type="button"
            disabled={hallClassLoading}
            onclick={() => loadHallClasses()}
            class="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            Refresh Classes
          </button>

          {#if hallClassOptions.length === 0 && !hallClassLoading}
            <input
              class="w-[220px] px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Class Name (manual)"
              bind:value={hallClassName}
            />
          {/if}

          {#if hallClassLoadError}
            <p class="w-full text-xs text-amber-700">{hallClassLoadError}</p>
          {/if}
        </div>
      {/if}

      {#if hallTab === 'online'}
        <div class="flex flex-wrap gap-4">
          <input
            class="w-[200px] px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Class Name"
          />
          <select class="w-[200px] px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="" disabled selected>Select Exam Type</option>
            <option value="online">Online Exam</option>
          </select>
          <input
            class="w-[200px] px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Student Name"
          />
          <button
            type="button"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
        </div>
      {/if}
    </div>
  {/if}

  <!-- ================= NO DUE ================= -->
  {#if tab === 'nodue'}
    <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <h3 class="text-lg font-semibold text-slate-900">No Due Certificate</h3>
      <p class="text-sm text-slate-500">Update school information and student details, then download the certificate PDF.</p>

      <div class="grid gap-3 md:grid-cols-2">
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="School Name" bind:value={noDueSchoolName} />
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="School Contact" bind:value={noDueSchoolPhone} />
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 md:col-span-2" placeholder="School Address" bind:value={noDueSchoolAddress} />
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="School Email" bind:value={noDueSchoolEmail} />
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Issued By (Principal / Admin)" bind:value={noDueIssuedBy} />
      </div>

      <div class="grid gap-3 md:grid-cols-2">
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Student Name" bind:value={noDueStudentName} />
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Class Name" bind:value={noDueClassName} />
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Roll Number" bind:value={noDueRollNo} />
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Admission Number" bind:value={noDueAdmissionNo} />
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Academic Year" bind:value={noDueAcademicYear} />
        <input class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 md:col-span-2" placeholder="Remarks" bind:value={noDueRemarks} />
      </div>

      <div class="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={noDueLoading}
          onclick={() => handleDownloadNoDueCertificate()}
          class="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {#if noDueLoading}
            <svg class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            Generating...
          {:else}
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download No Due Certificate
          {/if}
        </button>
        <button
          type="button"
          onclick={resetNoDueSchoolInfo}
          class="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Reset School Info
        </button>
      </div>
    </div>
  {/if}

</div>
