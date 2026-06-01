package handlers

import (
	"context"
	"encoding/json"
	"math"
	"time"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/erp-portal/go-backend/internal/modules/academics/domain"
	"github.com/erp-portal/go-backend/internal/modules/academics/repositories"
	"github.com/erp-portal/go-backend/pkg/response"
)

type Handler struct {
	classes     *repositories.ClassRepo
	attendance  *repositories.AttendanceRepo
	exams       *repositories.ExamRepo
	marks       *repositories.MarkRepo
	subjects    *repositories.SubjectRepo
	assignments *repositories.AssignmentRepo
	submissions *repositories.SubmissionRepo
	materials   *repositories.MaterialRepo
	studentsCol *mongo.Collection
	staffCol    *mongo.Collection
	schoolsCol  *mongo.Collection
}

func New(c *repositories.ClassRepo, a *repositories.AttendanceRepo,
	e *repositories.ExamRepo, m *repositories.MarkRepo,
	sub *repositories.SubjectRepo, asgn *repositories.AssignmentRepo,
	subm *repositories.SubmissionRepo, mat *repositories.MaterialRepo,
	studentsCol, staffCol, schoolsCol *mongo.Collection) *Handler {
	return &Handler{
		classes: c, attendance: a, exams: e, marks: m,
		subjects: sub, assignments: asgn, submissions: subm, materials: mat,
		studentsCol: studentsCol, staffCol: staffCol, schoolsCol: schoolsCol,
	}
}

func ctx10s() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 10*time.Second)
}

func bsonInt(d bson.M, key string) int {
	switch v := d[key].(type) {
	case int32:
		return int(v)
	case int64:
		return int(v)
	case float64:
		return int(v)
	}
	return 0
}

// ─── Classes ─────────────────────────────────────────────────────────────────

// GET /api/classes?schoolId=
func (h *Handler) ListClasses(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	list, err := h.classes.FindBySchool(ctx, c.Query("schoolId"))
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, list)
}

// GET /api/classes/:id — returns single class by classId, or list by schoolId if no class matched
func (h *Handler) GetClass(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	id := c.Params("id")
	cl, err := h.classes.FindByID(ctx, id)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	if cl != nil {
		return response.OK(c, cl)
	}
	// cl == nil: no document matched this ObjectID — treat param as schoolId
	list, err := h.classes.FindBySchool(ctx, id)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, list)
}

// POST /api/classes
func (h *Handler) CreateClass(c *fiber.Ctx) error {
	var req struct {
		SchoolID       string   `json:"schoolId"`
		Name           string   `json:"name"`
		Section        string   `json:"section"`
		Stream         string   `json:"stream"`
		AcademicYear   string   `json:"academicYear"`
		Description    string   `json:"description"`
		ClassCode      string   `json:"classCode"`
		MeetLink       string   `json:"meetLink"`
		ClassTeacherID string   `json:"classTeacher"`
		AssignedTeachers []string `json:"assignedTeachers"`
	}
	if err := json.Unmarshal(c.Body(), &req); err != nil {
		return response.BadRequest(c, "invalid body: "+err.Error())
	}
	if req.Name == "" {
		return response.BadRequest(c, "name required")
	}
	cl := &domain.Class{
		SchoolID:       req.SchoolID,
		Name:           req.Name,
		Section:        req.Section,
		Stream:         req.Stream,
		AcademicYear:   req.AcademicYear,
		Description:    req.Description,
		ClassCode:      req.ClassCode,
		MeetLink:       req.MeetLink,
		ClassTeacherID: req.ClassTeacherID,
		AssignedTeachers: req.AssignedTeachers,
	}
	ctx, cancel := ctx10s()
	defer cancel()
	created, err := h.classes.Create(ctx, cl)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.Created(c, created)
}

