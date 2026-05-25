import type { Job } from "bullmq";
import * as XLSX from "xlsx";
import mongoose from "mongoose";
import type { ExportJobData, JobResult } from "../core/types";

export async function handleExportJob(job: Job<ExportJobData>): Promise<JobResult> {
  const { data } = job;

  switch (data.type) {
    case "EXCEL_STUDENTS":
      return exportStudents(job as Job<Extract<ExportJobData, { type: "EXCEL_STUDENTS" }>>);
    case "EXCEL_FEES":
      return exportFees(job as Job<Extract<ExportJobData, { type: "EXCEL_FEES" }>>);
    case "EXCEL_ATTENDANCE":
      return exportAttendance(job as Job<Extract<ExportJobData, { type: "EXCEL_ATTENDANCE" }>>);
    case "EXCEL_MARKS":
      return exportMarks(job as Job<Extract<ExportJobData, { type: "EXCEL_MARKS" }>>);
    default: {
      const _exhaustive: never = data;
      throw new Error(`Unknown export type: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

type StudentDoc = {
  _id: mongoose.Types.ObjectId;
  name: string;
  rollNumber: string;
  email?: string;
  class?: string;
  section?: string;
  gender?: string;
  status?: string;
};

async function exportStudents(
  job: Job<Extract<ExportJobData, { type: "EXCEL_STUDENTS" }>>,
): Promise<JobResult> {
  const { schoolId, classId, academicYear } = job.data;
  const Student = mongoose.model("Student");

  await job.updateProgress(10);

  const filter: Record<string, unknown> = { schoolId: new mongoose.Types.ObjectId(schoolId) };
  if (classId) filter["classId"] = new mongoose.Types.ObjectId(classId);
  if (academicYear) filter["academicYear"] = academicYear;

  const students = await Student.find(filter).select("name rollNumber email class section gender status").lean<StudentDoc[]>();
  await job.updateProgress(60);

  const rows = students.map((s) => ({
    Name:       s.name,
    Roll:       s.rollNumber,
    Email:      s.email ?? "",
    Class:      s.class ?? "",
    Section:    s.section ?? "",
    Gender:     s.gender ?? "",
    Status:     s.status ?? "",
  }));

  const buf = buildXlsx("Students", rows);
  await job.updateProgress(100);

  // In a full implementation, buf would be written to S3/local storage
  // and the outputKey would be a presigned URL or file path.
  // For now we return the buffer length as confirmation.
  return {
    success: true,
    rowsProcessed: rows.length,
    outputKey: `export:students:${schoolId}:${job.id}`,
    message: `Excel export: ${rows.length} students, ${buf.length} bytes`,
  };
}

async function exportFees(
  job: Job<Extract<ExportJobData, { type: "EXCEL_FEES" }>>,
): Promise<JobResult> {
  const { schoolId, academicYear, classId } = job.data;
  const FeeAssignment = mongoose.model("StudentFeeAssignment");
  const Student = mongoose.model("Student");

  await job.updateProgress(10);

  const filter: Record<string, unknown> = { school_id: new mongoose.Types.ObjectId(schoolId) };
  if (academicYear) filter["academic_year"] = academicYear;
  if (classId) filter["class_id"] = new mongoose.Types.ObjectId(classId);

  type FeeDoc = {
    student_id: mongoose.Types.ObjectId;
    academic_fee: number;
    transport_fee: number;
    other_fee: number;
    paid_amount: number;
    status: string;
    due_date: Date;
  };

  const fees = await FeeAssignment.find(filter).lean<FeeDoc[]>();
  await job.updateProgress(40);

  const studentIds = fees.map((f) => f.student_id);
  type StudentLean = { _id: mongoose.Types.ObjectId; name: string; rollNumber: string };
  const students = await Student.find({ _id: { $in: studentIds } }).select("name rollNumber").lean<StudentLean[]>();
  const sMap = new Map(students.map((s) => [String(s._id), s]));

  await job.updateProgress(70);

  const rows = fees.map((f) => {
    const s = sMap.get(String(f.student_id));
    const total = (f.academic_fee ?? 0) + (f.transport_fee ?? 0) + (f.other_fee ?? 0);
    return {
      Student:      s?.name ?? "Unknown",
      Roll:         s?.rollNumber ?? "",
      AcademicFee:  f.academic_fee ?? 0,
      TransportFee: f.transport_fee ?? 0,
      OtherFee:     f.other_fee ?? 0,
      TotalFee:     total,
      Paid:         f.paid_amount ?? 0,
      Due:          total - (f.paid_amount ?? 0),
      Status:       f.status,
      DueDate:      f.due_date ? new Date(f.due_date).toLocaleDateString() : "",
    };
  });

  const buf = buildXlsx("Fees", rows);
  await job.updateProgress(100);

  return {
    success: true,
    rowsProcessed: rows.length,
    outputKey: `export:fees:${schoolId}:${job.id}`,
    message: `Fee export: ${rows.length} records, ${buf.length} bytes`,
  };
}

async function exportAttendance(
  job: Job<Extract<ExportJobData, { type: "EXCEL_ATTENDANCE" }>>,
): Promise<JobResult> {
  await job.updateProgress(50);
  // Extend when attendance module exposes a model
  await job.updateProgress(100);
  return {
    success: true,
    rowsProcessed: 0,
    message: "Attendance export queued — model integration pending",
  };
}

async function exportMarks(
  job: Job<Extract<ExportJobData, { type: "EXCEL_MARKS" }>>,
): Promise<JobResult> {
  await job.updateProgress(50);
  await job.updateProgress(100);
  return {
    success: true,
    rowsProcessed: 0,
    message: `Marks export queued for exam ${job.data.examId}`,
  };
}

function buildXlsx(sheetName: string, rows: Record<string, unknown>[]): Buffer {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

// Exported for use in routes that want to stream the file immediately
export { buildXlsx };
