import express from "express";
import SocialMedia from "../models/SocialMedia";
import { createLog } from "../utils/createLog";

const router = express.Router();

// ==========================
// 🌐 GET SOCIAL MEDIA ACCOUNTS FOR A SCHOOL
// ==========================
router.get("/:schoolId", async (req, res) => {
  try {
    const accounts = await SocialMedia.find({ schoolId: req.params.schoolId }).sort({ createdAt: -1 });
    res.json(accounts);
  } catch (error) {
    console.error("GET SOCIAL MEDIA ERROR:", error);
    res.status(500).json({ message: "Failed to fetch social media accounts" });
  }
});

// ==========================
// ➕ CREATE SOCIAL MEDIA ACCOUNT
// ==========================
router.post("/", async (req, res) => {
  try {
    const {
      platform,
      accountName,
      profileUrl,
      phoneNumber,
      bio,
      isActive,
      schoolId,
    } = req.body;

    if (!platform || !accountName || !schoolId) {
      return res.status(400).json({
        message: "Required fields: platform, accountName, schoolId",
      });
    }

    const account = await SocialMedia.create({
      platform: String(platform).toLowerCase(),
      accountName,
      profileUrl,
      phoneNumber,
      bio,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      schoolId,
    });

    await createLog({
      action: "CREATE_SOCIAL_MEDIA",
      message: `Social media account created: ${account.platform} - ${account.accountName}`,
      schoolId,
    });

    res.status(201).json({ success: true, data: account });
  } catch (error) {
    console.error("CREATE SOCIAL MEDIA ERROR:", error);
    res.status(500).json({ message: "Failed to create social media account" });
  }
});

// ==========================
// ✏️ UPDATE SOCIAL MEDIA ACCOUNT
// ==========================
router.put("/:id", async (req, res) => {
  try {
    const payload = {
      ...req.body,
      ...(req.body.platform ? { platform: String(req.body.platform).toLowerCase() } : {}),
      ...(req.body.isActive !== undefined ? { isActive: Boolean(req.body.isActive) } : {}),
    };

    const account = await SocialMedia.findByIdAndUpdate(req.params.id, payload, { new: true });

    if (!account) {
      return res.status(404).json({ message: "Social media account not found" });
    }

    await createLog({
      action: "UPDATE_SOCIAL_MEDIA",
      message: `Social media account updated: ${account.platform} - ${account.accountName}`,
      schoolId: account.schoolId,
    });

    res.json({ success: true, data: account });
  } catch (error) {
    console.error("UPDATE SOCIAL MEDIA ERROR:", error);
    res.status(500).json({ message: "Failed to update social media account" });
  }
});

// ==========================
// 🗑 DELETE SOCIAL MEDIA ACCOUNT
// ==========================
router.delete("/:id", async (req, res) => {
  try {
    const account = await SocialMedia.findByIdAndDelete(req.params.id);

    if (!account) {
      return res.status(404).json({ message: "Social media account not found" });
    }

    await createLog({
      action: "DELETE_SOCIAL_MEDIA",
      message: `Social media account deleted: ${account.platform} - ${account.accountName}`,
      schoolId: account.schoolId,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("DELETE SOCIAL MEDIA ERROR:", error);
    res.status(500).json({ message: "Failed to delete social media account" });
  }
});

export default router;
