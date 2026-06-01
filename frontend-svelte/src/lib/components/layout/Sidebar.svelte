<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import {
    LayoutDashboard, School, UserCog, Users, CreditCard, Settings,
    ScrollText, GraduationCap, Menu, X, Shield,
    MessageSquare, BookOpen, ClipboardCheck, Monitor, FileText,
    DollarSign, UserPlus, Briefcase, Download, Building,
    Library, HeadphonesIcon, Bus, Package,
    CheckSquare, Wrench, Trophy, BarChart3, Share2, UserCheck,
    Database, Clock, PenTool, Bell, ChartLine, Banknote,
  } from 'lucide-svelte';
  import type { User } from '$lib/types';
  import { schoolStore } from '$lib/stores/school';

  let { user }: { user: User | undefined } = $props();

  let mobileOpen = $state(false);
  let schoolName = $state('School');
  let schoolLogo = $state('');
  let enabledModules = $state<string[]>([]);
  let subscriptionPlan = $state('');
  let schoolDataLoaded = $state(false);

  const currentPath = $derived($page.url.pathname);
  const role = $derived(user?.role ?? 'super-admin');

  // ─── Super Admin nav ────────────────────────────────────────────────
  const superAdminItems = [
    { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { title: 'Schools', path: '/schools', icon: School },
    { title: 'School Admins', path: '/school-admins', icon: UserCog },
    { title: 'Subscriptions', path: '/subscriptions', icon: CreditCard },
    { title: 'User Change', path: '/user-change', icon: Users },
    { title: 'Settings', path: '/settings', icon: Settings },
    { title: 'Logs', path: '/logs', icon: ScrollText },
  ];

  // ─── School Admin nav ───────────────────────────────────────────────
  const schoolIconMap: Record<string, any> = {
    Dashboard: LayoutDashboard,
    Communication: MessageSquare,
    Academics: BookOpen,
    Attendance: ClipboardCheck,
    Classes: Monitor,
    Students: Users,
    Staff: UserCog,
    Exams: FileText,
    'Time Table': Clock,
    Finance: DollarSign,
    Admissions: UserPlus,
    HR: Briefcase,
    Transport: Bus,
    Hostel: Building,
    Library: Library,
    Inventory: Package,
    Sports: Trophy,
    House: Shield,
    Approvals: CheckSquare,
    Maintenance: Wrench,
    Survey: BarChart3,
    Downloads: Download,
    Support: HeadphonesIcon,
    Logs: ScrollText,
    Settings: Settings,
    'Social Media': Share2,
    Visitor: UserCheck,
    'Data Import': Database,
    Notifications: Bell,
    Payroll: Banknote,
    Reports: ScrollText,
    Analytics: ChartLine,
  };

  // Module name normalization map (same as React sidebar)
  const portalModulesByNormalized: Record<string, string[]> = {
    dashboard: ['Dashboard'],
    communication: ['Communication'],
    announcements: ['Communication'],
    academics: ['Academics'],
    attendance: ['Attendance'],
    classes: ['Classes'],
    classmanagement: ['Classes'],
    digitalclassroom: ['Classes'],
    students: ['Students'],
    studentmanagement: ['Students'],
    staff: ['Staff'],
    staffmanagement: ['Staff'],
    exams: ['Exams'],
    marksresults: ['Exams'],
    timetable: ['Time Table'],
    finance: ['Finance'],
    financefees: ['Finance'],
    admissions: ['Admissions'],
    hr: ['HR'],
    transport: ['Transport'],
    hostel: ['Hostel'],
    library: ['Library'],
    inventory: ['Inventory'],
    socialmedia: ['Social Media'],
    survey: ['Survey'],
    approvals: ['Approvals'],
    leavemanagement: ['Approvals'],
    maintenance: ['Maintenance'],
    sports: ['Sports'],
    house: ['House'],
    discipline: ['House'],
    downloads: ['Downloads'],
    support: ['Support'],
    visitor: ['Visitor'],
    dataimport: ['Data Import'],
    notifications: ['Notifications'],
    payroll: ['Payroll'],
    reports: ['Reports'],
    analytics: ['Analytics'],
  };

  function normalizeModuleName(v: string): string {
    return String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  const availablePortalModules = $derived.by(() => {
    const set = new Set<string>();
    for (const m of enabledModules) {
      const norm = normalizeModuleName(m);
      const mapped = portalModulesByNormalized[norm];
      if (mapped) {
        mapped.forEach((x) => set.add(x));
      } else {
        // fallback: match by normalized name
        for (const key of Object.keys(schoolIconMap)) {
          if (normalizeModuleName(key) === norm) set.add(key);
        }
      }
    }
    return set;
  });

  function hasModuleAccess(_item: string): boolean {
    return true;
  }

  const schoolMenuGroups = [
    { label: 'Overview', items: ['Dashboard'] },
    { label: 'Academics', items: ['Communication', 'Academics', 'Attendance', 'Classes', 'Students', 'Staff', 'Exams', 'Time Table'] },
    { label: 'Administration', items: ['Finance', 'Admissions', 'Visitor', 'HR', 'Transport', 'Hostel', 'Library', 'Inventory', 'Social Media', 'Data Import'] },
    { label: 'Services', items: ['Sports', 'House'] },
    { label: 'Management', items: ['Notifications', 'Reports', 'Approvals', 'Maintenance', 'Survey', 'Downloads', 'Support', 'Logs', 'Settings'] },
  ];

  function getSchoolItemPath(item: string): string {
    if (item === 'Dashboard') return '/school';
    if (item === 'House') return '/school/discipline';
    return `/school/${item.toLowerCase().replace(/\s/g, '-')}`;
  }

  function isSchoolItemActive(item: string): boolean {
    const path = getSchoolItemPath(item);
    if (path === '/school') return currentPath === '/school';
    if (item === 'Classes') return currentPath.startsWith('/school/classes') || currentPath.startsWith('/school/digital-classroom');
    return currentPath.startsWith(path);
  }

  // ─── Teacher nav ────────────────────────────────────────────────────
  const teacherItems = [
    { title: 'Dashboard', path: '/teacher', icon: LayoutDashboard },
    { title: 'Students', path: '/teacher/students', icon: Users },
    { title: 'Attendance', path: '/teacher/attendance', icon: ClipboardCheck },
    { title: 'Assignments', path: '/teacher/assignments', icon: PenTool },
    { title: 'Marks', path: '/teacher/marks', icon: FileText },
    { title: 'Exams', path: '/teacher/exams', icon: BookOpen },
    { title: 'Leave Application', path: '/teacher/leave', icon: FileText },
    { title: 'Digital Classroom', path: '/teacher/digital-classroom', icon: Monitor },
    { title: 'Time Table', path: '/teacher/timetable', icon: Clock },
    { title: 'Communication', path: '/teacher/communication', icon: MessageSquare },
  ];

  function isActive(path: string): boolean {
    if (path === '/dashboard' || path === '/school' || path === '/teacher') {
      return currentPath === path;
    }
    return currentPath.startsWith(path);
  }

  // ─── Fetch school data for module filtering ──────────────────────────
  onMount(async () => {
    if (role !== 'school-admin' || !user?.schoolId) return;
    try {
      const res = await fetch(`/api/schools/${user.schoolId}`);
      if (!res.ok) return;
      const json = await res.json();
      // Go wraps response: { success, data: <School> }
      const school = json?.data ?? json;
      schoolName = school?.schoolInfo?.name || 'School';
      schoolLogo = school?.schoolInfo?.logo || '';
      enabledModules = Array.isArray(school?.modules) ? school.modules : [];
      subscriptionPlan = school?.systemInfo?.subscriptionPlan || '';
      const adminPhoto = school?.adminInfo?.image || school?.adminInfo?.photo || '';
      // Populate shared store so TopNavbar can read admin photo + logo
      schoolStore.set({
        name: schoolName,
        logo: schoolLogo,
        adminPhoto,
        modules: enabledModules,
        subscriptionPlan,
        loaded: true,
      });
    } catch { /* silent */ } finally {
      schoolDataLoaded = true;
    }
  });
</script>

<!-- Mobile toggle -->
<button
  onclick={() => (mobileOpen = !mobileOpen)}
  class="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-card border border-border shadow-sm"
  aria-label="Toggle sidebar"
>
  {#if mobileOpen}
    <X class="w-5 h-5" />
  {:else}
    <Menu class="w-5 h-5" />
  {/if}
</button>

<!-- Desktop sidebar -->
<aside class="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:flex-col z-40">
  {@render sidebarContent()}
</aside>

<!-- Mobile sidebar -->
{#if mobileOpen}
  <button
    type="button"
    aria-label="Close sidebar"
    class="fixed inset-0 bg-foreground/50 z-40 lg:hidden cursor-default"
    onclick={() => (mobileOpen = false)}
  ></button>
  <aside class="fixed inset-y-0 left-0 w-64 z-50 lg:hidden flex flex-col">
    {@render sidebarContent()}
  </aside>
{/if}

{#snippet sidebarContent()}
  <div class="flex flex-col h-full" style="background: hsl(var(--sidebar-bg))">
    <!-- Header -->
    <div class="flex items-center gap-3 px-6 py-5 border-b" style="border-color: hsl(var(--sidebar-border))">
      {#if role === 'school-admin' && schoolLogo && (schoolLogo.startsWith('data:image') || schoolLogo.startsWith('http'))}
        <img src={schoolLogo} alt={schoolName} class="w-9 h-9 rounded-lg object-cover" />
      {:else}
        <div class="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
          <GraduationCap class="w-5 h-5 text-primary-foreground" />
        </div>
      {/if}
      <div>
        <h1 class="text-sm font-display font-bold" style="color: hsl(var(--sidebar-fg-active))">
          {#if role === 'super-admin'}Nexavise
          {:else if role === 'school-admin'}{schoolName}
          {:else}Teacher Portal
          {/if}
        </h1>
        <p class="text-xs" style="color: hsl(var(--sidebar-fg))">
          {#if role === 'super-admin'}Super Admin Panel
          {:else if role === 'school-admin'}School Admin
          {:else}{user?.name ?? 'Teacher'}
          {/if}
        </p>
      </div>
    </div>

    <!-- Nav -->
    <nav class="flex-1 px-3 py-4 overflow-y-auto">
      {#if role === 'super-admin'}
        <p class="px-4 text-xs font-semibold uppercase tracking-wider mb-3" style="color: hsl(var(--sidebar-fg) / 0.5)">
          Main Menu
        </p>
        <div class="space-y-0.5">
          {#each superAdminItems as item}
            {@const Icon = item.icon}
            <a
              href={item.path}
              onclick={() => (mobileOpen = false)}
              class="sidebar-link {isActive(item.path) ? 'active' : ''}"
            >
              <Icon class="w-[18px] h-[18px]" />
              <span>{item.title}</span>
            </a>
          {/each}
        </div>

      {:else if role === 'school-admin'}
        <div class="space-y-4">
          {#each schoolMenuGroups as group}
            {@const filteredItems = group.items.filter(hasModuleAccess)}
            {#if filteredItems.length > 0}
              <div>
                <p class="px-4 text-xs font-semibold uppercase tracking-wider mb-2" style="color: hsl(var(--sidebar-fg) / 0.5)">
                  {group.label}
                </p>
                <div class="space-y-0.5">
                  {#each filteredItems as item}
                    {@const Icon = schoolIconMap[item] ?? LayoutDashboard}
                    <a
                      href={getSchoolItemPath(item)}
                      onclick={() => (mobileOpen = false)}
                      class="sidebar-link {isSchoolItemActive(item) ? 'active' : ''}"
                    >
                      <Icon class="w-[18px] h-[18px]" />
                      <span class="text-[13px]">{item}</span>
                    </a>
                  {/each}
                </div>
              </div>
            {/if}
          {/each}
        </div>

      {:else}
        <p class="px-4 text-xs font-semibold uppercase tracking-wider mb-3" style="color: hsl(var(--sidebar-fg) / 0.5)">
          My Modules
        </p>
        <div class="space-y-0.5">
          {#each teacherItems as item}
            {@const Icon = item.icon}
            <a
              href={item.path}
              onclick={() => (mobileOpen = false)}
              class="sidebar-link {isActive(item.path) ? 'active' : ''}"
            >
              <Icon class="w-[18px] h-[18px]" />
              <span>{item.title}</span>
            </a>
          {/each}
        </div>
      {/if}
    </nav>
  </div>
{/snippet}
