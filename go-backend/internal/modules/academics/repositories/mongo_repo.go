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
	if err := cur.Err(); err != nil {
		return nil, err
	}

	// Dynamically compute per-class student counts
	if len(list) > 0 {
		studentsCol := r.col.Database().Collection("students")
		pipeline := mongo.Pipeline{
			{{Key: "$match", Value: bson.M{"schoolId": oid}}},
			{{Key: "$group", Value: bson.M{"_id": "$class_id", "count": bson.M{"$sum": 1}}}},
		}
		cntCur, cntErr := studentsCol.Aggregate(ctx, pipeline)
		if cntErr == nil {
			defer cntCur.Close(ctx)
			counts := make(map[string]int)
			for cntCur.Next(ctx) {
				var row bson.M
				if cntCur.Decode(&row) == nil {
					if id, ok := row["_id"].(primitive.ObjectID); ok {
						counts[id.Hex()] = intVal(row, "count")
					}
				}
			}
			for _, cl := range list {
				if n, ok := counts[cl.ID]; ok {
					cl.StudentCount = n
				}
			}
		}
	}

	return list, nil
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

func (r *AttendanceRepo) Col() *mongo.Collection { return r.col }

func (r *AttendanceRepo) FindByDateAndClass(ctx context.Context, schoolID, classID, date string) ([]*domain.Attendance, error) {
	sid, _ := primitive.ObjectIDFromHex(schoolID)
	cid, _ := primitive.ObjectIDFromHex(classID)
	filter := bson.M{"schoolId": sid, "date": date}
	if classID != "" {
		filter["classId"] = cid
	}
	cur, err := r.col.Find(ctx, filter, options.Find().SetLimit(500))
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

// FindBySchoolAndDate — all attendance records for a school on a specific date
func (r *AttendanceRepo) FindBySchoolAndDate(ctx context.Context, schoolID, date string) ([]*domain.Attendance, error) {
	sid, _ := primitive.ObjectIDFromHex(schoolID)
	cur, err := r.col.Find(ctx, bson.M{"schoolId": sid, "date": date}, options.Find().SetLimit(500))
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

// FindByDateRange — attendance records for a school within a date range
func (r *AttendanceRepo) FindByDateRange(ctx context.Context, schoolID, startDate, endDate string) ([]*domain.Attendance, error) {
	sid, _ := primitive.ObjectIDFromHex(schoolID)
	filter := bson.M{"schoolId": sid}
	if startDate != "" || endDate != "" {
		dateFilter := bson.M{}
		if startDate != "" {
			dateFilter["$gte"] = startDate
		}
		if endDate != "" {
			dateFilter["$lte"] = endDate
		}
		filter["date"] = dateFilter
	}
	cur, err := r.col.Find(ctx, filter, options.Find().SetSort(bson.M{"date": 1}).SetLimit(2000))
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

// FindByStudentIDsAndDate — attendance for a set of studentIds on a specific date
func (r *AttendanceRepo) FindByStudentIDsAndDate(ctx context.Context, studentIDs []primitive.ObjectID, date string) ([]*domain.Attendance, error) {
	if len(studentIDs) == 0 {
		return nil, nil
	}
	cur, err := r.col.Find(ctx, bson.M{
		"studentId": bson.M{"$in": studentIDs},
		"date":      date,
	})
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

// FindSelf — self-marked attendance for a teacher on a specific date
func (r *AttendanceRepo) FindSelf(ctx context.Context, schoolID, staffID, date string) (*domain.Attendance, error) {
	sid, _ := primitive.ObjectIDFromHex(schoolID)
	tid, _ := primitive.ObjectIDFromHex(staffID)
	var d bson.M
	err := r.col.FindOne(ctx, bson.M{
		"schoolId": sid,
		"staffId":  tid,
		"date":     date,
	}).Decode(&d)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return attendanceFromBSON(d), nil
}

// UpsertSelf — upsert a self-marked attendance record with geolocation data
func (r *AttendanceRepo) UpsertSelf(ctx context.Context, a *domain.Attendance) (*domain.Attendance, error) {
	sid, _ := primitive.ObjectIDFromHex(a.SchoolID)
	tid, _ := primitive.ObjectIDFromHex(a.StaffID)
	filter := bson.M{"schoolId": sid, "staffId": tid, "date": a.Date}
	update := bson.M{
		"$set": bson.M{
			"status":                     a.Status,
			"remarks":                    a.Remarks,
			"selfMarked":                 true,
			"isOutsideSchool":            a.IsOutsideSchool,
			"distanceFromSchoolMeters":   a.DistanceFromSchoolMeters,
			"updatedAt":                  time.Now(),
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

// LockSelf — mark a teacher's self attendance as locked
func (r *AttendanceRepo) LockSelf(ctx context.Context, schoolID, staffID, date string) (*domain.Attendance, error) {
	sid, _ := primitive.ObjectIDFromHex(schoolID)
	tid, _ := primitive.ObjectIDFromHex(staffID)
	filter := bson.M{"schoolId": sid, "staffId": tid, "date": date}
	update := bson.M{"$set": bson.M{"selfLocked": true, "updatedAt": time.Now()}}
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	var d bson.M
	if err := r.col.FindOneAndUpdate(ctx, filter, update, opts).Decode(&d); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return attendanceFromBSON(d), nil
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
	if v, ok := d["selfMarked"].(bool); ok {
		a.SelfMarked = v
	}
	if v, ok := d["selfLocked"].(bool); ok {
		a.SelfLocked = v
	}
	if v, ok := d["isOutsideSchool"].(bool); ok {
		a.IsOutsideSchool = v
	}
	a.DistanceFromSchoolMeters = floatVal(d, "distanceFromSchoolMeters")
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
		"className":  e.ClassName,
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

func (r *ExamRepo) FindByTeacher(ctx context.Context, schoolID, teacherID string) ([]*domain.Exam, error) {
	sid, _ := primitive.ObjectIDFromHex(schoolID)
	filter := bson.M{"schoolId": sid}
	if teacherID != "" {
		tid, _ := primitive.ObjectIDFromHex(teacherID)
		filter["teacherId"] = tid
	}
	cur, err := r.col.Find(ctx, filter, options.Find().SetSort(bson.M{"examDate": -1}).SetLimit(500))
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

func (r *ExamRepo) Update(ctx context.Context, id string, updates map[string]interface{}) (*domain.Exam, error) {
	oid, _ := primitive.ObjectIDFromHex(id)
	updates["updatedAt"] = time.Now()
	res := r.col.FindOneAndUpdate(ctx, bson.M{"_id": oid}, bson.M{"$set": updates},
		options.FindOneAndUpdate().SetReturnDocument(options.After))
	var d bson.M
	if err := res.Decode(&d); err != nil {
		return nil, err
	}
	return examFromBSON(d), nil
}

func (r *ExamRepo) Delete(ctx context.Context, id string) error {
	oid, _ := primitive.ObjectIDFromHex(id)
	_, err := r.col.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

func (r *ExamRepo) FindByID(ctx context.Context, id string) (*domain.Exam, error) {
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
	return examFromBSON(d), nil
}

func examFromBSON(d bson.M) *domain.Exam {
	e := &domain.Exam{
		Title:      strVal(d, "title"),
		ExamType:   strVal(d, "examType"),
		ClassName:  strVal(d, "className"),
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
	cur, err := r.col.Find(ctx, bson.M{"examId": oid}, options.Find().SetLimit(500))
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

// ─── Subject Repo ─────────────────────────────────────────────────────────────

type SubjectRepo struct{ col *mongo.Collection }

func NewSubjectRepo(col *mongo.Collection) *SubjectRepo { return &SubjectRepo{col: col} }

func (r *SubjectRepo) FindBySchoolAndClass(ctx context.Context, schoolID, classID string) ([]*domain.Subject, error) {
	sid, _ := primitive.ObjectIDFromHex(schoolID)
	filter := bson.M{"schoolId": sid}
	if classID != "" {
		cid, _ := primitive.ObjectIDFromHex(classID)
		filter["classId"] = cid
	}
	cur, err := r.col.Find(ctx, filter, options.Find().SetSort(bson.M{"name": 1}).SetLimit(500))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var list []*domain.Subject
	for cur.Next(ctx) {
		var d bson.M
		if err := cur.Decode(&d); err == nil {
			list = append(list, subjectFromBSON(d))
		}
	}
	return list, cur.Err()
}

func (r *SubjectRepo) Create(ctx context.Context, s *domain.Subject) (*domain.Subject, error) {
	sid, _ := primitive.ObjectIDFromHex(s.SchoolID)
	cid, _ := primitive.ObjectIDFromHex(s.ClassID)
	doc := bson.M{
		"_id":       primitive.NewObjectID(),
		"schoolId":  sid,
		"classId":   cid,
		"name":      s.Name,
		"code":      s.Code,
		"description": s.Description,
		"createdAt": time.Now(),
		"updatedAt": time.Now(),
	}
	if _, err := r.col.InsertOne(ctx, doc); err != nil {
		return nil, err
	}
	return subjectFromBSON(doc), nil
}

func (r *SubjectRepo) Delete(ctx context.Context, id string) error {
	oid, _ := primitive.ObjectIDFromHex(id)
	_, err := r.col.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

func subjectFromBSON(d bson.M) *domain.Subject {
	s := &domain.Subject{Name: strVal(d, "name"), Code: strVal(d, "code"), Description: strVal(d, "description")}
	if oid, ok := d["_id"].(primitive.ObjectID); ok { s.ID = oid.Hex() }
	if oid, ok := d["schoolId"].(primitive.ObjectID); ok { s.SchoolID = oid.Hex() }
	if oid, ok := d["classId"].(primitive.ObjectID); ok { s.ClassID = oid.Hex() }
	return s
}

// ─── Assignment Repo ──────────────────────────────────────────────────────────

type AssignmentRepo struct{ col *mongo.Collection }

func NewAssignmentRepo(col *mongo.Collection) *AssignmentRepo { return &AssignmentRepo{col: col} }

func (r *AssignmentRepo) Find(ctx context.Context, schoolID, classID, teacherID string) ([]*domain.Assignment, error) {
	sid, _ := primitive.ObjectIDFromHex(schoolID)
	filter := bson.M{"schoolId": sid}
	if classID != "" {
		cid, _ := primitive.ObjectIDFromHex(classID)
		filter["classId"] = cid
	}
	if teacherID != "" {
		tid, _ := primitive.ObjectIDFromHex(teacherID)
		filter["teacherId"] = tid
	}
	cur, err := r.col.Find(ctx, filter, options.Find().SetSort(bson.M{"createdAt": -1}).SetLimit(500))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var list []*domain.Assignment
	for cur.Next(ctx) {
		var d bson.M
		if err := cur.Decode(&d); err == nil {
			list = append(list, assignmentFromBSON(d))
		}
	}
	return list, cur.Err()
}

func (r *AssignmentRepo) Create(ctx context.Context, a *domain.Assignment) (*domain.Assignment, error) {
	sid, _ := primitive.ObjectIDFromHex(a.SchoolID)
	tid, _ := primitive.ObjectIDFromHex(a.TeacherID)
	status := a.Status
	if status == "" {
		status = "PUBLISHED"
	}
	doc := bson.M{
		"_id":          primitive.NewObjectID(),
		"schoolId":     sid,
		"teacherId":    tid,
		"className":    a.ClassName,
		"title":        a.Title,
		"description":  a.Description,
		"instructions": a.Instructions,
		"subject":      a.Subject,
		"dueDate":      a.DueDate,
		"totalPoints":  a.TotalPoints,
		"status":       status,
		"fileData":     a.FileData,
		"fileName":     a.FileName,
		"createdAt":    time.Now(),
		"updatedAt":    time.Now(),
	}
	if a.ClassID != "" {
		cid, _ := primitive.ObjectIDFromHex(a.ClassID)
		doc["classId"] = cid
	}
	if _, err := r.col.InsertOne(ctx, doc); err != nil {
		return nil, err
	}
	return assignmentFromBSON(doc), nil
}

func (r *AssignmentRepo) Delete(ctx context.Context, id string) error {
	oid, _ := primitive.ObjectIDFromHex(id)
	_, err := r.col.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

func assignmentFromBSON(d bson.M) *domain.Assignment {
	a := &domain.Assignment{
		ClassName:    strVal(d, "className"),
		Title:        strVal(d, "title"),
		Description:  strVal(d, "description"),
		Instructions: strVal(d, "instructions"),
		Subject:      strVal(d, "subject"),
		DueDate:      strVal(d, "dueDate"),
		TotalPoints:  floatVal(d, "totalPoints"),
		Status:       strVal(d, "status"),
		FileName:     strVal(d, "fileName"),
		FileData:     strVal(d, "fileData"),
	}
	if a.Status == "" {
		a.Status = "PUBLISHED"
	}
	if oid, ok := d["_id"].(primitive.ObjectID); ok { a.ID = oid.Hex() }
	if oid, ok := d["schoolId"].(primitive.ObjectID); ok { a.SchoolID = oid.Hex() }
	if oid, ok := d["classId"].(primitive.ObjectID); ok { a.ClassID = oid.Hex() }
	if oid, ok := d["teacherId"].(primitive.ObjectID); ok { a.TeacherID = oid.Hex() }
	if ts, ok := d["createdAt"].(primitive.DateTime); ok { a.CreatedAt = ts.Time() }
	if ts, ok := d["updatedAt"].(primitive.DateTime); ok { a.UpdatedAt = ts.Time() }
	return a
}

// ─── AssignmentSubmission Repo ────────────────────────────────────────────────

type SubmissionRepo struct{ col *mongo.Collection }

func NewSubmissionRepo(col *mongo.Collection) *SubmissionRepo { return &SubmissionRepo{col: col} }

func (r *SubmissionRepo) Col() *mongo.Collection { return r.col }

func (r *SubmissionRepo) FindByAssignment(ctx context.Context, assignmentID string) ([]*domain.AssignmentSubmission, error) {
	oid, _ := primitive.ObjectIDFromHex(assignmentID)
	cur, err := r.col.Find(ctx, bson.M{"assignmentId": oid},
		options.Find().SetSort(bson.M{"createdAt": -1}).SetLimit(500))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var list []*domain.AssignmentSubmission
	for cur.Next(ctx) {
		var d bson.M
		if err := cur.Decode(&d); err == nil {
			list = append(list, submissionFromBSON(d))
		}
	}
	return list, cur.Err()
}

func (r *SubmissionRepo) Grade(ctx context.Context, id string, gradePoints float64, gradeComment string) (*domain.AssignmentSubmission, error) {
	oid, _ := primitive.ObjectIDFromHex(id)
	res := r.col.FindOneAndUpdate(ctx, bson.M{"_id": oid},
		bson.M{"$set": bson.M{"gradePoints": gradePoints, "gradeComment": gradeComment, "status": "GRADED", "updatedAt": time.Now()}},
		options.FindOneAndUpdate().SetReturnDocument(options.After))
	var d bson.M
	if err := res.Decode(&d); err != nil {
		return nil, err
	}
	return submissionFromBSON(d), nil
}

func submissionFromBSON(d bson.M) *domain.AssignmentSubmission {
	s := &domain.AssignmentSubmission{
		StudentName:  strVal(d, "studentName"),
		Content:      strVal(d, "content"),
		FileName:     strVal(d, "fileName"),
		FileData:     strVal(d, "fileData"),
		Status:       strVal(d, "status"),
		GradeComment: strVal(d, "gradeComment"),
	}
	if v, ok := d["gradePoints"].(float64); ok {
		s.GradePoints = &v
	}
	if oid, ok := d["_id"].(primitive.ObjectID); ok { s.ID = oid.Hex() }
	if oid, ok := d["assignmentId"].(primitive.ObjectID); ok { s.AssignmentID = oid.Hex() }
	if oid, ok := d["studentId"].(primitive.ObjectID); ok { s.StudentID = oid.Hex() }
	if ts, ok := d["createdAt"].(primitive.DateTime); ok { s.CreatedAt = ts.Time() }
	if ts, ok := d["submittedAt"].(primitive.DateTime); ok { t := ts.Time(); s.SubmittedAt = &t }
	return s
}

// ─── Material Repo ────────────────────────────────────────────────────────────

type MaterialRepo struct{ col *mongo.Collection }

func NewMaterialRepo(col *mongo.Collection) *MaterialRepo { return &MaterialRepo{col: col} }

func (r *MaterialRepo) Find(ctx context.Context, schoolID, classID string) ([]*domain.Material, error) {
	sid, _ := primitive.ObjectIDFromHex(schoolID)
	filter := bson.M{"schoolId": sid}
	if classID != "" {
		cid, _ := primitive.ObjectIDFromHex(classID)
		filter["classId"] = cid
	}
	cur, err := r.col.Find(ctx, filter, options.Find().SetSort(bson.M{"createdAt": -1}).SetLimit(500))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var list []*domain.Material
	for cur.Next(ctx) {
		var d bson.M
		if err := cur.Decode(&d); err == nil {
			list = append(list, materialFromBSON(d))
		}
	}
	return list, cur.Err()
}

func (r *MaterialRepo) Create(ctx context.Context, m *domain.Material) (*domain.Material, error) {
	sid, _ := primitive.ObjectIDFromHex(m.SchoolID)
	tid, _ := primitive.ObjectIDFromHex(m.TeacherID)
	matType := m.Type
	if matType == "" {
		matType = m.FileType
	}
	doc := bson.M{
		"_id":         primitive.NewObjectID(),
		"schoolId":    sid,
		"teacherId":   tid,
		"className":   m.ClassName,
		"title":       m.Title,
		"description": m.Description,
		"subject":     m.Subject,
		"type":        matType,
		"url":         m.URL,
		"fileData":    m.FileData,
		"fileName":    m.FileName,
		"createdAt":   time.Now(),
		"updatedAt":   time.Now(),
	}
	if m.ClassID != "" {
		cid, _ := primitive.ObjectIDFromHex(m.ClassID)
		doc["classId"] = cid
	}
	if _, err := r.col.InsertOne(ctx, doc); err != nil {
		return nil, err
	}
	return materialFromBSON(doc), nil
}

func (r *MaterialRepo) Delete(ctx context.Context, id string) error {
	oid, _ := primitive.ObjectIDFromHex(id)
	_, err := r.col.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

func materialFromBSON(d bson.M) *domain.Material {
	matType := strVal(d, "type")
	if matType == "" {
		matType = strVal(d, "fileType")
	}
	m := &domain.Material{
		ClassName:   strVal(d, "className"),
		Title:       strVal(d, "title"),
		Description: strVal(d, "description"),
		Subject:     strVal(d, "subject"),
		Type:        matType,
		FileType:    matType,
		URL:         strVal(d, "url"),
		FileName:    strVal(d, "fileName"),
		FileData:    strVal(d, "fileData"),
	}
	if oid, ok := d["_id"].(primitive.ObjectID); ok { m.ID = oid.Hex() }
	if oid, ok := d["schoolId"].(primitive.ObjectID); ok { m.SchoolID = oid.Hex() }
	if oid, ok := d["classId"].(primitive.ObjectID); ok { m.ClassID = oid.Hex() }
	if oid, ok := d["teacherId"].(primitive.ObjectID); ok { m.TeacherID = oid.Hex() }
	if ts, ok := d["createdAt"].(primitive.DateTime); ok { m.CreatedAt = ts.Time() }
	return m
}
