import SalaryStructure from "../models/SalaryStructure";
import { Types } from "mongoose";

export interface ISalaryStructure {
  _id?: Types.ObjectId;
  structureName: string;
  position: string;
  earnings: Array<{ label: string; amount: number }>;
  deductions: Array<{ label: string; type: "percentage" | "amount"; value: number }>;
  presentDays: number;
  absentDays: number;
  status: "Active" | "Inactive";
  schoolId: Types.ObjectId;
}

export interface ISalaryCalculation {
  grossSalary: number;
  deductionBreakdown: Array<{ label: string; amount: number }>;
  totalDeductions: number;
  netSalary: number;
}

class SalaryStructureService {
  /**
   * Get all salary structures for a school
   */
  async getSalaryStructures(schoolId: string) {
    return await SalaryStructure.find({ schoolId }).sort({ createdAt: -1 });
  }

  /**
   * Get salary structure by ID
   */
  async getSalaryStructureById(id: string) {
    return await SalaryStructure.findById(id);
  }

  /**
   * Get salary structure by position and school
   */
  async getSalaryStructureByPosition(schoolId: string, position: string) {
    return await SalaryStructure.findOne({
      schoolId,
      position: { $regex: position, $options: "i" },
      status: "Active",
    });
  }

  /**
   * Create a new salary structure
   */
  async createSalaryStructure(data: ISalaryStructure) {
    const salaryStructure = new SalaryStructure(data);
    return await salaryStructure.save();
  }

  /**
   * Update salary structure
   */
  async updateSalaryStructure(id: string, data: Partial<ISalaryStructure>) {
    return await SalaryStructure.findByIdAndUpdate(id, data, { new: true });
  }

  /**
   * Delete salary structure
   */
  async deleteSalaryStructure(id: string) {
    return await SalaryStructure.findByIdAndDelete(id);
  }

  /**
   * Calculate salary based on structure
   * @param structure Salary structure document
   * @returns Salary calculation breakdown
   */
  calculateSalary(structure: ISalaryStructure): ISalaryCalculation {
    // Calculate gross salary (sum of all earnings)
    const grossSalary = structure.earnings.reduce((sum, component) => sum + Number(component.amount), 0);

    // Calculate deductions (both percentage and fixed amounts)
    const deductionBreakdown = structure.deductions.map((component) => {
      let amount = 0;
      if (component.type === "percentage") {
        amount = (grossSalary * Number(component.value)) / 100;
      } else if (component.type === "amount") {
        amount = Number(component.value);
      }
      return {
        label: component.label,
        amount: amount,
      };
    });

    // Calculate total deductions
    const totalDeductions = deductionBreakdown.reduce((sum, component) => sum + component.amount, 0);

    // Calculate net salary
    const netSalary = grossSalary - totalDeductions;

    return {
      grossSalary,
      deductionBreakdown,
      totalDeductions,
      netSalary,
    };
  }

  /**
   * Get detailed salary slip for display
   */
  async getSalarySummary(salaryStructureId: string) {
    const structure = await this.getSalaryStructureById(salaryStructureId);
    if (!structure) throw new Error("Salary structure not found");
    return this.calculateSalary(structure as ISalaryStructure);
  }
}

export default new SalaryStructureService();
