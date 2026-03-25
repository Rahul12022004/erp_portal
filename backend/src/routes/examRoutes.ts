import express from "express";
import mongoose from "mongoose";

import Class from "../models/Class";
import Exam from "../models/Exam";
import Staff from "../models/Staff";
import { createLog } from "../utils/createLog";

const router = express.Router();

const examTypes = [
  "Unit Test",
  "Weekly Test",
  "Monthly Test",
  "Quarterly Exam",
  "Half Yearly",
  "Pre Board",
  "Final Exam",
  "Practical Exam",
];

const buildClassLabel = (name: string, section?: string | null) =>
  section ? `${name} - ${section}` : name;

const getTeacherClassLabels = async (schoolId: string, teacherId: string) => {
  const classes = await Class.find({ schoolId, classTeacher: teacherId }).select("name section");
  return classes.map((classDoc) => buildClassLabel(classDoc.name, classDoc.section));
};

const toSortableMinutes = (time: string) => {
  const [hours, minutes] = String(time || "00:00").split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

const validateExamTime = (startTime: string, endTime: string) => toSortableMinutes(endTime) > toSortableMinutes(startTime);

const resolveTeacherAssignment = async ({
  schoolId,
  teacherId,
}: {
  schoolId: string;
  teacherId?: string | null;
}) => {
  if (!teacherId) {
    return null;
  }

  if (!mongoose.Types.ObjectId.isValid(teacherId)) {
    throw new Error("Invalid teacherId provided");
  }

  const teacher = await Staff.findOne({
    _id: teacherId,
    schoolId,
    position: /^Teacher$/i,
    status: "Active",
  }).select("_id");

  if (!teacher) {
    throw new Error("Assigned teacher not found or inactive");
  }

  return teacher._id;
};

const toLocalDate = () => {
  const value = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
};

const normalizeTime = (time?: string, fallback = "09:00") => {
  const source = String(time || fallback).trim();
  const match = source.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return fallback;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return fallback;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return fallback;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const normalizeDate = (value?: string) => {
  const date = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  return toLocalDate();
};

const addOneHour = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  const nextHour = Math.min((h || 0) + 1, 23);
  return `${String(nextHour).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
};

const tryGenerateExamWithGroq = async ({
  prompt,
  classOptions,
}: {
  prompt: string;
  classOptions: string[];
}) => {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  const fetchFn = (globalThis as any).fetch as
    | ((input: string, init?: Record<string, unknown>) => Promise<any>)
    | undefined;

  if (!apiKey || !fetchFn) {
    return null;
  }

  const systemPrompt =
    "Return only raw JSON. Prefer an object with key exams: [] for schedules. Each exam item must include keys title, examType, className, subject, examDate, startTime, endTime, instructions.";
  const userPrompt = [
    `Create exam from this prompt: ${prompt}`,
    `Allowed exam types: ${examTypes.join(", ")}`,
    `Allowed class names: ${classOptions.join(" | ")}`,
    "Use examDate format YYYY-MM-DD and time format HH:mm (24-hour).",
    "If prompt asks for a full week, create exactly 5 weekday exams (Mon-Fri) with suitable different subjects and timings.",
  ].join("\n");

  const response = await fetchFn("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 400,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  const rawText = payload?.choices?.[0]?.message?.content?.toString?.() || "";
  const cleaned = rawText.replace(/```json|```/g, "").trim();

  if (!cleaned) {
    return null;
  }

  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    return null;
  }
};

type DraftExam = {
  title: string;
  examType: string;
  className: string;
  subject: string;
  examDate: string;
  startTime: string;
  endTime: string;
  instructions: string;
};

const getNextMonday = () => {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? 1 : 8 - day;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + diff);
  nextMonday.setHours(0, 0, 0, 0);
  return nextMonday;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const toDateString = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const normalizeDraftExam = ({
  raw,
  fallbackClass,
  fallbackExamType,
}: {
  raw: Record<string, unknown>;
  fallbackClass: string;
  fallbackExamType: string;
}): DraftExam => {
  const title = String(raw.title || "").trim().slice(0, 100) || "Exam";
  const examType = String(raw.examType || fallbackExamType).trim();
  const className = String(raw.className || fallbackClass).trim();
  const subject = String(raw.subject || "General Studies").trim() || "General Studies";
  const examDate = normalizeDate(String(raw.examDate || ""));
  const startTime = normalizeTime(String(raw.startTime || "09:00"), "09:00");
  let endTime = normalizeTime(String(raw.endTime || "10:00"), "10:00");
  const instructions = String(raw.instructions || "").trim();

  if (!validateExamTime(startTime, endTime)) {
    endTime = addOneHour(startTime);
    if (!validateExamTime(startTime, endTime)) {
      endTime = "23:59";
    }
  }

  return {
    title,
    examType: examTypes.includes(examType) ? examType : fallbackExamType,
    className,
    subject,
    examDate,
    startTime,
    endTime,
    instructions,
  };
};

const buildFallbackWeekPlan = ({
  prompt,
  className,
}: {
  prompt: string;
  className: string;
}): DraftExam[] => {
  const subjects = [
    "Mathematics",
    "Science",
    "English",
    "Social Studies",
    "Computer Science",
  ];
  const monday = getNextMonday();

  return subjects.map((subject, index) => ({
    title: `${subject} Weekly Test`,
    examType: "Weekly Test",
    className,
    subject,
    examDate: toDateString(addDays(monday, index)),
    startTime: "09:00",
    endTime: "10:00",
    instructions: `Auto-generated from prompt: ${prompt}`,
  }));
};

const parsePromptTimeRange = (prompt: string) => {
  const match = prompt.match(/(\d{1,2}:\d{2})\s*(?:to|\-|–|—)\s*(\d{1,2}:\d{2})/i);
  if (!match) {
    return { startTime: "09:00", endTime: "10:00" };
  }

  const startTime = normalizeTime(match[1], "09:00");
  let endTime = normalizeTime(match[2], "10:00");

  if (!validateExamTime(startTime, endTime)) {
    endTime = addOneHour(startTime);
  }

  return { startTime, endTime };
};

const parsePromptSubjectDatePlan = ({
  prompt,
  className,
}: {
  prompt: string;
  className: string;
}): DraftExam[] => {
  const currentYear = new Date().getFullYear();
  const datePattern =
    /(mathematics|science|english|social\s*studies|computer(?:\s*science)?)\s+on\s+(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)/gi;

  const monthMap: Record<string, number> = {
    january: 1,
    february: 2,
    march: 3,
    april: 4,
    may: 5,
    june: 6,
    july: 7,
    august: 8,
    september: 9,
    october: 10,
    november: 11,
    december: 12,
  };

  const { startTime, endTime } = parsePromptTimeRange(prompt);
  const drafts: DraftExam[] = [];

  let match = datePattern.exec(prompt);
  while (match) {
    const subjectRaw = match[1];
    const day = Number(match[2]);
    const month = monthMap[match[3].toLowerCase()];

    const subject =
      subjectRaw
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase()) || "General Studies";

    const examDate = normalizeDate(
      `${currentYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    );

    drafts.push({
      title: `${subject} Weekly Test`,
      examType: "Weekly Test",
      className,
      subject,
      examDate,
      startTime,
      endTime,
      instructions: "Arrive 15 minutes early and carry required stationery.",
    });

    match = datePattern.exec(prompt);
  }

  return drafts;
};

