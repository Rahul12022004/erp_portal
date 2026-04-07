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
    const today = new Date().toISOString().split("T")[0];

    const [books, assignments, students] = await Promise.all([
      LibraryBook.find({ schoolId }).sort({ createdAt: -1 }),
      LibraryAssignment.find({ schoolId })
        .populate("bookId", "title author category rack shelf quantity availableCopies status")
        .populate("studentId", "name class rollNumber")
        .sort({ createdAt: -1 }),
      Student.find({ schoolId }).select("name class rollNumber").sort({ name: 1 }),
    ]);

    const normalizedBooks = books.map((book: any) => {
      const available = book.availableCopies === undefined || book.availableCopies === null
        ? Number(book.quantity || 0)
        : Number(book.availableCopies || 0);

      return {
        ...book.toObject(),
        availableCopies: Math.max(available, 0),
      };
    });

    const assignmentsWithOverdue = assignments.map((assignment) => {
      const assignmentObj = assignment.toObject();
      const isOverdue =
        assignmentObj.issueStatus !== "returned" &&
        Boolean(assignmentObj.dueDate) &&
        assignmentObj.dueDate < today;

      return {
        ...assignmentObj,
        isOverdue,
        computedIssueStatus: isOverdue ? "overdue" : assignmentObj.issueStatus,
      };
    });

    const totalBooks = normalizedBooks.reduce((sum, book: any) => sum + (book.quantity || 0), 0);
    const availableBooks = normalizedBooks.reduce((sum, book: any) => sum + Math.max(book.availableCopies || 0, 0), 0);
    const issuedBooks = assignmentsWithOverdue.filter(
      (assignment: any) => assignment.computedIssueStatus === "issued" || assignment.computedIssueStatus === "overdue"
    ).length;
    const overdueBooks = assignmentsWithOverdue.filter(
      (assignment: any) => assignment.computedIssueStatus === "overdue"
    ).length;

    res.json({
      stats: {
        totalBooks,
        availableBooks,
        issuedBooks,
        overdueBooks,
      },
      books: normalizedBooks,
      assignments: assignmentsWithOverdue,
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
    const {
      title,
      author,
      category,
      accessionNumber,
      isbn,
      publisher,
      edition,
      quantity,
      availableCopies,
      rack,
      shelf,
      status,
      schoolId,
    } = req.body;

    if (
      !title ||
      !author ||
      !category ||
      !accessionNumber ||
      quantity === undefined ||
      !rack ||
      !shelf ||
      !schoolId
    ) {
      return res.status(400).json({
        message: "Required fields: title, author, category, accessionNumber, quantity, rack, shelf, schoolId",
      });
    }

    const qty = Number(quantity);
    const copies = availableCopies !== undefined && availableCopies !== null && String(availableCopies).trim() !== ""
      ? Number(availableCopies)
      : qty;

    if (!Number.isFinite(qty) || qty < 1) {
      return res.status(400).json({ message: "Quantity must be a valid number greater than 0" });
    }
    if (!Number.isFinite(copies) || copies < 0 || copies > qty) {
      return res.status(400).json({ message: "Available copies must be between 0 and quantity" });
    }

    const book = await LibraryBook.create({
      title: String(title).trim(),
      author: String(author).trim(),
      category: String(category).trim(),
      accessionNumber: String(accessionNumber).trim(),
      isbn: String(isbn || "").trim(),
      publisher: String(publisher || "").trim(),
      edition: String(edition || "").trim(),
      quantity: qty,
      availableCopies: copies,
      rack: String(rack).trim(),
      shelf: String(shelf).trim(),
      status: status || (copies === 0 ? "out_of_stock" : "active"),
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
    if ((error as any)?.code === 11000) {
      return res.status(409).json({ message: "Book code/accession number already exists for this school" });
    }
    res.status(500).json({ message: "Failed to add book" });
  }
});

// ==========================
// 📖 ASSIGN BOOK TO STUDENT
// ==========================
router.post("/assign", async (req, res) => {
  try {
    const { bookId, studentId, assignDate, dueDate, returnDate, issueStatus, schoolId } = req.body;

    if (!bookId || !studentId || !schoolId) {
      return res.status(400).json({
        message: "Required fields: bookId, studentId, schoolId",
      });
    }

    const book = await LibraryBook.findById(bookId);
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    const currentAvailable =
      book.availableCopies === undefined || book.availableCopies === null
        ? Number(book.quantity || 0)
        : Number(book.availableCopies || 0);

    if (currentAvailable < 1) {
      return res.status(400).json({ message: "No copies available for assignment" });
    }

    const effectiveAssignDate = assignDate || new Date().toISOString().split("T")[0];
    const effectiveDueDate = dueDate || addDays(effectiveAssignDate, 7);
    const effectiveIssueStatus = ["issued", "returned", "overdue"].includes(String(issueStatus || ""))
      ? String(issueStatus)
      : "issued";

    const shouldDecrement = effectiveIssueStatus !== "returned";

    if (shouldDecrement && currentAvailable < 1) {
      return res.status(400).json({ message: "No copies available for assignment" });
    }

    const assignment = await LibraryAssignment.create({
      bookId,
      studentId,
      assignDate: effectiveAssignDate,
      dueDate: effectiveDueDate,
      returnDate: returnDate || "",
      issueStatus: effectiveIssueStatus,
      schoolId,
    });

    if (shouldDecrement) {
      book.availableCopies = Math.max(currentAvailable - 1, 0);
      if (book.availableCopies === 0 && book.status !== "archived") {
        book.status = "out_of_stock";
      }
      await book.save();
    }

    const populatedAssignment = await assignment.populate([
      { path: "bookId", select: "title author category rack shelf quantity availableCopies status" },
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
