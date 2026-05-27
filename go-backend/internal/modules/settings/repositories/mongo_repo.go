package repositories

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/erp-portal/go-backend/internal/modules/settings/domain"
)

type SettingsRepo struct{ col *mongo.Collection }

func New(col *mongo.Collection) *SettingsRepo { return &SettingsRepo{col: col} }

func (r *SettingsRepo) FindBySchool(ctx context.Context, schoolID string) (*domain.Settings, error) {
	oid, _ := primitive.ObjectIDFromHex(schoolID)
	var d bson.M
	err := r.col.FindOne(ctx, bson.M{"schoolId": oid}).Decode(&d)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return fromBSON(d), nil
}

func (r *SettingsRepo) Upsert(ctx context.Context, s *domain.Settings) (*domain.Settings, error) {
	oid, _ := primitive.ObjectIDFromHex(s.SchoolID)
	now := time.Now()

	periods := make(bson.A, len(s.Periods))
	for i, p := range s.Periods {
		periods[i] = bson.M{
			"index":     p.Index,
			"startTime": p.StartTime,
			"endTime":   p.EndTime,
			"isBreak":   p.IsBreak,
			"label":     p.Label,
		}
	}

	update := bson.M{
		"$set": bson.M{
			"academicYear": s.AcademicYear,
			"workingDays":  s.WorkingDays,
			"periods":      periods,
			"modules":      s.Modules,
			"updatedAt":    now,
		},
		"$setOnInsert": bson.M{"_id": primitive.NewObjectID(), "schoolId": oid, "createdAt": now},
	}
	opts := options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After)
	var d bson.M
	if err := r.col.FindOneAndUpdate(ctx, bson.M{"schoolId": oid}, update, opts).Decode(&d); err != nil {
		return nil, err
	}
	return fromBSON(d), nil
}

func fromBSON(d bson.M) *domain.Settings {
	s := &domain.Settings{
		AcademicYear: strVal(d, "academicYear"),
	}
	if oid, ok := d["_id"].(primitive.ObjectID); ok {
		s.ID = oid.Hex()
	}
	if oid, ok := d["schoolId"].(primitive.ObjectID); ok {
		s.SchoolID = oid.Hex()
	}
	if arr, ok := d["workingDays"].(primitive.A); ok {
		for _, v := range arr {
			if sv, ok := v.(string); ok {
				s.WorkingDays = append(s.WorkingDays, sv)
			}
		}
	}
	if arr, ok := d["periods"].(primitive.A); ok {
		for _, v := range arr {
			if pm, ok := v.(bson.M); ok {
				pc := domain.PeriodConfig{
					StartTime: strVal(pm, "startTime"),
					EndTime:   strVal(pm, "endTime"),
					Label:     strVal(pm, "label"),
				}
				if idx, ok := pm["index"].(int32); ok {
					pc.Index = int(idx)
				}
				if ib, ok := pm["isBreak"].(bool); ok {
					pc.IsBreak = ib
				}
				s.Periods = append(s.Periods, pc)
			}
		}
	}
	if mods, ok := d["modules"].(bson.M); ok {
		s.Modules = make(map[string]bool)
		for k, v := range mods {
			if bv, ok := v.(bool); ok {
				s.Modules[k] = bv
			}
		}
	}
	if ts, ok := d["createdAt"].(primitive.DateTime); ok {
		s.CreatedAt = ts.Time()
	}
	if ts, ok := d["updatedAt"].(primitive.DateTime); ok {
		s.UpdatedAt = ts.Time()
	}
	return s
}

func strVal(d bson.M, k string) string {
	if v, ok := d[k].(string); ok {
		return v
	}
	return ""
}
