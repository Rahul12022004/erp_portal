package routes

import (
	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/core/db"
	"github.com/erp-portal/go-backend/internal/core/middleware"
	"github.com/erp-portal/go-backend/internal/modules/payroll/handlers"
	"github.com/erp-portal/go-backend/internal/modules/payroll/repositories"
)

func Register(app *fiber.App) {
	repo       := repositories.New(db.Col("payrollentries"))
	salaryRepo := repositories.NewSalaryStructureRepo(db.Col("salary_structures"))
	h          := handlers.New(repo, salaryRepo)
	auth       := middleware.Authenticate

	app.Get("/api/payroll",         auth, h.List)
	app.Post("/api/payroll",        auth, h.Create)
	app.Put("/api/payroll/:id",     auth, h.Update)
	app.Post("/api/payroll/:id/pay", auth, h.MarkPaid)

	app.Get("/api/salary-structures/:schoolId",       auth, h.ListSalaryStructures)
	app.Post("/api/salary-structures/:schoolId",      auth, h.CreateSalaryStructure)
	app.Put("/api/salary-structures/:schoolId/:id",   auth, h.UpdateSalaryStructure)
	app.Delete("/api/salary-structures/:schoolId/:id", auth, h.DeleteSalaryStructure)
}
