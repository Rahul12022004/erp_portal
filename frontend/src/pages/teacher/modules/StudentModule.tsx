import { useEffect, useState } from "react";

type Student = {
  _id: string;
  name: string;
  email: string;
  class: string;
  rollNumber: string;
  phone?: string;
  gender?: string;
};

type SchoolClass = {
  _id: string;
  name: string;
  section?: string;
  stream?: string;
  academicYear?: string;
  classTeacher?:
    | string
    | {
        _id: string;
        name: string;
      };
};

const getClassLabel = (schoolClass: Pick<SchoolClass, "name" | "section">) =>
  schoolClass.section ? `${schoolClass.name} - ${schoolClass.section}` : schoolClass.name;

export default function StudentsModule() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("All");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        const school = JSON.parse(localStorage.getItem("school") || "null");
        const teacher = JSON.parse(localStorage.getItem("teacher") || "null");

        if (!school?._id || !teacher?._id) {
          throw new Error("Teacher session not found. Please log in again.");
        }

        const [studentsRes, classesRes] = await Promise.all([
          fetch(`/api/students/${school._id}`),
          fetch(`/api/classes/${school._id}`),
        ]);

        if (!studentsRes.ok) {
          throw new Error(`Failed to load students (${studentsRes.status})`);
        }

        if (!classesRes.ok) {
          throw new Error(`Failed to load classes (${classesRes.status})`);
        }

        const [studentsData, classesData] = await Promise.all([
          studentsRes.json(),
          classesRes.json(),
        ]);

        const allClasses = Array.isArray(classesData) ? classesData : [];
        const teacherClasses = allClasses.filter((classItem: SchoolClass) => {
          if (!classItem.classTeacher) {
            return false;
          }

          if (typeof classItem.classTeacher === "string") {
            return classItem.classTeacher === teacher._id;
          }

          return classItem.classTeacher._id === teacher._id;
        });

        setStudents(Array.isArray(studentsData) ? studentsData : []);
        setClasses(teacherClasses);
      } catch (err) {
        console.error("Teacher students fetch error:", err);
        setStudents([]);
        setClasses([]);
        setError(
          err instanceof Error ? err.message : "Failed to fetch class students"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const sortedClasses = [...classes].sort((a, b) => a.name.localeCompare(b.name));

  const groupedStudents = sortedClasses.reduce((acc, schoolClass) => {
    const classLabel = getClassLabel(schoolClass);
    acc[classLabel] = students
      .filter((student) => student.class === classLabel)
      .sort((a, b) => a.rollNumber.localeCompare(b.rollNumber));
    return acc;
  }, {} as Record<string, Student[]>);

  const filteredClasses = Object.keys(groupedStudents).filter(
    (className) => selectedClass === "All" || className === selectedClass
  );

  const filteredStudents = filteredClasses.reduce((acc, className) => {
    const classStudents = groupedStudents[className].filter((student) => {
      const query = search.toLowerCase();
      return (
        student.name.toLowerCase().includes(query) ||
        student.rollNumber.toLowerCase().includes(query) ||
        student.email.toLowerCase().includes(query)
      );
    });

    acc[className] = classStudents;
    return acc;
  }, {} as Record<string, Student[]>);

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <div className="flex-1">
          <input
            placeholder="Search students..."
            className="border p-2 w-full rounded"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="border p-2 rounded"
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
        >
          <option value="All">All Classes</option>
          {sortedClasses.map((schoolClass) => (
            <option key={schoolClass._id} value={getClassLabel(schoolClass)}>
              {getClassLabel(schoolClass)}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-center text-gray-500">Loading students...</p>
      ) : error ? (
        <p className="text-center text-red-600">{error}</p>
      ) : sortedClasses.length === 0 ? (
        <p className="text-center text-gray-500">
          No classes are assigned to this teacher yet.
        </p>
      ) : Object.keys(filteredStudents).length === 0 ? (
        <p className="text-center text-gray-500">
          No students found for the selected filters.
        </p>
      ) : (
        <div className="space-y-6">
          {Object.entries(filteredStudents).map(([className, classStudents]) => {
            const classInfo = sortedClasses.find(
              (schoolClass) => getClassLabel(schoolClass) === className
            );

            return (
              <div key={className} className="stat-card p-6">
                <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-blue-600">
                      {className} ({classStudents.length} students)
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {classInfo?.section ? `Section ${classInfo.section}` : "Section not set"}
                      {classInfo?.stream ? ` • ${classInfo.stream}` : ""}
                      {classInfo?.academicYear ? ` • ${classInfo.academicYear}` : ""}
                    </p>
                  </div>
                </div>

                {classStudents.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No students are attached to this class yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Roll No</th>
                          <th className="text-left p-2">Name</th>
                          <th className="text-left p-2">Email</th>
                          <th className="text-left p-2">Phone</th>
                          <th className="text-left p-2">Gender</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classStudents.map((student) => (
                          <tr key={student._id} className="border-b hover:bg-gray-50">
                            <td className="p-2">{student.rollNumber}</td>
                            <td className="p-2 font-medium">{student.name}</td>
                            <td className="p-2">{student.email}</td>
                            <td className="p-2">{student.phone || "-"}</td>
                            <td className="p-2">{student.gender || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