// PUT /api/classes/:id
func (h *Handler) UpdateClass(c *fiber.Ctx) error {
	var req struct {
		Name             string   `json:"name"`
		Section          string   `json:"section"`
		Stream           string   `json:"stream"`
		AcademicYear     string   `json:"academicYear"`
		Description      string   `json:"description"`
		ClassCode        string   `json:"classCode"`
		MeetLink         string   `json:"meetLink"`
		ClassTeacherID   string   `json:"classTeacher"`
		AssignedTeachers []string `json:"assignedTeachers"`
	}
	if err := json.Unmarshal(c.Body(), &req); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	updates := map[string]interface{}{
		"name": req.Name, "section": req.Section, "stream": req.Stream,
		"academicYear": req.AcademicYear, "description": req.Description,
		"classCode": req.ClassCode, "meetLink": req.MeetLink,
		"classTeacher": req.ClassTeacherID, "assignedTeachers": req.AssignedTeachers,
	}
	ctx, cancel := ctx10s()
	defer cancel()
	cl, err := h.classes.Update(ctx, c.Params("id"), updates)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, cl)
}

// DELETE /api/classes/:id
func (h *Handler) DeleteClass(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	if err := h.classes.Delete(ctx, c.Params("id")); err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.NoContent(c)
}

// ─── Attendance ───────────────────────────────────────────────────────────────

// GET /api/attendance?schoolId=&classId=&date=
func (h *Handler) GetAttendance(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	list, err := h.attendance.FindByDateAndClass(ctx,
		c.Query("schoolId"), c.Query("classId"), c.Query("date"))
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, list)
}

// POST /api/attendance
func (h *Handler) MarkAttendance(c *fiber.Ctx) error {
	var req struct {
		SchoolID  string `json:"schoolId"`
		StudentID string `json:"studentId"`
		StaffID   string `json:"staffId"`
		ClassID   string `json:"classId"`
		Date      string `json:"date"`
		Status    string `json:"status"`
		Remarks   string `json:"remarks"`
	}
	if err := json.Unmarshal(c.Body(), &req); err != nil {
		return response.BadRequest(c, "invalid body: "+err.Error())
	}
	a := &domain.Attendance{
		SchoolID: req.SchoolID, StudentID: req.StudentID, StaffID: req.StaffID,
		Date: req.Date, Status: req.Status, Remarks: req.Remarks,
	}
	ctx, cancel := ctx10s()
	defer cancel()
	saved, err := h.attendance.Upsert(ctx, a)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, saved)
}

// ─── Exams ────────────────────────────────────────────────────────────────────

// GET /api/exams/school/:schoolId
func (h *Handler) ListExams(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	list, err := h.exams.FindBySchool(ctx, c.Params("schoolId"))
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, list)
}

// POST /api/exams
func (h *Handler) CreateExam(c *fiber.Ctx) error {
	var req struct {
		SchoolID   string  `json:"schoolId"`
		ClassID    string  `json:"classId"`
		ClassName  string  `json:"className"`
		Title      string  `json:"title"`
		ExamType   string  `json:"examType"`
		Subject    string  `json:"subject"`
		ExamDate   string  `json:"examDate"`
		StartTime  string  `json:"startTime"`
		EndTime    string  `json:"endTime"`
		TotalMarks float64 `json:"totalMarks"`
		PassMarks  float64 `json:"passMarks"`
	}
	if err := json.Unmarshal(c.Body(), &req); err != nil {
		return response.BadRequest(c, "invalid body: "+err.Error())
	}
	e := &domain.Exam{
		SchoolID: req.SchoolID, ClassID: req.ClassID, ClassName: req.ClassName,
		Title: req.Title, ExamType: req.ExamType, Subject: req.Subject,
		ExamDate: req.ExamDate, StartTime: req.StartTime, EndTime: req.EndTime,
		TotalMarks: req.TotalMarks, PassMarks: req.PassMarks,
	}
	ctx, cancel := ctx10s()
	defer cancel()
	created, err := h.exams.Create(ctx, e)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.Created(c, created)
}

