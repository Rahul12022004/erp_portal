package app

import (
	"net/url"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/valyala/fasthttp"

	"github.com/erp-portal/go-backend/internal/core/health"
	"github.com/erp-portal/go-backend/internal/core/middleware"
	authRoutes "github.com/erp-portal/go-backend/internal/modules/auth/routes"
)

type route struct {
	prefix string
	target string
}

// serviceRoutes maps each API prefix to its microservice base URL.
var serviceRoutes = []route{
	// academics-service :5001
	{"/api/assignments", "http://localhost:5001"},
	{"/api/attendance", "http://localhost:5001"},
	{"/api/classes", "http://localhost:5001"},
	{"/api/exams", "http://localhost:5001"},
	{"/api/marks", "http://localhost:5001"},
	{"/api/materials", "http://localhost:5001"},
	{"/api/subjects", "http://localhost:5001"},
	// admissions-service :5002
	{"/api/admissions", "http://localhost:5002"},
	// analytics-service :5003
	{"/api/analytics", "http://localhost:5003"},
	{"/api/dashboard", "http://localhost:5003"},
	// communication-service :5004
	{"/api/announcements", "http://localhost:5004"},
	{"/api/campaigns", "http://localhost:5004"},
	// dataimport-service :5005
	{"/api/data-import", "http://localhost:5005"},
	// finance-service :5006
	{"/api/finance", "http://localhost:5006"},
	// hostel-service :5007
	{"/api/hostel", "http://localhost:5007"},
	// inventory-service :5008
	{"/api/inventory", "http://localhost:5008"},
	// library-service :5009
	{"/api/library", "http://localhost:5009"},
	// maintenance-service :5010
	{"/api/maintenance", "http://localhost:5010"},
	// notifications-service :5011
	{"/api/notifications", "http://localhost:5011"},
	// payroll-service :5012
	{"/api/payroll", "http://localhost:5012"},
	{"/api/salary-structures", "http://localhost:5012"},
	// reports-service :5013
	{"/api/reports", "http://localhost:5013"},
	// school-service :5014
	{"/api/schools", "http://localhost:5014"},
	// settings-service :5015
	{"/api/admin", "http://localhost:5015"},
	{"/api/logs", "http://localhost:5015"},
	{"/api/settings", "http://localhost:5015"},
	// socialmedia-service :5016
	{"/api/social-media", "http://localhost:5016"},
	// staff-service :5017
	{"/api/leaves", "http://localhost:5017"},
	{"/api/staff", "http://localhost:5017"},
	{"/api/teacher-roles", "http://localhost:5017"},
	// students-service :5018
	{"/api/students", "http://localhost:5018"},
	// survey-service :5019
	{"/api/surveys", "http://localhost:5019"},
	// timetable-service :5020
	{"/api/timetable", "http://localhost:5020"},
	// transport-service :5021
	{"/api/transport", "http://localhost:5021"},
	// visitor-service :5022
	{"/api/visitors", "http://localhost:5022"},
}

func New() *fiber.App {
	app := fiber.New(fiber.Config{ErrorHandler: defaultErrorHandler})
	app.Use(recover.New())
	app.Use(middleware.CORS())
	app.Use(middleware.RequestLogger)

	health.Register(app)
	authRoutes.Register(app)
	registerProxies(app)

	return app
}

func registerProxies(app *fiber.App) {
	client := &fasthttp.Client{}
	for _, r := range serviceRoutes {
		app.All(r.prefix+"*", middleware.Authenticate, func(c *fiber.Ctx) error {
			return proxyTo(c, client, r.target)
		})
	}
}

func proxyTo(c *fiber.Ctx, client *fasthttp.Client, target string) error {
	req := fasthttp.AcquireRequest()
	resp := fasthttp.AcquireResponse()
	defer fasthttp.ReleaseRequest(req)
	defer fasthttp.ReleaseResponse(resp)

	c.Request().CopyTo(req)

	u, _ := url.Parse(target)
	req.URI().SetScheme(u.Scheme)
	req.URI().SetHost(u.Host)
	req.SetRequestURIBytes(c.Request().RequestURI())

	if err := client.Do(req, resp); err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"success": false,
			"error":   target + " is unavailable",
		})
	}
	resp.CopyTo(c.Response())
	return nil
}

func defaultErrorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
	}
	return c.Status(code).JSON(fiber.Map{"success": false, "error": err.Error()})
}
