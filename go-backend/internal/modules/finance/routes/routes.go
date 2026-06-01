package routes

import (
	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/core/db"
	"github.com/erp-portal/go-backend/internal/core/middleware"
	"github.com/erp-portal/go-backend/internal/modules/finance/handlers"
	"github.com/erp-portal/go-backend/internal/modules/finance/repositories"
)

func Register(app *fiber.App) {
	cfRepo  := repositories.NewClassFeeRepo(db.Col("class_fee_structures"))
	aRepo   := repositories.NewAssignmentRepo(db.Col("student_fee_assignments"))
	pRepo   := repositories.NewPaymentRepo(db.Col("student_fee_payments"))
	frRepo  := repositories.NewFinanceRepo(db.Col("finances"))
	irRepo  := repositories.NewInvestorRepo(db.Col("investor_ledgers"))

	h    := handlers.New(cfRepo, aRepo, pRepo, db.Col("students"), frRepo, irRepo, db.Col("staffs"))
	auth := middleware.Authenticate

	// ── Class fee structures ──────────────────────────────────────────────────
	app.Get("/api/finance/class-fees",        auth, h.ListClassFees)
	app.Get("/api/finance/class-fees/:id",    auth, h.GetClassFee)
	app.Post("/api/finance/class-fees",       auth, h.CreateClassFee)
	app.Put("/api/finance/class-fees/:id",    auth, h.UpdateClassFee)
	app.Delete("/api/finance/class-fees/:id", auth, h.DeleteClassFee)

	// ── Student fee assignments ───────────────────────────────────────────────
	app.Get("/api/finance/assignments/student/:studentId", auth, h.GetStudentAssignment)
	app.Get("/api/finance/assignments/:id",                auth, h.GetAssignment)
	app.Get("/api/finance/assignments",                    auth, h.ListAssignments)
	app.Post("/api/finance/assignments",                   auth, h.CreateAssignment)

	// ── Payments ──────────────────────────────────────────────────────────────
	app.Get("/api/finance/payments",  auth, h.ListPayments)
	app.Post("/api/finance/payments", auth, h.CreatePayment)

	// ── Salary (Finance records) ──────────────────────────────────────────────
	app.Post("/api/finance/salary",    auth, h.CreateSalary)
	app.Put("/api/finance/salary/:id", auth, h.UpdateSalary)

	// ── School-scoped routes last so /:schoolId doesn't shadow literals ───────
	app.Get("/api/finance/:schoolId/staff/summary",            auth, h.StaffSalarySummary)
	app.Get("/api/finance/:schoolId/staff/:staffId/salary-report", auth, h.StaffSalaryReport)
	app.Get("/api/finance/:schoolId/investors",                auth, h.ListInvestors)
	app.Post("/api/finance/:schoolId/investors",               auth, h.CreateInvestor)
	app.Post("/api/finance/:schoolId/investors/:investorId/transactions", auth, h.AddInvestorTransaction)
	app.Delete("/api/finance/:schoolId/investors/:investorId", auth, h.DeleteInvestor)
	app.Get("/api/finance/:schoolId/students/summary",         auth, h.StudentsSummary)
	app.Get("/api/finance/:schoolId/dashboard-summary",        auth, h.DashboardSummary)
	app.Get("/api/finance/:schoolId/available-years",          auth, h.AvailableYears)
}
