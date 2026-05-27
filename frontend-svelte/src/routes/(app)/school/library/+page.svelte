<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { BookCopy, BookOpen, CircleAlert, CircleCheck, Filter, Library, Search, UserPlus } from 'lucide-svelte';

  type Student = { _id: string; name: string; class: string; rollNumber: string };
  type Book = {
    _id: string; title: string; author: string; category: string; accessionNumber: string;
    isbn?: string; publisher?: string; edition?: string; quantity: number; availableCopies: number;
    rack: string; shelf: string; status: 'active' | 'out_of_stock' | 'archived';
  };
  type Assignment = {
    _id: string; assignDate: string; dueDate: string; returnDate?: string;
    issueStatus: 'issued' | 'returned' | 'overdue';
    computedIssueStatus?: 'issued' | 'returned' | 'overdue';
    isOverdue?: boolean; bookId: Book; studentId: Student;
  };

  const CATEGORY_OPTIONS = ['Textbook', 'Reference', 'Story', 'Science', 'Mathematics', 'Language', 'History', 'General Knowledge', 'Magazine', 'Other'];
  const RACK_OPTIONS = ['Rack A', 'Rack B', 'Rack C', 'Rack D', 'Rack E', 'Rack F'];
  const SHELF_OPTIONS = ['Shelf 1', 'Shelf 2', 'Shelf 3', 'Shelf 4', 'Shelf 5', 'Shelf 6'];

  function getToday() { return new Date().toISOString().split('T')[0]; }
  function addDays(d: string, n: number) { const date = new Date(d); date.setDate(date.getDate() + n); return date.toISOString().split('T')[0]; }

  const schoolId = $derived($page.data.user?.schoolId ?? '');
  let stats = $state({ totalBooks: 0, availableBooks: 0, issuedBooks: 0, overdueBooks: 0 });
  let books = $state<Book[]>([]);
  let students = $state<Student[]>([]);
  let assignments = $state<Assignment[]>([]);
  let loading = $state(true);
  let savingBook = $state(false);
  let savingAssignment = $state(false);
  let error = $state('');

  let bookForm = $state({ title: '', author: '', category: '', accessionNumber: '', isbn: '', publisher: '', edition: '', quantity: '', availableCopies: '', rack: '', shelf: '', status: 'active' as Book['status'] });
  let assignmentForm = $state({ bookId: '', studentId: '', assignDate: getToday(), dueDate: addDays(getToday(), 14), returnDate: '', issueStatus: 'issued' as Assignment['issueStatus'] });

  let bookSearch = $state('');
  let bookCategoryFilter = $state('');
  let bookRackFilter = $state('');
  let bookStatusFilter = $state('');
  let assignmentSearch = $state('');
  let assignmentStatusFilter = $state('');

  const selectedBook = $derived(books.find(b => b._id === assignmentForm.bookId) ?? null);
  const selectedStudent = $derived(students.find(s => s._id === assignmentForm.studentId) ?? null);

  const filteredBooks = $derived(books.filter(b => {
    const sm = !bookSearch.trim() || `${b.title} ${b.author} ${b.accessionNumber} ${b.isbn || ''}`.toLowerCase().includes(bookSearch.trim().toLowerCase());
    return sm && (!bookCategoryFilter || b.category === bookCategoryFilter) && (!bookRackFilter || b.rack === bookRackFilter) && (!bookStatusFilter || b.status === bookStatusFilter);
  }));

  const filteredAssignments = $derived(assignments.filter(a => {
    const status = a.computedIssueStatus || a.issueStatus;
    const sm = !assignmentSearch.trim() || `${a.bookId?.title || ''} ${a.studentId?.name || ''} ${a.studentId?.class || ''}`.toLowerCase().includes(assignmentSearch.trim().toLowerCase());
    return sm && (!assignmentStatusFilter || status === assignmentStatusFilter);
  }));

  async function fetchData() {
    if (!schoolId) { error = 'School not found.'; loading = false; return; }
    try {
      loading = true; error = '';
      const res = await fetch(`/api/library/${schoolId}`);
      if (!res.ok) throw new Error(`Failed to load library data (${res.status})`);
      const data = await res.json();
      stats = data.stats || { totalBooks: 0, availableBooks: 0, issuedBooks: 0, overdueBooks: 0 };
      books = Array.isArray(data.books) ? data.books : [];
      students = Array.isArray(data.students) ? data.students : [];
      assignments = Array.isArray(data.assignments) ? data.assignments : [];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load library data';
    } finally { loading = false; }
  }

  onMount(() => { fetchData(); });

  async function handleBookSubmit(e: SubmitEvent) {
    e.preventDefault();
    const qty = Number(bookForm.quantity || 0);
    const available = Number(bookForm.availableCopies || 0);
    if (!Number.isFinite(qty) || qty < 1) { error = 'Quantity must be at least 1.'; return; }
    if (!Number.isFinite(available) || available < 0 || available > qty) { error = 'Available copies must be between 0 and quantity.'; return; }
    try {
      savingBook = true; error = '';
      const res = await fetch('/api/library/books', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...bookForm, quantity: qty, availableCopies: available, schoolId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to add book');
      bookForm = { title: '', author: '', category: '', accessionNumber: '', isbn: '', publisher: '', edition: '', quantity: '', availableCopies: '', rack: '', shelf: '', status: 'active' };
      await fetchData();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to add book';
    } finally { savingBook = false; }
  }

  async function handleAssignmentSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!assignmentForm.bookId || !assignmentForm.studentId) { error = 'Please select book and student.'; return; }
    if (assignmentForm.issueStatus !== 'returned' && (selectedBook?.availableCopies || 0) < 1) { error = 'Selected book has no available copies.'; return; }
    try {
      savingAssignment = true; error = '';
      const res = await fetch('/api/library/assign', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...assignmentForm, schoolId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || 'Failed to assign book');
      const today = getToday();
      assignmentForm = { bookId: '', studentId: '', assignDate: today, dueDate: addDays(today, 14), returnDate: '', issueStatus: 'issued' };
      await fetchData();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to assign book';
    } finally { savingAssignment = false; }
  }
