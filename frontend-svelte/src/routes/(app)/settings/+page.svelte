<script lang="ts">
  import { onMount } from 'svelte';

  const ALL_MODULES: { key: string; name: string }[] = [
    { key: 'students',     name: 'Students' },
    { key: 'staff',        name: 'Staff' },
    { key: 'attendance',   name: 'Attendance' },
    { key: 'exams',        name: 'Exams' },
    { key: 'academics',    name: 'Academics' },
    { key: 'classes',      name: 'Classes' },
    { key: 'timetable',    name: 'Time Table' },
    { key: 'communication',name: 'Communication' },
    { key: 'finance',      name: 'Finance' },
    { key: 'payroll',      name: 'Payroll' },
    { key: 'admissions',   name: 'Admissions' },
    { key: 'visitor',      name: 'Visitor' },
    { key: 'hr',           name: 'HR' },
    { key: 'transport',    name: 'Transport' },
    { key: 'hostel',       name: 'Hostel' },
    { key: 'library',      name: 'Library' },
    { key: 'inventory',    name: 'Inventory' },
    { key: 'social-media', name: 'Social Media' },
    { key: 'data-import',  name: 'Data Import' },
    { key: 'sports',       name: 'Sports' },
    { key: 'discipline',   name: 'House / Discipline' },
    { key: 'notifications',name: 'Notifications' },
    { key: 'reports',      name: 'Reports' },
    { key: 'approvals',    name: 'Approvals' },
    { key: 'maintenance',  name: 'Maintenance' },
    { key: 'survey',       name: 'Survey' },
    { key: 'downloads',    name: 'Downloads' },
    { key: 'support',      name: 'Support' },
  ];

  interface Plan {
    name: string;
    price: number;
  }

  let activeTab = $state<'General' | 'Modules' | 'Subscription'>('General');

  // General tab state — loaded from API
  interface GeneralConfig {
    appName: string; logoUrl: string; currencySymbol: string;
    academicYear: string; supportEmail: string; supportPhone: string;
    allowSelfRegistration: boolean; defaultPlan: string; maxSchools: number;
    sessionTimeoutMinutes: number; maxLoginAttempts: number;
    require2FAAdmin: boolean; require2FASchool: boolean;
    smtpHost: string; smtpPort: number; smtpUsername: string;
    smtpPassword: string; smtpFromName: string; smtpFromEmail: string;
    announcementEnabled: boolean; announcementMessage: string;
    announcementType: string; announcementTarget: string;
    minPasswordLength: number; requireUppercase: boolean;
    requireNumber: boolean; requireSpecialChar: boolean; passwordExpiryDays: number;
    maxUploadSizeMB: number; storageQuotaPerSchoolMB: number;
  }

  const defaultGeneral = (): GeneralConfig => ({
    appName: 'ERP Portal', logoUrl: '', currencySymbol: '₹',
    academicYear: '2025-2026', supportEmail: '', supportPhone: '',
    allowSelfRegistration: true, defaultPlan: 'Basic', maxSchools: 500,
    sessionTimeoutMinutes: 30, maxLoginAttempts: 5,
    require2FAAdmin: false, require2FASchool: false,
    smtpHost: '', smtpPort: 587, smtpUsername: '', smtpPassword: '',
    smtpFromName: '', smtpFromEmail: '',
    announcementEnabled: false, announcementMessage: '',
    announcementType: 'info', announcementTarget: 'all',
    minPasswordLength: 8, requireUppercase: false,
    requireNumber: true, requireSpecialChar: false, passwordExpiryDays: 0,
    maxUploadSizeMB: 10, storageQuotaPerSchoolMB: 1024,
  });

  let general = $state<GeneralConfig>(defaultGeneral());
  let generalLoading = $state(true);
  let generalSaving = $state(false);
  let generalSaveMsg = $state('');
  let smtpTesting = $state(false);
  let smtpTestMsg = $state('');

  // Modules tab state — map of key → enabled
  let moduleStates = $state<Record<string, boolean>>({});
  let modulesLoading = $state(true);
  let savingModule = $state<string | null>(null);
  let saveError = $state('');

  // Subscription tab state
  let plans = $state<Plan[]>([
    { name: 'Basic', price: 0 },
    { name: 'Standard', price: 999 },
    { name: 'Premium', price: 1999 },
  ]);
  let newPlanName = $state('');
  let newPlanPrice = $state(0);

  // Danger Zone
  let dangerEmail = $state('');
  let dangerPassword = $state('');
  let dangerConfirm = $state('');
  let dangerLoading = $state(false);

  onMount(async () => {
    await Promise.all([loadGeneral(), loadGlobalModules()]);
  });

  async function loadGeneral() {
    generalLoading = true;
    try {
      const res = await fetch('/api/admin/config');
      if (res.ok) {
        const json = await res.json();
        general = { ...defaultGeneral(), ...(json?.data ?? json) };
      }
    } catch (e) { console.error(e); }
    finally { generalLoading = false; }
  }

  async function saveGeneral() {
    generalSaving = true;
    generalSaveMsg = '';
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(general),
      });
      if (res.ok) {
        generalSaveMsg = '✓ Saved';
        const saved = await res.json().catch(() => ({}));
        general = { ...general, ...(saved?.data ?? saved) };
      } else {
        const errJson = await res.json().catch(() => ({}));
        generalSaveMsg = `✗ [${res.status}] ${errJson?.error ?? errJson?.message ?? 'Failed to save'}`;
      }
      setTimeout(() => { generalSaveMsg = ''; }, 5000);
    } catch (e) {
      generalSaveMsg = `✗ ${e instanceof Error ? e.message : 'Network error'}`;
    }
    finally { generalSaving = false; }
  }

  async function testSMTP() {
    smtpTesting = true;
    smtpTestMsg = 'Sending test email...';
    // Placeholder — SMTP send endpoint can be wired up later
    await new Promise(r => setTimeout(r, 1500));
    smtpTestMsg = 'Test email queued (wire up SMTP endpoint to activate)';
    smtpTesting = false;
  }

  async function loadGlobalModules() {
    modulesLoading = true;
    try {
      const res = await fetch('/api/settings/global-modules');
      if (res.ok) {
        const json = await res.json();
        const stored: Record<string, boolean> = json?.data?.modules ?? json?.modules ?? {};
        // Build state: stored value if present, else default true (enabled)
        const state: Record<string, boolean> = {};
        for (const m of ALL_MODULES) {
          state[m.key] = m.key in stored ? stored[m.key] : true;
        }
        moduleStates = state;
      }
    } catch (e) {
      console.error(e);
    } finally {
      modulesLoading = false;
    }
  }

  async function toggleModule(key: string) {
    const newVal = !moduleStates[key];
    moduleStates = { ...moduleStates, [key]: newVal };
    savingModule = key;
    saveError = '';
    try {
      const res = await fetch('/api/settings/global-modules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modules: moduleStates }),
      });
      if (!res.ok) {
        // revert on failure
        moduleStates = { ...moduleStates, [key]: !newVal };
        saveError = `Failed to save "${key}"`;
      }
    } catch {
      moduleStates = { ...moduleStates, [key]: !newVal };
      saveError = 'Network error';
    } finally {
      savingModule = null;
    }
  }

  function addPlan() {
    if (!newPlanName.trim()) return;
    plans = [...plans, { name: newPlanName.trim(), price: newPlanPrice }];
    newPlanName = '';
    newPlanPrice = 0;
  }

  function deletePlan(index: number) {
    plans = plans.filter((_, i) => i !== index);
  }

  async function clearDatabase() {
    if (dangerConfirm !== 'DELETE EVERYTHING') {
      alert('Please type DELETE EVERYTHING to confirm.');
      return;
    }
    dangerLoading = true;
    try {
      const res = await fetch('/api/schools/super-admin/clear-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: dangerEmail, password: dangerPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Database cleared successfully.');
      } else {
        alert(data.error ?? data.message ?? 'Failed to clear database.');
      }
    } catch (e) {
      console.error(e);
      alert('An error occurred.');
    } finally {
      dangerLoading = false;
    }
  }

  function handleSave() { /* no-op — general saves via saveGeneral() */ }
