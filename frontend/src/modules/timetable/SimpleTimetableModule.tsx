import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Download,
  FileSpreadsheet,
  Lock,
  Sparkles,
  Wand2,
  GripVertical,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as timetableService from "@/services/timetableService";
import { API_URL } from "@/lib/api";
import jsPDF from "jspdf";

type ViewMode = "class" | "teacher" | "room";
type DayKey = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat";

type SchoolClass = timetableService.ClassData;
type Teacher = timetableService.TeacherData;
type Room = timetableService.RoomData;
type SubjectRequirement = timetableService.SubjectRequirement;

type SubjectSetup = {
  subject: string;
  teacherId: string;
  periodsPerWeek: number;
  roomId: string;
};

type TimetableEntry = {
  id: string;
  classId: string;
  day: DayKey;
  slotIndex: number;
  subject: string;
  teacherId: string;
  roomId: string;
  locked: boolean;
};

type Conflict = {
  id: string;
  type: "Teacher" | "Class" | "Room" | "Unavailable";
  message: string;
  classId?: string;
  teacherId?: string;
  roomId?: string;
  day?: DayKey;
  slotIndex?: number;
};

type EditorState = {
  open: boolean;
  classId: string;
  day: DayKey;
  slotIndex: number;
  entryId?: string;
};

type SchoolSession = {
  logo?: string;
  schoolInfo?: {
    name?: string;
    logo?: string;
    email?: string;
    phone?: string;
    address?: string;
    website?: string;
  };
  adminInfo?: {
    image?: string;
  };
};

