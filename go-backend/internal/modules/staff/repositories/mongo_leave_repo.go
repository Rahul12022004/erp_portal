package repositories

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/erp-portal/go-backend/internal/modules/staff/domain"
)

type mongoLeaveDoc struct {
	ID          primitive.ObjectID `bson:"_id,omitempty"`
	SchoolID    primitive.ObjectID `bson:"schoolId"`
	TeacherID   primitive.ObjectID `bson:"teacherId"`
	Title       string             `bson:"title"`
	Description string             `bson:"description"`
	LeaveType   string             `bson:"leaveType"`
	Status      string             `bson:"status"`
	FileName    string             `bson:"fileName"`
	FileData    string             `bson:"fileData"`
	CreatedAt   time.Time          `bson:"createdAt"`
	UpdatedAt   time.Time          `bson:"updatedAt"`
}

func leaveFromDoc(d *mongoLeaveDoc) *domain.LeaveApplication {
	return &domain.LeaveApplication{
		ID:          d.ID.Hex(),
		SchoolID:    d.SchoolID.Hex(),
		TeacherID:   d.TeacherID.Hex(),
		Title:       d.Title,
		Description: d.Description,
		LeaveType:   d.LeaveType,
		Status:      d.Status,
		FileName:    d.FileName,
		FileData:    d.FileData,
		CreatedAt:   d.CreatedAt,
		UpdatedAt:   d.UpdatedAt,
	}
}

// MongoLeaveRepo implements LeaveRepository.
type MongoLeaveRepo struct{ col *mongo.Collection }

func NewMongoLeaveRepo(col *mongo.Collection) LeaveRepository {
	return &MongoLeaveRepo{col: col}
}

func (r *MongoLeaveRepo) FindBySchool(ctx context.Context, schoolID string) ([]*domain.LeaveApplication, error) {
	oid, err := primitive.ObjectIDFromHex(schoolID)
	if err != nil {
		return nil, err
	}
	opts := options.Find().SetSort(bson.M{"createdAt": -1})
	cur, err := r.col.Find(ctx, bson.M{"schoolId": oid}, opts)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var list []*domain.LeaveApplication
	for cur.Next(ctx) {
		var d mongoLeaveDoc
		if err := cur.Decode(&d); err == nil {
			list = append(list, leaveFromDoc(&d))
		}
	}
	return list, cur.Err()
}

func (r *MongoLeaveRepo) FindByTeacher(ctx context.Context, schoolID, teacherID string) ([]*domain.LeaveApplication, error) {
	sid, _ := primitive.ObjectIDFromHex(schoolID)
	tid, _ := primitive.ObjectIDFromHex(teacherID)
	cur, err := r.col.Find(ctx, bson.M{"schoolId": sid, "teacherId": tid},
		options.Find().SetSort(bson.M{"createdAt": -1}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var list []*domain.LeaveApplication
	for cur.Next(ctx) {
		var d mongoLeaveDoc
		if err := cur.Decode(&d); err == nil {
			list = append(list, leaveFromDoc(&d))
		}
	}
	return list, cur.Err()
}

func (r *MongoLeaveRepo) FindByID(ctx context.Context, id string) (*domain.LeaveApplication, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var d mongoLeaveDoc
	if err := r.col.FindOne(ctx, bson.M{"_id": oid}).Decode(&d); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return leaveFromDoc(&d), nil
}

func (r *MongoLeaveRepo) Create(ctx context.Context, l *domain.LeaveApplication) (*domain.LeaveApplication, error) {
	sid, _ := primitive.ObjectIDFromHex(l.SchoolID)
	tid, _ := primitive.ObjectIDFromHex(l.TeacherID)
	now := time.Now()
	doc := mongoLeaveDoc{
		ID:          primitive.NewObjectID(),
		SchoolID:    sid,
		TeacherID:   tid,
		Title:       l.Title,
		Description: l.Description,
		LeaveType:   l.LeaveType,
		Status:      "Pending",
		FileName:    l.FileName,
		FileData:    l.FileData,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if _, err := r.col.InsertOne(ctx, doc); err != nil {
		return nil, err
	}
	return leaveFromDoc(&doc), nil
}

func (r *MongoLeaveRepo) UpdateStatus(ctx context.Context, id, status string) (*domain.LeaveApplication, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	res := r.col.FindOneAndUpdate(ctx, bson.M{"_id": oid},
		bson.M{"$set": bson.M{"status": status, "updatedAt": time.Now()}},
		options.FindOneAndUpdate().SetReturnDocument(options.After))
	var d mongoLeaveDoc
	if err := res.Decode(&d); err != nil {
		return nil, err
	}
	return leaveFromDoc(&d), nil
}
