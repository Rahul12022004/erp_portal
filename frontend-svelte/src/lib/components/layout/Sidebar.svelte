<script lang="ts">
  import { page } from '$app/stores';
  import {
    LayoutDashboard, School, UserCog, Users, CreditCard, Settings,
    ScrollText, Shield, GraduationCap, Menu, X,
    MessageSquare, BookOpen, ClipboardCheck, Monitor, FileText,
    DollarSign, UserPlus, Briefcase, Download, Building,
    Library, HeadphonesIcon, Bus, Package,
    CheckSquare, Wrench, Trophy, BarChart3, Share2, UserCheck,
    Database, Clock, PenTool,
  } from 'lucide-svelte';
  import type { User } from '$lib/types';

  let { user }: { user: User | undefined } = $props();

  let mobileOpen = $state(false);
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
    { title: 'Security', path: '/security', icon: Shield },
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
  };

  const schoolMenuGroups = [
    { label: 'Overview', items: ['Dashboard'] },
    { label: 'Academics', items: ['Communication', 'Academics', 'Attendance', 'Classes', 'Students', 'Staff', 'Exams', 'Time Table'] },
    { label: 'Administration', items: ['Finance', 'Admissions', 'Visitor', 'HR', 'Transport', 'Hostel', 'Library', 'Inventory', 'Social Media', 'Data Import'] },
    { label: 'Services', items: ['Sports', 'House'] },
    { label: 'Management', items: ['Approvals', 'Maintenance', 'Survey', 'Downloads', 'Support', 'Logs', 'Settings'] },
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
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="fixed inset-0 bg-foreground/50 z-40 lg:hidden" onclick={() => (mobileOpen = false)}></div>
  <aside class="fixed inset-y-0 left-0 w-64 z-50 lg:hidden flex flex-col">
    {@render sidebarContent()}
  </aside>
{/if}

{#snippet sidebarContent()}
  <div class="flex flex-col h-full" style="background: hsl(var(--sidebar-bg))">
    <!-- Header -->
    <div class="flex items-center gap-3 px-6 py-5 border-b" style="border-color: hsl(var(--sidebar-border))">
      <div class="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
        <GraduationCap class="w-5 h-5 text-primary-foreground" />
      </div>
      <div>
        <h1 class="text-sm font-display font-bold" style="color: hsl(var(--sidebar-fg-active))">
          {#if role === 'super-admin'}EduAdmin
          {:else if role === 'school-admin'}School Portal
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
            <a
              href={item.path}
              onclick={() => (mobileOpen = false)}
              class="sidebar-link {isActive(item.path) ? 'active' : ''}"
            >
              <svelte:component this={item.icon} class="w-[18px] h-[18px]" />
              <span>{item.title}</span>
            </a>
          {/each}
        </div>

      {:else if role === 'school-admin'}
        <div class="space-y-4">
          {#each schoolMenuGroups as group}
            <div>
              <p class="px-4 text-xs font-semibold uppercase tracking-wider mb-2" style="color: hsl(var(--sidebar-fg) / 0.5)">
                {group.label}
              </p>
              <div class="space-y-0.5">
                {#each group.items as item}
                  <a
                    href={getSchoolItemPath(item)}
                    onclick={() => (mobileOpen = false)}
                    class="sidebar-link {isSchoolItemActive(item) ? 'active' : ''}"
                  >
                    <svelte:component this={schoolIconMap[item] ?? LayoutDashboard} class="w-[18px] h-[18px]" />
                    <span class="text-[13px]">{item}</span>
                  </a>
                {/each}
              </div>
            </div>
          {/each}
        </div>

      {:else}
        <p class="px-4 text-xs font-semibold uppercase tracking-wider mb-3" style="color: hsl(var(--sidebar-fg) / 0.5)">
          My Modules
        </p>
        <div class="space-y-0.5">
          {#each teacherItems as item}
            <a
              href={item.path}
              onclick={() => (mobileOpen = false)}
              class="sidebar-link {isActive(item.path) ? 'active' : ''}"
            >
              <svelte:component this={item.icon} class="w-[18px] h-[18px]" />
              <span>{item.title}</span>
            </a>
          {/each}
        </div>
      {/if}
    </nav>
  </div>
{/snippet}
