package routes

import (
	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/core/db"
	"github.com/erp-portal/go-backend/internal/core/middleware"
	"github.com/erp-portal/go-backend/internal/modules/library/handlers"
	"github.com/erp-portal/go-backend/internal/modules/library/repositories"
)

func Register(app *fiber.App) {
	bRepo := repositories.NewBookRepo(db.Col("librarybooks"))
	aRepo := repositories.NewAssignmentRepo(db.Col("libraryassignments"))
	h     := handlers.New(bRepo, aRepo)
	auth  := middleware.Authenticate

	app.Get("/api/library/books",       auth, h.ListBooks)
	app.Get("/api/library/books/:id",   auth, h.GetBook)
	app.Post("/api/library/books",      auth, h.CreateBook)
	app.Put("/api/library/books/:id",   auth, h.UpdateBook)
	app.Delete("/api/library/books/:id", auth, h.DeleteBook)

	app.Get("/api/library/assignments",              auth, h.ListAssignments)
	app.Post("/api/library/assignments",             auth, h.IssueBook)
	app.Patch("/api/library/assignments/:id/return", auth, h.ReturnBook)
}
