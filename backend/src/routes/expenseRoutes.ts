import express, { Request, Response, Router } from "express";
import mongoose from "mongoose";
import multer from "multer";
import Expense from "../models/Expense";
import ExpenseCategory from "../models/ExpenseCategory";
import Vendor from "../models/Vendor";
import ExpenseApprovalConfig from "../models/ExpenseApprovalConfig";
import BudgetMonitor from "../models/BudgetMonitor";
import ExpenseAuditLog from "../models/ExpenseAuditLog";
import { authenticateToken } from "../middleware/auth";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ════════════════════════════════ EXPENSES CRUD ════════════════════════════════

// Create Expense
router.post(
  "/",
  authenticateToken,
  upload.array("receipts", 5),
  async (req: Request, res: Response) => {
    try {
      const { schoolId, userId } = req as any;
      const {
        expenseDate,
        title,
        description,
        notes,
        categoryId,
        subcategory,
        department,
        expenseType,
        amount,
        paymentMode,
        transactionReferenceNumber,
        billNumber,
        vendorId,
        vendorName,
        isRecurring,
        recurringFrequency,
        recurringEndDate,
      } = req.body;

      // Validate required fields
      if (!title || !categoryId || !amount || !paymentMode) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Prepare receipt URLs
      const receipts = (req.files as Express.Multer.File[])?.map((file) => ({
        url: `/uploads/expenses/${schoolId}/${Date.now()}_${file.originalname}`,
        fileName: file.originalname,
        uploadedAt: new Date(),
      })) || [];

      const expense = new Expense({
        schoolId,
        expenseDate: new Date(expenseDate),
        title,
        description,
        notes,
        categoryId,
        subcategory,
        department,
        expenseType,
        amount: Number(amount),
        paymentMode,
        transactionReferenceNumber,
        billNumber,
        vendorId: vendorId || null,
        vendorName,
        receipts,
        recordedBy: userId,
        recordedDate: new Date(),
        isRecurring: Boolean(isRecurring),
        recurringFrequency: isRecurring ? recurringFrequency : undefined,
        recurringEndDate: isRecurring ? new Date(recurringEndDate) : undefined,
        status: "draft",
      });

      await expense.save();

      // Create audit log
      await ExpenseAuditLog.create({
        expenseId: expense._id,
        schoolId,
        action: "created",
        performedBy: userId,
        newValues: expense.toObject(),
      });

      res.status(201).json({
        success: true,
        message: "Expense created successfully",
        expense,
      });
    } catch (error) {
      console.error("Error creating expense:", error);
      res.status(500).json({ error: "Failed to create expense" });
    }
  }
);

// Get All Expenses with Filters
router.get("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { schoolId } = req as any;
    const {
      startDate,
      endDate,
      categoryId,
      vendorId,
      paymentMode,
      status,
      department,
      minAmount,
      maxAmount,
      page = 1,
      limit = 20,
    } = req.query;

    const filter: any = { schoolId };

    if (startDate || endDate) {
      filter.expenseDate = {};
      if (startDate) filter.expenseDate.$gte = new Date(startDate as string);
      if (endDate) filter.expenseDate.$lte = new Date(endDate as string);
    }

    if (categoryId) filter.categoryId = categoryId;
    if (vendorId) filter.vendorId = vendorId;
    if (paymentMode) filter.paymentMode = paymentMode;
    if (status) filter.status = status;
    if (department) filter.department = department;

    if (minAmount || maxAmount) {
      filter.amount = {};
      if (minAmount) filter.amount.$gte = Number(minAmount);
      if (maxAmount) filter.amount.$lte = Number(maxAmount);
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const expenses = await Expense.find(filter)
      .populate("categoryId", "name code")
      .populate("vendorId", "name vendorCode")
      .populate("recordedBy", "name email")
      .sort({ expenseDate: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Expense.countDocuments(filter);

    res.json({
      success: true,
      expenses,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});

// Get Expense by ID
router.get("/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate("categoryId")
      .populate("vendorId")
      .populate("recordedBy", "name email");

    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }

    res.json({ success: true, expense });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch expense" });
  }
});

// Update Expense
router.put("/:id", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { schoolId, userId } = req as any;
    const expense = await Expense.findOne({
      _id: req.params.id,
      schoolId,
    });

    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }

    const previousValues = expense.toObject();
    const updates = req.body;

    Object.assign(expense, updates);
    expense.updatedBy = userId;

    await expense.save();

    // Create audit log
    await ExpenseAuditLog.create({
      expenseId: expense._id,
      schoolId,
      action: "edited",
      performedBy: userId,
      previousValues,
      newValues: expense.toObject(),
      changedFields: Object.keys(updates),
    });

    res.json({
      success: true,
      message: "Expense updated successfully",
      expense,
    });
  } catch (error) {
    console.error("Error updating expense:", error);
    res.status(500).json({ error: "Failed to update expense" });
  }
});