const ensureNoOverlapForClass = async ({
  schoolId,
  className,
  examDate,
  startTime,
  endTime,
  excludeExamId,
}: {
  schoolId: string;
  className: string;
  examDate: string;
  startTime: string;
  endTime: string;
  excludeExamId?: string;
}) => {
  const query: Record<string, unknown> = { schoolId, className, examDate };
  if (excludeExamId && mongoose.Types.ObjectId.isValid(excludeExamId)) {
    query._id = { $ne: excludeExamId };
  }

  const existingExams = await Exam.find(query).select("title startTime endTime");
  const nextStart = toSortableMinutes(startTime);
  const nextEnd = toSortableMinutes(endTime);

  const conflict = existingExams.find((existingExam) => {
    const existingStart = toSortableMinutes(existingExam.startTime);
    const existingEnd = toSortableMinutes(existingExam.endTime);
    return nextStart < existingEnd && nextEnd > existingStart;
  });

  if (conflict) {
    throw new Error(
      `This class already has ${conflict.title} scheduled from ${conflict.startTime} to ${conflict.endTime}.`
    );
  }
};

// ==========================
// 🤖 CREATE EXAM FROM AI PROMPT
// ==========================
router.post("/ai-create", async (req, res) => {
  try {
    const { schoolId, prompt, classOptions, teacherId } = req.body as {
      schoolId?: string;
      prompt?: string;
      classOptions?: string[];
      teacherId?: string | null;
    };

    if (!schoolId || !prompt?.trim()) {
      return res.status(400).json({ message: "Required fields: schoolId, prompt" });
    }

    const classesFromDb = await Class.find({ schoolId }).select("name section");
    const allowedClasses =
      Array.isArray(classOptions) && classOptions.length > 0
        ? classOptions
        : classesFromDb.map((classDoc) => buildClassLabel(classDoc.name, classDoc.section));

    if (!allowedClasses.length) {
      return res.status(400).json({ message: "Please create at least one class before AI exam creation" });
    }

    const aiDraft = await tryGenerateExamWithGroq({
      prompt: prompt.trim(),
      classOptions: allowedClasses,
    });

    const resolvedTeacherId = await resolveTeacherAssignment({
      schoolId,
      teacherId: teacherId ? String(teacherId) : null,
    });

    const wantsWeekPlan =
      /weekly|full\s*week|whole\s*week|week\s*plan|week\s*schedule|monday\s*to\s*friday|5\s*day|five\s*day/i.test(
        prompt
      );

    let rawDraftList: Record<string, unknown>[] = [];
    if (aiDraft && Array.isArray((aiDraft as any).exams)) {
      rawDraftList = (aiDraft as any).exams.filter((item: unknown) => item && typeof item === "object") as Record<string, unknown>[];
    } else if (aiDraft && typeof aiDraft === "object") {
      rawDraftList = [aiDraft];
    }

    if (wantsWeekPlan && rawDraftList.length < 5) {
      rawDraftList = [];
    }

    const fallbackClass = allowedClasses[0];
    const parsedPromptPlan = wantsWeekPlan
      ? parsePromptSubjectDatePlan({ prompt: prompt.trim(), className: fallbackClass })
      : [];

    // Highest priority: explicit subject/date lines from current prompt.
    const normalizedDrafts =
      parsedPromptPlan.length > 0
        ? parsedPromptPlan
        : rawDraftList.length > 0
        ? rawDraftList.map((draft) =>
            normalizeDraftExam({
              raw: draft,
              fallbackClass,
              fallbackExamType: wantsWeekPlan ? "Weekly Test" : "Unit Test",
            })
          )
        : wantsWeekPlan
        ? buildFallbackWeekPlan({ prompt: prompt.trim(), className: fallbackClass })
        : [
            {
              title: prompt.trim().slice(0, 100) || `Exam ${toLocalDate()}`,
              examType: "Unit Test",
              className: fallbackClass,
              subject: "General Studies",
              examDate: toLocalDate(),
              startTime: "09:00",
              endTime: "10:00",
              instructions: `Auto-generated from prompt: ${prompt.trim()}`,
            },
          ];

    const validDrafts = normalizedDrafts.map((draft) => ({
      ...draft,
      className: allowedClasses.includes(draft.className) ? draft.className : fallbackClass,
      examType: examTypes.includes(draft.examType) ? draft.examType : wantsWeekPlan ? "Weekly Test" : "Unit Test",
    }));

    for (const draft of validDrafts) {
      await ensureNoOverlapForClass({
        schoolId,
        className: draft.className,
        examDate: draft.examDate,
        startTime: draft.startTime,
        endTime: draft.endTime,
      });
    }

    const createdIds: string[] = [];
    for (const draft of validDrafts) {
      const createdExam = await Exam.create({
        title: draft.title,
        examType: draft.examType,
        className: draft.className,
        subject: draft.subject,
        examDate: draft.examDate,
        startTime: draft.startTime,
        endTime: draft.endTime,
        instructions: draft.instructions,
        teacherId: resolvedTeacherId,
        schoolId,
        createdByRole: "school_admin",
      });
      createdIds.push(String(createdExam._id));
    }

    const createdExams = await Exam.find({ _id: { $in: createdIds } })
      .populate("uploads.teacherId", "name email position")
      .populate("teacherId", "name email position status")
      .sort({ examDate: 1, startTime: 1 });

    await createLog({
      action: "CREATE_EXAM_AI",
      message: `AI exam plan created with ${createdExams.length} exam(s)`,
      user: "School Admin",
      schoolId,
    });

    return res.json({
      success: true,
      data: createdExams.length === 1 ? createdExams[0] : createdExams,
      createdCount: createdExams.length,
      mode: createdExams.length > 1 ? "plan" : "single",
    });
  } catch (error) {
    console.error("CREATE EXAM AI ERROR:", error);
    return res.status(500).json({ message: error instanceof Error ? error.message : "Failed to create exam from AI" });
  }
});

