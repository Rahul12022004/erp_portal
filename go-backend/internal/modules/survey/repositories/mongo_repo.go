package repositories

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/erp-portal/go-backend/internal/modules/survey/domain"
)

type SurveyRepo struct{ col *mongo.Collection }

func NewSurveyRepo(col *mongo.Collection) *SurveyRepo { return &SurveyRepo{col: col} }

func (r *SurveyRepo) FindBySchool(ctx context.Context, schoolID string) ([]*domain.Survey, error) {
	oid, _ := primitive.ObjectIDFromHex(schoolID)
	cur, err := r.col.Find(ctx, bson.M{"schoolId": oid},
		options.Find().SetSort(bson.M{"createdAt": -1}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var list []*domain.Survey
	for cur.Next(ctx) {
		var d bson.M
		if err := cur.Decode(&d); err == nil {
			list = append(list, fromBSON(d))
		}
	}
	return list, cur.Err()
}

func (r *SurveyRepo) Create(ctx context.Context, s *domain.Survey) (*domain.Survey, error) {
	sid, _ := primitive.ObjectIDFromHex(s.SchoolID)
	now := time.Now()
	doc := bson.M{
		"_id":         primitive.NewObjectID(),
		"schoolId":    sid,
		"title":       s.Title,
		"description": s.Description,
		"status":      "draft",
		"questions":   bson.A{},
		"createdAt":   now,
		"updatedAt":   now,
	}
	if _, err := r.col.InsertOne(ctx, doc); err != nil {
		return nil, err
	}
	return fromBSON(doc), nil
}

func (r *SurveyRepo) Delete(ctx context.Context, id string) error {
	oid, _ := primitive.ObjectIDFromHex(id)
	_, err := r.col.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

func fromBSON(d bson.M) *domain.Survey {
	s := &domain.Survey{
		Title:       strVal(d, "title"),
		Description: strVal(d, "description"),
		Status:      strVal(d, "status"),
	}
	if oid, ok := d["_id"].(primitive.ObjectID); ok {
		s.ID = oid.Hex()
	}
	if oid, ok := d["schoolId"].(primitive.ObjectID); ok {
		s.SchoolID = oid.Hex()
	}
	return s
}

func strVal(d bson.M, k string) string {
	if v, ok := d[k].(string); ok {
		return v
	}
	return ""
}
