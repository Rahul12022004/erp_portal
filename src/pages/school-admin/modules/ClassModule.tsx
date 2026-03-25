import { useEffect, useMemo, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Edit, GraduationCap, Plus, Trash2, UserPlus, Users } from "lucide-react";

type Teacher = { _id: string; name: string; email: string; position: string; status?: string };
type Student = { _id: string; name: string; email: string; rollNumber: string; class: string; phone?: string };
type SchoolClass = {
  _id: string;
  name: string;
  section?: string;
  stream?: string;
  classTeacher?: Teacher | null;
  studentCount: number;
  academicYear?: string;
  description?: string;
};
type ClassFormData = {
  name: string;
  section: string;
  stream: string;
  classTeacher: string;
  academicYear: string;
  description: string;
};

const createDefaultAcademicYear = () => {
  const currentYear = new Date().getFullYear();
  return `${currentYear}-${currentYear + 1}`;
};

const CLASS_NUMBER_OPTIONS = Array.from({ length: 12 }, (_, index) => `Class ${index + 1}`);
const SECTION_OPTIONS = ["A", "B", "C", "D", "E", "F"];

const defaultClassForm = (): ClassFormData => ({
  name: "",
  section: "",
  stream: "",
  classTeacher: "",
  academicYear: createDefaultAcademicYear(),
  description: "",
});

const getClassLabel = (schoolClass: Pick<SchoolClass, "name" | "section">) =>
  schoolClass.section ? `${schoolClass.name} - ${schoolClass.section}` : schoolClass.name;

