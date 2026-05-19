import express, { type Request, type Response } from "express";
import { Types } from "mongoose";
import salaryStructureService, { type ISalaryStructure } from "../services/salaryStructureService";

const router = express.Router();

type SalaryEarningInput = ISalaryStructure["earnings"][number];
type SalaryDeductionInput = ISalaryStructure["deductions"][number];

type SalaryStructureParams = {
  schoolId: string;
};

type SalaryStructureWithIdParams = {
  schoolId: string;
  id: string;
};

type CreateSalaryStructureBody = {
  structureName?: string;
  position?: string;
  earnings?: SalaryEarningInput[];
  deductions?: SalaryDeductionInput[];
};

type UpdateSalaryStructureBody = Partial<CreateSalaryStructureBody> & {
  status?: ISalaryStructure["status"];
};

const isValidEarning = (earning: SalaryEarningInput) =>
  Boolean(earning.label) && earning.amount !== undefined;

const isValidDeduction = (deduction: SalaryDeductionInput) =>
  Boolean(deduction.label) && deduction.type !== undefined && deduction.value !== undefined;

const isValidDeductionType = (deduction: SalaryDeductionInput) =>
  ["percentage", "amount"].includes(deduction.type);

const isValidPercentageDeduction = (deduction: SalaryDeductionInput) =>
  deduction.type !== "percentage" || (Number(deduction.value) >= 0 && Number(deduction.value) <= 100);

const isValidAmountDeduction = (deduction: SalaryDeductionInput) =>
  deduction.type !== "amount" || Number(deduction.value) >= 0;

/**
 * GET /api/salary-structures/:schoolId
 * Get all salary structures for a school
 */
router.get("/:schoolId", async (req: Request<SalaryStructureParams>, res: Response) => {
  try {
    const { schoolId } = req.params;
    const structures = await salaryStructureService.getSalaryStructures(schoolId);
    res.json(structures);
  } catch (error) {
    console.error("Error fetching salary structures:", error);
    res.status(500).json({ error: "Failed to fetch salary structures" });
  }
});

/**
 * GET /api/salary-structures/:schoolId/:id
 * Get a specific salary structure by ID
 */
router.get("/:schoolId/:id", async (req: Request<SalaryStructureWithIdParams>, res: Response) => {
  try {
    const { id } = req.params;
    const structure = await salaryStructureService.getSalaryStructureById(id);
    if (!structure) {
      return res.status(404).json({ error: "Salary structure not found" });
    }
    res.json(structure);
  } catch (error) {
    console.error("Error fetching salary structure:", error);
    res.status(500).json({ error: "Failed to fetch salary structure" });
  }
});

/**
 * POST /api/salary-structures/:schoolId
 * Create a new salary structure
 */
router.post("/:schoolId", async (req: Request<SalaryStructureParams, unknown, CreateSalaryStructureBody>, res: Response) => {
  try {
    const { schoolId } = req.params;
    const { structureName, position, earnings, deductions } = req.body;

    if (!Types.ObjectId.isValid(schoolId)) {
      return res.status(400).json({ error: "Invalid school ID." });
    }

    // Validation
    if (!structureName || !position || !Array.isArray(earnings) || !Array.isArray(deductions)) {
      return res.status(400).json({
        error: "Missing required fields: structureName, position, earnings, deductions",
      });
    }

    // Validate earnings format
    if (earnings.some((earning) => !isValidEarning(earning))) {
      return res.status(400).json({ error: "Invalid earnings format. Each earning must have label and amount." });
    }

    // Validate deductions format
    if (deductions.some((deduction) => !isValidDeduction(deduction))) {
      return res.status(400).json({
        error: "Invalid deductions format. Each deduction must have label, type (percentage/amount), and value.",
      });
    }

    // Validate type
    if (deductions.some((deduction) => !isValidDeductionType(deduction))) {
      return res.status(400).json({ error: "Deduction type must be 'percentage' or 'amount'." });
    }

    // Validate percentage values
    if (deductions.some((deduction) => !isValidPercentageDeduction(deduction))) {
      return res.status(400).json({ error: "Percentage deductions must be between 0 and 100." });
    }

    // Validate amount values
    if (deductions.some((deduction) => !isValidAmountDeduction(deduction))) {
      return res.status(400).json({ error: "Amount deductions must be greater than or equal to 0." });
    }

    const structure = await salaryStructureService.createSalaryStructure({
      schoolId: new Types.ObjectId(schoolId),
      structureName,
      position,
      earnings,
      deductions,
      presentDays: 0,
      absentDays: 0,
      status: "Active",
    });

    res.status(201).json(structure);
  } catch (error) {
    console.error("Error creating salary structure:", error);
    res.status(500).json({ error: "Failed to create salary structure" });
  }
});

