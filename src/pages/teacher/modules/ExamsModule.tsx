import { useState } from "react";

export default function ExamsModule() {
  const [examName, setExamName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [exams, setExams] = useState<any[]>([]);

  const addExam = () => {
    const newExam = {
      id: Date.now(),
      name: examName,
      date: examDate,
    };

    setExams([...exams, newExam]);

    setExamName("");
    setExamDate("");
  };

  return (
    <div className="space-y-6">

      <input
        type="text"
        placeholder="Exam Name"
        className="border p-2 rounded w-full"
        value={examName}
        onChange={(e) => setExamName(e.target.value)}
      />

      <input
        type="date"
        className="border p-2 rounded w-full"
        value={examDate}
        onChange={(e) => setExamDate(e.target.value)}
      />

      <button
        onClick={addExam}
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        Declare Exam
      </button>

      <table className="w-full border">
        <tbody>
          {exams.map((exam) => (
            <tr key={exam.id}>
              <td className="p-2">{exam.name}</td>
              <td className="p-2">{exam.date}</td>
            </tr>
          ))}
        </tbody>
      </table>

    </div>
  );
}