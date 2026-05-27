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

	g := app.Group("/api/timetable", auth)
	g.Get("/slots",       h.ListSlots)
	g.Post("/slots",      h.CreateSlot)
	g.Get("/periods",     h.ListPeriods)
	g.Post("/periods",    h.UpsertPeriod)
	g.Delete("/periods/:id", h.DeletePeriod)
}