// PUT /api/exams/:id
func (h *Handler) UpdateExam(c *fiber.Ctx) error {
	var req struct {
		Name        string `json:"name"`
		Subject     string `json:"subject"`
		ExamDate    string `json:"examDate"`
		StartTime   string `json:"startTime"`
		EndTime     string `json:"endTime"`
		MaxMarks    int    `json:"maxMarks"`
		PassMarks   int    `json:"passMarks"`
		Description string `json:"description"`
		Status      string `json:"status"`
	}
	if err := json.Unmarshal(c.Body(), &req); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	updates := map[string]interface{}{
		"name": req.Name, "subject": req.Subject, "examDate": req.ExamDate,
		"startTime": req.StartTime, "endTime": req.EndTime,
		"maxMarks": req.MaxMarks, "passMarks": req.PassMarks,
		"description": req.Description, "status": req.Status,
	}
	ctx, cancel := ctx10s()
	defer cancel()
	e, err := h.exams.Update(ctx, c.Params("id"), updates)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, e)
}

// DELETE /api/exams/:id
func (h *Handler) DeleteExam(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	if err := h.exams.Delete(ctx, c.Params("id")); err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.NoContent(c)
}

// GET /api/exams/teacher/:schoolId/:teacherId
func (h *Handler) ListExamsByTeacher(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	list, err := h.exams.FindByTeacher(ctx, c.Params("schoolId"), c.Params("teacherId"))
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	if list == nil {
		list = []*domain.Exam{}
	}
	return response.OK(c, list)
}

// POST /api/exams/ai-create — stub
func (h *Handler) AICreateExam(c *fiber.Ctx) error {
	return response.OK(c, fiber.Map{"message": "AI exam generation not yet available", "questions": []interface{}{}})
}

// POST /api/exams/:id/upload
func (h *Handler) UploadExam(c *fiber.Ctx) error {
	return response.OK(c, fiber.Map{"message": "Exam file uploaded", "examId": c.Params("id")})
}

// ─── Marks ────────────────────────────────────────────────────────────────────

// GET /api/marks?examId=
func (h *Handler) ListMarks(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	list, err := h.marks.FindByExam(ctx, c.Query("examId"))
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, list)
}

// GET /api/marks/:schoolId/:teacherId/:examId — exam details + student mark rows
func (h *Handler) GetMarksForExam(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()

	examID := c.Params("examId")
	exam, err := h.exams.FindByID(ctx, examID)
	if err != nil || exam == nil {
		return response.NotFound(c, "exam not found")
	}

	// Load students for the exam's class
	var studentDocs []bson.M
	if exam.ClassID != "" {
		cid, _ := primitive.ObjectIDFromHex(exam.ClassID)
		cur, _ := h.studentsCol.Find(ctx, bson.M{"classId": cid})
		if cur != nil {
			defer cur.Close(ctx)
			_ = cur.All(ctx, &studentDocs)
		}
	}

	// Load existing marks
	marks, _ := h.marks.FindByExam(ctx, examID)
	markByStudent := map[string]*domain.Mark{}
	for _, m := range marks {
		markByStudent[m.StudentID] = m
	}

	type studentMark struct {
		MarkID        string      `json:"markId"`
		StudentID     string      `json:"studentId"`
		Name          string      `json:"name"`
		RollNumber    string      `json:"rollNumber"`
		Email         string      `json:"email"`
		ObtainedMarks interface{} `json:"obtainedMarks"`
		MaxMarks      float64     `json:"maxMarks"`
		Remarks       string      `json:"remarks"`
	}

	rows := make([]studentMark, 0, len(studentDocs))
	for _, sd := range studentDocs {
		sid := ""
		if oid, ok := sd["_id"].(primitive.ObjectID); ok {
			sid = oid.Hex()
		}
		bstrVal := func(m bson.M, k string) string { v, _ := m[k].(string); return v }
		sm := studentMark{
			StudentID:  sid,
			Name:       bstrVal(sd, "name"),
			RollNumber: bstrVal(sd, "rollNumber"),
			Email:      bstrVal(sd, "email"),
			MaxMarks:   exam.TotalMarks,
		}
		if m, ok := markByStudent[sid]; ok {
			sm.MarkID = m.ID
			sm.ObtainedMarks = m.MarksObt
			sm.Remarks = m.Remarks
			sm.MaxMarks = m.TotalMarks
		}
		rows = append(rows, sm)
	}

	return response.OK(c, fiber.Map{"exam": exam, "students": rows})
}

