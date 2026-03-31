import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin, {
  type DateClickArg,
  type EventResizeDoneArg,
} from "@fullcalendar/interaction";
import {
  type EventClickArg,
  type EventContentArg,
  type EventDropArg,
  type EventInput,
} from "@fullcalendar/core";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Alert,
  Badge,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  CalendarOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  FilterOutlined,
  PlusOutlined,
  ScheduleOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";

const { Text, Title, Paragraph } = Typography;

type SchoolClass = {
  _id: string;
  name: string;
  section?: string;
};

type Teacher = {
  _id: string;
  name: string;
  email?: string;
  position?: string;
  status?: string;
};

type ExamUpload = {
  _id: string;
  teacherId?: string | { _id: string; name?: string; email?: string; position?: string };
  teacherName: string;
  documentName?: string;
  documentData?: string;
  comment?: string;
  uploadedAt?: string;
};

type Exam = {
  _id: string;
  title: string;
  examType: string;
  className: string;
  teacherId?: string | Teacher | null;
  subject: string;
  examDate: string;
  startTime: string;
  endTime: string;
  instructions?: string;
  uploads?: ExamUpload[];
};

type ExamFormValues = {
  title: string;
  examType: string;
  className: string;
  teacherId?: string;
  subject: string;
  examDate: string;
  startTime: string;
  endTime: string;
  instructions?: string;
};

type ViewMode = "calendar" | "list";
type ModalMode = "create" | "edit";

const examTypes = [
  "Unit Test",
  "Weekly Test",
  "Monthly Test",
  "Quarterly Exam",
  "Half Yearly",
  "Pre Board",
  "Final Exam",
  "Practical Exam",
];

const examTypeColors: Record<string, { background: string; border: string; text: string }> = {
  "Unit Test": { background: "#dbeafe", border: "#3b82f6", text: "#1d4ed8" },
  "Weekly Test": { background: "#e0f2fe", border: "#0ea5e9", text: "#0369a1" },
  "Monthly Test": { background: "#dcfce7", border: "#22c55e", text: "#15803d" },
  "Quarterly Exam": { background: "#fef3c7", border: "#f59e0b", text: "#b45309" },
  "Half Yearly": { background: "#ede9fe", border: "#8b5cf6", text: "#6d28d9" },
  "Pre Board": { background: "#ffe4e6", border: "#f43f5e", text: "#be123c" },
  "Final Exam": { background: "#fee2e2", border: "#ef4444", text: "#b91c1c" },
  "Practical Exam": { background: "#f3e8ff", border: "#a855f7", text: "#7e22ce" },
};

const defaultExamColor = { background: "#f3f4f6", border: "#6b7280", text: "#374151" };

const getClassLabel = (schoolClass: Pick<SchoolClass, "name" | "section">) =>
  schoolClass.section ? `${schoolClass.name} - ${schoolClass.section}` : schoolClass.name;

const pad = (value: number) => String(value).padStart(2, "0");

