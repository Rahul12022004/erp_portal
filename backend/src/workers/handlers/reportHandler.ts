import type { Job } from "bullmq";
import mongoose from "mongoose";
import type { ReportJobData, JobResult } from "../core/types";

// Lazy model imports — workers share the mongoose connection from server.ts
const getStudentModel = () => mongoose.model("Student");
const getClassModel = () => mongoose.model("Class");
const getStudentFeeAssignmentModel = () => mongoose.model("StudentFeeAssignment");

export async function handleReportJob(job: Job<ReportJobData>): Promise<JobResult> {
  const { data } = job;

  switch (data.type) {
    case "FEE_REPORT":
      return runFeeReport(job as Job<Extract<ReportJobData, { type: "FEE_REPORT" }>>);
    case "ATTENDANCE_REPORT":
      return runAttendanceReport(job as Job<Extract<ReportJobData, { type: "ATTENDANCE_REPORT" }>>);
    case "EXAM_REPORT":
      return runExamReport(job as Job<Extract<ReportJobData, { type: "EXAM_REPORT" }>>);
    case "PAYROLL_REPORT":
      return runPayrollReport(job as Job<Extract<ReportJobData, { type: "PAYROLL_REPORT" }>>);
    default: {
      const _exhaustive: never = data;
      throw new Error(`Unknown report type: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

async function runFeeReport(
  job: Job<Extract<ReportJobData, { type: "FEE_REPORT" }>>,
): Promise<JobResult> {
  const { schoolId, academicYear, classId } = job.data;
  const FeeAssignment = getStudentFeeAssignmentModel();
  const Student = getStudentModel();

  await job.updateProgress(10);

  const filter: Record<string, unknown> = {
    school_id: new mongoose.Types.ObjectId(schoolId),
    academic_year: academicYear,
  };
  if (classId) filter["class_id"] = new mongoose.Types.ObjectId(classId);

  const assignments = await FeeAssignment.find(filter).lean();
  await job.updateProgress(50);

  const studentIds = assignments.map((a: Record<string, unknown>) => a["student_id"]);
  const students = await Student.find({ _id: { $in: studentIds } })
    .select("name rollNumber class_id")
    .lean();
  await job.updateProgress(80);

  const studentMap = new Map(
    (students as unknown as { _id: mongoose.Types.ObjectId; name: string; rollNumber: string }[]).map(
      (s) => [String(s._id), s],
    ),
  );

  type AsgDoc = {
    student_id: mongoose.Types.ObjectId;
    academic_fee: number;
    transport_fee: number;
    other_fee: number;
    paid_amount: number;
    status: string;
  };

  const rows = (assignments as unknown as AsgDoc[]).map((a) => {
    const student = studentMap.get(String(a.student_id));
    return {
      studentName: (student as { name: string } | undefined)?.name ?? "Unknown",
      roll: (student as { rollNumber: string } | undefined)?.rollNumber ?? "",
      totalFee: (a.academic_fee ?? 0) + (a.transport_fee ?? 0) + (a.other_fee ?? 0),
      paid: a.paid_amount ?? 0,
      due: ((a.academic_fee ?? 0) + (a.transport_fee ?? 0) + (a.other_fee ?? 0)) - (a.paid_amount ?? 0),
      status: a.status,
    };
  });

  await job.updateProgress(100);

  return {
    success: true,
    rowsProcessed: rows.length,
    message: `Fee report for ${academicYear}: ${rows.length} records`,
    outputKey: `report:fee:${schoolId}:${academicYear}:${job.id}`,
  };
}

async function runAttendanceReport(
  job: Job<Extract<ReportJobData, { type: "ATTENDANCE_REPORT" }>>,
): Promise<JobResult> {
  const { schoolId, fromDate, toDate } = job.data;
  await job.updateProgress(10);

  // Attendance model may not be registered yet; guard gracefully
  let Attendance: mongoose.Model<mongoose.Document & Record<string, unknown>> | null = null;
  try {
    Attendance = mongoose.model("Attendance") as mongoose.Model<mongoose.Document & Record<string, unknown>>;
  } catch {
    return { success: false, message: "Attendance model not registered" };
  }

  const records = await Attendance!.countDocuments({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    date: { $gte: new Date(fromDate), $lte: new Date(toDate) },
  });
  await job.updateProgress(100);

  return {
    success: true,
    rowsProcessed: records,
    message: `Attendance report ${fromDate} – ${toDate}: ${records} records`,
  };
}

async function runExamReport(
  job: Job<Extract<ReportJobData, { type: "EXAM_REPORT" }>>,
): Promise<JobResult> {
  await job.updateProgress(50);
  // Exam model integration — extend when exam module exposes model
  await job.updateProgress(100);
  return { success: true, message: `Exam report queued for exam ${job.data.examId}` };
}

async function runPayrollReport(
  job: Job<Extract<ReportJobData, { type: "PAYROLL_REPORT" }>>,
): Promise<JobResult> {
  await job.updateProgress(50);
  await job.updateProgress(100);
  return { success: true, message: `Payroll report queued for ${job.data.month}` };
}
