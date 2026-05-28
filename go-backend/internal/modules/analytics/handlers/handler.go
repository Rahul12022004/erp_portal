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

// GET /api/dashboard/teacher/:schoolId/:teacherId
func (h *Handler) TeacherDashboard(c *fiber.Ctx) error {
	schoolID := c.Params("schoolId")
	teacherID := c.Params("teacherId")
	sid, _ := primitive.ObjectIDFromHex(schoolID)
	tid, _ := primitive.ObjectIDFromHex(teacherID)
	ctx, cancel := ctx10s()
	defer cancel()

	// Get assigned classes for teacher
	classCur, err := h.students.Database().Collection("classes").Find(ctx,
		bson.M{"schoolId": sid, "$or": bson.A{
			bson.M{"classTeacher": tid},
			bson.M{"assignedTeachers": tid},
		}})
	type ClassItem struct {
		ID          string `json:"id"`
		Name        string `json:"name"`
		Section     string `json:"section"`
		Stream      string `json:"stream"`
		AcademicYear string `json:"academicYear"`
		MeetLink    string `json:"meetLink"`
		Students    int    `json:"students"`
	}
	var classes []ClassItem
	var digitalClasses []ClassItem
	if err == nil {
		defer classCur.Close(ctx)
		for classCur.Next(ctx) {
			var d bson.M
			if classCur.Decode(&d) != nil {
				continue
			}
			item := ClassItem{
				Name:    strVal(d, "name"),
				Section: strVal(d, "section"),
				Stream:  strVal(d, "stream"),
				MeetLink: strVal(d, "meetLink"),
			}
			if oid, ok := d["_id"].(primitive.ObjectID); ok {
				item.ID = oid.Hex()
			}
			if v, ok := d["academicYear"].(string); ok {
				item.AcademicYear = v
			}
			// Count students
			sc, _ := h.students.CountDocuments(ctx, bson.M{"schoolId": sid, "class": item.Name})
			item.Students = int(sc)
			classes = append(classes, item)
			if item.MeetLink != "" {
				digitalClasses = append(digitalClasses, item)
			}
		}
	}

	totalStudents := 0
	for _, cl := range classes {
		totalStudents += cl.Students
	}

	// Today's attendance
	today := time.Now().Format("2006-01-02")
	var attDoc bson.M
	attErr := h.attendance.Database().Collection("attendances").FindOne(ctx, bson.M{
		"schoolId": sid, "staffId": tid, "date": today,
	}).Decode(&attDoc)
	attendanceToday := "Not Marked"
	if attErr == nil {
		attendanceToday = strVal(attDoc, "status")
	}

	// Attendance rate (last 30 days)
	since := time.Now().AddDate(0, 0, -30).Format("2006-01-02")
	total30, _ := h.attendance.Database().Collection("attendances").CountDocuments(ctx,
		bson.M{"schoolId": sid, "staffId": tid, "date": bson.M{"$gte": since}})
	present30, _ := h.attendance.Database().Collection("attendances").CountDocuments(ctx,
		bson.M{"schoolId": sid, "staffId": tid, "date": bson.M{"$gte": since}, "status": "Present"})
	attRate := 0
	if total30 > 0 {
		attRate = int(present30 * 100 / total30)
	}

	if classes == nil {
		classes = []ClassItem{}
	}
	if digitalClasses == nil {
		digitalClasses = []ClassItem{}
	}
	return response.OK(c, fiber.Map{
		"stats": fiber.Map{
			"assignedClasses": len(classes),
			"totalStudents":   totalStudents,
			"digitalClasses":  len(digitalClasses),
			"attendanceToday": attendanceToday,
			"attendanceRate":  attRate,
		},
		"classes":        classes,
		"digitalClasses": digitalClasses,
		"notifications":  []interface{}{},
	})
}

func strVal(d bson.M, k string) string {
	if v, ok := d[k].(string); ok {
		return v
	}
	return ""
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