// Submit Expense for Approval
router.put("/:id/submit", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { schoolId, userId } = req as any;
    const expense = await Expense.findOne({
      _id: req.params.id,
      schoolId,
    });

    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }

    const previousStatus = expense.status;
    expense.status = "submitted";
    expense.updatedBy = userId;
    await expense.save();

    // Create audit log
    await ExpenseAuditLog.create({
      expenseId: expense._id,
      schoolId,
      action: "submitted",
      performedBy: userId,
      changedFields: ["status"],
    });

    res.json({
      success: true,
      message: "Expense submitted for approval",
      expense,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to submit expense" });
  }
});

// ════════════════════════════════ APPROVAL WORKFLOW ════════════════════════════════

// Approve Expense
router.put("/:id/approve", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { schoolId, userId } = req as any;
    const { remarks, approvalLevel } = req.body;

    const expense = await Expense.findOne({
      _id: req.params.id,
      schoolId,
    });

    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }

    expense.approvalHistory.push({
      approvedBy: userId,
      approvalDate: new Date(),
      remarks,
      level: approvalLevel || expense.approvalLevel + 1,
    });

    // Determine if final approval
    const config = await ExpenseApprovalConfig.findOne({ schoolId });
    const maxLevel = config?.approvalLevels?.length || 1;

    if ((approvalLevel || expense.approvalLevel + 1) >= maxLevel) {
      expense.status = "approved";
    } else {
      expense.status = "pending_approval";
      expense.approvalLevel = (approvalLevel || expense.approvalLevel) + 1;
    }

    expense.updatedBy = userId;
    await expense.save();

    // Create audit log
    await ExpenseAuditLog.create({
      expenseId: expense._id,
      schoolId,
      action: "approved",
      performedBy: userId,
      remarks,
      approvalLevel: approvalLevel || expense.approvalLevel,
    });

    res.json({
      success: true,
      message: "Expense approved successfully",
      expense,
    });
  } catch (error) {
    console.error("Error approving expense:", error);
    res.status(500).json({ error: "Failed to approve expense" });
  }
});

// Reject Expense
router.put("/:id/reject", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { schoolId, userId } = req as any;
    const { rejectionReason } = req.body;

    const expense = await Expense.findOne({
      _id: req.params.id,
      schoolId,
    });

    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }

    expense.status = "rejected";
    expense.rejectionReason = rejectionReason;
    expense.rejectedBy = userId;
    expense.updatedBy = userId;
    await expense.save();

    // Create audit log
    await ExpenseAuditLog.create({
      expenseId: expense._id,
      schoolId,
      action: "rejected",
      performedBy: userId,
      remarks: rejectionReason,
    });

    res.json({
      success: true,
      message: "Expense rejected",
      expense,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to reject expense" });
  }
});

// ════════════════════════════════ CATEGORIES ════════════════════════════════

// Create Category
router.post("/categories", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { schoolId, userId } = req as any;
    const { code, name, description, type, budgetLimit, status } = req.body;

    const category = new ExpenseCategory({
      schoolId,
      code: code.toUpperCase(),
      name,
      description,
      type,
      budgetLimit,
      status,
      createdBy: userId,
    });

    await category.save();
    res.status(201).json({ success: true, category });
  } catch (error) {
    res.status(500).json({ error: "Failed to create category" });
  }
});

// Get Categories
router.get("/categories/list", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { schoolId } = req as any;
    const { status } = req.query;

    const filter: any = { schoolId };
    if (status) filter.status = status;

    const categories = await ExpenseCategory.find(filter)
      .populate("parentCategory", "name code")
      .sort({ name: 1 });

    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// ════════════════════════════════ VENDORS ════════════════════════════════

// Create Vendor
router.post("/vendors", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { schoolId, userId } = req as any;
    const vendorData = req.body;

    const vendor = new Vendor({
      ...vendorData,
      schoolId,
      createdBy: userId,
    });

    await vendor.save();
    res.status(201).json({ success: true, vendor });
  } catch (error) {
    res.status(500).json({ error: "Failed to create vendor" });
  }
});

