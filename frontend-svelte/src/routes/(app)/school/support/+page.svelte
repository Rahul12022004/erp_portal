<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { BadgeHelp, Building2, Globe, Mail, MapPin, Phone, ShieldCheck, UserRound, Users } from 'lucide-svelte';

  type SchoolRecord = {
    _id: string;
    schoolInfo?: { name?: string; email?: string; phone?: string; website?: string; address?: string; logo?: string };
    adminInfo?: { name?: string; email?: string; phone?: string; status?: string };
    systemInfo?: { schoolType?: string; maxStudents?: number; subscriptionPlan?: string; subscriptionEndDate?: string };
    modules?: string[];
  };
  type StaffMember = { _id: string; name: string; email: string; phone: string; position: string; department?: string; status?: string };

  const schoolId = $derived($page.data.user?.schoolId ?? '');
  let school = $state<SchoolRecord | null>(null);
  let staff = $state<StaffMember[]>([]);
  let loading = $state(true);
  let error = $state('');

  onMount(async () => {
    if (!schoolId) { error = 'School not found.'; loading = false; return; }
    try {
      const [schoolRes, staffRes] = await Promise.all([fetch(`/api/schools/${schoolId}`), fetch(`/api/staff/${schoolId}`)]);
      if (!schoolRes.ok) throw new Error(`Failed to load school (${schoolRes.status})`);
      if (!staffRes.ok) throw new Error(`Failed to load staff (${staffRes.status})`);
      const schoolRaw = await schoolRes.json();
      school = (schoolRaw?.data ?? schoolRaw) as SchoolRecord;
      const staffRaw = await staffRes.json();
      staff = Array.isArray((staffRaw as {data?: unknown[]})?.data) ? (staffRaw as {data: StaffMember[]}).data : (Array.isArray(staffRaw) ? staffRaw : []);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load';
    } finally { loading = false; }
  });

  const teacherCount = $derived(staff.filter(m => /teacher/i.test(m.position)).length);
  const supportStaffCount = $derived(staff.filter(m => !/teacher/i.test(m.position)).length);
  const visibleStaff = $derived(staff.filter(m => m.email.toLowerCase() !== (school?.adminInfo?.email ?? '').toLowerCase()));
</script>

<svelte:head><title>Support — ERP Portal</title></svelte:head>