// ==========================
// 📚 GET EXAMS FOR A TEACHER
// ==========================
router.get("/teacher/:schoolId/:teacherId", async (req, res) => {
  try {
    const { schoolId, teacherId } = req.params;

    const exams = await Exam.find({ schoolId })
      .populate("uploads.teacherId", "name email")
      .sort({
      examDate: 1,
      startTime: 1,
      createdAt: -1,
    });

    const formattedExams = exams.map((exam) => {
      const examObject = exam.toObject();
      const teacherUpload = Array.isArray(examObject.uploads)
        ? examObject.uploads.find((upload: any) => {
            const uploadTeacherId =
              upload?.teacherId && typeof upload.teacherId === "object" && "_id" in upload.teacherId
                ? String(upload.teacherId._id)
                : String(upload?.teacherId || "");
            return uploadTeacherId === teacherId;
          })
        : null;

      return {
        ...examObject,
        teacherUpload: teacherUpload || null,
        uploadStatus: teacherUpload?.documentData ? "uploaded" : "pending",
      };
    });

    res.json(formattedExams);
  } catch (error) {
    console.error("GET EXAMS ERROR:", error);
    res.status(500).json({ message: "Failed to fetch exams" });
  }
});

// ==========================
// 📚 GET EXAMS FOR A SCHOOL ADMIN
// ==========================
router.get("/school/:schoolId", async (req, res) => {
  try {
    const exams = await Exam.find({ schoolId: req.params.schoolId })
      .populate("uploads.teacherId", "name email position")
      .populate("teacherId", "name email position status")
      .sort({ examDate: 1, startTime: 1, createdAt: -1 });

    res.json(exams);
  } catch (error) {
    console.error("GET SCHOOL EXAMS ERROR:", error);
    res.status(500).json({ message: "Failed to fetch exams" });
  }
});

