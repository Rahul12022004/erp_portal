package repositories

import (
	"context"
	"regexp"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/erp-portal/go-backend/internal/shared/students/domain"
)

type mongoStudentDoc struct {
	ID                 primitive.ObjectID  `bson:"_id,omitempty"`
	SchoolID           primitive.ObjectID  `bson:"schoolId"`
	Name               string              `bson:"name"`
	Email              string              `bson:"email"`
	FormNumber         string              `bson:"formNumber"`
	AdmissionNumber    string              `bson:"admissionNumber"`
	RegistrationNo     string              `bson:"registration_no"`
	Class              string              `bson:"class"`
	ClassID            *primitive.ObjectID `bson:"class_id,omitempty"`
	ClassSection       string              `bson:"classSection"`
	SectionID          *primitive.ObjectID `bson:"section_id,omitempty"`
	AcademicYear       string              `bson:"academicYear"`
	RollNumber         string              `bson:"rollNumber"`
	Phone              string              `bson:"phone"`
	FatherName         string              `bson:"father_name"`
	MotherName         string              `bson:"mother_name"`
	FatherPhone        string              `bson:"fatherPhone"`
	MotherPhone        string              `bson:"motherPhone"`
	FatherEmail        string              `bson:"fatherEmail"`
	MotherEmail        string              `bson:"motherEmail"`
	Address            string              `bson:"address"`
	DateOfBirth        string              `bson:"dateOfBirth"`
	Gender             string              `bson:"gender"`
	Religion           string              `bson:"religion"`
	Caste              string              `bson:"caste"`
	BloodGroup         string              `bson:"bloodGroup"`
	Nationality        string              `bson:"nationality"`
	Status             string              `bson:"status"`
	NeedsTransport     bool                `bson:"needsTransport"`
	TransportStatus    string              `bson:"transport_status"`
	TransportRouteID   *primitive.ObjectID `bson:"transport_route_id,omitempty"`
	House              string              `bson:"house"`
	Photo              string              `bson:"photo"`
	AdmissionCompleted bool                `bson:"admissionCompleted"`
	CreatedAt          time.Time           `bson:"createdAt"`
	UpdatedAt          time.Time           `bson:"updatedAt"`
}

func fromDoc(d *mongoStudentDoc) *domain.Student {
	s := &domain.Student{
		ID:                 d.ID.Hex(),
		SchoolID:           d.SchoolID.Hex(),
		Name:               d.Name,
		Email:              d.Email,
		FormNumber:         d.FormNumber,
		AdmissionNumber:    d.AdmissionNumber,
		RegistrationNo:     d.RegistrationNo,
		Class:              d.Class,
		ClassSection:       d.ClassSection,
		AcademicYear:       d.AcademicYear,
		RollNumber:         d.RollNumber,
		Phone:              d.Phone,
		FatherName:         d.FatherName,
		MotherName:         d.MotherName,
		FatherPhone:        d.FatherPhone,
		MotherPhone:        d.MotherPhone,
		FatherEmail:        d.FatherEmail,
		MotherEmail:        d.MotherEmail,
		Address:            d.Address,
		DateOfBirth:        d.DateOfBirth,
		Gender:             d.Gender,
		Religion:           d.Religion,
		Caste:              d.Caste,
		BloodGroup:         d.BloodGroup,
		Nationality:        d.Nationality,
		Status:             d.Status,
		NeedsTransport:     d.NeedsTransport,
		TransportStatus:    d.TransportStatus,
		House:              d.House,
		Photo:              d.Photo,
		AdmissionCompleted: d.AdmissionCompleted,
		CreatedAt:          d.CreatedAt,
		UpdatedAt:          d.UpdatedAt,
	}
	if d.ClassID != nil {
		s.ClassID = d.ClassID.Hex()
	}
	if d.SectionID != nil {
		s.SectionID = d.SectionID.Hex()
	}
	if d.TransportRouteID != nil {
		s.TransportRouteID = d.TransportRouteID.Hex()
	}
	return s
}

