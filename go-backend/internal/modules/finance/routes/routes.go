package routes

import (
	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/core/db"
	"github.com/erp-portal/go-backend/internal/core/middleware"
	"github.com/erp-portal/go-backend/internal/modules/finance/handlers"
	"github.com/erp-portal/go-backend/internal/modules/finance/repositories"
)

func Register(app *fiber.App) {
	cfRepo := repositories.NewClassFeeRepo(db.Col("class_fee_structures"))
	aRepo  := repositories.NewAssignmentRepo(db.Col("student_fee_assignments"))
	pRepo  := repositories.NewPaymentRepo(db.Col("student_fee_payments"))

	h    := handlers.New(cfRepo, aRepo, pRepo, db.Col("students"))
	auth := middleware.Authenticate

	// School-scoped convenience routes (must register before generic patterns)
	sc := app.Group("/api/finance/:schoolId", auth)
	sc.Get("/students/summary",  h.StudentsSummary)
	sc.Get("/dashboard-summary", h.DashboardSummary)
	sc.Get("/available-years",   h.AvailableYears)

	// Class fee structures (both path forms for compatibility)
	cf := app.Group("/api/finance/class-fees", auth)
	cf.Get("",        h.ListClassFees)
	cf.Get("/:id",    h.GetClassFee)
	cf.Post("",       h.CreateClassFee)
	cf.Put("/:id",    h.UpdateClassFee)
	cf.Delete("/:id", h.DeleteClassFee)

	// Student fee assignments
	fa := app.Group("/api/finance/assignments", auth)
	fa.Get("",                    h.ListAssignments)
	fa.Get("/student/:studentId", h.GetStudentAssignment)
	fa.Get("/:id",                h.GetAssignment)
	fa.Post("",                   h.CreateAssignment)

	// Payments
	pay := app.Group("/api/finance/payments", auth)
	pay.Get("",  h.ListPayments)
	pay.Post("", h.CreatePayment)
}