const toLocalDate = (value: Date) =>
  `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;

const toLocalTime = (value: Date) => `${pad(value.getHours())}:${pad(value.getMinutes())}`;

const toEventDateTime = (examDate: string, time: string) => `${examDate}T${time}:00`;

const getExamColor = (examType: string) => examTypeColors[examType] || defaultExamColor;

export default function ExamsModule() {
  const calendarRef = useRef<FullCalendar | null>(null);
  const [form] = Form.useForm<ExamFormValues>();
  const [schoolId, setSchoolId] = useState("");
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [selectedClass, setSelectedClass] = useState<string | undefined>();
  const [selectedSubject, setSelectedSubject] = useState<string | undefined>();
  const [selectedExamType, setSelectedExamType] = useState<string | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiTeacherId, setAiTeacherId] = useState<string | undefined>();
  const [aiCreating, setAiCreating] = useState(false);

  useEffect(() => {
    const school = JSON.parse(localStorage.getItem("school") || "null");
    setSchoolId(school?._id || "");
  }, []);

  const fetchData = useCallback(
    async (silent = false) => {
      if (!schoolId) {
        setLoading(false);
        return;
      }

      try {
        if (!silent) {
          setLoading(true);
        }
        setError("");

        const [classesRes, examsRes] = await Promise.all([
          fetch(`https://erp-portal-1-ftwe.onrender.com/api/classes/${schoolId}`),
          fetch(`https://erp-portal-1-ftwe.onrender.com/api/exams/school/${schoolId}`),
        ]);

        if (!classesRes.ok) {
          throw new Error(`Failed to load classes (${classesRes.status})`);
        }
        if (!examsRes.ok) {
          throw new Error(`Failed to load exams (${examsRes.status})`);
        }
        const [classesData, examsData] = await Promise.all([
          classesRes.json(),
          examsRes.json(),
        ]);

        setClasses(Array.isArray(classesData) ? classesData : []);
        setExams(Array.isArray(examsData) ? examsData : []);

        // Teacher list should not block exam calendar rendering.
        try {
          const staffRes = await fetch(`https://erp-portal-1-ftwe.onrender.com/api/staff/${schoolId}`);
          if (staffRes.ok) {
            const staffData = await staffRes.json();
            setTeachers(
              Array.isArray(staffData)
                ? staffData.filter(
                    (staff: Teacher) =>
                      /^Teacher$/i.test(String(staff.position || "")) &&
                      String(staff.status || "Active") !== "Inactive"
                  )
                : []
            );
          }
        } catch (staffErr) {
          console.error("School admin staff fetch error:", staffErr);
        }
      } catch (err) {
        console.error("School admin exams fetch error:", err);
        if (!silent) {
          setClasses([]);
          setExams([]);
          setTeachers([]);
        }
        setError(err instanceof Error ? err.message : "Failed to load exam module");
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [schoolId]
  );

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!schoolId) {
      return;
    }

    const intervalId = setInterval(() => {
      void fetchData(true);
    }, 10000);

    return () => {
      clearInterval(intervalId);
    };
  }, [schoolId, fetchData]);

  useEffect(() => {
    if (!activeExam) {
      return;
    }

    const latestExam = exams.find((exam) => exam._id === activeExam._id);
    if (latestExam) {
      setActiveExam(latestExam);
    }
  }, [activeExam, exams]);

  const subjectOptions = useMemo(
    () =>
      [...new Set(exams.map((exam) => exam.subject).filter(Boolean))]
        .sort((left, right) => left.localeCompare(right))
        .map((subject) => ({ label: subject, value: subject })),
    [exams]
  );

  const filteredExams = useMemo(
    () =>
      exams.filter((exam) => {
        if (selectedClass && exam.className !== selectedClass) return false;
        if (selectedSubject && exam.subject !== selectedSubject) return false;
        if (selectedExamType && exam.examType !== selectedExamType) return false;
        return true;
      }),
    [exams, selectedClass, selectedSubject, selectedExamType]
  );

  const calendarEvents = useMemo<EventInput[]>(
    () =>
      filteredExams.map((exam) => {
        const safeExamDate = /^\d{4}-\d{2}-\d{2}$/.test(exam.examDate)
          ? exam.examDate
          : toLocalDate(new Date());
        const safeStartTime = /^\d{2}:\d{2}$/.test(exam.startTime) ? exam.startTime : "09:00";
        let safeEndTime = /^\d{2}:\d{2}$/.test(exam.endTime) ? exam.endTime : "10:00";

        if (safeEndTime <= safeStartTime) {
          const [hours, minutes] = safeStartTime.split(":").map(Number);
          const nextHour = Math.min((hours || 0) + 1, 23);
          safeEndTime = `${String(nextHour).padStart(2, "0")}:${String(minutes || 0).padStart(2, "0")}`;
        }

        const color = getExamColor(exam.examType);
        return {
          id: exam._id,
          title: exam.title,
          start: toEventDateTime(safeExamDate, safeStartTime),
          end: toEventDateTime(safeExamDate, safeEndTime),
          backgroundColor: color.background,
          borderColor: color.border,
          textColor: color.text,
          extendedProps: {
            exam,
            uploadCount: exam.uploads?.length || 0,
            subject: exam.subject,
            className: exam.className,
          },
        };
      }),
    [filteredExams]
  );

  const showExamOnCalendar = (exam: Exam) => {
    setSelectedClass(undefined);
    setSelectedSubject(undefined);
    setSelectedExamType(undefined);
    setViewMode("calendar");

    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      const targetDate = /^\d{4}-\d{2}-\d{2}$/.test(exam.examDate)
        ? exam.examDate
        : toLocalDate(new Date());
      calendarApi.gotoDate(targetDate);
    }
  };

  const openCreateModal = (date?: Date) => {
    setModalMode("create");
    setActiveExam(null);
    const nextDate = date ? toLocalDate(date) : toLocalDate(new Date());
    const nextStart = date && (date.getHours() || date.getMinutes()) ? toLocalTime(date) : "09:00";
    const nextEndDate = new Date(date || new Date());
    if (!(date && (date.getHours() || date.getMinutes()))) {
      nextEndDate.setHours(10, 0, 0, 0);
    } else {
      nextEndDate.setHours(nextEndDate.getHours() + 1);
    }
    form.setFieldsValue({
      title: "",
      examType: undefined,
      className: selectedClass,
      teacherId: undefined,
      subject: "",
      examDate: nextDate,
      startTime: nextStart,
      endTime: toLocalTime(nextEndDate),
      instructions: "",
    } as Partial<ExamFormValues>);
    setModalOpen(true);
  };

  const openEditModal = (exam: Exam) => {
    setModalMode("edit");
    setActiveExam(exam);
    const teacherValue =
      exam.teacherId && typeof exam.teacherId === "object"
        ? exam.teacherId._id
        : typeof exam.teacherId === "string"
          ? exam.teacherId
          : undefined;
    form.setFieldsValue({
      title: exam.title,
      examType: exam.examType,
      className: exam.className,
      teacherId: teacherValue,
      subject: exam.subject,
      examDate: exam.examDate,
      startTime: exam.startTime,
      endTime: exam.endTime,
      instructions: exam.instructions || "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setActiveExam(null);
    form.resetFields();
  };

  const upsertExam = (nextExam: Exam) => {
    setExams((current) => {
      const exists = current.some((exam) => exam._id === nextExam._id);
      return exists
        ? current.map((exam) => (exam._id === nextExam._id ? nextExam : exam))
        : [nextExam, ...current];
    });
  };

  const upsertManyExams = (nextExams: Exam[]) => {
    setExams((current) => {
      const map = new Map<string, Exam>();
      current.forEach((exam) => map.set(exam._id, exam));
      nextExams.forEach((exam) => map.set(exam._id, exam));
      return Array.from(map.values());
    });
  };

  const submitExam = async (values: ExamFormValues) => {
    if (values.endTime <= values.startTime) {
      void message.error("End time must be after start time.");
      return;
    }

    try {
      setSaving(true);
      const endpoint = activeExam
        ? `https://erp-portal-1-ftwe.onrender.com/api/exams/${activeExam._id}`
        : "https://erp-portal-1-ftwe.onrender.com/api/exams";
      const method = activeExam ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          title: values.title.trim(),
          subject: values.subject.trim(),
          teacherId: values.teacherId || null,
          instructions: values.instructions?.trim() || "",
          schoolId,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || `Failed to ${activeExam ? "update" : "create"} exam`);
      }

      upsertExam(data.data as Exam);
      if (!activeExam) {
        showExamOnCalendar(data.data as Exam);
      }
      void message.success(activeExam ? "Exam updated." : "Exam created.");
      closeModal();
    } catch (err) {
      console.error("Save exam error:", err);
      void message.error(err instanceof Error ? err.message : "Failed to save exam");
    } finally {
      setSaving(false);
    }
  };

  const createExamWithAi = async () => {
    if (!aiPrompt.trim()) {
      void message.error("Please enter a prompt for AI exam creation.");
      return;
    }

    if (!schoolId) {
      void message.error("School session not found.");
      return;
    }

    try {
      setAiCreating(true);
      const classOptions = classes.map((schoolClass) => getClassLabel(schoolClass));

      const res = await fetch("https://erp-portal-1-ftwe.onrender.com/api/exams/ai-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId,
          prompt: aiPrompt.trim(),
          classOptions,
          teacherId: aiTeacherId || null,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to create exam from AI");
      }

      const created = Array.isArray(data.data) ? (data.data as Exam[]) : [data.data as Exam];
      if (created.length === 0) {
        throw new Error("AI did not return any exam to create");
      }

      upsertManyExams(created);
      showExamOnCalendar(created[0]);
      setAiPrompt("");
      setAiTeacherId(undefined);
      setAiModalOpen(false);
      void message.success(
        created.length > 1
          ? `${created.length} exams created from AI plan.`
          : "Exam created from AI prompt."
      );
    } catch (err) {
      console.error("AI exam create error:", err);
      void message.error(err instanceof Error ? err.message : "Failed to create exam from AI");
    } finally {
      setAiCreating(false);
    }
  };

  const handleDeleteExam = async (examId: string) => {
    try {
      setDeletingId(examId);
      const res = await fetch(`https://erp-portal-1-ftwe.onrender.com/api/exams/${examId}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to delete exam");
      }

      setExams((current) => current.filter((exam) => exam._id !== examId));
      void message.success("Exam deleted.");
      if (activeExam?._id === examId) {
        closeModal();
      }
    } catch (err) {
      console.error("Delete exam error:", err);
      void message.error(err instanceof Error ? err.message : "Failed to delete exam");
    } finally {
      setDeletingId("");
    }
  };

  const updateExamSchedule = async ({
    examId,
    examDate,
    startTime,
    endTime,
    revert,
  }: {
    examId: string;
    examDate: string;
    startTime: string;
    endTime: string;
    revert: () => void;
  }) => {
    try {
      const res = await fetch(`https://erp-portal-1-ftwe.onrender.com/api/exams/${examId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId, examDate, startTime, endTime }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to reschedule exam");
      }

      upsertExam(data.data as Exam);
      void message.success("Exam rescheduled.");
    } catch (err) {
      revert();
      console.error("Reschedule exam error:", err);
      void message.error(err instanceof Error ? err.message : "Failed to reschedule exam");
    }
  };

  const handleDateClick = (arg: DateClickArg) => {
    openCreateModal(arg.date);
  };

  const handleEventClick = (arg: EventClickArg) => {
    const exam = arg.event.extendedProps.exam as Exam;
    openEditModal(exam);
  };

  const handleEventDrop = (arg: EventDropArg) => {
    if (!arg.event.start || !arg.event.end) {
      arg.revert();
      return;
    }

    void updateExamSchedule({
      examId: arg.event.id,
      examDate: toLocalDate(arg.event.start),
      startTime: toLocalTime(arg.event.start),
      endTime: toLocalTime(arg.event.end),
      revert: arg.revert,
    });
  };

  const handleEventResize = (arg: EventResizeDoneArg) => {
    if (!arg.event.start || !arg.event.end) {
      arg.revert();
      return;
    }

    void updateExamSchedule({
      examId: arg.event.id,
      examDate: toLocalDate(arg.event.start),
      startTime: toLocalTime(arg.event.start),
      endTime: toLocalTime(arg.event.end),
      revert: arg.revert,
    });
  };

  const downloadExamMarks = async (exam: Exam) => {
    try {
      const res = await fetch(
        `https://erp-portal-1-ftwe.onrender.com/api/marks/download/${schoolId}/${exam._id}`
      );
      if (!res.ok) throw new Error("Failed to fetch marks data");

      const data = await res.json();

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header with logo
      if (data.school?.logo) {
        try {
          doc.addImage(data.school.logo, "PNG", 14, 10, 30, 30);
        } catch {
          // logo failed to load, skip
        }
      }

      // School name
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(data.school?.name || "School", pageWidth / 2, 20, { align: "center" });

      if (data.school?.address) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(data.school.address, pageWidth / 2, 26, { align: "center" });
      }

      // Divider line
      doc.setLineWidth(0.5);
      doc.line(14, 32, pageWidth - 14, 32);

      // Exam details
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Exam Marks Report", pageWidth / 2, 40, { align: "center" });

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      const details = [
        ["Exam Title:", data.exam.title],
        ["Subject:", data.exam.subject],
        ["Class:", data.exam.className],
        ["Exam Type:", data.exam.examType],
        ["Date:", data.exam.examDate],
        ["Time:", `${data.exam.startTime} - ${data.exam.endTime}`],
        ["Teacher:", data.teacher || "Not Assigned"],
      ];

      let yPos = 48;
      details.forEach(([label, value]) => {
        doc.setFont("helvetica", "bold");
        doc.text(label, 20, yPos);
        doc.setFont("helvetica", "normal");
        doc.text(value, 55, yPos);
        yPos += 6;
      });

      // Marks table
      const tableData = data.marks.map((m: any, index: number) => [
        index + 1,
        m.rollNumber,
        m.studentName,
        m.email,
        m.obtainedMarks,
        m.maxMarks,
        m.remarks || "-",
      ]);

      autoTable(doc, {
        startY: yPos + 4,
        head: [["#", "Roll No", "Student Name", "Email", "Obtained", "Max Marks", "Remarks"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [37, 99, 235] },
        styles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 22 },
          2: { cellWidth: 45 },
          3: { cellWidth: 50 },
          4: { cellWidth: 22 },
          5: { cellWidth: 22 },
          6: { cellWidth: 30 },
        },
        margin: { left: 14, right: 14 },
      });

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        doc.text(
          `Generated on ${new Date().toLocaleDateString()} | Page ${i} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: "center" }
        );
      }

      doc.save(`${data.exam.title.replace(/\s+/g, "_")}_Marks.pdf`);
      void message.success("Marks PDF downloaded");
    } catch (err) {
      console.error("Download marks error:", err);
      void message.error("Failed to download marks");
    }
  };

  const renderEventContent = (arg: EventContentArg) => {
    const exam = arg.event.extendedProps.exam as Exam;
    const uploadCount = Number(arg.event.extendedProps.uploadCount || 0);
    const statusColor = uploadCount > 0 ? "#16a34a" : "#f59e0b";
    const assignedTeacher =
      exam.teacherId && typeof exam.teacherId === "object"
        ? exam.teacherId.name || "Assigned"
        : "Not assigned";

    return (
      <Tooltip
        title={
          <div className="space-y-1">
            <div>{exam.title}</div>
            <div>{exam.subject}</div>
            <div>{exam.className}</div>
            <div>{`Teacher: ${assignedTeacher}`}</div>
            <div>{`${exam.startTime} - ${exam.endTime}`}</div>
            <div>{uploadCount > 0 ? `${uploadCount} paper(s) uploaded` : "Papers pending"}</div>
          </div>
        }
      >
        <div className="px-1 py-0.5 overflow-hidden">
          <div className="flex items-center justify-between gap-1">
            <span className="truncate text-[11px] font-semibold">{arg.timeText}</span>
            {uploadCount > 0 ? (
              <CheckCircleFilled style={{ color: statusColor, fontSize: 12 }} />
            ) : (
              <Badge color={statusColor} />
            )}
          </div>
          <div className="truncate text-[12px] font-semibold">{exam.title}</div>
          <div className="truncate text-[11px] opacity-80">{exam.subject}</div>
        </div>
      </Tooltip>
    );
  };

  const uploadSummaryCards = useMemo(
    () => ({
      total: filteredExams.length,
      uploaded: filteredExams.filter((exam) => (exam.uploads?.length || 0) > 0).length,
      pending: filteredExams.filter((exam) => (exam.uploads?.length || 0) === 0).length,
    }),
    [filteredExams]
  );

  const listColumns = [
    {
      title: "Exam",
      key: "exam",
      render: (_: unknown, exam: Exam) => {
        const color = getExamColor(exam.examType);
        return (
          <Space direction="vertical" size={2}>
            <Text strong>{exam.title}</Text>
            <Space wrap>
              <Tag color={color.border}>{exam.examType}</Tag>
              <Tag>{exam.className}</Tag>
              <Tag>{exam.subject}</Tag>
            </Space>
          </Space>
        );
      },
    },
    {
      title: "Date & Time",
      key: "schedule",
      render: (_: unknown, exam: Exam) => (
        <Space direction="vertical" size={2}>
          <Text><CalendarOutlined /> {exam.examDate}</Text>
          <Text><ClockCircleOutlined /> {`${exam.startTime} - ${exam.endTime}`}</Text>
        </Space>
      ),
    },
    {
      title: "Assigned Teacher",
      key: "teacher",
      render: (_: unknown, exam: Exam) => {
        const teacherName =
          exam.teacherId && typeof exam.teacherId === "object"
            ? exam.teacherId.name || "Assigned"
            : "Not assigned";
        return <Text type={teacherName === "Not assigned" ? "secondary" : undefined}>{teacherName}</Text>;
      },
    },
    {
      title: "Instructions",
      dataIndex: "instructions",
      key: "instructions",
      render: (value: string) => <Text type="secondary">{value || "No instructions"}</Text>,
    },
    {
      title: "Paper Status",
      key: "uploads",
      render: (_: unknown, exam: Exam) => (
        <Tag color={(exam.uploads?.length || 0) > 0 ? "green" : "orange"}>
          {(exam.uploads?.length || 0) > 0 ? `${exam.uploads?.length} uploaded` : "Pending"}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: unknown, exam: Exam) => (
        <Space>
          <Button icon={<EyeOutlined />} onClick={() => openEditModal(exam)}>
            View
          </Button>
          <Button icon={<EditOutlined />} onClick={() => openEditModal(exam)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete exam?"
            description="This will remove the exam and all uploaded papers."
            onConfirm={() => void handleDeleteExam(exam._id)}
          >
            <Button danger icon={<DeleteOutlined />} loading={deletingId === exam._id}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <Title level={4} style={{ margin: 0 }}>
              Visual Exam Scheduler
            </Title>
            <Text type="secondary">
              Plan exams in month, week, and day views. Drag events to reschedule, resize to adjust duration, and track paper uploads at a glance.
            </Text>
          </div>

          <Space wrap>
            <Button onClick={() => void fetchData(true)}>Refresh</Button>
            <Segmented<ViewMode>
              value={viewMode}
              onChange={(value) => setViewMode(value)}
              options={[
                { label: "Calendar View", value: "calendar", icon: <CalendarOutlined /> },
                { label: "List View", value: "list", icon: <ScheduleOutlined /> },
              ]}
            />
            <Button icon={<ThunderboltOutlined />} onClick={() => setAiModalOpen(true)}>
              Create with AI
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreateModal()}>
              Create Exam
            </Button>
          </Space>
        </div>
      </Card>

      {error ? <Alert type="error" message={error} showIcon /> : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <Space direction="vertical" size={0}>
            <Text type="secondary">Filtered Exams</Text>
            <Title level={3} style={{ margin: 0 }}>{uploadSummaryCards.total}</Title>
          </Space>
        </Card>
        <Card>
          <Space direction="vertical" size={0}>
            <Text type="secondary">Paper Uploaded</Text>
            <Title level={3} style={{ margin: 0, color: "#15803d" }}>{uploadSummaryCards.uploaded}</Title>
          </Space>
        </Card>
        <Card>
          <Space direction="vertical" size={0}>
            <Text type="secondary">Paper Pending</Text>
            <Title level={3} style={{ margin: 0, color: "#b45309" }}>{uploadSummaryCards.pending}</Title>
          </Space>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
          <div className="min-w-0 xl:flex-1">
            <Text strong><FilterOutlined /> Filters</Text>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
              <Select
                allowClear
                placeholder="Filter by class"
                value={selectedClass}
                onChange={setSelectedClass}
                options={classes.map((schoolClass) => ({
                  label: getClassLabel(schoolClass),
                  value: getClassLabel(schoolClass),
                }))}
              />
              <Select
                allowClear
                placeholder="Filter by subject"
                value={selectedSubject}
                onChange={setSelectedSubject}
                options={subjectOptions}
              />
              <Select
                allowClear
                placeholder="Filter by exam type"
                value={selectedExamType}
                onChange={setSelectedExamType}
                options={examTypes.map((type) => ({ label: type, value: type }))}
              />
            </div>
          </div>
        </div>
      </Card>

      {loading ? (
        <Card loading />
      ) : filteredExams.length === 0 ? (
        <Card>
          <Empty description="No exams match the selected filters." />
        </Card>
      ) : viewMode === "calendar" ? (
        <Card bodyStyle={{ padding: 16 }}>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            height="auto"
            selectable
            editable
            eventResizableFromStart
            dayMaxEvents
            events={calendarEvents}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            eventContent={renderEventContent}
            slotMinTime="06:00:00"
            slotMaxTime="21:00:00"
            allDaySlot={false}
            nowIndicator
          />
        </Card>
      ) : (
        <Card title="Exam List View">
          <Table rowKey="_id" dataSource={filteredExams} columns={listColumns} pagination={{ pageSize: 8 }} />
        </Card>
      )}

      <Modal
        title="Create Exam with AI"
        open={aiModalOpen}
        onCancel={() => {
          setAiModalOpen(false);
          setAiPrompt("");
          setAiTeacherId(undefined);
        }}
        onOk={() => void createExamWithAi()}
        okText="Create Exam"
        confirmLoading={aiCreating}
      >
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Text type="secondary">
            Enter one prompt and the exam will be created automatically.
          </Text>
          <Input.TextArea
            rows={4}
            placeholder="Example: Create a full week exam plan for Class 10 - A, Monday to Friday, one subject each day, 09:00 to 10:00, include short instructions."
            value={aiPrompt}
            onChange={(event) => setAiPrompt(event.target.value)}
          />
          <Select
            allowClear
            placeholder="Assign teacher (optional)"
            value={aiTeacherId}
            onChange={(value) => setAiTeacherId(value)}
            options={teachers.map((teacher) => ({
              label: `${teacher.name}${teacher.email ? ` (${teacher.email})` : ""}`,
              value: teacher._id,
            }))}
          />
        </Space>
      </Modal>

      <Modal
        title={modalMode === "create" ? "Create Exam" : "Exam Details"}
        open={modalOpen}
        onCancel={closeModal}
        width={900}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={(values) => void submitExam(values)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item name="title" label="Exam Name" rules={[{ required: true, message: "Enter exam name" }]}>
              <Input placeholder="Enter exam name" />
            </Form.Item>
            <Form.Item name="examType" label="Exam Type" rules={[{ required: true, message: "Select exam type" }]}>
              <Select options={examTypes.map((type) => ({ label: type, value: type }))} placeholder="Select exam type" />
            </Form.Item>
            <Form.Item name="className" label="Class" rules={[{ required: true, message: "Select class" }]}>
              <Select
                options={classes.map((schoolClass) => ({
                  label: getClassLabel(schoolClass),
                  value: getClassLabel(schoolClass),
                }))}
                placeholder="Select class"
              />
            </Form.Item>
            <Form.Item name="teacherId" label="Assign Teacher (Optional)">
              <Select
                allowClear
                options={teachers.map((teacher) => ({
                  label: `${teacher.name}${teacher.email ? ` (${teacher.email})` : ""}`,
                  value: teacher._id,
                }))}
                placeholder="Select teacher"
              />
            </Form.Item>
            <Form.Item name="subject" label="Subject" rules={[{ required: true, message: "Enter subject" }]}>
              <Input placeholder="e.g. Mathematics" />
            </Form.Item>
            <Form.Item name="examDate" label="Exam Date" rules={[{ required: true, message: "Select exam date" }]}>
              <Input type="date" />
            </Form.Item>
            <Form.Item name="startTime" label="Start Time" rules={[{ required: true, message: "Select start time" }]}>
              <Input type="time" />
            </Form.Item>
            <Form.Item name="endTime" label="End Time" rules={[{ required: true, message: "Select end time" }]}>
              <Input type="time" />
            </Form.Item>
          </div>

          <Form.Item name="instructions" label="Additional Instructions">
            <Input.TextArea rows={4} placeholder="Add instructions for teachers or students" />
          </Form.Item>

          {activeExam ? (
            <Card size="small" title="Teacher Upload Status" style={{ marginBottom: 16 }}>
              {activeExam.uploads && activeExam.uploads.length > 0 ? (
                <div className="space-y-3">
                  {activeExam.uploads.map((upload) => (
                    <Card key={upload._id} size="small">
                      <Space direction="vertical" size={6} style={{ width: "100%" }}>
                        <Space wrap>
                          <Tag color="green">{upload.teacherName}</Tag>
                          <Tag>{upload.uploadedAt ? new Date(upload.uploadedAt).toLocaleString() : "Uploaded"}</Tag>
                        </Space>
                        <Button
                          type="link"
                          icon={<FileTextOutlined />}
                          href={upload.documentData}
                          target="_blank"
                          style={{ paddingInline: 0 }}
                        >
                          {upload.documentName || "View uploaded paper"}
                        </Button>
                        <Paragraph style={{ marginBottom: 0 }}>
                          {upload.comment || "No comment added."}
                        </Paragraph>
                      </Space>
                    </Card>
                  ))}
                </div>
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No teacher papers uploaded yet." />
              )}
            </Card>
          ) : null}

          <div className="flex flex-wrap justify-between gap-3">
            <div>
              {activeExam ? (
                <Popconfirm
                  title="Delete exam?"
                  description="This will remove the exam and any uploaded papers."
                  onConfirm={() => void handleDeleteExam(activeExam._id)}
                >
                  <Button danger icon={<DeleteOutlined />} loading={deletingId === activeExam._id}>
                    Delete Exam
                  </Button>
                </Popconfirm>
              ) : null}
            </div>
            <Space>
              <Button onClick={closeModal}>Cancel</Button>
              {activeExam ? (
                <Button icon={<DownloadOutlined />} onClick={() => void downloadExamMarks(activeExam)}>
                  Download Marks
                </Button>
              ) : null}
              <Button type="primary" htmlType="submit" loading={saving} icon={activeExam ? <EditOutlined /> : <PlusOutlined />}>
                {activeExam ? "Save Changes" : "Create Exam"}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
}