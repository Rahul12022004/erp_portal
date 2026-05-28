<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import {
    ChevronDown, ChevronUp, Download, Loader2,
    PencilLine, Plus, Printer, QrCode, Save, ScanLine, ShieldCheck, Upload,
  } from 'lucide-svelte';

  type Status = 'Approved' | 'Pending' | 'Rejected';
  type VisitorForm = {
    passId: string; regDate: string; requestMode: string; passStatus: Status;
    fullName: string; photo: string; mobile: string; email: string; address: string;
    vehicleNumber: string; vehicleInfo: string; idType: string; idNumber: string;
    idProof: string; idProofFileName: string; visitDate: string; entryTime: string;
    exitTime: string; visitType: string; purpose: string;
    personToMeetType: string; personToMeet: string; department: string;
    studentClass: string; studentName: string; approvalStatus: Status;
  };
  type VisitorRecord = VisitorForm & { _id: string; schoolId: string; updatedAt?: string };
  type StudentRecord = { _id: string; name: string; class: string };
  type StaffRecord = { _id: string; name: string; position?: string };

  const statusClasses: Record<Status, string> = {
    Approved: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    Pending: 'bg-amber-100 text-amber-700 border border-amber-200',
    Rejected: 'bg-rose-100 text-rose-700 border border-rose-200',
  };

  const requestModes = ['Walk-in', 'Phone Request', 'Email Request', 'Online'];
  const visitTypes = ['Official', 'Personal', 'Parent', 'Vendor'];
  const departments = ['Admin', 'Accounts', 'Principal'];
  const idTypes = ['Aadhar', 'PAN', 'Driving License', 'Other'];
  const meetTypes = ['Student', 'Teacher', 'Staff'];

  function emptyForm(): VisitorForm {
    return {
      passId: '', regDate: '', requestMode: 'Walk-in', passStatus: 'Pending',
      fullName: '', photo: '', mobile: '', email: '', address: '',
      vehicleNumber: '', vehicleInfo: '', idType: 'Aadhar', idNumber: '',
      idProof: '', idProofFileName: '', visitDate: '', entryTime: '', exitTime: '',
      visitType: 'Official', purpose: '', personToMeetType: 'Staff', personToMeet: '',
      department: 'Admin', studentClass: '', studentName: '', approvalStatus: 'Pending',
    };
  }

  function mask(value: string, visibleEnd = 4) {
    if (!value) return '-';
    if (value.length <= visibleEnd) return value;
    return `${'*'.repeat(value.length - visibleEnd)}${value.slice(-visibleEnd)}`;
  }

  function printable(value: string | undefined) { return value || '-'; }

  const schoolId = $derived($page.data.user?.schoolId ?? '');
  const schoolInfo = $derived($page.data.user?.schoolInfo ?? null);

  let records = $state<VisitorRecord[]>([]);
  let students = $state<StudentRecord[]>([]);
  let staff = $state<StaffRecord[]>([]);
  let selectedId = $state('');
  let form = $state<VisitorForm>(emptyForm());
  let loading = $state(true);
  let saving = $state(false);
  let editing = $state(false);
  let error = $state('');
  let makePassCollapsed = $state(false);
  let scanInput = $state('');
  let scanLoading = $state(false);
  let searchTerm = $state('');
  let selectedDateFilter = $state('');

  const studentClassOptions = $derived(
    [...new Set(students.map(s => s.class).filter(Boolean))].sort()
  );

  const studentNameOptions = $derived(
    students
      .filter(s => !form.studentClass || s.class === form.studentClass)
      .map(s => s.name).sort()
  );

  const personOptions = $derived(() => {
    if (form.personToMeetType === 'Teacher') return staff.filter(m => /teacher/i.test(m.position ?? '')).map(m => m.name).sort();
    if (form.personToMeetType === 'Student') return studentNameOptions;
    return staff.map(m => m.name).sort();
  });

  const selectedRecord = $derived(records.find(r => r._id === selectedId) ?? null);
  const passPersonToMeet = $derived(form.personToMeetType === 'Student' ? form.studentName : form.personToMeet);

  const filteredRecords = $derived(
    records.filter(record => {
      const matchesDate = !selectedDateFilter || record.visitDate === selectedDateFilter || record.regDate === selectedDateFilter;
      if (!matchesDate) return false;
      const query = searchTerm.trim().toLowerCase();
      if (!query) return true;
      return [record.passId, record.fullName, record.mobile, record.email, record.personToMeet, record.studentName, record.vehicleNumber]
        .filter(Boolean).some(v => String(v).toLowerCase().includes(query));
    })
  );

  const visibleSelectedRecord = $derived(filteredRecords.find(r => r._id === selectedId) ?? null);

  $effect(() => {
    if (editing || filteredRecords.length === 0) return;
    const isVisible = filteredRecords.some(r => r._id === selectedId);
    if (!isVisible) hydrateRecord(filteredRecords[0]);
  });

  onMount(async () => {
    if (!schoolId) { error = 'School not found.'; loading = false; return; }
    try {
      const [visitorRes, studentRes, staffRes] = await Promise.all([
        fetch(`/api/visitors/school/${schoolId}`),
        fetch(`/api/students/${schoolId}`),
        fetch(`/api/staff/${schoolId}`),
      ]);
      const [visitorData, studentData, staffData] = await Promise.all([
        visitorRes.json().catch(() => []),
        studentRes.json().catch(() => []),
        staffRes.json().catch(() => []),
      ]);
      if (!visitorRes.ok) throw new Error(visitorData?.message || 'Failed to fetch visitor passes');
      if (!studentRes.ok) throw new Error(studentData?.message || 'Failed to fetch students');
      if (!staffRes.ok) throw new Error(staffData?.message || 'Failed to fetch staff');
      const unwrap = (d: unknown): unknown[] => {
        const inner = (d as Record<string, unknown>)?.data;
        if (Array.isArray(inner)) return inner;
        if (Array.isArray((inner as Record<string, unknown>)?.students)) return (inner as Record<string, unknown[]>).students;
        if (Array.isArray(d)) return d;
        return [];
      };
      const nextVisitors: VisitorRecord[] = unwrap(visitorData) as VisitorRecord[];
      records = nextVisitors;
      students = unwrap(studentData) as typeof students;
      staff = unwrap(staffData) as typeof staff;
      if (nextVisitors[0]) {
        hydrateRecord(nextVisitors[0]);
      } else {
        selectedId = '';
        form = emptyForm();
        editing = true;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load visitor data';
      records = [];
      form = emptyForm();
      editing = true;
    } finally { loading = false; }
  });

  function hydrateRecord(record: VisitorRecord) {
    selectedId = record._id;
    form = { ...emptyForm(), ...record };
    editing = false;
  }

  function selectRecord(id: string) {
    const record = records.find(r => r._id === id);
    if (record) hydrateRecord(record);
  }

  function startNewPass() { selectedId = ''; form = emptyForm(); editing = true; makePassCollapsed = false; }

  function updateField(name: keyof VisitorForm, value: string) {
    form = { ...form, [name]: value };
    if (name === 'personToMeetType' && value !== 'Student') {
      form = { ...form, studentClass: '', studentName: '' };
    }
    if (name === 'studentClass') {
      form = { ...form, studentName: '', personToMeet: '' };
    }
    if (name === 'studentName') {
      form = { ...form, personToMeet: value };
    }
  }

  function readFile(file: File, onSuccess: (result: string, fileName: string) => void) {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (result) onSuccess(result, file.name);
    };
    reader.readAsDataURL(file);
  }

  function handlePhotoUpload(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { error = 'Please upload an image for visitor photo.'; return; }
    readFile(file, (result) => { form = { ...form, photo: result }; });
    (e.currentTarget as HTMLInputElement).value = '';
  }

  function handleIdProofUpload(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    const allowed = file.type.startsWith('image/') || file.type === 'application/pdf';
    if (!allowed) { error = 'Please upload an image or PDF for ID proof.'; return; }
    readFile(file, (result, fileName) => { form = { ...form, idProof: result, idProofFileName: fileName }; });
    (e.currentTarget as HTMLInputElement).value = '';
  }

  async function saveRecord() {
    if (!schoolId) { error = 'School session is missing.'; return; }
    try {
      saving = true; error = '';
      const now = new Date();
      const autoVisitDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const autoEntryTime = `${String(now.getHours() % 12 || 12).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} ${now.getHours() >= 12 ? 'PM' : 'AM'}`;
      const payload = {
        schoolId, ...form,
        regDate: selectedId ? form.regDate : autoVisitDate,
        visitDate: selectedId ? form.visitDate : autoVisitDate,
        entryTime: selectedId ? form.entryTime : autoEntryTime,
        personToMeet: form.personToMeetType === 'Student' ? form.studentName : form.personToMeet,
      };
      const url = selectedId ? `/api/visitors/${selectedId}` : '/api/visitors';
      const method = selectedId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.data) throw new Error(data?.message || 'Failed to save visitor pass');
      const saved = data.data as VisitorRecord;
      const idx = records.findIndex(r => r._id === saved._id);
      records = idx >= 0 ? records.map((r, i) => i === idx ? saved : r) : [saved, ...records];
      hydrateRecord(saved);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to save visitor pass';
    } finally { saving = false; }
  }

  async function scanPassExit() {
    const passId = scanInput.trim();
    if (!passId || !schoolId) { error = 'Enter or scan a pass ID first.'; return; }
    try {
      scanLoading = true; error = '';
      const res = await fetch('/api/visitors/scan-exit', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, passId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.data) throw new Error(data?.message || 'Failed to scan pass');
      const updated = data.data as VisitorRecord;
      records = records.map(r => r._id === updated._id ? updated : r);
      hydrateRecord(updated);
      scanInput = '';
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to scan pass';
    } finally { scanLoading = false; }
  }

  function printPass() {
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    const p = printable;
    win.document.write(`<!DOCTYPE html><html><head><title>Visitor Pass</title><style>body{font-family:Arial,sans-serif;margin:24px;background:#f8fafc;color:#0f172a}.card{background:#fff;border:1px solid #dbe4ea;border-radius:24px;padding:24px;max-width:700px;margin:0 auto}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.field b{display:block;font-size:12px;color:#64748b;margin-bottom:4px}</style></head><body><div class="card"><h2>${p(schoolInfo?.name || 'Visitor Pass')}</h2><p>Pass ID: ${p(form.passId)}</p><div class="grid"><div><div class="field"><b>Full Name</b>${p(form.fullName)}</div><div class="field"><b>Mobile</b>${mask(form.mobile)}</div><div class="field"><b>Visit Date</b>${p(form.visitDate)}</div><div class="field"><b>Entry Time</b>${p(form.entryTime)}</div><div class="field"><b>Exit Time</b>${p(form.exitTime)}</div><div class="field"><b>Status</b>${p(form.passStatus)}</div></div><div><div class="field"><b>Visit Type</b>${p(form.visitType)}</div><div class="field"><b>Purpose</b>${p(form.purpose)}</div><div class="field"><b>Person to Meet</b>${p(passPersonToMeet)}</div><div class="field"><b>Department</b>${p(form.department)}</div><div class="field"><b>ID Type</b>${p(form.idType)}</div><div class="field"><b>Vehicle No</b>${p(form.vehicleNumber)}</div></div></div></div><script>window.onload=function(){window.print();}<\/script></body></html>`);
    win.document.close();
  }

  function downloadPdf() { alert('PDF download requires additional library setup. Use Print instead.'); }

  const fieldClass = 'w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
