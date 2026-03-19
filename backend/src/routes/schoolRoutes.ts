import express from "express";
import School from "../models/School";

const router = express.Router();

// CREATE SCHOOL
router.post("/", async (req, res) => {
  try {
    const school = new School(req.body);
    await school.save();

    res.json({ success: true, data: school });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create school" });
  }
});

// GET ALL SCHOOLS
router.get("/", async (req, res) => {
  try {
    const schools = await School.find();
    res.json(schools);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch schools" });
  }
});

export default router;