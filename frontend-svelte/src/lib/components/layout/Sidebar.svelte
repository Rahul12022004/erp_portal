<script lang="ts">
  import { page } from '$app/stores';
  import { _ } from 'svelte-i18n';
  import type { User } from '$lib/types';
  import {
    LayoutDashboard, School, Users, CreditCard, FileText, Settings,
    DollarSign, Calendar, UserCheck, BookOpen, GraduationCap, Clock,
    Bus, BookMarked, Home, Package, Trophy, MessageSquare, Wallet,
    LogOut, Building2, ClipboardList, Wrench, UserSquare
  } from 'lucide-svelte';

  let { user }: { user: User } = $props();

  type NavItem = {
    id: string;
    labelKey: string;
    href: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    icon: any;
    roles: string[];
  };

  const NAV_ITEMS: NavItem[] = [
    // Super admin
    { id: 'dashboard', labelKey: 'common.nav.dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['super-admin'] },
    { id: 'schools', labelKey: 'common.nav.schools', href: '/dashboard/schools', icon: School, roles: ['super-admin'] },
    { id: 'school-admins', labelKey: 'common.nav.schoolAdmins', href: '/dashboard/school-admins', icon: UserSquare, roles: ['super-admin'] },
    { id: 'subscriptions', labelKey: 'common.nav.subscriptions', href: '/dashboard/subscriptions', icon: CreditCard, roles: ['super-admin'] },
    { id: 'logs', labelKey: 'common.nav.logs', href: '/dashboard/logs', icon: FileText, roles: ['super-admin'] },
    { id: 'settings', labelKey: 'common.nav.settings', href: '/dashboard/settings', icon: Settings, roles: ['super-admin'] },
    // School admin
    { id: 'school-home', labelKey: 'common.nav.dashboard', href: '/school', icon: LayoutDashboard, roles: ['school-admin'] },
    { id: 'finance', labelKey: 'common.nav.finance', href: '/school/finance', icon: DollarSign, roles: ['school-admin'] },
    { id: 'attendance', labelKey: 'common.nav.attendance', href: '/school/attendance', icon: Calendar, roles: ['school-admin'] },
    { id: 'hr', labelKey: 'common.nav.hr', href: '/school/hr', icon: UserCheck, roles: ['school-admin'] },
    { id: 'exams', labelKey: 'common.nav.exams', href: '/school/exams', icon: BookOpen, roles: ['school-admin'] },
    { id: 'academics', labelKey: 'common.nav.academics', href: '/school/academics', icon: GraduationCap, roles: ['school-admin'] },
    { id: 'admissions', labelKey: 'common.nav.admissions', href: '/school/admissions', icon: ClipboardList, roles: ['school-admin'] },
    { id: 'students', labelKey: 'common.nav.students', href: '/school/students', icon: Users, roles: ['school-admin'] },
    { id: 'staff', labelKey: 'common.nav.staff', href: '/school/staff', icon: Users, roles: ['school-admin'] },
    { id: 'timetable', labelKey: 'common.nav.timetable', href: '/school/timetable', icon: Clock, roles: ['school-admin'] },
    { id: 'transport', labelKey: 'common.nav.transport', href: '/school/transport', icon: Bus, roles: ['school-admin'] },
    { id: 'library', labelKey: 'common.nav.library', href: '/school/library', icon: BookMarked, roles: ['school-admin'] },
    { id: 'hostel', labelKey: 'common.nav.hostel', href: '/school/hostel', icon: Home, roles: ['school-admin'] },
    { id: 'inventory', labelKey: 'common.nav.inventory', href: '/school/inventory', icon: Package, roles: ['school-admin'] },
    { id: 'sports', labelKey: 'common.nav.sports', href: '/school/sports', icon: Trophy, roles: ['school-admin'] },
    { id: 'communication', labelKey: 'common.nav.communication', href: '/school/communication', icon: MessageSquare, roles: ['school-admin'] },
    { id: 'salary', labelKey: 'common.nav.salary', href: '/school/salary', icon: Wallet, roles: ['school-admin'] },
    { id: 'maintenance', labelKey: 'common.nav.maintenance', href: '/school/maintenance', icon: Wrench, roles: ['school-admin'] },
    { id: 'visitor', labelKey: 'common.nav.visitor', href: '/school/visitor', icon: Building2, roles: ['school-admin'] },
    // Teacher
    { id: 'teacher-home', labelKey: 'common.nav.dashboard', href: '/teacher', icon: LayoutDashboard, roles: ['teacher'] },
    { id: 'teacher-attendance', labelKey: 'common.nav.attendance', href: '/teacher/attendance', icon: Calendar, roles: ['teacher'] },
    { id: 'teacher-exams', labelKey: 'common.nav.exams', href: '/teacher/exams', icon: BookOpen, roles: ['teacher'] },
    { id: 'teacher-academics', labelKey: 'common.nav.academics', href: '/teacher/academics', icon: GraduationCap, roles: ['teacher'] },
    { id: 'teacher-students', labelKey: 'common.nav.students', href: '/teacher/students', icon: Users, roles: ['teacher'] },
    { id: 'teacher-timetable', labelKey: 'common.nav.timetable', href: '/teacher/timetable', icon: Clock, roles: ['teacher'] },
    { id: 'teacher-communication', labelKey: 'common.nav.communication', href: '/teacher/communication', icon: MessageSquare, roles: ['teacher'] },
  ];

  const filteredItems = $derived(NAV_ITEMS.filter((item) => item.roles.includes(user.role)));
  const currentPath = $derived($page.url.pathname);

  function isActive(href: string): boolean {
    if (href === '/school' || href === '/teacher' || href === '/dashboard') {
      return currentPath === href;
    }
    return currentPath === href || currentPath.startsWith(href + '/');
  }
</script>

<aside class="flex flex-col w-60 min-h-screen bg-slate-900 text-white flex-shrink-0">
  <!-- Logo -->
  <div class="flex items-center gap-3 px-4 py-5 border-b border-slate-700">
    <div class="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-sm">
      E
    </div>
    <span class="font-semibold text-lg tracking-tight">ERP Portal</span>
  </div>

  <!-- Nav items -->
  <nav class="flex-1 px-2 py-4 overflow-y-auto">
    {#each filteredItems as item (item.id)}
      <a
        href={item.href}
        class={[
          'flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 text-sm transition-colors',
          isActive(item.href)
            ? 'bg-blue-600 text-white'
            : 'text-slate-300 hover:bg-slate-700 hover:text-white',
        ].join(' ')}
      >
        <svelte:component this={item.icon} class="w-4 h-4 flex-shrink-0" />
        <span class="truncate">{$_(item.labelKey)}</span>
      </a>
    {/each}
  </nav>

  <!-- User info + logout -->
  <div class="px-4 py-4 border-t border-slate-700">
    <div class="flex items-center gap-3 mb-3">
      <div
        class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-semibold flex-shrink-0"
      >
        {user.name.charAt(0).toUpperCase()}
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-white truncate">{user.name}</p>
        <p class="text-xs text-slate-400 truncate capitalize">{user.role.replace('-', ' ')}</p>
      </div>
    </div>
    <form method="POST" action="/logout">
      <button
        type="submit"
        class="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
      >
        <LogOut class="w-4 h-4" />
        {$_('common.nav.logout')}
      </button>
    </form>
  </div>
</aside>