// Get Vendors
router.get("/vendors/list", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { schoolId } = req as any;
    const { status, search, page = 1, limit = 20 } = req.query;

    const filter: any = { schoolId };
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { vendorCode: { $regex: search, $options: "i" } },
      ];
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const vendors = await Vendor.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Vendor.countDocuments(filter);

    res.json({
      success: true,
      vendors,
      pagination: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch vendors" });
  }
});

// ════════════════════════════════ BUDGET MONITORING ════════════════════════════════

// Create/Update Budget
router.post("/budget", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { schoolId, userId } = req as any;
    const { fiscalYear, budgetType, budgets, totalBudget } = req.body;

    let budget = await BudgetMonitor.findOne({
      schoolId,
      fiscalYear,
      budgetType,
    });

    if (!budget) {
      budget = new BudgetMonitor({
        schoolId,
        fiscalYear,
        budgetType,
        budgets,
        totalBudget,
        createdBy: userId,
      });
    } else {
      budget.budgets = budgets;
      budget.totalBudget = totalBudget;
      budget.updatedBy = userId;
    }

    await budget.save();
    res.json({ success: true, budget });
  } catch (error) {
    res.status(500).json({ error: "Failed to save budget" });
  }
});

// Get Budget Status
router.get("/budget/status", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { schoolId } = req as any;
    const { fiscalYear, budgetType } = req.query;

    const budget = await BudgetMonitor.findOne({
      schoolId,
      fiscalYear,
      budgetType,
    })
      .populate("budgets.categoryId", "name code")
      .lean();

    if (!budget) {
      return res.status(404).json({ error: "Budget not found" });
    }

    res.json({ success: true, budget });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch budget" });
  }
});

// ════════════════════════════════ AUDIT LOG ════════════════════════════════

// Get Audit Log
router.get("/audit/:expenseId", authenticateToken, async (req: Request, res: Response) => {
  try {
    const auditLogs = await ExpenseAuditLog.find({
      expenseId: req.params.expenseId,
    })
      .populate("performedBy", "name email")
      .sort({ performedDate: -1 });

    res.json({ success: true, auditLogs });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch audit log" });
  }
});

// ════════════════════════════════ DASHBOARD & REPORTS ════════════════════════════════

// Get Dashboard Summary
router.get("/dashboard/summary", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { schoolId } = req as any;
    const { startDate, endDate } = req.query;

    const dateFilter: any = { schoolId };
    if (startDate || endDate) {
      dateFilter.expenseDate = {};
      if (startDate) dateFilter.expenseDate.$gte = new Date(startDate as string);
      if (endDate) dateFilter.expenseDate.$lte = new Date(endDate as string);
    }

    // This month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const thisMonthFilter = {
      ...dateFilter,
      expenseDate: { $gte: monthStart, $lte: monthEnd },
      status: "approved",
    };

    const totalExpensesThisMonth = await Expense.aggregate([
      { $match: thisMonthFilter },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const approvedExpenses = await Expense.countDocuments({
      schoolId,
      status: "approved",
    });

    const pendingApproval = await Expense.countDocuments({
      schoolId,
      status: { $in: ["submitted", "pending_approval"] },
    });

    const cashExpenses = await Expense.aggregate([
      {
        $match: { schoolId, paymentMode: "cash", status: "approved" },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const bankExpenses = await Expense.aggregate([
      {
        $match: {
          schoolId,
          paymentMode: { $in: ["bank_transfer", "upi", "credit_card"] },
          status: "approved",
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const topCategories = await Expense.aggregate([
      { $match: { schoolId, status: "approved" } },
      { $group: { _id: "$categoryId", total: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "expensecategories",
          localField: "_id",
          foreignField: "_id",
          as: "category",
        },
      },
    ]);

    res.json({
      success: true,
      summary: {
        totalExpensesThisMonth: totalExpensesThisMonth[0]?.total || 0,
        approvedExpensesCount: approvedExpenses,
        pendingApprovalCount: pendingApproval,
        cashExpenses: cashExpenses[0]?.total || 0,
        bankExpenses: bankExpenses[0]?.total || 0,
        topCategories,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

export default router;
