<<<<<<< HEAD
import { useState } from "react";

/* -------------------- THEME -------------------- */
const theme = {
  primary: "bg-[#1f9d84]",
  hover: "hover:bg-[#17806d]",
  light: "bg-[#e6f4f1]",
};

/* -------------------- TYPES -------------------- */
type Answer = {
  question: string;
  answer: string;
};

type Student = {
  id: number;
  name: string;
  admissionNo: string;
  className: string;
  answers: Answer[];
};

type Survey = {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  status: string;
  students: Student[];
};

/* -------------------- MAIN -------------------- */
export default function SurveyModule() {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<number | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);

  const surveys: Survey[] = [
    {
      id: 1,
      title: "School Academic",
      startDate: "25/06/2024",
      endDate: "27/06/2024",
      status: "Complete",
      students: [
        {
          id: 1,
          name: "Girish",
          admissionNo: "1259",
          className: "4",
          answers: [
            { question: "Facilities?", answer: "Good labs" },
            { question: "Faculty?", answer: "Supportive" },
          ],
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      

      {/* CREATE BUTTON */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreate(!showCreate)}
          className={`${theme.primary} ${theme.hover} text-white px-4 py-2 rounded-lg transition`}
        >
          {showCreate ? "Close" : "Create Survey"}
        </button>
      </div>

      {/* CREATE FORM */}
      {showCreate && (
        <div className="bg-white p-4 rounded-xl shadow space-y-4">
          <h3 className="font-medium">Create Survey</h3>

          <div className="grid grid-cols-4 gap-4">
            <input className="border p-2 rounded" placeholder="Title" />
            <select className="border p-2 rounded">
              <option>Select Survey For</option>
            </select>
            <input type="date" className="border p-2 rounded" />
            <input type="date" className="border p-2 rounded" />
          </div>

          <button
            className={`${theme.primary} ${theme.hover} text-white px-4 py-2 rounded-lg`}
          >
            Submit
          </button>
        </div>
      )}

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Survey</th>
              <th>Start</th>
              <th>End</th>
              <th>Status</th>
              <th>Result</th>
            </tr>
          </thead>

          <tbody>
            {surveys.map((survey) => (
              <>
                <tr key={survey.id} className="border-t">
                  <td className="p-3">{survey.title}</td>
                  <td>{survey.startDate}</td>
                  <td>{survey.endDate}</td>

                  <td>
                    <span className={`${theme.light} text-[#1f9d84] px-2 py-1 rounded text-xs`}>
                      {survey.status}
                    </span>
                  </td>

                  <td>
                    <button
                      onClick={() =>
                        setSelectedSurvey(
                          selectedSurvey === survey.id ? null : survey.id
                        )
                      }
                      className={`${theme.primary} ${theme.hover} text-white px-3 py-1 rounded`}
                    >
                      View Result
                    </button>
                  </td>
                </tr>

                {/* EXPANDED */}
                {selectedSurvey === survey.id && (
                  <tr>
                    <td colSpan={5} className="p-4 bg-gray-50">
                      <SurveyResult
                        survey={survey}
                        selectedStudent={selectedStudent}
                        setSelectedStudent={setSelectedStudent}
                      />
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* -------------------- RESULT -------------------- */
function SurveyResult({
  survey,
  selectedStudent,
  setSelectedStudent,
}: any) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold">{survey.title}</h3>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3">Admission</th>
              <th>Name</th>
              <th>Class</th>
              <th>View</th>
            </tr>
          </thead>

          <tbody>
            {survey.students.map((student: Student) => (
              <>
                <tr key={student.id} className="border-t">
                  <td className="p-3">{student.admissionNo}</td>
                  <td>{student.name}</td>
                  <td>{student.className}</td>

                  <td>
                    <button
                      onClick={() =>
                        setSelectedStudent(
                          selectedStudent === student.id
                            ? null
                            : student.id
                        )
                      }
                      className={`${theme.primary} ${theme.hover} text-white px-3 py-1 rounded`}
                    >
                      View
                    </button>
                  </td>
                </tr>

                {/* ANSWERS */}
                {selectedStudent === student.id && (
                  <tr>
                    <td colSpan={4} className="p-4 bg-gray-50">
                      <div className="space-y-3">
                        {student.answers.map((ans: Answer, i: number) => (
                          <div
                            key={i}
                            className="bg-white border rounded-lg p-3"
                          >
                            <p className="font-medium">
                              {i + 1}. {ans.question}
                            </p>
                            <p className="text-gray-600 text-sm mt-1">
                              {ans.answer}
                            </p>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
=======
import { useEffect, useState } from "react";
import { BarChart3, Trash2 } from "lucide-react";

type Survey = {
  _id: string;
  title: string;
  description: string;
  recipientType: "Teacher" | "Student";
  questions: {
    prompt: string;
    type: "Text" | "Multiple Choice";
    options: string[];
  }[];
  status: "Active" | "Closed";
  responseCount: number;
  createdAt: string;
};

type QuestionForm = {
  prompt: string;
  type: "Text" | "Multiple Choice";
  options: string[];
};

export default function SurveyModule() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    recipientType: "Student",
    questions: [{ prompt: "", type: "Text", options: ["", ""] }] as QuestionForm[],
    status: "Active",
  });

  useEffect(() => {
    const fetchSurveys = async () => {
      const school = JSON.parse(localStorage.getItem("school") || "null");

      if (!school?._id) {
        setError("School not found. Please log in again.");
        setSurveys([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const res = await fetch(`http://localhost:5000/api/surveys/${school._id}`);

        if (!res.ok) {
          throw new Error(`Failed to load surveys (${res.status})`);
        }

        const data = await res.json();
        setSurveys(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Survey fetch error:", err);
        setSurveys([]);
        setError(err instanceof Error ? err.message : "Failed to load surveys");
      } finally {
        setLoading(false);
      }
    };

    fetchSurveys();
  }, []);

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      recipientType: "Student",
      questions: [{ prompt: "", type: "Text", options: ["", ""] }],
      status: "Active",
    });
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const school = JSON.parse(localStorage.getItem("school") || "null");

    if (!school?._id) {
      alert("School not found. Please log in again.");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch("http://localhost:5000/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          questions: formData.questions.map((question) => ({
            prompt: question.prompt.trim(),
            type: question.type,
            options: question.options.map((option) => option.trim()).filter(Boolean),
          })),
          schoolId: school._id,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to create survey");
      }

      setSurveys((current) => [data.data, ...current]);
      resetForm();
    } catch (err) {
      console.error("Survey save error:", err);
      alert(err instanceof Error ? err.message : "Failed to create survey");
    } finally {
      setSaving(false);
    }
  };

  const updateQuestionPrompt = (index: number, value: string) => {
    setFormData((current) => ({
      ...current,
      questions: current.questions.map((question, questionIndex) =>
        questionIndex === index ? { ...question, prompt: value } : question
      ),
    }));
  };

  const updateQuestionType = (
    index: number,
    value: QuestionForm["type"]
  ) => {
    setFormData((current) => ({
      ...current,
      questions: current.questions.map((question, questionIndex) =>
        questionIndex === index
          ? {
              ...question,
              type: value,
              options:
                value === "Multiple Choice"
                  ? question.options.length >= 2
                    ? question.options
                    : ["", ""]
                  : [],
            }
          : question
      ),
    }));
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    setFormData((current) => ({
      ...current,
      questions: current.questions.map((question, currentQuestionIndex) =>
        currentQuestionIndex === questionIndex
          ? {
              ...question,
              options: question.options.map((option, currentOptionIndex) =>
                currentOptionIndex === optionIndex ? value : option
              ),
            }
          : question
      ),
    }));
  };

  const addOption = (questionIndex: number) => {
    setFormData((current) => ({
      ...current,
      questions: current.questions.map((question, currentQuestionIndex) =>
        currentQuestionIndex === questionIndex
          ? { ...question, options: [...question.options, ""] }
          : question
      ),
    }));
  };

  const addQuestion = () => {
    setFormData((current) => ({
      ...current,
      questions: [
        ...current.questions,
        { prompt: "", type: "Text", options: ["", ""] },
      ],
    }));
  };

  const removeQuestion = (index: number) => {
    setFormData((current) => ({
      ...current,
      questions:
        current.questions.length === 1
          ? current.questions
          : current.questions.filter((_, questionIndex) => questionIndex !== index),
    }));
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    setFormData((current) => ({
      ...current,
      questions: current.questions.map((question, currentQuestionIndex) =>
        currentQuestionIndex === questionIndex
          ? {
              ...question,
              options:
                question.options.length <= 2
                  ? question.options
                  : question.options.filter((_, currentOptionIndex) => currentOptionIndex !== optionIndex),
            }
          : question
      ),
    }));
  };

  const updateStatus = async (surveyId: string, status: Survey["status"]) => {
    try {
      const res = await fetch(`http://localhost:5000/api/surveys/${surveyId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to update survey");
      }

      setSurveys((current) =>
        current.map((survey) =>
          survey._id === surveyId ? { ...survey, status: data.data.status } : survey
        )
      );
    } catch (err) {
      console.error("Survey status error:", err);
      alert(err instanceof Error ? err.message : "Failed to update survey");
    }
  };

  const handleDelete = async (surveyId: string) => {
    if (!confirm("Are you sure you want to delete this survey?")) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/surveys/${surveyId}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to delete survey");
      }

      setSurveys((current) => current.filter((survey) => survey._id !== surveyId));
    } catch (err) {
      console.error("Survey delete error:", err);
      alert(err instanceof Error ? err.message : "Failed to delete survey");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <button
          onClick={() => setShowForm((current) => !current)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          {showForm ? "Close Form" : "Create Survey"}
        </button>
      </div>

      {showForm && (
        <div className="stat-card p-6">
          <h3 className="text-lg font-semibold mb-4">Create Survey</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Survey Title"
              className="border rounded p-2 w-full"
              value={formData.title}
              onChange={(e) =>
                setFormData((current) => ({ ...current, title: e.target.value }))
              }
              required
            />

            <textarea
              placeholder="Survey description or question"
              className="border rounded p-2 w-full"
              rows={4}
              value={formData.description}
              onChange={(e) =>
                setFormData((current) => ({
                  ...current,
                  description: e.target.value,
                }))
              }
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                className="border rounded p-2 w-full"
                value={formData.recipientType}
                onChange={(e) =>
                  setFormData((current) => ({
                    ...current,
                    recipientType: e.target.value as Survey["recipientType"],
                  }))
                }
              >
                <option value="Student">Student</option>
                <option value="Teacher">Teacher</option>
              </select>

              <select
                className="border rounded p-2 w-full"
                value={formData.status}
                onChange={(e) =>
                  setFormData((current) => ({
                    ...current,
                    status: e.target.value as Survey["status"],
                  }))
                }
              >
                <option value="Active">Active</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Form Questions</h4>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Add Question
                </button>
              </div>

              {formData.questions.map((question, index) => (
                <div key={index} className="space-y-3 rounded-lg border border-border p-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={`Question ${index + 1}`}
                      className="border rounded p-2 w-full"
                      value={question.prompt}
                      onChange={(e) => updateQuestionPrompt(index, e.target.value)}
                    />
                    <select
                      className="border rounded p-2 w-44"
                      value={question.type}
                      onChange={(e) =>
                        updateQuestionType(index, e.target.value as QuestionForm["type"])
                      }
                    >
                      <option value="Text">Text</option>
                      <option value="Multiple Choice">Multiple Choice</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeQuestion(index)}
                      className="px-3 py-2 rounded bg-red-100 text-red-700 disabled:opacity-50"
                      disabled={formData.questions.length === 1}
                    >
                      Remove
                    </button>
                  </div>

                  {question.type === "Multiple Choice" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Answer Options</p>
                        <button
                          type="button"
                          onClick={() => addOption(index)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Add Option
                        </button>
                      </div>

                      {question.options.map((option, optionIndex) => (
                        <div key={optionIndex} className="flex gap-2">
                          <input
                            type="text"
                            placeholder={`Option ${optionIndex + 1}`}
                            className="border rounded p-2 w-full"
                            value={option}
                            onChange={(e) =>
                              updateOption(index, optionIndex, e.target.value)
                            }
                          />
                          <button
                            type="button"
                            onClick={() => removeOption(index, optionIndex)}
                            className="px-3 py-2 rounded bg-red-100 text-red-700 disabled:opacity-50"
                            disabled={question.options.length <= 2}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Survey"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p className="text-center text-gray-500">Loading surveys...</p>
      ) : error ? (
        <p className="text-center text-red-600">{error}</p>
      ) : surveys.length === 0 ? (
        <p className="text-center text-gray-500">No surveys created yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {surveys.map((survey) => (
            <div key={survey._id} className="stat-card p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{survey.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(survey.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(survey._id)}
                  className="text-red-600 hover:text-red-800"
                  title="Delete survey"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-sm">{survey.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Send To
                  </p>
                  <p className="mt-1 font-medium">{survey.recipientType}</p>
                </div>

                <div className="rounded-lg bg-muted/30 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Responses
                  </p>
                  <p className="mt-1 font-medium inline-flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    {survey.responseCount}
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-muted/30 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Form Questions
                </p>
                <div className="mt-2 space-y-1">
                  {survey.questions.length > 0 ? (
                    survey.questions.map((question, index) => (
                      <div key={index} className="text-sm space-y-1">
                        <p>
                          {index + 1}. {question.prompt}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Type: {question.type}
                        </p>
                        {question.type === "Multiple Choice" && question.options.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Options: {question.options.join(", ")}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No questions added.</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    survey.status === "Active"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {survey.status}
                </span>

                <button
                  onClick={() =>
                    updateStatus(
                      survey._id,
                      survey.status === "Active" ? "Closed" : "Active"
                    )
                  }
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Mark as {survey.status === "Active" ? "Closed" : "Active"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
>>>>>>> 0bc2111 (Added academics module changes)
