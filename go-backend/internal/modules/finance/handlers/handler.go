package handlers

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/modules/finance/domain"
	"github.com/erp-portal/go-backend/internal/modules/finance/repositories"
	"github.com/erp-portal/go-backend/pkg/response"
)

type Handler struct {
	classFees   *repositories.ClassFeeRepo
	assignments *repositories.AssignmentRepo
	payments    *repositories.PaymentRepo
}

func New(cf *repositories.ClassFeeRepo, a *repositories.AssignmentRepo, p *repositories.PaymentRepo) *Handler {
	return &Handler{classFees: cf, assignments: a, payments: p}
}

func ctx10s() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 10*time.Second)
}

// ─── Class Fee Structure ──────────────────────────────────────────────────────

// GET /api/finance/class-fees?schoolId=
func (h *Handler) ListClassFees(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	list, err := h.classFees.FindBySchool(ctx, c.Query("schoolId"))
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, list)
}

// GET /api/finance/class-fees/:id
func (h *Handler) GetClassFee(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	f, err := h.classFees.FindByID(ctx, c.Params("id"))
	if err != nil || f == nil {
		return response.NotFound(c, "class fee structure not found")
	}
	return response.OK(c, f)
}

// POST /api/finance/class-fees
func (h *Handler) CreateClassFee(c *fiber.Ctx) error {
	var f domain.ClassFeeStructure
	if err := c.BodyParser(&f); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	ctx, cancel := ctx10s()
	defer cancel()
	created, err := h.classFees.Create(ctx, &f)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.Created(c, created)
}

// PUT /api/finance/class-fees/:id
func (h *Handler) UpdateClassFee(c *fiber.Ctx) error {
	var updates map[string]interface{}
	if err := c.BodyParser(&updates); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	ctx, cancel := ctx10s()
	defer cancel()
	f, err := h.classFees.Update(ctx, c.Params("id"), updates)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, f)
}

// DELETE /api/finance/class-fees/:id
func (h *Handler) DeleteClassFee(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	if err := h.classFees.Delete(ctx, c.Params("id")); err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.NoContent(c)
}

// ─── Student Fee Assignments ──────────────────────────────────────────────────

// GET /api/finance/assignments?schoolId=&academicYear=&page=&limit=
func (h *Handler) ListAssignments(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()

	page := int64(c.QueryInt("page", 1))
	limit := int64(c.QueryInt("limit", 50))
	skip := (page - 1) * limit

	f := repositories.AssignmentFilter{
		SchoolID:     c.Query("schoolId"),
		ClassID:      c.Query("classId"),
		AcademicYear: c.Query("academicYear"),
		Search:       c.Query("search"),
		Skip:         skip,
		Limit:        limit,
	}
	list, total, err := h.assignments.Find(ctx, f)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, fiber.Map{"data": list, "total": total, "page": page, "limit": limit})
}

// GET /api/finance/assignments/:id
func (h *Handler) GetAssignment(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	a, err := h.assignments.FindByID(ctx, c.Params("id"))
	if err != nil || a == nil {
		return response.NotFound(c, "assignment not found")
	}
	return response.OK(c, a)
}

// GET /api/finance/assignments/student/:studentId?schoolId=&year=
func (h *Handler) GetStudentAssignment(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	a, err := h.assignments.FindByStudent(ctx, c.Query("schoolId"), c.Params("studentId"), c.Query("year"))
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	if a == nil {
		return response.NotFound(c, "assignment not found")
	}
	return response.OK(c, a)
}

// POST /api/finance/assignments
func (h *Handler) CreateAssignment(c *fiber.Ctx) error {
	var a domain.StudentFeeAssignment
	if err := c.BodyParser(&a); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	ctx, cancel := ctx10s()
	defer cancel()
	created, err := h.assignments.Create(ctx, &a)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.Created(c, created)
}

// ─── Payments ─────────────────────────────────────────────────────────────────

// GET /api/finance/payments?assignmentId=
func (h *Handler) ListPayments(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	list, err := h.payments.FindByAssignment(ctx, c.Query("assignmentId"))
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, list)
}

// POST /api/finance/payments
func (h *Handler) CreatePayment(c *fiber.Ctx) error {
	var p domain.StudentFeePayment
	if err := c.BodyParser(&p); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	if p.StudentFeeAssignmentID == "" || p.PaymentAmount <= 0 {
		return response.BadRequest(c, "assignmentId and paymentAmount required")
	}

	ctx, cancel := ctx10s()
	defer cancel()

	// Load existing assignment to recalculate balances.
	a, err := h.assignments.FindByID(ctx, p.StudentFeeAssignmentID)
	if err != nil || a == nil {
		return response.NotFound(c, "assignment not found")
	}

	created, err := h.payments.Create(ctx, &p)
	if err != nil {
		return response.InternalError(c, err.Error())
	}

	newPaid := a.PaidAmount + p.PaymentAmount
	newDue := a.TotalFee - newPaid
	if newDue < 0 {
		newDue = 0
	}
	status := "PARTIAL"
	if newDue <= 0 {
		status = "PAID"
	}
	lastDate := p.PaymentDate
	if lastDate == "" {
		lastDate = time.Now().Format("2006-01-02")
	}
	_ = h.assignments.UpdatePayment(ctx, a.ID, newPaid, newDue, status, lastDate)

	return response.Created(c, created)
}
