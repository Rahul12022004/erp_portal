package repositories

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/erp-portal/go-backend/internal/modules/communication/domain"
)

// ─── Announcement Repo ────────────────────────────────────────────────────────

type AnnouncementRepo struct{ col *mongo.Collection }

func NewAnnouncementRepo(col *mongo.Collection) *AnnouncementRepo {
	return &AnnouncementRepo{col: col}
}

func (r *AnnouncementRepo) FindBySchool(ctx context.Context, schoolID string) ([]*domain.Announcement, error) {
	oid, _ := primitive.ObjectIDFromHex(schoolID)
	cur, err := r.col.Find(ctx, bson.M{"schoolId": oid},
		options.Find().SetSort(bson.M{"createdAt": -1}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var list []*domain.Announcement
	for cur.Next(ctx) {
		var d bson.M
		if err := cur.Decode(&d); err == nil {
			list = append(list, announcementFromBSON(d))
		}
	}
	return list, cur.Err()
}

func (r *AnnouncementRepo) Create(ctx context.Context, a *domain.Announcement) (*domain.Announcement, error) {
	sid, _ := primitive.ObjectIDFromHex(a.SchoolID)
	now := time.Now()
	doc := bson.M{
		"_id":       primitive.NewObjectID(),
		"schoolId":  sid,
		"title":     a.Title,
		"message":   a.Message,
		"author":    a.Author,
		"createdAt": now,
		"updatedAt": now,
	}
	if _, err := r.col.InsertOne(ctx, doc); err != nil {
		return nil, err
	}
	return announcementFromBSON(doc), nil
}

func (r *AnnouncementRepo) Delete(ctx context.Context, id string) error {
	oid, _ := primitive.ObjectIDFromHex(id)
	_, err := r.col.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

func announcementFromBSON(d bson.M) *domain.Announcement {
	a := &domain.Announcement{
		Title:   strVal(d, "title"),
		Message: strVal(d, "message"),
		Author:  strVal(d, "author"),
	}
	if oid, ok := d["_id"].(primitive.ObjectID); ok {
		a.ID = oid.Hex()
	}
	if oid, ok := d["schoolId"].(primitive.ObjectID); ok {
		a.SchoolID = oid.Hex()
	}
	if ts, ok := d["createdAt"].(primitive.DateTime); ok {
		a.CreatedAt = ts.Time()
	}
	return a
}

// ─── Campaign Repo ────────────────────────────────────────────────────────────

type CampaignRepo struct{ col *mongo.Collection }

func NewCampaignRepo(col *mongo.Collection) *CampaignRepo { return &CampaignRepo{col: col} }

func (r *CampaignRepo) FindBySchool(ctx context.Context, schoolID string) ([]*domain.Campaign, error) {
	oid, _ := primitive.ObjectIDFromHex(schoolID)
	cur, err := r.col.Find(ctx, bson.M{"schoolId": oid},
		options.Find().SetSort(bson.M{"createdAt": -1}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var list []*domain.Campaign
	for cur.Next(ctx) {
		var d bson.M
		if err := cur.Decode(&d); err == nil {
			list = append(list, campaignFromBSON(d))
		}
	}
	return list, cur.Err()
}

func (r *CampaignRepo) Create(ctx context.Context, c *domain.Campaign) (*domain.Campaign, error) {
	sid, _ := primitive.ObjectIDFromHex(c.SchoolID)
	now := time.Now()
	doc := bson.M{
		"_id":        primitive.NewObjectID(),
		"schoolId":   sid,
		"title":      c.Title,
		"message":    c.Message,
		"targetType": c.TargetType,
		"targetId":   c.TargetID,
		"status":     c.Status,
		"createdAt":  now,
		"updatedAt":  now,
	}
	if _, err := r.col.InsertOne(ctx, doc); err != nil {
		return nil, err
	}
	return campaignFromBSON(doc), nil
}

func campaignFromBSON(d bson.M) *domain.Campaign {
	c := &domain.Campaign{
		Title:      strVal(d, "title"),
		Message:    strVal(d, "message"),
		TargetType: strVal(d, "targetType"),
		TargetID:   strVal(d, "targetId"),
		Status:     strVal(d, "status"),
	}
	if oid, ok := d["_id"].(primitive.ObjectID); ok {
		c.ID = oid.Hex()
	}
	if oid, ok := d["schoolId"].(primitive.ObjectID); ok {
		c.SchoolID = oid.Hex()
	}
	if ts, ok := d["createdAt"].(primitive.DateTime); ok {
		c.CreatedAt = ts.Time()
	}
	return c
}

// ─── helpers ──────────────────────────────────────────────────────────────────

func strVal(d bson.M, k string) string {
	if v, ok := d[k].(string); ok {
		return v
	}
	return ""
}
