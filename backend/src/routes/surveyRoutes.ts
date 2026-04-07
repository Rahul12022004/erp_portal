import express from "express";

import Survey from "../models/Survey";
import { createLog } from "../utils/createLog";

const router = express.Router();

// ==========================
// 📚 GET SURVEYS FOR A SCHOOL
// ==========================
router.get("/:schoolId", async (req, res) => {
  try {
    const surveys = await Survey.find({ schoolId: req.params.schoolId }).sort({
      createdAt: -1,
    });

    res.json(surveys);
  } catch (error) {
    console.error("GET SURVEYS ERROR:", error);
    res.status(500).json({ message: "Failed to fetch surveys" });
  }
});

// ==========================
// ➕ CREATE SURVEY
// ==========================
router.post("/", async (req, res) => {
  try {
    const {
      type,
      title,
      description,
      recipientType,
      questions,
      status,
      schoolId,
    } = req.body;

    const normalizedType = type === "Feedback" ? "Feedback" : "Survey";

    const cleanedQuestions = Array.isArray(questions)
      ? questions
          .map((question) => {
            if (!question || typeof question !== "object") {
              return null;
            }

            const prompt = String(question.prompt || "").trim();
            const type =
              question.type === "Multiple Choice" ? "Multiple Choice" : "Text";
            const options = Array.isArray(question.options)
              ? question.options
                  .map((option: unknown) => String(option).trim())
                  .filter(Boolean)
              : [];

            if (!prompt) {
              return null;
            }

            if (type === "Multiple Choice" && options.length < 2) {
              return null;
            }

            return { prompt, type, options };
          })
          .filter(Boolean)
      : [];

    if (!title || !description || !recipientType || !schoolId) {
      return res.status(400).json({
        message: "Required fields: title, description, recipientType, schoolId",
      });
    }

    if (!["Teacher", "Student"].includes(recipientType)) {
      return res.status(400).json({ message: "Invalid recipient type" });
    }

    if (cleanedQuestions.length === 0) {
      return res.status(400).json({ message: "Add at least one form question" });
    }

    const survey = await Survey.create({
      type: normalizedType,
      title,
      description,
      recipientType,
      questions: cleanedQuestions,
      status: status || "Active",
      schoolId,
    });

    await createLog({
      action: "CREATE_SURVEY",
      message: `${normalizedType} created: ${title}`,
      schoolId,
    });

    res.json({ success: true, data: survey });
  } catch (error) {
    console.error("CREATE SURVEY ERROR:", error);
    res.status(500).json({ message: "Failed to create survey" });
  }
});

// ==========================
// ✏️ UPDATE SURVEY STATUS
// ==========================
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    if (!["Active", "Closed"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const survey = await Survey.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!survey) {
      return res.status(404).json({ message: "Survey not found" });
    }

    await createLog({
      action: "UPDATE_SURVEY_STATUS",
      message: `Survey status updated to ${status}: ${survey.title}`,
      schoolId: survey.schoolId,
    });

    res.json({ success: true, data: survey });
  } catch (error) {
    console.error("UPDATE SURVEY STATUS ERROR:", error);
    res.status(500).json({ message: "Failed to update survey status" });
  }
});

// ==========================
// 🗑 DELETE SURVEY
// ==========================
router.delete("/:id", async (req, res) => {
  try {
    const survey = await Survey.findByIdAndDelete(req.params.id);

    if (!survey) {
      return res.status(404).json({ message: "Survey not found" });
    }

    await createLog({
      action: "DELETE_SURVEY",
      message: `Survey deleted: ${survey.title}`,
      schoolId: survey.schoolId,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("DELETE SURVEY ERROR:", error);
    res.status(500).json({ message: "Failed to delete survey" });
  }
});

export default router;