export default function ClassModule() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showClassForm, setShowClassForm] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [openClassName, setOpenClassName] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [savingClass, setSavingClass] = useState(false);
  const [savingStudent, setSavingStudent] = useState(false);
  const [showUnassignedStudents, setShowUnassignedStudents] = useState(false);
  const [classForm, setClassForm] = useState<ClassFormData>(defaultClassForm);

  useEffect(() => {
    void fetchData();
  }, []);

  useEffect(() => {
    if (selectedClassId && !classes.some((schoolClass) => schoolClass._id === selectedClassId)) {
      setSelectedClassId("");
    }
  }, [classes, selectedClassId]);

  useEffect(() => {
    if (openClassName && !classes.some((schoolClass) => schoolClass.name === openClassName)) {
      setOpenClassName("");
    }
  }, [classes, openClassName]);

  const activeClass =
    classes.find((schoolClass) => schoolClass._id === selectedClassId) || null;

  useEffect(() => {
    setSelectedTeacherId(activeClass?.classTeacher?._id || "");
    setShowUnassignedStudents(false);
    if (activeClass?.name) setOpenClassName(activeClass.name);
  }, [activeClass]);

  const classStudents = useMemo(() => {
    if (!activeClass) return [];
    const activeClassLabel = getClassLabel(activeClass);
    return students
      .filter((student) => student.class === activeClassLabel)
      .sort((left, right) => left.rollNumber.localeCompare(right.rollNumber));
  }, [activeClass, students]);

  const unassignedStudents = useMemo(() => {
    const validClassNames = new Set(classes.map((schoolClass) => getClassLabel(schoolClass)));
    return students
      .filter((student) => !student.class?.trim() || !validClassNames.has(student.class))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [classes, students]);

  const classGroups = useMemo(() => {
    const grouped = classes.reduce<Record<string, SchoolClass[]>>((acc, schoolClass) => {
      if (!acc[schoolClass.name]) acc[schoolClass.name] = [];
      acc[schoolClass.name].push(schoolClass);
      return acc;
    }, {});

    return Object.entries(grouped)
      .sort(([left], [right]) =>
        left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" })
      )
      .map(([className, sections]) => ({
        className,
        sections: [...sections].sort((left, right) =>
          (left.section || "").localeCompare(right.section || "", undefined, {
            sensitivity: "base",
          })
        ),
        totalStudents: sections.reduce((sum, schoolClass) => sum + schoolClass.studentCount, 0),
      }));
  }, [classes]);

  const activeTeacherName = activeClass?.classTeacher?.name || "No teacher assigned";

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const school = JSON.parse(localStorage.getItem("school") || "{}");
      if (!school?._id) {
        setClasses([]);
        setStudents([]);
        setTeachers([]);
        setError("School not found. Please log in again.");
        return;
      }

      const [classesRes, studentsRes, staffRes] = await Promise.all([
        fetch(`http://localhost:5000/api/classes/${school._id}`),
        fetch(`http://localhost:5000/api/students/${school._id}`),
        fetch(`http://localhost:5000/api/staff/${school._id}`),
      ]);

      if (!classesRes.ok) throw new Error(`Failed to load classes (${classesRes.status})`);
      if (!studentsRes.ok) throw new Error(`Failed to load students (${studentsRes.status})`);
      if (!staffRes.ok) throw new Error(`Failed to load teachers (${staffRes.status})`);

      const [classesData, studentsData, staffData] = await Promise.all([
        classesRes.json(),
        studentsRes.json(),
        staffRes.json(),
      ]);

      setClasses(Array.isArray(classesData) ? classesData : []);
      setStudents(Array.isArray(studentsData) ? studentsData : []);
      setTeachers(
        (Array.isArray(staffData) ? staffData : []).filter(
          (staff: Teacher) => staff.position?.toLowerCase() === "teacher"
        )
      );
    } catch (err) {
      console.error("Class module fetch error:", err);
      setClasses([]);
      setStudents([]);
      setTeachers([]);
      setError(err instanceof Error ? err.message : "Failed to load class module");
    } finally {
      setLoading(false);
    }
  };

  const resetClassForm = () => {
    setClassForm(defaultClassForm());
    setEditingClass(null);
    setShowClassForm(false);
  };

  const toggleClassGroup = (className: string) => {
    setOpenClassName((current) => {
      const nextClassName = current === className ? "" : className;
      if (!nextClassName && activeClass?.name === className) {
        setSelectedClassId("");
        setShowUnassignedStudents(false);
      }
      return nextClassName;
    });
  };

  const toggleSectionCard = (schoolClass: SchoolClass) => {
    setSelectedClassId((current) => {
      const nextClassId = current === schoolClass._id ? "" : schoolClass._id;
      setShowUnassignedStudents(false);
      if (nextClassId) setOpenClassName(schoolClass.name);
      return nextClassId;
    });
  };

  const handleClassSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedName = classForm.name.trim();
    const trimmedSection = classForm.section.trim().toUpperCase();
    if (!trimmedName) return alert("Class name is required.");
    if (!CLASS_NUMBER_OPTIONS.includes(trimmedName)) {
      return alert("Please select a valid class number.");
    }
    if (trimmedSection && !SECTION_OPTIONS.includes(trimmedSection)) {
      return alert("Please select a valid section letter.");
    }

    const duplicateClass = classes.find(
      (schoolClass) =>
        schoolClass._id !== editingClass?._id &&
        schoolClass.name.trim().toLowerCase() === trimmedName.toLowerCase() &&
        (schoolClass.section || "").toUpperCase() === trimmedSection
    );
    if (duplicateClass) return alert("This class number and section already exist.");

    try {
      setSavingClass(true);
      const school = JSON.parse(localStorage.getItem("school") || "{}");
      if (!school?._id) return alert("School not found. Please log in again.");

      const previousClassName = editingClass ? getClassLabel(editingClass) : "";
      const nextClassName = getClassLabel({ name: trimmedName, section: trimmedSection });
      const res = await fetch(
        editingClass
          ? `http://localhost:5000/api/classes/${editingClass._id}`
          : "http://localhost:5000/api/classes",
        {
          method: editingClass ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: trimmedName,
            section: trimmedSection,
            stream: classForm.stream.trim(),
            classTeacher: classForm.classTeacher || null,
            academicYear: classForm.academicYear.trim(),
            description: classForm.description.trim(),
            schoolId: school._id,
          }),
        }
      );

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to save class");

      if (editingClass && previousClassName !== nextClassName) {
        const impactedStudents = students.filter((student) => student.class === previousClassName);
        const updateResponses = await Promise.all(
          impactedStudents.map((student) =>
            fetch(`http://localhost:5000/api/students/${student._id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ class: nextClassName }),
            })
          )
        );

        if (updateResponses.some((response) => !response.ok)) {
          throw new Error("The class name changed, but some students could not be moved.");
        }
      }

      await fetchData();
      setOpenClassName(data.data.name);
      setSelectedClassId(data.data._id);
      resetClassForm();
    } catch (err) {
      console.error("Save class error:", err);
      alert(err instanceof Error ? err.message : "Failed to save class");
    } finally {
      setSavingClass(false);
    }
  };

  const handleDeleteClass = async (schoolClass: SchoolClass) => {
    if (schoolClass.studentCount > 0) {
      return alert("Move or remove the students from this class before deleting it.");
    }
    if (!confirm(`Delete ${getClassLabel(schoolClass)}?`)) return;

    try {
      const res = await fetch(`http://localhost:5000/api/classes/${schoolClass._id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to delete class");
      await fetchData();
    } catch (err) {
      console.error("Delete class error:", err);
      alert(err instanceof Error ? err.message : "Failed to delete class");
    }
  };

  const startEditClass = (schoolClass: SchoolClass) => {
    setEditingClass(schoolClass);
    setClassForm({
      name: schoolClass.name,
      section: schoolClass.section || "",
      stream: schoolClass.stream || "",
      classTeacher: schoolClass.classTeacher?._id || "",
      academicYear: schoolClass.academicYear || createDefaultAcademicYear(),
      description: schoolClass.description || "",
    });
    setShowClassForm(true);
  };

  const handleTeacherAssign = async () => {
    if (!activeClass) return;

    try {
      setSavingClass(true);
      const res = await fetch(`http://localhost:5000/api/classes/${activeClass._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classTeacher: selectedTeacherId || null }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to assign class teacher");
      }
      await fetchData();
      setSelectedClassId(activeClass._id);
    } catch (err) {
      console.error("Assign teacher error:", err);
      alert(err instanceof Error ? err.message : "Failed to assign class teacher");
    } finally {
      setSavingClass(false);
    }
  };

  const handleAssignUnassignedStudent = async (studentId: string) => {
    if (!activeClass) return;

    try {
      setSavingStudent(true);
      const res = await fetch(`http://localhost:5000/api/students/${studentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ class: getClassLabel(activeClass) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || "Failed to assign student");
      await fetchData();
      setSelectedClassId(activeClass._id);
    } catch (err) {
      console.error("Assign unassigned student error:", err);
      alert(err instanceof Error ? err.message : "Failed to assign student");
    } finally {
      setSavingStudent(false);
    }
  };

  const renderActivePanels = () => {
    if (!activeClass) return null;

    return (
      <div className="space-y-6 border-t border-border/70 pt-6" onClick={(e) => e.stopPropagation()}>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="space-y-4 rounded-2xl border border-border/60 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h4 className="text-base font-semibold">Assigned Teacher</h4>
                <p className="text-sm text-muted-foreground">{activeTeacherName}</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                {classStudents.length} students
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
              <select
                className="rounded-xl border p-2.5"
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
              >
                <option value="">No class teacher</option>
                {teachers.map((teacher) => (
                  <option key={teacher._id} value={teacher._id}>
                    {teacher.name} ({teacher.email})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => void handleTeacherAssign()}
                disabled={savingClass}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {savingClass ? "Saving..." : "Assign Teacher"}
              </button>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-border/60 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-blue-600" />
              <h4 className="text-base font-semibold">Assign Unassigned Students</h4>
            </div>

            <button
              type="button"
              onClick={() => setShowUnassignedStudents((current) => !current)}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-white hover:bg-emerald-700"
            >
              {showUnassignedStudents ? "Hide Unassigned Students" : "Open Unassigned Student List"}
            </button>

            {!showUnassignedStudents ? (
              <p className="text-sm text-gray-500">
                Open the list to see students without a valid class and add them here.
              </p>
            ) : unassignedStudents.length === 0 ? (
              <p className="text-sm text-gray-500">No unassigned students found.</p>
            ) : (
              <div className="space-y-3">
                {unassignedStudents.map((student) => (
                  <div
                    key={student._id}
                    className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-muted-foreground">{student.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Roll {student.rollNumber}
                        {student.class?.trim()
                          ? ` - current value: ${student.class}`
                          : " - no class assigned"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleAssignUnassignedStudent(student._id)}
                      disabled={savingStudent}
                      className="rounded-xl bg-emerald-600 px-4 py-2.5 text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {savingStudent ? "Adding..." : "Add"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-blue-600" />
            <h4 className="text-base font-semibold">Students List</h4>
          </div>

          {classStudents.length === 0 ? (
            <p className="text-sm text-gray-500">No students are attached to this class yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-border/50">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="border-b">
                    <th className="p-2 text-left">Roll No</th>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Email</th>
                    <th className="p-2 text-left">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {classStudents.map((student) => (
                    <tr key={student._id} className="border-b bg-white hover:bg-slate-50">
                      <td className="p-2">{student.rollNumber}</td>
                      <td className="p-2 font-medium">{student.name}</td>
                      <td className="p-2">{student.email}</td>
                      <td className="p-2">{student.phone || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };


  const cardSpring = { type: "spring" as const, stiffness: 145, damping: 22, mass: 0.9 };
  const cardVariants = {
    open: {
      y: 0,
      scale: 1,
      zIndex: 30,
      transition: cardSpring,
    },
    stacked: (i: number) => ({
      y: i * 12,
      scale: 1 - i * 0.02,
      zIndex: 20 - i,
      transition: cardSpring,
    }),
  };

  const renderSectionCard = (schoolClass: SchoolClass, i: number) => (
    <motion.div
      key={schoolClass._id}
      className="stat-card space-y-4 border p-5 text-left transition cursor-pointer will-change-transform"
      style={{ position: "relative", marginTop: i === 0 ? 0 : -26 }}
      layout
      initial={false}
      animate={selectedClassId === schoolClass._id ? "open" : "stacked"}
      variants={cardVariants}
      custom={i}
      onClick={() => toggleSectionCard(schoolClass)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggleSectionCard(schoolClass);
        }
      }}
    >
      <div
        className={`flex items-start justify-between gap-3 rounded-2xl border p-4 ${
          selectedClassId === schoolClass._id
            ? "border-blue-200 bg-gradient-to-r from-blue-50 via-white to-emerald-50"
            : "border-border/60 bg-muted/20"
        }`}
      >
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold">{getClassLabel(schoolClass)}</h3>
            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
              {schoolClass.academicYear || "No year"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {selectedClassId === schoolClass._id
              ? "Expanded class management"
              : "Click to view teacher, students, and actions"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              startEditClass(schoolClass);
            }}
            className="cursor-pointer text-blue-600 hover:text-blue-800"
            title="Edit class"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void handleDeleteClass(schoolClass);
            }}
            className="cursor-pointer text-red-600 hover:text-red-800"
            title="Delete class"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform ${
              selectedClassId === schoolClass._id ? "rotate-180" : ""
            }`}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
        <div className="rounded-2xl border border-border/50 bg-white p-3 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Teacher</p>
          <p className="mt-1 font-medium">{schoolClass.classTeacher?.name || "Not assigned"}</p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-white p-3 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Students</p>
          <p className="mt-1 font-medium">{schoolClass.studentCount}</p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-white p-3 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Section</p>
          <p className="mt-1 font-medium">{schoolClass.section || "-"}</p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-white p-3 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Stream</p>
          <p className="mt-1 font-medium">{schoolClass.stream || "-"}</p>
        </div>
      </div>

      {schoolClass.description && (
        <div className="rounded-2xl border border-border/50 bg-amber-50/50 p-4">
          <p className="text-xs uppercase tracking-wide text-amber-700/80">Description</p>
          <p className="mt-2 text-sm text-muted-foreground">{schoolClass.description}</p>
        </div>
      )}

      <AnimatePresence initial={false} mode="wait">
        {selectedClassId === schoolClass._id && (
          <motion.div
            layout
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            {renderActivePanels()}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Class Management</h2>
          <p className="text-sm text-muted-foreground">
            Create classes, assign teachers, and manage class rosters.
          </p>
        </div>

        <button
          onClick={() => setShowClassForm(true)}
          className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Create Class
        </button>
      </div>

      {showClassForm && (
        <div className="stat-card p-6">
          <h3 className="mb-4 text-lg font-semibold">
            {editingClass ? "Edit Class" : "Create New Class"}
          </h3>

          <form onSubmit={handleClassSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <select
                className="rounded border p-2"
                value={classForm.name}
                onChange={(e) => setClassForm((current) => ({ ...current, name: e.target.value }))}
                required
              >
                <option value="">Select Class Number</option>
                {CLASS_NUMBER_OPTIONS.map((className) => (
                  <option key={className} value={className}>
                    {className.replace("Class ", "")}
                  </option>
                ))}
              </select>

              <select
                className="rounded border p-2"
                value={classForm.section}
                onChange={(e) => setClassForm((current) => ({ ...current, section: e.target.value }))}
              >
                <option value="">Select Section</option>
                {SECTION_OPTIONS.map((section) => (
                  <option key={section} value={section}>
                    {section}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Stream (optional)"
                className="rounded border p-2"
                value={classForm.stream}
                onChange={(e) => setClassForm((current) => ({ ...current, stream: e.target.value }))}
              />

              <select
                className="rounded border p-2"
                value={classForm.classTeacher}
                onChange={(e) =>
                  setClassForm((current) => ({ ...current, classTeacher: e.target.value }))
                }
              >
                <option value="">Select Class Teacher</option>
                {teachers.map((teacher) => (
                  <option key={teacher._id} value={teacher._id}>
                    {teacher.name} ({teacher.email})
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Academic Year"
                className="rounded border p-2"
                value={classForm.academicYear}
                onChange={(e) =>
                  setClassForm((current) => ({ ...current, academicYear: e.target.value }))
                }
              />
            </div>

            <textarea
              placeholder="Description or notes about the class"
              className="w-full rounded border p-2"
              rows={3}
              value={classForm.description}
              onChange={(e) =>
                setClassForm((current) => ({ ...current, description: e.target.value }))
              }
            />

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={savingClass}
                className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-60"
              >
                {savingClass
                  ? editingClass
                    ? "Updating..."
                    : "Creating..."
                  : editingClass
                    ? "Update Class"
                    : "Create Class"}
              </button>
              <button
                type="button"
                onClick={resetClassForm}
                className="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p className="text-center text-gray-500">Loading classes...</p>
      ) : error ? (
        <p className="text-center text-red-600">{error}</p>
      ) : (
        <div className="space-y-4">
          {classes.length === 0 ? (
            <div className="stat-card p-6">
              <p className="text-sm text-gray-500">
                No classes found yet. Create your first class to get started.
              </p>
            </div>
          ) : (
            classGroups.map(({ className, sections, totalStudents }) => (
              <div
                key={className}
                className={`stat-card overflow-hidden border transition ${
                  openClassName === className
                    ? "border-blue-200 bg-white shadow-lg"
                    : "border-border/60 bg-white/95 shadow-sm"
                }`}
              >
                <div
                  onClick={() => toggleClassGroup(className)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleClassGroup(className);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className={`flex flex-col gap-4 p-5 text-left transition md:flex-row md:items-center md:justify-between ${
                    openClassName === className
                      ? "bg-gradient-to-r from-blue-50 via-white to-emerald-50"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-semibold">{className}</h3>
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                        {sections.length} section{sections.length === 1 ? "" : "s"}
                      </span>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        {totalStudents} student{totalStudents === 1 ? "" : "s"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {openClassName === className
                        ? "Sections are open below. Click a section card to manage teacher and students."
                        : "Click to open this class and view all sections."}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="grid grid-cols-2 gap-2 text-sm md:min-w-[240px]">
                      <div className="rounded-2xl border border-border/50 bg-white px-3 py-2 shadow-sm">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Sections
                        </p>
                        <p className="mt-1 font-medium">
                          {sections.map((schoolClass) => schoolClass.section || "-").join(", ")}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-border/50 bg-white px-3 py-2 shadow-sm">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Active Card
                        </p>
                        <p className="mt-1 font-medium">
                          {activeClass?.name === className ? activeClass.section || "-" : "None"}
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 text-muted-foreground transition-transform ${
                        openClassName === className ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </div>

                {openClassName === className && (
                  <div className="space-y-4 border-t border-border/60 bg-slate-50/40 p-4 md:p-5">
                    {sections.map((schoolClass, i) => renderSectionCard(schoolClass, i))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
