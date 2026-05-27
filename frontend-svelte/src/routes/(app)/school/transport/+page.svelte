<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { Bus, Edit, ExternalLink, FileText, Trash2, Users, X } from 'lucide-svelte';

  type Student = { _id: string; name: string; class: string; rollNumber: string };
  type ReadingLog = { readingDate?: string; driverName: string; odometerReading: number; previousReading?: number; distanceKm?: number; fuelAmount?: number; fuelSlip?: string; fuelSlipFileName?: string };
  type TransportBus = {
    _id: string; busNumber: string; routeName: string; driverName: string; driverPhone: string;
    driverLicenseNumber: string; driverLicensePhoto?: string;
    rcDocument?: string; rcExpiryDate?: string; pollutionDocument?: string; pollutionExpiryDate?: string;
    insuranceDocument?: string; insuranceExpiryDate?: string;
    fitnessCertificateDocument?: string; fitnessExpiryDate?: string;
    conductorName: string; conductorPhone?: string; conductorInfo?: string;
    routeStops?: string[]; readingLogs?: ReadingLog[]; assignedStudents: Student[];
  };

  const emptyForm = () => ({
    busNumber: '', routeName: '', driverName: '', driverPhone: '', driverLicenseNumber: '',
    driverLicensePhoto: '', rcDocument: '', rcExpiryDate: '', pollutionDocument: '',
    pollutionExpiryDate: '', insuranceDocument: '', insuranceExpiryDate: '',
    fitnessCertificateDocument: '', fitnessExpiryDate: '', conductorName: '',
    conductorPhone: '', conductorInfo: '', routeStops: [] as string[], assignedStudents: [] as string[],
  });

  const schoolId = $derived($page.data.user?.schoolId ?? '');
  let buses = $state<TransportBus[]>([]);
  let students = $state<Student[]>([]);
  let formData = $state(emptyForm());
  let editingBusId = $state<string | null>(null);
  let loading = $state(true);
  let saving = $state(false);
  let error = $state('');
  let routeStopInput = $state('');
  let viewDocument = $state<{ src: string; title: string; downloadName: string } | null>(null);
  let expandedBusId = $state<string | null>(null);
  let readingOdometer = $state('');
  let readingFuelAmount = $state('');
  let readingFuelSlip = $state('');
  let readingFuelSlipFileName = $state('');
  let readingDate = $state(new Date().toISOString().slice(0, 10));
  let savingReading = $state(false);

  async function fetchData() {
    if (!schoolId) { error = 'School not found.'; loading = false; return; }
    try {
      loading = true; error = '';
      const [busRes, studentRes] = await Promise.all([
        fetch(`/api/transport/${schoolId}`),
        fetch(`/api/students/${schoolId}`),
      ]);
      if (!busRes.ok || !studentRes.ok) throw new Error('Failed to load transport data');
      const [busData, studentData] = await Promise.all([busRes.json(), studentRes.json()]);
      buses = Array.isArray(busData) ? busData : [];
      students = (Array.isArray(studentData) ? studentData : []).filter((s: Student & { needsTransport?: boolean }) => s.needsTransport);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load transport data';
      buses = []; students = [];
    } finally { loading = false; }
  }

  onMount(() => { fetchData(); });

  function resetForm() { formData = emptyForm(); editingBusId = null; }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    try {
      saving = true; error = '';
      const res = await fetch(editingBusId ? `/api/transport/${editingBusId}` : '/api/transport', {
        method: editingBusId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, schoolId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to save bus');
      resetForm(); await fetchData();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to save bus';
    } finally { saving = false; }
  }

  function startEdit(bus: TransportBus) {
    editingBusId = bus._id;
    formData = {
      busNumber: bus.busNumber, routeName: bus.routeName, driverName: bus.driverName,
      driverPhone: bus.driverPhone || '', driverLicenseNumber: bus.driverLicenseNumber || '',
      driverLicensePhoto: bus.driverLicensePhoto || '', rcDocument: bus.rcDocument || '',
      rcExpiryDate: bus.rcExpiryDate || '', pollutionDocument: bus.pollutionDocument || '',
      pollutionExpiryDate: bus.pollutionExpiryDate || '', insuranceDocument: bus.insuranceDocument || '',
      insuranceExpiryDate: bus.insuranceExpiryDate || '',
      fitnessCertificateDocument: bus.fitnessCertificateDocument || '',
      fitnessExpiryDate: bus.fitnessExpiryDate || '', conductorName: bus.conductorName,
      conductorPhone: bus.conductorPhone || '', conductorInfo: bus.conductorInfo || '',
      routeStops: Array.isArray(bus.routeStops) ? [...bus.routeStops] : [],
      assignedStudents: bus.assignedStudents.map(s => s._id),
    };
  }

  function handleFileUpload(field: keyof typeof formData) {
    return (e: Event) => {
      const input = e.currentTarget as HTMLInputElement;
      const file = input.files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onloadend = () => { formData = { ...formData, [field]: reader.result as string }; };
      reader.readAsDataURL(file);
    };
  }

  function addRouteStop() {
    const stop = routeStopInput.trim(); if (!stop) return;
    if (!formData.routeStops.some(s => s.toLowerCase() === stop.toLowerCase())) {
      formData = { ...formData, routeStops: [...formData.routeStops, stop] };
    }
    routeStopInput = '';
  }

  function removeRouteStop(stop: string) {
    formData = { ...formData, routeStops: formData.routeStops.filter(s => s !== stop) };
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this bus?')) return;
    try {
      const res = await fetch(`/api/transport/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to delete bus');
      await fetchData();
      if (editingBusId === id) resetForm();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to delete bus';
    }
  }

  function toggleStudentAssignment(id: string) {
    formData = {
      ...formData,
      assignedStudents: formData.assignedStudents.includes(id)
        ? formData.assignedStudents.filter(s => s !== id)
        : [...formData.assignedStudents, id],
    };
  }

  function resetReadingForm() {
    readingOdometer = ''; readingFuelAmount = ''; readingFuelSlip = ''; readingFuelSlipFileName = '';
    readingDate = new Date().toISOString().slice(0, 10);
  }

  function getLastReading(bus: TransportBus) {
    const logs = Array.isArray(bus.readingLogs) ? bus.readingLogs : [];
    const driver = bus.driverName.trim().toLowerCase();
    return [...logs].filter(l => l.driverName.trim().toLowerCase() === driver)
      .sort((a, b) => new Date(b.readingDate || 0).getTime() - new Date(a.readingDate || 0).getTime())[0];
  }

  async function handleAddReading(bus: TransportBus) {
    if (!readingOdometer.trim()) { error = 'Please enter odometer reading.'; return; }
    try {
      savingReading = true; error = '';
      const res = await fetch(`/api/transport/${bus._id}/readings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          odometerReading: Number(readingOdometer),
          fuelAmount: readingFuelAmount ? Number(readingFuelAmount) : undefined,
          fuelSlip: readingFuelSlip || undefined,
          fuelSlipFileName: readingFuelSlipFileName || undefined,
          readingDate,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to add reading');
      resetReadingForm(); await fetchData(); expandedBusId = bus._id;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to add reading';
    } finally { savingReading = false; }
  }
</script>

<svelte:head><title>Transport — ERP Portal</title></svelte:head>

<div class="space-y-6">
  <div class="stat-card p-6">
    <div class="flex items-center gap-2 mb-4">
      <Bus class="w-5 h-5 text-blue-600" />
      <h3 class="text-lg font-semibold">{editingBusId ? 'Edit Bus Assignment' : 'Assign Bus To Students'}</h3>
    </div>

    {#if error}<p class="text-red-600 text-sm mb-4">{error}</p>{/if}

    <form onsubmit={handleSubmit} class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input type="text" placeholder="Bus Number" class="border rounded p-2" bind:value={formData.busNumber} required />
        <input type="text" placeholder="Route Name" class="border rounded p-2" bind:value={formData.routeName} required />
        <input type="text" placeholder="Driver Name" class="border rounded p-2" bind:value={formData.driverName} required />
        <input type="tel" placeholder="Driver Phone Number" class="border rounded p-2" bind:value={formData.driverPhone} required />
        <input type="text" placeholder="Driver Driving Licence Number" class="border rounded p-2" bind:value={formData.driverLicenseNumber} required />
        <div class="space-y-2">
          <label class="text-sm font-medium">Driver Licence (Photo or PDF)</label>
          <input type="file" accept="image/*,application/pdf" class="border rounded p-2 w-full" onchange={handleFileUpload('driverLicensePhoto')} />
          {#if formData.driverLicensePhoto}
            {#if formData.driverLicensePhoto.startsWith('data:application/pdf')}
              <div class="flex items-center gap-2 rounded border bg-red-50 px-3 py-2">
                <FileText class="h-5 w-5 text-red-500" />
                <span class="text-sm text-red-700 flex-1">PDF uploaded</span>
                <button type="button" onclick={() => viewDocument = { src: formData.driverLicensePhoto, title: 'Driver Licence', downloadName: 'driver-licence' }} class="text-xs text-blue-600 hover:underline">Preview</button>
              </div>
            {:else}
              <img src={formData.driverLicensePhoto} alt="Driver licence" class="h-20 w-full rounded border object-cover" />
            {/if}
          {/if}
        </div>
        <input type="text" placeholder="Conductor Name" class="border rounded p-2" bind:value={formData.conductorName} required />
        <input type="tel" placeholder="Conductor Phone Number" class="border rounded p-2" bind:value={formData.conductorPhone} />
        <input type="text" placeholder="Conductor Info (ID/Notes)" class="border rounded p-2" bind:value={formData.conductorInfo} />
      </div>

      <div class="space-y-3 rounded-xl border border-slate-200 p-4">
        <p class="font-medium text-slate-900">Vehicle Documents & Expiry</p>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div class="space-y-2">
            <label class="text-sm font-medium">RC Document</label>
            <input type="file" accept="image/*,application/pdf" class="w-full border rounded p-2" onchange={handleFileUpload('rcDocument')} />
            {#if formData.rcDocument}<button type="button" onclick={() => viewDocument = { src: formData.rcDocument, title: 'RC Document', downloadName: 'rc-document' }} class="text-xs text-blue-600 hover:underline">View uploaded RC</button>{/if}
          </div>
          <div>
            <label class="mb-2 block text-sm font-medium">RC Expiry Date</label>
            <input type="date" class="w-full border rounded p-2" bind:value={formData.rcExpiryDate} />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium">Pollution Certificate</label>
            <input type="file" accept="image/*,application/pdf" class="w-full border rounded p-2" onchange={handleFileUpload('pollutionDocument')} />
            {#if formData.pollutionDocument}<button type="button" onclick={() => viewDocument = { src: formData.pollutionDocument, title: 'Pollution Certificate', downloadName: 'pollution-certificate' }} class="text-xs text-blue-600 hover:underline">View uploaded Pollution Certificate</button>{/if}
          </div>
          <div>
            <label class="mb-2 block text-sm font-medium">Pollution Expiry Date</label>
            <input type="date" class="w-full border rounded p-2" bind:value={formData.pollutionExpiryDate} />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium">Insurance Document</label>
            <input type="file" accept="image/*,application/pdf" class="w-full border rounded p-2" onchange={handleFileUpload('insuranceDocument')} />
            {#if formData.insuranceDocument}<button type="button" onclick={() => viewDocument = { src: formData.insuranceDocument, title: 'Insurance Document', downloadName: 'insurance-document' }} class="text-xs text-blue-600 hover:underline">View uploaded Insurance</button>{/if}
          </div>
          <div>
            <label class="mb-2 block text-sm font-medium">Insurance Expiry Date</label>
            <input type="date" class="w-full border rounded p-2" bind:value={formData.insuranceExpiryDate} />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium">Fitness Certificate</label>
            <input type="file" accept="image/*,application/pdf" class="w-full border rounded p-2" onchange={handleFileUpload('fitnessCertificateDocument')} />
            {#if formData.fitnessCertificateDocument}<button type="button" onclick={() => viewDocument = { src: formData.fitnessCertificateDocument, title: 'Fitness Certificate', downloadName: 'fitness-certificate' }} class="text-xs text-blue-600 hover:underline">View uploaded Fitness Certificate</button>{/if}
          </div>
          <div>
            <label class="mb-2 block text-sm font-medium">Fitness Expiry Date</label>
            <input type="date" class="w-full border rounded p-2" bind:value={formData.fitnessExpiryDate} />
          </div>
        </div>
      </div>

      <div class="space-y-2">
        <p class="font-medium">Route Stops</p>
        <div class="flex gap-2">
          <input type="text" placeholder="Add stop name" class="border rounded p-2 w-full" bind:value={routeStopInput} />
          <button type="button" onclick={addRouteStop} class="bg-blue-100 text-blue-700 px-3 rounded">Add Stop</button>
        </div>
        <div class="flex flex-wrap gap-2">
          {#if formData.routeStops.length === 0}
            <p class="text-sm text-gray-500">No stops added yet.</p>
          {:else}
            {#each formData.routeStops as stop}
              <span class="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm">
                {stop}
                <button type="button" onclick={() => removeRouteStop(stop)} class="text-red-600" title="Remove stop">×</button>
              </span>
            {/each}
          {/if}
        </div>
      </div>

      <div>
        <p class="font-medium mb-2">Assign Students</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto border rounded p-3">
          {#if students.length === 0}
            <p class="text-sm text-gray-500">No students available.</p>
          {:else}
            {#each students as student}
              <label class="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={formData.assignedStudents.includes(student._id)} onchange={() => toggleStudentAssignment(student._id)} />
                <span>{student.name} ({student.class} - {student.rollNumber})</span>
              </label>
            {/each}
          {/if}
        </div>
      </div>

      <div class="flex gap-2">
        <button type="submit" disabled={saving} class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
          {saving ? 'Saving...' : editingBusId ? 'Update Bus' : 'Add Bus'}
        </button>
        <button type="button" onclick={resetForm} class="bg-gray-200 px-4 py-2 rounded">Clear</button>
      </div>
    </form>
  </div>

  {#if loading}
    <p class="text-center text-gray-500">Loading transport data...</p>
  {:else if buses.length === 0}
    <p class="text-center text-gray-500">No buses assigned yet.</p>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {#each buses as bus}
        <div
          class="stat-card p-6 space-y-4 cursor-pointer"
          onclick={() => { expandedBusId = expandedBusId === bus._id ? null : bus._id; resetReadingForm(); }}
          role="button"
          tabindex="0"
          onkeydown={(e) => { if (e.key === 'Enter') { expandedBusId = expandedBusId === bus._id ? null : bus._id; resetReadingForm(); } }}
        >
          <div class="flex justify-between items-start">
            <div>
              <h3 class="text-xl font-bold">{bus.busNumber}</h3>
              <p class="text-sm text-gray-600">{bus.routeName}</p>
            </div>
            <div class="flex gap-2">
              <button onclick={(e) => { e.stopPropagation(); startEdit(bus); }} class="text-blue-600 hover:text-blue-800" title="Edit"><Edit class="w-4 h-4" /></button>
              <button onclick={(e) => { e.stopPropagation(); handleDelete(bus._id); }} class="text-red-600 hover:text-red-800" title="Delete"><Trash2 class="w-4 h-4" /></button>
            </div>
          </div>

          <div class="space-y-1 rounded-lg bg-muted/30 p-3 text-sm">
            <p><span class="font-medium">Driver:</span> {bus.driverName}</p>
            <p><span class="font-medium">Driver Phone:</span> {bus.driverPhone || '-'}</p>
            <p><span class="font-medium">Driver Licence:</span> {bus.driverLicenseNumber || '-'}</p>
            <p><span class="font-medium">Route Stops:</span> {bus.routeStops?.length ? bus.routeStops.join(', ') : '-'}</p>
            <p><span class="font-medium">Conductor:</span> {bus.conductorName}</p>
            <p><span class="font-medium">Conductor Phone:</span> {bus.conductorPhone || '-'}</p>
            <p><span class="font-medium">RC Expiry:</span> {bus.rcExpiryDate || '-'}</p>
            <p><span class="font-medium">Pollution Expiry:</span> {bus.pollutionExpiryDate || '-'}</p>
            <p><span class="font-medium">Insurance Expiry:</span> {bus.insuranceExpiryDate || '-'}</p>
            <p><span class="font-medium">Fitness Expiry:</span> {bus.fitnessExpiryDate || '-'}</p>
          </div>

          {#if bus.driverLicensePhoto || bus.rcDocument || bus.pollutionDocument || bus.insuranceDocument || bus.fitnessCertificateDocument}
            <div class="rounded-lg border p-3 space-y-2">
              <p class="mb-1 text-xs text-muted-foreground">Vehicle Documents</p>
              <div class="grid grid-cols-1 gap-2">
                {#if bus.driverLicensePhoto}
                  <button type="button" onclick={() => viewDocument = { src: bus.driverLicensePhoto!, title: 'Driver Licence', downloadName: 'driver-licence' }} class="flex w-full items-center gap-2 rounded bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
                    <FileText class="h-4 w-4 text-blue-600" /><span class="flex-1 text-left">Driver Licence</span><ExternalLink class="h-4 w-4" />
                  </button>
                {/if}
                {#if bus.rcDocument}
                  <button type="button" onclick={() => viewDocument = { src: bus.rcDocument!, title: 'RC Document', downloadName: 'rc-document' }} class="flex w-full items-center gap-2 rounded bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
                    <FileText class="h-4 w-4 text-blue-600" /><span class="flex-1 text-left">RC Document</span><ExternalLink class="h-4 w-4" />
                  </button>
                {/if}
                {#if bus.pollutionDocument}
                  <button type="button" onclick={() => viewDocument = { src: bus.pollutionDocument!, title: 'Pollution Certificate', downloadName: 'pollution-certificate' }} class="flex w-full items-center gap-2 rounded bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
                    <FileText class="h-4 w-4 text-blue-600" /><span class="flex-1 text-left">Pollution Certificate</span><ExternalLink class="h-4 w-4" />
                  </button>
                {/if}
                {#if bus.insuranceDocument}
                  <button type="button" onclick={() => viewDocument = { src: bus.insuranceDocument!, title: 'Insurance Document', downloadName: 'insurance-document' }} class="flex w-full items-center gap-2 rounded bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
                    <FileText class="h-4 w-4 text-blue-600" /><span class="flex-1 text-left">Insurance Document</span><ExternalLink class="h-4 w-4" />
                  </button>
                {/if}
                {#if bus.fitnessCertificateDocument}
                  <button type="button" onclick={() => viewDocument = { src: bus.fitnessCertificateDocument!, title: 'Fitness Certificate', downloadName: 'fitness-certificate' }} class="flex w-full items-center gap-2 rounded bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
                    <FileText class="h-4 w-4 text-blue-600" /><span class="flex-1 text-left">Fitness Certificate</span><ExternalLink class="h-4 w-4" />
                  </button>
                {/if}
              </div>
            </div>
          {/if}

          <div class="grid grid-cols-2 gap-3">
            <div class="rounded-xl bg-blue-50 p-3"><p class="text-xs text-gray-500">Driver</p><p class="font-semibold text-blue-700">{bus.driverName}</p></div>
            <div class="rounded-xl bg-green-50 p-3"><p class="text-xs text-gray-500">Conductor</p><p class="font-semibold text-green-700">{bus.conductorName}</p></div>
          </div>

          <div class="border-t pt-3">
            <div class="flex items-center gap-2 mb-2">
              <Users class="w-4 h-4 text-gray-500" />
              <p class="font-medium">Assigned Students ({bus.assignedStudents.length})</p>
            </div>
            <div class="space-y-2 max-h-48 overflow-y-auto">
              {#if bus.assignedStudents.length === 0}
                <p class="text-sm text-gray-500">No students assigned.</p>
              {:else}
                {#each bus.assignedStudents as student}
                  <div class="bg-gray-50 rounded p-2 text-sm">
                    <p class="font-medium">{student.name}</p>
                    <p class="text-gray-500">{student.class} - Roll {student.rollNumber}</p>
                  </div>
                {/each}
              {/if}
            </div>
          </div>

          {#if expandedBusId === bus._id}
            <div class="border-t pt-4" onclick={(e) => e.stopPropagation()}>
              <div class="mb-3 flex items-center justify-between">
                <p class="font-semibold text-slate-900">Odometer & Fuel Entry</p>
                <p class="text-xs text-slate-500">Driver: {bus.driverName}</p>
              </div>
              <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label class="mb-1 block text-xs font-medium text-slate-600">Reading Date</label>
                    <input type="date" class="w-full rounded border p-2 text-sm" bind:value={readingDate} />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-medium text-slate-600">Odometer Reading (KM)</label>
                    <input type="number" min="0" class="w-full rounded border p-2 text-sm" bind:value={readingOdometer} placeholder="e.g. 45210" />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-medium text-slate-600">Fuel Amount (optional)</label>
                    <input type="number" min="0" step="0.01" class="w-full rounded border p-2 text-sm" bind:value={readingFuelAmount} placeholder="e.g. 3500" />
                  </div>
                  <div>
                    <label class="mb-1 block text-xs font-medium text-slate-600">Fuel Slip (image/pdf)</label>
                    <input type="file" accept="image/*,application/pdf" class="w-full rounded border p-2 text-sm" onchange={(e) => { const f = (e.currentTarget as HTMLInputElement).files?.[0]; if (!f) return; const r = new FileReader(); r.onloadend = () => { readingFuelSlip = r.result as string; readingFuelSlipFileName = f.name || 'fuel-slip'; }; r.readAsDataURL(f); }} />
                    {#if readingFuelSlipFileName}<p class="mt-1 text-xs text-slate-600">Attached: {readingFuelSlipFileName}</p>{/if}
                  </div>
                </div>

                {#if !getLastReading(bus)}
                  <p class="mt-3 text-xs text-slate-600">First reading for this driver. KM difference will appear from the second entry.</p>
                {:else}
                  {@const last = getLastReading(bus)!}
                  {@const current = Number(readingOdometer)}
                  {@const hasCurrent = readingOdometer.trim() !== '' && !Number.isNaN(current)}
                  {@const diff = hasCurrent ? current - Number(last.odometerReading || 0) : null}
                  <div class="mt-3 rounded-lg bg-white p-2 text-sm">
                    <p>Previous Reading: <span class="font-semibold">{last.odometerReading} KM</span></p>
                    {#if diff !== null}
                      <p class={diff < 0 ? 'text-red-600' : 'text-emerald-700'}>Difference: <span class="font-semibold">{diff} KM</span></p>
                    {/if}
                  </div>
                {/if}

                <div class="mt-3 flex gap-2">
                  <button type="button" onclick={() => handleAddReading(bus)} disabled={savingReading} class="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60">
                    {savingReading ? 'Saving...' : 'Add Reading'}
                  </button>
                  <button type="button" onclick={resetReadingForm} class="rounded bg-slate-200 px-3 py-2 text-sm text-slate-700">Reset</button>
                </div>
              </div>

              <div class="mt-4">
                <p class="mb-2 text-sm font-semibold text-slate-800">Reading History</p>
                <div class="space-y-2 max-h-56 overflow-y-auto">
                  {#if (bus.readingLogs || []).length === 0}
                    <p class="text-sm text-slate-500">No readings yet.</p>
                  {:else}
                    {#each [...(bus.readingLogs || [])].sort((a, b) => new Date(b.readingDate || 0).getTime() - new Date(a.readingDate || 0).getTime()) as log, idx}
                      <div class="rounded-lg border border-slate-200 bg-white p-2 text-sm">
                        <p><span class="font-medium">Date:</span> {log.readingDate ? new Date(log.readingDate).toLocaleDateString() : '-'}</p>
                        <p><span class="font-medium">Reading:</span> {log.odometerReading} KM</p>
                        <p><span class="font-medium">Difference:</span> {log.distanceKm ?? '-'} KM</p>
                        <p><span class="font-medium">Fuel Amount:</span> {log.fuelAmount ?? '-'}</p>
                        {#if log.fuelSlip}
                          <button type="button" onclick={() => viewDocument = { src: log.fuelSlip!, title: 'Fuel Slip', downloadName: log.fuelSlipFileName || 'fuel-slip' }} class="mt-1 text-xs text-blue-600 hover:underline">
                            View Fuel Slip{log.fuelSlipFileName ? ` (${log.fuelSlipFileName})` : ''}
                          </button>
                        {/if}
                      </div>
                    {/each}
                  {/if}
                </div>
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

{#if viewDocument}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onclick={() => (viewDocument = null)}>
    <div class="relative w-full max-w-3xl rounded-xl bg-white shadow-2xl overflow-hidden" onclick={(e) => e.stopPropagation()}>
      <div class="flex items-center justify-between border-b px-4 py-3">
        <p class="font-semibold text-sm">{viewDocument.title}</p>
        <div class="flex items-center gap-2">
          <a href={viewDocument.src} download={viewDocument.downloadName} class="flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700">
            <ExternalLink class="h-3 w-3" /> Download
          </a>
          <button onclick={() => (viewDocument = null)} class="rounded p-1 hover:bg-gray-100"><X class="h-5 w-5" /></button>
        </div>
      </div>
      <div class="max-h-[80vh] overflow-auto">
        {#if viewDocument.src.startsWith('data:application/pdf')}
          <iframe src={viewDocument.src} class="h-[75vh] w-full border-0" title={viewDocument.title}></iframe>
        {:else}
          <img src={viewDocument.src} alt={viewDocument.title} class="w-full object-contain" />
        {/if}
      </div>
    </div>
  </div>
{/if}
