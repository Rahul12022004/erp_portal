import mongoose from "mongoose";

const surveyQuestionSchema = new mongoose.Schema(
  {
    prompt: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["Text", "Multiple Choice"],
      default: "Text",
    },
    options: [{ type: String, trim: true }],
  },
  { _id: false }
);

const surveySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Survey", "Feedback"],
      default: "Survey",
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    recipientType: {
      type: String,
      enum: ["Teacher", "Student"],
      default: "Student",
    },
    questions: [surveyQuestionSchema],
    status: {
      type: String,
      enum: ["Active", "Closed"],
      default: "Active",
    },
    responseCount: { type: Number, default: 0 },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Survey", surveySchema);
