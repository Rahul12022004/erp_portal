import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  BookOpen,
  BookCopy,
  CircleCheck,
  CircleAlert,
  Library,
  UserPlus,
  Search,
  Filter,
} from "lucide-react";
import { API_URL } from "@/lib/api";

type Student = {
  _id: string;
  name: string;
  class: string;
  rollNumber: string;
};

type Book = {
  _id: string;
  title: string;
  author: string;
  category: string;
  accessionNumber: string;
  isbn?: string;
  publisher?: string;
  edition?: string;
  quantity: number;
  availableCopies: number;
  rack: string;
  shelf: string;
  status: "active" | "out_of_stock" | "archived";
};

type Assignment = {
  _id: string;
  assignDate: string;
  dueDate: string;
  returnDate?: string;
  issueStatus: "issued" | "returned" | "overdue";
  computedIssueStatus?: "issued" | "returned" | "overdue";
  isOverdue?: boolean;
  bookId: Book;
  studentId: Student;
};

type LibraryResponse = {
  stats: {
    totalBooks: number;
    availableBooks: number;
    issuedBooks: number;
    overdueBooks: number;
  };
  books: Book[];
  assignments: Assignment[];
  students: Student[];
};

type BookForm = {
  title: string;
  author: string;
  category: string;
  accessionNumber: string;
  isbn: string;
  publisher: string;
  edition: string;
  quantity: string;
  availableCopies: string;
  rack: string;
  shelf: string;
  status: "active" | "out_of_stock" | "archived";
};

type AssignmentForm = {
  bookId: string;
  studentId: string;
  assignDate: string;
  dueDate: string;
  returnDate: string;
  issueStatus: "issued" | "returned" | "overdue";
};

const CATEGORY_OPTIONS = [
  "Textbook",
  "Reference",
  "Story",
  "Science",
  "Mathematics",
  "Language",
  "History",
  "General Knowledge",
  "Magazine",
  "Other",
];

const RACK_OPTIONS = ["Rack A", "Rack B", "Rack C", "Rack D", "Rack E", "Rack F"];
const SHELF_OPTIONS = ["Shelf 1", "Shelf 2", "Shelf 3", "Shelf 4", "Shelf 5", "Shelf 6"];

const emptyBookForm: BookForm = {
  title: "",
  author: "",
  category: "",
  accessionNumber: "",
  isbn: "",
  publisher: "",
  edition: "",
  quantity: "",
  availableCopies: "",
  rack: "",
  shelf: "",
  status: "active",
};

const getToday = () => new Date().toISOString().split("T")[0];

const addDays = (dateString: string, days: number) => {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
};

