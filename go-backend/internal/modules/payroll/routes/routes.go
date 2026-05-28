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

	g := app.Group("/api/payroll", auth)
	g.Get("",              h.List)
	g.Post("",             h.Create)
	g.Put("/:id",          h.Update)
	g.Post("/:id/pay",     h.MarkPaid)

	ss := app.Group("/api/salary-structures", auth)
	ss.Get("/:schoolId",          h.ListSalaryStructures)
	ss.Post("/:schoolId",         h.CreateSalaryStructure)
	ss.Put("/:schoolId/:id",      h.UpdateSalaryStructure)
	ss.Delete("/:schoolId/:id",   h.DeleteSalaryStructure)
}