</script>

<svelte:head><title>Visitor — ERP Portal</title></svelte:head>

<div class="space-y-6">
  {#if error}
    <div class="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
  {/if}

  {#if loading}
    <div class="flex min-h-[320px] items-center justify-center rounded-3xl border border-slate-200 bg-white">
      <div class="flex items-center gap-3 text-sm text-slate-500">
        <Loader2 class="h-4 w-4 animate-spin text-blue-600" />
        Loading visitor records...
      </div>
    </div>
  {:else}
    <section class="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
      <button type="button" onclick={() => (makePassCollapsed = !makePassCollapsed)} class="flex w-full items-center justify-between gap-4 text-left">
        <div>
          <div class="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold tracking-[0.08em] text-blue-600">
            <ShieldCheck class="h-3.5 w-3.5" />
            Make pass
          </div>
          <h2 class="mt-3 text-[28px] font-semibold leading-tight tracking-[-0.02em] text-slate-900">Visitor Pass Generator</h2>
          <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Create or update a visitor pass, generate an automatic pass ID, and print it with school branding.</p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-500">
          {#if makePassCollapsed}<ChevronDown class="h-5 w-5" />{:else}<ChevronUp class="h-5 w-5" />{/if}
        </div>
      </button>

      {#if !makePassCollapsed}
        <div class="mt-6 space-y-6">
          <div class="flex flex-wrap items-center gap-3">
            <span class="rounded-full px-4 py-2 text-xs font-semibold {statusClasses[form.passStatus]}">{form.passStatus}</span>
            <button type="button" onclick={startNewPass} class="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"><Plus class="h-4 w-4" />New Pass</button>
            <button type="button" onclick={() => (editing = true)} class="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"><PencilLine class="h-4 w-4" />Edit</button>
            <button type="button" onclick={saveRecord} disabled={saving} class="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-70">
              {#if saving}<Loader2 class="h-4 w-4 animate-spin" />{:else}<Save class="h-4 w-4" />{/if}Save
            </button>
            <button type="button" onclick={downloadPdf} class="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"><Download class="h-4 w-4" />Download PDF</button>
            <button type="button" onclick={printPass} class="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"><Printer class="h-4 w-4" />Print</button>
          </div>

          <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div class="space-y-2">
              <p class="text-xs font-semibold tracking-[0.08em] text-slate-500">Saved Passes</p>
              <select value={selectedId} onchange={(e) => selectRecord((e.currentTarget as HTMLSelectElement).value)} class={fieldClass}>
                <option value="">Select visitor pass</option>
                {#each records as record}<option value={record._id}>{record.passId} - {record.fullName || 'Unnamed Visitor'}</option>{/each}
              </select>
            </div>
            <div class="space-y-2">
              <p class="text-xs font-semibold tracking-[0.08em] text-slate-500">Auto Pass ID</p>
              <div class="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900">{form.passId || 'Will generate when saved'}</div>
            </div>
            <div class="space-y-2">
              <p class="text-xs font-semibold tracking-[0.08em] text-slate-500">Request Mode</p>
              {#if editing}
                <select value={form.requestMode} onchange={(e) => updateField('requestMode', (e.currentTarget as HTMLSelectElement).value)} class={fieldClass}>
                  {#each requestModes as m}<option value={m}>{m}</option>{/each}
                </select>
              {:else}
                <div class="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">{form.requestMode || '-'}</div>
              {/if}
            </div>
            <div class="space-y-2">
              <p class="text-xs font-semibold tracking-[0.08em] text-slate-500">Pass Status</p>
              {#if editing}
                <select value={form.passStatus} onchange={(e) => updateField('passStatus', (e.currentTarget as HTMLSelectElement).value)} class={fieldClass}>
                  {#each Object.keys(statusClasses) as s}<option value={s}>{s}</option>{/each}
                </select>
              {:else}
                <div class="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span class="inline-flex rounded-full px-3 py-1 text-xs font-semibold {statusClasses[form.passStatus]}">{form.passStatus}</span>
                </div>
              {/if}
            </div>
          </div>

          <div class="grid gap-5 md:grid-cols-2">
            <div class="space-y-2">
              <p class="text-xs font-semibold tracking-[0.08em] text-slate-500">Full Name</p>
              {#if editing}<input value={form.fullName} oninput={(e) => updateField('fullName', (e.currentTarget as HTMLInputElement).value)} class={fieldClass} />{:else}<div class="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">{form.fullName || '-'}</div>{/if}
            </div>

            <div class="space-y-2">
              <p class="text-xs font-semibold tracking-[0.08em] text-slate-500">Photo</p>
              <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div class="flex items-center gap-4">
                  {#if form.photo}
                    <img src={form.photo} alt={form.fullName || 'Visitor'} class="h-16 w-16 rounded-2xl object-cover" />
                  {:else}
                    <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-xs font-semibold text-blue-600">No Photo</div>
                  {/if}
                  <label class="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    <Upload class="h-4 w-4" />Upload Photo
                    <input type="file" accept="image/*" class="hidden" onchange={handlePhotoUpload} />
                  </label>
                </div>
              </div>
            </div>

            <div class="space-y-2">
              <p class="text-xs font-semibold tracking-[0.08em] text-slate-500">Mobile Number</p>
              {#if editing}<input value={form.mobile} oninput={(e) => updateField('mobile', (e.currentTarget as HTMLInputElement).value)} class={fieldClass} />{:else}<div class="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">{mask(form.mobile)}</div>{/if}
            </div>
            <div class="space-y-2">
              <p class="text-xs font-semibold tracking-[0.08em] text-slate-500">Email ID</p>
              {#if editing}<input value={form.email} oninput={(e) => updateField('email', (e.currentTarget as HTMLInputElement).value)} class={fieldClass} />{:else}<div class="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">{form.email || '-'}</div>{/if}
            </div>
            <div class="space-y-2 md:col-span-2">
              <p class="text-xs font-semibold tracking-[0.08em] text-slate-500">Address</p>
              {#if editing}<textarea value={form.address} oninput={(e) => updateField('address', (e.currentTarget as HTMLTextAreaElement).value)} class="{fieldClass} min-h-[80px] resize-none"></textarea>{:else}<div class="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">{form.address || '-'}</div>{/if}
            </div>

            <div class="space-y-2">
              <p class="text-xs font-semibold tracking-[0.08em] text-slate-500">Vehicle Number</p>
              {#if editing}<input value={form.vehicleNumber} oninput={(e) => updateField('vehicleNumber', (e.currentTarget as HTMLInputElement).value)} class={fieldClass} />{:else}<div class="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">{form.vehicleNumber || '-'}</div>{/if}
            </div>
            <div class="space-y-2">
              <p class="text-xs font-semibold tracking-[0.08em] text-slate-500">Vehicle Information</p>
              {#if editing}<textarea value={form.vehicleInfo} oninput={(e) => updateField('vehicleInfo', (e.currentTarget as HTMLTextAreaElement).value)} class="{fieldClass} min-h-[80px] resize-none"></textarea>{:else}<div class="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">{form.vehicleInfo || '-'}</div>{/if}
            </div>
            <div class="space-y-2">
              <p class="text-xs font-semibold tracking-[0.08em] text-slate-500">ID Type</p>
              {#if editing}<select value={form.idType} onchange={(e) => updateField('idType', (e.currentTarget as HTMLSelectElement).value)} class={fieldClass}>{#each idTypes as t}<option value={t}>{t}</option>{/each}</select>{:else}<div class="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">{form.idType || '-'}</div>{/if}
            </div>
            <div class="space-y-2">
              <p class="text-xs font-semibold tracking-[0.08em] text-slate-500">ID Number</p>
              {#if editing}<input value={form.idNumber} oninput={(e) => updateField('idNumber', (e.currentTarget as HTMLInputElement).value)} class={fieldClass} />{:else}<div class="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">{mask(form.idNumber)}</div>{/if}
            </div>

            <div class="space-y-2 md:col-span-2">
              <p class="text-xs font-semibold tracking-[0.08em] text-slate-500">ID Proof Upload</p>
              <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p class="text-sm font-medium text-slate-900">{form.idProofFileName || 'No ID proof uploaded'}</p>
                    <p class="mt-1 text-xs text-slate-500">Accepted formats: image or PDF</p>
                  </div>
                  <label class="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    <Upload class="h-4 w-4" />Upload ID Proof
                    <input type="file" accept="image/*,application/pdf" class="hidden" onchange={handleIdProofUpload} />
                  </label>
                </div>
              </div>
            </div>

            <div class="space-y-2">
              <p class="text-xs font-semibold tracking-[0.08em] text-slate-500">Exit Time</p>
              {#if editing}<input value={form.exitTime} oninput={(e) => updateField('exitTime', (e.currentTarget as HTMLInputElement).value)} class={fieldClass} />{:else}<div class="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">{form.exitTime || '-'}</div>{/if}
            </div>
            <div class="space-y-2">
              <p class="text-xs font-semibold tracking-[0.08em] text-slate-500">Visit Type</p>
              {#if editing}<select value={form.visitType} onchange={(e) => updateField('visitType', (e.currentTarget as HTMLSelectElement).value)} class={fieldClass}>{#each visitTypes as t}<option value={t}>{t}</option>{/each}</select>{:else}<div class="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">{form.visitType || '-'}</div>{/if}
            </div>

            <div class="space-y-2 md:col-span-2">
              <p class="text-xs font-semibold tracking-[0.08em] text-slate-500">Purpose of Visit</p>
              {#if editing}<textarea value={form.purpose} oninput={(e) => updateField('purpose', (e.currentTarget as HTMLTextAreaElement).value)} class="{fieldClass} min-h-[80px] resize-none"></textarea>{:else}<div class="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">{form.purpose || '-'}</div>{/if}
            </div>

            <div class="space-y-2">
              <p class="text-xs font-semibold tracking-[0.08em] text-slate-500">Person to Meet Type</p>
              {#if editing}<select value={form.personToMeetType} onchange={(e) => updateField('personToMeetType', (e.currentTarget as HTMLSelectElement).value)} class={fieldClass}>{#each meetTypes as t}<option value={t}>{t}</option>{/each}</select>{:else}<div class="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">{form.personToMeetType || '-'}</div>{/if}
            </div>
            <div class="space-y-2">
              <p class="text-xs font-semibold tracking-[0.08em] text-slate-500">Department</p>
              {#if editing}<select value={form.department} onchange={(e) => updateField('department', (e.currentTarget as HTMLSelectElement).value)} class={fieldClass}>{#each departments as d}<option value={d}>{d}</option>{/each}</select>{:else}<div class="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">{form.department || '-'}</div>{/if}
            </div>

            {#if form.personToMeetType === 'Student'}
              <div class="space-y-2">
                <p class="text-xs font-semibold tracking-[0.08em] text-slate-500">Student Class</p>
                {#if editing}<select value={form.studentClass} onchange={(e) => updateField('studentClass', (e.currentTarget as HTMLSelectElement).value)} class={fieldClass}><option value="">Select class</option>{#each studentClassOptions as c}<option value={c}>{c}</option>{/each}</select>{:else}<div class="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">{form.studentClass || '-'}</div>{/if}
              </div>
              <div class="space-y-2">
                <p class="text-xs font-semibold tracking-[0.08em] text-slate-500">Student Name</p>
                {#if editing}<select value={form.studentName} onchange={(e) => updateField('studentName', (e.currentTarget as HTMLSelectElement).value)} class={fieldClass}><option value="">Select student</option>{#each studentNameOptions as n}<option value={n}>{n}</option>{/each}</select>{:else}<div class="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">{form.studentName || '-'}</div>{/if}
              </div>
            {:else}
              <div class="space-y-2 md:col-span-2">
                <p class="text-xs font-semibold tracking-[0.08em] text-slate-500">Person Name</p>
                {#if editing}<select value={form.personToMeet} onchange={(e) => updateField('personToMeet', (e.currentTarget as HTMLSelectElement).value)} class={fieldClass}><option value="">Select person</option>{#each personOptions() as n}<option value={n}>{n}</option>{/each}</select>{:else}<div class="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900">{form.personToMeet || '-'}</div>{/if}
              </div>
            {/if}
          </div>

          {#if form.passId}
            <div class="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 lg:grid-cols-[1fr,220px,260px]">
              <div>
                <h3 class="text-lg font-semibold text-slate-900">Generated Pass Preview</h3>
                <p class="mt-1 text-sm text-slate-500">This pass carries the school logo, school details, auto pass ID, current generated time, QR code, and barcode.</p>
                <div class="mt-4 grid gap-3 sm:grid-cols-2">
                  <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p class="text-xs font-semibold tracking-[0.08em] text-slate-500">School</p>
                    <p class="mt-2 text-sm font-semibold text-slate-900">{schoolInfo?.name || 'School'}</p>
                    <p class="mt-1 text-xs text-slate-500">{schoolInfo?.phone || schoolInfo?.email || '-'}</p>
                  </div>
                  <div class="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <p class="text-xs font-semibold tracking-[0.08em] text-slate-500">Generated Time</p>
                    <p class="mt-2 text-sm font-semibold text-slate-900">{form.entryTime || '-'}</p>
                    <p class="mt-1 text-xs text-slate-500">Pass ID: {form.passId}</p>
                  </div>
                </div>
              </div>
              <div class="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-4">
                <div class="flex h-40 w-40 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-slate-400">
                  <QrCode class="h-10 w-10" />
                  <p class="mt-2 text-xs">QR Code</p>
                </div>
              </div>
              <div class="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-4">
                <div class="flex h-16 w-full items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400">Barcode</div>
                <p class="mt-3 text-xs font-semibold tracking-[0.08em] text-slate-500">{form.passId}</p>
              </div>
            </div>
          {/if}

          {#if selectedRecord?.updatedAt}
            <p class="text-xs text-slate-500">Last synced: {new Date(selectedRecord.updatedAt).toLocaleString()}</p>
          {/if}
        </div>
      {/if}
    </section>

    <section class="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
      <div class="mb-5 flex items-start gap-3">
        <div class="rounded-2xl bg-blue-50 p-3 text-blue-600"><ScanLine class="h-5 w-5" /></div>
        <div>
          <h2 class="text-2xl font-semibold tracking-[-0.02em] text-slate-900">Scan Pass</h2>
          <p class="mt-1 text-sm text-slate-500">Scan or enter the pass ID here. Once submitted, exit time will be recorded automatically.</p>
        </div>
      </div>
      <div class="grid gap-4 md:grid-cols-[1fr,180px]">
        <input
          bind:value={scanInput}
          onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); scanPassExit(); } }}
          placeholder="Scan barcode / QR code or enter pass ID"
          class={fieldClass}
        />
        <button type="button" onclick={scanPassExit} disabled={scanLoading} class="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-70">
          {#if scanLoading}<Loader2 class="h-4 w-4 animate-spin" />{:else}<ScanLine class="h-4 w-4" />{/if}
          Record Exit
        </button>
      </div>
    </section>

    <section class="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
      <div class="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 class="text-2xl font-semibold tracking-[-0.02em] text-slate-900">Visitor Pass Card</h2>
          <p class="mt-1 text-sm text-slate-500">Browse passes by date, search them quickly, and open any pass in compact card format.</p>
        </div>
        {#if form.passId}
          <span class="inline-flex rounded-full px-3 py-1 text-xs font-semibold {statusClasses[form.passStatus]}">{form.passStatus}</span>
        {/if}
      </div>

      <div class="mb-5 grid gap-4 lg:grid-cols-[1fr,220px]">
        <div class="space-y-2">
          <p class="text-xs font-semibold tracking-[0.08em] text-slate-500">Search Passes</p>
          <input bind:value={searchTerm} placeholder="Search by pass ID, visitor name, mobile, vehicle number" class={fieldClass} />
        </div>
        <div class="space-y-2">
          <p class="text-xs font-semibold tracking-[0.08em] text-slate-500">Filter By Date</p>
          <input type="date" bind:value={selectedDateFilter} class={fieldClass} />
        </div>
      </div>

      <div class="mb-6">
        <p class="mb-3 text-sm font-medium text-slate-700">{selectedDateFilter ? `Passes for ${selectedDateFilter}` : 'All Visitor Passes'}</p>

        {#if filteredRecords.length > 0}
          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {#each filteredRecords as record}
              {@const active = record._id === selectedId}
              <button
                type="button"
                onclick={() => hydrateRecord(record)}
                class="min-h-[145px] rounded-[28px] border px-5 py-4 text-left transition {active ? 'border-blue-500 bg-emerald-50/30 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50'}"
              >
                <div class="flex items-start justify-between gap-4">
                  <div class="min-w-0">
                    <p class="truncate text-[15px] font-semibold leading-6 text-slate-900">{record.fullName || 'Unnamed Visitor'}</p>
                    <p class="mt-1 text-[12px] font-medium tracking-[0.12em] text-slate-500">{record.passId}</p>
                  </div>
                  <span class="inline-flex shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold {statusClasses[record.passStatus]}">{record.passStatus}</span>
                </div>
                <div class="mt-5 grid grid-cols-2 gap-x-8 gap-y-4 text-xs text-slate-600">
                  <div><p class="text-[12px] text-slate-400">Date</p><p class="mt-1 text-[13px] font-medium text-slate-900">{printable(record.visitDate || record.regDate)}</p></div>
                  <div><p class="text-[12px] text-slate-400">Entry</p><p class="mt-1 text-[13px] font-medium text-slate-900">{printable(record.entryTime)}</p></div>
                  <div><p class="text-[12px] text-slate-400">Type</p><p class="mt-1 text-[13px] font-medium text-slate-900">{printable(record.visitType)}</p></div>
                  <div><p class="text-[12px] text-slate-400">Vehicle</p><p class="mt-1 text-[13px] font-medium text-slate-900">{printable(record.vehicleNumber)}</p></div>
                </div>
              </button>
            {/each}
          </div>
        {:else}
          <div class="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center">
            <p class="text-sm font-medium text-slate-600">No visitor passes for the current date</p>
            <p class="mt-1 text-xs text-slate-500">Try another date or clear search to see available passes.</p>
          </div>
        {/if}
      </div>

      {#if form.passId && visibleSelectedRecord}
        <div class="mx-auto max-w-5xl overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
          <div class="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 px-4 py-3.5 text-white">
            <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div class="flex items-center gap-4">
                {#if schoolInfo?.logo}
                  <img src={schoolInfo.logo} alt={schoolInfo?.name || 'School'} class="h-12 w-12 rounded-2xl border border-white/20 object-cover bg-white/10" />
                {:else}
                  <div class="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-xs font-semibold uppercase">VP</div>
                {/if}
                <div>
                  <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">Visitor Pass</p>
                  <h3 class="mt-1 text-xl font-semibold">{schoolInfo?.name || 'School'}</h3>
                  <p class="mt-1 text-xs text-white/75">{schoolInfo?.phone || schoolInfo?.email || 'School reception'}</p>
                </div>
              </div>
              <div class="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
                <p class="text-[11px] uppercase tracking-[0.2em] text-white/60">Pass ID</p>
                <p class="mt-1 text-base font-semibold">{form.passId}</p>
                <p class="mt-1 text-xs text-white/70">Generated {printable(form.regDate)} at {printable(form.entryTime)}</p>
              </div>
            </div>
          </div>

          <div class="grid gap-0 lg:grid-cols-[1.5fr,0.7fr]">
            <div class="space-y-4 p-4">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                  {#if form.photo}
                    <img src={form.photo} alt={form.fullName || 'Visitor'} class="h-full w-full object-cover" />
                  {:else}
                    <span class="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">No Photo</span>
                  {/if}
                </div>
                <div class="min-w-0 flex-1">
                  <h4 class="text-lg font-semibold text-slate-900">{printable(form.fullName)}</h4>
                  <p class="mt-1 text-xs text-slate-500">{printable(form.visitType)} visitor</p>
                  <div class="mt-3 grid gap-2 sm:grid-cols-3">
                    <div class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Mobile</p>
                      <p class="mt-1 text-sm font-medium text-slate-900">{mask(form.mobile)}</p>
                    </div>
                    <div class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">ID Proof</p>
                      <p class="mt-1 text-sm font-medium text-slate-900">{printable(form.idType)} / {mask(form.idNumber)}</p>
                    </div>
                    <div class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Vehicle</p>
                      <p class="mt-1 text-sm font-medium text-slate-900">{printable(form.vehicleNumber)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div class="grid gap-3 md:grid-cols-2">
                <div class="rounded-3xl border border-slate-200 bg-slate-50 p-3.5">
                  <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Visit Details</p>
                  <div class="mt-3 space-y-2.5 text-sm text-slate-700">
                    <div class="flex items-center justify-between gap-3"><span>Visit Date</span><span class="font-medium text-slate-900">{printable(form.visitDate)}</span></div>
                    <div class="flex items-center justify-between gap-3"><span>Entry Time</span><span class="font-medium text-slate-900">{printable(form.entryTime)}</span></div>
                    <div class="flex items-center justify-between gap-3"><span>Exit Time</span><span class="font-medium text-slate-900">{printable(form.exitTime)}</span></div>
                    <div class="flex items-center justify-between gap-3"><span>Department</span><span class="font-medium text-slate-900">{printable(form.department)}</span></div>
                    <div class="flex items-center justify-between gap-3"><span>Vehicle No.</span><span class="font-medium text-slate-900">{printable(form.vehicleNumber)}</span></div>
                  </div>
                </div>
                <div class="rounded-3xl border border-slate-200 bg-slate-50 p-3.5">
                  <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Meeting Info</p>
                  <div class="mt-3 space-y-2.5 text-sm text-slate-700">
                    <div><p class="text-slate-500">Person To Meet</p><p class="mt-1 font-medium text-slate-900">{printable(passPersonToMeet)}</p></div>
                    <div><p class="text-slate-500">Purpose</p><p class="mt-1 font-medium text-slate-900">{printable(form.purpose)}</p></div>
                    <div><p class="text-slate-500">Address</p><p class="mt-1 font-medium text-slate-900">{printable(form.address)}</p></div>
                    <div><p class="text-slate-500">Vehicle Info</p><p class="mt-1 font-medium text-slate-900">{printable(form.vehicleInfo)}</p></div>
                  </div>
                </div>
              </div>
            </div>

            <div class="border-t border-slate-200 bg-slate-50 p-4 lg:border-l lg:border-t-0">
              <div class="flex h-full flex-col justify-between gap-3">
                <div class="rounded-3xl border border-slate-200 bg-white p-3 text-center">
                  <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">QR Scan</p>
                  <div class="mt-2.5 flex justify-center">
                    <div class="flex h-24 w-24 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-slate-400">
                      <QrCode class="h-8 w-8" />
                    </div>
                  </div>
                </div>
                <div class="rounded-3xl border border-slate-200 bg-white p-3 text-center">
                  <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Barcode</p>
                  <div class="mt-3 flex min-h-[50px] items-center justify-center text-xs text-slate-400">— {form.passId} —</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      {:else}
        <div class="mx-auto max-w-5xl rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
          <p class="text-base font-medium text-slate-700">No visitor pass for the current date</p>
          <p class="mt-2 text-sm text-slate-500">Change the date filter or search term to preview another pass.</p>
        </div>
      {/if}
    </section>
  {/if}
</div>