type MongoStudentRepo struct{ col *mongo.Collection }

func New(col *mongo.Collection) StudentRepository {
	return &MongoStudentRepo{col: col}
}

func (r *MongoStudentRepo) FindByID(ctx context.Context, id string) (*domain.Student, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var d mongoStudentDoc
	if err := r.col.FindOne(ctx, bson.M{"_id": oid}).Decode(&d); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return fromDoc(&d), nil
}

func (r *MongoStudentRepo) Find(ctx context.Context, f StudentFilter) ([]*domain.Student, int64, error) {
	filter := bson.M{}
	if f.SchoolID != "" {
		oid, _ := primitive.ObjectIDFromHex(f.SchoolID)
		filter["schoolId"] = oid
	}
	if f.ClassID != "" {
		oid, _ := primitive.ObjectIDFromHex(f.ClassID)
		filter["class_id"] = oid
	}
	if f.AcademicYear != "" {
		filter["academicYear"] = f.AcademicYear
	}
	if f.Status != "" {
		filter["status"] = f.Status
	}
	if f.Search != "" {
		rx := bson.M{"$regex": regexp.QuoteMeta(f.Search), "$options": "i"}
		filter["$or"] = bson.A{
			bson.M{"name": rx},
			bson.M{"email": rx},
			bson.M{"admissionNumber": rx},
		}
	}

	total, _ := r.col.CountDocuments(ctx, filter)
	limit := f.Limit
	if limit == 0 {
		limit = 50
	}
	opts := options.Find().SetSkip(f.Skip).SetLimit(limit).SetSort(bson.M{"name": 1})
	cur, err := r.col.Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cur.Close(ctx)
	var list []*domain.Student
	for cur.Next(ctx) {
		var d mongoStudentDoc
		if err := cur.Decode(&d); err == nil {
			list = append(list, fromDoc(&d))
		}
	}
	return list, total, cur.Err()
}

func (r *MongoStudentRepo) Create(ctx context.Context, s *domain.Student) (*domain.Student, error) {
	sid, _ := primitive.ObjectIDFromHex(s.SchoolID)
	now := time.Now()
	doc := mongoStudentDoc{
		ID:              primitive.NewObjectID(),
		SchoolID:        sid,
		Name:            s.Name,
		Email:           s.Email,
		FormNumber:      s.FormNumber,
		AdmissionNumber: s.AdmissionNumber,
		RegistrationNo:  s.RegistrationNo,
		Class:           s.Class,
		ClassSection:    s.ClassSection,
		AcademicYear:    s.AcademicYear,
		RollNumber:      s.RollNumber,
		Phone:           s.Phone,
		FatherName:      s.FatherName,
		MotherName:      s.MotherName,
		Address:         s.Address,
		DateOfBirth:     s.DateOfBirth,
		Gender:          s.Gender,
		Religion:        s.Religion,
		BloodGroup:      s.BloodGroup,
		Status:          s.Status,
		NeedsTransport:  s.NeedsTransport,
		TransportStatus: s.TransportStatus,
		House:           s.House,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if s.ClassID != "" {
		oid, _ := primitive.ObjectIDFromHex(s.ClassID)
		doc.ClassID = &oid
	}
	if _, err := r.col.InsertOne(ctx, doc); err != nil {
		return nil, err
	}
	return fromDoc(&doc), nil
}

func (r *MongoStudentRepo) Update(ctx context.Context, id string, updates map[string]interface{}) (*domain.Student, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	updates["updatedAt"] = time.Now()
	res := r.col.FindOneAndUpdate(ctx, bson.M{"_id": oid}, bson.M{"$set": updates},
		options.FindOneAndUpdate().SetReturnDocument(options.After))
	var d mongoStudentDoc
	if err := res.Decode(&d); err != nil {
		return nil, err
	}
	return fromDoc(&d), nil
}

func (r *MongoStudentRepo) Delete(ctx context.Context, id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.col.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}
