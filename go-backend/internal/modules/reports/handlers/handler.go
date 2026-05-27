package handlers

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"github.com/erp-portal/go-backend/pkg/response"
)

type Handler struct {
	students   *mongo.Collection
	finance    *mongo.Collection
	attendance *mongo.Collection
	staff      *mongo.Collection
}

func New(students, finance, attendance, staff *mongo.Collection) *Handler {
	return &Handler{students: students, finance: finance, attendance: attendance, staff: staff}
}

func ctx10s() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 10*time.Second)
}

func (h *Handler) StudentStrength(c *fiber.Ctx) error {
	sid, _ := primitive.ObjectIDFromHex(c.Query("schoolId"))
	ctx, cancel := ctx10s()
	defer cancel()

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"schoolId": sid, "status": "active"}}},
		{{Key: "$group", Value: bson.M{"_id": "$class", "count": bson.M{"$sum": 1}}}},
		{{Key: "$sort", Value: bson.M{"_id": 1}}},
	}
	cur, err := h.students.Aggregate(ctx, pipeline)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	defer cur.Close(ctx)
	var rows []bson.M
	if err := cur.All(ctx, &rows); err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, rows)
}

func (h *Handler) FeeCollection(c *fiber.Ctx) error {
	sid, _ := primitive.ObjectIDFromHex(c.Query("schoolId"))
	ctx, cancel := ctx10s()
	defer cancel()

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"schoolId": sid}}},
		{{Key: "$group", Value: bson.M{
			"_id":        nil,
			"totalFee":   bson.M{"$sum": "$totalFee"},
			"paidAmount": bson.M{"$sum": "$paidAmount"},
			"dueAmount":  bson.M{"$sum": "$dueAmount"},
		}}},
	}
	cur, err := h.finance.Aggregate(ctx, pipeline)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	defer cur.Close(ctx)
	var rows []bson.M
	if err := cur.All(ctx, &rows); err != nil {
		return response.InternalError(c, err.Error())
	}
	if len(rows) == 0 {
		return response.OK(c, bson.M{"totalFee": 0, "paidAmount": 0, "dueAmount": 0})
	}
	return response.OK(c, rows[0])
}

func (h *Handler) AttendanceSummary(c *fiber.Ctx) error {
	sid, _ := primitive.ObjectIDFromHex(c.Query("schoolId"))
	ctx, cancel := ctx10s()
	defer cancel()

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"schoolId": sid}}},
		{{Key: "$group", Value: bson.M{
			"_id":     "$status",
			"count":   bson.M{"$sum": 1},
		}}},
	}
	cur, err := h.attendance.Aggregate(ctx, pipeline)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	defer cur.Close(ctx)
	var rows []bson.M
	if err := cur.All(ctx, &rows); err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, rows)
}

func (h *Handler) StaffReport(c *fiber.Ctx) error {
	sid, _ := primitive.ObjectIDFromHex(c.Query("schoolId"))
	ctx, cancel := ctx10s()
	defer cancel()

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"schoolId": sid}}},
		{{Key: "$group", Value: bson.M{"_id": "$department", "count": bson.M{"$sum": 1}}}},
		{{Key: "$sort", Value: bson.M{"_id": 1}}},
	}
	cur, err := h.staff.Aggregate(ctx, pipeline)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	defer cur.Close(ctx)
	var rows []bson.M
	if err := cur.All(ctx, &rows); err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, rows)
}
