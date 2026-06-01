package routes

import (
	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/core/db"
	"github.com/erp-portal/go-backend/internal/core/middleware"
	"github.com/erp-portal/go-backend/internal/modules/timetable/handlers"
	"github.com/erp-portal/go-backend/internal/modules/timetable/repositories"
)

func Register(app *fiber.App) {
	repo := repositories.New(db.Col("timeslots"), db.Col("timetableperiods"))
	h    := handlers.New(repo)
	auth := middleware.Authenticate

	app.Get("/api/timetable/slots",          auth, h.ListSlots)
	app.Post("/api/timetable/slots",         auth, h.CreateSlot)
	app.Get("/api/timetable/periods",        auth, h.ListPeriods)
	app.Post("/api/timetable/periods",       auth, h.UpsertPeriod)
	app.Delete("/api/timetable/periods/:id", auth, h.DeletePeriod)
}