// POST /api/marks
func (h *Handler) SaveMark(c *fiber.Ctx) error {
	var req struct {
		SchoolID   string  `json:"schoolId"`
		ExamID     string  `json:"examId"`
		StudentID  string  `json:"studentId"`
		ClassID    string  `json:"classId"`
		Subject    string  `json:"subject"`
		MarksObt   float64 `json:"marksObt"`
		TotalMarks float64 `json:"totalMarks"`
		Grade      string  `json:"grade"`
		Remarks    string  `json:"remarks"`
	}
	if err := json.Unmarshal(c.Body(), &req); err != nil {
		return response.BadRequest(c, "invalid body: "+err.Error())
	}
	m := &domain.Mark{
		SchoolID: req.SchoolID, ExamID: req.ExamID, StudentID: req.StudentID,
		ClassID: req.ClassID, Subject: req.Subject, MarksObt: req.MarksObt,
		TotalMarks: req.TotalMarks, Grade: req.Grade, Remarks: req.Remarks,
	}
	ctx, cancel := ctx10s()
	defer cancel()
	saved, err := h.marks.Upsert(ctx, m)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, saved)
}

// ─── Attendance — extended endpoints ─────────────────────────────────────────

// GET /api/attendance/:schoolId/:date?position=Teacher
func (h *Handler) GetTeacherDailyAttendance(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()

	schoolID := c.Params("schoolId")
	date := c.Params("date")

	records, err := h.attendance.FindBySchoolAndDate(ctx, schoolID, date)
	if err != nil {
		return response.InternalError(c, err.Error())
	}

	// Build staffId → record map
	attByStaff := map[string]*domain.Attendance{}
	for _, r := range records {
		if r.StaffID != "" {
			attByStaff[r.StaffID] = r
		}
	}

	// Fetch all staff for school (projection: only fields we use)
	sid, _ := primitive.ObjectIDFromHex(schoolID)
	staffCur, err := h.staffCol.Find(ctx, bson.M{"schoolId": sid},
		options.Find().SetProjection(bson.M{"name": 1, "position": 1}).SetLimit(500))
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	defer staffCur.Close(ctx)

	position := c.Query("position")

	type Item struct {
		AttendanceID string  `json:"attendanceId"`
		StaffID      string  `json:"staffId"`
		Name         string  `json:"name"`
		Position     string  `json:"position"`
		Status       *string `json:"status"`
		Remarks      string  `json:"remarks"`
	}
	var items []Item
	for staffCur.Next(ctx) {
		var s bson.M
		if staffCur.Decode(&s) != nil {
			continue
		}
		pos, _ := s["position"].(string)
		if position != "" && pos != position {
			continue
		}
		var staffIDHex string
		if oid, ok := s["_id"].(primitive.ObjectID); ok {
			staffIDHex = oid.Hex()
		}
		name, _ := s["name"].(string)
		att := attByStaff[staffIDHex]
		item := Item{StaffID: staffIDHex, Name: name, Position: pos}
		if att != nil {
			item.AttendanceID = att.ID
			item.Status = &att.Status
			item.Remarks = att.Remarks
		}
		items = append(items, item)
	}
	if items == nil {
		items = []Item{}
	}
	return response.OK(c, items)
}

// GET /api/attendance/report/:schoolId?startDate=&endDate=&position=Teacher
func (h *Handler) GetAttendanceReport(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()

	records, err := h.attendance.FindByDateRange(ctx,
		c.Params("schoolId"), c.Query("startDate"), c.Query("endDate"))
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	if records == nil {
		records = []*domain.Attendance{}
	}
	return response.OK(c, records)
}

