import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import connectDB, { getDatabaseStatus } from "./config/db";
import School from "./models/School";

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const DEMO_SCHOOL_ID = "69c7ec870d7e01a1f062018e";
const DEMO_SCHOOL_EMAILS = ["demo@school.com", "school@demo.com"];
const DEMO_STAFF_EMAILS = [
  "teacher@demo-school.com",
  "rajesh.kumar@demo-school.com",
  "sunita.verma@demo-school.com",
  "amit.sharma@demo-school.com",
  "priya.nair@demo-school.com",
  "vikram.joshi@demo-school.com",
  "kavitha.reddy@demo-school.com",
  "deepak.mehta@demo-school.com",
  "ananya.singh@demo-school.com",
  "suresh.pillai@demo-school.com",
  "meenakshi.iyer@demo-school.com",
];
const DEMO_STUDENT_EMAILS = [
  "aanya@demo-school.com",
  "rohan@demo-school.com",
  "meera@demo-school.com",
];

async function removeDemoData() {
  await connectDB();
  const dbStatus = getDatabaseStatus();

  if (!dbStatus.connected) {
    throw new Error("Database is not connected. Unable to remove demo data.");
  }

  const schoolIds = new Set<string>();
  schoolIds.add(DEMO_SCHOOL_ID);

  const demoSchools = await School.find({
    $or: [
      { "schoolInfo.email": { $in: DEMO_SCHOOL_EMAILS } },
      { "schoolInfo.name": /demo school/i },
    ],
  }).select("_id");

  for (const school of demoSchools) {
    schoolIds.add(String(school._id));
  }

  const objectIds = Array.from(schoolIds)
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (objectIds.length === 0) {
    console.log("No demo school IDs found to purge.");
    return;
  }

  const collections = mongoose.connection.db ? await mongoose.connection.db.collections() : null;
  if (!collections) {
    throw new Error("Unable to access database collections.");
  }

  for (const collection of collections) {
    const name = collection.collectionName;
    if (name === "schools") {
      continue;
    }

    const result = await collection.deleteMany({
      $or: [
        { schoolId: { $in: objectIds } },
        { school_id: { $in: objectIds } },
      ],
    });

    if (result.deletedCount > 0) {
      console.log(`Removed ${result.deletedCount} records from ${name}`);
    }
  }

  // Remove orphaned demo identities by explicit emails as a safety net.
  const db = mongoose.connection.db;
  if (db) {
    const staffDeleted = await db.collection("staff").deleteMany({ email: { $in: DEMO_STAFF_EMAILS } });
    if (staffDeleted.deletedCount > 0) {
      console.log(`Removed ${staffDeleted.deletedCount} demo staff records by email`);
    }

    const studentsDeleted = await db.collection("students").deleteMany({ email: { $in: DEMO_STUDENT_EMAILS } });
    if (studentsDeleted.deletedCount > 0) {
      console.log(`Removed ${studentsDeleted.deletedCount} demo student records by email`);
    }
  }

  const schoolsDeleted = await School.deleteMany({ _id: { $in: objectIds } });
  console.log(`Removed ${schoolsDeleted.deletedCount} demo school records`);
}

removeDemoData()
  .then(async () => {
    console.log("Demo data cleanup complete.");
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Demo cleanup failed:", error instanceof Error ? error.message : String(error));
    await mongoose.disconnect().catch(() => undefined);
    process.exit(1);
  });
