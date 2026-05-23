import express from "express";
import { getEnv } from "../../../core/config/env";

const router = express.Router();

const GROQ_API = "https://api.groq.com/openai/v1";

const SYSTEM_PROMPT = `You are an AI assistant embedded in a school ERP (Enterprise Resource Planning) system.
You help school administrators, teachers, and staff with questions about:
- Students (enrollment, attendance, performance, fees)
- Academics (assignments, subjects, classes, study materials)
- Finance (fees, payments, dues, receipts)
- Staff and HR management
- School operations and administration

Be concise, practical, and helpful. Format lists and steps clearly.
When you don't know specific data, suggest where in the ERP the user can find it.`;

// POST /api/ai/chat
router.post("/chat", async (req, res) => {
  const apiKey = getEnv().groqApiKey;
  if (!apiKey) {
    return res.status(500).json({ success: false, message: "GROQ_API_KEY not configured in .env" });
  }

  const {
    message,
    model = getEnv().groqModel,
    history = [] as { role: string; content: string }[],
  } = req.body as {
    message: string;
    model?: string;
    history?: { role: string; content: string }[];
  };

  if (!message?.trim()) {
    return res.status(400).json({ success: false, message: "message required" });
  }

  try {
    const groqRes = await fetch(`${GROQ_API}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...history,
          { role: "user", content: message },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!groqRes.ok) {
      const err = await groqRes.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(err.error?.message ?? `Groq returned ${groqRes.status}`);
    }

    const data = await groqRes.json() as {
      choices?: { message?: { content?: string } }[];
    };
    const reply = data.choices?.[0]?.message?.content ?? "";
    res.json({ success: true, reply });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(503).json({ success: false, message: msg });
  }
});

// GET /api/ai/models — fetch available Groq models
router.get("/models", async (_req, res) => {
  const apiKey = getEnv().groqApiKey;
  if (!apiKey) {
    return res.json({ success: true, models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"] });
  }

  try {
    const groqRes = await fetch(`${GROQ_API}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8_000),
    });
    const data = await groqRes.json() as { data?: { id: string; object: string }[] };
    const models = (data.data ?? [])
      .filter((m) => m.object === "model")
      .map((m) => m.id)
      .sort();
    res.json({ success: true, models });
  } catch {
    res.json({
      success: true,
      models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it"],
    });
  }
});

export default router;
