<script lang="ts">
  type TimeTable = { id: number; day: string; teacher: string; time: string; className: string; subject: string; room: string };

  const timetableData: TimeTable[] = [
    { id: 1, day: 'Monday', teacher: 'Mr. John Smith', time: '8:00 AM', className: 'Class 10-A', subject: 'Mathematics', room: 'Room 201' },
    { id: 2, day: 'Monday', teacher: 'Mr. John Smith', time: '9:00 AM', className: 'Class 9-B', subject: 'Mathematics', room: 'Room 105' },
    { id: 3, day: 'Monday', teacher: 'Mr. John Smith', time: '11:00 AM', className: 'Class 10-A', subject: 'Advanced Math', room: 'Lab 3' },
    { id: 4, day: 'Tuesday', teacher: 'Ms. Sarah Lee', time: '10:00 AM', className: 'Class 8-A', subject: 'Science', room: 'Room 102' },
  ];

  let day = $state('');
  let teacher = $state('');
  let results = $state<TimeTable[]>([]);

  function handleSearch() {
    results = timetableData.filter(t => (!day || t.day === day) && (!teacher || t.teacher === teacher));
  }
</script>

<svelte:head><title>Timetable — ERP Portal</title></svelte:head>

<div class="space-y-6">
  <div class="stat-card p-6">
    <h3 class="text-lg font-semibold mb-4">TEACHER TIMETABLE</h3>
    <div class="grid grid-cols-3 gap-4">
      <div>
        <label class="text-sm font-medium">Select Day</label>
        <select class="border rounded p-2 w-full" bind:value={day}>
          <option value="">Select Day</option>
          <option>Monday</option>
          <option>Tuesday</option>
          <option>Wednesday</option>
          <option>Thursday</option>
          <option>Friday</option>
        </select>
      </div>
      <div>
        <label class="text-sm font-medium">Select Teacher</label>
        <select class="border rounded p-2 w-full" bind:value={teacher}>
          <option value="">Select Teacher</option>
          <option>Mr. John Smith</option>
          <option>Ms. Sarah Lee</option>
        </select>
      </div>
      <div class="flex items-end">
        <button onclick={handleSearch} class="bg-green-600 text-white px-6 py-2 rounded">SEARCH</button>
      </div>
    </div>
  </div>

  <div class="stat-card p-6">
    <h3 class="text-lg font-semibold mb-4">Schedule</h3>
    {#if results.length === 0}
      <p class="text-gray-500">No timetable available</p>
    {:else}
      <div class="space-y-3">
        {#each results as cls (cls.id)}
          <div class="bg-gray-50 border rounded-xl p-4 flex items-center gap-6">
            <div class="text-green-600 font-semibold w-24">{cls.time}</div>
            <div>
              <p class="font-semibold">{cls.className}</p>
              <p class="text-sm text-gray-500">{cls.subject} • {cls.room}</p>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
