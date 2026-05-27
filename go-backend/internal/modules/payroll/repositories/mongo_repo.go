package repositories

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/erp-portal/go-backend/internal/modules/payroll/domain"
)

type PayrollRepo struct{ col *mongo.Collection }

func New(col *mongo.Collection) *PayrollRepo { return &PayrollRepo{col: col} }

func (r *PayrollRepo) Find(ctx context.Context, schoolID string, month, year int, status string) ([]*domain.PayrollEntry, error) {
	oid, _ := primitive.ObjectIDFromHex(schoolID)
	filter := bson.M{"schoolId": oid}
	if month > 0 {
		filter["month"] = month
	}
	if year > 0 {
		filter["year"] = year
	}
	if status != "" {
		filter["status"] = status
	}
	cur, err := r.col.Find(ctx, filter, options.Find().SetSort(bson.M{"staffName": 1}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var list []*domain.PayrollEntry
	for cur.Next(ctx) {
		var d bson.M
		if err := cur.Decode(&d); err == nil {
			list = append(list, fromBSON(d))
		}
	}
	return list, cur.Err()
}

func (r *PayrollRepo) Create(ctx context.Context, e *domain.PayrollEntry) (*domain.PayrollEntry, error) {
	sid, _ := primitive.ObjectIDFromHex(e.SchoolID)
	now := time.Now()
	doc := bson.M{
		"_id":         primitive.NewObjectID(),
		"schoolId":    sid,
		"staffId":     e.StaffID,
		"staffName":   e.StaffName,
		"month":       e.Month,
		"year":        e.Year,
		"basicSalary": e.BasicSalary,
		"allowances":  e.Allowances,
		"deductions":  e.Deductions,
		"netSalary":   e.NetSalary,
		"status":      "pending",
		"createdAt":   now,
		"updatedAt":   now,
	}
	if _, err := r.col.InsertOne(ctx, doc); err != nil {
		return nil, err
	}
	return fromBSON(doc), nil
}

func (r *PayrollRepo) Update(ctx context.Context, id string, updates map[string]interface{}) (*domain.PayrollEntry, error) {
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

func fromBSON(d bson.M) *domain.PayrollEntry {
	e := &domain.PayrollEntry{
		StaffID:   strVal(d, "staffId"),
		StaffName: strVal(d, "staffName"),
		Status:    strVal(d, "status"),
	}
	if oid, ok := d["_id"].(primitive.ObjectID); ok {
		e.ID = oid.Hex()
	}
	if oid, ok := d["schoolId"].(primitive.ObjectID); ok {
		e.SchoolID = oid.Hex()
	}
	if v, ok := d["month"].(int32); ok {
		e.Month = int(v)
	}
	if v, ok := d["year"].(int32); ok {
		e.Year = int(v)
	}
	if v, ok := d["basicSalary"].(float64); ok {
		e.BasicSalary = v
	}
	if v, ok := d["allowances"].(float64); ok {
		e.Allowances = v
	}
	if v, ok := d["deductions"].(float64); ok {
		e.Deductions = v
	}
	if v, ok := d["netSalary"].(float64); ok {
		e.NetSalary = v
	}
	if ts, ok := d["createdAt"].(primitive.DateTime); ok {
		e.CreatedAt = ts.Time()
	}
	if ts, ok := d["updatedAt"].(primitive.DateTime); ok {
		e.UpdatedAt = ts.Time()
	}
	return e
}

func strVal(d bson.M, k string) string {
	if v, ok := d[k].(string); ok {
		return v
	}
	return ""
}
