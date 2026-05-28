package repositories

import (
	"context"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/erp-portal/go-backend/internal/modules/socialmedia/domain"
)

type SocialMediaRepo struct{ col *mongo.Collection }

func New(col *mongo.Collection) *SocialMediaRepo { return &SocialMediaRepo{col: col} }

func (r *SocialMediaRepo) FindBySchool(ctx context.Context, schoolID string) ([]domain.SocialMediaAccount, error) {
	oid, err := primitive.ObjectIDFromHex(schoolID)
	if err != nil {
		return []domain.SocialMediaAccount{}, nil
	}
	cur, err := r.col.Find(ctx, bson.M{"schoolId": oid}, options.Find().SetSort(bson.M{"accountName": 1}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var list []domain.SocialMediaAccount
	if err := cur.All(ctx, &list); err != nil {
		return nil, err
	}
	if list == nil {
		list = []domain.SocialMediaAccount{}
	}
	return list, nil
}

func (r *SocialMediaRepo) Create(ctx context.Context, a *domain.SocialMediaAccount) (*domain.SocialMediaAccount, error) {
	a.ID = primitive.NewObjectID()
	if _, err := r.col.InsertOne(ctx, a); err != nil {
		return nil, err
	}
	return a, nil
}

func (r *SocialMediaRepo) Update(ctx context.Context, id string, a *domain.SocialMediaAccount) (*domain.SocialMediaAccount, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	update := bson.M{"$set": bson.M{
		"platform":    a.Platform,
		"accountName": a.AccountName,
		"profileUrl":  a.ProfileURL,
		"phoneNumber": a.PhoneNumber,
		"bio":         a.Bio,
		"isActive":    a.IsActive,
	}}
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var updated domain.SocialMediaAccount
	if err := r.col.FindOneAndUpdate(ctx, bson.M{"_id": oid}, update, opts).Decode(&updated); err != nil {
		return nil, err
	}
	return &updated, nil
}

func (r *SocialMediaRepo) Delete(ctx context.Context, id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.col.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}