export default function LibraryModule() {
  const [stats, setStats] = useState({
    totalBooks: 0,
    availableBooks: 0,
    issuedBooks: 0,
    overdueBooks: 0,
  });
  const [books, setBooks] = useState<Book[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [bookForm, setBookForm] = useState<BookForm>(emptyBookForm);
  const [assignmentForm, setAssignmentForm] = useState<AssignmentForm>({
    bookId: "",
    studentId: "",
    assignDate: getToday(),
    dueDate: addDays(getToday(), 14),
    returnDate: "",
    issueStatus: "issued",
  });

  const [bookSearch, setBookSearch] = useState("");
  const [bookCategoryFilter, setBookCategoryFilter] = useState("");
  const [bookRackFilter, setBookRackFilter] = useState("");
  const [bookStatusFilter, setBookStatusFilter] = useState("");

  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [savingBook, setSavingBook] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [error, setError] = useState("");

  const school = useMemo(() => JSON.parse(localStorage.getItem("school") || "{}"), []);
  const schoolId = school?._id || "";

  const selectedBook = useMemo(
    () => books.find((book) => book._id === assignmentForm.bookId) || null,
    [books, assignmentForm.bookId]
  );

  const selectedStudent = useMemo(
    () => students.find((student) => student._id === assignmentForm.studentId) || null,
    [students, assignmentForm.studentId]
  );

  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      const searchMatch =
        !bookSearch.trim() ||
        `${book.title} ${book.author} ${book.accessionNumber} ${book.isbn || ""}`
          .toLowerCase()
          .includes(bookSearch.trim().toLowerCase());

      const categoryMatch = !bookCategoryFilter || book.category === bookCategoryFilter;
      const rackMatch = !bookRackFilter || book.rack === bookRackFilter;
      const statusMatch = !bookStatusFilter || book.status === bookStatusFilter;

      return searchMatch && categoryMatch && rackMatch && statusMatch;
    });
  }, [books, bookSearch, bookCategoryFilter, bookRackFilter, bookStatusFilter]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter((assignment) => {
      const currentStatus = assignment.computedIssueStatus || assignment.issueStatus;
      const searchMatch =
        !assignmentSearch.trim() ||
        `${assignment.bookId?.title || ""} ${assignment.studentId?.name || ""} ${assignment.studentId?.class || ""}`
          .toLowerCase()
          .includes(assignmentSearch.trim().toLowerCase());

      const statusMatch = !assignmentStatusFilter || currentStatus === assignmentStatusFilter;
      return searchMatch && statusMatch;
    });
  }, [assignments, assignmentSearch, assignmentStatusFilter]);

  const fetchLibraryData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      if (!schoolId) {
        setError("School not found. Please log in again.");
        setStats({ totalBooks: 0, availableBooks: 0, issuedBooks: 0, overdueBooks: 0 });
        setBooks([]);
        setStudents([]);
        setAssignments([]);
        return;
      }

      const res = await fetch(`${API_URL}/api/library/${schoolId}`);
      if (!res.ok) {
        throw new Error(`Failed to load library data (${res.status})`);
      }

      const data = (await res.json()) as LibraryResponse;

      setStats(
        data.stats || {
          totalBooks: 0,
          availableBooks: 0,
          issuedBooks: 0,
          overdueBooks: 0,
        }
      );
      setBooks(Array.isArray(data.books) ? data.books : []);
      setStudents(Array.isArray(data.students) ? data.students : []);
      setAssignments(Array.isArray(data.assignments) ? data.assignments : []);
    } catch (err) {
      console.error("Library fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to load library data");
      setStats({ totalBooks: 0, availableBooks: 0, issuedBooks: 0, overdueBooks: 0 });
      setBooks([]);
      setStudents([]);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    void fetchLibraryData();
  }, [fetchLibraryData]);

  const handleBookSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const qty = Number(bookForm.quantity || 0);
    const available = Number(bookForm.availableCopies || 0);

    if (!Number.isFinite(qty) || qty < 1) {
      setError("Quantity must be at least 1.");
      return;
    }

    if (!Number.isFinite(available) || available < 0 || available > qty) {
      setError("Available copies must be between 0 and quantity.");
      return;
    }

    try {
      setSavingBook(true);
      setError("");

      if (!schoolId) {
        setError("School not found. Please log in again.");
        return;
      }

      const res = await fetch(`${API_URL}/api/library/books`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...bookForm,
          quantity: qty,
          availableCopies: available,
          schoolId,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || "Failed to add book");
      }

      setBookForm(emptyBookForm);
      await fetchLibraryData();
    } catch (err) {
      console.error("Book save error:", err);
      setError(err instanceof Error ? err.message : "Failed to add book");
    } finally {
      setSavingBook(false);
    }
  };

  const handleAssignmentDateChange = (assignDate: string) => {
    setAssignmentForm((current) => ({
      ...current,
      assignDate,
      dueDate: addDays(assignDate, 14),
    }));
  };

  const handleAssignmentSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!assignmentForm.bookId || !assignmentForm.studentId) {
      setError("Please select book and student.");
      return;
    }

    if (assignmentForm.issueStatus !== "returned" && (selectedBook?.availableCopies || 0) < 1) {
      setError("Selected book has no available copies.");
      return;
    }

    try {
      setSavingAssignment(true);
      setError("");

      if (!schoolId) {
        setError("School not found. Please log in again.");
        return;
      }

      const res = await fetch(`${API_URL}/api/library/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...assignmentForm,
          schoolId,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || "Failed to assign book");
      }

      const today = getToday();
      setAssignmentForm({
        bookId: "",
        studentId: "",
        assignDate: today,
        dueDate: addDays(today, 14),
        returnDate: "",
        issueStatus: "issued",
      });
      await fetchLibraryData();
    } catch (err) {
      console.error("Assignment save error:", err);
      setError(err instanceof Error ? err.message : "Failed to assign book");
    } finally {
      setSavingAssignment(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Total Books</p>
            <BookOpen className="h-5 w-5 text-teal-600" />
          </div>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.totalBooks}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Available Books</p>
            <CircleCheck className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.availableBooks}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Issued Books</p>
            <BookCopy className="h-5 w-5 text-blue-600" />
          </div>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.issuedBooks}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Overdue Books</p>
            <CircleAlert className="h-5 w-5 text-amber-600" />
          </div>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.overdueBooks}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Library className="h-5 w-5 text-teal-600" />
            <h3 className="text-lg font-semibold text-slate-900">Add Book</h3>
          </div>

          <form onSubmit={handleBookSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input
                type="text"
                placeholder="Book Title"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                value={bookForm.title}
                onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Author"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                value={bookForm.author}
                onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                required
              />
              <select
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                value={bookForm.category}
                onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })}
                required
              >
                <option value="">Select Category</option>
                {CATEGORY_OPTIONS.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Book Code / Accession Number"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                value={bookForm.accessionNumber}
                onChange={(e) => setBookForm({ ...bookForm, accessionNumber: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="ISBN"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                value={bookForm.isbn}
                onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })}
              />
              <input
                type="text"
                placeholder="Publisher"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                value={bookForm.publisher}
                onChange={(e) => setBookForm({ ...bookForm, publisher: e.target.value })}
              />
              <input
                type="text"
                placeholder="Edition"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                value={bookForm.edition}
                onChange={(e) => setBookForm({ ...bookForm, edition: e.target.value })}
              />
              <input
                type="number"
                min="1"
                placeholder="Quantity"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                value={bookForm.quantity}
                onChange={(e) =>
                  setBookForm((current) => ({
                    ...current,
                    quantity: e.target.value,
                    availableCopies:
                      current.availableCopies && Number(current.availableCopies) > Number(e.target.value || 0)
                        ? e.target.value
                        : current.availableCopies,
                  }))
                }
                required
              />
              <input
                type="number"
                min="0"
                placeholder="Available Copies"
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                value={bookForm.availableCopies}
                onChange={(e) => setBookForm({ ...bookForm, availableCopies: e.target.value })}
                required
              />
              <select
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                value={bookForm.rack}
                onChange={(e) => setBookForm({ ...bookForm, rack: e.target.value })}
                required
              >
                <option value="">Select Rack</option>
                {RACK_OPTIONS.map((rack) => (
                  <option key={rack} value={rack}>
                    {rack}
                  </option>
                ))}
              </select>
              <select
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                value={bookForm.shelf}
                onChange={(e) => setBookForm({ ...bookForm, shelf: e.target.value })}
                required
              >
                <option value="">Select Shelf</option>
                {SHELF_OPTIONS.map((shelf) => (
                  <option key={shelf} value={shelf}>
                    {shelf}
                  </option>
                ))}
              </select>
              <select
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                value={bookForm.status}
                onChange={(e) =>
                  setBookForm({
                    ...bookForm,
                    status: e.target.value as BookForm["status"],
                  })
                }
              >
                <option value="active">Active</option>
                <option value="out_of_stock">Out of Stock</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={savingBook}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {savingBook ? "Saving Book..." : "Add Book"}
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-slate-900">Assign Book to Student</h3>
          </div>

          <form onSubmit={handleAssignmentSubmit} className="space-y-4">
            <select
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              value={assignmentForm.bookId}
              onChange={(e) => setAssignmentForm({ ...assignmentForm, bookId: e.target.value })}
              required
            >
              <option value="">Select Book</option>
              {books.map((book) => (
                <option key={book._id} value={book._id}>
                  {book.title} | {book.accessionNumber}
                </option>
              ))}
            </select>

            <select
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              value={assignmentForm.studentId}
              onChange={(e) => setAssignmentForm({ ...assignmentForm, studentId: e.target.value })}
              required
            >
              <option value="">Select Student</option>
              {students.map((student) => (
                <option key={student._id} value={student._id}>
                  {student.name} ({student.class} - {student.rollNumber})
                </option>
              ))}
            </select>

            <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm md:grid-cols-2">
              <p>
                <span className="font-medium text-slate-600">Class:</span>{" "}
                <span className="text-slate-900">{selectedStudent?.class || "-"}</span>
              </p>
              <p>
                <span className="font-medium text-slate-600">Available Copies:</span>{" "}
                <span className="text-slate-900">{selectedBook?.availableCopies ?? "-"}</span>
              </p>
              <p>
                <span className="font-medium text-slate-600">Rack:</span>{" "}
                <span className="text-slate-900">{selectedBook?.rack || "-"}</span>
              </p>
              <p>
                <span className="font-medium text-slate-600">Shelf:</span>{" "}
                <span className="text-slate-900">{selectedBook?.shelf || "-"}</span>
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Assign Date
                </label>
                <input
                  type="date"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  value={assignmentForm.assignDate}
                  onChange={(e) => handleAssignmentDateChange(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Due Date
                </label>
                <input
                  type="date"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  value={assignmentForm.dueDate}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, dueDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Return Date
                </label>
                <input
                  type="date"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  value={assignmentForm.returnDate}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, returnDate: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Issue Status
                </label>
                <select
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  value={assignmentForm.issueStatus}
                  onChange={(e) =>
                    setAssignmentForm({
                      ...assignmentForm,
                      issueStatus: e.target.value as AssignmentForm["issueStatus"],
                    })
                  }
                >
                  <option value="issued">Issued</option>
                  <option value="returned">Returned</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={savingAssignment}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {savingAssignment ? "Assigning..." : "Assign Book"}
            </button>
          </form>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-teal-600" />
            <h3 className="text-lg font-semibold text-slate-900">Books List</h3>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search books..."
                className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-teal-500 focus:outline-none"
                value={bookSearch}
                onChange={(e) => setBookSearch(e.target.value)}
              />
            </div>
            <select
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
              value={bookCategoryFilter}
              onChange={(e) => setBookCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              {CATEGORY_OPTIONS.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <select
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
              value={bookRackFilter}
              onChange={(e) => setBookRackFilter(e.target.value)}
            >
              <option value="">All Racks</option>
              {RACK_OPTIONS.map((rack) => (
                <option key={rack} value={rack}>
                  {rack}
                </option>
              ))}
            </select>
            <select
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
              value={bookStatusFilter}
              onChange={(e) => setBookStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="out_of_stock">Out of Stock</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading books...</p>
        ) : filteredBooks.length === 0 ? (
          <p className="text-sm text-slate-500">No books found for selected filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Author</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Rack</th>
                  <th className="px-3 py-2">Shelf</th>
                  <th className="px-3 py-2">Quantity</th>
                  <th className="px-3 py-2">Available</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBooks.map((book) => (
                  <tr key={book._id} className="rounded-xl border border-slate-200 bg-slate-50/70 text-slate-700">
                    <td className="px-3 py-3 font-medium text-slate-900">{book.title}</td>
                    <td className="px-3 py-3">{book.author}</td>
                    <td className="px-3 py-3">{book.category}</td>
                    <td className="px-3 py-3">{book.rack}</td>
                    <td className="px-3 py-3">{book.shelf}</td>
                    <td className="px-3 py-3">{book.quantity}</td>
                    <td className="px-3 py-3 font-semibold text-teal-700">{book.availableCopies}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          book.status === "active"
                            ? "bg-emerald-100 text-emerald-700"
                            : book.status === "out_of_stock"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {book.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <button className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-slate-900">Book Assignments</h3>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search assignment..."
                className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none"
                value={assignmentSearch}
                onChange={(e) => setAssignmentSearch(e.target.value)}
              />
            </div>
            <select
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              value={assignmentStatusFilter}
              onChange={(e) => setAssignmentStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="issued">Issued</option>
              <option value="returned">Returned</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading assignments...</p>
        ) : filteredAssignments.length === 0 ? (
          <p className="text-sm text-slate-500">No assignments found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2">Book</th>
                  <th className="px-3 py-2">Student</th>
                  <th className="px-3 py-2">Class</th>
                  <th className="px-3 py-2">Issue Date</th>
                  <th className="px-3 py-2">Due Date</th>
                  <th className="px-3 py-2">Return Status</th>
                  <th className="px-3 py-2">Overdue</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssignments.map((assignment) => {
                  const currentStatus = assignment.computedIssueStatus || assignment.issueStatus;
                  const isOverdue = currentStatus === "overdue" || Boolean(assignment.isOverdue);

                  return (
                    <tr key={assignment._id} className="rounded-xl border border-slate-200 bg-slate-50/70 text-slate-700">
                      <td className="px-3 py-3">
                        <p className="font-medium text-slate-900">{assignment.bookId?.title || "-"}</p>
                        <p className="text-xs text-slate-500">{assignment.bookId?.accessionNumber || ""}</p>
                      </td>
                      <td className="px-3 py-3">{assignment.studentId?.name || "-"}</td>
                      <td className="px-3 py-3">{assignment.studentId?.class || "-"}</td>
                      <td className="px-3 py-3">{assignment.assignDate || "-"}</td>
                      <td className="px-3 py-3">{assignment.dueDate || "-"}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            currentStatus === "returned"
                              ? "bg-emerald-100 text-emerald-700"
                              : currentStatus === "overdue"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {currentStatus}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            isOverdue ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {isOverdue ? "Yes" : "No"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
