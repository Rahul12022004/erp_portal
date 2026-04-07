import { useEffect, useMemo, useState, useCallback } from "react";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock3,
  Download,
  Edit3,
  FileSpreadsheet,
  GraduationCap,
  Info,
  Lock,
  RefreshCw,
  School,
  Sparkles,
  UserCog,
  Users,
  Wand2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as timetableService from "@/services/timetableService";

type Day = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";

type SubjectType = "Core" | "Lab" | "Language" | "Elective" | "Sports";

type TimetableStatus = "draft" | "published";

type WizardStep = {
  key: string;
  title: string;
  hint: string;
};

type SchoolClass = timetableService.ClassData;

type Teacher = timetableService.TeacherData;

type Room = timetableService.RoomData;

type SubjectRequirement = timetableService.SubjectRequirement;

type EntryStatus = {
  locked?: boolean;
  substituted?: boolean;
  edited?: boolean;
};

type TimetableEntry = {
  id: string;
  classId: string;
  day: Day;
  periodIndex: number;
  subject: string;
  teacherId: string;
  roomId: string;
  status: EntryStatus;
  updatedAt: string;
  updatedBy: string;
  subjectType?: SubjectType;
  substituteTeacherId?: string;
};

type Conflict = {
  id: string;
  severity: "high" | "medium" | "low";
  type:
    | "Teacher Clash"
    | "Room Clash"
    | "Class Clash"
    | "Unavailable Teacher"
    | "Missing Subject Requirement";
  message: string;
  suggestion: string;
  day?: Day;
  periodIndex?: number;
  classId?: string;
  teacherId?: string;
  roomId?: string;
};

