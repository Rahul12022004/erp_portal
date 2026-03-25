import { useEffect, useState, type FormEvent } from "react";
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
    recipientType: "Student" as Survey["recipientType"],
    questions: [{ prompt: "", type: "Text", options: ["", ""] }] as QuestionForm[],
    status: "Active" as Survey["status"],
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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
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

  const updateQuestionType = (index: number, value: QuestionForm["type"]) => {
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
      questions: [...current.questions, { prompt: "", type: "Text", options: ["", ""] }],
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
                  : question.options.filter(
                      (_, currentOptionIndex) => currentOptionIndex !== optionIndex
                    ),
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
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowForm((current) => !current)}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          {showForm ? "Close Form" : "Create Survey"}
        </button>
      </div>

      {showForm && (
        <div className="stat-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Create Survey</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Survey Title"
              className="w-full rounded border p-2"
              value={formData.title}
              onChange={(e) =>
                setFormData((current) => ({ ...current, title: e.target.value }))
              }
              required
            />

            <textarea
              placeholder="Survey description or question"
              className="w-full rounded border p-2"
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <select
                className="w-full rounded border p-2"
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
                className="w-full rounded border p-2"
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
                  className="text-sm text-blue-600 hover:text-blue-800"
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
                      className="w-full rounded border p-2"
                      value={question.prompt}
                      onChange={(e) => updateQuestionPrompt(index, e.target.value)}
                    />
                    <select
                      className="w-44 rounded border p-2"
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
                      className="rounded bg-red-100 px-3 py-2 text-red-700 disabled:opacity-50"
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
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Add Option
                        </button>
                      </div>

                      {question.options.map((option, optionIndex) => (
                        <div key={optionIndex} className="flex gap-2">
                          <input
                            type="text"
                            placeholder={`Option ${optionIndex + 1}`}
                            className="w-full rounded border p-2"
                            value={option}
                            onChange={(e) =>
                              updateOption(index, optionIndex, e.target.value)
                            }
                          />
                          <button
                            type="button"
                            onClick={() => removeOption(index, optionIndex)}
                            className="rounded bg-red-100 px-3 py-2 text-red-700 disabled:opacity-50"
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
                className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Survey"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600"
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {surveys.map((survey) => (
            <div key={survey._id} className="stat-card space-y-4 p-5">
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
                  <Trash2 className="h-4 w-4" />
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
                  <p className="mt-1 inline-flex items-center gap-2 font-medium">
                    <BarChart3 className="h-4 w-4" />
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
                      <div key={index} className="space-y-1 text-sm">
                        <p>
                          {index + 1}. {question.prompt}
                        </p>
                        <p className="text-xs text-muted-foreground">Type: {question.type}</p>
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
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
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
                  className="text-sm text-blue-600 hover:text-blue-800"
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
