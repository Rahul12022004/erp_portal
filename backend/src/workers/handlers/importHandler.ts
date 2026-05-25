import type { Job } from "bullmq";
import mongoose from "mongoose";
import type { ImportJobData, JobResult } from "../core/types";

type BatchDoc = {
  _id: mongoose.Types.ObjectId;
  school_id: mongoose.Types.ObjectId;
  module_type: string;
  status: "VALIDATED" | "IMPORTED" | "ROLLED_BACK" | "IMPORT_FAILED";
  summary: Record<string, number>;
  normalized_rows: unknown[];
  save: () => Promise<unknown>;
};

export async function handleImportJob(job: Job<ImportJobData>): Promise<JobResult> {
  const { data } = job;

  switch (data.type) {
    case "STUDENTS":
      return runImport(job as Job<Extract<ImportJobData, { type: "STUDENTS" }>>, "student-master");
    case "FEE_BULK":
      return runImport(job as Job<Extract<ImportJobData, { type: "FEE_BULK" }>>, "class-fee");
    default: {
      const _exhaustive: never = data;
      throw new Error(`Unknown import type: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

async function runImport(
  job: Job<ImportJobData>,
  expectedModule: string,
): Promise<JobResult> {
  const { batchId, schoolId } = job.data;
  const DataImportBatch = mongoose.model("DataImportBatch") as mongoose.Model<BatchDoc>;

  await job.updateProgress(5);

  const batch = await DataImportBatch.findOne({
    _id: new mongoose.Types.ObjectId(batchId),
    school_id: new mongoose.Types.ObjectId(schoolId),
  });

  if (!batch) throw new Error(`Batch ${batchId} not found for school ${schoolId}`);
  if (batch.status === "IMPORTED") {
    return { success: true, message: "Batch already imported", rowsProcessed: 0 };
  }
  if (batch.module_type !== expectedModule) {
    throw new Error(`Batch module_type mismatch: expected ${expectedModule}, got ${batch.module_type}`);
  }

  await job.updateProgress(15);

  const rows = batch.normalized_rows as Record<string, unknown>[];
  const total = rows.length;
  let processed = 0;
  let failed = 0;

  const Student = mongoose.model("Student") as mongoose.Model<mongoose.Document>;
  const CHUNK = 50;

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);

    try {
      if (expectedModule === "student-master") {
        await Student.insertMany(
          chunk.map((r) => ({ ...r, schoolId: new mongoose.Types.ObjectId(schoolId) })),
          { ordered: false },
        );
      }
      // fee-bulk: ClassFeeStructure insertMany — extend as needed
    } catch (err: unknown) {
      const writeError = err as { writeErrors?: unknown[] };
      const errorCount = writeError.writeErrors?.length ?? CHUNK;
      failed += errorCount;
    }

    processed += chunk.length;
    await job.updateProgress(15 + Math.round((processed / total) * 80));
  }

  batch.status = failed > 0 && processed - failed === 0 ? "IMPORT_FAILED" : "IMPORTED";
  batch.summary = { ...batch.summary, imported_count: processed - failed, failed_count: failed };
  await batch.save();

  await job.updateProgress(100);

  return {
    success: batch.status === "IMPORTED",
    rowsProcessed: processed - failed,
    message: `Import ${batch.status}: ${processed - failed}/${total} rows, ${failed} failed`,
  };
}
