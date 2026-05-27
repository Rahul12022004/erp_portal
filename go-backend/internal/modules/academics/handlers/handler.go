package handlers

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/modules/academics/domain"
	"github.com/erp-portal/go-backend/internal/modules/academics/repositories"
	"github.com/erp-portal/go-backend/pkg/response"
)

type Handler struct {
	classes     *repositories.ClassRepo
	attendance  *repositories.AttendanceRepo
	exams       *repositories.ExamRepo
	marks       *repositories.MarkRepo
}

func New(c *repositories.ClassRepo, a *repositories.AttendanceRepo,
	e *repositories.ExamRepo, m *repositories.MarkRepo) *Handler {
	return &Handler{classes: c, attendance: a, exams: e, marks: m}
}

func ctx10s() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 10*time.Second)
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

// GET /api/classes/:id
func (h *Handler) GetClass(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	cl, err := h.classes.FindByID(ctx, c.Params("id"))
	if err != nil || cl == nil {
		return response.NotFound(c, "class not found")
	}
	return response.OK(c, cl)
}

// POST /api/classes
func (h *Handler) CreateClass(c *fiber.Ctx) error {
	var cl domain.Class
	if err := c.BodyParser(&cl); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	ctx, cancel := ctx10s()
	defer cancel()
	created, err := h.classes.Create(ctx, &cl)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.Created(c, created)
}

// PUT /api/classes/:id
func (h *Handler) UpdateClass(c *fiber.Ctx) error {
	var updates map[string]interface{}
	if err := c.BodyParser(&updates); err != nil {
		return response.BadRequest(c, "invalid body")
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
	var a domain.Attendance
	if err := c.BodyParser(&a); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	ctx, cancel := ctx10s()
	defer cancel()
	saved, err := h.attendance.Upsert(ctx, &a)
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
	var e domain.Exam
	if err := c.BodyParser(&e); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	ctx, cancel := ctx10s()
	defer cancel()
	created, err := h.exams.Create(ctx, &e)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.Created(c, created)
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

// POST /api/marks
func (h *Handler) SaveMark(c *fiber.Ctx) error {
	var m domain.Mark
	if err := c.BodyParser(&m); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	ctx, cancel := ctx10s()
	defer cancel()
	saved, err := h.marks.Upsert(ctx, &m)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, saved)
}
