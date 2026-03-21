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