// ==========================
// ➕ CREATE EXAM
// ==========================
router.post("/", async (req, res) => {
  try {
    const {
      title,
      examType,
      className,
      subject,
      examDate,
      startTime,
      endTime,
      instructions,
      teacherId,
      schoolId,
    } = req.body;

    if (
      !title ||
      !examType ||
      !className ||
      !subject ||
      !examDate ||
      !startTime ||
      !endTime ||
      !schoolId
    ) {
      return res.status(400).json({
        message:
          "Required fields: title, examType, className, subject, examDate, startTime, endTime, schoolId",
      });
    }

    if (!validateExamTime(startTime, endTime)) {
      return res.status(400).json({ message: "End time must be after start time" });
    }

    await ensureNoOverlapForClass({ schoolId, className, examDate, startTime, endTime });

    const resolvedTeacherId = await resolveTeacherAssignment({
      schoolId,
      teacherId: teacherId ? String(teacherId) : null,
    });

    const exam = await Exam.create({
      title,
      examType,
      className,
      subject,
      examDate,
      startTime,
      endTime,
      instructions: instructions || "",
      teacherId: resolvedTeacherId,
      schoolId,
      createdByRole: "school_admin",
    });

    const createdExam = await Exam.findById(exam._id)
      .populate("uploads.teacherId", "name email position")
      .populate("teacherId", "name email position status");

    await createLog({
      action: "CREATE_EXAM",
      message: `Exam scheduled: ${title} for ${className} on ${examDate}`,
      user: "School Admin",
      schoolId,
    });

    res.json({ success: true, data: createdExam || exam });
  } catch (error) {
    console.error("CREATE EXAM ERROR:", error);
    res.status(500).json({ message: error instanceof Error ? error.message : "Failed to create exam" });
  }
});