/**
 * PUT /api/salary-structures/:schoolId/:id
 * Update a salary structure
 */
router.put("/:schoolId/:id", async (req: Request<SalaryStructureWithIdParams, unknown, UpdateSalaryStructureBody>, res: Response) => {
  try {
    const { schoolId, id } = req.params;
    const { structureName, position, earnings, deductions, status } = req.body;

    if (!Types.ObjectId.isValid(schoolId)) {
      return res.status(400).json({ error: "Invalid school ID." });
    }

    // Validation
    if (earnings && !Array.isArray(earnings)) {
      return res.status(400).json({ error: "Earnings must be an array." });
    }

    if (deductions && !Array.isArray(deductions)) {
      return res.status(400).json({ error: "Deductions must be an array." });
    }

    if (earnings && earnings.some((earning) => !isValidEarning(earning))) {
      return res.status(400).json({ error: "Invalid earnings format. Each earning must have label and amount." });
    }

    if (deductions && deductions.some((deduction) => !isValidDeduction(deduction))) {
      return res.status(400).json({
        error: "Invalid deductions format. Each deduction must have label, type (percentage/amount), and value.",
      });
    }

    if (deductions && deductions.some((deduction) => !isValidDeductionType(deduction))) {
      return res.status(400).json({ error: "Deduction type must be 'percentage' or 'amount'." });
    }

    if (deductions && deductions.some((deduction) => !isValidPercentageDeduction(deduction))) {
      return res.status(400).json({ error: "Percentage deductions must be between 0 and 100." });
    }

    if (deductions && deductions.some((deduction) => !isValidAmountDeduction(deduction))) {
      return res.status(400).json({ error: "Amount deductions must be greater than or equal to 0." });
    }

    const updateData: Partial<Pick<ISalaryStructure, "structureName" | "position" | "earnings" | "deductions" | "status">> = {};
    if (structureName !== undefined) updateData.structureName = structureName;
    if (position !== undefined) updateData.position = position;
    if (earnings !== undefined) updateData.earnings = earnings;
    if (deductions !== undefined) updateData.deductions = deductions;
    if (status !== undefined) updateData.status = status;

    const structure = await salaryStructureService.updateSalaryStructure(id, updateData);
    if (!structure) {
      return res.status(404).json({ error: "Salary structure not found" });
    }

    res.json(structure);
  } catch (error) {
    console.error("Error updating salary structure:", error);
    res.status(500).json({ error: "Failed to update salary structure" });
  }
});

/**
 * DELETE /api/salary-structures/:schoolId/:id
 * Delete a salary structure
 */
router.delete("/:schoolId/:id", async (req: Request<SalaryStructureWithIdParams>, res: Response) => {
  try {
    const { id } = req.params;
    const structure = await salaryStructureService.deleteSalaryStructure(id);
    if (!structure) {
      return res.status(404).json({ error: "Salary structure not found" });
    }
    res.json({ message: "Salary structure deleted successfully" });
  } catch (error) {
    console.error("Error deleting salary structure:", error);
    res.status(500).json({ error: "Failed to delete salary structure" });
  }
});

/**
 * POST /api/salary-structures/:schoolId/:id/calculate
 * Calculate salary based on the structure
 */
router.post("/:schoolId/:id/calculate", async (req: Request<SalaryStructureWithIdParams>, res: Response) => {
  try {
    const { id } = req.params;
    const structure = await salaryStructureService.getSalaryStructureById(id);
    if (!structure) {
      return res.status(404).json({ error: "Salary structure not found" });
    }
    const calculation = salaryStructureService.calculateSalary(structure.toObject());
    res.json(calculation);
  } catch (error) {
    console.error("Error calculating salary:", error);
    res.status(500).json({ error: "Failed to calculate salary" });
  }
});

export default router;