</script>

<svelte:head><title>Library — ERP Portal</title></svelte:head>

<div class="space-y-6">
  {#if error}
    <div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
  {/if}

  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="flex items-center justify-between"><p class="text-sm font-medium text-slate-500">Total Books</p><BookOpen class="h-5 w-5 text-teal-600" /></div>
      <p class="mt-2 text-3xl font-semibold text-slate-900">{stats.totalBooks}</p>
    </div>
    <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="flex items-center justify-between"><p class="text-sm font-medium text-slate-500">Available Books</p><CircleCheck class="h-5 w-5 text-emerald-600" /></div>
      <p class="mt-2 text-3xl font-semibold text-slate-900">{stats.availableBooks}</p>
    </div>
    <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="flex items-center justify-between"><p class="text-sm font-medium text-slate-500">Issued Books</p><BookCopy class="h-5 w-5 text-blue-600" /></div>
      <p class="mt-2 text-3xl font-semibold text-slate-900">{stats.issuedBooks}</p>
    </div>
    <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="flex items-center justify-between"><p class="text-sm font-medium text-slate-500">Overdue Books</p><CircleAlert class="h-5 w-5 text-amber-600" /></div>
      <p class="mt-2 text-3xl font-semibold text-slate-900">{stats.overdueBooks}</p>
    </div>
  </div>

  <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="mb-4 flex items-center gap-2">
        <Library class="h-5 w-5 text-teal-600" />
        <h3 class="text-lg font-semibold text-slate-900">Add Book</h3>
      </div>
      <form onsubmit={handleBookSubmit} class="space-y-4">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <input type="text" placeholder="Book Title" class="rounded-xl border border-slate-300 px-3 py-2 text-sm" bind:value={bookForm.title} required />
          <input type="text" placeholder="Author" class="rounded-xl border border-slate-300 px-3 py-2 text-sm" bind:value={bookForm.author} required />
          <select class="rounded-xl border border-slate-300 px-3 py-2 text-sm" bind:value={bookForm.category} required>
            <option value="">Select Category</option>
            {#each CATEGORY_OPTIONS as c}<option value={c}>{c}</option>{/each}
          </select>
          <input type="text" placeholder="Book Code / Accession Number" class="rounded-xl border border-slate-300 px-3 py-2 text-sm" bind:value={bookForm.accessionNumber} required />
          <input type="text" placeholder="ISBN" class="rounded-xl border border-slate-300 px-3 py-2 text-sm" bind:value={bookForm.isbn} />
          <input type="text" placeholder="Publisher" class="rounded-xl border border-slate-300 px-3 py-2 text-sm" bind:value={bookForm.publisher} />
          <input type="text" placeholder="Edition" class="rounded-xl border border-slate-300 px-3 py-2 text-sm" bind:value={bookForm.edition} />
          <input
            type="number" min="1" placeholder="Quantity" class="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            value={bookForm.quantity}
            oninput={(e) => { const v = (e.currentTarget as HTMLInputElement).value; bookForm = { ...bookForm, quantity: v, availableCopies: bookForm.availableCopies && Number(bookForm.availableCopies) > Number(v || 0) ? v : bookForm.availableCopies }; }}
            required
          />
          <input type="number" min="0" placeholder="Available Copies" class="rounded-xl border border-slate-300 px-3 py-2 text-sm" bind:value={bookForm.availableCopies} required />
          <select class="rounded-xl border border-slate-300 px-3 py-2 text-sm" bind:value={bookForm.rack} required>
            <option value="">Select Rack</option>
            {#each RACK_OPTIONS as r}<option value={r}>{r}</option>{/each}
          </select>
          <select class="rounded-xl border border-slate-300 px-3 py-2 text-sm" bind:value={bookForm.shelf} required>
            <option value="">Select Shelf</option>
            {#each SHELF_OPTIONS as s}<option value={s}>{s}</option>{/each}
          </select>
          <select class="rounded-xl border border-slate-300 px-3 py-2 text-sm" bind:value={bookForm.status}>
            <option value="active">Active</option>
            <option value="out_of_stock">Out of Stock</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <button type="submit" disabled={savingBook} class="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
          {savingBook ? 'Saving Book...' : 'Add Book'}
        </button>
      </form>
    </div>

    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="mb-4 flex items-center gap-2">
        <UserPlus class="h-5 w-5 text-blue-600" />
        <h3 class="text-lg font-semibold text-slate-900">Assign Book to Student</h3>
      </div>
      <form onsubmit={handleAssignmentSubmit} class="space-y-4">
        <select class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" bind:value={assignmentForm.bookId} required>
          <option value="">Select Book</option>
          {#each books as b}<option value={b._id}>{b.title} | {b.accessionNumber}</option>{/each}
        </select>
        <select class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" bind:value={assignmentForm.studentId} required>
          <option value="">Select Student</option>
          {#each students as s}<option value={s._id}>{s.name} ({s.class} - {s.rollNumber})</option>{/each}
        </select>
        <div class="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm md:grid-cols-2">
          <p><span class="font-medium text-slate-600">Class:</span> <span>{selectedStudent?.class || '-'}</span></p>
          <p><span class="font-medium text-slate-600">Available Copies:</span> <span>{selectedBook?.availableCopies ?? '-'}</span></p>
          <p><span class="font-medium text-slate-600">Rack:</span> <span>{selectedBook?.rack || '-'}</span></p>
          <p><span class="font-medium text-slate-600">Shelf:</span> <span>{selectedBook?.shelf || '-'}</span></p>
        </div>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Assign Date</label>
            <input type="date" class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" value={assignmentForm.assignDate} onchange={(e) => { const v = (e.currentTarget as HTMLInputElement).value; assignmentForm = { ...assignmentForm, assignDate: v, dueDate: addDays(v, 14) }; }} required />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Due Date</label>
            <input type="date" class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" bind:value={assignmentForm.dueDate} required />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Return Date</label>
            <input type="date" class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" bind:value={assignmentForm.returnDate} />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Issue Status</label>
            <select class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" bind:value={assignmentForm.issueStatus}>
              <option value="issued">Issued</option>
              <option value="returned">Returned</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>
        <button type="submit" disabled={savingAssignment} class="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
          {savingAssignment ? 'Assigning...' : 'Assign Book'}
        </button>
      </form>
    </div>
  </div>

  <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div class="flex items-center gap-2"><BookOpen class="h-5 w-5 text-teal-600" /><h3 class="text-lg font-semibold text-slate-900">Books List</h3></div>
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <div class="relative">
          <Search class="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input type="text" placeholder="Search books..." class="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm" bind:value={bookSearch} />
        </div>
        <select class="rounded-xl border border-slate-300 px-3 py-2 text-sm" bind:value={bookCategoryFilter}>
          <option value="">All Categories</option>
          {#each CATEGORY_OPTIONS as c}<option value={c}>{c}</option>{/each}
        </select>
        <select class="rounded-xl border border-slate-300 px-3 py-2 text-sm" bind:value={bookRackFilter}>
          <option value="">All Racks</option>
          {#each RACK_OPTIONS as r}<option value={r}>{r}</option>{/each}
        </select>
        <select class="rounded-xl border border-slate-300 px-3 py-2 text-sm" bind:value={bookStatusFilter}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="out_of_stock">Out of Stock</option>
          <option value="archived">Archived</option>
        </select>
      </div>
    </div>

    {#if loading}
      <p class="text-sm text-slate-500">Loading books...</p>
    {:else if filteredBooks.length === 0}
      <p class="text-sm text-slate-500">No books found for selected filters.</p>
    {:else}
      <div class="overflow-x-auto">
        <table class="min-w-full border-separate border-spacing-y-2 text-sm">
          <thead>
            <tr class="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th class="px-3 py-2">Title</th>
              <th class="px-3 py-2">Author</th>
              <th class="px-3 py-2">Category</th>
              <th class="px-3 py-2">Rack</th>
              <th class="px-3 py-2">Shelf</th>
              <th class="px-3 py-2">Quantity</th>
              <th class="px-3 py-2">Available</th>
              <th class="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {#each filteredBooks as book}
              <tr class="rounded-xl border border-slate-200 bg-slate-50/70 text-slate-700">
                <td class="px-3 py-3 font-medium text-slate-900">{book.title}</td>
                <td class="px-3 py-3">{book.author}</td>
                <td class="px-3 py-3">{book.category}</td>
                <td class="px-3 py-3">{book.rack}</td>
                <td class="px-3 py-3">{book.shelf}</td>
                <td class="px-3 py-3">{book.quantity}</td>
                <td class="px-3 py-3 font-semibold text-teal-700">{book.availableCopies}</td>
                <td class="px-3 py-3">
                  <span class="rounded-full px-2 py-1 text-xs font-semibold {book.status === 'active' ? 'bg-emerald-100 text-emerald-700' : book.status === 'out_of_stock' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}">
                    {book.status.replace(/_/g, ' ')}
                  </span>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>

  <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div class="flex items-center gap-2"><Filter class="h-5 w-5 text-blue-600" /><h3 class="text-lg font-semibold text-slate-900">Book Assignments</h3></div>
      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div class="relative">
          <Search class="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input type="text" placeholder="Search assignment..." class="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm" bind:value={assignmentSearch} />
        </div>
        <select class="rounded-xl border border-slate-300 px-3 py-2 text-sm" bind:value={assignmentStatusFilter}>
          <option value="">All Status</option>
          <option value="issued">Issued</option>
          <option value="returned">Returned</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>
    </div>

    {#if loading}
      <p class="text-sm text-slate-500">Loading assignments...</p>
    {:else if filteredAssignments.length === 0}
      <p class="text-sm text-slate-500">No assignments found.</p>
    {:else}
      <div class="overflow-x-auto">
        <table class="min-w-full border-separate border-spacing-y-2 text-sm">
          <thead>
            <tr class="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th class="px-3 py-2">Book</th>
              <th class="px-3 py-2">Student</th>
              <th class="px-3 py-2">Class</th>
              <th class="px-3 py-2">Issue Date</th>
              <th class="px-3 py-2">Due Date</th>
              <th class="px-3 py-2">Return Status</th>
              <th class="px-3 py-2">Overdue</th>
            </tr>
          </thead>
          <tbody>
            {#each filteredAssignments as a}
              {@const status = a.computedIssueStatus || a.issueStatus}
              {@const isOverdue = status === 'overdue' || Boolean(a.isOverdue)}
              <tr class="rounded-xl border border-slate-200 bg-slate-50/70 text-slate-700">
                <td class="px-3 py-3">
                  <p class="font-medium text-slate-900">{a.bookId?.title || '-'}</p>
                  <p class="text-xs text-slate-500">{a.bookId?.accessionNumber || ''}</p>
                </td>
                <td class="px-3 py-3">{a.studentId?.name || '-'}</td>
                <td class="px-3 py-3">{a.studentId?.class || '-'}</td>
                <td class="px-3 py-3">{a.assignDate || '-'}</td>
                <td class="px-3 py-3">{a.dueDate || '-'}</td>
                <td class="px-3 py-3">
                  <span class="rounded-full px-2 py-1 text-xs font-semibold {status === 'returned' ? 'bg-emerald-100 text-emerald-700' : status === 'overdue' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}">{status}</span>
                </td>
                <td class="px-3 py-3">
                  <span class="rounded-full px-2 py-1 text-xs font-semibold {isOverdue ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}">{isOverdue ? 'Yes' : 'No'}</span>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>