<div class="space-y-6">
  {#if loading}
    <p class="text-center text-gray-500">Loading support details...</p>
  {:else if error}
    <p class="text-center text-red-600">{error}</p>
  {:else if !school}
    <p class="text-center text-gray-500">School information is not available.</p>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      <div class="stat-card p-5"><p class="text-sm text-muted-foreground">School Name</p><h3 class="mt-2 text-lg font-semibold">{school.schoolInfo?.name || 'School'}</h3></div>
      <div class="stat-card p-5"><p class="text-sm text-muted-foreground">Total Staff</p><h3 class="mt-2 text-lg font-semibold">{staff.length}</h3></div>
      <div class="stat-card p-5"><p class="text-sm text-muted-foreground">Teachers</p><h3 class="mt-2 text-lg font-semibold">{teacherCount}</h3></div>
      <div class="stat-card p-5"><p class="text-sm text-muted-foreground">Other Staff</p><h3 class="mt-2 text-lg font-semibold">{supportStaffCount}</h3></div>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-4 gap-4">
      <div class="stat-card p-5 space-y-4">
        <div class="flex items-center gap-2"><Building2 class="w-5 h-5 text-blue-600" /><h3 class="text-lg font-semibold">School Information</h3></div>
        <div class="space-y-3 text-sm">
          <p class="flex items-start gap-2"><Mail class="w-4 h-4 mt-0.5 text-muted-foreground" /><span>{school.schoolInfo?.email || 'No school email added'}</span></p>
          <p class="flex items-start gap-2"><Phone class="w-4 h-4 mt-0.5 text-muted-foreground" /><span>{school.schoolInfo?.phone || 'No phone added'}</span></p>
          <p class="flex items-start gap-2"><Globe class="w-4 h-4 mt-0.5 text-muted-foreground" /><span>{school.schoolInfo?.website || 'No website added'}</span></p>
          <p class="flex items-start gap-2"><MapPin class="w-4 h-4 mt-0.5 text-muted-foreground" /><span>{school.schoolInfo?.address || 'No address added'}</span></p>
        </div>
      </div>

      <div class="stat-card p-5 space-y-4">
        <div class="flex items-center gap-2"><ShieldCheck class="w-5 h-5 text-green-600" /><h3 class="text-lg font-semibold">Office Admin</h3></div>
        <div class="space-y-3 text-sm">
          <p class="flex items-start gap-2"><UserRound class="w-4 h-4 mt-0.5 text-muted-foreground" /><span>{school.adminInfo?.name || 'No admin name added'}</span></p>
          <p class="flex items-start gap-2"><Mail class="w-4 h-4 mt-0.5 text-muted-foreground" /><span>{school.adminInfo?.email || 'No admin email added'}</span></p>
          <p class="flex items-start gap-2"><Phone class="w-4 h-4 mt-0.5 text-muted-foreground" /><span>{school.adminInfo?.phone || 'No admin phone added'}</span></p>
          <p class="flex items-start gap-2"><BadgeHelp class="w-4 h-4 mt-0.5 text-muted-foreground" /><span>Status: {school.adminInfo?.status || 'Active'}</span></p>
        </div>
      </div>

      <div class="stat-card p-5 space-y-4">
        <div class="flex items-center gap-2"><Users class="w-5 h-5 text-violet-600" /><h3 class="text-lg font-semibold">System Details</h3></div>
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div class="rounded-lg bg-muted/30 p-3"><p class="text-xs uppercase tracking-wide text-muted-foreground">School Type</p><p class="mt-1 font-medium">{school.systemInfo?.schoolType || 'Not set'}</p></div>
          <div class="rounded-lg bg-muted/30 p-3"><p class="text-xs uppercase tracking-wide text-muted-foreground">Plan</p><p class="mt-1 font-medium">{school.systemInfo?.subscriptionPlan || 'Basic'}</p></div>
          <div class="rounded-lg bg-muted/30 p-3"><p class="text-xs uppercase tracking-wide text-muted-foreground">Max Students</p><p class="mt-1 font-medium">{school.systemInfo?.maxStudents || 0}</p></div>
          <div class="rounded-lg bg-muted/30 p-3"><p class="text-xs uppercase tracking-wide text-muted-foreground">Ends On</p><p class="mt-1 font-medium">{school.systemInfo?.subscriptionEndDate || 'No end date'}</p></div>
        </div>
        <div class="rounded-lg bg-muted/30 p-3 text-sm">
          <p class="text-xs uppercase tracking-wide text-muted-foreground">Active Modules</p>
          <p class="mt-1">{school.modules && school.modules.length > 0 ? school.modules.join(', ') : 'No modules assigned'}</p>
        </div>
      </div>

      <div class="stat-card p-5 space-y-4">
        <div class="flex items-center gap-2"><BadgeHelp class="w-5 h-5 text-rose-600" /><h3 class="text-lg font-semibold">Software Support</h3></div>
        <div class="space-y-3 text-sm">
          <p class="font-medium">Nexavise Consulting Pvt. Ltd.</p>
          <p class="flex items-start gap-2"><Mail class="w-4 h-4 mt-0.5 text-muted-foreground" /><span>helpdesk@nexavise.in</span></p>
          <p class="flex items-start gap-2"><Phone class="w-4 h-4 mt-0.5 text-muted-foreground" /><span>+91 98765 43210</span></p>
          <p class="flex items-start gap-2"><Globe class="w-4 h-4 mt-0.5 text-muted-foreground" /><a href="https://www.nexavise.com" target="_blank" rel="noreferrer" class="text-blue-600 hover:underline break-all">www.nexavise.com</a></p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <a href="mailto:helpdesk@nexavise.in" class="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">Contact Us</a>
          <a href="tel:+919876543210" class="inline-flex items-center justify-center rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50">Get Support</a>
        </div>
      </div>
    </div>

    <div class="space-y-3">
      <div>
        <h3 class="text-lg font-semibold">School Staff Cards</h3>
        <p class="text-sm text-muted-foreground">Office team, teachers, and other school contacts.</p>
      </div>
      {#if visibleStaff.length === 0}
        <div class="stat-card p-6 text-center text-gray-500">No staff records available for this school yet.</div>
      {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {#each visibleStaff as member}
            <div class="stat-card p-5 space-y-4">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h4 class="text-lg font-semibold">{member.name}</h4>
                  <p class="text-sm text-muted-foreground">{member.position}</p>
                </div>
                <span class="px-3 py-1 rounded-full text-xs font-medium {member.status === 'Active' ? 'bg-green-100 text-green-700' : member.status === 'On Leave' ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-700'}">
                  {member.status || 'Active'}
                </span>
              </div>
              <div class="space-y-2 text-sm">
                <p class="flex items-start gap-2"><Mail class="w-4 h-4 mt-0.5 text-muted-foreground" /><span>{member.email}</span></p>
                <p class="flex items-start gap-2"><Phone class="w-4 h-4 mt-0.5 text-muted-foreground" /><span>{member.phone}</span></p>
                <p class="flex items-start gap-2"><Building2 class="w-4 h-4 mt-0.5 text-muted-foreground" /><span>{member.department || 'General Department'}</span></p>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>
