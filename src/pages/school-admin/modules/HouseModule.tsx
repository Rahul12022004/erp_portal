import { useEffect, useMemo, useState } from "react";

type Student = {
  _id: string;
  name: string;
  class: string;
  rollNumber: string;
  house?: HouseName | "";
};

type SchoolClass = {
  _id: string;
  name: string;
  section?: string;
};

type HouseName = "Ruby" | "Emerald" | "Safier" | "Topaz";

const HOUSES: Array<{ name: HouseName; className: string }> = [
  { name: "Ruby", className: "bg-red-100 text-red-700 border-red-300" },
  { name: "Emerald", className: "bg-green-100 text-green-700 border-green-300" },
  { name: "Safier", className: "bg-blue-100 text-blue-700 border-blue-300" },
  { name: "Topaz", className: "bg-amber-100 text-amber-700 border-amber-300" },
];

const getClassLabel = (schoolClass: Pick<SchoolClass, "name" | "section">) =>
  schoolClass.section ? `${schoolClass.name} - ${schoolClass.section}` : schoolClass.name;

const splitClassLabel = (value: string): { className: string; section: string } => {
  const [left, right] = value.split(" - ");
  return {
    className: (left || "").trim(),
    section: (right || "").trim(),
  };
};

export default function HouseModule() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingStudentId, setSavingStudentId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    void fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const school = JSON.parse(localStorage.getItem("school") || "{}");
      if (!school?._id) {
        setError("School not found. Please log in again.");
        setStudents([]);
        setClasses([]);
        return;
      }

      const [studentsRes, classesRes] = await Promise.all([
        fetch(`https://erp-portal-1-ftwe.onrender.com/api/students/${school._id}`),
        fetch(`https://erp-portal-1-ftwe.onrender.com/api/classes/${school._id}`),
      ]);

      if (!studentsRes.ok || !classesRes.ok) {
        throw new Error(`Failed to load data (${studentsRes.status}/${classesRes.status})`);
      }

      const [studentsData, classesData] = await Promise.all([
        studentsRes.json(),
        classesRes.json(),
      ]);

      const parsedStudents = Array.isArray(studentsData) ? studentsData : [];
      const parsedClasses = Array.isArray(classesData) ? classesData : [];

      setStudents(parsedStudents);
      setClasses(parsedClasses);

      if (parsedClasses.length > 0 && !selectedClass) {
        const firstClassName = parsedClasses[0]?.name || "";
        setSelectedClass(firstClassName);
      }
    } catch (err) {
      console.error("House module fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch house data");
      setStudents([]);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const classOptions = useMemo(
    () => Array.from(new Set(classes.map((item) => item.name))).sort((a, b) => a.localeCompare(b)),
    [classes]
  );

  const sectionOptions = useMemo(() => {
    if (!selectedClass) return [];
    return Array.from(
      new Set(
        classes
          .filter((item) => item.name === selectedClass)
          .map((item) => item.section || "")
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [classes, selectedClass]);

  useEffect(() => {
    if (sectionOptions.length === 0) {
      setSelectedSection("");
      return;
    }
    if (!sectionOptions.includes(selectedSection)) {
      setSelectedSection(sectionOptions[0]);
    }
  }, [sectionOptions, selectedSection]);

  const filteredStudents = useMemo(() => {
    if (!selectedClass) return [];
    return students.filter((student) => {
      const parsed = splitClassLabel(student.class || "");
      if (parsed.className !== selectedClass) return false;
      if (sectionOptions.length > 0) {
        return parsed.section === selectedSection;
      }
      return true;
    });
  }, [students, selectedClass, selectedSection, sectionOptions.length]);

  const houseCounts = useMemo(() => {
    return HOUSES.map((house) => ({
      name: house.name,
      count: filteredStudents.filter((student) => student.house === house.name).length,
      className: house.className,
    }));
  }, [filteredStudents]);

  const assignHouse = async (student: Student, house: HouseName) => {
    try {
      setSavingStudentId(student._id);
      setError("");
      setSuccess("");

      const res = await fetch(`https://erp-portal-1-ftwe.onrender.com/api/students/${student._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ house }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || "Failed to assign house");
      }

      setStudents((current) =>
        current.map((item) => (item._id === student._id ? { ...item, house } : item))
      );
      setSuccess(`${student.name} assigned to ${house}.`);
    } catch (err) {
      console.error("Assign house error:", err);
      setError(err instanceof Error ? err.message : "Failed to assign house");
    } finally {
      setSavingStudentId("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="stat-card p-6">
        <h3 className="mb-4 text-lg font-semibold">House Assignment</h3>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        {success && <p className="mb-3 text-sm text-green-600">{success}</p>}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <select
            className="rounded border p-2"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="">Select Class</option>
            {classOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          <select
            className="rounded border p-2"
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            disabled={sectionOptions.length === 0}
          >
            {sectionOptions.length === 0 ? (
              <option value="">No section required</option>
            ) : (
              sectionOptions.map((section) => (
                <option key={section} value={section}>
                  Section {section}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {houseCounts.map((house) => (
          <div key={house.name} className={`rounded-lg border p-3 ${house.className}`}>
            <p className="text-sm font-medium">{house.name}</p>
            <p className="text-xl font-bold">{house.count}</p>
          </div>
        ))}
      </div>

      <div className="stat-card p-6">
        <h4 className="mb-4 text-base font-semibold">
          Students {selectedClass ? `- ${selectedClass}${selectedSection ? ` / ${selectedSection}` : ""}` : ""}
        </h4>

        {loading ? (
          <p className="text-gray-500">Loading students...</p>
        ) : filteredStudents.length === 0 ? (
          <p className="text-gray-500">No students found for selected class/section.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left">Name</th>
                  <th className="p-2 text-left">Roll No</th>
                  <th className="p-2 text-left">Class</th>
                  <th className="p-2 text-left">Current House</th>
                  <th className="p-2 text-left">Assign House</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student._id} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{student.name}</td>
                    <td className="p-2">{student.rollNumber}</td>
                    <td className="p-2">{student.class}</td>
                    <td className="p-2">{student.house || "-"}</td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-2">
                        {HOUSES.map((house) => (
                          <button
                            key={house.name}
                            type="button"
                            disabled={savingStudentId === student._id}
                            onClick={() => void assignHouse(student, house.name)}
                            className={`rounded border px-2 py-1 text-xs font-semibold ${house.className}`}
                          >
                            {house.name}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
