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

func (h *Handler) Dashboard(c *fiber.Ctx) error {
	sid, _ := primitive.ObjectIDFromHex(c.Query("schoolId"))
	ctx, cancel := ctx10s()
	defer cancel()

	studentCount, _ := h.students.CountDocuments(ctx, bson.M{"schoolId": sid, "status": "active"})
	staffCount, _ := h.staff.CountDocuments(ctx, bson.M{"schoolId": sid})

	finPipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"schoolId": sid}}},
		{{Key: "$group", Value: bson.M{
			"_id":        nil,
			"totalFee":   bson.M{"$sum": "$totalFee"},
			"paidAmount": bson.M{"$sum": "$paidAmount"},
			"dueAmount":  bson.M{"$sum": "$dueAmount"},
		}}},
	}
	finCur, _ := h.finance.Aggregate(ctx, finPipeline)
	var finRows []bson.M
	if finCur != nil {
		finCur.All(ctx, &finRows)
		finCur.Close(ctx)
	}
	finSummary := bson.M{"totalFee": 0, "paidAmount": 0, "dueAmount": 0}
	if len(finRows) > 0 {
		finSummary = finRows[0]
		delete(finSummary, "_id")
	}

	return response.OK(c, fiber.Map{
		"students":       studentCount,
		"staff":          staffCount,
		"feeCollection":  finSummary,
	})
}

func (h *Handler) EnrollmentTrend(c *fiber.Ctx) error {
	sid, _ := primitive.ObjectIDFromHex(c.Query("schoolId"))
	ctx, cancel := ctx10s()
	defer cancel()

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"schoolId": sid}}},
		{{Key: "$group", Value: bson.M{
			"_id":   bson.M{"$dateToString": bson.M{"format": "%Y-%m", "date": "$createdAt"}},
			"count": bson.M{"$sum": 1},
		}}},
		{{Key: "$sort", Value: bson.M{"_id": 1}}},
		{{Key: "$limit", Value: 12}},
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

func (h *Handler) FeeCollectionTrend(c *fiber.Ctx) error {
	sid, _ := primitive.ObjectIDFromHex(c.Query("schoolId"))
	ctx, cancel := ctx10s()
	defer cancel()

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"schoolId": sid}}},
		{{Key: "$group", Value: bson.M{
			"_id":        bson.M{"$dateToString": bson.M{"format": "%Y-%m", "date": "$createdAt"}},
			"collected":  bson.M{"$sum": "$paidAmount"},
			"pending":    bson.M{"$sum": "$dueAmount"},
		}}},
		{{Key: "$sort", Value: bson.M{"_id": 1}}},
		{{Key: "$limit", Value: 12}},
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
	return response.OK(c, rows)
}

func (h *Handler) AttendanceRate(c *fiber.Ctx) error {
	sid, _ := primitive.ObjectIDFromHex(c.Query("schoolId"))
	ctx, cancel := ctx10s()
	defer cancel()

	// last 30 days
	since := time.Now().AddDate(0, 0, -30)
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"schoolId": sid, "date": bson.M{"$gte": since}}}},
		{{Key: "$group", Value: bson.M{
			"_id":   bson.M{"$dateToString": bson.M{"format": "%Y-%m-%d", "date": "$date"}},
			"present": bson.M{"$sum": bson.M{"$cond": bson.A{bson.M{"$eq": bson.A{"$status", "present"}}, 1, 0}}},
			"absent":  bson.M{"$sum": bson.M{"$cond": bson.A{bson.M{"$eq": bson.A{"$status", "absent"}}, 1, 0}}},
		}}},
		{{Key: "$sort", Value: bson.M{"_id": 1}}},
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
