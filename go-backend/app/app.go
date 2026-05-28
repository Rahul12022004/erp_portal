package app

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/recover"

	"github.com/erp-portal/go-backend/internal/core/health"
	"github.com/erp-portal/go-backend/internal/core/middleware"

	academicsRoutes     "github.com/erp-portal/go-backend/internal/modules/academics/routes"
	admissionsRoutes    "github.com/erp-portal/go-backend/internal/modules/admissions/routes"
	analyticsRoutes     "github.com/erp-portal/go-backend/internal/modules/analytics/routes"
	authRoutes          "github.com/erp-portal/go-backend/internal/modules/auth/routes"
	dataimportRoutes    "github.com/erp-portal/go-backend/internal/modules/dataimport/routes"
	communicationRoutes "github.com/erp-portal/go-backend/internal/modules/communication/routes"
	financeRoutes       "github.com/erp-portal/go-backend/internal/modules/finance/routes"
	hostelRoutes        "github.com/erp-portal/go-backend/internal/modules/hostel/routes"
	inventoryRoutes     "github.com/erp-portal/go-backend/internal/modules/inventory/routes"
	libraryRoutes       "github.com/erp-portal/go-backend/internal/modules/library/routes"
	maintenanceRoutes   "github.com/erp-portal/go-backend/internal/modules/maintenance/routes"
	notificationsRoutes "github.com/erp-portal/go-backend/internal/modules/notifications/routes"
	payrollRoutes       "github.com/erp-portal/go-backend/internal/modules/payroll/routes"
	reportsRoutes       "github.com/erp-portal/go-backend/internal/modules/reports/routes"
	schoolRoutes        "github.com/erp-portal/go-backend/internal/modules/school/routes"
	socialmediaRoutes   "github.com/erp-portal/go-backend/internal/modules/socialmedia/routes"
	settingsRoutes      "github.com/erp-portal/go-backend/internal/modules/settings/routes"
	staffRoutes         "github.com/erp-portal/go-backend/internal/modules/staff/routes"
	studentsRoutes      "github.com/erp-portal/go-backend/internal/shared/students/routes"
	surveyRoutes        "github.com/erp-portal/go-backend/internal/modules/survey/routes"
	timetableRoutes     "github.com/erp-portal/go-backend/internal/modules/timetable/routes"
	transportRoutes     "github.com/erp-portal/go-backend/internal/modules/transport/routes"
	visitorRoutes       "github.com/erp-portal/go-backend/internal/modules/visitor/routes"
)

func New() *fiber.App {
	app := fiber.New(fiber.Config{
		ErrorHandler: defaultErrorHandler,
	})

	app.Use(recover.New())
	app.Use(middleware.CORS())
	app.Use(middleware.RequestLogger)

	health.Register(app)
	registerAll(app)

	return app
}

func registerAll(app *fiber.App) {
	authRoutes.Register(app)
	schoolRoutes.Register(app)
	staffRoutes.Register(app)
	studentsRoutes.Register(app)
	academicsRoutes.Register(app)
	financeRoutes.Register(app)
	communicationRoutes.Register(app)
	transportRoutes.Register(app)
	hostelRoutes.Register(app)
	inventoryRoutes.Register(app)
	libraryRoutes.Register(app)
	admissionsRoutes.Register(app)
	notificationsRoutes.Register(app)
	maintenanceRoutes.Register(app)
	surveyRoutes.Register(app)
	visitorRoutes.Register(app)
	timetableRoutes.Register(app)
	settingsRoutes.Register(app)
	payrollRoutes.Register(app)
	reportsRoutes.Register(app)
	analyticsRoutes.Register(app)
	socialmediaRoutes.Register(app)
	dataimportRoutes.Register(app)
}

func defaultErrorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
	}
	return c.Status(code).JSON(fiber.Map{"success": false, "error": err.Error()})
}
