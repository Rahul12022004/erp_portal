import express from "express";
import Announcement from "../models/Announcement";
import { createLog } from "../utils/createLog";

const router = express.Router();

const AI_DEFAULT_DESCRIPTION =
  "Important school update for all teachers and students.";

const buildFallbackDraft = (
  topic: string,
  description: string,
  author: string
) => {
  const normalizedTopic = topic.trim() || "General Update";
  const normalizedDescription =
    description.trim() || "Important school update for all teachers and students.";

  const title = `${normalizedTopic} - Important Update`;
  const message = [
    "Dear all teachers and students,",
    "",
    `This announcement is regarding ${normalizedTopic.toLowerCase()}.`,
    normalizedDescription,
    "Please review this update carefully and follow the required instructions.",
    "",
    "If you have questions, contact the school office.",
    "",
    `Regards,`,
    author || "School Administration",
  ].join("\n");

  return { title, message, source: "fallback" };
};

const tryGenerateWithGemini = async (
  topic: string,
  description: string,
  author: string
) => {
  const apiKey = process.env.GEMINI_API_KEY;
  const fetchFn = (globalThis as any).fetch as
    | ((input: string, init?: Record<string, unknown>) => Promise<any>)
    | undefined;

  if (!apiKey || !fetchFn) {
    return null;
  }

  const prompt = [
    "Create a concise school announcement JSON object.",
    "Return only valid JSON with keys: title, message.",
    `Topic: ${topic}`,
    `Description/context: ${description}`,
    `Author name: ${author}`,
    "Message must be 80-140 words and suitable for school communication.",
  ].join("\n");

  const response = await fetchFn(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 350,
        },
      }),
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text?.toString?.() || "";

  if (!text) {
    return null;
  }

  const cleaned = text.replace(/```json|```/g, "").trim();

  try {
    const parsed = JSON.parse(cleaned) as {
      title?: string;
      message?: string;
    };

    if (!parsed?.title || !parsed?.message) {
      return null;
    }

    return {
      title: parsed.title.trim(),
      message: parsed.message.trim(),
      source: "gemini",
    };
  } catch {
    return null;
  }
};

const tryGenerateWithGroq = async (
  topic: string,
  description: string,
  author: string
) => {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  const fetchFn = (globalThis as any).fetch as
    | ((input: string, init?: Record<string, unknown>) => Promise<any>)
    | undefined;

  if (!apiKey || !fetchFn) {
    return null;
  }

  const prompt = [
    "Create a concise school announcement JSON object.",
    "Return only valid JSON with keys: title, message.",
    `Topic: ${topic}`,
    `Description/context: ${description}`,
    `Author name: ${author}`,
    "Message must be 80-140 words and suitable for school communication.",
  ].join("\n");

  const response = await fetchFn("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.5,
      max_tokens: 350,
      messages: [
        {
          role: "system",
          content:
            "You generate school announcements and must return only raw JSON with title and message keys.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content?.toString?.() || "";

  if (!text) {
    return null;
  }

  const cleaned = text.replace(/```json|```/g, "").trim();

  try {
    const parsed = JSON.parse(cleaned) as {
      title?: string;
      message?: string;
    };

    if (!parsed?.title || !parsed?.message) {
      return null;
    }

    return {
      title: parsed.title.trim(),
      message: parsed.message.trim(),
      source: "groq",
    };
  } catch {
    return null;
  }
};

// ==========================
// 🤖 CREATE ANNOUNCEMENT DRAFT WITH AI
// ==========================
router.post("/ai-draft", async (req, res) => {
  try {
    const { topic, description, author } = req.body as {
      topic?: string;
      description?: string;
      author?: string;
    };

    if (!topic?.trim()) {
      return res.status(400).json({ message: "Topic is required" });
    }

    const normalizedDescription = description || AI_DEFAULT_DESCRIPTION;
    const normalizedAuthor = author || "School Administration";

    const draftFromGroq = await tryGenerateWithGroq(
      topic,
      normalizedDescription,
      normalizedAuthor
    );

    const draftFromGemini = await tryGenerateWithGemini(
      topic,
      normalizedDescription,
      normalizedAuthor
    );

    const draft =
      draftFromGroq ||
      draftFromGemini ||
      buildFallbackDraft(
        topic,
        normalizedDescription,
        normalizedAuthor
      );

    return res.json({ success: true, data: draft });
  } catch (error) {
    console.error("AI ANNOUNCEMENT DRAFT ERROR:", error);
    return res.status(500).json({ message: "Failed to generate AI draft" });
  }
});

// ==========================
// 📢 GET ANNOUNCEMENTS FOR A SCHOOL
// ==========================
router.get("/:schoolId", async (req, res) => {
  try {
    const announcements = await Announcement.find({ schoolId: req.params.schoolId })
      .sort({ createdAt: -1 }); // Most recent first

    res.json(announcements);
  } catch (error) {
    console.error("GET ANNOUNCEMENTS ERROR:", error);
    res.status(500).json({ message: "Failed to fetch announcements" });
  }
});

// ==========================
// ➕ CREATE ANNOUNCEMENT
// ==========================
router.post("/", async (req, res) => {
  try {
    const { title, message, author, schoolId } = req.body;

    if (!title || !message || !author || !schoolId) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const announcement = await Announcement.create({
      title,
      message,
      author,
      schoolId,
    });

    await createLog({
      action: "CREATE_ANNOUNCEMENT",
      message: `Announcement created: ${title}`,
      schoolId,
    });

    res.json({ success: true, data: announcement });
  } catch (error) {
    console.error("CREATE ANNOUNCEMENT ERROR:", error);
    res.status(500).json({ message: "Failed to create announcement" });
  }
});

// ==========================
// 🗑 DELETE ANNOUNCEMENT
// ==========================
router.delete("/:id", async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    await createLog({
      action: "DELETE_ANNOUNCEMENT",
      message: `Announcement deleted: ${announcement.title}`,
      schoolId: announcement.schoolId,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("DELETE ANNOUNCEMENT ERROR:", error);
    res.status(500).json({ message: "Failed to delete announcement" });
  }
});

export default router;