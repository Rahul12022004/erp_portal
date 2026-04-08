import mongoose from "mongoose";
import connectDB from "./config/db";
import { loadEnvironment } from "./config/env";
import School from "./models/School";
import Staff from "./models/Staff";
import Class from "./models/Class";
import Student from "./models/Student";
import Announcement from "./models/Announcement";
import Attendance from "./models/Attendance";
import Finance from "./models/Finance";
import InvestorLedger from "./models/InvestorLedger";
import { seedFinanceData } from "./seeds/financeSeeds";

loadEnvironment();

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
      $set: {
        bankName: "State Bank of India",
        accountNumber: "110011001100",
        ifscCode: "SBIN0000456",
        accountHolderName: "Demo Teacher",
      },
    },
    { returnDocument: "after", upsert: true }
  );
  console.log("Ensured demo teacher:", teacher._id.toString());

  const demoStaffList = [
    { name: "Rajesh Kumar",    email: "rajesh.kumar@demo-school.com",    phone: "+9101234001", position: "Principal",           department: "Administration", qualification: "M.Ed.",    gender: "Male",   dateOfBirth: "1975-03-10", bankName: "HDFC Bank", accountNumber: "110011001101", ifscCode: "HDFC0001122" },
    { name: "Sunita Verma",    email: "sunita.verma@demo-school.com",    phone: "+9101234002", position: "HOD",                 department: "Mathematics",    qualification: "M.Sc.",    gender: "Female", dateOfBirth: "1982-07-22", bankName: "ICICI Bank", accountNumber: "110011001102", ifscCode: "ICIC0002233" },
    { name: "Amit Sharma",     email: "amit.sharma@demo-school.com",     phone: "+9101234003", position: "Teacher",             department: "Mathematics",    qualification: "B.Ed.",    gender: "Male",   dateOfBirth: "1990-11-05", bankName: "SBI", accountNumber: "110011001103", ifscCode: "SBIN0003344" },
    { name: "Priya Nair",      email: "priya.nair@demo-school.com",      phone: "+9101234004", position: "Teacher",             department: "English",        qualification: "M.A.",     gender: "Female", dateOfBirth: "1988-05-14", bankName: "Axis Bank", accountNumber: "110011001104", ifscCode: "UTIB0004455" },
    { name: "Vikram Joshi",    email: "vikram.joshi@demo-school.com",    phone: "+9101234005", position: "HOD",                 department: "Science",        qualification: "M.Sc.",    gender: "Male",   dateOfBirth: "1980-09-28", bankName: "PNB", accountNumber: "110011001105", ifscCode: "PUNB0005566" },
    { name: "Kavitha Reddy",   email: "kavitha.reddy@demo-school.com",   phone: "+9101234006", position: "Teacher",             department: "Science",        qualification: "B.Sc. B.Ed.", gender: "Female", dateOfBirth: "1993-01-17", bankName: "Canara Bank", accountNumber: "110011001106", ifscCode: "CNRB0006677" },
    { name: "Deepak Mehta",    email: "deepak.mehta@demo-school.com",    phone: "+9101234007", position: "Teacher",             department: "Social Studies", qualification: "M.A.",     gender: "Male",   dateOfBirth: "1987-04-30", bankName: "Bank of Baroda", accountNumber: "110011001107", ifscCode: "BARB0007788" },
    { name: "Ananya Singh",    email: "ananya.singh@demo-school.com",    phone: "+9101234008", position: "Librarian",           department: "Library",        qualification: "B.Lib.",   gender: "Female", dateOfBirth: "1986-12-03", bankName: "Union Bank", accountNumber: "110011001108", ifscCode: "UBIN0008899" },
    { name: "Suresh Pillai",   email: "suresh.pillai@demo-school.com",   phone: "+9101234009", position: "Accountant",          department: "Finance",        qualification: "B.Com.",   gender: "Male",   dateOfBirth: "1984-06-19", bankName: "IDBI Bank", accountNumber: "110011001109", ifscCode: "IBKL0009900" },
    { name: "Meenakshi Iyer",  email: "meenakshi.iyer@demo-school.com",  phone: "+9101234010", position: "Physical Education", department: "Sports",         qualification: "B.P.Ed.",  gender: "Female", dateOfBirth: "1991-08-08", bankName: "Kotak", accountNumber: "110011001110", ifscCode: "KKBK0001010" },
  ];

  for (const staffData of demoStaffList) {
    const { bankName, accountNumber, ifscCode, ...staffProfile } = staffData;
    await Staff.findOneAndUpdate(
      { email: staffData.email, schoolId: school._id },
      {
        $setOnInsert: {
          ...staffProfile,
          joinDate: today,
          status: "Active",
          address: "Demo Street, School City",
          schoolId: school._id,
        },
        $set: {
          bankName: staffData.bankName,
          accountNumber: staffData.accountNumber,
          ifscCode: staffData.ifscCode,
          accountHolderName: staffData.name,
        },
      },
      { returnDocument: "after", upsert: true }
    );
    console.log("Ensured staff:", staffData.name, `(${staffData.position})`);
  }

  // Seed salary Finance records for all staff (including original demo teacher)
  const allStaff = await Staff.find({ schoolId: school._id }).select("_id name position");
  const salariesByPosition: Record<string, number> = {
    Principal: 80000,
    HOD: 60000,
    Teacher: 45000,
    Librarian: 35000,
    Accountant: 40000,
    "Physical Education": 38000,
  };

  for (const staffMember of allStaff) {
    const monthSalary = salariesByPosition[staffMember.position] ?? 45000;
    const isPrincipal = staffMember.position === "Principal";
    const paidAmount = isPrincipal ? monthSalary : Math.floor(monthSalary * 0.5);
    const status: "paid" | "partial" | "pending" = isPrincipal ? "paid" : paidAmount > 0 ? "partial" : "pending";

    await Finance.findOneAndUpdate(
      { schoolId: school._id, type: "staff_salary", staffId: staffMember._id },
      {
        $setOnInsert: {
          schoolId: school._id,
          type: "staff_salary",
          staffId: staffMember._id,
          amount: monthSalary,
          paidAmount,
          status,
          paymentDate: status !== "pending" ? today : null,
          academicYear: "2025-2026",
          description: `Monthly salary for ${staffMember.name}`,
        },
      },
      { upsert: true }
    );
    console.log(`Ensured salary record for ${staffMember.name}: ${monthSalary} (${status})`);
  }

  const demoInvestors = [
    {
      investorName: "Arjun Shah",
      investorType: "investor",
      contact: "+919900110022",
      description: "Working capital support for infrastructure",
      transactions: [
        { type: "investment", amount: 500000, date: "2026-01-15", note: "Initial funding" },
        { type: "repayment", amount: 100000, date: "2026-03-10", note: "First repayment" },
      ],
    },
    {
      investorName: "Sonia Trust Board",
      investorType: "trustee",
      contact: "trust@sonia-foundation.org",
      description: "Trustee funding for lab upgrade",
      transactions: [
        { type: "investment", amount: 300000, date: "2026-02-01", note: "Lab equipment grant" },
        { type: "repayment", amount: 50000, date: "2026-03-20", note: "Scheduled return" },
      ],
    },
  ];

  for (const investor of demoInvestors) {
    await InvestorLedger.findOneAndUpdate(
      { schoolId: school._id, investorName: investor.investorName },
      {
        $setOnInsert: {
          schoolId: school._id,
          investorName: investor.investorName,
          investorType: investor.investorType,
          contact: investor.contact,
          description: investor.description,
          status: "Active",
          transactions: investor.transactions,
        },
      },
      { upsert: true, returnDocument: "after" }
    );
    console.log(`Ensured investor ledger: ${investor.investorName}`);
  }

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

  // Seed new finance data (class fee structures, student assignments, etc.)
  try {
    await seedFinanceData();
  } catch (error) {
    console.error("Finance seeding skipped or error:", error instanceof Error ? error.message : error);
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