// GET /api/attendance/students/:schoolId/:class/:date
func (h *Handler) GetStudentAttendanceByClass(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()

	schoolID := c.Params("schoolId")
	className := c.Params("class")
	date := c.Params("date")

	sid, _ := primitive.ObjectIDFromHex(schoolID)

	// Find all students in this class/school
	studentCur, err := h.studentsCol.Find(ctx, bson.M{
		"schoolId": sid,
		"class":    className,
	})
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	defer studentCur.Close(ctx)

	type StudentRow struct {
		StudentID  string  `json:"studentId"`
		Name       string  `json:"name"`
		Email      string  `json:"email"`
		RollNumber string  `json:"rollNumber"`
		Class      string  `json:"class"`
		Status     *string `json:"status"`
		Remarks    string  `json:"remarks"`
		AttID      string  `json:"attendanceId"`
	}

	var students []StudentRow
	var studentIDs []primitive.ObjectID
	for studentCur.Next(ctx) {
		var s bson.M
		if studentCur.Decode(&s) != nil {
			continue
		}
		var sid2 string
		if oid, ok := s["_id"].(primitive.ObjectID); ok {
			sid2 = oid.Hex()
			studentIDs = append(studentIDs, oid)
		}
		name, _ := s["name"].(string)
		email, _ := s["email"].(string)
		roll, _ := s["rollNumber"].(string)
		cls, _ := s["class"].(string)
		students = append(students, StudentRow{
			StudentID: sid2, Name: name, Email: email, RollNumber: roll, Class: cls,
		})
	}

	// Load attendance for these students on this date
	attRecords, err := h.attendance.FindByStudentIDsAndDate(ctx, studentIDs, date)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	attByStudent := map[string]*domain.Attendance{}
	for _, r := range attRecords {
		if r.StudentID != "" {
			attByStudent[r.StudentID] = r
		}
	}

	for i, s := range students {
		if att, ok := attByStudent[s.StudentID]; ok {
			students[i].Status = &att.Status
			students[i].Remarks = att.Remarks
			students[i].AttID = att.ID
		}
	}
	if students == nil {
		students = []StudentRow{}
	}
	return response.OK(c, students)
}

// GET /api/attendance/self/:schoolId/:teacherId/:date
func (h *Handler) GetSelfAttendance(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()

	att, err := h.attendance.FindSelf(ctx, c.Params("schoolId"), c.Params("teacherId"), c.Params("date"))
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	if att == nil {
		return response.OK(c, nil)
	}
	return response.OK(c, fiber.Map{
		"_id":                      att.ID,
		"status":                   att.Status,
		"selfMarked":               att.SelfMarked,
		"selfLocked":               att.SelfLocked,
		"isOutsideSchool":          att.IsOutsideSchool,
		"distanceFromSchoolMeters": att.DistanceFromSchoolMeters,
	})
}

// POST /api/attendance/students
func (h *Handler) MarkStudentAttendance(c *fiber.Ctx) error {
	var req struct {
		SchoolID  string `json:"schoolId"`
		StudentID string `json:"studentId"`
		ClassID   string `json:"classId"`
		Date      string `json:"date"`
		Status    string `json:"status"`
		Remarks   string `json:"remarks"`
	}
	if err := json.Unmarshal(c.Body(), &req); err != nil {
		return response.BadRequest(c, "invalid body: "+err.Error())
	}
	a := &domain.Attendance{
		SchoolID: req.SchoolID, StudentID: req.StudentID,
		Date: req.Date, Status: req.Status, Remarks: req.Remarks,
	}
	ctx, cancel := ctx10s()
	defer cancel()
	saved, err := h.attendance.Upsert(ctx, a)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, saved)
}

