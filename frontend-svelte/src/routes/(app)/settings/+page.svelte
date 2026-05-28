<script lang="ts">
  interface Module {
    name: string;
    enabled: boolean;
  }

  interface Plan {
    name: string;
    price: number;
  }

  let activeTab = $state<'General' | 'Modules' | 'Subscription'>('General');

  // General tab state
  let appName = $state('ERP Portal');
  let timezone = $state('Asia/Kolkata');
  let dateFormat = $state('DD/MM/YYYY');

  // Modules tab state
  let modules = $state<Module[]>([
    { name: 'Attendance', enabled: true },
    { name: 'Finance', enabled: true },
    { name: 'Examination', enabled: true },
    { name: 'Library', enabled: false },
    { name: 'Transport', enabled: true },
    { name: 'Hostel', enabled: false },
    { name: 'HR', enabled: true },
    { name: 'Payroll', enabled: false },
    { name: 'Admissions', enabled: true },
    { name: 'Timetable', enabled: true },
    { name: 'Communication', enabled: true },
    { name: 'Reports', enabled: true },
    { name: 'Notice Board', enabled: false },
    { name: 'Events', enabled: true },
    { name: 'Gallery', enabled: false },
    { name: 'Alumni', enabled: false },
    { name: 'Canteen', enabled: false },
    { name: 'Health', enabled: true },
    { name: 'Sports', enabled: false },
    { name: 'Clubs', enabled: false },
    { name: 'Parents Portal', enabled: true },
    { name: 'Student Portal', enabled: true },
    { name: 'Teacher Portal', enabled: true },
    { name: 'Analytics', enabled: true },
    { name: 'Certificates', enabled: false },
  ]);

  // Subscription tab state
  let plans = $state<Plan[]>([
    { name: 'Basic', price: 0 },
    { name: 'Standard', price: 999 },
    { name: 'Premium', price: 1999 },
  ]);
  let newPlanName = $state('');
  let newPlanPrice = $state(0);

  function addPlan() {
    if (!newPlanName.trim()) return;
    plans = [...plans, { name: newPlanName.trim(), price: newPlanPrice }];
    newPlanName = '';
    newPlanPrice = 0;
  }

  function deletePlan(index: number) {
    plans = plans.filter((_, i) => i !== index);
  }

  // Danger Zone
  let dangerEmail = $state('');
  let dangerPassword = $state('');
  let dangerConfirm = $state('');
  let dangerLoading = $state(false);

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
        credentials: 'include',
        body: JSON.stringify({ email: dangerEmail, password: dangerPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Database cleared successfully.');
      } else {
        alert(data.message ?? 'Failed to clear database.');
      }
    } catch (e) {
      console.error(e);
      alert('An error occurred.');
    } finally {
      dangerLoading = false;
    }
  }

  function handleSave() {
    if (activeTab === 'General') {
      console.log('Save General:', { appName, timezone, dateFormat });
    } else if (activeTab === 'Modules') {
      console.log('Save Modules:', modules);
    } else if (activeTab === 'Subscription') {
      console.log('Save Plans:', plans);
    }
  }
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
    <div class="bg-white shadow rounded-xl p-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1" for="appName">App Name</label>
          <input
            id="appName"
            bind:value={appName}
            type="text"
            class="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1" for="timezone">Timezone</label>
          <input
            id="timezone"
            bind:value={timezone}
            type="text"
            class="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1" for="dateFormat">Date Format</label>
          <input
            id="dateFormat"
            bind:value={dateFormat}
            type="text"
            class="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  {/if}

  <!-- Modules Tab -->
  {#if activeTab === 'Modules'}
    <div class="bg-white shadow rounded-xl p-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {#each modules as mod, i}
          <div class="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3">
            <span class="text-sm font-medium text-gray-700">{mod.name}</span>
            <button
              aria-label={mod.name}
              onclick={() => { modules[i] = { ...mod, enabled: !mod.enabled }; }}
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {mod.enabled ? 'bg-green-500' : 'bg-gray-300'}"
              role="switch"
              aria-checked={mod.enabled}
            >
              <span class="inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform {mod.enabled ? 'translate-x-6' : 'translate-x-1'}"></span>
            </button>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Subscription Tab -->
  {#if activeTab === 'Subscription'}
    <div class="bg-white shadow rounded-xl p-6 space-y-4">
      <div class="space-y-3">
        {#each plans as plan, i}
          <div class="flex items-center gap-4 border border-gray-200 rounded-lg px-4 py-3">
            <input
              bind:value={plans[i].name}
              type="text"
              placeholder="Plan Name"
              class="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              bind:value={plans[i].price}
              type="number"
              placeholder="Price"
              class="w-28 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onclick={() => deletePlan(i)}
              class="text-red-500 hover:text-red-700 text-sm font-medium"
            >
              Delete
            </button>
          </div>
        {/each}
      </div>

      <!-- Add New Plan -->
      <div class="flex items-center gap-4 border border-dashed border-gray-300 rounded-lg px-4 py-3">
        <input
          bind:value={newPlanName}
          type="text"
          placeholder="New Plan Name"
          class="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          bind:value={newPlanPrice}
          type="number"
          placeholder="Price"
          class="w-28 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onclick={addPlan}
          class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-1.5 rounded"
        >
          Add
        </button>
      </div>
    </div>

    <!-- Danger Zone -->
    <div class="bg-white shadow rounded-xl p-6 border border-red-200 space-y-4">
      <h2 class="text-lg font-bold text-red-600">Danger Zone</h2>
      <p class="text-sm text-gray-600">Clear all data from the database. This action is irreversible.</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1" for="dangerEmail">Email</label>
          <input
            id="dangerEmail"
            bind:value={dangerEmail}
            type="email"
            class="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1" for="dangerPassword">Password</label>
          <input
            id="dangerPassword"
            bind:value={dangerPassword}
            type="password"
            class="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
        <div class="sm:col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1" for="dangerConfirm">
            Type <span class="font-mono font-bold">DELETE EVERYTHING</span> to confirm
          </label>
          <input
            id="dangerConfirm"
            bind:value={dangerConfirm}
            type="text"
            class="w-full border border-red-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
      </div>
      <button
        onclick={clearDatabase}
        disabled={dangerLoading}
        class="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium px-5 py-2 rounded-lg text-sm"
      >
        {dangerLoading ? 'Clearing...' : 'Clear Database'}
      </button>
    </div>
  {/if}

  <!-- Save Button -->
  {#if activeTab !== 'Subscription'}
    <div class="flex justify-end">
      <button
        onclick={handleSave}
        class="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-2 rounded-lg text-sm"
      >
        Save
      </button>
    </div>
  {:else}
    <div class="flex justify-end">
      <button
        onclick={handleSave}
        class="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-2 rounded-lg text-sm"
      >
        Save Plans
      </button>
    </div>
  {/if}
</div>
