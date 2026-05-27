<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { BookOpen, Users, Monitor, ClipboardCheck, Bell, ExternalLink } from 'lucide-svelte';

  type TeacherDashboardStats = { assignedClasses: number; totalStudents: number; digitalClasses: number; attendanceToday: string; attendanceRate: number };
  type ClassItem = { id: string; name: string; section: string; stream: string; academicYear: string; meetLink: string; students: number };
  type Notification = { id: string; title: string; desc: string; time: string; author?: string };

  const schoolId = $derived($page.data.user?.schoolId ?? '');
  const teacherId = $derived($page.data.user?.id ?? '');

  let stats = $state<TeacherDashboardStats>({ assignedClasses: 0, totalStudents: 0, digitalClasses: 0, attendanceToday: 'Not Marked', attendanceRate: 0 });
  let classes = $state<ClassItem[]>([]);
  let digitalClasses = $state<ClassItem[]>([]);
  let notifications = $state<Notification[]>([]);
  let loading = $state(true);
  let error = $state('');

  onMount(async () => {
    if (!schoolId || !teacherId) { error = 'Teacher session not found. Please log in again.'; loading = false; return; }
    try {
      const res = await fetch(`/api/dashboard/teacher/${schoolId}/${teacherId}`);
      if (!res.ok) throw new Error(`Failed to load teacher dashboard (${res.status})`);
      const data = await res.json();
      stats = { assignedClasses: data.stats?.assignedClasses || 0, totalStudents: data.stats?.totalStudents || 0, digitalClasses: data.stats?.digitalClasses || 0, attendanceToday: data.stats?.attendanceToday || 'Not Marked', attendanceRate: data.stats?.attendanceRate || 0 };
      classes = Array.isArray(data.classes) ? data.classes : [];
      digitalClasses = Array.isArray(data.digitalClasses) ? data.digitalClasses : [];
      notifications = Array.isArray(data.notifications) ? data.notifications : [];
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load teacher dashboard';
    } finally { loading = false; }
  });
</script>

<svelte:head><title>Teacher Dashboard — ERP Portal</title></svelte:head>

<div class="space-y-6">
  <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
    <div class="stat-card p-5">
      <div class="flex items-center gap-3 mb-2">
        <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <BookOpen class="w-4 h-4 text-primary" />
        </div>
        <p class="text-sm text-muted-foreground">Assigned Classes</p>
      </div>
      <p class="text-2xl font-bold">{loading ? '...' : stats.assignedClasses}</p>
    </div>
    <div class="stat-card p-5">
      <div class="flex items-center gap-3 mb-2">
        <div class="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
          <Users class="w-4 h-4 text-blue-500" />
        </div>
        <p class="text-sm text-muted-foreground">My Students</p>
      </div>
      <p class="text-2xl font-bold">{loading ? '...' : stats.totalStudents}</p>
    </div>
    <div class="stat-card p-5">
      <div class="flex items-center gap-3 mb-2">
        <div class="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
          <Monitor class="w-4 h-4 text-amber-500" />
        </div>
        <p class="text-sm text-muted-foreground">Digital Classes</p>
      </div>
      <p class="text-2xl font-bold">{loading ? '...' : stats.digitalClasses}</p>
    </div>
    <div class="stat-card p-5">
      <div class="flex items-center gap-3 mb-2">
        <div class="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
          <ClipboardCheck class="w-4 h-4 text-emerald-500" />
        </div>
        <p class="text-sm text-muted-foreground">Attendance Today</p>
      </div>
      <p class="text-2xl font-bold">{loading ? '...' : stats.attendanceToday}</p>
      <p class="text-xs text-muted-foreground mt-1">{stats.attendanceRate}% overall attendance</p>
    </div>
  </div>

  {#if error}
    <div class="stat-card p-4 text-sm text-red-600">{error}</div>
  {/if}

  <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
    <div class="stat-card p-6">
      <div class="mb-4 flex items-center gap-2">
        <BookOpen class="w-4 h-4 text-primary" />
        <h3 class="font-semibold">My Classes</h3>
      </div>
      {#if loading}
        <p class="text-sm text-muted-foreground">Loading classes...</p>
      {:else if classes.length === 0}
        <p class="text-sm text-muted-foreground">No classes are assigned to this teacher yet.</p>
      {:else}
        <div class="space-y-3">
          {#each classes as cls (cls.id)}
            <div class="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="font-semibold">{cls.name}</p>
                  <p class="text-sm text-muted-foreground">
                    {cls.section ? `Section ${cls.section}` : 'Section not set'}{cls.stream ? ` • ${cls.stream}` : ''}
                  </p>
                </div>
                <span class="text-xs font-medium rounded-full bg-primary/10 px-2.5 py-1 text-primary">{cls.students} Students</span>
              </div>
              <p class="text-xs text-muted-foreground">Academic Year: {cls.academicYear || 'Not set'}</p>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <div class="stat-card p-6">
      <div class="mb-4 flex items-center gap-2">
        <Monitor class="w-4 h-4 text-primary" />
        <h3 class="font-semibold">Digital Classroom</h3>
      </div>
      {#if loading}
        <p class="text-sm text-muted-foreground">Loading digital classes...</p>
      {:else if digitalClasses.length === 0}
        <p class="text-sm text-muted-foreground">No online class links have been added yet.</p>
      {:else}
        <div class="space-y-3">
          {#each digitalClasses as cls (cls.id)}
            <div class="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
              <div>
                <p class="font-semibold">{cls.name}</p>
                <p class="text-sm text-muted-foreground">
                  {cls.section ? `Section ${cls.section}` : 'Section not set'}{cls.stream ? ` • ${cls.stream}` : ''}
                </p>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-xs text-muted-foreground">{cls.students} students</span>
                {#if cls.meetLink}
                  <a href={cls.meetLink} target="_blank" rel="noreferrer" class="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                    Join Link <ExternalLink class="w-3.5 h-3.5" />
                  </a>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <div class="stat-card p-6">
      <div class="mb-4 flex items-center gap-2">
        <Bell class="w-4 h-4 text-primary" />
        <h3 class="font-semibold">Announcements</h3>
      </div>
      {#if loading}
        <p class="text-sm text-muted-foreground">Loading announcements...</p>
      {:else if notifications.length === 0}
        <p class="text-sm text-muted-foreground">No announcements available right now.</p>
      {:else}
        <div class="space-y-3">
          {#each notifications as item (item.id)}
            <div class="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
              <p class="font-semibold">{item.title}</p>
              <p class="text-sm text-muted-foreground">{item.desc}</p>
              <p class="text-xs text-muted-foreground">{item.time}</p>
              {#if item.author}<p class="text-xs text-muted-foreground">Posted by {item.author}</p>{/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
