// Timetable Service - Backend API Integration

export interface ClassData {
  id: string;
  name: string;
  section: string;
}

export interface TeacherData {
  id: string;
  name: string;
  subject: string;
}

export interface RoomData {
  id: string;
  name: string;
  type: "classroom" | "lab" | "sports" | "auditorium";
  capacity: number;
}

export interface SubjectRequirement {
  classId: string;
  subject: string;
  teacherId: string;
  requiredPeriodsPerWeek: number;
  preferredRoomType: "classroom" | "lab" | "sports" | "auditorium";
}

export interface TeacherUnavailableSlot {
  teacherId: string;
  day: string;
  periodIndex: number;
  reason: string;
}

export interface TimetableEntry {
  id: string;
  classId: string;
  day: string;
  periodIndex: number;
  subject: string;
  teacherId: string;
  roomId: string;
  substitutionOf?: string;
  isLocked: boolean;
}

export interface TimetableResponse {
  id: string;
  schoolId: string;
  academicYear: string;
  term: string;
  status: "draft" | "published";
  entries: TimetableEntry[];
  createdAt: string;
  updatedAt: string;
}

const RAW_API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");
const API_BASE_URL = RAW_API_URL.endsWith("/api") ? RAW_API_URL : `${RAW_API_URL}/api`;

type ApiListResponse<T> = T[] | { data?: T[]; success?: boolean };

type ApiClass = {
  _id?: string;
  id?: string;
  name?: string;
  section?: string;
};

type ApiStaff = {
  _id?: string;
  id?: string;
  name?: string;
  position?: string;
  department?: string;
  subject?: string;
};

function readAuthToken(): string {
  try {
    return localStorage.getItem("authToken") || localStorage.getItem("token") || "";
  } catch {
    return "";
  }
}

function requireAuthToken(): string {
  const token = readAuthToken();
  if (!token) {
    throw new Error("Authentication required. Please login again.");
  }
  return token;
}

