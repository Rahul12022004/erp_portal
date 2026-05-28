package auditlog

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// Entry is one row in the auditlogs collection.
type Entry struct {
	ID        primitive.ObjectID `bson:"_id"       json:"_id"`
	Action    string             `bson:"action"    json:"action"`
	Message   string             `bson:"message"   json:"message"`
	User      string             `bson:"user"      json:"user"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
}

// Write inserts an audit log entry. Fire-and-forget — errors are silently dropped
// so a logging failure never breaks the main request flow.
func Write(col *mongo.Collection, action, message, user string) {
	if col == nil {
		return
	}
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		col.InsertOne(ctx, Entry{ //nolint:errcheck
			ID:        primitive.NewObjectID(),
			Action:    action,
			Message:   message,
			User:      user,
			CreatedAt: time.Now(),
		})
	}()
}
