package repositories

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/erp-portal/go-backend/internal/modules/hostel/domain"
)

type HostelRepo struct{ col *mongo.Collection }

func NewHostelRepo(col *mongo.Collection) *HostelRepo { return &HostelRepo{col: col} }

func (r *HostelRepo) FindBySchool(ctx context.Context, schoolID string) ([]*domain.Hostel, error) {
	oid, _ := primitive.ObjectIDFromHex(schoolID)
	cur, err := r.col.Find(ctx, bson.M{"schoolId": oid},
		options.Find().SetSort(bson.M{"name": 1}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var list []*domain.Hostel
	for cur.Next(ctx) {
		var d bson.M
		if err := cur.Decode(&d); err == nil {
			list = append(list, fromBSON(d))
		}
	}
	return list, cur.Err()
}

func (r *HostelRepo) FindByID(ctx context.Context, id string) (*domain.Hostel, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var d bson.M
	if err := r.col.FindOne(ctx, bson.M{"_id": oid}).Decode(&d); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return fromBSON(d), nil
}

func (r *HostelRepo) Create(ctx context.Context, h *domain.Hostel) (*domain.Hostel, error) {
	sid, _ := primitive.ObjectIDFromHex(h.SchoolID)
	now := time.Now()
	doc := bson.M{
		"_id":              primitive.NewObjectID(),
		"schoolId":         sid,
		"name":             h.Name,
		"assignedStudents": bson.A{},
		"createdAt":        now,
		"updatedAt":        now,
	}
	if _, err := r.col.InsertOne(ctx, doc); err != nil {
		return nil, err
	}
	return fromBSON(doc), nil
}

func (r *HostelRepo) Update(ctx context.Context, id string, updates map[string]interface{}) (*domain.Hostel, error) {
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

func (r *HostelRepo) Delete(ctx context.Context, id string) error {
	oid, _ := primitive.ObjectIDFromHex(id)
	_, err := r.col.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

func fromBSON(d bson.M) *domain.Hostel {
	h := &domain.Hostel{Name: strVal(d, "name")}
	if oid, ok := d["_id"].(primitive.ObjectID); ok {
		h.ID = oid.Hex()
	}
	if oid, ok := d["schoolId"].(primitive.ObjectID); ok {
		h.SchoolID = oid.Hex()
	}
	if ts, ok := d["createdAt"].(primitive.DateTime); ok {
		h.CreatedAt = ts.Time()
	}
	return h
}

func strVal(d bson.M, k string) string {
	if v, ok := d[k].(string); ok {
		return v
	}
	return ""
}