// POST /api/attendance/self — mark self attendance with geolocation
func (h *Handler) MarkSelfAttendance(c *fiber.Ctx) error {
	var body struct {
		TeacherID string `json:"teacherId"`
		SchoolID  string `json:"schoolId"`
		Date      string `json:"date"`
		Status    string `json:"status"`
		Location  *struct {
			Latitude  float64 `json:"latitude"`
			Longitude float64 `json:"longitude"`
			Accuracy  float64 `json:"accuracy"`
		} `json:"location"`
	}
	if err := json.Unmarshal(c.Body(), &body); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	if body.TeacherID == "" || body.SchoolID == "" || body.Date == "" || body.Status == "" {
		return response.BadRequest(c, "teacherId, schoolId, date and status required")
	}

	a := &domain.Attendance{
		SchoolID: body.SchoolID,
		StaffID:  body.TeacherID,
		Date:     body.Date,
		Status:   body.Status,
	}

	ctx, cancel := ctx10s()
	defer cancel()

	// Geofence check
	if body.Location != nil && h.schoolsCol != nil {
		sid, _ := primitive.ObjectIDFromHex(body.SchoolID)
		var schoolDoc bson.M
		if err := h.schoolsCol.FindOne(ctx, bson.M{"_id": sid}).Decode(&schoolDoc); err == nil {
			if info, ok := schoolDoc["schoolInfo"].(bson.M); ok {
				if loc, ok := info["location"].(bson.M); ok {
					sLat, _ := loc["latitude"].(float64)
					sLng, _ := loc["longitude"].(float64)
					radius, _ := loc["radiusMeters"].(float64)
					if radius == 0 {
						radius = 200
					}
					dist := haversineMeters(body.Location.Latitude, body.Location.Longitude, sLat, sLng)
					a.DistanceFromSchoolMeters = dist
					a.IsOutsideSchool = dist > radius
				}
			}
		}
	}

	saved, err := h.attendance.UpsertSelf(ctx, a)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, fiber.Map{
		"_id":                      saved.ID,
		"status":                   saved.Status,
		"selfMarked":               true,
		"selfLocked":               saved.SelfLocked,
		"isOutsideSchool":          saved.IsOutsideSchool,
		"distanceFromSchoolMeters": saved.DistanceFromSchoolMeters,
	})
}

// POST /api/attendance/self/lock
func (h *Handler) LockSelfAttendance(c *fiber.Ctx) error {
	var body struct {
		TeacherID string `json:"teacherId"`
		SchoolID  string `json:"schoolId"`
		Date      string `json:"date"`
	}
	if err := json.Unmarshal(c.Body(), &body); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	ctx, cancel := ctx10s()
	defer cancel()
	saved, err := h.attendance.LockSelf(ctx, body.SchoolID, body.TeacherID, body.Date)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	if saved == nil {
		return response.NotFound(c, "attendance record not found")
	}
	return response.OK(c, fiber.Map{
		"_id":        saved.ID,
		"selfLocked": saved.SelfLocked,
	})
}

// ─── Subjects ─────────────────────────────────────────────────────────────────

// GET /api/subjects?schoolId=&classId=
func (h *Handler) ListSubjects(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	list, err := h.subjects.FindBySchoolAndClass(ctx, c.Query("schoolId"), c.Query("classId"))
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	if list == nil {
		list = []*domain.Subject{}
	}
	return response.OK(c, list)
}

// POST /api/subjects
func (h *Handler) CreateSubject(c *fiber.Ctx) error {
	var req struct {
		SchoolID    string `json:"schoolId"`
		ClassID     string `json:"classId"`
		Name        string `json:"name"`
		Code        string `json:"code"`
		Description string `json:"description"`
		TeacherID   string `json:"teacherId"`
	}
	if err := json.Unmarshal(c.Body(), &req); err != nil {
		return response.BadRequest(c, "invalid body: "+err.Error())
	}
	if req.Name == "" {
		return response.BadRequest(c, "name required")
	}
	s := &domain.Subject{
		SchoolID:    req.SchoolID,
		ClassID:     req.ClassID,
		Name:        req.Name,
		Code:        req.Code,
		Description: req.Description,
		TeacherID:   req.TeacherID,
	}
	ctx, cancel := ctx10s()
	defer cancel()
	created, err := h.subjects.Create(ctx, s)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.Created(c, created)
}

// DELETE /api/subjects/:id
func (h *Handler) DeleteSubject(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	if err := h.subjects.Delete(ctx, c.Params("id")); err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.NoContent(c)
}

// ─── Assignments ──────────────────────────────────────────────────────────────

