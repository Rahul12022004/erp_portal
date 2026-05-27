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

type mongoStaffDoc struct {
	ID             primitive.ObjectID `bson:"_id,omitempty"`
	SchoolID       primitive.ObjectID `bson:"schoolId"`
	Name           string             `bson:"name"`
	Email          string             `bson:"email"`
	Password       string             `bson:"password,omitempty"`
	Phone          string             `bson:"phone"`
	Position       string             `bson:"position"`
	Department     string             `bson:"department"`
	Qualification  string             `bson:"qualification"`
	Address        string             `bson:"address"`
	DateOfBirth    string             `bson:"dateOfBirth"`
	Gender         string             `bson:"gender"`
	JoinDate       string             `bson:"joinDate"`
	Status         string             `bson:"status"`
	BankName       string             `bson:"bankName"`
	AccountNumber  string             `bson:"accountNumber"`
	IFSCCode       string             `bson:"ifscCode"`
	AccountHolder  string             `bson:"accountHolderName"`
	PANNumber      string             `bson:"panNumber"`
	SalaryStructID string             `bson:"salaryStructureId"`
	CreatedAt      time.Time          `bson:"createdAt"`
	UpdatedAt      time.Time          `bson:"updatedAt"`
}

func staffFromDoc(d *mongoStaffDoc) *domain.Staff {
	return &domain.Staff{
		ID:             d.ID.Hex(),
		SchoolID:       d.SchoolID.Hex(),
		Name:           d.Name,
		Email:          d.Email,
		Password:       d.Password,
		Phone:          d.Phone,
		Position:       d.Position,
		Department:     d.Department,
		Qualification:  d.Qualification,
		Address:        d.Address,
		DateOfBirth:    d.DateOfBirth,
		Gender:         d.Gender,
		JoinDate:       d.JoinDate,
		Status:         d.Status,
		BankName:       d.BankName,
		AccountNumber:  d.AccountNumber,
		IFSCCode:       d.IFSCCode,
		AccountHolder:  d.AccountHolder,
		PANNumber:      d.PANNumber,
		SalaryStructID: d.SalaryStructID,
		CreatedAt:      d.CreatedAt,
		UpdatedAt:      d.UpdatedAt,
	}
}

// MongoStaffRepo implements StaffRepository.
type MongoStaffRepo struct{ col *mongo.Collection }

func NewMongoStaffRepo(col *mongo.Collection) StaffRepository {
	return &MongoStaffRepo{col: col}
}

func (r *MongoStaffRepo) FindByID(ctx context.Context, id string) (*domain.Staff, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var d mongoStaffDoc
	if err := r.col.FindOne(ctx, bson.M{"_id": oid}).Decode(&d); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return staffFromDoc(&d), nil
}

func (r *MongoStaffRepo) FindBySchool(ctx context.Context, schoolID string) ([]*domain.Staff, error) {
	oid, err := primitive.ObjectIDFromHex(schoolID)
	if err != nil {
		return nil, err
	}
	opts := options.Find().SetSort(bson.D{{Key: "position", Value: 1}, {Key: "name", Value: 1}})
	cur, err := r.col.Find(ctx, bson.M{"schoolId": oid}, opts)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var list []*domain.Staff
	for cur.Next(ctx) {
		var d mongoStaffDoc
		if err := cur.Decode(&d); err == nil {
			s := staffFromDoc(&d)
			s.Password = "" // never expose
			list = append(list, s)
		}
	}
	return list, cur.Err()
}

func (r *MongoStaffRepo) FindByEmail(ctx context.Context, email string) (*domain.Staff, error) {
	var d mongoStaffDoc
	if err := r.col.FindOne(ctx, bson.M{"email": email}).Decode(&d); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return staffFromDoc(&d), nil
}

func (r *MongoStaffRepo) Create(ctx context.Context, s *domain.Staff) (*domain.Staff, error) {
	schoolOID, _ := primitive.ObjectIDFromHex(s.SchoolID)
	now := time.Now()
	doc := mongoStaffDoc{
		ID:            primitive.NewObjectID(),
		SchoolID:      schoolOID,
		Name:          s.Name,
		Email:         s.Email,
		Password:      s.Password,
		Phone:         s.Phone,
		Position:      s.Position,
		Department:    s.Department,
		Qualification: s.Qualification,
		Address:       s.Address,
		DateOfBirth:   s.DateOfBirth,
		Gender:        s.Gender,
		JoinDate:      s.JoinDate,
		Status:        s.Status,
		BankName:      s.BankName,
		AccountNumber: s.AccountNumber,
		IFSCCode:      s.IFSCCode,
		AccountHolder: s.AccountHolder,
		PANNumber:     s.PANNumber,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	if _, err := r.col.InsertOne(ctx, doc); err != nil {
		return nil, err
	}
	out := staffFromDoc(&doc)
	out.Password = ""
	return out, nil
}

func (r *MongoStaffRepo) Update(ctx context.Context, id string, updates map[string]interface{}) (*domain.Staff, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	updates["updatedAt"] = time.Now()
	res := r.col.FindOneAndUpdate(ctx, bson.M{"_id": oid}, bson.M{"$set": updates},
		options.FindOneAndUpdate().SetReturnDocument(options.After))
	var d mongoStaffDoc
	if err := res.Decode(&d); err != nil {
		return nil, err
	}
	out := staffFromDoc(&d)
	out.Password = ""
	return out, nil
}

func (r *MongoStaffRepo) Delete(ctx context.Context, id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.col.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}
