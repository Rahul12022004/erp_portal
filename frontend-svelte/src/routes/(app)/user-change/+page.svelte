<script lang="ts">
  // User Change page — simplified version for super admin role switching.
  // Each card links directly to the respective login page.
</script>

<svelte:head><title>Switch Role — ERP Portal</title></svelte:head>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-bold text-gray-900">Switch Role</h1>
    <p class="text-sm text-gray-500 mt-1">Choose a role to log in as.</p>
  </div>

  <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-xl">
    <!-- School Admin Card -->
    <a
      href="/school-login"
      class="group block bg-white shadow rounded-xl p-6 border border-gray-200 hover:border-blue-400 hover:shadow-md transition cursor-pointer"
    >
      <div class="flex flex-col items-center gap-3 text-center">
        <div class="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 6h18M3 14h18M3 18h18" />
          </svg>
        </div>
        <div>
          <p class="font-semibold text-gray-900">School Admin</p>
          <p class="text-xs text-gray-500 mt-1">Login as a school administrator</p>
        </div>
      </div>
    </a>

    <!-- Teacher Card -->
    <a
      href="/login"
      class="group block bg-white shadow rounded-xl p-6 border border-gray-200 hover:border-green-400 hover:shadow-md transition cursor-pointer"
    >
      <div class="flex flex-col items-center gap-3 text-center">
        <div class="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l6.16-3.422A12.083 12.083 0 0 1 21 19.5H3a12.083 12.083 0 0 1 2.84-8.922L12 14z" />
          </svg>
        </div>
        <div>
          <p class="font-semibold text-gray-900">Teacher</p>
          <p class="text-xs text-gray-500 mt-1">Login as a teacher / staff member</p>
        </div>
      </div>
    </a>
  </div>
</div>
