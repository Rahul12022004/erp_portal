<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { Plus, Edit, Trash2, FileText, X, ExternalLink } from 'lucide-svelte';

  type Staff = {
    _id: string;
    name: string;
    email: string;
    phone: string;
    position: string;
    department?: string;
    qualification?: string;
    address?: string;
    dateOfBirth?: string;
    gender?: string;
    joinDate?: string;
    status: 'Active' | 'Inactive' | 'On Leave';
    ossId?: string;
    workHistoryDoc?: string;
    offerLetterDoc?: string;
    identityDoc?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    accountHolderName?: string;
    panNumber?: string;
  };

  const schoolId = $derived($page.data.user?.schoolId ?? '');
  let staffList = $state<Staff[]>([]);
  let loading = $state(true);
  let error = $state('');
  let search = $state('');
  let selectedPosition = $state('All');
  let staffType = $state<'teachers' | 'staff'>('teachers');
  let showAddForm = $state(false);
  let editingStaff = $state<Staff | null>(null);
  let viewDocStaff = $state<Staff | null>(null);

  let formData = $state({
    name: '', email: '', phone: '', position: '', department: '', qualification: '',
    address: '', dateOfBirth: '', gender: '', joinDate: '', status: 'Active',
    ossId: '', workHistoryDoc: '', offerLetterDoc: '', identityDoc: '',
    bankName: '', accountNumber: '', ifscCode: '', accountHolderName: '', panNumber: '',
  });

  async function fetchStaff() {
    if (!schoolId) return;
    try {
      loading = true;
      error = '';
      const res = await fetch(`/api/staff/${schoolId}`);
      if (!res.ok) throw new Error(`Failed to load staff (${res.status})`);
      const data = await res.json();
      staffList = Array.isArray(data) ? data : [];
    } catch (err) {
      staffList = [];
      error = err instanceof Error ? err.message : 'Failed to fetch staff';
    } finally {
      loading = false;
    }
  }

  onMount(() => { fetchStaff(); });

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!schoolId) return;
    try {
      const submitData = { ...formData, position: staffType === 'teachers' ? 'Teacher' : formData.position };
      const url = editingStaff ? `/api/staff/${editingStaff._id}` : '/api/staff';
      const method = editingStaff ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...submitData, schoolId }),
      });
      if (res.ok) {
        await fetchStaff();
        resetForm();
        if (staffType === 'teachers' && !editingStaff) {
          alert(`✓ Teacher created successfully!\nLogin credentials have been sent to ${formData.email}`);
        } else {
          alert('Staff member saved successfully!');
        }
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.message || 'Failed to save staff');
      }
    } catch (err) {
      alert('Error saving staff');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this staff member?')) return;
    try {
      const res = await fetch(`/api/staff/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchStaff();
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.message || 'Failed to delete staff');
      }
    } catch {
      alert('Error deleting staff');
    }
  }

  function resetForm() {
    formData = {
      name: '', email: '', phone: '', position: '', department: '', qualification: '',
      address: '', dateOfBirth: '', gender: '', joinDate: '', status: 'Active',
      ossId: '', workHistoryDoc: '', offerLetterDoc: '', identityDoc: '',
      bankName: '', accountNumber: '', ifscCode: '', accountHolderName: '', panNumber: '',
    };
    showAddForm = false;
    editingStaff = null;
  }

  function handleFileUpload(field: 'workHistoryDoc' | 'offerLetterDoc' | 'identityDoc') {
    return (e: Event) => {
      const input = e.currentTarget as HTMLInputElement;
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = typeof reader.result === 'string' ? reader.result : '';
        formData = { ...formData, [field]: base64 };
      };
      reader.readAsDataURL(file);
    };
  }

  function startEdit(staff: Staff) {
    formData = {
      name: staff.name, email: staff.email, phone: staff.phone, position: staff.position,
      department: staff.department || '', qualification: staff.qualification || '',
      address: staff.address || '', dateOfBirth: staff.dateOfBirth || '',
      gender: staff.gender || '', joinDate: staff.joinDate || '', status: staff.status,
      ossId: staff.ossId || '', workHistoryDoc: staff.workHistoryDoc || '',
      offerLetterDoc: staff.offerLetterDoc || '', identityDoc: staff.identityDoc || '',
      bankName: staff.bankName || '', accountNumber: staff.accountNumber || '',
      ifscCode: staff.ifscCode || '', accountHolderName: staff.accountHolderName || '',
      panNumber: staff.panNumber || '',
    };
    editingStaff = staff;
    showAddForm = true;
  }

  const typeFilteredStaff = $derived(
    staffType === 'teachers'
      ? staffList.filter(s => s.position === 'Teacher')
      : staffList.filter(s => s.position !== 'Teacher')
  );

  const positions = $derived(
    staffType === 'teachers'
      ? ['Teacher']
      : [...new Set(staffList.filter(s => s.position !== 'Teacher').map(s => s.position))]
  );

  const filteredStaff = $derived(
    typeFilteredStaff.filter(staff =>
      (selectedPosition === 'All' || staff.position === selectedPosition) &&
      (staff.name.toLowerCase().includes(search.toLowerCase()) ||
        staff.email.toLowerCase().includes(search.toLowerCase()) ||
        staff.position.toLowerCase().includes(search.toLowerCase()))
    )
  );

  function getStatusColor(status: string) {
    if (status === 'Active') return 'bg-green-100 text-green-800';
    if (status === 'Inactive') return 'bg-red-100 text-red-800';
    if (status === 'On Leave') return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  }
</script>

<svelte:head><title>Staff — ERP Portal</title></svelte:head>

<div class="space-y-6">
  <!-- Tabs -->
  <div class="flex gap-2 border-b">
    <button
      onclick={() => { staffType = 'teachers'; selectedPosition = 'All'; search = ''; }}
      class="px-4 py-2 font-medium border-b-2 transition {staffType === 'teachers' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-800'}"
    >Manage Teachers</button>
    <button
      onclick={() => { staffType = 'staff'; selectedPosition = 'All'; search = ''; }}
      class="px-4 py-2 font-medium border-b-2 transition {staffType === 'staff' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-800'}"
    >Manage Staff</button>
  </div>

  <!-- Header -->
  <div class="flex justify-between items-center">
    <h2 class="text-2xl font-bold">{staffType === 'teachers' ? 'Teachers Management' : 'Staff Management'}</h2>
    <button onclick={() => (showAddForm = true)} class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2">
      <Plus class="w-4 h-4" />
      Add {staffType === 'teachers' ? 'Teacher' : 'Staff'}
    </button>
  </div>

  <!-- Filters -->
  <div class="flex gap-4">
    <div class="flex-1">
      <input
        placeholder="Search {staffType === 'teachers' ? 'teachers' : 'staff'}..."
        class="border p-2 w-full rounded"
        bind:value={search}
      />
    </div>
    {#if staffType === 'staff' && positions.length > 0}
      <select class="border p-2 rounded" bind:value={selectedPosition}>
        <option value="All">All Positions</option>
        {#each positions as pos}
          <option value={pos}>{pos}</option>
        {/each}
      </select>
    {/if}
  </div>

  <!-- Add/Edit Form -->
  {#if showAddForm}
    <div class="stat-card p-6">
      <h3 class="text-lg font-semibold mb-4">
        {editingStaff ? `Edit ${staffType === 'teachers' ? 'Teacher' : 'Staff Member'}` : `Add New ${staffType === 'teachers' ? 'Teacher' : 'Staff Member'}`}
      </h3>
      <form onsubmit={handleSubmit} class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="text" placeholder="Full Name" class="border rounded p-2" bind:value={formData.name} required />
          <input type="email" placeholder="Email" class="border rounded p-2" bind:value={formData.email} required />
          <input type="tel" placeholder="Phone" class="border rounded p-2" bind:value={formData.phone} required />
          {#if staffType === 'teachers'}
            <input type="text" placeholder="Department (e.g., Science, Math)" class="border rounded p-2" bind:value={formData.department} />
            <input type="text" placeholder="CBSE OSS ID" class="border rounded p-2" bind:value={formData.ossId} />
          {:else}
            <input type="text" placeholder="Position (e.g., Principal, HOD, Librarian)" class="border rounded p-2" bind:value={formData.position} required />
          {/if}
          <input type="text" placeholder="Qualification" class="border rounded p-2" bind:value={formData.qualification} />
          <input type="date" placeholder="Date of Birth" class="border rounded p-2" bind:value={formData.dateOfBirth} />
          <input type="date" placeholder="Join Date" class="border rounded p-2" bind:value={formData.joinDate} />
          <select class="border rounded p-2" bind:value={formData.gender}>
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          <select class="border rounded p-2" bind:value={formData.status}>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="On Leave">On Leave</option>
          </select>
        </div>
        <textarea placeholder="Address" class="border rounded p-2 w-full" rows={3} bind:value={formData.address}></textarea>

        <!-- Documents -->
        <div class="rounded-lg border p-4 space-y-4">
          <p class="font-medium text-sm">Documents</p>
          <div class="space-y-1">
            <label class="text-sm text-gray-600">Past Working History Document (PDF / Image)</label>
            <input type="file" accept="image/*,application/pdf" class="border rounded p-2 w-full text-sm" onchange={handleFileUpload('workHistoryDoc')} />
            {#if formData.workHistoryDoc}
              <div class="flex items-center gap-2 rounded bg-green-50 px-3 py-1.5 text-sm text-green-700">
                <FileText class="h-4 w-4" /><span class="flex-1">Work history document uploaded</span>
                <button type="button" onclick={() => (formData = { ...formData, workHistoryDoc: '' })} class="text-red-500 hover:text-red-700 text-xs">Remove</button>
              </div>
            {/if}
          </div>
          {#if staffType === 'teachers'}
            <div class="space-y-1">
              <label class="text-sm text-gray-600">Previous School Offer Letter (PDF / Image)</label>
              <input type="file" accept="image/*,application/pdf" class="border rounded p-2 w-full text-sm" onchange={handleFileUpload('offerLetterDoc')} />
              {#if formData.offerLetterDoc}
                <div class="flex items-center gap-2 rounded bg-blue-50 px-3 py-1.5 text-sm text-blue-700">
                  <FileText class="h-4 w-4" /><span class="flex-1">Offer letter uploaded</span>
                  <button type="button" onclick={() => (formData = { ...formData, offerLetterDoc: '' })} class="text-red-500 hover:text-red-700 text-xs">Remove</button>
                </div>
              {/if}
            </div>
          {/if}
          <div class="space-y-1">
            <label class="text-sm text-gray-600">Aadhaar Card / Identity Proof (PDF / Image)</label>
            <input type="file" accept="image/*,application/pdf" class="border rounded p-2 w-full text-sm" onchange={handleFileUpload('identityDoc')} />
            {#if formData.identityDoc}
              <div class="flex items-center gap-2 rounded bg-orange-50 px-3 py-1.5 text-sm text-orange-700">
                <FileText class="h-4 w-4" /><span class="flex-1">Identity proof uploaded</span>
                <button type="button" onclick={() => (formData = { ...formData, identityDoc: '' })} class="text-red-500 hover:text-red-700 text-xs">Remove</button>
              </div>
            {/if}
          </div>
        </div>

        <!-- Bank Details -->
        <div class="rounded-lg border border-purple-200 bg-purple-50 p-4 space-y-4">
          <p class="font-medium text-sm text-purple-900">Bank & Payment Details</p>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Account Holder Name" class="border rounded p-2" bind:value={formData.accountHolderName} />
            <input type="text" placeholder="Bank Name (e.g., HDFC Bank)" class="border rounded p-2" bind:value={formData.bankName} />
            <input type="text" placeholder="Account Number" class="border rounded p-2" bind:value={formData.accountNumber} />
            <input type="text" placeholder="IFSC Code" class="border rounded p-2" bind:value={formData.ifscCode} />
            <input type="text" placeholder="PAN Number" class="border rounded p-2" bind:value={formData.panNumber} />
          </div>
        </div>

        <div class="flex gap-2">
          <button type="submit" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
            {editingStaff ? 'Update' : 'Add'} {staffType === 'teachers' ? 'Teacher' : 'Staff'}
          </button>
          <button type="button" onclick={resetForm} class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded">Cancel</button>
        </div>
      </form>
    </div>
  {/if}

  <!-- Staff List -->
  {#if loading}
    <p class="text-center text-gray-500">Loading staff...</p>
  {:else if error}
    <p class="text-center text-red-600">{error}</p>
  {:else if filteredStaff.length === 0}
    <p class="text-center text-gray-500">No staff found.</p>
  {:else}
    <div class="stat-card p-6">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr>
              <th class="text-left p-2">Name</th>
              {#if staffType === 'teachers'}
                <th class="text-left p-2">Department</th>
                <th class="text-left p-2">OSS ID</th>
              {:else}
                <th class="text-left p-2">Position</th>
              {/if}
              <th class="text-left p-2">Email</th>
              <th class="text-left p-2">Phone</th>
              <th class="text-left p-2">Status</th>
              <th class="text-left p-2">Docs</th>
              <th class="text-left p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each filteredStaff as staff}
              <tr class="border-b hover:bg-gray-50">
                <td class="p-2 font-medium">{staff.name}</td>
                {#if staffType === 'teachers'}
                  <td class="p-2">{staff.department || '-'}</td>
                  <td class="p-2 text-xs text-gray-600">{staff.ossId || '-'}</td>
                {:else}
                  <td class="p-2">{staff.position}</td>
                {/if}
                <td class="p-2">{staff.email}</td>
                <td class="p-2">{staff.phone}</td>
                <td class="p-2">
                  <span class="px-2 py-1 rounded text-xs font-semibold {getStatusColor(staff.status)}">{staff.status}</span>
                </td>
                <td class="p-2">
                  {#if staff.workHistoryDoc || staff.offerLetterDoc || staff.identityDoc}
                    <button onclick={() => (viewDocStaff = staff)} class="flex items-center gap-1 rounded bg-indigo-50 px-2 py-1 text-xs text-indigo-700 hover:bg-indigo-100">
                      <FileText class="w-3 h-3" /> View
                    </button>
                  {:else}
                    <span class="text-xs text-gray-400">—</span>
                  {/if}
                </td>
                <td class="p-2">
                  <div class="flex gap-2">
                    <button onclick={() => startEdit(staff)} class="text-blue-600 hover:text-blue-800" title="Edit">
                      <Edit class="w-4 h-4" />
                    </button>
                    <button onclick={() => handleDelete(staff._id)} class="text-red-600 hover:text-red-800" title="Delete">
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}

  <!-- Summary -->
  {#if !loading && typeFilteredStaff.length > 0}
    <div class="stat-card p-6">
      <h3 class="text-lg font-semibold mb-4">{staffType === 'teachers' ? 'Teachers' : 'Staff'} Summary</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div><p class="text-sm text-gray-600">Total</p><p class="text-2xl font-bold">{typeFilteredStaff.length}</p></div>
        <div><p class="text-sm text-gray-600">Active</p><p class="text-2xl font-bold text-green-600">{typeFilteredStaff.filter(s => s.status === 'Active').length}</p></div>
        <div><p class="text-sm text-gray-600">On Leave</p><p class="text-2xl font-bold text-yellow-600">{typeFilteredStaff.filter(s => s.status === 'On Leave').length}</p></div>
        <div><p class="text-sm text-gray-600">Inactive</p><p class="text-2xl font-bold text-red-600">{typeFilteredStaff.filter(s => s.status === 'Inactive').length}</p></div>
      </div>
    </div>
  {/if}
</div>

<!-- Document Viewer Modal -->
{#if viewDocStaff}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onclick={() => (viewDocStaff = null)}>
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="relative w-full max-w-3xl rounded-xl bg-white shadow-2xl overflow-hidden" onclick={(e) => e.stopPropagation()}>
      <div class="flex items-center justify-between border-b px-4 py-3">
        <p class="font-semibold">{viewDocStaff.name} — Documents</p>
        <button onclick={() => (viewDocStaff = null)} class="rounded p-1 hover:bg-gray-100"><X class="h-5 w-5" /></button>
      </div>
      <div class="max-h-[80vh] overflow-y-auto divide-y">
        {#if viewDocStaff.workHistoryDoc}
          {@render docViewer('Past Working History', viewDocStaff.workHistoryDoc, 'work-history')}
        {/if}
        {#if viewDocStaff.offerLetterDoc}
          {@render docViewer('Previous School Offer Letter', viewDocStaff.offerLetterDoc, 'offer-letter')}
        {/if}
        {#if viewDocStaff.identityDoc}
          {@render docViewer('Aadhaar / Identity Proof', viewDocStaff.identityDoc, 'identity-proof')}
        {/if}
      </div>
    </div>
  </div>
{/if}

{#snippet docViewer(label: string, data: string, fileName: string)}
  <div class="p-4 space-y-2">
    <div class="flex items-center justify-between">
      <p class="font-medium text-sm">{label}</p>
      <a href={data} download={fileName} class="flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700">
        <ExternalLink class="h-3 w-3" /> Download
      </a>
    </div>
    {#if data.startsWith('data:application/pdf')}
      <iframe src={data} class="h-[60vh] w-full rounded border-0" title={label}></iframe>
    {:else}
      <img src={data} alt={label} class="w-full rounded object-contain max-h-[60vh]" />
    {/if}
  </div>
{/snippet}
