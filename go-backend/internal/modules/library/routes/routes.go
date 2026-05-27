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

	books := app.Group("/api/library/books", auth)
	books.Get("",      h.ListBooks)
	books.Get("/:id",  h.GetBook)
	books.Post("",     h.CreateBook)
	books.Put("/:id",  h.UpdateBook)
	books.Delete("/:id", h.DeleteBook)

	issues := app.Group("/api/library/assignments", auth)
	issues.Get("",                h.ListAssignments)
	issues.Post("",               h.IssueBook)
	issues.Patch("/:id/return",   h.ReturnBook)
}
