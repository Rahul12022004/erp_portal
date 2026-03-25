import { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { type EventClickArg, type EventContentArg, type EventInput } from "@fullcalendar/core";
import {
  Alert,
  Badge,
  Button,
  Card,
  Empty,
  Input,
  Modal,
  Space,
  Tag,
  Tooltip,
  Typography,
  Upload,
  message,
} from "antd";
import {
  CalendarOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  CommentOutlined,
  FileTextOutlined,
  UploadOutlined,
} from "@ant-design/icons";

const { Paragraph, Text, Title } = Typography;
const { TextArea } = Input;

type TeacherUpload = {
  _id: string;
  teacherId?: string | { _id: string; name?: string };
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
  subject: string;
  examDate: string;
  startTime: string;
  endTime: string;
  instructions?: string;
  uploadStatus?: "uploaded" | "pending";
  teacherUpload?: TeacherUpload | null;
};

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

const toEventDateTime = (examDate: string, time: string) => `${examDate}T${time}:00`;

const toLocalDate = () => {
  const value = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
};

const normalizeTime = (time?: string, fallback = "09:00") => {
  const source = String(time || fallback).trim();
  const match = source.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return fallback;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return fallback;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return fallback;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const normalizeDate = (value?: string) => {
  const date = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  return toLocalDate();
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) || "");
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

export default function ExamsModule() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploadingExamId, setUploadingExamId] = useState("");
  const [error, setError] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const school = JSON.parse(localStorage.getItem("school") || "null");
    const teacher = JSON.parse(localStorage.getItem("teacher") || "null");

    setSchoolId(school?._id || "");
    setTeacherId(teacher?._id || "");
  }, []);

  useEffect(() => {
    const fetchExams = async () => {
      if (!schoolId || !teacherId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const res = await fetch(`http://localhost:5000/api/exams/teacher/${schoolId}/${teacherId}`);
        if (!res.ok) {
          throw new Error(`Failed to load exams (${res.status})`);
        }

        const data = await res.json();
        const nextExams = Array.isArray(data) ? data : [];
        setExams(nextExams);
        setComments((current) => {
          const next = { ...current };
          nextExams.forEach((exam: Exam) => {
            if (next[exam._id] === undefined) {
              next[exam._id] = exam.teacherUpload?.comment || "";
            }
          });
          return next;
        });
      } catch (err) {
        console.error("Teacher exams fetch error:", err);
        setExams([]);
        setError(err instanceof Error ? err.message : "Failed to load exams");
      } finally {
        setLoading(false);
      }
    };

    void fetchExams();
  }, [schoolId, teacherId]);

  const calendarEvents = useMemo<EventInput[]>(
    () =>
      exams.map((exam) => {
        const safeExamDate = normalizeDate(exam.examDate);
        const safeStartTime = normalizeTime(exam.startTime, "09:00");
        let safeEndTime = normalizeTime(exam.endTime, "10:00");

        if (safeEndTime <= safeStartTime) {
          const [hours, minutes] = safeStartTime.split(":").map(Number);
          const nextHour = Math.min((hours || 0) + 1, 23);
          safeEndTime = `${String(nextHour).padStart(2, "0")}:${String(minutes || 0).padStart(2, "0")}`;
        }

        const color = examTypeColors[exam.examType] || defaultExamColor;
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
            uploadStatus: exam.uploadStatus || "pending",
          },
        };
      }),
    [exams]
  );

  const openExamModal = (exam: Exam) => {
    setActiveExam(exam);
    setComments((current) => ({
      ...current,
      [exam._id]: current[exam._id] ?? exam.teacherUpload?.comment ?? "",
    }));
    setModalOpen(true);
  };

  const handleEventClick = (arg: EventClickArg) => {
    const exam = arg.event.extendedProps.exam as Exam;
    openExamModal(exam);
  };

  const handleUpload = async () => {
    if (!activeExam) return;

    const examId = activeExam._id;
    const file = selectedFiles[examId];
    if (!file) {
      void message.error("Please select a paper before uploading.");
      return;
    }

    try {
      setUploadingExamId(examId);
      const documentData = await readFileAsDataUrl(file);

      const res = await fetch(`http://localhost:5000/api/exams/${examId}/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId,
          schoolId,
          documentName: file.name,
          documentData,
          comment: comments[examId] || "",
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Failed to upload exam paper");
      }

      const updatedExam = data.data as Exam & { uploads?: TeacherUpload[] };
      const teacherUpload = Array.isArray(updatedExam.uploads)
        ? updatedExam.uploads.find((upload) => {
            const uploadTeacherId =
              upload.teacherId && typeof upload.teacherId === "object"
                ? String(upload.teacherId._id)
                : String(upload.teacherId || "");
            return uploadTeacherId === teacherId;
          }) || null
        : null;

      const nextExam = {
        ...activeExam,
        teacherUpload,
        uploadStatus: teacherUpload?.documentData ? "uploaded" : "pending",
      } as Exam;

      setExams((current) =>
        current.map((exam) => (exam._id === examId ? nextExam : exam))
      );
      setActiveExam(nextExam);
      setSelectedFiles((current) => ({ ...current, [examId]: null }));
      void message.success("Paper uploaded successfully.");
    } catch (err) {
      console.error("Teacher upload error:", err);
      void message.error(err instanceof Error ? err.message : "Failed to upload paper");
    } finally {
      setUploadingExamId("");
    }
  };

  const renderEventContent = (arg: EventContentArg) => {
    const exam = arg.event.extendedProps.exam as Exam;
    const uploaded = arg.event.extendedProps.uploadStatus === "uploaded";

    return (
      <Tooltip
        title={
          <div className="space-y-1">
            <div>{exam.title}</div>
            <div>{exam.subject}</div>
            <div>{exam.className}</div>
            <div>{`${exam.startTime} - ${exam.endTime}`}</div>
            <div>{uploaded ? "Paper uploaded" : "Paper pending"}</div>
          </div>
        }
      >
        <div className="px-1 py-0.5 overflow-hidden">
          <div className="flex items-center justify-between gap-1">
            <span className="truncate text-[11px] font-semibold">{arg.timeText}</span>
            {uploaded ? (
              <CheckCircleFilled style={{ color: "#16a34a", fontSize: 12 }} />
            ) : (
              <Badge color="#f59e0b" />
            )}
          </div>
          <div className="truncate text-[12px] font-semibold">{exam.title}</div>
          <div className="truncate text-[11px] opacity-80">{exam.subject}</div>
        </div>
      </Tooltip>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <Space direction="vertical" size={4}>
          <Title level={4} style={{ margin: 0 }}>
            Exams Calendar
          </Title>
          <Text type="secondary">
            View your exam timetable in a calendar and upload question papers directly from each exam event.
          </Text>
        </Space>
      </Card>

      {error ? <Alert type="error" message={error} showIcon /> : null}

      {loading ? (
        <Card loading />
      ) : exams.length === 0 ? (
        <Card>
          <Empty description="No exams are available for your assigned classes yet." />
        </Card>
      ) : (
        <Card bodyStyle={{ padding: 16 }}>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            height="auto"
            events={calendarEvents}
            eventClick={handleEventClick}
            eventContent={renderEventContent}
            allDaySlot={false}
            slotMinTime="06:00:00"
            slotMaxTime="21:00:00"
            nowIndicator
          />
        </Card>
      )}

      <Modal
        title={activeExam ? `${activeExam.title} - Upload Paper` : "Upload Paper"}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setActiveExam(null);
        }}
        footer={null}
        destroyOnClose
      >
        {activeExam ? (
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Space wrap>
              <Tag>{activeExam.className}</Tag>
              <Tag color="blue">{activeExam.examType}</Tag>
              <Tag color="purple">{activeExam.subject}</Tag>
              <Tag icon={<CalendarOutlined />}>{activeExam.examDate}</Tag>
              <Tag icon={<ClockCircleOutlined />}>{`${activeExam.startTime} - ${activeExam.endTime}`}</Tag>
              <Tag color={activeExam.uploadStatus === "uploaded" ? "green" : "orange"}>
                {activeExam.uploadStatus === "uploaded" ? "Paper Uploaded" : "Paper Pending"}
              </Tag>
            </Space>

            <div>
              <Text strong>Instructions</Text>
              <Paragraph type="secondary" style={{ marginBottom: 0, marginTop: 8 }}>
                {activeExam.instructions || "No additional instructions."}
              </Paragraph>
            </div>

            <div>
              <Text strong>Current Upload</Text>
              <div style={{ marginTop: 8 }}>
                {activeExam.teacherUpload?.documentData ? (
                  <Space direction="vertical" size={4}>
                    <Button
                      type="link"
                      icon={<FileTextOutlined />}
                      href={activeExam.teacherUpload.documentData}
                      target="_blank"
                      style={{ paddingInline: 0 }}
                    >
                      {activeExam.teacherUpload.documentName || "View Uploaded Paper"}
                    </Button>
                    {activeExam.teacherUpload.comment ? (
                      <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                        {activeExam.teacherUpload.comment}
                      </Paragraph>
                    ) : null}
                  </Space>
                ) : (
                  <Text type="secondary">No paper uploaded yet.</Text>
                )}
              </div>
            </div>

            <Upload
              beforeUpload={(file) => {
                setSelectedFiles((current) => ({ ...current, [activeExam._id]: file }));
                return false;
              }}
              maxCount={1}
              onRemove={() => {
                setSelectedFiles((current) => ({ ...current, [activeExam._id]: null }));
              }}
              fileList={selectedFiles[activeExam._id] ? [selectedFiles[activeExam._id] as never] : []}
            >
              <Button icon={<UploadOutlined />}>Choose Paper</Button>
            </Upload>

            <div>
              <Text strong>
                <CommentOutlined /> Comment
              </Text>
              <TextArea
                rows={4}
                placeholder="Add note for the school admin about this uploaded paper"
                value={comments[activeExam._id] || ""}
                onChange={(event) =>
                  setComments((current) => ({
                    ...current,
                    [activeExam._id]: event.target.value,
                  }))
                }
                style={{ marginTop: 8 }}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button
                onClick={() => {
                  setModalOpen(false);
                  setActiveExam(null);
                }}
              >
                Close
              </Button>
              <Button
                type="primary"
                icon={<UploadOutlined />}
                loading={uploadingExamId === activeExam._id}
                onClick={() => void handleUpload()}
              >
                {activeExam.teacherUpload ? "Update Paper" : "Upload Paper"}
              </Button>
            </div>
          </Space>
        ) : null}
      </Modal>
    </div>
  );
}