</script>

<svelte:head><title>Settings — ERP Portal</title></svelte:head>

<div class="space-y-6">
  <h1 class="text-2xl font-bold text-gray-900">Settings</h1>

  <!-- Tabs -->
  <div class="flex border-b border-gray-200">
    {#each (['General', 'Modules', 'Subscription'] as const) as tab}
      <button
        onclick={() => { activeTab = tab; }}
        class="px-5 py-3 text-sm font-medium border-b-2 transition {activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
      >
        {tab}
      </button>
    {/each}
  </div>

  <!-- General Tab -->
  {#if activeTab === 'General'}
    {#if generalLoading}
      <p class="text-gray-400 text-sm">Loading...</p>
    {:else}
      <div class="space-y-6">

        <!-- Branding -->
        <div class="bg-white shadow rounded-xl p-6">
          <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Branding</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">App Name</label>
              <input bind:value={general.appName} type="text" class="input-field" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Currency Symbol</label>
              <select bind:value={general.currencySymbol} class="input-field">
                <option value="₹">₹ — INR (Indian Rupee)</option>
                <option value="$">$ — USD (US Dollar)</option>
                <option value="€">€ — EUR (Euro)</option>
                <option value="£">£ — GBP (British Pound)</option>
                <option value="¥">¥ — JPY (Japanese Yen)</option>
              </select>
            </div>
            <div class="sm:col-span-2">
              <label class="block text-xs font-medium text-gray-600 mb-1">Logo URL</label>
              <input bind:value={general.logoUrl} type="url" placeholder="https://..." class="input-field" />
            </div>
          </div>
        </div>

        <!-- Academic & Support -->
        <div class="bg-white shadow rounded-xl p-6">
          <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Academic & Support</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Academic Year</label>
              <input bind:value={general.academicYear} type="text" placeholder="2025-2026" class="input-field" />
            </div>
            <div></div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Support Email</label>
              <input bind:value={general.supportEmail} type="email" placeholder="support@yourapp.com" class="input-field" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Support Phone</label>
              <input bind:value={general.supportPhone} type="tel" placeholder="+91 98765 43210" class="input-field" />
            </div>
          </div>
        </div>

        <!-- Registration -->
        <div class="bg-white shadow rounded-xl p-6">
          <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Registration</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3">
              <span class="text-sm font-medium text-gray-700">Allow Self-Registration</span>
              <button onclick={() => { general.allowSelfRegistration = !general.allowSelfRegistration; }}
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {general.allowSelfRegistration ? 'bg-green-500' : 'bg-gray-300'}"
                role="switch" aria-checked={general.allowSelfRegistration}>
                <span class="inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform {general.allowSelfRegistration ? 'translate-x-6' : 'translate-x-1'}"></span>
              </button>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Default Plan for New Schools</label>
              <select bind:value={general.defaultPlan} class="input-field">
                <option value="Basic">Basic</option>
                <option value="Standard">Standard</option>
                <option value="Premium">Premium</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Max Schools Allowed</label>
              <input bind:value={general.maxSchools} type="number" min="1" class="input-field" />
            </div>
          </div>
        </div>

        <!-- Security -->
        <div class="bg-white shadow rounded-xl p-6">
          <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Security</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Session Timeout (minutes)</label>
              <input bind:value={general.sessionTimeoutMinutes} type="number" min="5" class="input-field" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Max Login Attempts</label>
              <input bind:value={general.maxLoginAttempts} type="number" min="1" max="20" class="input-field" />
            </div>
            <div class="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3">
              <span class="text-sm font-medium text-gray-700">Require 2FA — Super Admin</span>
              <button onclick={() => { general.require2FAAdmin = !general.require2FAAdmin; }}
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {general.require2FAAdmin ? 'bg-green-500' : 'bg-gray-300'}"
                role="switch" aria-checked={general.require2FAAdmin}>
                <span class="inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform {general.require2FAAdmin ? 'translate-x-6' : 'translate-x-1'}"></span>
              </button>
            </div>
            <div class="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3">
              <span class="text-sm font-medium text-gray-700">Require 2FA — School Admins</span>
              <button onclick={() => { general.require2FASchool = !general.require2FASchool; }}
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {general.require2FASchool ? 'bg-green-500' : 'bg-gray-300'}"
                role="switch" aria-checked={general.require2FASchool}>
                <span class="inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform {general.require2FASchool ? 'translate-x-6' : 'translate-x-1'}"></span>
              </button>
            </div>
          </div>
        </div>

        <!-- Password Policy -->
        <div class="bg-white shadow rounded-xl p-6">
          <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Password Policy</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Min Password Length</label>
              <input bind:value={general.minPasswordLength} type="number" min="6" max="32" class="input-field" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Password Expiry (days, 0 = never)</label>
              <input bind:value={general.passwordExpiryDays} type="number" min="0" class="input-field" />
            </div>
            {#each [
              { key: 'requireUppercase', label: 'Require Uppercase' },
              { key: 'requireNumber', label: 'Require Number' },
              { key: 'requireSpecialChar', label: 'Require Special Character' },
            ] as rule}
              <div class="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3">
                <span class="text-sm font-medium text-gray-700">{rule.label}</span>
                <button onclick={() => { (general as any)[rule.key] = !(general as any)[rule.key]; }}
                  class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {(general as any)[rule.key] ? 'bg-green-500' : 'bg-gray-300'}"
                  role="switch" aria-checked={(general as any)[rule.key]}>
                  <span class="inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform {(general as any)[rule.key] ? 'translate-x-6' : 'translate-x-1'}"></span>
                </button>
              </div>
            {/each}
          </div>
        </div>

        <!-- SMTP / Email -->
        <div class="bg-white shadow rounded-xl p-6">
          <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Email / SMTP</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">SMTP Host</label>
              <input bind:value={general.smtpHost} type="text" placeholder="smtp.gmail.com" class="input-field" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">SMTP Port</label>
              <input bind:value={general.smtpPort} type="number" placeholder="587" class="input-field" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Username</label>
              <input bind:value={general.smtpUsername} type="text" placeholder="you@gmail.com" class="input-field" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Password</label>
              <input bind:value={general.smtpPassword} type="password" placeholder="leave blank to keep existing" class="input-field" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">From Name</label>
              <input bind:value={general.smtpFromName} type="text" placeholder="ERP Portal" class="input-field" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">From Email</label>
              <input bind:value={general.smtpFromEmail} type="email" placeholder="noreply@yourapp.com" class="input-field" />
            </div>
          </div>
          <div class="mt-4 flex items-center gap-3">
            <button onclick={testSMTP} disabled={smtpTesting}
              class="text-sm font-medium px-4 py-1.5 rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50 disabled:opacity-50">
              {smtpTesting ? 'Testing...' : 'Send Test Email'}
            </button>
            {#if smtpTestMsg}<span class="text-xs text-gray-500">{smtpTestMsg}</span>{/if}
          </div>
        </div>

        <!-- Announcement Banner -->
        <div class="bg-white shadow rounded-xl p-6">
          <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">System Announcement Banner</h3>
          <p class="text-xs text-gray-400 mb-4">Shows at the top of every page for all users when enabled.</p>
          <div class="space-y-4">
            <div class="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3">
              <span class="text-sm font-medium text-gray-700">Enable Announcement</span>
              <button onclick={() => { general.announcementEnabled = !general.announcementEnabled; }}
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {general.announcementEnabled ? 'bg-green-500' : 'bg-gray-300'}"
                role="switch" aria-checked={general.announcementEnabled}>
                <span class="inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform {general.announcementEnabled ? 'translate-x-6' : 'translate-x-1'}"></span>
              </button>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Message</label>
              <textarea bind:value={general.announcementMessage} rows="2"
                placeholder="System will be down for maintenance on Sunday 10pm–12am."
                class="input-field resize-none"></textarea>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Type</label>
                <select bind:value={general.announcementType} class="input-field">
                  <option value="info">Info (blue)</option>
                  <option value="warning">Warning (yellow)</option>
                  <option value="critical">Critical (red)</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">Show To</label>
                <select bind:value={general.announcementTarget} class="input-field">
                  <option value="all">All Users</option>
                  <option value="school-admin">School Admins Only</option>
                  <option value="super-admin">Super Admins Only</option>
                </select>
              </div>
            </div>
            {#if general.announcementEnabled && general.announcementMessage}
              <div class="rounded-lg px-4 py-3 text-sm font-medium
                {general.announcementType === 'critical' ? 'bg-red-50 text-red-800 border border-red-200' :
                 general.announcementType === 'warning' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
                 'bg-blue-50 text-blue-800 border border-blue-200'}">
                Preview: {general.announcementMessage}
              </div>
            {/if}
          </div>
        </div>

        <!-- Storage & Uploads -->
        <div class="bg-white shadow rounded-xl p-6">
          <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Storage & Uploads</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Max Upload Size (MB)</label>
              <input bind:value={general.maxUploadSizeMB} type="number" min="1" class="input-field" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">Storage Quota per School (MB)</label>
              <input bind:value={general.storageQuotaPerSchoolMB} type="number" min="100" class="input-field" />
            </div>
          </div>
        </div>

        <!-- Save -->
        <div class="flex items-center justify-end gap-4">
          {#if generalSaveMsg}
            <span class="text-sm {generalSaveMsg.startsWith('✓') ? 'text-green-600' : 'text-red-600'}">{generalSaveMsg}</span>
          {/if}
          <button onclick={saveGeneral} disabled={generalSaving}
            class="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium px-6 py-2 rounded-lg text-sm">
            {generalSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    {/if}
  {/if}

  <!-- Modules Tab -->
  {#if activeTab === 'Modules'}
    <div class="bg-white shadow rounded-xl p-6">
      <div class="flex items-center justify-between mb-4">
        <p class="text-sm text-gray-500">Toggle modules globally. Disabled modules show a maintenance screen in all schools.</p>
        {#if saveError}
          <p class="text-sm text-red-600">{saveError}</p>
        {/if}
      </div>

      {#if modulesLoading}
        <p class="text-gray-400 text-sm">Loading modules...</p>
      {:else}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {#each ALL_MODULES as mod}
            {@const enabled = moduleStates[mod.key] ?? true}
            {@const saving = savingModule === mod.key}
            <div class="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3 {saving ? 'opacity-60' : ''}">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-gray-700">{mod.name}</span>
                {#if !enabled}
                  <span class="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">Maintenance</span>
                {/if}
              </div>
              <button
                aria-label={mod.name}
                onclick={() => toggleModule(mod.key)}
                disabled={saving}
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:cursor-not-allowed {enabled ? 'bg-green-500' : 'bg-gray-300'}"
                role="switch"
                aria-checked={enabled}
              >
                <span class="inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform {enabled ? 'translate-x-6' : 'translate-x-1'}"></span>
              </button>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  <!-- Subscription Tab -->
  {#if activeTab === 'Subscription'}
    <div class="bg-white shadow rounded-xl p-6 space-y-4">
      <div class="space-y-3">
        {#each plans as plan, i}
          <div class="flex items-center gap-4 border border-gray-200 rounded-lg px-4 py-3">
            <input bind:value={plans[i].name} type="text" placeholder="Plan Name"
              class="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input bind:value={plans[i].price} type="number" placeholder="Price"
              class="w-28 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onclick={() => deletePlan(i)} class="text-red-500 hover:text-red-700 text-sm font-medium">Delete</button>
          </div>
        {/each}
      </div>
      <div class="flex items-center gap-4 border border-dashed border-gray-300 rounded-lg px-4 py-3">
        <input bind:value={newPlanName} type="text" placeholder="New Plan Name"
          class="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input bind:value={newPlanPrice} type="number" placeholder="Price"
          class="w-28 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button onclick={addPlan} class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-1.5 rounded">Add</button>
      </div>
    </div>

    <!-- Danger Zone -->
    <div class="bg-white shadow rounded-xl p-6 border border-red-200 space-y-4">
      <h2 class="text-lg font-bold text-red-600">Danger Zone</h2>
      <p class="text-sm text-gray-600">Clear all data from the database. This action is irreversible.</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1" for="dangerEmail">Email</label>
          <input id="dangerEmail" bind:value={dangerEmail} type="email"
            class="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1" for="dangerPassword">Password</label>
          <input id="dangerPassword" bind:value={dangerPassword} type="password"
            class="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
        </div>
        <div class="sm:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1" for="dangerConfirm">
            Type <span class="font-mono font-bold">DELETE EVERYTHING</span> to confirm
          </label>
          <input id="dangerConfirm" bind:value={dangerConfirm} type="text"
            class="w-full border border-red-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
        </div>
      </div>
      <button onclick={clearDatabase} disabled={dangerLoading}
        class="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium px-5 py-2 rounded-lg text-sm">
        {dangerLoading ? 'Clearing...' : 'Clear Database'}
      </button>
    </div>
  {/if}
</div>

<style>
  :global(.input-field) {
    width: 100%;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    outline: none;
    transition: box-shadow 0.15s;
  }
  :global(.input-field:focus) {
    box-shadow: 0 0 0 2px #3b82f6;
    border-color: #3b82f6;
  }
</style>
