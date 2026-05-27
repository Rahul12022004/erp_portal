package repositories

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/erp-portal/go-backend/internal/modules/transport/domain"
)

type TransportRepo struct{ col *mongo.Collection }

func NewTransportRepo(col *mongo.Collection) *TransportRepo { return &TransportRepo{col: col} }

func (r *TransportRepo) FindBySchool(ctx context.Context, schoolID string) ([]*domain.Transport, error) {
	oid, _ := primitive.ObjectIDFromHex(schoolID)
	cur, err := r.col.Find(ctx, bson.M{"schoolId": oid},
		options.Find().SetSort(bson.M{"busNumber": 1}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var list []*domain.Transport
	for cur.Next(ctx) {
		var d bson.M
		if err := cur.Decode(&d); err == nil {
			list = append(list, fromBSON(d))
		}
	}
	return list, cur.Err()
}

func (r *TransportRepo) FindByID(ctx context.Context, id string) (*domain.Transport, error) {
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

func (r *TransportRepo) Create(ctx context.Context, t *domain.Transport) (*domain.Transport, error) {
	sid, _ := primitive.ObjectIDFromHex(t.SchoolID)
	now := time.Now()
	doc := bson.M{
		"_id":                 primitive.NewObjectID(),
		"schoolId":            sid,
		"busNumber":           t.BusNumber,
		"routeName":           t.RouteName,
		"driverName":          t.DriverName,
		"driverPhone":         t.DriverPhone,
		"driverLicenseNumber": t.DriverLicenseNumber,
		"conductorName":       t.ConductorName,
		"conductorPhone":      t.ConductorPhone,
		"routeStops":          t.RouteStops,
		"assignedStudents":    bson.A{},
		"createdAt":           now,
		"updatedAt":           now,
	}
	if _, err := r.col.InsertOne(ctx, doc); err != nil {
		return nil, err
	}
	return fromBSON(doc), nil
}

func (r *TransportRepo) Update(ctx context.Context, id string, updates map[string]interface{}) (*domain.Transport, error) {
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

func (r *TransportRepo) Delete(ctx context.Context, id string) error {
	oid, _ := primitive.ObjectIDFromHex(id)
	_, err := r.col.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

func fromBSON(d bson.M) *domain.Transport {
	t := &domain.Transport{
		BusNumber:           strVal(d, "busNumber"),
		RouteName:           strVal(d, "routeName"),
		DriverName:          strVal(d, "driverName"),
		DriverPhone:         strVal(d, "driverPhone"),
		DriverLicenseNumber: strVal(d, "driverLicenseNumber"),
		ConductorName:       strVal(d, "conductorName"),
		ConductorPhone:      strVal(d, "conductorPhone"),
		RcExpiryDate:        strVal(d, "rcExpiryDate"),
		PollutionExpiryDate: strVal(d, "pollutionExpiryDate"),
		InsuranceExpiryDate: strVal(d, "insuranceExpiryDate"),
		FitnessExpiryDate:   strVal(d, "fitnessExpiryDate"),
	}
	if oid, ok := d["_id"].(primitive.ObjectID); ok {
		t.ID = oid.Hex()
	}
	if oid, ok := d["schoolId"].(primitive.ObjectID); ok {
		t.SchoolID = oid.Hex()
	}
	if stops, ok := d["routeStops"].(bson.A); ok {
		for _, s := range stops {
			if sv, ok := s.(string); ok {
				t.RouteStops = append(t.RouteStops, sv)
			}
		}
	}
	if ts, ok := d["createdAt"].(primitive.DateTime); ok {
		t.CreatedAt = ts.Time()
	}
	return t
}

func strVal(d bson.M, k string) string {
	if v, ok := d[k].(string); ok {
		return v
	}
	return ""
}