const WEEK_DAYS: Day[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const STEPS: WizardStep[] = [
  { key: "academic", title: "Academic structure setup", hint: "Academic year, term, class and section." },
  { key: "timing", title: "School timing setup", hint: "Working days, periods, duration, breaks and assembly." },
  { key: "subjects", title: "Subject and weekly period setup", hint: "Define weekly subject load class-wise." },
  { key: "mapping", title: "Teacher-subject-class mapping", hint: "Map faculty for each subject and class." },
  { key: "availability", title: "Teacher availability", hint: "Capture unavailable slots and leave windows." },
  { key: "rooms", title: "Room allocation", hint: "Classroom and lab assignment policies." },
  { key: "rules", title: "Rule configuration", hint: "Configure generation constraints." },
  { key: "auto", title: "Auto generation", hint: "Generate a first draft timetable." },
  { key: "conflict", title: "Conflict review", hint: "Resolve clashes and missing requirements." },
  { key: "manual", title: "Manual adjustment", hint: "Fine tune with click-to-edit and lock entries." },
  { key: "publish", title: "Publish workflow", hint: "Release to teacher, student and parent portals." },
];

const SUBJECT_TYPE_CLASSES: Record<SubjectType, string> = {
  Core: "bg-emerald-50 border-emerald-200 text-emerald-800",
  Lab: "bg-cyan-50 border-cyan-200 text-cyan-800",
  Language: "bg-blue-50 border-blue-200 text-blue-800",
  Elective: "bg-amber-50 border-amber-200 text-amber-800",
  Sports: "bg-lime-50 border-lime-200 text-lime-800",
};

const inferSubjectType = (subject: string, roomType?: Room["type"]): SubjectType => {
  const s = subject.toLowerCase();
  if (roomType === "lab" || s.includes("lab")) return "Lab";
  if (roomType === "sports" || s.includes("physical") || s.includes("sport")) return "Sports";
  if (s.includes("english") || s.includes("hindi") || s.includes("language")) return "Language";
  if (s.includes("elective") || s.includes("art") || s.includes("music")) return "Elective";
  return "Core";
};

const createSlotTime = (startHour: number, startMinute: number, duration: number, slot: number) => {
  const total = startHour * 60 + startMinute + duration * slot;
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

export default function TimetableModule() {
  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Backend data
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [subjectRequirements, setSubjectRequirements] = useState<SubjectRequirement[]>([]);
  const [teacherUnavailableSlots, setTeacherUnavailableSlots] = useState<Record<string, string[]>>({});

  // UI state
  const [wizardStep, setWizardStep] = useState(0);
  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [term, setTerm] = useState("Term 1");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSection, setSelectedSection] = useState("A");
  const [selectedTeacherId, setSelectedTeacherId] = useState("all");
  const [selectedRoomId, setSelectedRoomId] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | TimetableStatus>("all");
  const [tab, setTab] = useState("class");

  const [schoolStartTime, setSchoolStartTime] = useState("08:00");
  const [periodDuration, setPeriodDuration] = useState(45);
  const [periodsPerDay, setPeriodsPerDay] = useState(8);
  const [lunchAfterPeriod, setLunchAfterPeriod] = useState(4);
  const [shortBreakAfterPeriod, setShortBreakAfterPeriod] = useState(2);

  const [status, setStatus] = useState<TimetableStatus>("draft");
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(new Date().toISOString());
  const [lastUpdatedBy, setLastUpdatedBy] = useState("Admin User");
  const [validationMessage, setValidationMessage] = useState("");

  // Fetch data from backend on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [classesData, teachersData, roomsData, requirementsData, unavailableSlotsData] =
          await Promise.all([
            timetableService.fetchClasses(),
            timetableService.fetchTeachers(),
            timetableService.fetchRooms(),
            timetableService.fetchSubjectRequirements(),
            timetableService.fetchTeacherUnavailableSlots(),
          ]);

        setClasses(classesData);
        setTeachers(teachersData);
        setRooms(roomsData);
        setSubjectRequirements(requirementsData);

        // Convert unavailable slots to map format
        const unavailableMap: Record<string, string[]> = {};
        unavailableSlotsData.forEach((slot) => {
          if (!unavailableMap[slot.teacherId]) {
            unavailableMap[slot.teacherId] = [];
          }
          unavailableMap[slot.teacherId].push(`${slot.day}-${slot.periodIndex}`);
        });
        setTeacherUnavailableSlots(unavailableMap);

        // Set default selected class if available
        if (classesData.length > 0) {
          setSelectedClassId(classesData[0].id);
        }

      } catch (err) {
        console.error("Error fetching timetable data:", err);
        setError(err instanceof Error ? err.message : "Failed to load timetable data from backend.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Generate default entries when backend data is loaded and no entries exist
  useEffect(() => {
    if (!loading && classes.length > 0 && teachers.length > 0 && rooms.length > 0 && entries.length === 0) {
      const days = WEEK_DAYS;
      const periodsPerDayVal = periodsPerDay;
      const generated: TimetableEntry[] = [];
      const requirementByClass = classes.reduce<Record<string, SubjectRequirement[]>>((acc, schoolClass) => {
        acc[schoolClass.id] = subjectRequirements.filter((item) => item.classId === schoolClass.id);
        return acc;
      }, {});

      classes.forEach((schoolClass) => {
        const queue = requirementByClass[schoolClass.id]
          .flatMap((req) => Array.from({ length: req.requiredPeriodsPerWeek }, () => req))
          .sort((a, b) => a.subject.localeCompare(b.subject));

        let cursor = 0;

        days.forEach((day) => {
          for (let periodIndex = 0; periodIndex < periodsPerDayVal; periodIndex += 1) {
            if (periodIndex === 0 || periodIndex === 2 || periodIndex === 4) {
              continue;
            }

            const item = queue[cursor % queue.length];
            cursor += 1;

            const defaultRoom =
              rooms.find(
                (room) =>
                  room.type === item.preferredRoomType &&
                  (item.preferredRoomType !== "classroom" ||
                    room.name.toLowerCase().includes(schoolClass.section?.toLowerCase() || ""))
              ) ||
              rooms.find((room) => room.type === item.preferredRoomType) ||
              rooms[0];

            if (defaultRoom) {
              generated.push({
                id: `${schoolClass.id}-${day}-${periodIndex}`,
                classId: schoolClass.id,
                day,
                periodIndex,
                subject: item.subject,
                teacherId: item.teacherId,
                roomId: defaultRoom.id,
                subjectType: inferSubjectType(item.subject, defaultRoom.type),
                status: {},
                updatedAt: new Date().toISOString(),
                updatedBy: "Auto Scheduler",
              });
            }
          }
        });
      });

      setEntries(generated);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, classes, teachers, rooms, subjectRequirements, periodsPerDay]); // entries.length excluded intentionally to avoid infinite loop

  // Create lookup objects from backend data
  const teacherById = useMemo(
    () => Object.fromEntries(teachers.map((teacher) => [teacher.id, teacher])),
    [teachers]
  );

  const roomById = useMemo(() => Object.fromEntries(rooms.map((room) => [room.id, room])), [rooms]);

  const classById = useMemo(
    () => Object.fromEntries(classes.map((schoolClass) => [schoolClass.id, schoolClass])),
    [classes]
  );

  const toClassLabel = useCallback((classId: string) => {
    const cls = classById[classId];
    if (!cls) return classId;
    return `${cls.name} - ${cls.section || ""}`.trim();
  }, [classById]);

  const periods = useMemo(
    () =>
      Array.from({ length: periodsPerDay }, (_, index) => ({
        index,
        label: `P${index + 1}`,
        start: createSlotTime(Number(schoolStartTime.split(":")[0]), Number(schoolStartTime.split(":")[1]), periodDuration, index),
      })),
    [periodsPerDay, schoolStartTime, periodDuration]
  );

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (selectedTeacherId !== "all" && entry.teacherId !== selectedTeacherId) return false;
      if (selectedRoomId !== "all" && entry.roomId !== selectedRoomId) return false;
      if (selectedClassId && entry.classId !== selectedClassId && tab === "class") return false;
      if (selectedSection && classById[entry.classId]?.section !== selectedSection && tab === "class") return false;
      if (statusFilter !== "all" && status !== statusFilter) return false;
      return true;
    });
  }, [entries, selectedTeacherId, selectedRoomId, selectedClassId, selectedSection, statusFilter, status, tab, classById]);

  const conflicts = useMemo(() => {
    const detected: Conflict[] = [];

    const teacherSlotMap: Record<string, TimetableEntry[]> = {};
    const roomSlotMap: Record<string, TimetableEntry[]> = {};
    const classSlotMap: Record<string, TimetableEntry[]> = {};

    filteredEntries.forEach((entry) => {
      const slotKey = `${entry.day}-${entry.periodIndex}`;
      const teacherKey = `${slotKey}-${entry.teacherId}`;
      const roomKey = `${slotKey}-${entry.roomId}`;
      const classKey = `${slotKey}-${entry.classId}`;

      teacherSlotMap[teacherKey] = [...(teacherSlotMap[teacherKey] || []), entry];
      roomSlotMap[roomKey] = [...(roomSlotMap[roomKey] || []), entry];
      classSlotMap[classKey] = [...(classSlotMap[classKey] || []), entry];

      const unavailable = teacherUnavailableSlots[entry.teacherId] || [];
      if (unavailable.includes(slotKey)) {
        detected.push({
          id: `unavailable-${entry.id}`,
          severity: "high",
          type: "Unavailable Teacher",
          message: `${teacherById[entry.teacherId]?.name || "Teacher"} is unavailable for ${entry.day} ${periods[entry.periodIndex]?.label}.`,
          suggestion: "Assign substitute teacher or move this subject to an available slot.",
          day: entry.day,
          periodIndex: entry.periodIndex,
          classId: entry.classId,
          teacherId: entry.teacherId,
        });
      }
    });

    Object.values(teacherSlotMap).forEach((slotEntries) => {
      if (slotEntries.length > 1) {
        const sample = slotEntries[0];
        detected.push({
          id: `teacher-clash-${sample.day}-${sample.periodIndex}-${sample.teacherId}`,
          severity: "high",
          type: "Teacher Clash",
          message: `${teacherById[sample.teacherId]?.name || "Teacher"} is assigned to multiple classes at ${sample.day} ${periods[sample.periodIndex]?.label}.`,
          suggestion: "Reassign one class to another teacher with matching subject expertise.",
          day: sample.day,
          periodIndex: sample.periodIndex,
          teacherId: sample.teacherId,
        });
      }
    });

    Object.values(roomSlotMap).forEach((slotEntries) => {
      if (slotEntries.length > 1) {
        const sample = slotEntries[0];
        detected.push({
          id: `room-clash-${sample.day}-${sample.periodIndex}-${sample.roomId}`,
          severity: "high",
          type: "Room Clash",
          message: `${roomById[sample.roomId]?.name || "Room"} is double-booked on ${sample.day} ${periods[sample.periodIndex]?.label}.`,
          suggestion: "Move one class to another available room of the same type.",
          day: sample.day,
          periodIndex: sample.periodIndex,
          roomId: sample.roomId,
        });
      }
    });

    Object.values(classSlotMap).forEach((slotEntries) => {
      if (slotEntries.length > 1) {
        const sample = slotEntries[0];
        detected.push({
          id: `class-clash-${sample.day}-${sample.periodIndex}-${sample.classId}`,
          severity: "medium",
          type: "Class Clash",
          message: `${toClassLabel(sample.classId)} has duplicate allocations on ${sample.day} ${periods[sample.periodIndex]?.label}.`,
          suggestion: "Keep a single period entry per class per slot.",
          day: sample.day,
          periodIndex: sample.periodIndex,
          classId: sample.classId,
        });
      }
    });

    classes.forEach((schoolClass) => {
      const classEntries = entries.filter((entry) => entry.classId === schoolClass.id);
      const reqs = subjectRequirements.filter((req) => req.classId === schoolClass.id);

      reqs.forEach((req) => {
        const assigned = classEntries.filter((entry) => entry.subject === req.subject).length;
        if (assigned < req.requiredPeriodsPerWeek) {
          detected.push({
            id: `missing-${schoolClass.id}-${req.subject}`,
            severity: "low",
            type: "Missing Subject Requirement",
            message: `${toClassLabel(schoolClass.id)} has ${assigned}/${req.requiredPeriodsPerWeek} periods for ${req.subject}.`,
            suggestion: "Add periods in free slots or regenerate timetable with requirement priority.",
            classId: schoolClass.id,
          });
        }
      });
    });

    return detected;
  }, [entries, filteredEntries, periods, teacherUnavailableSlots, classes, subjectRequirements, roomById, teacherById, toClassLabel]);

  const conflictKeySet = useMemo(() => {
    const set = new Set<string>();
    conflicts.forEach((conflict) => {
      if (conflict.day !== undefined && conflict.periodIndex !== undefined) {
        if (conflict.classId) {
          set.add(`${conflict.classId}-${conflict.day}-${conflict.periodIndex}`);
        }
      }
    });
    return set;
  }, [conflicts]);

  const summary = useMemo(() => {
    const assignedTeacherCount = new Set(entries.map((entry) => entry.teacherId)).size;
    return {
      totalClasses: classes.length,
      totalTeachersAssigned: assignedTeacherCount,
      draftCount: status === "draft" ? 1 : 0,
      publishedCount: status === "published" ? 1 : 0,
      conflictCount: conflicts.filter((item) => item.severity === "high").length,
    };
  }, [entries, status, conflicts, classes.length]);

  const editingEntry = editingEntryId ? entries.find((entry) => entry.id === editingEntryId) || null : null;

  const touchAudit = (actionBy: string) => {
    setLastUpdatedAt(new Date().toISOString());
    setLastUpdatedBy(actionBy);
  };

  const generateDraft = () => {
    setEntries((currentEntries) => {
      const lockedMap = new Map(currentEntries.filter((entry) => entry.status?.locked).map((entry) => [entry.id, entry]));
      
      // Generate new entries
      const days = WEEK_DAYS;
      const periodsPerDayVal = periodsPerDay;
      const generated: TimetableEntry[] = [];
      const requirementByClass = classes.reduce<Record<string, SubjectRequirement[]>>((acc, schoolClass) => {
        acc[schoolClass.id] = subjectRequirements.filter((item) => item.classId === schoolClass.id);
        return acc;
      }, {});

      classes.forEach((schoolClass) => {
        const queue = requirementByClass[schoolClass.id]
          .flatMap((req) => Array.from({ length: req.requiredPeriodsPerWeek }, () => req))
          .sort((a, b) => a.subject.localeCompare(b.subject));

        let cursor = 0;

        days.forEach((day) => {
          for (let periodIndex = 0; periodIndex < periodsPerDayVal; periodIndex += 1) {
            if (periodIndex === 0 || periodIndex === 2 || periodIndex === 4) {
              continue;
            }

            const item = queue[cursor % queue.length];
            cursor += 1;

            const id = `${schoolClass.id}-${day}-${periodIndex}`;
            const locked = lockedMap.get(id);
            
            if (locked) {
              generated.push({ ...locked, updatedAt: new Date().toISOString(), updatedBy: "Locked Entry Preservation" });
            } else {
              const defaultRoom =
                rooms.find(
                  (room) =>
                    room.type === item.preferredRoomType &&
                    (item.preferredRoomType !== "classroom" ||
                      room.name.toLowerCase().includes(schoolClass.section?.toLowerCase() || ""))
                ) ||
                rooms.find((room) => room.type === item.preferredRoomType) ||
                rooms[0];

              if (defaultRoom) {
                generated.push({
                  id,
                  classId: schoolClass.id,
                  day,
                  periodIndex,
                  subject: item.subject,
                  teacherId: item.teacherId,
                  roomId: defaultRoom.id,
                  subjectType: inferSubjectType(item.subject, defaultRoom.type),
                  status: {},
                  updatedAt: new Date().toISOString(),
                  updatedBy: "Auto Scheduler",
                });
              }
            }
          }
        });
      });

      return generated;
    });

    setStatus("draft");
    setValidationMessage("Draft regenerated successfully. Locked entries were preserved.");
    touchAudit("Auto Scheduler");
  };

  const autoFixConflicts = () => {
    setEntries((currentEntries) => {
      const usedSlots = new Set<string>();
      return currentEntries.map((entry) => {
        if (entry.status.locked) {
          usedSlots.add(`${entry.day}-${entry.periodIndex}-${entry.teacherId}-${entry.roomId}`);
          return entry;
        }

        const baseKey = `${entry.day}-${entry.periodIndex}`;
        const unavailable = teacherUnavailableSlots[entry.teacherId] || [];
        const unavailableNow = unavailable.includes(baseKey);

        let teacherId = entry.teacherId;
        if (unavailableNow) {
          const fallback = teachers.find((teacher) =>
            teacher.subject === entry.subject && !(teacherUnavailableSlots[teacher.id] || []).includes(baseKey)
          );
          if (fallback) {
            teacherId = fallback.id;
          }
        }

        let roomId = entry.roomId;
        const key = `${entry.day}-${entry.periodIndex}-${teacherId}-${roomId}`;
        if (usedSlots.has(key)) {
          const alternateRoom = rooms.find((room) => !usedSlots.has(`${entry.day}-${entry.periodIndex}-${teacherId}-${room.id}`));
          if (alternateRoom) {
            roomId = alternateRoom.id;
          }
        }

        usedSlots.add(`${entry.day}-${entry.periodIndex}-${teacherId}-${roomId}`);

        return {
          ...entry,
          teacherId,
          roomId,
          status: { ...entry.status, edited: true },
          updatedAt: new Date().toISOString(),
          updatedBy: "Auto Fix Engine",
        };
      });
    });

    setValidationMessage("Conflicts auto-fixed where possible. Review unresolved warnings before publish.");
    touchAudit("Auto Fix Engine");
  };

  const saveDraft = () => {
    setStatus("draft");
    setValidationMessage("Draft saved. Continue reviewing conflicts and reports before publishing.");
    touchAudit("Admin User");
  };

  const publishTimetable = () => {
    if (conflicts.some((conflict) => conflict.severity === "high")) {
      setValidationMessage("Resolve high severity conflicts before publishing to portals.");
      return;
    }

    setStatus("published");
    setValidationMessage("Timetable published to teacher, student and parent portals.");
    touchAudit("Admin User");
  };

  const exportExcel = () => {
    const rows = [
      ["Class", "Day", "Period", "Subject", "Teacher", "Room", "Locked", "Substituted", "Edited"],
      ...entries.map((entry) => [
        toClassLabel(entry.classId),
        entry.day,
        periods[entry.periodIndex]?.label || `P${entry.periodIndex + 1}`,
        entry.subject,
        teacherById[entry.teacherId]?.name || "-",
        roomById[entry.roomId]?.name || "-",
        entry.status.locked ? "Yes" : "No",
        entry.status.substituted ? "Yes" : "No",
        entry.status.edited ? "Yes" : "No",
      ]),
    ];

    const csv = rows
      .map((row) => row.map((item) => `"${String(item).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `timetable-${academicYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPdf = () => {
    window.print();
  };

  const moveWizard = (delta: number) => {
    setWizardStep((current) => {
      const next = current + delta;
      if (next < 0) return 0;
      if (next >= STEPS.length) return STEPS.length - 1;
      return next;
    });
  };

  const getEntryForSlot = (classId: string, day: Day, periodIndex: number) => {
    return filteredEntries.find(
      (entry) => entry.classId === classId && entry.day === day && entry.periodIndex === periodIndex
    );
  };

  const applyEntryUpdate = (
    entryId: string,
    updater: (entry: TimetableEntry) => TimetableEntry,
    auditBy = "Admin User"
  ) => {
    setEntries((currentEntries) =>
      currentEntries.map((entry) => {
        if (entry.id !== entryId) return entry;
        return updater({ ...entry, updatedAt: new Date().toISOString(), updatedBy: auditBy });
      })
    );
    touchAudit(auditBy);
  };

  const teacherWorkload = useMemo(() => {
    return teachers.map((teacher) => {
      const assigned = entries.filter((entry) => entry.teacherId === teacher.id).length;
      const substitutions = entries.filter((entry) => entry.substituteTeacherId === teacher.id).length;
      return { teacher, assigned, substitutions };
    });
  }, [entries, teachers]);

  const roomUtilization = useMemo(() => {
    const totalSlots = classes.length * WEEK_DAYS.length * (periodsPerDay - 3);
    return rooms.map((room) => {
      const used = entries.filter((entry) => entry.roomId === room.id).length;
      const utilization = totalSlots === 0 ? 0 : Math.round((used / totalSlots) * 100);
      return { room, used, utilization };
    });
  }, [entries, periodsPerDay, classes.length, rooms]);

  const freePeriodReport = useMemo(() => {
    return classes.map((schoolClass) => {
      const filled = entries.filter((entry) => entry.classId === schoolClass.id).length;
      const total = WEEK_DAYS.length * (periodsPerDay - 3);
      return {
        classId: schoolClass.id,
        total,
        filled,
        free: Math.max(total - filled, 0),
      };
    });
  }, [entries, periodsPerDay, classes]);

  const currentStep = STEPS[wizardStep];

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Loading timetable data from backend...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Failed to load timetable</p>
                <p className="text-sm text-destructive/80 mt-1">{error}</p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-3 text-sm font-medium text-destructive underline hover:no-underline"
                >
                  Try reloading the page
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border/80 shadow-sm">
        <div className="relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(13,148,136,0.2),transparent_50%)]" />
          <CardHeader className="relative">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">Timetable Management</CardTitle>
                <CardDescription className="mt-1">
                  Configure school timetable rules, generate draft schedules, resolve conflicts and publish to portals.
                </CardDescription>
              </div>
              <Badge className={status === "published" ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"}>
                {status === "published" ? "Published" : "Draft"}
              </Badge>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <SummaryCard icon={School} label="Total Classes" value={summary.totalClasses} helper="Class-wise schedules" />
              <SummaryCard icon={Users} label="Teachers Assigned" value={summary.totalTeachersAssigned} helper="Mapped by subject" />
              <SummaryCard icon={Edit3} label="Draft Timetables" value={summary.draftCount} helper="Pending approval" />
              <SummaryCard icon={CheckCircle2} label="Published" value={summary.publishedCount} helper="Visible on portals" />
              <SummaryCard icon={AlertTriangle} label="Conflicts" value={summary.conflictCount} helper="High priority" highlight />
            </div>
          </CardHeader>
        </div>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-3 flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
            <GraduationCap className="h-4 w-4" />
            Timetable module is designed for class-wise, teacher-wise and room-wise school ERP operations.
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <FilterField label="Academic Year" helper="Required for reporting and publication.">
              <select
                value={academicYear}
                onChange={(event) => setAcademicYear(event.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                <option>2025-2026</option>
                <option>2026-2027</option>
                <option>2027-2028</option>
              </select>
            </FilterField>

            <FilterField label="Term" helper="Useful for multi-term scheduling.">
              <select
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                <option>Term 1</option>
                <option>Term 2</option>
                <option>Annual</option>
              </select>
            </FilterField>

            <FilterField label="Class" helper="Class-wise timetable focus.">
              <select
                value={selectedClassId}
                onChange={(event) => setSelectedClassId(event.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                {classes.map((schoolClass) => (
                  <option key={schoolClass.id} value={schoolClass.id}>
                    {schoolClass.name}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Section" helper="Used in class view filtering.">
              <select
                value={selectedSection}
                onChange={(event) => setSelectedSection(event.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                {["A", "B", "C", "D"].map((section) => (
                  <option key={section} value={section}>
                    {section}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Teacher" helper="Teacher-wise timetable view.">
              <select
                value={selectedTeacherId}
                onChange={(event) => setSelectedTeacherId(event.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="all">All Teachers</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Room" helper="Room and lab allocation view.">
              <select
                value={selectedRoomId}
                onChange={(event) => setSelectedRoomId(event.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="all">All Rooms</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Status" helper="Draft or published lifecycle.">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as "all" | TimetableStatus)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="all">All</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </FilterField>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg">Setup Wizard</CardTitle>
                <CardDescription>
                  Follow these guided steps to produce a conflict-aware timetable that aligns with school policies.
                </CardDescription>
              </div>
              <Badge variant="outline">Step {wizardStep + 1} of {STEPS.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {STEPS.map((step, index) => (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => setWizardStep(index)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition ${index === wizardStep ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                >
                  <p className="font-medium">{index + 1}. {step.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{step.hint}</p>
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-sm font-semibold">{currentStep.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{currentStep.hint}</p>

              {currentStep.key === "timing" && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <WizardInput label="School start" value={schoolStartTime} onChange={setSchoolStartTime} type="time" />
                  <WizardInput label="Period duration (min)" value={String(periodDuration)} onChange={(value) => setPeriodDuration(Number(value) || 40)} type="number" />
                  <WizardInput label="Periods per day" value={String(periodsPerDay)} onChange={(value) => setPeriodsPerDay(Math.max(6, Number(value) || 8))} type="number" />
                  <WizardInput label="Lunch after period" value={String(lunchAfterPeriod)} onChange={(value) => setLunchAfterPeriod(Math.max(2, Number(value) || 4))} type="number" />
                  <WizardInput label="Short break after period" value={String(shortBreakAfterPeriod)} onChange={(value) => setShortBreakAfterPeriod(Math.max(1, Number(value) || 2))} type="number" />
                </div>
              )}

              {currentStep.key === "availability" && (
                <div className="mt-3 rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-sm text-amber-900">
                  <p className="font-medium">Teacher leave and unavailable slots</p>
                  <p className="mt-1 text-amber-800">
                    Current leaves are already considered during conflict detection. Use cell editor to assign substitutes.
                  </p>
                </div>
              )}

              {currentStep.key === "publish" && (
                <div className="mt-3 rounded-lg border border-emerald-300/70 bg-emerald-50 p-3 text-sm text-emerald-900">
                  <p className="font-medium">Publish channels</p>
                  <p className="mt-1">Teacher Portal, Student Portal and Parent App will receive this timetable after approval.</p>
                </div>
              )}

              {!["timing", "availability", "publish"].includes(currentStep.key) && (
                <div className="mt-3 rounded-lg border border-border bg-background p-3 text-sm text-muted-foreground">
                  Use this step to validate records before generation. Helper text and warnings are shown in the conflicts tab.
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => moveWizard(-1)} disabled={wizardStep === 0}>
                Previous
              </Button>
              <Button onClick={() => moveWizard(1)} disabled={wizardStep === STEPS.length - 1}>
                Next
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Actions</CardTitle>
            <CardDescription>Generation, conflict fixing, publication and export tools.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full justify-start" onClick={generateDraft}>
              <RefreshCw className="h-4 w-4" /> Generate Timetable
            </Button>
            <Button className="w-full justify-start" variant="secondary" onClick={autoFixConflicts}>
              <Wand2 className="h-4 w-4" /> Auto-Fix Conflicts
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={saveDraft}>
              <Edit3 className="h-4 w-4" /> Save Draft
            </Button>
            <Button className="w-full justify-start" onClick={publishTimetable}>
              <CheckCircle2 className="h-4 w-4" /> Publish
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={exportPdf}>
              <Download className="h-4 w-4" /> Export PDF
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={exportExcel}>
              <FileSpreadsheet className="h-4 w-4" /> Export Excel
            </Button>
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Last updated: {new Date(lastUpdatedAt).toLocaleString()} by {lastUpdatedBy}
            </div>
          </CardContent>
        </Card>
      </div>

      {validationMessage && (
        <div className="rounded-lg border border-primary/25 bg-primary/5 px-4 py-3 text-sm">
          <p className="flex items-center gap-2 font-medium text-primary">
            <Info className="h-4 w-4" /> {validationMessage}
          </p>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid h-auto w-full grid-cols-3 gap-2 bg-transparent p-0 md:grid-cols-6">
          <TabsTrigger value="class" className="rounded-md border border-border data-[state=active]:border-primary data-[state=active]:bg-primary/10">Class View</TabsTrigger>
          <TabsTrigger value="teacher" className="rounded-md border border-border data-[state=active]:border-primary data-[state=active]:bg-primary/10">Teacher View</TabsTrigger>
          <TabsTrigger value="room" className="rounded-md border border-border data-[state=active]:border-primary data-[state=active]:bg-primary/10">Room View</TabsTrigger>
          <TabsTrigger value="rules" className="rounded-md border border-border data-[state=active]:border-primary data-[state=active]:bg-primary/10">Rules</TabsTrigger>
          <TabsTrigger value="conflicts" className="rounded-md border border-border data-[state=active]:border-primary data-[state=active]:bg-primary/10">Conflicts</TabsTrigger>
          <TabsTrigger value="reports" className="rounded-md border border-border data-[state=active]:border-primary data-[state=active]:bg-primary/10">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="class">
          <TimetableBoard
            title={`Class View - ${toClassLabel(selectedClassId)}`}
            subtitle="Click any timetable cell to manually edit, lock, or assign substitutes."
            days={WEEK_DAYS}
            periods={periods}
            lunchAfterPeriod={lunchAfterPeriod}
            shortBreakAfterPeriod={shortBreakAfterPeriod}
            getEntry={(day, periodIndex) => getEntryForSlot(selectedClassId, day, periodIndex)}
            onEdit={setEditingEntryId}
            conflictKeySet={conflictKeySet}
            teacherById={teacherById}
            roomById={roomById}
          />
        </TabsContent>

        <TabsContent value="teacher">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Teacher View</CardTitle>
              <CardDescription>
                Faculty schedule with leave-awareness and substitute indicator.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(selectedTeacherId === "all" ? teachers.slice(0, 3) : teachers.filter((item) => item.id === selectedTeacherId)).map((teacher) => {
                  const teacherEntries = entries.filter((entry) => entry.teacherId === teacher.id || entry.substituteTeacherId === teacher.id);
                  return (
                    <div key={teacher.id} className="rounded-lg border border-border p-3">
                      <p className="font-medium">{teacher.name}</p>
                      <p className="text-xs text-muted-foreground">Assigned slots: {teacherEntries.length}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {teacherEntries.slice(0, 10).map((entry) => (
                          <button
                            type="button"
                            key={entry.id}
                            onClick={() => setEditingEntryId(entry.id)}
                            className="rounded border border-border bg-muted/50 px-2 py-1 text-xs hover:border-primary"
                          >
                            {entry.day} {periods[entry.periodIndex]?.label} • {toClassLabel(entry.classId)}
                          </button>
                        ))}
                        {teacherEntries.length === 0 && (
                          <p className="text-xs text-muted-foreground">No periods assigned for selected filters.</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="room">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Room View</CardTitle>
              <CardDescription>Room and lab allocation overview with utilization hints.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {(selectedRoomId === "all" ? rooms : rooms.filter((room) => room.id === selectedRoomId)).map((room) => {
                  const roomEntries = entries.filter((entry) => entry.roomId === room.id);
                  return (
                    <div key={room.id} className="rounded-lg border border-border p-3">
                      <p className="font-medium">{room.name}</p>
                      <p className="text-xs text-muted-foreground">{room.type}</p>
                      <p className="mt-2 text-sm">Allocated periods: <span className="font-semibold">{roomEntries.length}</span></p>
                      <div className="mt-2 space-y-1">
                        {roomEntries.slice(0, 4).map((entry) => (
                          <p key={entry.id} className="text-xs text-muted-foreground">
                            {entry.day} {periods[entry.periodIndex]?.label} - {entry.subject} ({toClassLabel(entry.classId)})
                          </p>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Timetable Rules and Constraints</CardTitle>
              <CardDescription>Generation rules used by the auto scheduler.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <RuleCard icon={BookOpen} title="Subject load balancing" text="Distribute required weekly subject periods across working days to avoid same-subject stacking." />
              <RuleCard icon={UserCog} title="Teacher availability" text="Prevent placement in unavailable or leave slots and suggest substitutes when needed." />
              <RuleCard icon={GraduationCap} title="Assembly and breaks" text="Reserve assembly, short break and lunch slots globally across all classes." />
              <RuleCard icon={School} title="Room type constraints" text="Match lab and sports subjects with compatible room types and detect room overlaps." />
              <RuleCard icon={Sparkles} title="Lock-safe regeneration" text="Locked entries remain untouched during regeneration to protect approved slots." />
              <RuleCard icon={Clock3} title="Workload control" text="Teacher load can be reviewed using report metrics before final publication." />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conflicts">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Conflict Review</CardTitle>
              <CardDescription>Warnings and suggested fixes for timetable quality checks.</CardDescription>
            </CardHeader>
            <CardContent>
              {conflicts.length === 0 ? (
                <div className="rounded-lg border border-emerald-300/70 bg-emerald-50 p-4 text-emerald-900">
                  <p className="font-medium">No conflicts detected</p>
                  <p className="text-sm">This draft is ready for publication.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {conflicts.map((conflict) => (
                    <div
                      key={conflict.id}
                      className={`rounded-lg border p-3 ${
                        conflict.severity === "high"
                          ? "border-red-300 bg-red-50"
                          : conflict.severity === "medium"
                          ? "border-amber-300 bg-amber-50"
                          : "border-blue-300 bg-blue-50"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">{conflict.type}</p>
                        <Badge variant="outline">{conflict.severity.toUpperCase()}</Badge>
                      </div>
                      <p className="mt-1 text-sm">{conflict.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Suggested fix: {conflict.suggestion}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Reports</CardTitle>
              <CardDescription>Teacher workload, room utilization and free period analytics.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="mb-2 text-sm font-semibold">Teacher Workload Report</p>
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {teacherWorkload.map((item) => (
                    <div key={item.teacher.id} className="rounded-lg border border-border p-3">
                      <p className="font-medium">{item.teacher.name}</p>
                      <p className="text-xs text-muted-foreground">Assigned: {item.assigned} periods</p>
                      <p className="text-xs text-muted-foreground">Substitutions: {item.substitutions}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold">Room Utilization Report</p>
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {roomUtilization.map((item) => (
                    <div key={item.room.id} className="rounded-lg border border-border p-3">
                      <p className="font-medium">{item.room.name}</p>
                      <p className="text-xs text-muted-foreground">Used periods: {item.used}</p>
                      <p className="text-xs text-muted-foreground">Utilization: {item.utilization}%</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold">Free Period Report</p>
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                  {freePeriodReport.map((item) => (
                    <div key={item.classId} className="rounded-lg border border-border p-3">
                      <p className="font-medium">{toClassLabel(item.classId)}</p>
                      <p className="text-xs text-muted-foreground">Free periods: {item.free}</p>
                      <p className="text-xs text-muted-foreground">Filled: {item.filled}/{item.total}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                Audit trail: last updated on {new Date(lastUpdatedAt).toLocaleString()} by {lastUpdatedBy}.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Conflict Panel</CardTitle>
          <CardDescription>Live warnings with quick remediation context.</CardDescription>
        </CardHeader>
        <CardContent>
          {conflicts.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              No active warnings. Try changing teacher availability or regenerate to validate rules.
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              {conflicts.slice(0, 6).map((conflict) => (
                <div key={conflict.id} className="rounded-md border border-border bg-muted/20 p-3">
                  <p className="text-sm font-medium">{conflict.type}</p>
                  <p className="text-xs text-muted-foreground">{conflict.message}</p>
                  <p className="mt-1 text-xs text-primary">{conflict.suggestion}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {editingEntry && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-lg">Edit Timetable Entry</CardTitle>
            <CardDescription>
              Manual adjustment mode. Click save actions directly in this panel.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <FilterField label="Subject" helper="Adjust subject for this slot.">
                <select
                  value={editingEntry.subject}
                  onChange={(event) =>
                    applyEntryUpdate(editingEntry.id, (entry) => ({
                      ...entry,
                      subject: event.target.value,
                      subjectType: inferSubjectType(event.target.value, roomById[entry.roomId]?.type),
                      status: { ...entry.status, edited: true },
                    }))
                  }
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                >
                  {subjectRequirements.filter((req) => req.classId === editingEntry.classId).map((item) => (
                    <option key={item.subject} value={item.subject}>{item.subject}</option>
                  ))}
                </select>
              </FilterField>

              <FilterField label="Teacher" helper="Assign primary or substitute teacher.">
                <select
                  value={editingEntry.teacherId}
                  onChange={(event) =>
                    applyEntryUpdate(editingEntry.id, (entry) => ({
                      ...entry,
                      teacherId: event.target.value,
                      status: { ...entry.status, edited: true },
                    }))
                  }
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                >
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                  ))}
                </select>
              </FilterField>

              <FilterField label="Room" helper="Room/lab assignment rule.">
                <select
                  value={editingEntry.roomId}
                  onChange={(event) =>
                    applyEntryUpdate(editingEntry.id, (entry) => ({
                      ...entry,
                      roomId: event.target.value,
                      subjectType: inferSubjectType(entry.subject, roomById[event.target.value]?.type),
                      status: { ...entry.status, edited: true },
                    }))
                  }
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                >
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>{room.name}</option>
                  ))}
                </select>
              </FilterField>

              <FilterField label="Substitute" helper="Optional leave replacement.">
                <select
                  value={editingEntry.substituteTeacherId || "none"}
                  onChange={(event) =>
                    applyEntryUpdate(editingEntry.id, (entry) => ({
                      ...entry,
                      substituteTeacherId: event.target.value === "none" ? undefined : event.target.value,
                      status: { ...entry.status, substituted: event.target.value !== "none", edited: true },
                    }))
                  }
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                >
                  <option value="none">No substitute</option>
                  {teachers.filter((teacher) => teacher.id !== editingEntry.teacherId).map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                  ))}
                </select>
              </FilterField>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={editingEntry.status.locked ? "secondary" : "outline"}
                onClick={() =>
                  applyEntryUpdate(editingEntry.id, (entry) => ({
                    ...entry,
                    status: { ...entry.status, locked: !entry.status.locked, edited: true },
                  }))
                }
              >
                <Lock className="h-4 w-4" />
                {editingEntry.status.locked ? "Unlock Entry" : "Lock Entry"}
              </Button>
              <Button variant="outline" onClick={() => setEditingEntryId(null)}>Done Editing</Button>
              <p className="text-xs text-muted-foreground">
                Locked entries are never overwritten during regeneration.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  helper,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  helper: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? "border-red-200 bg-red-50" : "border-border bg-background/80"}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <Icon className={`h-4 w-4 ${highlight ? "text-red-600" : "text-primary"}`} />
      </div>
      <p className={`mt-2 text-2xl font-bold ${highlight ? "text-red-700" : "text-foreground"}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{helper}</p>
    </div>
  );
}

function FilterField({
  label,
  helper,
  children,
}: {
  label: string;
  helper: string;
  children: React.ReactNode;
}) {
  return (
    <label className="min-w-[170px] flex-1">
      <p className="mb-1 text-xs font-medium text-foreground">{label}</p>
      {children}
      <p className="mt-1 text-[11px] text-muted-foreground">{helper}</p>
    </label>
  );
}

function WizardInput({
  label,
  value,
  onChange,
  type,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type: "text" | "number" | "time";
}) {
  return (
    <label>
      <p className="mb-1 text-xs font-medium">{label}</p>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
      />
    </label>
  );
}

function RuleCard({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-md bg-primary/10 p-1.5 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <p className="font-medium">{title}</p>
      </div>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function TimetableBoard({
  title,
  subtitle,
  days,
  periods,
  lunchAfterPeriod,
  shortBreakAfterPeriod,
  getEntry,
  onEdit,
  conflictKeySet,
  teacherById,
  roomById,
}: {
  title: string;
  subtitle: string;
  days: Day[];
  periods: Array<{ index: number; label: string; start: string }>;
  lunchAfterPeriod: number;
  shortBreakAfterPeriod: number;
  getEntry: (day: Day, periodIndex: number) => TimetableEntry | undefined;
  onEdit: (entryId: string) => void;
  conflictKeySet: Set<string>;
  teacherById: Record<string, Teacher>;
  roomById: Record<string, Room>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 w-28 border border-border bg-muted px-3 py-2 text-left">Day</th>
                {periods.map((period) => (
                  <th key={period.index} className="w-44 border border-border bg-muted px-2 py-2 text-left">
                    <p className="font-semibold">{period.label}</p>
                    <p className="text-[11px] text-muted-foreground">{period.start}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr key={day}>
                  <td className="sticky left-0 z-10 border border-border bg-card px-3 py-2 font-semibold">{day}</td>
                  {periods.map((period) => {
                    const isAssembly = period.index === 0;
                    const isLunch = period.index === lunchAfterPeriod;
                    const isShortBreak = period.index === shortBreakAfterPeriod;

                    if (isAssembly || isLunch || isShortBreak) {
                      const text = isAssembly ? "Assembly" : isLunch ? "Lunch Break" : "Short Break";
                      return (
                        <td key={`${day}-${period.index}`} className="border border-border bg-muted/50 px-2 py-2 text-xs font-medium text-muted-foreground">
                          {text}
                        </td>
                      );
                    }

                    const entry = getEntry(day, period.index);
                    if (!entry) {
                      return (
                        <td key={`${day}-${period.index}`} className="border border-border bg-background px-2 py-2 align-top">
                          <div className="rounded-md border border-dashed border-border p-2 text-xs text-muted-foreground">
                            Free slot
                          </div>
                        </td>
                      );
                    }

                    const hasConflict = conflictKeySet.has(`${entry.classId}-${entry.day}-${entry.periodIndex}`);

                    return (
                      <td key={`${day}-${period.index}`} className="border border-border bg-background px-2 py-2 align-top">
                        <button
                          type="button"
                          onClick={() => onEdit(entry.id)}
                          className={`w-full rounded-md border p-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary ${
                            SUBJECT_TYPE_CLASSES[entry.subjectType || "Core"]
                          } ${hasConflict ? "ring-2 ring-red-400" : ""}`}
                        >
                          <p className="text-sm font-semibold leading-tight">{entry.subject}</p>
                          <p className="mt-1 text-xs">{teacherById[entry.teacherId]?.name || "Teacher"}</p>
                          <p className="text-xs">{roomById[entry.roomId]?.name || "Room"}</p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {entry.status.locked && <Badge variant="outline" className="text-[10px]">Locked</Badge>}
                            {entry.status.substituted && <Badge variant="outline" className="text-[10px]">Substituted</Badge>}
                            {entry.status.edited && <Badge variant="outline" className="text-[10px]">Edited</Badge>}
                          </div>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