// GET /api/assignments?schoolId=&classId=&teacherId=
func (h *Handler) ListAssignments(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	list, err := h.assignments.Find(ctx, c.Query("schoolId"), c.Query("classId"), c.Query("teacherId"))
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	if list == nil {
		list = []*domain.Assignment{}
	}

	// Batch-count submissions per assignment
	if len(list) > 0 {
		ids := make([]primitive.ObjectID, 0, len(list))
		for _, a := range list {
			if oid, e := primitive.ObjectIDFromHex(a.ID); e == nil {
				ids = append(ids, oid)
			}
		}
		pipeline := mongo.Pipeline{
			{{Key: "$match", Value: bson.M{"assignmentId": bson.M{"$in": ids}}}},
			{{Key: "$group", Value: bson.M{
				"_id":    "$assignmentId",
				"total":  bson.M{"$sum": 1},
				"graded": bson.M{"$sum": bson.M{"$cond": []interface{}{bson.M{"$eq": []interface{}{"$status", "GRADED"}}, 1, 0}}},
			}}},
		}
		if cntCur, cntErr := h.submissions.Col().Aggregate(ctx, pipeline); cntErr == nil {
			defer cntCur.Close(ctx)
			totals, gradeds := map[string]int{}, map[string]int{}
			for cntCur.Next(ctx) {
				var row bson.M
				if cntCur.Decode(&row) == nil {
					if id, ok := row["_id"].(primitive.ObjectID); ok {
						totals[id.Hex()] = bsonInt(row, "total")
						gradeds[id.Hex()] = bsonInt(row, "graded")
					}
				}
			}
			for _, a := range list {
				a.SubmissionsTotal = totals[a.ID]
				a.SubmissionsGraded = gradeds[a.ID]
			}
		}
	}

	return response.OK(c, list)
}

// POST /api/assignments
func (h *Handler) CreateAssignment(c *fiber.Ctx) error {
	var req struct {
		SchoolID     string  `json:"schoolId"`
		ClassID      string  `json:"classId"`
		ClassName    string  `json:"className"`
		TeacherID    string  `json:"teacherId"`
		Title        string  `json:"title"`
		Instructions string  `json:"instructions"`
		Subject      string  `json:"subject"`
		DueDate      string  `json:"dueDate"`
		TotalPoints  float64 `json:"totalPoints"`
		Status       string  `json:"status"`
	}
	if err := json.Unmarshal(c.Body(), &req); err != nil {
		return response.BadRequest(c, "invalid body: "+err.Error())
	}
	if req.Title == "" {
		return response.BadRequest(c, "title required")
	}
	a := &domain.Assignment{
		SchoolID:     req.SchoolID,
		ClassID:      req.ClassID,
		ClassName:    req.ClassName,
		TeacherID:    req.TeacherID,
		Title:        req.Title,
		Instructions: req.Instructions,
		Subject:      req.Subject,
		DueDate:      req.DueDate,
		TotalPoints:  req.TotalPoints,
		Status:       req.Status,
	}
	ctx, cancel := ctx10s()
	defer cancel()
	created, err := h.assignments.Create(ctx, a)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.Created(c, created)
}

// DELETE /api/assignments/:id
func (h *Handler) DeleteAssignment(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	if err := h.assignments.Delete(ctx, c.Params("id")); err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.NoContent(c)
}

// GET /api/assignments/:id/submissions
func (h *Handler) ListSubmissions(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	list, err := h.submissions.FindByAssignment(ctx, c.Params("id"))
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	if list == nil {
		list = []*domain.AssignmentSubmission{}
	}

	// Populate studentId as an object by looking up each student
	type studentInfo struct {
		ID         string `json:"_id"`
		Name       string `json:"name"`
		RollNumber string `json:"rollNumber"`
	}
	type populatedSub struct {
		ID           string      `json:"_id"`
		AssignmentID string      `json:"assignmentId"`
		StudentID    studentInfo `json:"studentId"`
		Content      string      `json:"content"`
		Status       string      `json:"status"`
		GradePoints  *float64    `json:"gradePoints"`
		GradeComment string      `json:"gradeComment"`
		SubmittedAt  interface{} `json:"submittedAt"`
		CreatedAt    interface{} `json:"createdAt"`
	}

	// Batch-fetch all student docs in one query to avoid N+1 round-trips
	studentDocs := map[string]bson.M{}
	if h.studentsCol != nil {
		var ids []primitive.ObjectID
		for _, sub := range list {
			if sub.StudentID != "" {
				if oid, e := primitive.ObjectIDFromHex(sub.StudentID); e == nil {
					ids = append(ids, oid)
				}
			}
		}
		if len(ids) > 0 {
			sCur, e := h.studentsCol.Find(ctx, bson.M{"_id": bson.M{"$in": ids}},
				options.Find().SetProjection(bson.M{"name": 1, "rollNumber": 1}))
			if e == nil {
				defer sCur.Close(ctx)
				for sCur.Next(ctx) {
					var s bson.M
					if sCur.Decode(&s) == nil {
						if oid, ok := s["_id"].(primitive.ObjectID); ok {
							studentDocs[oid.Hex()] = s
						}
					}
				}
			}
		}
	}

	populated := make([]populatedSub, 0, len(list))
	for _, sub := range list {
		ps := populatedSub{
			ID:           sub.ID,
			AssignmentID: sub.AssignmentID,
			StudentID:    studentInfo{ID: sub.StudentID, Name: sub.StudentName},
			Content:      sub.Content,
			Status:       sub.Status,
			GradePoints:  sub.GradePoints,
			GradeComment: sub.GradeComment,
			SubmittedAt:  sub.SubmittedAt,
			CreatedAt:    sub.CreatedAt,
		}
		if s, ok := studentDocs[sub.StudentID]; ok {
			ps.StudentID.Name, _ = s["name"].(string)
			ps.StudentID.RollNumber, _ = s["rollNumber"].(string)
		}
		if ps.StudentID.Name == "" {
			ps.StudentID.Name = sub.StudentName
		}
		populated = append(populated, ps)
	}

	return response.OK(c, fiber.Map{
		"submissions": populated,
		"pending":     []interface{}{},
	})
}

