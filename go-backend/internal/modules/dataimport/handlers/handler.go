package handlers

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/erp-portal/go-backend/pkg/response"
)

type Handler struct{ historyCol *mongo.Collection }

func New(historyCol *mongo.Collection) *Handler { return &Handler{historyCol: historyCol} }

func ctx10s() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 10*time.Second)
}

// POST /api/data-import/preview
func (h *Handler) Preview(c *fiber.Ctx) error {
	return response.OK(c, fiber.Map{
		"appliedMapping": fiber.Map{},
		"aiUsed":         false,
		"rows":           []interface{}{},
	})
}

// POST /api/data-import/validate
func (h *Handler) Validate(c *fiber.Ctx) error {
	batchID := primitive.NewObjectID().Hex()
	return response.OK(c, fiber.Map{
		"batchId": batchID,
		"summary": fiber.Map{"validRows": 0, "invalidRows": 0, "totalRows": 0},
		"errors":  []interface{}{},
	})
}

// POST /api/data-import/import
func (h *Handler) Import(c *fiber.Ctx) error {
	return response.OK(c, fiber.Map{
		"result": fiber.Map{
			"importedStudents":   0,
			"importedFeeAccounts": 0,
			"failedRows":         0,
		},
	})
}

// GET /api/data-import/history/:schoolId
func (h *Handler) History(c *fiber.Ctx) error {
	if h.historyCol == nil {
		return response.OK(c, []interface{}{})
	}
	ctx, cancel := ctx10s()
	defer cancel()

	filter := bson.M{}
	if sid := c.Params("schoolId"); sid != "" {
		if oid, err := primitive.ObjectIDFromHex(sid); err == nil {
			filter["schoolId"] = oid
		}
	}
	opts := options.Find().SetSort(bson.M{"createdAt": -1}).SetLimit(50)
	cur, err := h.historyCol.Find(ctx, filter, opts)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	defer cur.Close(ctx)
	var list []bson.M
	if err := cur.All(ctx, &list); err != nil {
		return response.InternalError(c, err.Error())
	}
	if list == nil {
		list = []bson.M{}
	}
	return response.OK(c, list)
}

// POST /api/data-import/rollback/:batchId
func (h *Handler) Rollback(c *fiber.Ctx) error {
	return response.OK(c, fiber.Map{"rolledBack": true, "batchId": c.Params("batchId")})
}

// POST /api/data-import/reimport/:batchId
func (h *Handler) Reimport(c *fiber.Ctx) error {
	return response.OK(c, fiber.Map{"newBatchId": primitive.NewObjectID().Hex()})
}
