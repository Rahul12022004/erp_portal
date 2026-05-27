package repositories

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/erp-portal/go-backend/internal/modules/notifications/domain"
)

type NotificationRepo struct{ col *mongo.Collection }

func NewNotificationRepo(col *mongo.Collection) *NotificationRepo {
	return &NotificationRepo{col: col}
}

func (r *NotificationRepo) FindByUser(ctx context.Context, userID string) ([]*domain.Notification, error) {
	uid, _ := primitive.ObjectIDFromHex(userID)
	cur, err := r.col.Find(ctx, bson.M{"userId": uid},
		options.Find().SetSort(bson.M{"createdAt": -1}).SetLimit(50))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var list []*domain.Notification
	for cur.Next(ctx) {
		var d bson.M
		if err := cur.Decode(&d); err == nil {
			list = append(list, fromBSON(d))
		}
	}
	return list, cur.Err()
}

func (r *NotificationRepo) Create(ctx context.Context, n *domain.Notification) (*domain.Notification, error) {
	sid, _ := primitive.ObjectIDFromHex(n.SchoolID)
	uid, _ := primitive.ObjectIDFromHex(n.UserID)
	doc := bson.M{
		"_id":       primitive.NewObjectID(),
		"schoolId":  sid,
		"userId":    uid,
		"title":     n.Title,
		"body":      n.Body,
		"type":      n.Type,
		"isRead":    false,
		"createdAt": time.Now(),
	}
	if _, err := r.col.InsertOne(ctx, doc); err != nil {
		return nil, err
	}
	return fromBSON(doc), nil
}

func (r *NotificationRepo) MarkRead(ctx context.Context, id string) error {
	oid, _ := primitive.ObjectIDFromHex(id)
	_, err := r.col.UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$set": bson.M{"isRead": true}})
	return err
}

func fromBSON(d bson.M) *domain.Notification {
	n := &domain.Notification{
		Title:  strVal(d, "title"),
		Body:   strVal(d, "body"),
		Type:   strVal(d, "type"),
		IsRead: boolVal(d, "isRead"),
	}
	if oid, ok := d["_id"].(primitive.ObjectID); ok {
		n.ID = oid.Hex()
	}
	if oid, ok := d["schoolId"].(primitive.ObjectID); ok {
		n.SchoolID = oid.Hex()
	}
	if oid, ok := d["userId"].(primitive.ObjectID); ok {
		n.UserID = oid.Hex()
	}
	if ts, ok := d["createdAt"].(primitive.DateTime); ok {
		n.CreatedAt = ts.Time()
	}
	return n
}

func strVal(d bson.M, k string) string {
	if v, ok := d[k].(string); ok {
		return v
	}
	return ""
}

func boolVal(d bson.M, k string) bool {
	if v, ok := d[k].(bool); ok {
		return v
	}
	return false
}
