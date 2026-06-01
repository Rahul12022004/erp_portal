package handlers

import (
	"context"
	"fmt"
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
	financeRepo *repositories.FinanceRepo
	investorRepo *repositories.InvestorRepo
	staffCol    *mongo.Collection
}

func New(cf *repositories.ClassFeeRepo, a *repositories.AssignmentRepo, p *repositories.PaymentRepo, studentsCol *mongo.Collection, fr *repositories.FinanceRepo, ir *repositories.InvestorRepo, staffCol *mongo.Collection) *Handler {
	return &Handler{classFees: cf, assignments: a, payments: p, studentsCol: studentsCol, financeRepo: fr, investorRepo: ir, staffCol: staffCol}
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
	if err := h.assignments.UpdatePayment(ctx, a.ID, newPaid, newDue, status, lastDate); err != nil {
		return response.InternalError(c, "payment recorded but balance update failed: "+err.Error())
	}

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

	// Aggregate fee metrics server-side — avoids loading all rows into Go heap
	schoolOID, _ := primitive.ObjectIDFromHex(schoolID)
	match := bson.M{"school_id": schoolOID}
	if year != "" {
		match["academic_year"] = year
	}
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: match}},
		{{Key: "$group", Value: bson.M{
			"_id":        nil,
			"totalFee":   bson.M{"$sum": "$total_fee"},
			"paid":       bson.M{"$sum": "$paid_amount"},
			"pending":    bson.M{"$sum": "$due_amount"},
			"total":      bson.M{"$sum": 1},
			"paidC":      bson.M{"$sum": bson.M{"$cond": bson.A{bson.M{"$eq": bson.A{"$fee_status", "PAID"}}, 1, 0}}},
			"partialC":   bson.M{"$sum": bson.M{"$cond": bson.A{bson.M{"$eq": bson.A{"$fee_status", "PARTIAL"}}, 1, 0}}},
			"overdueC":   bson.M{"$sum": bson.M{"$cond": bson.A{bson.M{"$eq": bson.A{"$fee_status", "OVERDUE"}}, 1, 0}}},
			"unpaidC":    bson.M{"$sum": bson.M{"$cond": bson.A{bson.M{"$eq": bson.A{"$fee_status", "UNPAID"}}, 1, 0}}},
		}}},
	}
	cur, err := h.assignments.Col().Aggregate(ctx, pipeline)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	defer cur.Close(ctx)
	var agg bson.M
	if cur.Next(ctx) {
		_ = cur.Decode(&agg)
	}
	totalFee, _ := agg["totalFee"].(float64)
	paid, _ := agg["paid"].(float64)
	pending, _ := agg["pending"].(float64)
	total := bsonInt(agg, "total")
	paidC := bsonInt(agg, "paidC")
	partialC := bsonInt(agg, "partialC")
	overdueC := bsonInt(agg, "overdueC")
	unpaidC := bsonInt(agg, "unpaidC")
	// Salary summary
	salaries, _ := h.financeRepo.FindBySchool(ctx, schoolID, "staff_salary")
	var totalSalary, paidSalary float64
	staffSalaryMap := map[string]bool{}
	for _, s := range salaries {
		if !staffSalaryMap[s.StaffID] {
			staffSalaryMap[s.StaffID] = true
			totalSalary += s.Amount
			paidSalary += s.PaidAmount
		}
	}

	// Investor summary
	invList, _ := h.investorRepo.FindBySchool(ctx, schoolID)
	var totalInvested, totalRepaid float64
	for _, inv := range invList {
		for _, tx := range inv.Transactions {
			if tx.Type == "investment" {
				totalInvested += tx.Amount
			} else if tx.Type == "repayment" {
				totalRepaid += tx.Amount
			}
		}
	}
	balanceDue := totalInvested - totalRepaid
	if balanceDue < 0 {
		balanceDue = 0
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
		"salary": fiber.Map{
			"totalStaff":           len(staffSalaryMap),
			"totalSalaryAmount":    totalSalary,
			"paidSalaryAmount":     paidSalary,
			"pendingSalaryAmount":  totalSalary - paidSalary,
		},
		"investors": fiber.Map{
			"total":          len(invList),
			"totalInvested":  totalInvested,
			"totalRepaid":    totalRepaid,
			"balanceDue":     balanceDue,
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

// ─── Staff Salary endpoints ───────────────────────────────────────────────────

// GET /api/finance/:schoolId/staff/summary
func (h *Handler) StaffSalarySummary(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()

	schoolID := c.Params("schoolId")
	oid, _ := primitive.ObjectIDFromHex(schoolID)

	// Load all staff
	staffCur, err := h.staffCol.Find(ctx, bson.M{"schoolId": oid})
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	defer staffCur.Close(ctx)
	var staffList []bson.M
	for staffCur.Next(ctx) {
		var s bson.M
		if staffCur.Decode(&s) == nil {
			staffList = append(staffList, s)
		}
	}

	// Load salary records
	salaries, _ := h.financeRepo.FindBySchool(ctx, schoolID, "staff_salary")
	salaryByStaff := map[string]*domain.Finance{}
	for _, s := range salaries {
		if s.StaffID != "" {
			if _, exists := salaryByStaff[s.StaffID]; !exists {
				salaryByStaff[s.StaffID] = s
			}
		}
	}

	currentYear := fmt.Sprintf("%d-%d", time.Now().Year()-1, time.Now().Year())
	type StaffSummaryItem struct {
		FinanceID    *string     `json:"financeId"`
		StaffID      interface{} `json:"staffId"`
		Salary       float64     `json:"salary"`
		PaidAmount   float64     `json:"paidAmount"`
		Status       string      `json:"status"`
		PaymentDate  *string     `json:"paymentDate"`
		AcademicYear string      `json:"academicYear"`
	}

	result := make([]StaffSummaryItem, 0, len(staffList))
	for _, staff := range staffList {
		var sid string
		if oid, ok := staff["_id"].(primitive.ObjectID); ok {
			sid = oid.Hex()
		}
		rec := salaryByStaff[sid]
		item := StaffSummaryItem{
			StaffID:      buildStaffInfo(staff),
			AcademicYear: currentYear,
			Status:       "pending",
		}
		if rec != nil {
			fid := rec.ID
			item.FinanceID = &fid
			item.Salary = rec.Amount
			item.PaidAmount = rec.PaidAmount
			item.Status = rec.Status
			if rec.AcademicYear != "" {
				item.AcademicYear = rec.AcademicYear
			}
			if rec.PaymentDate != "" {
				pd := rec.PaymentDate
				item.PaymentDate = &pd
			}
		}
		result = append(result, item)
	}

	return response.OK(c, result)
}

func buildStaffInfo(s bson.M) map[string]interface{} {
	m := map[string]interface{}{}
	if oid, ok := s["_id"].(primitive.ObjectID); ok {
		m["_id"] = oid.Hex()
	}
	for _, k := range []string{"name", "email", "phone", "position", "department", "bankName", "accountNumber", "ifscCode", "accountHolderName"} {
		if v, ok := s[k]; ok {
			m[k] = v
		}
	}
	return m
}

// POST /api/finance/salary  (create or update salary record)
func (h *Handler) CreateSalary(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	var body struct {
		SchoolID     string  `json:"schoolId"`
		StaffID      string  `json:"staffId"`
		Amount       float64 `json:"amount"`
		PaidAmount   float64 `json:"paidAmount"`
		PaymentDate  string  `json:"paymentDate"`
		AcademicYear string  `json:"academicYear"`
		Description  string  `json:"description"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	if body.SchoolID == "" || body.StaffID == "" {
		return response.BadRequest(c, "schoolId and staffId required")
	}
	status := "pending"
	if body.PaidAmount > 0 && body.PaidAmount >= body.Amount {
		status = "paid"
	} else if body.PaidAmount > 0 {
		status = "partial"
	}
	fin := &domain.Finance{
		SchoolID:     body.SchoolID,
		StaffID:      body.StaffID,
		Type:         "staff_salary",
		Amount:       body.Amount,
		PaidAmount:   body.PaidAmount,
		Status:       status,
		PaymentDate:  body.PaymentDate,
		AcademicYear: body.AcademicYear,
		Description:  body.Description,
	}
	created, err := h.financeRepo.Create(ctx, fin)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.Created(c, created)
}

// PUT /api/finance/salary/:id
func (h *Handler) UpdateSalary(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	var body struct {
		Amount              float64 `json:"amount"`
		PaidAmount          float64 `json:"paidAmount"`
		PaymentDate         string  `json:"paymentDate"`
		AcademicYear        string  `json:"academicYear"`
		Description         string  `json:"description"`
		RecordPaymentEntry  bool    `json:"recordPaymentEntry"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	status := "pending"
	if body.PaidAmount > 0 && body.Amount > 0 && body.PaidAmount >= body.Amount {
		status = "paid"
	} else if body.PaidAmount > 0 {
		status = "partial"
	}
	updates := bson.M{
		"amount": body.Amount, "paidAmount": body.PaidAmount,
		"status": status, "paymentDate": body.PaymentDate,
		"academicYear": body.AcademicYear, "description": body.Description,
	}
	updated, err := h.financeRepo.Update(ctx, c.Params("id"), updates)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	if body.RecordPaymentEntry && body.PaidAmount > 0 {
		ts := time.Now().UnixMilli()
		entry := domain.PaymentHistoryItem{
			ReceiptNumber: fmt.Sprintf("SAL-%d", ts),
			TransactionID: fmt.Sprintf("SALTXN-%d", ts),
			PaymentDate:   body.PaymentDate,
			AmountPaid:    body.PaidAmount,
			PaymentType:   "cash",
			CreatedAt:     time.Now().Format(time.RFC3339),
		}
		_ = h.financeRepo.PushPaymentHistory(ctx, c.Params("id"), entry)
	}
	return response.OK(c, updated)
}

// GET /api/finance/:schoolId/staff/:staffId/salary-report
func (h *Handler) StaffSalaryReport(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()

	schoolID := c.Params("schoolId")
	staffID := c.Params("staffId")

	// Find staff info
	stoid, _ := primitive.ObjectIDFromHex(staffID)
	var staffDoc bson.M
	if err := h.staffCol.FindOne(ctx, bson.M{"_id": stoid}).Decode(&staffDoc); err != nil {
		return response.NotFound(c, "staff not found")
	}

	records, err := h.financeRepo.FindBySchoolAndStaff(ctx, schoolID, staffID, "staff_salary")
	if err != nil {
		return response.InternalError(c, err.Error())
	}

	totals := struct {
		Salary float64 `json:"salary"`
		Paid   float64 `json:"paid"`
		Due    float64 `json:"due"`
	}{}
	for _, r := range records {
		totals.Salary += r.Amount
		totals.Paid += r.PaidAmount
		totals.Due += r.Amount - r.PaidAmount
	}

	return response.OK(c, fiber.Map{
		"staff":   buildStaffInfo(staffDoc),
		"totals":  totals,
		"records": records,
	})
}

// ─── Investor Ledger endpoints ────────────────────────────────────────────────

// GET /api/finance/:schoolId/investors
func (h *Handler) ListInvestors(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	list, err := h.investorRepo.FindBySchool(ctx, c.Params("schoolId"))
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	// Compute totals per investor
	type InvestorPayload struct {
		domain.InvestorLedger
		TotalInvested  float64 `json:"totalInvested"`
		TotalRepaid    float64 `json:"totalRepaid"`
		BalanceToRepay float64 `json:"balanceToRepay"`
	}
	result := make([]InvestorPayload, 0, len(list))
	for _, inv := range list {
		var invested, repaid float64
		for _, tx := range inv.Transactions {
			if tx.Type == "investment" {
				invested += tx.Amount
			} else if tx.Type == "repayment" {
				repaid += tx.Amount
			}
		}
		bal := invested - repaid
		if bal < 0 {
			bal = 0
		}
		result = append(result, InvestorPayload{
			InvestorLedger: *inv,
			TotalInvested:  invested,
			TotalRepaid:    repaid,
			BalanceToRepay: bal,
		})
	}
	return response.OK(c, result)
}

// POST /api/finance/:schoolId/investors
func (h *Handler) CreateInvestor(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	var body struct {
		InvestorName      string  `json:"investorName"`
		InvestorType      string  `json:"investorType"`
		Contact           string  `json:"contact"`
		Description       string  `json:"description"`
		Status            string  `json:"status"`
		InitialInvestment float64 `json:"initialInvestment"`
		Date              string  `json:"date"`
		Note              string  `json:"note"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	if body.InvestorName == "" {
		return response.BadRequest(c, "investorName required")
	}
	if body.Status == "" {
		body.Status = "Active"
	}
	inv := &domain.InvestorLedger{
		SchoolID:     c.Params("schoolId"),
		InvestorName: body.InvestorName,
		InvestorType: body.InvestorType,
		Contact:      body.Contact,
		Description:  body.Description,
		Status:       body.Status,
	}
	if body.InitialInvestment > 0 {
		d := body.Date
		if d == "" {
			d = time.Now().Format("2006-01-02")
		}
		inv.Transactions = []domain.InvestorTx{{
			Type: "investment", Amount: body.InitialInvestment, Date: d, Note: body.Note,
		}}
	}
	created, err := h.investorRepo.Create(ctx, inv)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.Created(c, created)
}

// POST /api/finance/:schoolId/investors/:investorId/transactions
func (h *Handler) AddInvestorTransaction(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	var body struct {
		Type   string  `json:"type"`
		Amount float64 `json:"amount"`
		Date   string  `json:"date"`
		Note   string  `json:"note"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	if body.Amount <= 0 {
		return response.BadRequest(c, "amount must be > 0")
	}
	if body.Date == "" {
		body.Date = time.Now().Format("2006-01-02")
	}
	tx := domain.InvestorTx{Type: body.Type, Amount: body.Amount, Date: body.Date, Note: body.Note}
	if err := h.investorRepo.AddTransaction(ctx, c.Params("investorId"), tx); err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, fiber.Map{"ok": true})
}

// DELETE /api/finance/:schoolId/investors/:investorId
func (h *Handler) DeleteInvestor(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	if err := h.investorRepo.Delete(ctx, c.Params("investorId")); err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.NoContent(c)
}
