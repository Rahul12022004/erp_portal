package repositories

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/erp-portal/go-backend/internal/modules/academics/domain"
)

// ─── Class Repo ───────────────────────────────────────────────────────────────

type ClassRepo struct{ col *mongo.Collection }

func NewClassRepo(col *mongo.Collection) *ClassRepo { return &ClassRepo{col: col} }

func (r *ClassRepo) FindBySchool(ctx context.Context, schoolID string) ([]*domain.Class, error) {
	oid, _ := primitive.ObjectIDFromHex(schoolID)
	cur, err := r.col.Find(ctx, bson.M{"schoolId": oid},
		options.Find().SetSort(bson.M{"name": 1}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var list []*domain.Class
	for cur.Next(ctx) {
		var d bson.M
		if err := cur.Decode(&d); err == nil {
			list = append(list, classFromBSON(d))
		}
	}
	return list, cur.Err()
}

func (r *ClassRepo) FindByID(ctx context.Context, id string) (*domain.Class, error) {
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
	return classFromBSON(d), nil
}

func (r *ClassRepo) Create(ctx context.Context, c *domain.Class) (*domain.Class, error) {
	sid, _ := primitive.ObjectIDFromHex(c.SchoolID)
	doc := bson.M{
		"_id":          primitive.NewObjectID(),
		"schoolId":     sid,
		"name":         c.Name,
		"section":      c.Section,
		"stream":       c.Stream,
		"academicYear": c.AcademicYear,
		"description":  c.Description,
		"classCode":    c.ClassCode,
		"studentCount": 0,
		"createdAt":    time.Now(),
		"updatedAt":    time.Now(),
	}
	if _, err := r.col.InsertOne(ctx, doc); err != nil {
		return nil, err
	}
	return classFromBSON(doc), nil
}

func (r *ClassRepo) Update(ctx context.Context, id string, updates map[string]interface{}) (*domain.Class, error) {
	oid, _ := primitive.ObjectIDFromHex(id)
	updates["updatedAt"] = time.Now()
	res := r.col.FindOneAndUpdate(ctx, bson.M{"_id": oid}, bson.M{"$set": updates},
		options.FindOneAndUpdate().SetReturnDocument(options.After))
	var d bson.M
	if err := res.Decode(&d); err != nil {
		return nil, err
	}
	return classFromBSON(d), nil
}

func (r *ClassRepo) Delete(ctx context.Context, id string) error {
	oid, _ := primitive.ObjectIDFromHex(id)
	_, err := r.col.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

func classFromBSON(d bson.M) *domain.Class {
	c := &domain.Class{
		Name:         strVal(d, "name"),
		Section:      strVal(d, "section"),
		Stream:       strVal(d, "stream"),
		AcademicYear: strVal(d, "academicYear"),
		Description:  strVal(d, "description"),
		ClassCode:    strVal(d, "classCode"),
		StudentCount: intVal(d, "studentCount"),
	}
	if oid, ok := d["_id"].(primitive.ObjectID); ok {
		c.ID = oid.Hex()
	}
	if oid, ok := d["schoolId"].(primitive.ObjectID); ok {
		c.SchoolID = oid.Hex()
	}
	if oid, ok := d["classTeacher"].(primitive.ObjectID); ok {
		c.ClassTeacherID = oid.Hex()
	}
	if ts, ok := d["createdAt"].(primitive.DateTime); ok {
		c.CreatedAt = ts.Time()
	}
	if ts, ok := d["updatedAt"].(primitive.DateTime); ok {
		c.UpdatedAt = ts.Time()
	}
	return c
}

// ─── Attendance Repo ──────────────────────────────────────────────────────────

type AttendanceRepo struct{ col *mongo.Collection }

func NewAttendanceRepo(col *mongo.Collection) *AttendanceRepo { return &AttendanceRepo{col: col} }

func (r *AttendanceRepo) FindByDateAndClass(ctx context.Context, schoolID, classID, date string) ([]*domain.Attendance, error) {
	sid, _ := primitive.ObjectIDFromHex(schoolID)
	cid, _ := primitive.ObjectIDFromHex(classID)
	filter := bson.M{"schoolId": sid, "date": date}
	if classID != "" {
		filter["classId"] = cid
	}
	cur, err := r.col.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var list []*domain.Attendance
	for cur.Next(ctx) {
		var d bson.M
		if err := cur.Decode(&d); err == nil {
			list = append(list, attendanceFromBSON(d))
		}
	}
	return list, cur.Err()
}

func (r *AttendanceRepo) Upsert(ctx context.Context, a *domain.Attendance) (*domain.Attendance, error) {
	sid, _ := primitive.ObjectIDFromHex(a.SchoolID)
	filter := bson.M{"schoolId": sid, "date": a.Date}
	if a.StudentID != "" {
		sid2, _ := primitive.ObjectIDFromHex(a.StudentID)
		filter["studentId"] = sid2
	} else if a.StaffID != "" {
		tid, _ := primitive.ObjectIDFromHex(a.StaffID)
		filter["staffId"] = tid
	}

	update := bson.M{
		"$set": bson.M{
			"status":    a.Status,
			"remarks":   a.Remarks,
			"updatedAt": time.Now(),
		},
		"$setOnInsert": bson.M{
			"_id":       primitive.NewObjectID(),
			"createdAt": time.Now(),
		},
	}
	opts := options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After)
	var d bson.M
	if err := r.col.FindOneAndUpdate(ctx, filter, update, opts).Decode(&d); err != nil {
		return nil, err
	}
	return attendanceFromBSON(d), nil
}

func attendanceFromBSON(d bson.M) *domain.Attendance {
	a := &domain.Attendance{
		Date:    strVal(d, "date"),
		Status:  strVal(d, "status"),
		Remarks: strVal(d, "remarks"),
	}
	if oid, ok := d["_id"].(primitive.ObjectID); ok {
		a.ID = oid.Hex()
	}
	if oid, ok := d["schoolId"].(primitive.ObjectID); ok {
		a.SchoolID = oid.Hex()
	}
	if oid, ok := d["studentId"].(primitive.ObjectID); ok {
		a.StudentID = oid.Hex()
	}
	if oid, ok := d["staffId"].(primitive.ObjectID); ok {
		a.StaffID = oid.Hex()
	}
	return a
}

// ─── Exam Repo ────────────────────────────────────────────────────────────────

type ExamRepo struct{ col *mongo.Collection }

func NewExamRepo(col *mongo.Collection) *ExamRepo { return &ExamRepo{col: col} }

func (r *ExamRepo) FindBySchool(ctx context.Context, schoolID string) ([]*domain.Exam, error) {
	oid, _ := primitive.ObjectIDFromHex(schoolID)
	cur, err := r.col.Find(ctx, bson.M{"schoolId": oid},
		options.Find().SetSort(bson.M{"examDate": -1}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var list []*domain.Exam
	for cur.Next(ctx) {
		var d bson.M
		if err := cur.Decode(&d); err == nil {
			list = append(list, examFromBSON(d))
		}
	}
	return list, cur.Err()
}

func (r *ExamRepo) Create(ctx context.Context, e *domain.Exam) (*domain.Exam, error) {
	sid, _ := primitive.ObjectIDFromHex(e.SchoolID)
	cid, _ := primitive.ObjectIDFromHex(e.ClassID)
	doc := bson.M{
		"_id":        primitive.NewObjectID(),
		"schoolId":   sid,
		"classId":    cid,
		"title":      e.Title,
		"examType":   e.ExamType,
		"subject":    e.Subject,
		"examDate":   e.ExamDate,
		"startTime":  e.StartTime,
		"endTime":    e.EndTime,
		"totalMarks": e.TotalMarks,
		"passMarks":  e.PassMarks,
		"createdAt":  time.Now(),
		"updatedAt":  time.Now(),
	}
	if _, err := r.col.InsertOne(ctx, doc); err != nil {
		return nil, err
	}
	return examFromBSON(doc), nil
}

func examFromBSON(d bson.M) *domain.Exam {
	e := &domain.Exam{
		Title:      strVal(d, "title"),
		ExamType:   strVal(d, "examType"),
		Subject:    strVal(d, "subject"),
		ExamDate:   strVal(d, "examDate"),
		StartTime:  strVal(d, "startTime"),
		EndTime:    strVal(d, "endTime"),
		TotalMarks: floatVal(d, "totalMarks"),
		PassMarks:  floatVal(d, "passMarks"),
	}
	if oid, ok := d["_id"].(primitive.ObjectID); ok {
		e.ID = oid.Hex()
	}
	if oid, ok := d["schoolId"].(primitive.ObjectID); ok {
		e.SchoolID = oid.Hex()
	}
	if oid, ok := d["classId"].(primitive.ObjectID); ok {
		e.ClassID = oid.Hex()
	}
	return e
}

// ─── Mark Repo ────────────────────────────────────────────────────────────────

type MarkRepo struct{ col *mongo.Collection }

func NewMarkRepo(col *mongo.Collection) *MarkRepo { return &MarkRepo{col: col} }

func (r *MarkRepo) FindByExam(ctx context.Context, examID string) ([]*domain.Mark, error) {
	oid, _ := primitive.ObjectIDFromHex(examID)
	cur, err := r.col.Find(ctx, bson.M{"examId": oid})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var list []*domain.Mark
	for cur.Next(ctx) {
		var d bson.M
		if err := cur.Decode(&d); err == nil {
			list = append(list, markFromBSON(d))
		}
	}
	return list, cur.Err()
}

func (r *MarkRepo) Upsert(ctx context.Context, m *domain.Mark) (*domain.Mark, error) {
	eid, _ := primitive.ObjectIDFromHex(m.ExamID)
	stid, _ := primitive.ObjectIDFromHex(m.StudentID)
	filter := bson.M{"examId": eid, "studentId": stid}
	update := bson.M{
		"$set": bson.M{
			"marksObt":   m.MarksObt,
			"totalMarks": m.TotalMarks,
			"grade":      m.Grade,
			"remarks":    m.Remarks,
			"updatedAt":  time.Now(),
		},
		"$setOnInsert": bson.M{"_id": primitive.NewObjectID(), "createdAt": time.Now()},
	}
	opts := options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After)
	var d bson.M
	if err := r.col.FindOneAndUpdate(ctx, filter, update, opts).Decode(&d); err != nil {
		return nil, err
	}
	return markFromBSON(d), nil
}

func markFromBSON(d bson.M) *domain.Mark {
	mk := &domain.Mark{
		MarksObt:   floatVal(d, "marksObt"),
		TotalMarks: floatVal(d, "totalMarks"),
		Grade:      strVal(d, "grade"),
		Remarks:    strVal(d, "remarks"),
	}
	if oid, ok := d["_id"].(primitive.ObjectID); ok {
		mk.ID = oid.Hex()
	}
	if oid, ok := d["examId"].(primitive.ObjectID); ok {
		mk.ExamID = oid.Hex()
	}
	if oid, ok := d["studentId"].(primitive.ObjectID); ok {
		mk.StudentID = oid.Hex()
	}
	return mk
}

// ─── bson helpers ─────────────────────────────────────────────────────────────

func strVal(d bson.M, key string) string {
	if v, ok := d[key].(string); ok {
		return v
	}
	return ""
}

func intVal(d bson.M, key string) int {
	switch v := d[key].(type) {
	case int:
		return v
	case int32:
		return int(v)
	case int64:
		return int(v)
	case float64:
		return int(v)
	}
	return 0
}

func floatVal(d bson.M, key string) float64 {
	switch v := d[key].(type) {
	case float64:
		return v
	case int:
		return float64(v)
	case int32:
		return float64(v)
	case int64:
		return float64(v)
	}
	return 0
}
