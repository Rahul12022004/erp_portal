package repositories

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/erp-portal/go-backend/internal/modules/admissions/domain"
)

type InquiryRepo struct{ col *mongo.Collection }

func NewInquiryRepo(col *mongo.Collection) *InquiryRepo { return &InquiryRepo{col: col} }

func (r *InquiryRepo) FindBySchool(ctx context.Context, schoolID string) ([]*domain.AdmissionInquiry, error) {
	oid, _ := primitive.ObjectIDFromHex(schoolID)
	cur, err := r.col.Find(ctx, bson.M{"schoolId": oid},
		options.Find().SetSort(bson.M{"createdAt": -1}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var list []*domain.AdmissionInquiry
	for cur.Next(ctx) {
		var d bson.M
		if err := cur.Decode(&d); err == nil {
			list = append(list, fromBSON(d))
		}
	}
	return list, cur.Err()
}

func (r *InquiryRepo) FindByID(ctx context.Context, id string) (*domain.AdmissionInquiry, error) {
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

func (r *InquiryRepo) Create(ctx context.Context, a *domain.AdmissionInquiry) (*domain.AdmissionInquiry, error) {
	sid, _ := primitive.ObjectIDFromHex(a.SchoolID)
	now := time.Now()
	doc := bson.M{
		"_id":          primitive.NewObjectID(),
		"schoolId":     sid,
		"studentName":  a.StudentName,
		"parentName":   a.ParentName,
		"parentPhone":  a.ParentPhone,
		"parentEmail":  a.ParentEmail,
		"class":        a.Class,
		"academicYear": a.AcademicYear,
		"status":       "new",
		"remarks":      a.Remarks,
		"createdAt":    now,
		"updatedAt":    now,
	}
	if _, err := r.col.InsertOne(ctx, doc); err != nil {
		return nil, err
	}
	return fromBSON(doc), nil
}

func (r *InquiryRepo) Update(ctx context.Context, id string, updates map[string]interface{}) (*domain.AdmissionInquiry, error) {
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

func (r *InquiryRepo) Delete(ctx context.Context, id string) error {
	oid, _ := primitive.ObjectIDFromHex(id)
	_, err := r.col.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

func fromBSON(d bson.M) *domain.AdmissionInquiry {
	a := &domain.AdmissionInquiry{
		StudentName:  strVal(d, "studentName"),
		ParentName:   strVal(d, "parentName"),
		ParentPhone:  strVal(d, "parentPhone"),
		ParentEmail:  strVal(d, "parentEmail"),
		Class:        strVal(d, "class"),
		AcademicYear: strVal(d, "academicYear"),
		Status:       strVal(d, "status"),
		Remarks:      strVal(d, "remarks"),
	}
	if oid, ok := d["_id"].(primitive.ObjectID); ok {
		a.ID = oid.Hex()
	}
	if oid, ok := d["schoolId"].(primitive.ObjectID); ok {
		a.SchoolID = oid.Hex()
	}
	return a
}

func strVal(d bson.M, k string) string {
	if v, ok := d[k].(string); ok {
		return v
	}
	return ""
}
