<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';

  type Student = { _id: string; name: string; email: string; class: string; rollNumber: string; phone?: string; gender?: string };
  type SchoolClass = { _id: string; name: string; section?: string; stream?: string; academicYear?: string; classTeacher?: string | { _id: string; name: string } };

  const schoolId = $derived($page.data.user?.schoolId ?? '');
  const teacherId = $derived($page.data.user?.id ?? '');

  let students = $state<Student[]>([]);
  let classes = $state<SchoolClass[]>([]);
  let loading = $state(true);
  let error = $state('');
  let search = $state('');
  let selectedClass = $state('All');

  const getClassLabel = (cls: Pick<SchoolClass, 'name' | 'section'>) =>
    cls.section ? `${cls.name} - ${cls.section}` : cls.name;

  onMount(async () => {
    if (!schoolId || !teacherId) { error = 'Teacher session not found.'; loading = false; return; }
    try {
      const [sRes, cRes] = await Promise.all([fetch(`/api/students/${schoolId}`), fetch(`/api/classes?schoolId=${schoolId}`)]);
      if (!sRes.ok) throw new Error(`Failed to load students (${sRes.status})`);
      if (!cRes.ok) throw new Error(`Failed to load classes (${cRes.status})`);
      const [sData, cData] = await Promise.all([sRes.json(), cRes.json()]);
      const unwrap = (d: unknown): unknown[] => {
        const inner = (d as Record<string, unknown>)?.data;
        if (Array.isArray(inner)) return inner;
        if (Array.isArray((inner as Record<string, unknown>)?.students)) return (inner as Record<string, unknown[]>).students;
        if (Array.isArray(d)) return d;
        return [];
      };
      const allClasses = unwrap(cData) as SchoolClass[];
      classes = allClasses.filter((cls: SchoolClass) => {
        if (!cls.classTeacher) return false;
        if (typeof cls.classTeacher === 'string') return cls.classTeacher === teacherId;
        return cls.classTeacher._id === teacherId;
      });
      students = unwrap(sData) as typeof students;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to fetch class students';
    } finally { loading = false; }
  });

  const sortedClasses = $derived([...classes].sort((a, b) => a.name.localeCompare(b.name)));

  const groupedStudents = $derived.by(() =>
    sortedClasses.reduce((acc, cls) => {
      const label = getClassLabel(cls);
      acc[label] = students
        .filter(s => s.class === label)
        .sort((a, b) => a.rollNumber.localeCompare(b.rollNumber));
      return acc;
    }, {} as Record<string, Student[]>)
  );

  const filteredStudents = $derived.by(() => {
    const names = Object.keys(groupedStudents).filter(n => selectedClass === 'All' || n === selectedClass);
    return names.reduce((acc, n) => {
      const q = search.toLowerCase();
      acc[n] = groupedStudents[n].filter(s =>
        s.name.toLowerCase().includes(q) || s.rollNumber.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
      );
      return acc;
    }, {} as Record<string, Student[]>);
  });
</script>

<svelte:head><title>My Students — ERP Portal</title></svelte:head>

<div class="space-y-6">
  <div class="flex gap-4">
    <div class="flex-1">
      <input placeholder="Search students..." class="border p-2 w-full rounded" bind:value={search} />
    </div>
    <select class="border p-2 rounded" bind:value={selectedClass}>
      <option value="All">All Classes</option>
      {#each sortedClasses as cls (cls._id)}
        <option value={getClassLabel(cls)}>{getClassLabel(cls)}</option>
      {/each}
    </select>
  </div>

  {#if loading}
    <p class="text-center text-gray-500">Loading students...</p>
  {:else if error}
    <p class="text-center text-red-600">{error}</p>
  {:else if sortedClasses.length === 0}
    <p class="text-center text-gray-500">No classes are assigned to this teacher yet.</p>
  {:else if Object.keys(filteredStudents).length === 0}
    <p class="text-center text-gray-500">No students found for the selected filters.</p>
  {:else}
    <div class="space-y-6">
      {#each Object.entries(filteredStudents) as [className, classStudents] (className)}
        {@const classInfo = sortedClasses.find(c => getClassLabel(c) === className)}
        <div class="stat-card p-6">
          <div class="mb-4 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 class="text-xl font-semibold text-blue-600">{className} ({classStudents.length} students)</h3>
              <p class="text-sm text-muted-foreground">
                {classInfo?.section ? `Section ${classInfo.section}` : 'Section not set'}
                {classInfo?.stream ? ` • ${classInfo.stream}` : ''}
                {classInfo?.academicYear ? ` • ${classInfo.academicYear}` : ''}
              </p>
            </div>
          </div>
          {#if classStudents.length === 0}
            <p class="text-sm text-gray-500">No students are attached to this class yet.</p>
          {:else}
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b">
                    <th class="text-left p-2">Roll No</th>
                    <th class="text-left p-2">Name</th>
                    <th class="text-left p-2">Email</th>
                    <th class="text-left p-2">Phone</th>
                    <th class="text-left p-2">Gender</th>
                  </tr>
                </thead>
                <tbody>
                  {#each classStudents as student (student._id)}
                    <tr class="border-b hover:bg-gray-50">
                      <td class="p-2">{student.rollNumber}</td>
                      <td class="p-2 font-medium">{student.name}</td>
                      <td class="p-2">{student.email}</td>
                      <td class="p-2">{student.phone || '-'}</td>
                      <td class="p-2">{student.gender || '-'}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
