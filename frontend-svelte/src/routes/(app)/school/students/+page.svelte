<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';

  // ── Types ────────────────────────────────────────────────────────────────────

  type StudentListItem = {
    _id: string;
    admissionNumber?: string;
    name: string;
    email: string;
    class: string;
    classSection?: string;
    academicYear?: string;
    rollNumber: string;
    phone?: string;
    gender?: string;
    photo?: string;
  };

  type StudentRecord = StudentListItem & {
    formNumber?: string;
    aadharNumber?: string;
    dateOfBirth?: string;
    placeOfBirth?: string;
    state?: string;
    nationality?: string;
    religion?: string;
    caste?: string;
    pinCode?: string;
    motherTongue?: string;
    bloodGroup?: string;
    address?: string;
    identificationMarks?: string;
    previousAcademicRecord?: string;
    achievements?: string;
    generalBehaviour?: string;
    medicalHistory?: string;
    languagePreferences?: string[] | string;
  };

  type SchoolClass = {
    _id: string;
    name: string;
  };

  type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue';

  type FeeComponent = {
    label: string;
    amount: number;
  };

  type PaymentReceipt = {
    receiptNumber: string;
    transactionId: string;
    paymentDate: string;
    amountPaid: number;
    paymentType?: 'upi' | 'card' | 'cash' | 'cheque';
  };

  type StudentFeeSummary = {
    financeId?: string | null;
    totalFee: number;
    totalAssignedAmount?: number;
    paidAmount: number;
    totalPaidAmount?: number;
    remainingAmount: number;
    pendingBalance?: number;
    currentDueAmount?: number;
    olderPendingAmount?: number;
    status: PaymentStatus;
    paymentStatus?: PaymentStatus;
    dueDate?: string | null;
    effectiveDueDate?: string | null;
    academicYear?: string | null;
    feeComponents?: FeeComponent[];
    latestReceipt?: PaymentReceipt | null;
    paymentHistory?: PaymentReceipt[];
    isOverdue?: boolean;
    extensionGranted?: boolean;
    extensionGrantedAt?: string | null;
    extensionExpiresAt?: string | null;
    extensionGrantedBy?: string | null;
    extensionReason?: string | null;
    extensionEligible?: boolean;
  };

  type StudentForm = {
    formNumber: string;
    admissionNumber: string;
    name: string;
    email: string;
    class: string;
    classSection: string;
    academicYear: string;
    rollNumber: string;
    phone: string;
    aadharNumber: string;
    gender: string;
    dateOfBirth: string;
    placeOfBirth: string;
    state: string;
    nationality: string;
    religion: string;
    caste: string;
    pinCode: string;
    motherTongue: string;
    bloodGroup: string;
    photo: string;
    address: string;
    identificationMarks: string;
    previousAcademicRecord: string;
    achievements: string;
    generalBehaviour: string;
    medicalHistory: string;
    languagePreferences: string;
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const asText = (value: unknown): string => String(value ?? '').trim();

  const toStudentListItem = (student: Partial<StudentRecord>): StudentListItem => ({
    _id: asText(student._id),
    admissionNumber: asText(student.admissionNumber) || undefined,
    name: asText(student.name) || 'Student',
    email: asText(student.email),
    class: asText(student.class),
    classSection: asText(student.classSection) || undefined,
    academicYear: asText(student.academicYear) || undefined,
    rollNumber: asText(student.rollNumber),
    phone: asText(student.phone) || undefined,
    gender: asText(student.gender) || undefined,
    photo: asText(student.photo) || undefined,
  });

  const toSchoolClass = (schoolClass: Partial<SchoolClass>): SchoolClass => ({
    _id: asText(schoolClass._id),
    name: asText(schoolClass.name),
  });

  const emptyForm = (): StudentForm => ({
    formNumber: '',
    admissionNumber: '',
    name: '',
    email: '',
    class: '',
    classSection: '',
    academicYear: '',
    rollNumber: '',
    phone: '',
    aadharNumber: '',
    gender: '',
    dateOfBirth: '',
    placeOfBirth: '',
    state: '',
    nationality: '',
    religion: '',
    caste: '',
    pinCode: '',
    motherTongue: '',
    bloodGroup: '',
    photo: '',
    address: '',
    identificationMarks: '',
    previousAcademicRecord: '',
    achievements: '',
    generalBehaviour: '',
    medicalHistory: '',
    languagePreferences: '',
  });

  const toForm = (student: Partial<StudentRecord>): StudentForm => ({
    formNumber: student.formNumber || '',
    admissionNumber: student.admissionNumber || '',
    name: student.name || '',
    email: student.email || '',
    class: student.class || '',
    classSection: student.classSection || '',
    academicYear: student.academicYear || '',
    rollNumber: student.rollNumber || '',
    phone: student.phone || '',
    aadharNumber: student.aadharNumber || '',
    gender: student.gender || '',
    dateOfBirth: student.dateOfBirth || '',
    placeOfBirth: student.placeOfBirth || '',
    state: student.state || '',
    nationality: student.nationality || '',
    religion: student.religion || '',
    caste: student.caste || '',
    pinCode: student.pinCode || '',
    motherTongue: student.motherTongue || '',
    bloodGroup: student.bloodGroup || '',
    photo: student.photo || '',
    address: student.address || '',
    identificationMarks: student.identificationMarks || '',
    previousAcademicRecord: student.previousAcademicRecord || '',
    achievements: student.achievements || '',
    generalBehaviour: student.generalBehaviour || '',
    medicalHistory: student.medicalHistory || '',
    languagePreferences: Array.isArray(student.languagePreferences)
      ? student.languagePreferences.join(', ')
      : student.languagePreferences || '',
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(Number(value || 0));

  const formatDate = (value?: string | null) => {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  };

  const getDisplayDueDate = (summary: StudentFeeSummary | null) =>
    summary?.effectiveDueDate || summary?.dueDate || null;

  const getStatusBadgeClass = (status?: string) => {
    if (status === 'paid') return 'bg-green-100 text-green-700';
    if (status === 'partial') return 'bg-amber-100 text-amber-700';
    if (status === 'overdue') return 'bg-red-100 text-red-700';
    return 'bg-slate-100 text-slate-700';
  };

  const resizeImage = (file: File, maxPx: number): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read image'));
      reader.onload = (event) => {
        const image = new Image();
        image.onerror = () => reject(new Error('Invalid image'));
        image.onload = () => {
          const canvas = document.createElement('canvas');
          const scale = Math.min(maxPx / image.width, maxPx / image.height, 1);
          canvas.width = Math.round(image.width * scale);
          canvas.height = Math.round(image.height * scale);
          const context = canvas.getContext('2d');
          if (!context) {
            reject(new Error('Canvas unsupported'));
            return;
          }
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        image.src = (event.target as FileReader).result as string;
      };
      reader.readAsDataURL(file);
    });

  // ── Reactive state ───────────────────────────────────────────────────────────

  const schoolId = $derived($page.data.user?.schoolId ?? '');

  let students = $state<StudentListItem[]>([]);
  let classes = $state<SchoolClass[]>([]);
  let loading = $state(true);
  let error = $state('');
  let search = $state('');

  let editingId = $state('');
  let editorOpen = $state(false);
  let editorLoading = $state(false);
  let editorSaving = $state(false);
  let editorError = $state('');
  let form = $state<StudentForm>(emptyForm());
  let photoPreview = $state('');
  let feeSummary = $state<StudentFeeSummary | null>(null);
  let feeSummaryError = $state('');
  let grantingExtension = $state(false);

  const filteredStudents = $derived(() => {
    const query = search.toLowerCase();
    return students.filter(
      (student) =>
        !query ||
        asText(student.name).toLowerCase().includes(query) ||
        asText(student.email).toLowerCase().includes(query) ||
        asText(student.rollNumber).toLowerCase().includes(query) ||
        asText(student.admissionNumber).toLowerCase().includes(query)
    );
  });

  // ── Data fetching ────────────────────────────────────────────────────────────

  const fetchStudents = async () => {
    try {
      loading = true;
      error = '';
      if (!schoolId) {
        throw new Error('School not found. Please log in again.');
      }
      const [studentsRes, classesRes] = await Promise.all([
        fetch(`/api/students/${schoolId}`),
        fetch(`/api/classes?schoolId=${schoolId}`),
      ]);
      if (!studentsRes.ok) throw new Error(`Failed to load students (${studentsRes.status})`);
      if (!classesRes.ok) throw new Error(`Failed to load classes (${classesRes.status})`);
      const studentData = await studentsRes.json().catch(() => []);
      const classData = await classesRes.json().catch(() => []);

      // Go backend: { success, data: { students: [...], total } } or { success, data: [...] } or raw array
      const unwrap = (d: unknown): unknown[] => {
        const inner = (d as Record<string, unknown>)?.data;
        if (Array.isArray(inner)) return inner;
        if (Array.isArray((inner as Record<string, unknown>)?.students)) return (inner as Record<string, unknown[]>).students;
        if (Array.isArray(d)) return d;
        return [];
      };
      students = (unwrap(studentData) as Partial<StudentRecord>[]).map((s) => toStudentListItem(s ?? {}));
      classes = (unwrap(classData) as Partial<SchoolClass>[])
          .map((c) => toSchoolClass(c ?? {}))
          .filter((c) => c._id && c.name);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to fetch student data';
      students = [];
      classes = [];
    } finally {
      loading = false;
    }
  };

  const fetchStudentFeeSummary = async (sid: string, studentId: string): Promise<StudentFeeSummary> => {
    const response = await fetch(`/api/finance/${sid}/students/${studentId}/summary`);
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.message || 'Failed to load student fee summary');
    }
    return data as StudentFeeSummary;
  };

  // ── Editor actions ───────────────────────────────────────────────────────────

  const openEditor = async (studentId: string) => {
    editorOpen = true;
    editorLoading = true;
    editorError = '';
    feeSummary = null;
    feeSummaryError = '';
    editingId = studentId;

    try {
      if (!schoolId) {
        throw new Error('School not found. Please log in again.');
      }

      const [studentResponse, summary] = await Promise.all([
        fetch(`/api/students/${studentId}`),
        fetchStudentFeeSummary(schoolId, studentId).catch((err: unknown) => {
          feeSummaryError = err instanceof Error ? err.message : 'Failed to load fee summary';
          return null;
        }),
      ]);

      if (!studentResponse.ok)
        throw new Error(`Failed to load student (${studentResponse.status})`);
      const student = await studentResponse.json();
      const nextForm = toForm(student);
      form = nextForm;
      photoPreview = nextForm.photo;
      feeSummary = summary;
    } catch (err) {
      editorError = err instanceof Error ? err.message : 'Failed to load student';
    } finally {
      editorLoading = false;
    }
  };

  const closeEditor = () => {
    editorOpen = false;
    editorLoading = false;
    editorSaving = false;
    editorError = '';
    editingId = '';
    form = emptyForm();
    photoPreview = '';
    feeSummary = null;
    feeSummaryError = '';
    grantingExtension = false;
  };

  const saveStudent = async (event: Event) => {
    event.preventDefault();
    if (!editingId) return;
    try {
      editorSaving = true;
      editorError = '';
      const response = await fetch(`/api/students/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          languagePreferences: form.languagePreferences
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean),
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'Failed to update student');
      await fetchStudents();
      closeEditor();
    } catch (err) {
      editorError = err instanceof Error ? err.message : 'Failed to update student';
    } finally {
      editorSaving = false;
    }
  };

  const deleteStudent = async (studentId: string) => {
    if (!confirm('Are you sure you want to delete this student?')) return;
    try {
      const response = await fetch(`/api/students/${studentId}`, { method: 'DELETE' });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'Failed to delete student');
      await fetchStudents();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete student');
    }
  };

  const handlePhotoSelect = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const image = await resizeImage(file, 320);
      photoPreview = image;
      form = { ...form, photo: image };
    } catch (err) {
      editorError = err instanceof Error ? err.message : 'Failed to process image';
    } finally {
      input.value = '';
    }
  };

  const grantFeeExtension = async () => {
    if (!editingId) return;
    if (!schoolId) {
      feeSummaryError = 'School not found. Please log in again.';
      return;
    }
    try {
      grantingExtension = true;
      feeSummaryError = '';
      const response = await fetch(
        `/api/finance/${schoolId}/students/${editingId}/extension`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || 'Failed to grant fee extension');
      }
      feeSummary = (data?.data || null) as StudentFeeSummary | null;
    } catch (err) {
      feeSummaryError = err instanceof Error ? err.message : 'Failed to grant fee extension';
    } finally {
      grantingExtension = false;
    }
  };

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  onMount(() => {
    void fetchStudents();
  });

  // ── Constants ────────────────────────────────────────────────────────────────

  const textAreaFields: [keyof StudentForm, string][] = [
    ['address', 'Residential Address'],
    ['identificationMarks', 'Identification Marks'],
    ['previousAcademicRecord', 'Previous Academic Record'],
    ['achievements', 'Achievements'],
    ['generalBehaviour', 'General Behaviour'],
    ['medicalHistory', 'Medical History'],
  ];
</script>

<svelte:head><title>Student Management — ERP Portal</title></svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
    <div>
      <h2 class="text-2xl font-bold">Student Management</h2>
      <p class="text-sm text-muted-foreground">Edit existing admission records fetched from the backend.</p>
    </div>
    <button
      type="button"
      onclick={() => void fetchStudents()}
      class="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
        <path d="M21 3v5h-5"/>
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
        <path d="M8 16H3v5"/>
      </svg>
      Refresh Records
    </button>
  </div>

  <!-- Search -->
  <input
    class="w-full rounded border p-2"
    placeholder="Search by name, admission number, roll number, or email"
    value={search}
    oninput={(e) => (search = (e.currentTarget as HTMLInputElement).value)}
  />

  <!-- Table / loading / error -->
  {#if loading}
    <p class="text-center text-gray-500">Loading students...</p>
  {:else if error}
    <p class="text-center text-red-600">{error}</p>
  {:else}
    <div class="stat-card overflow-x-auto p-0">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b bg-muted/40">
            <th class="p-3 text-left">Student</th>
            <th class="p-3 text-left">Admission No</th>
            <th class="p-3 text-left">Class</th>
            <th class="p-3 text-left">Roll No</th>
            <th class="p-3 text-left">Email</th>
            <th class="p-3 text-left">Phone</th>
            <th class="p-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each filteredStudents() as student (student._id)}
            <tr class="border-b hover:bg-gray-50">
              <td class="p-3">
                <div class="flex items-center gap-3">
                  <div class="h-10 w-10 overflow-hidden rounded-full border bg-gray-100">
                    {#if student.photo}
                      <img src={student.photo} alt={student.name} class="h-full w-full object-cover" />
                    {:else}
                      <div class="flex h-full w-full items-center justify-center text-xs font-semibold text-gray-500">
                        {asText(student.name).slice(0, 2).toUpperCase() || 'ST'}
                      </div>
                    {/if}
                  </div>
                  <div>
                    <p class="font-medium">{student.name}</p>
                    <p class="text-xs text-muted-foreground">{student.gender || '-'}</p>
                  </div>
                </div>
              </td>
              <td class="p-3">{student.admissionNumber || '-'}</td>
              <td class="p-3">{student.class}{student.classSection ? ` - ${student.classSection}` : ''}</td>
              <td class="p-3">{student.rollNumber}</td>
              <td class="p-3">{student.email}</td>
              <td class="p-3">{student.phone || '-'}</td>
              <td class="p-3">
                <div class="flex gap-3">
                  <button
                    type="button"
                    onclick={() => void openEditor(student._id)}
                    class="text-blue-600 hover:text-blue-800"
                    aria-label="Edit student"
                  >
                    <!-- Edit icon -->
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    onclick={() => void deleteStudent(student._id)}
                    class="text-red-600 hover:text-red-800"
                    aria-label="Delete student"
                  >
                    <!-- Trash icon -->
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6"/>
                      <path d="M14 11v6"/>
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<!-- ── Editor Modal ────────────────────────────────────────────────────────── -->
{#if editorOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div class="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

      <!-- Modal header -->
      <div class="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-4">
        <div>
          <h3 class="text-xl font-semibold">Edit Student Admission</h3>
          <p class="text-sm text-muted-foreground">Auto-filled from backend data.</p>
        </div>
        <button
          type="button"
          onclick={closeEditor}
          class="rounded-full p-2 hover:bg-gray-100"
          aria-label="Close"
        >
          <!-- X icon -->
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div class="p-6">
        {#if editorLoading}
          <p class="text-center text-gray-500">Loading admission record...</p>
        {:else}
          <form onsubmit={saveStudent} class="space-y-6">
            {#if editorError}
              <div class="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {editorError}
              </div>
            {/if}

            <div class="grid gap-6 xl:grid-cols-[260px_320px_1fr]">

              <!-- Photo column -->
              <div class="rounded-xl border bg-slate-50 p-4">
                <p class="mb-3 text-sm font-semibold">Student Photo</p>
                <div class="mb-4 flex h-72 items-center justify-center overflow-hidden rounded-xl border bg-white">
                  {#if photoPreview}
                    <img src={photoPreview} alt={form.name || 'Student'} class="h-full w-full object-cover" />
                  {:else}
                    <span class="text-sm text-muted-foreground">No photo available</span>
                  {/if}
                </div>
                <label class="inline-flex cursor-pointer items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
                  <!-- ImagePlus icon -->
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                    <line x1="16" y1="5" x2="16" y2="11"/>
                    <line x1="13" y1="8" x2="19" y2="8"/>
                  </svg>
                  Replace Photo
                  <input
                    type="file"
                    accept="image/*"
                    onchange={(e) => void handlePhotoSelect(e)}
                    class="hidden"
                  />
                </label>
              </div>

              <!-- Fee Summary column -->
              <div class="rounded-xl border bg-slate-50 p-4">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-sm font-semibold text-slate-900">Fee Summary</p>
                    <p class="mt-1 text-xs text-muted-foreground">
                      Current fee, old pending balance, and one-time extension status.
                    </p>
                  </div>
                  <span class={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(feeSummary?.paymentStatus || feeSummary?.status)}`}>
                    {String(feeSummary?.paymentStatus || feeSummary?.status || 'pending').toUpperCase()}
                  </span>
                </div>

                {#if feeSummaryError}
                  <div class="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {feeSummaryError}
                  </div>
                {/if}

                {#if feeSummary}
                  <div class="mt-4 space-y-3 text-sm">
                    <!-- Amounts -->
                    <div class="rounded-xl border bg-white p-3">
                      <div class="flex items-center justify-between">
                        <span class="text-slate-500">Current Fee Due</span>
                        <span class="font-semibold text-slate-900">
                          {formatCurrency(feeSummary.currentDueAmount ?? feeSummary.pendingBalance ?? feeSummary.remainingAmount)}
                        </span>
                      </div>
                      <div class="mt-2 flex items-center justify-between">
                        <span class="text-slate-500">Past Fee Pending</span>
                        <span class="font-semibold text-rose-700">
                          {formatCurrency(feeSummary.olderPendingAmount ?? 0)}
                        </span>
                      </div>
                      <div class="mt-2 flex items-center justify-between">
                        <span class="text-slate-500">Total Paid</span>
                        <span class="font-semibold text-emerald-700">
                          {formatCurrency(feeSummary.totalPaidAmount ?? feeSummary.paidAmount)}
                        </span>
                      </div>
                      <div class="mt-2 flex items-center justify-between">
                        <span class="text-slate-500">Total Assigned</span>
                        <span class="font-semibold text-slate-900">
                          {formatCurrency(feeSummary.totalAssignedAmount ?? feeSummary.totalFee)}
                        </span>
                      </div>
                      <div class="mt-2 flex items-center justify-between">
                        <span class="text-slate-500">Effective Due Date</span>
                        <span class="font-semibold text-slate-900">
                          {formatDate(getDisplayDueDate(feeSummary))}
                        </span>
                      </div>
                      <div class="mt-2 flex items-center justify-between">
                        <span class="text-slate-500">Original Due Date</span>
                        <span class="font-semibold text-slate-900">
                          {formatDate(feeSummary.dueDate)}
                        </span>
                      </div>
                    </div>

                    <!-- Fee Components -->
                    {#if feeSummary.feeComponents && feeSummary.feeComponents.length > 0}
                      <div class="rounded-xl border bg-white p-3">
                        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Fee Components</p>
                        <div class="mt-3 space-y-2">
                          {#each feeSummary.feeComponents as component (`${component.label}-${component.amount}`)}
                            <div class="flex items-center justify-between text-sm">
                              <span class="text-slate-600">{component.label}</span>
                              <span class="font-semibold text-slate-900">{formatCurrency(component.amount)}</span>
                            </div>
                          {/each}
                        </div>
                      </div>
                    {/if}

                    <!-- Overdue notice -->
                    {#if feeSummary.isOverdue}
                      <div class="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
                        This fee is overdue. If it has stayed pending for more than one month, you can grant one extra month from here.
                      </div>
                    {:else}
                      <div class="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
                        No overdue action is needed right now.
                      </div>
                    {/if}

                    <!-- Extension -->
                    {#if feeSummary.extensionGranted}
                      <div class="rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 text-sm text-blue-700">
                        <p class="font-semibold">One-month extension granted</p>
                        <p class="mt-1">Valid until {formatDate(feeSummary.extensionExpiresAt)}.</p>
                        <p class="mt-1">
                          Approved by {feeSummary.extensionGrantedBy || 'School Admin'} on {formatDate(feeSummary.extensionGrantedAt)}.
                        </p>
                      </div>
                    {:else if feeSummary.extensionEligible}
                      <button
                        type="button"
                        onclick={() => void grantFeeExtension()}
                        disabled={grantingExtension}
                        class="w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-70"
                      >
                        {grantingExtension ? 'Granting Extension...' : 'Grant 1-Month Extension'}
                      </button>
                    {:else}
                      <div class="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600">
                        Extension becomes available only when the unpaid fee stays pending for more than one month.
                      </div>
                    {/if}
                  </div>
                {:else}
                  <div class="mt-4 rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
                    Fee summary is not available for this student yet.
                  </div>
                {/if}
              </div>

              <!-- Form fields column -->
              <div class="grid gap-4 md:grid-cols-2">
                <label class="block space-y-2">
                  <span class="text-sm font-medium text-slate-700">Form Number</span>
                  <input
                    class="w-full rounded border p-2"
                    value={form.formNumber}
                    oninput={(e) => (form = { ...form, formNumber: (e.currentTarget as HTMLInputElement).value })}
                  />
                </label>

                <label class="block space-y-2">
                  <span class="text-sm font-medium text-slate-700">Admission Number</span>
                  <input
                    class="w-full rounded border p-2"
                    value={form.admissionNumber}
                    oninput={(e) => (form = { ...form, admissionNumber: (e.currentTarget as HTMLInputElement).value })}
                  />
                </label>

                <label class="block space-y-2">
                  <span class="text-sm font-medium text-slate-700">Full Name</span>
                  <input
                    class="w-full rounded border p-2"
                    value={form.name}
                    oninput={(e) => (form = { ...form, name: (e.currentTarget as HTMLInputElement).value })}
                    required
                  />
                </label>

                <label class="block space-y-2">
                  <span class="text-sm font-medium text-slate-700">Email</span>
                  <input
                    type="email"
                    class="w-full rounded border p-2"
                    value={form.email}
                    oninput={(e) => (form = { ...form, email: (e.currentTarget as HTMLInputElement).value })}
                    required
                  />
                </label>

                <label class="block space-y-2">
                  <span class="text-sm font-medium text-slate-700">Class</span>
                  <div class="space-y-2">
                    <select
                      class="w-full rounded border p-2"
                      value={classes.some((c) => c.name === form.class) ? form.class : ''}
                      onchange={(e) => (form = { ...form, class: (e.currentTarget as HTMLSelectElement).value })}
                    >
                      <option value="">Select class</option>
                      {#each classes as schoolClass (schoolClass._id)}
                        <option value={schoolClass.name}>{schoolClass.name}</option>
                      {/each}
                    </select>
                    <input
                      class="w-full rounded border p-2"
                      value={form.class}
                      oninput={(e) => (form = { ...form, class: (e.currentTarget as HTMLInputElement).value })}
                      required
                    />
                  </div>
                </label>

                <label class="block space-y-2">
                  <span class="text-sm font-medium text-slate-700">Section</span>
                  <input
                    class="w-full rounded border p-2"
                    value={form.classSection}
                    oninput={(e) => (form = { ...form, classSection: (e.currentTarget as HTMLInputElement).value })}
                  />
                </label>

                <label class="block space-y-2">
                  <span class="text-sm font-medium text-slate-700">Academic Year</span>
                  <input
                    class="w-full rounded border p-2"
                    value={form.academicYear}
                    oninput={(e) => (form = { ...form, academicYear: (e.currentTarget as HTMLInputElement).value })}
                  />
                </label>

                <label class="block space-y-2">
                  <span class="text-sm font-medium text-slate-700">Roll Number</span>
                  <input
                    class="w-full rounded border p-2"
                    value={form.rollNumber}
                    oninput={(e) => (form = { ...form, rollNumber: (e.currentTarget as HTMLInputElement).value })}
                    required
                  />
                </label>

                <label class="block space-y-2">
                  <span class="text-sm font-medium text-slate-700">Phone</span>
                  <input
                    class="w-full rounded border p-2"
                    value={form.phone}
                    oninput={(e) => (form = { ...form, phone: (e.currentTarget as HTMLInputElement).value })}
                  />
                </label>

                <label class="block space-y-2">
                  <span class="text-sm font-medium text-slate-700">Aadhar Number</span>
                  <input
                    class="w-full rounded border p-2"
                    value={form.aadharNumber}
                    oninput={(e) => (form = { ...form, aadharNumber: (e.currentTarget as HTMLInputElement).value })}
                  />
                </label>

                <label class="block space-y-2">
                  <span class="text-sm font-medium text-slate-700">Gender</span>
                  <select
                    class="w-full rounded border p-2"
                    value={form.gender}
                    onchange={(e) => (form = { ...form, gender: (e.currentTarget as HTMLSelectElement).value })}
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </label>

                <label class="block space-y-2">
                  <span class="text-sm font-medium text-slate-700">Date of Birth</span>
                  <input
                    type="date"
                    class="w-full rounded border p-2"
                    value={form.dateOfBirth}
                    oninput={(e) => (form = { ...form, dateOfBirth: (e.currentTarget as HTMLInputElement).value })}
                  />
                </label>

                <label class="block space-y-2">
                  <span class="text-sm font-medium text-slate-700">Place of Birth</span>
                  <input
                    class="w-full rounded border p-2"
                    value={form.placeOfBirth}
                    oninput={(e) => (form = { ...form, placeOfBirth: (e.currentTarget as HTMLInputElement).value })}
                  />
                </label>

                <label class="block space-y-2">
                  <span class="text-sm font-medium text-slate-700">State</span>
                  <input
                    class="w-full rounded border p-2"
                    value={form.state}
                    oninput={(e) => (form = { ...form, state: (e.currentTarget as HTMLInputElement).value })}
                  />
                </label>

                <label class="block space-y-2">
                  <span class="text-sm font-medium text-slate-700">Nationality</span>
                  <input
                    class="w-full rounded border p-2"
                    value={form.nationality}
                    oninput={(e) => (form = { ...form, nationality: (e.currentTarget as HTMLInputElement).value })}
                  />
                </label>

                <label class="block space-y-2">
                  <span class="text-sm font-medium text-slate-700">Religion</span>
                  <input
                    class="w-full rounded border p-2"
                    value={form.religion}
                    oninput={(e) => (form = { ...form, religion: (e.currentTarget as HTMLInputElement).value })}
                  />
                </label>

                <label class="block space-y-2">
                  <span class="text-sm font-medium text-slate-700">Caste</span>
                  <input
                    class="w-full rounded border p-2"
                    value={form.caste}
                    oninput={(e) => (form = { ...form, caste: (e.currentTarget as HTMLInputElement).value })}
                  />
                </label>

                <label class="block space-y-2">
                  <span class="text-sm font-medium text-slate-700">Pin Code</span>
                  <input
                    class="w-full rounded border p-2"
                    value={form.pinCode}
                    oninput={(e) => (form = { ...form, pinCode: (e.currentTarget as HTMLInputElement).value })}
                  />
                </label>

                <label class="block space-y-2">
                  <span class="text-sm font-medium text-slate-700">Mother Tongue</span>
                  <input
                    class="w-full rounded border p-2"
                    value={form.motherTongue}
                    oninput={(e) => (form = { ...form, motherTongue: (e.currentTarget as HTMLInputElement).value })}
                  />
                </label>

                <label class="block space-y-2">
                  <span class="text-sm font-medium text-slate-700">Blood Group</span>
                  <input
                    class="w-full rounded border p-2"
                    value={form.bloodGroup}
                    oninput={(e) => (form = { ...form, bloodGroup: (e.currentTarget as HTMLInputElement).value })}
                  />
                </label>

                <label class="block space-y-2">
                  <span class="text-sm font-medium text-slate-700">Language Preferences</span>
                  <input
                    class="w-full rounded border p-2"
                    value={form.languagePreferences}
                    oninput={(e) => (form = { ...form, languagePreferences: (e.currentTarget as HTMLInputElement).value })}
                    placeholder="English, Hindi"
                  />
                </label>

                <!-- Textarea fields -->
                <div class="md:col-span-2 space-y-4">
                  {#each textAreaFields as [key, label]}
                    <label class="block space-y-2">
                      <span class="text-sm font-medium text-slate-700">{label}</span>
                      <textarea
                        class="w-full rounded border p-2"
                        rows={2}
                        value={form[key]}
                        oninput={(e) => (form = { ...form, [key]: (e.currentTarget as HTMLTextAreaElement).value })}
                      ></textarea>
                    </label>
                  {/each}
                </div>
              </div>
            </div>

            <!-- Footer actions -->
            <div class="flex justify-end gap-3 border-t pt-4">
              <button
                type="button"
                onclick={closeEditor}
                class="rounded border px-4 py-2 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editorSaving}
                class="rounded bg-blue-600 px-5 py-2 text-white hover:bg-blue-700 disabled:opacity-70"
              >
                {editorSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        {/if}
      </div>
    </div>
  </div>
{/if}
