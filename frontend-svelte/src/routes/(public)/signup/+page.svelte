<script lang="ts">
  import { goto } from '$app/navigation';
  import { CheckCircle, Copy, AlertCircle } from 'lucide-svelte';

  type Plan = 'Basic' | 'Standard' | 'Premium';
  type Step = 'details' | 'plan' | 'success';

  type SuccessData = {
    adminEmail?: string;
    adminPassword?: string;
    modules?: string[];
    subscriptionPlan?: Plan;
  };

  let step = $state<Step>('details');
  let loading = $state(false);
  let error = $state('');
  let successMessage = $state('');
  let successData = $state<SuccessData | null>(null);
  let copiedPassword = $state(false);

  let formData = $state({
    schoolName: '',
    schoolEmail: '',
    schoolPhone: '',
    schoolAddress: '',
    schoolWebsite: '',
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    schoolType: 'Public',
    maxStudents: '500',
    subscriptionPlan: 'Basic' as Plan,
  });

  const PLANS: { id: Plan; label: string; price: string; features: string[] }[] = [
    {
      id: 'Basic',
      label: 'Basic',
      price: '₹9,999/yr',
      features: ['Up to 500 students', 'Core modules', 'Email support'],
    },
    {
      id: 'Standard',
      label: 'Standard',
      price: '₹19,999/yr',
      features: ['Up to 2000 students', 'All modules', 'Priority support'],
    },
    {
      id: 'Premium',
      label: 'Premium',
      price: '₹39,999/yr',
      features: ['Unlimited students', 'All modules + AI', 'Dedicated support'],
    },
  ];

  const stepNum = $derived(step === 'details' ? 1 : step === 'plan' ? 2 : 3);

  function validateDetails(): boolean {
    if (!formData.schoolName || !formData.schoolEmail || !formData.schoolPhone || !formData.adminName || !formData.adminEmail) {
      error = 'Please fill in all required fields';
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.schoolEmail) || !emailRegex.test(formData.adminEmail)) {
      error = 'Please enter valid email addresses';
      return false;
    }
    return true;
  }

  function handleNextStep() {
    if (validateDetails()) {
      error = '';
      step = 'plan';
    }
  }

  async function handleSubmit() {
    loading = true;
    error = '';
    try {
      const res = await fetch('/api/schools/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || data?.message || 'Registration failed');
      successData = data.data;
      successMessage = `School registered successfully! Admin credentials have been sent to ${formData.adminEmail}`;
      step = 'success';
      setTimeout(() => goto('/'), 7000);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Registration failed. Please try again.';
    } finally {
      loading = false;
    }
  }

  function copyText(text: string | undefined, setCopied?: () => void) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied?.();
  }

  function handleCopyPassword() {
    copyText(successData?.adminPassword);
    copiedPassword = true;
    setTimeout(() => (copiedPassword = false), 2000);
  }
</script>

