package repositories

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/erp-portal/go-backend/internal/modules/timetable/domain"
)

type TimetableRepo struct {
	slots   *mongo.Collection
	periods *mongo.Collection
}

func New(slots, periods *mongo.Collection) *TimetableRepo {
	return &TimetableRepo{slots: slots, periods: periods}
}

func (r *TimetableRepo) FindSlots(ctx context.Context, schoolID string) ([]*domain.TimeSlot, error) {
	oid, _ := primitive.ObjectIDFromHex(schoolID)
	cur, err := r.slots.Find(ctx, bson.M{"schoolId": oid}, options.Find().SetSort(bson.M{"index": 1}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var list []*domain.TimeSlot
	for cur.Next(ctx) {
		var d bson.M
		if err := cur.Decode(&d); err == nil {
			list = append(list, slotFromBSON(d))
		}
	}
	return list, cur.Err()
}

func (r *TimetableRepo) CreateSlot(ctx context.Context, s *domain.TimeSlot) (*domain.TimeSlot, error) {
	oid, _ := primitive.ObjectIDFromHex(s.SchoolID)
	doc := bson.M{
		"_id":       primitive.NewObjectID(),
		"schoolId":  oid,
		"index":     s.Index,
		"startTime": s.StartTime,
		"endTime":   s.EndTime,
		"isBreak":   s.IsBreak,
		"label":     s.Label,
		"createdAt": time.Now(),
	}
	if _, err := r.slots.InsertOne(ctx, doc); err != nil {
		return nil, err
	}
	return slotFromBSON(doc), nil
}

func (r *TimetableRepo) FindPeriods(ctx context.Context, schoolID, classID, day string) ([]*domain.Period, error) {
	oid, _ := primitive.ObjectIDFromHex(schoolID)
	filter := bson.M{"schoolId": oid}
	if classID != "" {
		cid, _ := primitive.ObjectIDFromHex(classID)
		filter["classId"] = cid
	}
	if day != "" {
		filter["day"] = day
	}
	cur, err := r.periods.Find(ctx, filter, options.Find().SetSort(bson.M{"slotIndex": 1}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var list []*domain.Period
	for cur.Next(ctx) {
		var d bson.M
		if err := cur.Decode(&d); err == nil {
			list = append(list, periodFromBSON(d))
		}
	}
	return list, cur.Err()
}

func (r *TimetableRepo) UpsertPeriod(ctx context.Context, p *domain.Period) (*domain.Period, error) {
	sid, _ := primitive.ObjectIDFromHex(p.SchoolID)
	cid, _ := primitive.ObjectIDFromHex(p.ClassID)
	now := time.Now()
	filter := bson.M{"schoolId": sid, "classId": cid, "day": p.Day, "slotIndex": p.SlotIndex}
	update := bson.M{"$set": bson.M{
		"subject":   p.Subject,
		"teacherId": p.TeacherID,
		"roomId":    p.RoomID,
		"locked":    p.Locked,
		"updatedAt": now,
	}, "$setOnInsert": bson.M{"_id": primitive.NewObjectID(), "createdAt": now}}
	opts := options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After)
	var d bson.M
	if err := r.periods.FindOneAndUpdate(ctx, filter, update, opts).Decode(&d); err != nil {
		return nil, err
	}
	return periodFromBSON(d), nil
}

func (r *TimetableRepo) DeletePeriod(ctx context.Context, id string) error {
	oid, _ := primitive.ObjectIDFromHex(id)
	_, err := r.periods.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

func slotFromBSON(d bson.M) *domain.TimeSlot {
	s := &domain.TimeSlot{
		StartTime: strVal(d, "startTime"),
		EndTime:   strVal(d, "endTime"),
		Label:     strVal(d, "label"),
	}
	if oid, ok := d["_id"].(primitive.ObjectID); ok {
		s.ID = oid.Hex()
	}
	if oid, ok := d["schoolId"].(primitive.ObjectID); ok {
		s.SchoolID = oid.Hex()
	}
	if v, ok := d["index"].(int32); ok {
		s.Index = int(v)
	}
	if v, ok := d["isBreak"].(bool); ok {
		s.IsBreak = v
	}
	if ts, ok := d["createdAt"].(primitive.DateTime); ok {
		s.CreatedAt = ts.Time()
	}
	return s
}

func periodFromBSON(d bson.M) *domain.Period {
	p := &domain.Period{
		Day:       strVal(d, "day"),
		Subject:   strVal(d, "subject"),
		TeacherID: strVal(d, "teacherId"),
		RoomID:    strVal(d, "roomId"),
	}
	if oid, ok := d["_id"].(primitive.ObjectID); ok {
		p.ID = oid.Hex()
	}
	if oid, ok := d["schoolId"].(primitive.ObjectID); ok {
		p.SchoolID = oid.Hex()
	}
	if oid, ok := d["classId"].(primitive.ObjectID); ok {
		p.ClassID = oid.Hex()
	}
	if v, ok := d["slotIndex"].(int32); ok {
		p.SlotIndex = int(v)
	}
	if v, ok := d["locked"].(bool); ok {
		p.Locked = v
	}
	if ts, ok := d["createdAt"].(primitive.DateTime); ok {
		p.CreatedAt = ts.Time()
	}
	if ts, ok := d["updatedAt"].(primitive.DateTime); ok {
		p.UpdatedAt = ts.Time()
	}
	return p
}

func strVal(d bson.M, k string) string {
	if v, ok := d[k].(string); ok {
		return v
	}
	return ""
}
