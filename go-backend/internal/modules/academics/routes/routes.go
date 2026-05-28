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
	cl := app.Group("/api/classes", auth)
	cl.Get("",        h.ListClasses)
	cl.Get("/:id",    h.GetClass)
	cl.Post("",       h.CreateClass)
	cl.Put("/:id",    h.UpdateClass)
	cl.Delete("/:id", h.DeleteClass)

	// Attendance — literal prefixes MUST come before path-param catch-alls
	att := app.Group("/api/attendance", auth)
	att.Get("/report/:schoolId",                 h.GetAttendanceReport)
	att.Get("/students/:schoolId/:class/:date",  h.GetStudentAttendanceByClass)
	att.Get("/self/:schoolId/:teacherId/:date",  h.GetSelfAttendance)
	att.Post("/students",                        h.MarkStudentAttendance)
	att.Post("/self/lock",                       h.LockSelfAttendance)
	att.Post("/self",                            h.MarkSelfAttendance)
	att.Get("",                                  h.GetAttendance)
	att.Post("",                                 h.MarkAttendance)
	att.Get("/:schoolId/:date",                  h.GetTeacherDailyAttendance)

	// Exams — literal prefixes before path-param catch-alls
	exm := app.Group("/api/exams", auth)
	exm.Get("/school/:schoolId",          h.ListExams)
	exm.Get("/teacher/:schoolId/:teacherId", h.ListExamsByTeacher)
	exm.Post("/ai-create",                h.AICreateExam)
	exm.Post("",                          h.CreateExam)
	exm.Put("/:id",                       h.UpdateExam)
	exm.Post("/:id/upload",               h.UploadExam)
	exm.Delete("/:id",                    h.DeleteExam)

	// Marks — literal before path-param catch-alls
	mrk := app.Group("/api/marks", auth)
	mrk.Get("",                          h.ListMarks)
	mrk.Get("/:schoolId/:teacherId/:examId", h.GetMarksForExam)
	mrk.Post("",                         h.SaveMark)

	// Subjects
	sub := app.Group("/api/subjects", auth)
	sub.Get("",        h.ListSubjects)
	sub.Post("",       h.CreateSubject)
	sub.Delete("/:id", h.DeleteSubject)

	// Assignments
	asgn := app.Group("/api/assignments", auth)
	asgn.Get("",                        h.ListAssignments)
	asgn.Post("",                       h.CreateAssignment)
	asgn.Get("/:id/submissions",        h.ListSubmissions)
	asgn.Put("/:id/grade/:submissionId", h.GradeSubmission)
	asgn.Delete("/:id",                 h.DeleteAssignment)

	// Materials
	mat := app.Group("/api/materials", auth)
	mat.Get("",        h.ListMaterials)
	mat.Post("",       h.CreateMaterial)
	mat.Delete("/:id", h.DeleteMaterial)
}
