<script lang="ts">
  import { onMount } from 'svelte';

  const PLAN_PRICE: Record<string, number> = {
    Basic: 0,
    Standard: 999,
    Premium: 1999,
  };

  interface School {
    _id: string;
    schoolInfo: { name: string; logo: string; email: string };
    systemInfo: { subscriptionPlan: string; subscriptionEndDate: string };
  }

  let schools = $state<School[]>([]);
  let loading = $state(true);
  let selectedSchool = $state<School | null>(null);
  let selectedPlan = $state('Basic');
  let actionType = $state<'upgrade' | 'renew'>('upgrade');
  let showModal = $state(false);

  onMount(async () => {
    await fetchSchools();
  });

  async function fetchSchools() {
    loading = true;
    try {
      const res = await fetch('/api/schools');
      schools = await res.json();
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  }

  const totalRevenue = $derived(
    schools.reduce((sum, s) => sum + (PLAN_PRICE[s.systemInfo?.subscriptionPlan] ?? 0), 0)
  );

  const activeCount = $derived(
    schools.filter(s => s.systemInfo?.subscriptionEndDate).length
  );

  const expiringSoon = $derived(
    schools.filter(s => {
      if (!s.systemInfo?.subscriptionEndDate) return false;
      const daysLeft = (new Date(s.systemInfo.subscriptionEndDate).getTime() - Date.now()) / 86400000;
      return daysLeft <= 3 && daysLeft >= 0;
    }).length
  );

  function openModal(school: School, type: 'upgrade' | 'renew') {
    selectedSchool = school;
    selectedPlan = school.systemInfo?.subscriptionPlan ?? 'Basic';
    actionType = type;
    showModal = true;
  }

  function closeModal() {
    showModal = false;
    selectedSchool = null;
  }

  async function handleConfirm() {
    if (!selectedSchool) return;
    const url =
      actionType === 'upgrade'
        ? `/api/schools/upgrade/${selectedSchool._id}`
        : `/api/schools/renew/${selectedSchool._id}`;
    try {
      await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan }),
      });
      closeModal();
      await fetchSchools();
    } catch (e) {
      console.error(e);
    }
  }
</script>

<svelte:head><title>Subscriptions — ERP Portal</title></svelte:head>

<div class="space-y-6">
  <h1 class="text-2xl font-bold text-gray-900">Subscriptions</h1>

  <!-- Stat Cards -->
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <div class="bg-white shadow rounded-xl p-5">
      <p class="text-sm text-gray-500">Total Revenue</p>
      <p class="text-2xl font-bold text-green-600">₹{totalRevenue.toLocaleString()}</p>
    </div>
    <div class="bg-white shadow rounded-xl p-5">
      <p class="text-sm text-gray-500">Active Plans</p>
      <p class="text-2xl font-bold text-gray-900">{activeCount}</p>
    </div>
    <div class="bg-white shadow rounded-xl p-5">
      <p class="text-sm text-gray-500">Expiring Soon</p>
      <p class="text-2xl font-bold text-yellow-500">{expiringSoon}</p>
    </div>
  </div>

  <!-- Table -->
  {#if loading}
    <p class="text-gray-500">Loading...</p>
  {:else}
    <div class="bg-white shadow rounded-xl overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#each schools as school}
            <tr class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center gap-3">
                  {#if school.schoolInfo?.logo}
                    <img src={school.schoolInfo.logo} alt="logo" class="w-8 h-8 rounded-full object-cover" />
                  {:else}
                    <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                      {school.schoolInfo?.name?.charAt(0) ?? '?'}
                    </div>
                  {/if}
                  <div>
                    <p class="font-medium text-gray-900 text-sm">{school.schoolInfo?.name}</p>
                    <p class="text-xs text-gray-500">{school.schoolInfo?.email}</p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{school.systemInfo?.subscriptionPlan}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                ₹{PLAN_PRICE[school.systemInfo?.subscriptionPlan] ?? 0}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                {school.systemInfo?.subscriptionEndDate
                  ? new Date(school.systemInfo.subscriptionEndDate).toLocaleDateString()
                  : '—'}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center gap-2">
                  <button
                    onclick={() => openModal(school, 'renew')}
                    class="text-xs font-medium px-3 py-1 rounded bg-green-50 border border-green-200 text-green-700 hover:bg-green-100"
                  >
                    Renew
                  </button>
                  <button
                    onclick={() => openModal(school, 'upgrade')}
                    class="text-xs font-medium px-3 py-1 rounded bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100"
                  >
                    Upgrade
                  </button>
                </div>
              </td>
            </tr>
          {/each}
          {#if schools.length === 0}
            <tr>
              <td colspan="5" class="px-6 py-8 text-center text-gray-400">No schools found.</td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<!-- Modal -->
{#if showModal && selectedSchool}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <button type="button" aria-label="Close" class="absolute inset-0 bg-black/50" onclick={closeModal}></button>
    <div class="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
      <h2 class="text-lg font-bold text-gray-900">
        {actionType === 'upgrade' ? 'Upgrade Plan' : 'Renew Plan'}
      </h2>
      <p class="text-sm text-gray-600">{selectedSchool.schoolInfo?.name}</p>

      {#if actionType === 'upgrade'}
        <div class="space-y-2">
          {#each Object.entries(PLAN_PRICE) as [plan, price]}
            <button type="button"
              onclick={() => { selectedPlan = plan; }}
              class="w-full cursor-pointer border rounded-lg px-4 py-3 flex justify-between items-center transition text-left {selectedPlan === plan ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}"
            >
              <span class="font-medium text-gray-800">{plan}</span>
              <span class="text-gray-600 text-sm">₹{price}/yr</span>
            </button>
          {/each}
        </div>
      {/if}

      <div class="flex gap-3 pt-2">
        <button
          onclick={closeModal}
          class="flex-1 border border-gray-300 text-gray-700 font-medium py-2 rounded-lg text-sm hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onclick={handleConfirm}
          class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm"
        >
          Confirm
        </button>
      </div>
    </div>
  </div>
{/if}
