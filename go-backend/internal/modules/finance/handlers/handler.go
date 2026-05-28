package handlers

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"github.com/erp-portal/go-backend/internal/modules/finance/domain"
	"github.com/erp-portal/go-backend/internal/modules/finance/repositories"
	"github.com/erp-portal/go-backend/pkg/response"
)

type Handler struct {
	classFees   *repositories.ClassFeeRepo
	assignments *repositories.AssignmentRepo
	payments    *repositories.PaymentRepo
	studentsCol *mongo.Collection
}

func New(cf *repositories.ClassFeeRepo, a *repositories.AssignmentRepo, p *repositories.PaymentRepo, studentsCol *mongo.Collection) *Handler {
	return &Handler{classFees: cf, assignments: a, payments: p, studentsCol: studentsCol}
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

// ─── School-scoped convenience endpoints ─────────────────────────────────────

// GET /api/finance/:schoolId/students/summary
func (h *Handler) StudentsSummary(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()

	schoolID := c.Params("schoolId")
	page := int64(c.QueryInt("page", 1))
	limit := int64(c.QueryInt("limit", 20))
	skip := (page - 1) * limit

	f := repositories.AssignmentFilter{
		SchoolID:     schoolID,
		AcademicYear: c.Query("academicYear"),
		Search:       c.Query("search"),
		Skip:         skip,
		Limit:        limit,
	}
	list, total, err := h.assignments.Find(ctx, f)
	if err != nil {
		return response.InternalError(c, err.Error())
	}

	// Build student name lookup map
	studentNames := map[string]bson.M{}
	if h.studentsCol != nil && len(list) > 0 {
		var ids []primitive.ObjectID
		for _, a := range list {
			if oid, e := primitive.ObjectIDFromHex(a.StudentID); e == nil {
				ids = append(ids, oid)
			}
		}
		cur, e := h.studentsCol.Find(ctx, bson.M{"_id": bson.M{"$in": ids}})
		if e == nil {
			defer cur.Close(ctx)
			for cur.Next(ctx) {
				var s bson.M
				if cur.Decode(&s) == nil {
					if oid, ok := s["_id"].(primitive.ObjectID); ok {
						studentNames[oid.Hex()] = s
					}
				}
			}
		}
	}

	type FeeComp struct {
		Label  string  `json:"label"`
		Amount float64 `json:"amount"`
	}
	type StudentInfo struct {
		Name       string `json:"name"`
		Class      string `json:"class"`
		RollNumber string `json:"rollNumber,omitempty"`
	}
	type Item struct {
		StudentID       string      `json:"studentId"`
		FinanceID       string      `json:"financeId,omitempty"`
		Student         StudentInfo `json:"student"`
		Status          string      `json:"status"`
		TotalFee        float64     `json:"totalFee"`
		PaidAmount      float64     `json:"paidAmount"`
		RemainingAmount float64     `json:"remainingAmount"`
		DueDate         string      `json:"dueDate,omitempty"`
		FeeComponents   []FeeComp   `json:"feeComponents"`
	}
	type Metrics struct {
		TotalStudents        int64   `json:"totalStudents"`
		CurrentTotalFee      float64 `json:"currentTotalFee"`
		CurrentPaidAmount    float64 `json:"currentPaidAmount"`
		CurrentPendingAmount float64 `json:"currentPendingAmount"`
		OverdueCount         int     `json:"overdueCount"`
		OutstandingBalance   float64 `json:"outstandingBalance"`
	}

	items := make([]Item, 0, len(list))
	var metrics Metrics
	for _, a := range list {
		s := studentNames[a.StudentID]
		name, class, roll := "", "", ""
		if s != nil {
			name, _ = s["name"].(string)
			class, _ = s["class"].(string)
			roll, _ = s["rollNumber"].(string)
		}
		comps := []FeeComp{
			{Label: "Academic Fee", Amount: a.AcademicFee},
			{Label: "Transport Fee", Amount: a.TransportFee},
			{Label: "Other Fee", Amount: a.OtherFee},
		}
		items = append(items, Item{
			StudentID:       a.StudentID,
			FinanceID:       a.ID,
			Student:         StudentInfo{Name: name, Class: class, RollNumber: roll},
			Status:          a.FeeStatus,
			TotalFee:        a.TotalFee,
			PaidAmount:      a.PaidAmount,
			RemainingAmount: a.DueAmount,
			DueDate:         a.DueDate,
			FeeComponents:   comps,
		})
		metrics.CurrentTotalFee += a.TotalFee
		metrics.CurrentPaidAmount += a.PaidAmount
		metrics.CurrentPendingAmount += a.DueAmount
		if a.FeeStatus == "OVERDUE" {
			metrics.OverdueCount++
		}
	}
	metrics.TotalStudents = total
	metrics.OutstandingBalance = metrics.CurrentPendingAmount

	totalPages := (total + limit - 1) / limit
	return response.OK(c, fiber.Map{
		"items":      items,
		"metrics":    metrics,
		"pagination": fiber.Map{"totalPages": totalPages, "totalItems": total},
	})
}

// GET /api/finance/:schoolId/dashboard-summary
func (h *Handler) DashboardSummary(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()

	schoolID := c.Params("schoolId")
	year := c.Query("academicYear")
	f := repositories.AssignmentFilter{SchoolID: schoolID, AcademicYear: year, Limit: 10000}
	list, total, err := h.assignments.Find(ctx, f)
	if err != nil {
		return response.InternalError(c, err.Error())
	}

	var totalFee, paid, pending float64
	paidC, partialC, unpaidC, overdueC := 0, 0, 0, 0
	for _, a := range list {
		totalFee += a.TotalFee
		paid += a.PaidAmount
		pending += a.DueAmount
		switch a.FeeStatus {
		case "PAID":
			paidC++
		case "PARTIAL":
			partialC++
		case "OVERDUE":
			overdueC++
		default:
			unpaidC++
		}
	}
	return response.OK(c, fiber.Map{
		"fee": fiber.Map{
			"totalFeeAmount":  totalFee,
			"collectedAmount": paid,
			"pendingAmount":   pending,
			"totalStudents":   total,
			"paidCount":       paidC,
			"partialCount":    partialC,
			"unpaidCount":     unpaidC,
			"overdueCount":    overdueC,
		},
	})
}

// GET /api/finance/:schoolId/available-years
func (h *Handler) AvailableYears(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()

	schoolID := c.Params("schoolId")
	oid, _ := primitive.ObjectIDFromHex(schoolID)

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"school_id": oid}}},
		{{Key: "$group", Value: bson.M{"_id": "$academic_year"}}},
		{{Key: "$sort", Value: bson.M{"_id": -1}}},
	}
	cur, err := h.assignments.Col().Aggregate(ctx, pipeline)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	defer cur.Close(ctx)

	var years []string
	for cur.Next(ctx) {
		var d bson.M
		if cur.Decode(&d) == nil {
			if y, ok := d["_id"].(string); ok && y != "" {
				years = append(years, y)
			}
		}
	}
	if years == nil {
		years = []string{}
	}
	return response.OK(c, fiber.Map{"years": years})
}
