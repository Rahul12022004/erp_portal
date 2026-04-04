import mongoose from "mongoose";
import Student from "../models/Student";
import ClassFeeStructure from "../models/ClassFeeStructure";
import StudentFeeAssignment from "../models/StudentFeeAssignment";
import StudentFeePayment from "../models/StudentFeePayment";

const SCHOOL_ID = "69c7ec870d7e01a1f062018e"; // Demo School

export async function seedFinanceData() {
  console.log("🌱 Starting Finance Data Seeding...");
  try {
    const schoolObjectId = new mongoose.Types.ObjectId(SCHOOL_ID);

    // 1. Get students
    const students = await Student.find({ schoolId: schoolObjectId }).limit(5);
    console.log(`Found ${students.length} existing students`);

    if (students.length < 2) {
      console.log("⚠️ Not enough students to seed finance data");
      return;
    }

    // 2. Create class fee structures
    // @ts-expect-error Mongoose model query typing mismatch for legacy snake_case fields.
    const existingStructures = await ClassFeeStructure.find({
      school_id: schoolObjectId
    });

    if (existingStructures.length === 0) {
      console.log("📋 Creating class fee structures...");
      const structuresData = [{
        school_id: schoolObjectId,
        class_id: "10A",
        section_id: null,
        academic_year: "2025-2026",
        academic_fee: 50000,
        default_transport_fee: 5000,
        other_fee: 1000,
        due_date: "2026-04-30",
        is_active: true,
        created_by: null,
      }];

      await ClassFeeStructure.insertMany(structuresData);
      console.log("✅ Created class fee structures");
    }

    // 3. Create student fee assignments
    // @ts-expect-error Mongoose model query typing mismatch for legacy snake_case fields.
    const existingAssignments = await StudentFeeAssignment.find({
      school_id: schoolObjectId
    });

    if (existingAssignments.length === 0) {
      console.log("💰 Creating student fee assignments...");
      // @ts-expect-error Mongoose model query typing mismatch for legacy snake_case fields.
      const structures = await ClassFeeStructure.find({
        school_id: schoolObjectId
      });

      if (structures.length === 0) {
        console.log("⚠️ No class fee structures found");
        return;
      }

      const structure = structures[0];
      const assignmentData = students.map((student) => {
        const academicFee = structure.academic_fee;
        const transportFee = student.transport_status === "ACTIVE" ? structure.default_transport_fee : 0;
        const otherFee = structure.other_fee;
        const totalFee = academicFee + transportFee + otherFee;
        const paidAmount = Math.floor(Math.random() * (totalFee * 0.7));

        return {
          school_id: schoolObjectId,
          student_id: student._id,
          class_fee_structure_id: structure._id,
          academic_year: "2025-2026",
          academic_fee: academicFee,
          transport_fee: transportFee,
          other_fee: otherFee,
          discount_amount: 0,
          total_fee: totalFee,
          paid_amount: paidAmount,
          due_amount: Math.max(totalFee - paidAmount, 0),
          fee_status: paidAmount === 0 ? "UNPAID" : paidAmount >= totalFee ? "PAID" : "PARTIAL",
          due_date: structure.due_date,
          last_payment_date: paidAmount > 0 ? new Date().toISOString().split("T")[0] : null,
        };
      });

      await StudentFeeAssignment.insertMany(assignmentData);
      console.log(`✅ Created ${assignmentData.length} student fee assignments`);
    }

    // 4. Create sample payments
    // @ts-expect-error Mongoose model query typing mismatch for legacy snake_case fields.
    const existingPayments = await StudentFeePayment.find({
      school_id: schoolObjectId
    });

    if (existingPayments.length === 0) {
      console.log("💳 Creating sample payments...");
      // @ts-expect-error Mongoose model query typing mismatch for legacy snake_case fields.
      const assignments = await StudentFeeAssignment.find({
        school_id: schoolObjectId,
        paid_amount: { $gt: 0 }
      }).limit(3);

      const paymentData = assignments.map((assignment) => ({
        school_id: schoolObjectId,
        student_fee_assignment_id: assignment._id,
        student_id: assignment.student_id,
        payment_date: new Date().toISOString().split("T")[0],
        payment_amount: assignment.paid_amount,
        payment_mode: "cash",
        reference_no: `REF-${Math.random().toString(36).substr(2, 9)}`,
        remarks: "Partial payment",
        receipt_no: `RCP-${SCHOOL_ID.slice(-6)}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        created_by: null,
      }));

      if (paymentData.length > 0) {
        await StudentFeePayment.insertMany(paymentData);
        console.log(`✅ Created ${paymentData.length} payments`);
      }
    }

    console.log("🎉 Finance seeding complete!");
  } catch (error) {
    console.error("❌ Finance seeding error:", error instanceof Error ? error.message : error);
  }
}
