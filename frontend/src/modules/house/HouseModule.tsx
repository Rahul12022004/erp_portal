import { useEffect, useMemo, useState, type FormEvent } from "react";

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

type HouseSectionConfig = {
  id: string;
  className: string;
  section: string;
  house: HouseName;
};

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
  const school = useMemo(() => JSON.parse(localStorage.getItem("school") || "{}"), []);
  const schoolId = school?._id || "";

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [targetHouse, setTargetHouse] = useState<HouseName>("Ruby");
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [houseConfigs, setHouseConfigs] = useState<HouseSectionConfig[]>([]);
  const [configForm, setConfigForm] = useState<{ className: string; section: string; house: HouseName }>({
    className: "",
    section: "",
    house: "Ruby",
  });
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

      if (!school?._id) {
        setError("School not found. Please log in again.");
        setStudents([]);
        setClasses([]);
        return;
      }

      const [studentsRes, classesRes] = await Promise.all([
        fetch(`/api/students/${school._id}`),
        fetch(`/api/classes/${school._id}`),
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

  useEffect(() => {
    if (!schoolId) {
      setHouseConfigs([]);
      return;
    }

    const key = `house-class-configs:${schoolId}`;
    const saved = localStorage.getItem(key);

    try {
      const parsed = saved ? JSON.parse(saved) : [];
      setHouseConfigs(Array.isArray(parsed) ? parsed : []);
    } catch {
      setHouseConfigs([]);
    }
  }, [schoolId]);

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

      const res = await fetch(`/api/students/${student._id}`, {
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

  const saveConfigs = (configs: HouseSectionConfig[]) => {
    if (!schoolId) return;
    localStorage.setItem(`house-class-configs:${schoolId}`, JSON.stringify(configs));
  };

  const assignStudentsInScope = async (className: string, section: string, house: HouseName) => {
    const targets = students.filter((student) => {
      const parsed = splitClassLabel(student.class || "");
      if (parsed.className !== className) return false;
      if (section) return parsed.section === section;
      return true;
    });

    const toUpdate = targets.filter((student) => student.house !== house);
    if (toUpdate.length === 0) {
      setSuccess(`All students are already in ${house}.`);
      return;
    }

    await Promise.all(
      toUpdate.map(async (student) => {
        const res = await fetch(`/api/students/${student._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ house }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.message || `Failed to assign ${student.name}`);
        }
      })
    );

    setStudents((current) =>
      current.map((student) => {
        const parsed = splitClassLabel(student.class || "");
        const inScope = parsed.className === className && (!section || parsed.section === section);
        return inScope ? { ...student, house } : student;
      })
    );
  };

  const handleAutoAssignSelected = async () => {
    if (!selectedClass) {
      setError("Please select class first.");
      return;
    }

    try {
      setAutoAssigning(true);
      setError("");
      setSuccess("");
      await assignStudentsInScope(selectedClass, selectedSection, targetHouse);
      setSuccess(
        `Students of ${selectedClass}${selectedSection ? ` / ${selectedSection}` : ""} assigned to ${targetHouse}.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to auto assign house");
    } finally {
      setAutoAssigning(false);
    }
  };

  const handleCreateConfig = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!configForm.className) {
      setError("Please select class for house section.");
      return;
    }

    try {
      setConfigSaving(true);
      setError("");
      setSuccess("");

      const id = `${configForm.className}::${configForm.section || ""}`;
      const nextConfig: HouseSectionConfig = {
        id,
        className: configForm.className,
        section: configForm.section,
        house: configForm.house,
      };

      const nextConfigs = [...houseConfigs.filter((item) => item.id !== id), nextConfig];
      setHouseConfigs(nextConfigs);
      saveConfigs(nextConfigs);

      await assignStudentsInScope(configForm.className, configForm.section, configForm.house);

      setSuccess(
        `House section created for ${configForm.className}${configForm.section ? ` / ${configForm.section}` : ""} -> ${configForm.house}.`
      );
      setConfigForm((current) => ({ ...current, section: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create house section");
    } finally {
      setConfigSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div
        className="rounded-[28px] p-6"
        style={{
          background: "#eef6ff",
          boxShadow:
            "8px 8px 22px rgba(15,23,42,0.15), inset -4px -4px 10px rgba(15,23,42,0.08), inset 4px 4px 10px rgba(255,255,255,0.7)",
        }}
      >
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

        <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <p className="mb-2 text-sm font-semibold text-blue-800">Auto assign students to a specific house</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <select
              className="rounded border p-2"
              value={targetHouse}
              onChange={(e) => setTargetHouse(e.target.value as HouseName)}
            >
              {HOUSES.map((house) => (
                <option key={house.name} value={house.name}>
                  {house.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={autoAssigning || !selectedClass}
              onClick={() => void handleAutoAssignSelected()}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {autoAssigning ? "Assigning..." : "Auto Assign Selected Class"}
            </button>
            <p className="text-sm text-blue-700">
              Scope: {selectedClass || "-"} {selectedSection ? `/ ${selectedSection}` : ""}
            </p>
          </div>
        </div>
      </div>

      <div
        className="rounded-[28px] p-6"
        style={{
          background: "#f5f3ff",
          boxShadow:
            "8px 8px 22px rgba(30,41,59,0.12), inset -4px -4px 10px rgba(15,23,42,0.08), inset 4px 4px 10px rgba(255,255,255,0.72)",
        }}
      >
        <h3 className="mb-4 text-lg font-semibold">Create House Section For Class</h3>

        <form onSubmit={(e) => void handleCreateConfig(e)} className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <select
            className="rounded border p-2"
            value={configForm.className}
            onChange={(e) => setConfigForm((current) => ({ ...current, className: e.target.value }))}
            required
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
            value={configForm.section}
            onChange={(e) => setConfigForm((current) => ({ ...current, section: e.target.value }))}
          >
            <option value="">All Sections</option>
            {Array.from(
              new Set(
                classes
                  .filter((item) => item.name === configForm.className)
                  .map((item) => item.section || "")
                  .filter(Boolean)
              )
            )
              .sort((a, b) => a.localeCompare(b))
              .map((section) => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
          </select>

          <select
            className="rounded border p-2"
            value={configForm.house}
            onChange={(e) => setConfigForm((current) => ({ ...current, house: e.target.value as HouseName }))}
          >
            {HOUSES.map((house) => (
              <option key={house.name} value={house.name}>
                {house.name}
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={configSaving}
            className="rounded bg-violet-600 px-4 py-2 text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {configSaving ? "Saving..." : "Create & Apply"}
          </button>
        </form>

        {houseConfigs.length > 0 && (
          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
            {houseConfigs.map((config) => (
              <div key={config.id} className="rounded-xl border border-violet-200 bg-white/70 p-3 text-sm">
                <p className="font-semibold text-slate-800">{config.className}{config.section ? ` / ${config.section}` : " / All"}</p>
                <p className="text-violet-700">House: {config.house}</p>
              </div>
            ))}
          </div>
        )}
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