const DAYS: DayKey[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DAY_HEADER_CLASSES: Record<DayKey, string> = {
  Mon: "bg-teal-50 text-teal-800",
  Tue: "bg-cyan-50 text-cyan-800",
  Wed: "bg-emerald-50 text-emerald-800",
  Thu: "bg-sky-50 text-sky-800",
  Fri: "bg-lime-50 text-lime-800",
  Sat: "bg-amber-50 text-amber-800",
};

function createSlotLabel(startTime: string, durationMin: number, slotIndex: number) {
  const [hourRaw, minuteRaw] = startTime.split(":");
  const base = Number(hourRaw) * 60 + Number(minuteRaw);
  const from = base + durationMin * slotIndex;
  const to = from + durationMin;

  const toHHMM = (minutes: number) => {
    const hh = Math.floor(minutes / 60);
    const mm = minutes % 60;
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  };

  return `${toHHMM(from)}-${toHHMM(to)}`;
}

function normalize(value: string) {
  return String(value || "").trim().toLowerCase();
}

function id() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readSchoolSession(): SchoolSession {
  try {
    const raw = localStorage.getItem("school") || "{}";
    return JSON.parse(raw) as SchoolSession;
  } catch {
    return {};
  }
}

function schoolInitials(name: string) {
  const clean = String(name || "").trim();
  if (!clean) {
    return "S";
  }

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function getLogoCandidates(session: SchoolSession): string[] {
  const rawCandidates = [
    session.schoolInfo?.logo,
    session.logo,
    session.adminInfo?.image,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  const expanded: string[] = [];
  rawCandidates.forEach((value) => {
    expanded.push(value);
    if (value.startsWith("/")) {
      expanded.push(`${API_URL}${value}`);
    }
  });

  return Array.from(new Set(expanded));
}

async function imageUrlToDataUrl(url: string): Promise<string | null> {
  if (!url) {
    return null;
  }

  if (url.startsWith("data:image/")) {
    return url;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function resolveLogoDataUrl(session: SchoolSession): Promise<string | null> {
  const candidates = getLogoCandidates(session);
  for (const candidate of candidates) {
    const dataUrl = await imageUrlToDataUrl(candidate);
    if (dataUrl) {
      return dataUrl;
    }
  }
  return null;
}

export default function SimpleTimetableModule() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [selectedSection, setSelectedSection] = useState("all");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("all");
  const [selectedRoomId, setSelectedRoomId] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("class");
  const [includeSaturdayInPdf, setIncludeSaturdayInPdf] = useState(false);

  const [schoolStartTime, setSchoolStartTime] = useState("07:30");
  const [periodDuration, setPeriodDuration] = useState(60);
  const [slotsPerDay, setSlotsPerDay] = useState(7);
  const [pdfExporting, setPdfExporting] = useState(false);

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [subjectRequirements, setSubjectRequirements] = useState<SubjectRequirement[]>([]);
  const [subjectSetupByClass, setSubjectSetupByClass] = useState<Record<string, SubjectSetup[]>>({});
  const [teacherUnavailableSlotKeys, setTeacherUnavailableSlotKeys] = useState<Record<string, Set<string>>>({});
  const [entries, setEntries] = useState<TimetableEntry[]>([]);

  const [dragEntryId, setDragEntryId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [editorSubject, setEditorSubject] = useState("");
  const [editorTeacherId, setEditorTeacherId] = useState("");
  const [editorRoomId, setEditorRoomId] = useState("");
  const [editorLocked, setEditorLocked] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [c, t, r, req, unavailable] = await Promise.all([
          timetableService.fetchClasses(),
          timetableService.fetchTeachers(),
          timetableService.fetchRooms(),
          timetableService.fetchSubjectRequirements(),
          timetableService.fetchTeacherUnavailableSlots(),
        ]);

        setClasses(c);
        setTeachers(t);
        setRooms(r);
        setSubjectRequirements(req);

        if (c.length > 0) {
          setSelectedClassId(c[0].id);
        }

        const unavailableMap: Record<string, Set<string>> = {};
        unavailable.forEach((slot) => {
          if (!unavailableMap[slot.teacherId]) {
            unavailableMap[slot.teacherId] = new Set<string>();
          }
          const day = String(slot.day || "").slice(0, 3) as DayKey;
          unavailableMap[slot.teacherId].add(`${day}-${slot.periodIndex}`);
        });
        setTeacherUnavailableSlotKeys(unavailableMap);

        const setup: Record<string, SubjectSetup[]> = {};
        c.forEach((schoolClass) => {
          const classReq = req.filter((item) => item.classId === schoolClass.id);
          setup[schoolClass.id] = classReq.map((item) => ({
            subject: item.subject,
            teacherId: item.teacherId,
            periodsPerWeek: item.requiredPeriodsPerWeek,
            roomId: r[0]?.id || "",
          }));
        });
        setSubjectSetupByClass(setup);

        // Build an initial draft so admins immediately see data in the grid.
        if (c.length > 0 && t.length > 0 && r.length > 0) {
          const initialEntries: TimetableEntry[] = [];

          c.forEach((schoolClass) => {
            const classSetup = (setup[schoolClass.id] || []).filter(
              (item) => item.periodsPerWeek > 0
            );

            if (classSetup.length === 0) {
              return;
            }

            const queue = classSetup.flatMap((item) =>
              Array.from({ length: item.periodsPerWeek }, () => item)
            );

            let pointer = 0;

            const initialSlotsPerDay = 7;

            DAYS.forEach((day) => {
              for (let slotIndex = 0; slotIndex < initialSlotsPerDay; slotIndex += 1) {
                const item = queue[pointer % queue.length];
                pointer += 1;

                const preferredTeacher =
                  item.teacherId ||
                  t.find((teacher) =>
                    normalize(teacher.subject).includes(normalize(item.subject))
                  )?.id ||
                  t[0]?.id ||
                  "";

                const slotKey = `${day}-${slotIndex}`;
                const unavailableNow = unavailableMap[preferredTeacher]?.has(slotKey);

                const teacherId = unavailableNow
                  ? t.find(
                      (teacher) =>
                        normalize(teacher.subject).includes(normalize(item.subject)) &&
                        !unavailableMap[teacher.id]?.has(slotKey)
                    )?.id || preferredTeacher
                  : preferredTeacher;

                initialEntries.push({
                  id: id(),
                  classId: schoolClass.id,
                  day,
                  slotIndex,
                  subject: item.subject,
                  teacherId,
                  roomId: item.roomId || r[0]?.id || "",
                  locked: false,
                });
              }
            });
          });

          setEntries(initialEntries);
        }
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Unable to load timetable data.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const sectionOptions = useMemo(
    () => ["all", ...Array.from(new Set(classes.map((schoolClass) => schoolClass.section).filter(Boolean)))],
    [classes]
  );

  const classOptions = useMemo(() => {
    if (selectedSection === "all") {
      return classes;
    }
    return classes.filter((schoolClass) => schoolClass.section === selectedSection);
  }, [classes, selectedSection]);

  useEffect(() => {
    if (!classOptions.some((schoolClass) => schoolClass.id === selectedClassId)) {
      setSelectedClassId(classOptions[0]?.id || "");
    }
  }, [classOptions, selectedClassId]);

  useEffect(() => {
    if (viewMode === "teacher" && selectedTeacherId === "all" && teachers.length > 0) {
      setSelectedTeacherId(teachers[0].id);
    }
  }, [viewMode, selectedTeacherId, teachers]);

  useEffect(() => {
    if (viewMode === "room" && selectedRoomId === "all" && rooms.length > 0) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [viewMode, selectedRoomId, rooms]);

  const teacherById = useMemo(
    () => Object.fromEntries(teachers.map((teacher) => [teacher.id, teacher])),
    [teachers]
  );

  const roomById = useMemo(() => Object.fromEntries(rooms.map((room) => [room.id, room])), [rooms]);
  const classById = useMemo(
    () => Object.fromEntries(classes.map((schoolClass) => [schoolClass.id, schoolClass])),
    [classes]
  );

  const slots = useMemo(
    () => Array.from({ length: slotsPerDay }, (_, slotIndex) => createSlotLabel(schoolStartTime, periodDuration, slotIndex)),
    [slotsPerDay, schoolStartTime, periodDuration]
  );

  const getEntry = (classId: string, day: DayKey, slotIndex: number) =>
    entries.find((entry) => entry.classId === classId && entry.day === day && entry.slotIndex === slotIndex);

  const findTeacherForSubject = (subject: string, classId: string) => {
    const setupTeacher = (subjectSetupByClass[classId] || []).find(
      (setup) => normalize(setup.subject) === normalize(subject)
    )?.teacherId;
    if (setupTeacher) {
      return setupTeacher;
    }

    const sameSubject = teachers.find((teacher) => normalize(teacher.subject).includes(normalize(subject)));
    return sameSubject?.id || teachers[0]?.id || "";
  };

  const detectConflicts = useMemo(() => {
    const found: Conflict[] = [];
    const teacherMap: Record<string, TimetableEntry[]> = {};
    const roomMap: Record<string, TimetableEntry[]> = {};
    const classMap: Record<string, TimetableEntry[]> = {};

    entries.forEach((entry) => {
      const slot = `${entry.day}-${entry.slotIndex}`;
      const teacherKey = `${slot}-${entry.teacherId}`;
      const roomKey = `${slot}-${entry.roomId}`;
      const classKey = `${slot}-${entry.classId}`;

      teacherMap[teacherKey] = [...(teacherMap[teacherKey] || []), entry];
      roomMap[roomKey] = [...(roomMap[roomKey] || []), entry];
      classMap[classKey] = [...(classMap[classKey] || []), entry];

      if (teacherUnavailableSlotKeys[entry.teacherId]?.has(slot)) {
        found.push({
          id: `unavailable-${entry.id}`,
          type: "Unavailable",
          message: `${teacherById[entry.teacherId]?.name || "Teacher"} unavailable at ${entry.day} ${slots[entry.slotIndex]}`,
          classId: entry.classId,
          teacherId: entry.teacherId,
          day: entry.day,
          slotIndex: entry.slotIndex,
        });
      }
    });

    Object.values(teacherMap).forEach((list) => {
      if (list.length > 1) {
        const sample = list[0];
        found.push({
          id: `teacher-${sample.day}-${sample.slotIndex}-${sample.teacherId}`,
          type: "Teacher",
          message: `${teacherById[sample.teacherId]?.name || "Teacher"} has multiple classes at ${sample.day} ${slots[sample.slotIndex]}`,
          teacherId: sample.teacherId,
          day: sample.day,
          slotIndex: sample.slotIndex,
        });
      }
    });

    Object.values(roomMap).forEach((list) => {
      if (list.length > 1) {
        const sample = list[0];
        found.push({
          id: `room-${sample.day}-${sample.slotIndex}-${sample.roomId}`,
          type: "Room",
          message: `${roomById[sample.roomId]?.name || "Room"} is double booked at ${sample.day} ${slots[sample.slotIndex]}`,
          roomId: sample.roomId,
          day: sample.day,
          slotIndex: sample.slotIndex,
        });
      }
    });

    Object.values(classMap).forEach((list) => {
      if (list.length > 1) {
        const sample = list[0];
        found.push({
          id: `class-${sample.day}-${sample.slotIndex}-${sample.classId}`,
          type: "Class",
          message: `${classById[sample.classId]?.name || "Class"} has multiple subjects in one slot`,
          classId: sample.classId,
          day: sample.day,
          slotIndex: sample.slotIndex,
        });
      }
    });

    return found;
  }, [entries, classById, roomById, slots, teacherById, teacherUnavailableSlotKeys]);

  const conflictKeySet = useMemo(() => {
    const keys = new Set<string>();
    detectConflicts.forEach((conflict) => {
      if (conflict.classId && conflict.day !== undefined && conflict.slotIndex !== undefined) {
        keys.add(`${conflict.classId}-${conflict.day}-${conflict.slotIndex}`);
      }
    });
    return keys;
  }, [detectConflicts]);

  const setupForSelectedClass = useMemo(
    () => subjectSetupByClass[selectedClassId] || [],
    [subjectSetupByClass, selectedClassId]
  );

  const generateTimetable = (scope: "all" | "selected" = "all") => {
    const targetClassIds =
      scope === "selected" && selectedClassId
        ? new Set([selectedClassId])
        : new Set(classes.map((schoolClass) => schoolClass.id));

    const locked = entries.filter(
      (entry) => entry.locked && targetClassIds.has(entry.classId)
    );
    const preserved = entries.filter(
      (entry) => !targetClassIds.has(entry.classId)
    );
    const generated: TimetableEntry[] = [...preserved, ...locked];

    classes
      .filter((schoolClass) => targetClassIds.has(schoolClass.id))
      .forEach((schoolClass) => {
      const setup = (subjectSetupByClass[schoolClass.id] || []).filter((item) => item.periodsPerWeek > 0);
      if (setup.length === 0) {
        return;
      }

      const queue = setup.flatMap((item) => Array.from({ length: item.periodsPerWeek }, () => item));
      let pointer = 0;

      DAYS.forEach((day) => {
        for (let slotIndex = 0; slotIndex < slotsPerDay; slotIndex += 1) {
          const lockedEntry = locked.find(
            (entry) => entry.classId === schoolClass.id && entry.day === day && entry.slotIndex === slotIndex
          );
          if (lockedEntry) {
            continue;
          }

          const item = queue[pointer % queue.length];
          pointer += 1;

          const teacherId = item.teacherId || findTeacherForSubject(item.subject, schoolClass.id);
          const unavailable = teacherUnavailableSlotKeys[teacherId]?.has(`${day}-${slotIndex}`);
          const fallbackTeacher = unavailable
            ? teachers.find(
                (teacher) =>
                  normalize(teacher.subject).includes(normalize(item.subject)) &&
                  !teacherUnavailableSlotKeys[teacher.id]?.has(`${day}-${slotIndex}`)
              )?.id || teacherId
            : teacherId;

          generated.push({
            id: id(),
            classId: schoolClass.id,
            day,
            slotIndex,
            subject: item.subject,
            teacherId: fallbackTeacher,
            roomId: item.roomId || rooms[0]?.id || "",
            locked: false,
          });
        }
      });
    });

    setEntries(generated);
  };

  const fixConflictsOnly = () => {
    setEntries((current) => {
      return current.map((entry) => {
        if (entry.locked) {
          return entry;
        }

        const slotKey = `${entry.day}-${entry.slotIndex}`;
        let nextTeacherId = entry.teacherId;
        let nextRoomId = entry.roomId;

        const teacherClash = current.some(
          (other) =>
            other.id !== entry.id &&
            other.teacherId === entry.teacherId &&
            other.day === entry.day &&
            other.slotIndex === entry.slotIndex
        );

        if (teacherClash || teacherUnavailableSlotKeys[entry.teacherId]?.has(slotKey)) {
          const alternateTeacher = teachers.find(
            (teacher) =>
              normalize(teacher.subject).includes(normalize(entry.subject)) &&
              !teacherUnavailableSlotKeys[teacher.id]?.has(slotKey) &&
              !current.some(
                (other) =>
                  other.id !== entry.id &&
                  other.teacherId === teacher.id &&
                  other.day === entry.day &&
                  other.slotIndex === entry.slotIndex
              )
          );
          if (alternateTeacher) {
            nextTeacherId = alternateTeacher.id;
          }
        }

        const roomClash = current.some(
          (other) =>
            other.id !== entry.id &&
            other.roomId === entry.roomId &&
            other.day === entry.day &&
            other.slotIndex === entry.slotIndex
        );

        if (roomClash) {
          const alternateRoom = rooms.find(
            (room) =>
              !current.some(
                (other) =>
                  other.id !== entry.id &&
                  other.roomId === room.id &&
                  other.day === entry.day &&
                  other.slotIndex === entry.slotIndex
              )
          );
          if (alternateRoom) {
            nextRoomId = alternateRoom.id;
          }
        }

        return {
          ...entry,
          teacherId: nextTeacherId,
          roomId: nextRoomId,
        };
      });
    });
  };

  const autoFillEmptySlots = () => {
    if (!selectedClassId) {
      return;
    }

    const classSetup = subjectSetupByClass[selectedClassId] || [];
    if (classSetup.length === 0) {
      return;
    }

    const existingForClass = entries.filter((entry) => entry.classId === selectedClassId);
    const subjectCount = existingForClass.reduce<Record<string, number>>((acc, entry) => {
      acc[entry.subject] = (acc[entry.subject] || 0) + 1;
      return acc;
    }, {});

    const neededQueue: SubjectSetup[] = [];
    classSetup.forEach((setup) => {
      const already = subjectCount[setup.subject] || 0;
      const remaining = Math.max(setup.periodsPerWeek - already, 0);
      for (let i = 0; i < remaining; i += 1) {
        neededQueue.push(setup);
      }
    });

    if (neededQueue.length === 0) {
      return;
    }

    let queueIndex = 0;
    const nextEntries = [...entries];

    DAYS.forEach((day) => {
      for (let slotIndex = 0; slotIndex < slotsPerDay; slotIndex += 1) {
        const already = nextEntries.find(
          (entry) => entry.classId === selectedClassId && entry.day === day && entry.slotIndex === slotIndex
        );

        if (already || queueIndex >= neededQueue.length) {
          continue;
        }

        const setup = neededQueue[queueIndex];
        queueIndex += 1;

        const teacherId = setup.teacherId || findTeacherForSubject(setup.subject, selectedClassId);

        nextEntries.push({
          id: id(),
          classId: selectedClassId,
          day,
          slotIndex,
          subject: setup.subject,
          teacherId,
          roomId: setup.roomId || rooms[0]?.id || "",
          locked: false,
        });
      }
    });

    setEntries(nextEntries);
  };

  const visibleConflicts = useMemo(() => detectConflicts.slice(0, 8), [detectConflicts]);

  const exportRows = useMemo(() => {
    return entries
      .map((entry) => ({
        classLabel: `${classById[entry.classId]?.name || "Class"}${
          classById[entry.classId]?.section ? ` - ${classById[entry.classId]?.section}` : ""
        }`,
        day: entry.day,
        slot: slots[entry.slotIndex] || `Slot ${entry.slotIndex + 1}`,
        subject: entry.subject,
        teacher: teacherById[entry.teacherId]?.name || "Teacher",
        room: roomById[entry.roomId]?.name || "Room",
        locked: entry.locked ? "Yes" : "No",
      }))
      .sort((a, b) => {
        const classCompare = a.classLabel.localeCompare(b.classLabel);
        if (classCompare !== 0) return classCompare;
        const dayCompare = DAYS.indexOf(a.day as DayKey) - DAYS.indexOf(b.day as DayKey);
        if (dayCompare !== 0) return dayCompare;
        return a.slot.localeCompare(b.slot);
      });
  }, [entries, classById, teacherById, roomById, slots]);

  const handleExportExcel = () => {
    const rows = [
      ["Class", "Day", "Time Slot", "Subject", "Teacher", "Room", "Locked"],
      ...exportRows.map((row) => [
        row.classLabel,
        row.day,
        row.slot,
        row.subject,
        row.teacher,
        row.room,
        row.locked,
      ]),
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `timetable-${academicYear}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const handleExportPdf = async () => {
    setPdfExporting(true);
    try {
      const doc = new jsPDF({ orientation: "landscape" });
      const pdfDays: DayKey[] = includeSaturdayInPdf
        ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        : ["Mon", "Tue", "Wed", "Thu", "Fri"];
    const dayLabels: Record<DayKey, string> = {
      Mon: "MONDAY",
      Tue: "TUESDAY",
      Wed: "WEDNESDAY",
      Thu: "THURSDAY",
      Fri: "FRIDAY",
      Sat: "SATURDAY",
    };

    const selectedClass = classById[selectedClassId];
    const selectedClassLabel = selectedClass
      ? `${selectedClass.name}${selectedClass.section ? ` - ${selectedClass.section}` : ""}`
      : "Class";

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 14;
    const titleY = 16;
    const gridStartY = 30;
    const totalWidth = pageWidth - marginX * 2;
    const timeColWidth = 42;
    const dayColWidth = (totalWidth - timeColWidth) / pdfDays.length;
    const headerHeight = 12;
    const rowHeight = Math.min(19, Math.max(12, (pageHeight - gridStartY - headerHeight - 8) / slots.length));

    const pastelHeaderColors: Array<[number, number, number]> = [
      [239, 220, 157],
      [245, 199, 165],
      [244, 173, 180],
      [232, 156, 214],
      [196, 184, 238],
      [255, 224, 178],
    ];

    const schoolSession = readSchoolSession();
    const schoolName = schoolSession.schoolInfo?.name?.trim() || "SCHOOL";
    const schoolInfoLines = [
      schoolSession.schoolInfo?.address?.trim(),
      schoolSession.schoolInfo?.phone?.trim(),
      schoolSession.schoolInfo?.email?.trim(),
      schoolSession.schoolInfo?.website?.trim(),
    ].filter(Boolean) as string[];

    const logoDataUrl = await resolveLogoDataUrl(schoolSession);
    const titleX = marginX + 20;

    // Always draw the initials badge as a guaranteed background
    doc.setFillColor(13, 148, 136);
    doc.rect(marginX, 8, 16, 16, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(schoolInitials(schoolName), marginX + 8, 17.4, { align: "center" });

    // Try to overlay the real logo image on top of the badge
    if (logoDataUrl) {
      try {
        const fmtMatch = logoDataUrl.match(/^data:image\/(png|jpe?g|gif|bmp|webp|tiff)/i);
        const rawFmt = (fmtMatch?.[1] || "jpeg").toLowerCase().replace("jpg", "jpeg");
        const pdfFmt = rawFmt.toUpperCase() as "PNG" | "JPEG" | "GIF" | "BMP" | "WEBP" | "TIFF";
        doc.addImage(logoDataUrl, pdfFmt, marginX, 8, 16, 16);
      } catch {
        // badge already drawn above — no action needed
      }
    }

    doc.setTextColor(87, 95, 104);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("CLASS SCHEDULE", titleX, titleY);
    doc.setFontSize(10);
    doc.text(schoolName, titleX, titleY + 5.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Class: ${selectedClassLabel}`, titleX, titleY + 11);
    doc.text(`Academic Year: ${academicYear}`, titleX + 62, titleY + 11);

    doc.setFontSize(8);
    schoolInfoLines.slice(0, 4).forEach((line, index) => {
      doc.text(line, pageWidth - marginX, 10 + index * 4, { align: "right" });
    });

    doc.setDrawColor(98, 104, 110);
    doc.setLineWidth(0.3);

    doc.setFillColor(239, 220, 157);
    doc.rect(marginX, gridStartY, timeColWidth, headerHeight, "FD");

    pdfDays.forEach((day, dayIndex) => {
      const x = marginX + timeColWidth + dayIndex * dayColWidth;
      const [r, g, b] = pastelHeaderColors[dayIndex % pastelHeaderColors.length];
      doc.setFillColor(r, g, b);
      doc.rect(x, gridStartY, dayColWidth, headerHeight, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(84, 89, 97);
      doc.text(dayLabels[day], x + dayColWidth / 2, gridStartY + 7.8, { align: "center" });
    });

    slots.forEach((slotLabel, slotIndex) => {
      const y = gridStartY + headerHeight + slotIndex * rowHeight;

      doc.setFillColor(247, 247, 248);
      doc.rect(marginX, y, timeColWidth, rowHeight, "FD");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(98, 104, 110);
      doc.text(slotLabel, marginX + timeColWidth / 2, y + rowHeight / 2 + 1.5, { align: "center" });

      pdfDays.forEach((day, dayIndex) => {
        const x = marginX + timeColWidth + dayIndex * dayColWidth;
        doc.setFillColor(255, 255, 255);
        doc.rect(x, y, dayColWidth, rowHeight, "FD");

        const entry = entries.find(
          (item) => item.classId === selectedClassId && item.day === day && item.slotIndex === slotIndex
        );

        if (!entry) {
          return;
        }

        const teacher = teacherById[entry.teacherId]?.name || "Teacher";
        const room = roomById[entry.roomId]?.name || "Room";
        const content = `${entry.subject}\n${teacher}\n${room}`;
        const wrapped = doc.splitTextToSize(content, dayColWidth - 4);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.4);
        doc.setTextColor(45, 55, 72);
        doc.text(wrapped, x + 2, y + 4.2);
      });
    });

      const daySuffix = includeSaturdayInPdf ? "mon-sat" : "mon-fri";
      doc.save(`class-schedule-${selectedClassLabel.replace(/[^a-zA-Z0-9_-]/g, "-")}-${daySuffix}-${academicYear}.pdf`);
    } catch {
      alert("Failed to export PDF. Please try again.");
    } finally {
      setPdfExporting(false);
    }
  };

  const openEditor = (day: DayKey, slotIndex: number) => {
    const existing = currentGridEntry(day, slotIndex);
    const viewClassId = existing?.classId || selectedClassId;
    if (!viewClassId) {
      return;
    }

    setEditor({
      open: true,
      classId: viewClassId,
      day,
      slotIndex,
      entryId: existing?.id,
    });
    setEditorSubject(existing?.subject || setupForSelectedClass[0]?.subject || "");
    setEditorTeacherId(existing?.teacherId || setupForSelectedClass[0]?.teacherId || teachers[0]?.id || "");
    setEditorRoomId(existing?.roomId || setupForSelectedClass[0]?.roomId || rooms[0]?.id || "");
    setEditorLocked(Boolean(existing?.locked));
  };

  const saveEditor = () => {
    if (!editor) {
      return;
    }

    const teacherId = editorTeacherId || findTeacherForSubject(editorSubject, editor.classId);

    setEntries((current) => {
      const withoutSlot = current.filter(
        (entry) =>
          !(
            entry.classId === editor.classId &&
            entry.day === editor.day &&
            entry.slotIndex === editor.slotIndex &&
            entry.id !== editor.entryId
          )
      );

      if (editor.entryId) {
        return withoutSlot.map((entry) =>
          entry.id === editor.entryId
            ? {
                ...entry,
                subject: editorSubject,
                teacherId,
                roomId: editorRoomId,
                locked: editorLocked,
              }
            : entry
        );
      }

      return [
        ...withoutSlot,
        {
          id: id(),
          classId: editor.classId,
          day: editor.day,
          slotIndex: editor.slotIndex,
          subject: editorSubject,
          teacherId,
          roomId: editorRoomId,
          locked: editorLocked,
        },
      ];
    });

    setEditor(null);
  };

  const onDragStart = (entryId: string) => {
    setDragEntryId(entryId);
  };

  const onDropCell = (day: DayKey, slotIndex: number) => {
    if (!dragEntryId || !selectedClassId) {
      return;
    }

    setEntries((current) => {
      const dragged = current.find((entry) => entry.id === dragEntryId);
      if (!dragged || dragged.classId !== selectedClassId || dragged.locked) {
        return current;
      }

      const target = current.find(
        (entry) => entry.classId === selectedClassId && entry.day === day && entry.slotIndex === slotIndex
      );

      if (target?.locked) {
        return current;
      }

      if (!target) {
        return current.map((entry) =>
          entry.id === dragged.id
            ? {
                ...entry,
                day,
                slotIndex,
              }
            : entry
        );
      }

      return current.map((entry) => {
        if (entry.id === dragged.id) {
          return { ...entry, day: target.day, slotIndex: target.slotIndex };
        }
        if (entry.id === target.id) {
          return { ...entry, day: dragged.day, slotIndex: dragged.slotIndex };
        }
        return entry;
      });
    });

    setDragEntryId(null);
  };

  const classGridEntry = (day: DayKey, slotIndex: number) => {
    if (!selectedClassId) {
      return undefined;
    }
    return getEntry(selectedClassId, day, slotIndex);
  };

  const teacherGridEntry = (day: DayKey, slotIndex: number) => {
    if (selectedTeacherId === "all") {
      return entries.find((entry) => entry.day === day && entry.slotIndex === slotIndex);
    }
    return entries.find(
      (entry) => entry.teacherId === selectedTeacherId && entry.day === day && entry.slotIndex === slotIndex
    );
  };

  const roomGridEntry = (day: DayKey, slotIndex: number) => {
    if (selectedRoomId === "all") {
      return entries.find((entry) => entry.day === day && entry.slotIndex === slotIndex);
    }
    return entries.find(
      (entry) => entry.roomId === selectedRoomId && entry.day === day && entry.slotIndex === slotIndex
    );
  };

  const currentGridEntry = (day: DayKey, slotIndex: number) => {
    if (viewMode === "teacher") {
      return teacherGridEntry(day, slotIndex);
    }
    if (viewMode === "room") {
      return roomGridEntry(day, slotIndex);
    }
    return classGridEntry(day, slotIndex);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-slate-600">Loading timetable module...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6 text-sm text-red-700">{error}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="border-teal-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl text-slate-900">Timetable Management</CardTitle>
          <CardDescription>
            Simple weekly schedule for fast generation and quick editing.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="pt-5">
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            <label className="space-y-1 text-sm">
              <span className="text-slate-600">Academic Year</span>
              <select
                value={academicYear}
                onChange={(event) => setAcademicYear(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3"
              >
                <option value="2025-2026">2025-2026</option>
                <option value="2026-2027">2026-2027</option>
                <option value="2027-2028">2027-2028</option>
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-slate-600">Class</span>
              <select
                value={selectedClassId}
                onChange={(event) => setSelectedClassId(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3"
              >
                {classOptions.map((schoolClass) => (
                  <option key={schoolClass.id} value={schoolClass.id}>
                    {schoolClass.name} {schoolClass.section ? `- ${schoolClass.section}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-slate-600">Section</span>
              <select
                value={selectedSection}
                onChange={(event) => setSelectedSection(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3"
              >
                {sectionOptions.map((section) => (
                  <option key={section} value={section}>
                    {section === "all" ? "All" : section}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-slate-600">Teacher</span>
              <select
                value={selectedTeacherId}
                onChange={(event) => setSelectedTeacherId(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3"
              >
                <option value="all">All</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-slate-600">Room</span>
              <select
                value={selectedRoomId}
                onChange={(event) => setSelectedRoomId(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3"
              >
                <option value="all">All</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr]">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Setup Summary</CardTitle>
            <CardDescription>Subjects, mapping, and periods per week</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-4 gap-2 px-2 text-xs font-medium text-slate-500">
              <span>Subject</span>
              <span>Teacher</span>
              <span>Periods/Week</span>
              <span>Room</span>
            </div>
            {setupForSelectedClass.map((setup, index) => (
              <div key={`${setup.subject}-${index}`} className="grid grid-cols-4 gap-2 rounded-lg border border-slate-100 p-2 text-xs">
                <span className="truncate font-medium text-slate-700">{setup.subject}</span>
                <select
                  value={setup.teacherId}
                  onChange={(event) =>
                    setSubjectSetupByClass((current) => ({
                      ...current,
                      [selectedClassId]: (current[selectedClassId] || []).map((item, itemIndex) =>
                        itemIndex === index ? { ...item, teacherId: event.target.value } : item
                      ),
                    }))
                  }
                  className="rounded border border-slate-200 bg-white px-2 py-1"
                >
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={setup.periodsPerWeek}
                  onChange={(event) =>
                    setSubjectSetupByClass((current) => ({
                      ...current,
                      [selectedClassId]: (current[selectedClassId] || []).map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, periodsPerWeek: Math.max(1, Number(event.target.value) || 1) }
                          : item
                      ),
                    }))
                  }
                  className="h-8 rounded border border-slate-200 bg-white px-2"
                />
                <select
                  value={setup.roomId}
                  onChange={(event) =>
                    setSubjectSetupByClass((current) => ({
                      ...current,
                      [selectedClassId]: (current[selectedClassId] || []).map((item, itemIndex) =>
                        itemIndex === index ? { ...item, roomId: event.target.value } : item
                      ),
                    }))
                  }
                  className="rounded border border-slate-200 bg-white px-2 py-1"
                >
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Workflow</CardTitle>
            <CardDescription>Guided setup for admins</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <p>1. Setup school timings</p>
            <p>2. Map teachers to subjects</p>
            <p>3. Define subject periods per week</p>
            <p>4. Generate timetable</p>
            <p>5. View and edit timetable</p>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <label className="text-xs text-slate-600">
                Start time
                <input
                  type="time"
                  value={schoolStartTime}
                  onChange={(event) => setSchoolStartTime(event.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2"
                />
              </label>
              <label className="text-xs text-slate-600">
                Slot min
                <input
                  type="number"
                  min={30}
                  max={90}
                  value={periodDuration}
                  onChange={(event) => setPeriodDuration(Math.max(30, Number(event.target.value) || 45))}
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2"
                />
              </label>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Actions</CardTitle>
            <CardDescription>Fast schedule controls</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full justify-start bg-teal-600 hover:bg-teal-700" onClick={() => generateTimetable("all")}>
              <Sparkles className="h-4 w-4" /> Generate Timetable
            </Button>
            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() => generateTimetable("selected")}
              disabled={!selectedClassId}
            >
              <Sparkles className="h-4 w-4" /> Generate Selected Class Only
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={fixConflictsOnly}>
              <Wand2 className="h-4 w-4" /> Fix Conflicts Only
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={autoFillEmptySlots}>
              Auto-fill Empty Slots
            </Button>
            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() => void handleExportPdf()}
              disabled={pdfExporting}
            >
              <Download className="h-4 w-4" /> {pdfExporting ? "Preparing PDF..." : "Download PDF"}
            </Button>
            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={includeSaturdayInPdf}
                onChange={(event) => setIncludeSaturdayInPdf(event.target.checked)}
              />
              Include Saturday in PDF
            </label>
            <Button className="w-full justify-start" variant="outline" onClick={handleExportExcel}>
              <FileSpreadsheet className="h-4 w-4" /> Download Excel
            </Button>
            <p className="pt-1 text-xs text-slate-500">Pinned periods are preserved during regenerate.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[4fr_1.25fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-lg">Weekly Timetable</CardTitle>
                <CardDescription>Click to edit. Drag to move or swap periods.</CardDescription>
              </div>
              <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
                <TabsList className="grid grid-cols-3">
                  <TabsTrigger value="class">Class</TabsTrigger>
                  <TabsTrigger value="teacher">Teacher</TabsTrigger>
                  <TabsTrigger value="room">Room</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            {viewMode === "teacher" && selectedTeacherId !== "all" && (
              <p className="text-xs text-slate-500">
                Showing timetable for {teacherById[selectedTeacherId]?.name || "selected teacher"}
              </p>
            )}
            {viewMode === "room" && selectedRoomId !== "all" && (
              <p className="text-xs text-slate-500">
                Showing timetable for {roomById[selectedRoomId]?.name || "selected room"}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="min-w-[940px] w-full border-collapse">
                <thead>
                  <tr>
                    <th className="w-36 border-b border-r border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-600">Time</th>
                    {DAYS.map((day) => (
                      <th
                        key={day}
                        className={`border-b border-r border-slate-200 px-3 py-2 text-left text-xs font-semibold ${DAY_HEADER_CLASSES[day]}`}
                      >
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slotLabel, slotIndex) => (
                    <tr key={slotLabel}>
                      <td className="border-r border-b border-slate-200 bg-slate-50 px-3 py-3 text-xs font-medium text-slate-600">
                        {slotLabel}
                      </td>
                      {DAYS.map((day) => {
                        const entry = currentGridEntry(day, slotIndex);
                        const classId = entry?.classId || selectedClassId;
                        const hasConflict = classId
                          ? conflictKeySet.has(`${classId}-${day}-${slotIndex}`)
                          : false;

                        return (
                          <td
                            key={`${day}-${slotLabel}`}
                            className="border-r border-b border-slate-100 bg-white p-1 align-top"
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={() => onDropCell(day, slotIndex)}
                          >
                            <button
                              type="button"
                              onClick={() => openEditor(day, slotIndex)}
                              className={`group h-[86px] w-full rounded-lg border p-2 text-left shadow-sm transition hover:border-teal-300 hover:bg-teal-50 ${
                                hasConflict ? "border-red-300" : "border-slate-200"
                              }`}
                            >
                              {entry ? (
                                <div
                                  draggable={viewMode === "class" && !entry.locked}
                                  onDragStart={() => onDragStart(entry.id)}
                                  className="h-full"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="line-clamp-2 text-xs font-semibold text-slate-800">{entry.subject}</p>
                                    <div className="flex items-center gap-1">
                                      {entry.locked && <Lock className="h-3.5 w-3.5 text-teal-700" />}
                                      {hasConflict && <AlertTriangle className="h-3.5 w-3.5 text-red-600" />}
                                      <GripVertical className="h-3.5 w-3.5 text-slate-300 opacity-0 transition group-hover:opacity-100" />
                                    </div>
                                  </div>
                                  <p className="mt-1 text-[11px] text-slate-600">{teacherById[entry.teacherId]?.name || "Teacher"}</p>
                                  <p className="text-[11px] text-slate-500">{roomById[entry.roomId]?.name || "Room"}</p>
                                  <div className="mt-1.5">
                                    <Badge className="bg-teal-100 text-teal-800 hover:bg-teal-100">{entry.subject}</Badge>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex h-full items-center justify-center text-xs text-slate-400">Click to add</div>
                              )}
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

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Conflicts</CardTitle>
            <CardDescription>Small, non-intrusive warning list</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {visibleConflicts.length === 0 ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">No conflicts found.</p>
            ) : (
              visibleConflicts.map((conflict) => (
                <div key={conflict.id} className="rounded-lg border border-red-100 bg-red-50 p-2.5 text-xs text-red-700">
                  <p className="font-semibold">{conflict.type} Conflict</p>
                  <p>{conflict.message}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {editor?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">Edit Period</h3>
            <p className="mb-3 text-xs text-slate-500">
              {editor.day} • {slots[editor.slotIndex]} • {classById[editor.classId]?.name || "Class"}
            </p>

            <div className="space-y-3">
              <label className="block text-sm text-slate-600">
                Subject
                <select
                  value={editorSubject}
                  onChange={(event) => {
                    const nextSubject = event.target.value;
                    setEditorSubject(nextSubject);
                    if (!editorTeacherId) {
                      setEditorTeacherId(findTeacherForSubject(nextSubject, editor.classId));
                    }
                  }}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3"
                >
                  {(subjectSetupByClass[editor.classId] || []).map((setup) => (
                    <option key={setup.subject} value={setup.subject}>
                      {setup.subject}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm text-slate-600">
                Teacher
                <select
                  value={editorTeacherId}
                  onChange={(event) => setEditorTeacherId(event.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3"
                >
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm text-slate-600">
                Room (optional)
                <select
                  value={editorRoomId}
                  onChange={(event) => setEditorRoomId(event.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3"
                >
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={editorLocked}
                  onChange={(event) => setEditorLocked(event.target.checked)}
                />
                Pin/Lock this period
              </label>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setEditor(null)}>
                Cancel
              </Button>
              <Button className="bg-teal-600 hover:bg-teal-700" onClick={saveEditor}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
