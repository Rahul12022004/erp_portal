package routes

import (
	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/core/db"
	"github.com/erp-portal/go-backend/internal/core/middleware"
	"github.com/erp-portal/go-backend/internal/modules/academics/handlers"
	"github.com/erp-portal/go-backend/internal/modules/academics/repositories"
)

func Register(app *fiber.App) {
	classRepo   := repositories.NewClassRepo(db.Col("classes"))
	attendRepo  := repositories.NewAttendanceRepo(db.Col("attendances"))
	examRepo    := repositories.NewExamRepo(db.Col("exams"))
	markRepo    := repositories.NewMarkRepo(db.Col("marks"))
	subjectRepo := repositories.NewSubjectRepo(db.Col("subjects"))
	asgnRepo    := repositories.NewAssignmentRepo(db.Col("assignments"))
	submRepo    := repositories.NewSubmissionRepo(db.Col("assignment_submissions"))
	matRepo     := repositories.NewMaterialRepo(db.Col("materials"))

	h    := handlers.New(classRepo, attendRepo, examRepo, markRepo,
		subjectRepo, asgnRepo, submRepo, matRepo,
		db.Col("students"), db.Col("staff"), db.Col("schools"))
	auth := middleware.Authenticate

	// Classes
	app.Get("/api/classes",        auth, h.ListClasses)
	app.Get("/api/classes/:id",    auth, h.GetClass)
	app.Post("/api/classes",       auth, h.CreateClass)
	app.Put("/api/classes/:id",    auth, h.UpdateClass)
	app.Delete("/api/classes/:id", auth, h.DeleteClass)

	// Attendance — literal prefixes MUST come before path-param catch-alls
	app.Get("/api/attendance/report/:schoolId",                 auth, h.GetAttendanceReport)
	app.Get("/api/attendance/students/:schoolId/:class/:date",  auth, h.GetStudentAttendanceByClass)
	app.Get("/api/attendance/self/:schoolId/:teacherId/:date",  auth, h.GetSelfAttendance)
	app.Post("/api/attendance/students",                        auth, h.MarkStudentAttendance)
	app.Post("/api/attendance/self/lock",                       auth, h.LockSelfAttendance)
	app.Post("/api/attendance/self",                            auth, h.MarkSelfAttendance)
	app.Get("/api/attendance",                                  auth, h.GetAttendance)
	app.Post("/api/attendance",                                 auth, h.MarkAttendance)
	app.Get("/api/attendance/:schoolId/:date",                  auth, h.GetTeacherDailyAttendance)

	// Exams — literal prefixes before path-param catch-alls
	app.Get("/api/exams/school/:schoolId",              auth, h.ListExams)
	app.Get("/api/exams/teacher/:schoolId/:teacherId",  auth, h.ListExamsByTeacher)
	app.Post("/api/exams/ai-create",                    auth, h.AICreateExam)
	app.Post("/api/exams",                              auth, h.CreateExam)
	app.Put("/api/exams/:id",                           auth, h.UpdateExam)
	app.Post("/api/exams/:id/upload",                   auth, h.UploadExam)
	app.Delete("/api/exams/:id",                        auth, h.DeleteExam)

	// Marks — literal before path-param catch-alls
	app.Get("/api/marks",                                auth, h.ListMarks)
	app.Get("/api/marks/:schoolId/:teacherId/:examId",   auth, h.GetMarksForExam)
	app.Post("/api/marks",                               auth, h.SaveMark)

	// Subjects
	app.Get("/api/subjects",        auth, h.ListSubjects)
	app.Post("/api/subjects",       auth, h.CreateSubject)
	app.Delete("/api/subjects/:id", auth, h.DeleteSubject)

	// Assignments
	app.Get("/api/assignments",                           auth, h.ListAssignments)
	app.Post("/api/assignments",                          auth, h.CreateAssignment)
	app.Get("/api/assignments/:id/submissions",           auth, h.ListSubmissions)
	app.Post("/api/assignments/:id/grade/:submissionId",  auth, h.GradeSubmission)
	app.Delete("/api/assignments/:id",                    auth, h.DeleteAssignment)

	// Materials
	app.Get("/api/materials",        auth, h.ListMaterials)
	app.Post("/api/materials",       auth, h.CreateMaterial)
	app.Delete("/api/materials/:id", auth, h.DeleteMaterial)
}