// ==========================
// ✏️ UPDATE EXAM
// ==========================
router.put("/:id", async (req, res) => {
  try {
    const {
      title,
      examType,
      className,
      subject,
      examDate,
      startTime,
      endTime,
      instructions,
      teacherId,
      schoolId,
    } = req.body;

    if (!schoolId) {
      return res.status(400).json({ message: "Required field: schoolId" });
    }

    const existingExam = await Exam.findOne({ _id: req.params.id, schoolId });
    if (!existingExam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    const nextExam = {
      title: typeof title === "string" && title.trim() ? title.trim() : existingExam.title,
      examType: typeof examType === "string" && examType.trim() ? examType.trim() : existingExam.examType,
      className: typeof className === "string" && className.trim() ? className.trim() : existingExam.className,
      subject: typeof subject === "string" && subject.trim() ? subject.trim() : existingExam.subject,
      examDate: typeof examDate === "string" && examDate ? examDate : existingExam.examDate,
      startTime: typeof startTime === "string" && startTime ? startTime : existingExam.startTime,
      endTime: typeof endTime === "string" && endTime ? endTime : existingExam.endTime,
      instructions:
        typeof instructions === "string" ? instructions.trim() : existingExam.instructions || "",
    };

    if (!validateExamTime(nextExam.startTime, nextExam.endTime)) {
      return res.status(400).json({ message: "End time must be after start time" });
    }

    await ensureNoOverlapForClass({
      schoolId,
      className: nextExam.className,
      examDate: nextExam.examDate,
      startTime: nextExam.startTime,
      endTime: nextExam.endTime,
      excludeExamId: req.params.id,
    });

    const resolvedTeacherId =
      teacherId === undefined
        ? existingExam.teacherId
        : await resolveTeacherAssignment({
            schoolId,
            teacherId: teacherId ? String(teacherId) : null,
          });

    const updatedExam = await Exam.findByIdAndUpdate(
      req.params.id,
      {
        ...nextExam,
        teacherId: resolvedTeacherId,
      },
      { new: true }
    )
      .populate("uploads.teacherId", "name email position")
      .populate("teacherId", "name email position status");

    await createLog({
      action: "UPDATE_EXAM",
      message: `Exam updated: ${nextExam.title} for ${nextExam.className} on ${nextExam.examDate}`,
      user: "School Admin",
      schoolId,
    });

    res.json({ success: true, data: updatedExam });
  } catch (error) {
    console.error("UPDATE EXAM ERROR:", error);
    res.status(500).json({ message: error instanceof Error ? error.message : "Failed to update exam" });
  }
});

// ==========================
// 📄 TEACHER UPLOAD PAPER + COMMENT
// ==========================
router.post("/:id/upload", async (req, res) => {
  try {
    const { teacherId, schoolId, documentName, documentData, comment } = req.body;

    if (!teacherId || !schoolId || !documentName || !documentData) {
      return res.status(400).json({
        message: "Required fields: teacherId, schoolId, documentName, documentData",
      });
    }

    const [exam, teacher] = await Promise.all([
      Exam.findOne({ _id: req.params.id, schoolId }),
      Staff.findOne({ _id: teacherId, schoolId, position: /^Teacher$/i }).select("name email"),
    ]);

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    const existingUploadIndex = exam.uploads.findIndex(
      (upload: any) => String(upload.teacherId) === teacherId
    );

    const uploadPayload = {
      teacherId,
      teacherName: teacher.name,
      documentName,
      documentData,
      comment: comment || "",
      uploadedAt: new Date(),
    };

    if (existingUploadIndex >= 0) {
      exam.uploads[existingUploadIndex] = uploadPayload as any;
    } else {
      exam.uploads.push(uploadPayload as any);
    }

    await exam.save();

    await createLog({
      action: "UPLOAD_EXAM_PAPER",
      message: `${teacher.name} uploaded a paper for ${exam.title}`,
      user: teacher.name,
      schoolId,
    });

    const updatedExam = await Exam.findById(exam._id).populate("uploads.teacherId", "name email position");

    res.json({ success: true, data: updatedExam });
  } catch (error) {
    console.error("UPLOAD EXAM PAPER ERROR:", error);
    res.status(500).json({ message: "Failed to upload exam paper" });
  }
});

// ==========================
// 🗑 DELETE EXAM
// ==========================
router.delete("/:id", async (req, res) => {
  try {
    const exam = await Exam.findByIdAndDelete(req.params.id);

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    await createLog({
      action: "DELETE_EXAM",
      message: `Exam deleted: ${exam.title}`,
      user: "School Admin",
      schoolId: exam.schoolId,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("DELETE EXAM ERROR:", error);
    res.status(500).json({ message: "Failed to delete exam" });
  }
});

export default router;