<svelte:head><title>School Registration — ERP Portal</title></svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
  <div class="w-full max-w-2xl">
    <!-- Header -->
    <div class="text-center mb-8">
      <h1 class="text-4xl font-bold text-slate-900 mb-2">Join ERP Portal</h1>
      <p class="text-lg text-slate-600">Streamline your school management with our comprehensive platform</p>
    </div>

    <div class="bg-white rounded-2xl shadow-xl overflow-hidden">
      <!-- Card header -->
      <div class="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-5">
        <h2 class="text-lg font-semibold">School Registration</h2>
        <p class="text-blue-100 text-sm mt-0.5">Step {stepNum} of 3</p>
      </div>

      <div class="p-8">
        {#if error}
          <div class="mb-6 flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            <AlertCircle class="h-4 w-4 mt-0.5 shrink-0" />
            {error}
          </div>
        {/if}

        {#if successMessage && step === 'success'}
          <div class="mb-6 flex items-start gap-3 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
            <CheckCircle class="h-4 w-4 mt-0.5 shrink-0 text-green-600" />
            {successMessage}
          </div>
        {/if}

        <!-- STEP 1: Details -->
        {#if step === 'details'}
          <div class="space-y-4">
            <div>
              <label for="reg-school-name" class="block text-sm font-medium text-slate-700 mb-1">School Name *</label>
              <input id="reg-school-name" bind:value={formData.schoolName} placeholder="Enter school name" disabled={loading}
                class="w-full h-9 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="reg-school-email" class="block text-sm font-medium text-slate-700 mb-1">School Email *</label>
                <input id="reg-school-email" bind:value={formData.schoolEmail} type="email" placeholder="school@example.com" disabled={loading}
                  class="w-full h-9 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label for="reg-school-phone" class="block text-sm font-medium text-slate-700 mb-1">School Phone *</label>
                <input id="reg-school-phone" bind:value={formData.schoolPhone} placeholder="Phone number" disabled={loading}
                  class="w-full h-9 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div>
              <label for="reg-school-address" class="block text-sm font-medium text-slate-700 mb-1">School Address</label>
              <input id="reg-school-address" bind:value={formData.schoolAddress} placeholder="School address" disabled={loading}
                class="w-full h-9 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label for="reg-school-website" class="block text-sm font-medium text-slate-700 mb-1">Website</label>
              <input id="reg-school-website" bind:value={formData.schoolWebsite} placeholder="https://school.com" disabled={loading}
                class="w-full h-9 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <hr class="my-6" />

            <h3 class="font-semibold text-slate-900">School Administrator</h3>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="reg-admin-name" class="block text-sm font-medium text-slate-700 mb-1">Admin Name *</label>
                <input id="reg-admin-name" bind:value={formData.adminName} placeholder="Full name" disabled={loading}
                  class="w-full h-9 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label for="reg-admin-email" class="block text-sm font-medium text-slate-700 mb-1">Admin Email *</label>
                <input id="reg-admin-email" bind:value={formData.adminEmail} type="email" placeholder="admin@school.com" disabled={loading}
                  class="w-full h-9 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div>
              <label for="reg-admin-phone" class="block text-sm font-medium text-slate-700 mb-1">Admin Phone</label>
              <input id="reg-admin-phone" bind:value={formData.adminPhone} placeholder="Phone number" disabled={loading}
                class="w-full h-9 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <button onclick={handleNextStep} disabled={loading}
              class="w-full mt-6 h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors">
              Next: Choose Plan
            </button>
          </div>
        {/if}

        <!-- STEP 2: Plan -->
        {#if step === 'plan'}
          <div class="space-y-4">
            <div>
              <h3 class="text-lg font-semibold text-slate-900 mb-1">Select Your Plan</h3>
              <p class="text-sm text-slate-600">Choose the best plan for your school</p>
            </div>

            <div class="grid grid-cols-3 gap-3 mt-4">
              {#each PLANS as plan}
                <button
                  onclick={() => (formData.subscriptionPlan = plan.id)}
                  class="rounded-xl border-2 p-4 text-left transition-all {formData.subscriptionPlan === plan.id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'}"
                >
                  <p class="font-bold text-slate-900">{plan.label}</p>
                  <p class="text-blue-600 font-semibold text-sm mt-1">{plan.price}</p>
                  <ul class="mt-3 space-y-1">
                    {#each plan.features as f}
                      <li class="text-xs text-slate-600 flex items-start gap-1.5">
                        <span class="text-green-500 mt-0.5">✓</span>{f}
                      </li>
                    {/each}
                  </ul>
                </button>
              {/each}
            </div>

            <div class="bg-blue-50 p-4 rounded-lg">
              <p class="text-sm text-slate-700"><strong>Selected Plan:</strong> {formData.subscriptionPlan}</p>
            </div>

            <div class="flex gap-4 mt-6">
              <button onclick={() => (step = 'details')} disabled={loading}
                class="flex-1 h-10 rounded-lg border border-gray-300 text-sm font-semibold text-slate-700 hover:bg-gray-50 disabled:opacity-60 transition-colors">
                Back
              </button>
              <button onclick={handleSubmit} disabled={loading}
                class="flex-1 h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors">
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>
          </div>
        {/if}

        <!-- STEP 3: Success -->
        {#if step === 'success'}
          <div class="space-y-6">
            <div class="text-center">
              <div class="flex justify-center mb-4">
                <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle class="w-8 h-8 text-green-600" />
                </div>
              </div>
              <h2 class="text-2xl font-bold text-slate-900">Registration Successful!</h2>
            </div>

            {#if successData}
              <div class="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 space-y-4">
                <div class="flex items-center justify-between">
                  <h3 class="font-bold text-slate-900">Admin Login Credentials</h3>
                  <span class="text-xs bg-blue-600 text-white px-3 py-1 rounded">Save These</span>
                </div>

                <div class="space-y-3">
                  <div>
                    <label for="cred-email" class="text-xs font-semibold text-slate-600">Email Address</label>
                    <div class="flex gap-2 mt-1">
                      <input id="cred-email" type="text" readonly value={successData.adminEmail ?? ''}
                        class="flex-1 px-3 py-2 bg-white border border-slate-300 rounded text-sm" />
                      <button onclick={() => copyText(successData?.adminEmail)}
                        class="px-2 py-1.5 border border-gray-300 rounded text-slate-600 hover:bg-gray-50">
                        <Copy class="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label for="cred-password" class="text-xs font-semibold text-slate-600">Generated Password</label>
                    <div class="flex gap-2 mt-1">
                      <input id="cred-password" type="text" readonly value={successData.adminPassword ?? ''}
                        class="flex-1 px-3 py-2 bg-white border border-red-300 rounded text-sm font-mono" />
                      <button onclick={handleCopyPassword}
                        class="px-2 py-1.5 border border-gray-300 rounded text-slate-600 hover:bg-gray-50">
                        {#if copiedPassword}✓{:else}<Copy class="w-4 h-4" />{/if}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label for="cred-url" class="text-xs font-semibold text-slate-600">Login URL</label>
                    <div class="flex gap-2 mt-1">
                      <input id="cred-url" type="text" readonly value="/school-login"
                        class="flex-1 px-3 py-2 bg-white border border-slate-300 rounded text-sm" />
                      <button onclick={() => copyText((typeof window !== 'undefined' ? window.location.origin : '') + '/school-login')}
                        class="px-2 py-1.5 border border-gray-300 rounded text-slate-600 hover:bg-gray-50">
                        <Copy class="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div class="bg-yellow-50 border border-yellow-200 rounded p-3 text-xs text-yellow-800">
                  ⚠️ <strong>Important:</strong> Save these credentials. This password will also be sent to your email.
                </div>
              </div>
            {/if}

            {#if successData?.modules && successData.modules.length > 0}
              <div class="bg-green-50 border-2 border-green-200 rounded-lg p-6">
                <h3 class="font-bold text-slate-900 mb-4">Modules Included in Your {successData.subscriptionPlan} Plan</h3>
                <div class="grid grid-cols-2 gap-3">
                  {#each successData.modules as mod}
                    <div class="flex items-center gap-2">
                      <div class="w-2 h-2 bg-green-600 rounded-full"></div>
                      <span class="text-sm text-slate-700">{mod}</span>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}

            <div class="bg-blue-50 p-4 rounded-lg">
              <p class="text-sm text-slate-700"><strong>Next Steps:</strong></p>
              <ol class="text-sm text-slate-600 mt-2 space-y-1 ml-4 list-decimal">
                <li>Use the credentials above to login to your admin dashboard</li>
                <li>Change your password after first login</li>
                <li>Start adding students, staff, and managing your school</li>
              </ol>
            </div>

            <p class="text-sm text-slate-500 text-center">Redirecting to home page in 7 seconds...</p>
          </div>
        {/if}
      </div>
    </div>

    <div class="text-center mt-8">
      <p class="text-slate-600">
        Already have an account?
        <a href="/school-login" class="text-blue-600 hover:underline font-semibold ml-1">Sign In</a>
      </p>
    </div>
  </div>
</div>
