import express from "express";
import LibraryAssignment from "../models/LibraryAssignment";
import LibraryBook from "../models/LibraryBook";
import Student from "../models/Student";
import { createLog } from "../utils/createLog";

const router = express.Router();

const addDays = (dateString: string, days: number) => {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
};

// ==========================
// 📚 GET LIBRARY DATA FOR A SCHOOL
// ==========================
router.get("/:schoolId", async (req, res) => {
  try {
    const { schoolId } = req.params;

    const [books, assignments, students] = await Promise.all([
      LibraryBook.find({ schoolId }).sort({ createdAt: -1 }),
      LibraryAssignment.find({ schoolId, status: "assigned" })
        .populate("bookId", "title author quantity")
        .populate("studentId", "name class rollNumber")
        .sort({ createdAt: -1 }),
      Student.find({ schoolId }).select("name class rollNumber").sort({ name: 1 }),
    ]);

    const totalBooks = books.reduce((sum, book) => sum + (book.quantity || 0), 0);
    const assignedBooks = assignments.length;
    const orderedBooks = books.length;

    res.json({
      stats: {
        totalBooks,
        assignedBooks,
        orderedBooks,
      },
      books,
      assignments,
      students,
    });
  } catch (error) {
    console.error("GET LIBRARY ERROR:", error);
    res.status(500).json({ message: "Failed to fetch library data" });
  }
});

// ==========================
// ➕ ADD BOOK
// ==========================
router.post("/books", async (req, res) => {
  try {
    const { title, author, quantity, schoolId } = req.body;

    if (!title || !author || !quantity || !schoolId) {
      return res.status(400).json({
        message: "Required fields: title, author, quantity, schoolId",
      });
    }

    const book = await LibraryBook.create({
      title,
      author,
      quantity,
      schoolId,
    });

    await createLog({
      action: "CREATE_LIBRARY_BOOK",
      message: `Library book added: ${title}`,
      schoolId,
    });

    res.status(201).json({ success: true, data: book });
  } catch (error) {
    console.error("CREATE LIBRARY BOOK ERROR:", error);
    res.status(500).json({ message: "Failed to add book" });
  }
});

// ==========================
// 📖 ASSIGN BOOK TO STUDENT
// ==========================
router.post("/assign", async (req, res) => {
  try {
    const { bookId, studentId, assignDate, returnDate, schoolId } = req.body;

    if (!bookId || !studentId || !schoolId) {
      return res.status(400).json({
        message: "Required fields: bookId, studentId, schoolId",
      });
    }

    const book = await LibraryBook.findById(bookId);
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    const currentAssignments = await LibraryAssignment.countDocuments({
      bookId,
      schoolId,
      status: "assigned",
    });

    if (currentAssignments >= book.quantity) {
      return res.status(400).json({ message: "No copies available for assignment" });
    }

    const effectiveAssignDate = assignDate || new Date().toISOString().split("T")[0];
    const effectiveReturnDate = returnDate || addDays(effectiveAssignDate, 7);

    const assignment = await LibraryAssignment.create({
      bookId,
      studentId,
      assignDate: effectiveAssignDate,
      returnDate: effectiveReturnDate,
      schoolId,
      status: "assigned",
    });

    const populatedAssignment = await assignment.populate([
      { path: "bookId", select: "title author quantity" },
      { path: "studentId", select: "name class rollNumber" },
    ]);

    await createLog({
      action: "ASSIGN_LIBRARY_BOOK",
      message: `Book assigned to student`,
      schoolId,
    });

    res.status(201).json({ success: true, data: populatedAssignment });
  } catch (error) {
    console.error("ASSIGN LIBRARY BOOK ERROR:", error);
    res.status(500).json({ message: "Failed to assign book" });
  }
});

export default router;