// POST /api/assignments/:id/grade/:submissionId
func (h *Handler) GradeSubmission(c *fiber.Ctx) error {
	var body struct {
		GradePoints  float64 `json:"gradePoints"`
		GradeComment string  `json:"gradeComment"`
	}
	if err := json.Unmarshal(c.Body(), &body); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	ctx, cancel := ctx10s()
	defer cancel()
	sub, err := h.submissions.Grade(ctx, c.Params("submissionId"), body.GradePoints, body.GradeComment)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, sub)
}

// ─── Materials ────────────────────────────────────────────────────────────────

// GET /api/materials?schoolId=&classId=
func (h *Handler) ListMaterials(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	list, err := h.materials.Find(ctx, c.Query("schoolId"), c.Query("classId"))
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	if list == nil {
		list = []*domain.Material{}
	}
	return response.OK(c, list)
}

// POST /api/materials
func (h *Handler) CreateMaterial(c *fiber.Ctx) error {
	var req struct {
		SchoolID    string `json:"schoolId"`
		ClassID     string `json:"classId"`
		TeacherID   string `json:"teacherId"`
		Title       string `json:"title"`
		Description string `json:"description"`
		Type        string `json:"type"`
		URL         string `json:"url"`
		Subject     string `json:"subject"`
	}
	if err := json.Unmarshal(c.Body(), &req); err != nil {
		return response.BadRequest(c, "invalid body: "+err.Error())
	}
	if req.Title == "" {
		return response.BadRequest(c, "title required")
	}
	m := &domain.Material{
		SchoolID:    req.SchoolID,
		ClassID:     req.ClassID,
		TeacherID:   req.TeacherID,
		Title:       req.Title,
		Description: req.Description,
		Type:        req.Type,
		URL:         req.URL,
		Subject:     req.Subject,
	}
	ctx, cancel := ctx10s()
	defer cancel()
	created, err := h.materials.Create(ctx, m)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.Created(c, created)
}

// DELETE /api/materials/:id
func (h *Handler) DeleteMaterial(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	if err := h.materials.Delete(ctx, c.Params("id")); err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.NoContent(c)
}

// haversineMeters returns the great-circle distance in meters between two lat/lng points.
func haversineMeters(lat1, lng1, lat2, lng2 float64) float64 {
	const R = 6371000 // Earth radius in meters
	φ1 := lat1 * math.Pi / 180
	φ2 := lat2 * math.Pi / 180
	Δφ := (lat2 - lat1) * math.Pi / 180
	Δλ := (lng2 - lng1) * math.Pi / 180
	a := math.Sin(Δφ/2)*math.Sin(Δφ/2) +
		math.Cos(φ1)*math.Cos(φ2)*math.Sin(Δλ/2)*math.Sin(Δλ/2)
	return R * 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
}
