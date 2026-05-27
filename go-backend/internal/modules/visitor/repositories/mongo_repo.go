package repositories

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/erp-portal/go-backend/internal/modules/visitor/domain"
)

type VisitorRepo struct{ col *mongo.Collection }

func NewVisitorRepo(col *mongo.Collection) *VisitorRepo { return &VisitorRepo{col: col} }

func (r *VisitorRepo) FindBySchool(ctx context.Context, schoolID string) ([]*domain.Visitor, error) {
	oid, _ := primitive.ObjectIDFromHex(schoolID)
	cur, err := r.col.Find(ctx, bson.M{"schoolId": oid},
		options.Find().SetSort(bson.M{"checkIn": -1}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var list []*domain.Visitor
	for cur.Next(ctx) {
		var d bson.M
		if err := cur.Decode(&d); err == nil {
			list = append(list, fromBSON(d))
		}
	}
	return list, cur.Err()
}

func (r *VisitorRepo) CheckIn(ctx context.Context, v *domain.Visitor) (*domain.Visitor, error) {
	sid, _ := primitive.ObjectIDFromHex(v.SchoolID)
	now := time.Now()
	doc := bson.M{
		"_id":          primitive.NewObjectID(),
		"schoolId":     sid,
		"name":         v.Name,
		"phone":        v.Phone,
		"purpose":      v.Purpose,
		"personToMeet": v.PersonToMeet,
		"checkIn":      now,
		"status":       "checked_in",
		"createdAt":    now,
	}
	if _, err := r.col.InsertOne(ctx, doc); err != nil {
		return nil, err
	}
	return fromBSON(doc), nil
}

func (r *VisitorRepo) CheckOut(ctx context.Context, id string) (*domain.Visitor, error) {
	oid, _ := primitive.ObjectIDFromHex(id)
	now := time.Now()
	res := r.col.FindOneAndUpdate(ctx, bson.M{"_id": oid},
		bson.M{"$set": bson.M{"checkOut": now, "status": "checked_out"}},
		options.FindOneAndUpdate().SetReturnDocument(options.After))
	var d bson.M
	if err := res.Decode(&d); err != nil {
		return nil, err
	}
	return fromBSON(d), nil
}

func fromBSON(d bson.M) *domain.Visitor {
	v := &domain.Visitor{
		Name:         strVal(d, "name"),
		Phone:        strVal(d, "phone"),
		Purpose:      strVal(d, "purpose"),
		PersonToMeet: strVal(d, "personToMeet"),
		Status:       strVal(d, "status"),
	}
	if oid, ok := d["_id"].(primitive.ObjectID); ok {
		v.ID = oid.Hex()
	}
	if oid, ok := d["schoolId"].(primitive.ObjectID); ok {
		v.SchoolID = oid.Hex()
	}
	if ts, ok := d["checkIn"].(primitive.DateTime); ok {
		v.CheckIn = ts.Time()
	}
	if ts, ok := d["createdAt"].(primitive.DateTime); ok {
		v.CreatedAt = ts.Time()
	}
	return v
}

func strVal(d bson.M, k string) string {
	if v, ok := d[k].(string); ok {
		return v
	}
	return ""
}
