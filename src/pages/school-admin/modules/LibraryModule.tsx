import { useEffect, useState } from "react";
import { BookOpen, CalendarDays, Library, UserPlus } from "lucide-react";

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
  quantity: number;
};

type Assignment = {
  _id: string;
  assignDate: string;
  returnDate: string;
  bookId: Book;
  studentId: Student;
};

type LibraryResponse = {
  stats: {
    totalBooks: number;
    assignedBooks: number;
    orderedBooks: number;
  };
  books: Book[];
  assignments: Assignment[];
  students: Student[];
};

type BookForm = {
  title: string;
  author: string;
  quantity: string;
};

type AssignmentForm = {
  bookId: string;
  studentId: string;
  assignDate: string;
  returnDate: string;
};

const addDays = (dateString: string, days: number) => {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
};

export default function LibraryModule() {
  const today = new Date().toISOString().split("T")[0];

  const [stats, setStats] = useState({
    totalBooks: 0,
    assignedBooks: 0,
    orderedBooks: 0,
  });
  const [books, setBooks] = useState<Book[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [bookForm, setBookForm] = useState<BookForm>({
    title: "",
    author: "",
    quantity: "",
  });
  const [assignmentForm, setAssignmentForm] = useState<AssignmentForm>({
    bookId: "",
    studentId: "",
    assignDate: today,
    returnDate: addDays(today, 7),
  });
  const [loading, setLoading] = useState(true);
  const [savingBook, setSavingBook] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchLibraryData();
  }, []);

  const fetchLibraryData = async () => {
    try {
      setLoading(true);
      setError("");

      const school = JSON.parse(localStorage.getItem("school") || "{}");
      if (!school?._id) {
        setError("School not found. Please log in again.");
        return;
      }

      const res = await fetch(`http://localhost:5000/api/library/${school._id}`);
      if (!res.ok) {
        throw new Error(`Failed to load library data (${res.status})`);
      }

      const data = (await res.json()) as LibraryResponse;
      setStats(data.stats || { totalBooks: 0, assignedBooks: 0, orderedBooks: 0 });
      setBooks(Array.isArray(data.books) ? data.books : []);
      setStudents(Array.isArray(data.students) ? data.students : []);
      setAssignments(Array.isArray(data.assignments) ? data.assignments : []);
    } catch (err) {
      console.error("Library fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to load library data");
      setStats({ totalBooks: 0, assignedBooks: 0, orderedBooks: 0 });
      setBooks([]);
      setStudents([]);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSavingBook(true);
      setError("");

      const school = JSON.parse(localStorage.getItem("school") || "{}");
      if (!school?._id) {
        setError("School not found. Please log in again.");
        return;
      }

      const res = await fetch("http://localhost:5000/api/library/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...bookForm,
          quantity: Number(bookForm.quantity),
          schoolId: school._id,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || "Failed to add book");
      }

      setBookForm({ title: "", author: "", quantity: "" });
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
      returnDate: addDays(assignDate, 7),
    }));
  };

  const handleAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSavingAssignment(true);
      setError("");

      const school = JSON.parse(localStorage.getItem("school") || "{}");
      if (!school?._id) {
        setError("School not found. Please log in again.");
        return;
      }

      const res = await fetch("http://localhost:5000/api/library/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...assignmentForm,
          schoolId: school._id,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || "Failed to assign book");
      }

      setAssignmentForm({
        bookId: "",
        studentId: "",
        assignDate: today,
        returnDate: addDays(today, 7),
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
        <div className="stat-card p-4 text-red-600">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card p-5">
          <p className="text-sm text-gray-500">Total Books</p>
          <p className="text-2xl font-bold">{stats.totalBooks}</p>
        </div>
        <div className="stat-card p-5">
          <p className="text-sm text-gray-500">Assigned Books</p>
          <p className="text-2xl font-bold text-blue-700">{stats.assignedBooks}</p>
        </div>
        <div className="stat-card p-5">
          <p className="text-sm text-gray-500">Ordered Books</p>
          <p className="text-2xl font-bold text-green-700">{stats.orderedBooks}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="stat-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Library className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Add Book</h3>
          </div>

          <form onSubmit={handleBookSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Book Title"
              className="border rounded p-2 w-full"
              value={bookForm.title}
              onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Author"
              className="border rounded p-2 w-full"
              value={bookForm.author}
              onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
              required
            />
            <input
              type="number"
              min="1"
              placeholder="Quantity"
              className="border rounded p-2 w-full"
              value={bookForm.quantity}
              onChange={(e) => setBookForm({ ...bookForm, quantity: e.target.value })}
              required
            />
            <button
              type="submit"
              disabled={savingBook}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              {savingBook ? "Saving..." : "Add Book"}
            </button>
          </form>
        </div>

        <div className="stat-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold">Assign Book To Student</h3>
          </div>

          <form onSubmit={handleAssignmentSubmit} className="space-y-4">
            <select
              className="border rounded p-2 w-full"
              value={assignmentForm.bookId}
              onChange={(e) => setAssignmentForm({ ...assignmentForm, bookId: e.target.value })}
              required
            >
              <option value="">Select Book</option>
              {books.map((book) => (
                <option key={book._id} value={book._id}>
                  {book.title} by {book.author} ({book.quantity} total)
                </option>
              ))}
            </select>
            <select
              className="border rounded p-2 w-full"
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Assign Date</label>
                <input
                  type="date"
                  className="border rounded p-2 w-full"
                  value={assignmentForm.assignDate}
                  onChange={(e) => handleAssignmentDateChange(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-sm text-gray-500 mb-1 block">Return Date</label>
                <input
                  type="date"
                  className="border rounded p-2 w-full bg-gray-50"
                  value={assignmentForm.returnDate}
                  readOnly
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={savingAssignment}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
            >
              {savingAssignment ? "Assigning..." : "Assign Book"}
            </button>
          </form>
        </div>
      </div>

      <div className="stat-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Books List</h3>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading books...</p>
        ) : books.length === 0 ? (
          <p className="text-gray-500">No books added yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {books.map((book) => (
              <div key={book._id} className="rounded-xl bg-gray-50 p-4">
                <p className="font-semibold">{book.title}</p>
                <p className="text-sm text-gray-500">{book.author}</p>
                <p className="text-sm text-blue-700 mt-2">Total Copies: {book.quantity}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Book Assignments</h3>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading assignments...</p>
        ) : assignments.length === 0 ? (
          <p className="text-gray-500">No books assigned yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {assignments.map((assignment) => (
              <div key={assignment._id} className="stat-card p-5 space-y-3">
                <div>
                  <p className="text-xs text-gray-500">Book</p>
                  <p className="font-semibold">{assignment.bookId?.title}</p>
                  <p className="text-sm text-gray-500">{assignment.bookId?.author}</p>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-xs text-gray-500">Student</p>
                  <p className="font-medium">{assignment.studentId?.name}</p>
                  <p className="text-sm text-gray-500">
                    {assignment.studentId?.class} - Roll {assignment.studentId?.rollNumber}
                  </p>
                </div>

                <div className="pt-2 border-t text-sm text-gray-600 space-y-1">
                  <p>Assigned: {assignment.assignDate}</p>
                  <p>Return Date: {assignment.returnDate}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
