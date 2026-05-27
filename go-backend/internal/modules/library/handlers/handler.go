package handlers

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/modules/library/domain"
	"github.com/erp-portal/go-backend/internal/modules/library/repositories"
	"github.com/erp-portal/go-backend/pkg/response"
)

type Handler struct {
	books       *repositories.BookRepo
	assignments *repositories.AssignmentRepo
}

func New(b *repositories.BookRepo, a *repositories.AssignmentRepo) *Handler {
	return &Handler{books: b, assignments: a}
}

func ctx10s() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 10*time.Second)
}

// GET /api/library/books?schoolId=&category=
func (h *Handler) ListBooks(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	list, err := h.books.FindBySchool(ctx, c.Query("schoolId"), c.Query("category"))
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, list)
}

// GET /api/library/books/:id
func (h *Handler) GetBook(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	b, err := h.books.FindByID(ctx, c.Params("id"))
	if err != nil || b == nil {
		return response.NotFound(c, "book not found")
	}
	return response.OK(c, b)
}

// POST /api/library/books
func (h *Handler) CreateBook(c *fiber.Ctx) error {
	var b domain.LibraryBook
	if err := c.BodyParser(&b); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	ctx, cancel := ctx10s()
	defer cancel()
	created, err := h.books.Create(ctx, &b)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.Created(c, created)
}

// PUT /api/library/books/:id
func (h *Handler) UpdateBook(c *fiber.Ctx) error {
	var updates map[string]interface{}
	if err := c.BodyParser(&updates); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	ctx, cancel := ctx10s()
	defer cancel()
	b, err := h.books.Update(ctx, c.Params("id"), updates)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, b)
}

// DELETE /api/library/books/:id
func (h *Handler) DeleteBook(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	if err := h.books.Delete(ctx, c.Params("id")); err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.NoContent(c)
}

// GET /api/library/assignments?schoolId=&status=
func (h *Handler) ListAssignments(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	list, err := h.assignments.FindBySchool(ctx, c.Query("schoolId"), c.Query("status"))
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, list)
}

// POST /api/library/assignments
func (h *Handler) IssueBook(c *fiber.Ctx) error {
	var a domain.LibraryAssignment
	if err := c.BodyParser(&a); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	ctx, cancel := ctx10s()
	defer cancel()
	created, err := h.assignments.Create(ctx, &a)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.Created(c, created)
}

// PATCH /api/library/assignments/:id/return
func (h *Handler) ReturnBook(c *fiber.Ctx) error {
	var body struct {
		ReturnDate string `json:"returnDate"`
	}
	if err := c.BodyParser(&body); err != nil || body.ReturnDate == "" {
		body.ReturnDate = time.Now().Format("2006-01-02")
	}
	ctx, cancel := ctx10s()
	defer cancel()
	a, err := h.assignments.Return(ctx, c.Params("id"), body.ReturnDate)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, a)
}
