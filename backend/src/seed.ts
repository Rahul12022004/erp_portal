import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import connectDB from "./config/db";
import School from "./models/School";
import Staff from "./models/Staff";
import Class from "./models/Class";
import Student from "./models/Student";
import Announcement from "./models/Announcement";
import Attendance from "./models/Attendance";
import Finance from "./models/Finance";

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const today = new Date().toISOString().split("T")[0];
const nextSixMonths = new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString().split("T")[0];
const dueInFifteenDays = new Date(new Date().setDate(new Date().getDate() + 15)).toISOString().split("T")[0];

export async function seedDatabase(connectIfNeeded = true) {
  if (connectIfNeeded) {
    await connectDB();
  }

  const schoolEmail = "demo@school.com";
  const school = await School.findOneAndUpdate(
    { "schoolInfo.email": schoolEmail },
    {
      $setOnInsert: {
      schoolInfo: {
        name: "Demo School",
        email: schoolEmail,
        phone: "+1234567890",
        website: "https://demo-school.com",
        address: "123 Demo Street",
        logo: "",
      },
      adminInfo: {
        name: "Demo Admin",
        email: schoolEmail,
        password: "I6EvD7P9#$Pe",
        phone: "+1234567890",
        status: "Active",
      },
      systemInfo: {
        schoolType: "Public",
        maxStudents: 500,
        subscriptionPlan: "Standard",
        subscriptionEndDate: nextSixMonths,
      },
      modules: [
        "Student Management",
        "Staff Management",
        "Attendance",
        "Marks & Results",
        "Announcements",
        "Leave Management",
        "Class Management",
        "Finance & Fees",
      ],
      },
    },
    { returnDocument: "after", upsert: true }
  );
  console.log("Ensured demo school:", school._id.toString());

  const teacherEmail = "teacher@demo-school.com";
  const teacher = await Staff.findOneAndUpdate(
    { email: teacherEmail, schoolId: school._id },
    {
      $setOnInsert: {
      name: "Demo Teacher",
      email: teacherEmail,
      phone: "+1234567891",
      position: "Teacher",
      department: "Science",
      qualification: "M.Sc.",
      address: "123 Demo Lane",
      dateOfBirth: "1990-08-15",
      gender: "Female",
      joinDate: today,
      status: "Active",
      schoolId: school._id,
      },
    },
    { returnDocument: "after", upsert: true }
  );
  console.log("Ensured demo teacher:", teacher._id.toString());

  const className = "10A";
  const schoolClass = await Class.findOneAndUpdate(
    { name: className, schoolId: school._id },
    {
      $setOnInsert: {
      name: className,
      section: "A",
      stream: "Science",
      classTeacher: teacher._id,
      studentCount: 3,
      academicYear: "2025-2026",
      description: "10th grade science section",
      meetLink: "https://meet.google.com/demo-class",
      schoolId: school._id,
      },
    },
    { returnDocument: "after", upsert: true }
  );
  console.log("Ensured demo class:", schoolClass._id.toString());

  const students = [
    { name: "Aanya Sharma", email: "aanya@demo-school.com", rollNumber: "10A-01" },
    { name: "Rohan Singh", email: "rohan@demo-school.com", rollNumber: "10A-02" },
    { name: "Meera Patel", email: "meera@demo-school.com", rollNumber: "10A-03" },
  ];

  for (const studentData of students) {
    await Student.findOneAndUpdate(
      { email: studentData.email, schoolId: school._id },
      {
        $setOnInsert: {
        ...studentData,
        class: className,
        classSection: "A",
        academicYear: "2025-2026",
        phone: "+1234560000",
        address: "Demo Address",
        dateOfBirth: "2011-01-01",
        gender: "Female",
        rollNumber: studentData.rollNumber,
        schoolId: school._id,
        },
      },
      { returnDocument: "after", upsert: true }
    );
    console.log("Ensured student:", studentData.name);
  }

  const announcements = [
    {
      title: "Welcome Back to School",
      message: "The 2025-2026 academic year starts next week. Please complete your registration and attend the orientation.",
      author: "Principal",
    },
    {
      title: "Staff Meeting",
      message: "Teaching staff meeting scheduled on Monday at 9 AM in the main hall.",
      author: "Principal",
    },
  ];

  for (const announcementData of announcements) {
    await Announcement.findOneAndUpdate(
      {
        schoolId: school._id,
        title: announcementData.title,
      },
      {
        $setOnInsert: {
        ...announcementData,
        schoolId: school._id,
        },
      },
      { returnDocument: "after", upsert: true }
    );
    console.log("Ensured announcement:", announcementData.title);
  }

  await Attendance.findOneAndUpdate(
    { schoolId: school._id, staffId: teacher._id, date: today },
    {
      $setOnInsert: {
      schoolId: school._id,
      staffId: teacher._id,
      date: today,
      status: "Present",
      },
    },
    { returnDocument: "after", upsert: true }
  );
  console.log("Ensured teacher attendance for today");

  const studentRecords = await Student.find({ schoolId: school._id, class: className });
  for (const studentRecord of studentRecords) {
    await Attendance.findOneAndUpdate(
      {
        schoolId: school._id,
        studentId: studentRecord._id,
        date: today,
      },
      {
        $setOnInsert: {
          schoolId: school._id,
          studentId: studentRecord._id,
          date: today,
          status: "Present",
        },
      },
      { returnDocument: "after", upsert: true }
    );
    console.log(`Ensured attendance for student ${studentRecord.name}`);
  }

  if (studentRecords[0]) {
    await Finance.findOneAndUpdate(
      { schoolId: school._id, type: "student_fee", studentId: studentRecords[0]._id },
      {
        $setOnInsert: {
      type: "student_fee",
      studentId: studentRecords[0]._id,
      amount: 12000,
      paidAmount: 6000,
      dueDate: dueInFifteenDays,
      paymentDate: today,
      status: "partial",
      description: "First term tuition fee",
      academicYear: "2025-2026",
      feeComponents: [
        { label: "Tuition", amount: 10000 },
        { label: "Books", amount: 2000 },
      ],
      paymentHistory: [
        {
          receiptNumber: "R-1001",
          transactionId: "TXN123456",
          paymentDate: today,
          amountPaid: 6000,
          sentToEmail: false,
        },
      ],
      schoolId: school._id,
        },
      },
      { returnDocument: "after", upsert: true }
    );
    console.log("Ensured finance sample record");
  }

  console.log("Seed complete. Use school admin email", schoolEmail, "and password", school.adminInfo?.password);
}

if (require.main === module) {
  seedDatabase()
    .then(async () => {
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error("Seed failed:", error);
      await mongoose.disconnect().catch(() => undefined);
      process.exit(1);
    });
}