const authHeaders = (): HeadersInit => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${requireAuthToken()}`,
});

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    let details = "";
    try {
      details = await response.text();
    } catch {
      details = "";
    }
    throw new Error(`Request failed (${response.status}) ${url}${details ? `: ${details}` : ""}`);
  }

  return (await response.json()) as T;
}

function getSchoolId(): string {
  try {
    // Ensure protected timetable endpoints are called only with an active session token.
    requireAuthToken();

    const raw = localStorage.getItem("school");
    if (!raw) {
      throw new Error("School session not found. Please login again.");
    }

    const parsed = JSON.parse(raw) as { _id?: string; schoolId?: string };
    const schoolId = parsed?._id || parsed?.schoolId;

    if (!schoolId) {
      throw new Error("School ID not found in session.");
    }

    return schoolId;
  } catch {
    throw new Error("Invalid school session. Please login again.");
  }
}

function toArray<T>(payload: ApiListResponse<T>): T[] {
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload?.data) ? payload.data : [];
}

// Fetch all classes
export async function fetchClasses(): Promise<ClassData[]> {
  const schoolId = getSchoolId();
  const payload = await fetchJson<ApiListResponse<ApiClass>>(`${API_BASE_URL}/classes/${schoolId}`);
  const list = toArray(payload);

  return list
    .map((item) => ({
      id: item._id || item.id || "",
      name: item.name || "",
      section: item.section || "",
    }))
    .filter((item) => Boolean(item.id) && Boolean(item.name));
}

// Fetch all teachers
export async function fetchTeachers(): Promise<TeacherData[]> {
  const schoolId = getSchoolId();
  const payload = await fetchJson<ApiListResponse<ApiStaff>>(`${API_BASE_URL}/staff/${schoolId}`);
  const list = toArray(payload);

  const mapped = list
    .map((item) => ({
      id: item._id || item.id || "",
      name: item.name || "",
      subject: item.subject || item.department || item.position || "General",
      position: (item.position || "").toLowerCase(),
    }))
    .filter((item) => Boolean(item.id) && Boolean(item.name));

  const teachersOnly = mapped.filter((item) => item.position.includes("teacher"));
  const finalList = teachersOnly.length > 0 ? teachersOnly : mapped;

  return finalList.map(({ id, name, subject }) => ({ id, name, subject }));
}

// Fetch all rooms
export async function fetchRooms(): Promise<RoomData[]> {
  const classes = await fetchClasses();

  return classes.map((schoolClass) => ({
    id: `room-${schoolClass.id}`,
    name: `${schoolClass.name}${schoolClass.section ? ` ${schoolClass.section}` : ""} Room`,
    type: "classroom",
    capacity: 40,
  }));
}

// Fetch subject requirements for a specific class
export async function fetchSubjectRequirements(
  classId?: string
): Promise<SubjectRequirement[]> {
  const [classes, teachers] = await Promise.all([fetchClasses(), fetchTeachers()]);
  const targetClasses = classId ? classes.filter((item) => item.id === classId) : classes;

  if (targetClasses.length === 0 || teachers.length === 0) {
    return [];
  }

  const uniqueSubjects = Array.from(new Set(teachers.map((t) => t.subject).filter(Boolean))).slice(0, 8);

  return targetClasses.flatMap((cls) =>
    uniqueSubjects.map((subject, index) => {
      const teacher = teachers.find((t) => t.subject === subject) || teachers[index % teachers.length];
      const lowered = subject.toLowerCase();
      const preferredRoomType: SubjectRequirement["preferredRoomType"] =
        lowered.includes("lab") ? "lab" : lowered.includes("sport") || lowered.includes("physical") ? "sports" : "classroom";

      return {
        classId: cls.id,
        subject,
        teacherId: teacher.id,
        requiredPeriodsPerWeek: 4,
        preferredRoomType,
      };
    })
  );
}

// Fetch teacher unavailable slots
export async function fetchTeacherUnavailableSlots(
  teacherId?: string
): Promise<TeacherUnavailableSlot[]> {
  const schoolId = getSchoolId();
  const leaves = await fetchJson<unknown>(`${API_BASE_URL}/leaves/school/${schoolId}`);

  if (!Array.isArray(leaves)) {
    return [];
  }

  // Leave records in current backend schema do not carry period slots yet.
  // Returning empty slots keeps scheduler deterministic until slot-level leave data is available.
  return teacherId ? [] : [];
}

// Fetch existing timetable
export async function fetchTimetable(
  academicYear: string,
  term: string
): Promise<TimetableResponse | null> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/timetables?academicYear=${academicYear}&term=${term}`,
      {
        headers: authHeaders(),
      }
    );
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Error fetching timetable:", error);
    return null;
  }
}

// Save timetable entries
export async function saveTimetableEntries(
  academicYear: string,
  term: string,
  entries: TimetableEntry[]
): Promise<TimetableResponse | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/timetables`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        academicYear,
        term,
        status: "draft",
        entries,
      }),
    });
    if (!response.ok) throw new Error("Failed to save timetable");
    return await response.json();
  } catch (error) {
    console.error("Error saving timetable:", error);
    return null;
  }
}

// Publish timetable
export async function publishTimetable(
  timetableId: string
): Promise<TimetableResponse | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/timetables/${timetableId}/publish`, {
      method: "PATCH",
      headers: authHeaders(),
    });
    if (!response.ok) throw new Error("Failed to publish timetable");
    return await response.json();
  } catch (error) {
    console.error("Error publishing timetable:", error);
    return null;
  }
}

// Delete timetable entry
export async function deleteTimetableEntry(entryId: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/timetable-entries/${entryId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    return response.ok;
  } catch (error) {
    console.error("Error deleting timetable entry:", error);
    return false;
  }
}

// Update timetable entry
export async function updateTimetableEntry(
  entryId: string,
  updates: Partial<TimetableEntry>
): Promise<TimetableEntry | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/timetable-entries/${entryId}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error("Failed to update timetable entry");
    return await response.json();
  } catch (error) {
    console.error("Error updating timetable entry:", error);
    return null;
  }
}
