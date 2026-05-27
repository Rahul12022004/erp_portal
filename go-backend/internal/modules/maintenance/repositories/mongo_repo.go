package repositories

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/erp-portal/go-backend/internal/modules/maintenance/domain"
)

type MaintenanceRepo struct{ col *mongo.Collection }

func NewMaintenanceRepo(col *mongo.Collection) *MaintenanceRepo { return &MaintenanceRepo{col: col} }

func (r *MaintenanceRepo) FindBySchool(ctx context.Context, schoolID, status string) ([]*domain.MaintenanceRequest, error) {
	oid, _ := primitive.ObjectIDFromHex(schoolID)
	filter := bson.M{"schoolId": oid}
	if status != "" {
		filter["status"] = status
	}
	cur, err := r.col.Find(ctx, filter, options.Find().SetSort(bson.M{"createdAt": -1}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var list []*domain.MaintenanceRequest
	for cur.Next(ctx) {
		var d bson.M
		if err := cur.Decode(&d); err == nil {
			list = append(list, fromBSON(d))
		}
	}
	return list, cur.Err()
}

func (r *MaintenanceRepo) Create(ctx context.Context, m *domain.MaintenanceRequest) (*domain.MaintenanceRequest, error) {
	sid, _ := primitive.ObjectIDFromHex(m.SchoolID)
	now := time.Now()
	doc := bson.M{
		"_id":         primitive.NewObjectID(),
		"schoolId":    sid,
		"title":       m.Title,
		"description": m.Description,
		"location":    m.Location,
		"priority":    m.Priority,
		"status":      "open",
		"reportedBy":  m.ReportedBy,
		"assignedTo":  m.AssignedTo,
		"createdAt":   now,
		"updatedAt":   now,
	}
	if _, err := r.col.InsertOne(ctx, doc); err != nil {
		return nil, err
	}
	return fromBSON(doc), nil
}

func (r *MaintenanceRepo) Update(ctx context.Context, id string, updates map[string]interface{}) (*domain.MaintenanceRequest, error) {
	oid, _ := primitive.ObjectIDFromHex(id)
	updates["updatedAt"] = time.Now()
	res := r.col.FindOneAndUpdate(ctx, bson.M{"_id": oid}, bson.M{"$set": updates},
		options.FindOneAndUpdate().SetReturnDocument(options.After))
	var d bson.M
	if err := res.Decode(&d); err != nil {
		return nil, err
	}
	return fromBSON(d), nil
}

func fromBSON(d bson.M) *domain.MaintenanceRequest {
	m := &domain.MaintenanceRequest{
		Title:       strVal(d, "title"),
		Description: strVal(d, "description"),
		Location:    strVal(d, "location"),
		Priority:    strVal(d, "priority"),
		Status:      strVal(d, "status"),
		ReportedBy:  strVal(d, "reportedBy"),
		AssignedTo:  strVal(d, "assignedTo"),
	}
	if oid, ok := d["_id"].(primitive.ObjectID); ok {
		m.ID = oid.Hex()
	}
	if oid, ok := d["schoolId"].(primitive.ObjectID); ok {
		m.SchoolID = oid.Hex()
	}
	if ts, ok := d["createdAt"].(primitive.DateTime); ok {
		m.CreatedAt = ts.Time()
	}
	return m
}

func strVal(d bson.M, k string) string {
	if v, ok := d[k].(string); ok {
		return v
	}
	return ""
}
