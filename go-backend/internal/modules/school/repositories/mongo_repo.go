package repositories

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/erp-portal/go-backend/internal/modules/school/domain"
)

// mongoDoc is the persistence model stored in MongoDB.
type mongoDoc struct {
	ID         primitive.ObjectID `bson:"_id,omitempty"`
	SchoolInfo struct {
		Name     string  `bson:"name"`
		Email    string  `bson:"email"`
		Phone    string  `bson:"phone"`
		Website  string  `bson:"website"`
		Address  string  `bson:"address"`
		Logo     string  `bson:"logo"`
		Location *struct {
			Latitude  float64 `bson:"latitude"`
			Longitude float64 `bson:"longitude"`
			Radius    float64 `bson:"radiusMeters"`
			Locked    bool    `bson:"locked"`
		} `bson:"location,omitempty"`
	} `bson:"schoolInfo"`
	AdminInfo struct {
		Name     string `bson:"name"`
		Email    string `bson:"email"`
		Password string `bson:"password"`
		Phone    string `bson:"phone"`
		Image    string `bson:"image"`
		Status   string `bson:"status"`
	} `bson:"adminInfo"`
	SystemInfo struct {
		SchoolType          string `bson:"schoolType"`
		SchoolNumber        string `bson:"schoolNumber"`
		AffiliationNo       string `bson:"affiliationNo"`
		MaxStudents         int    `bson:"maxStudents"`
		SubscriptionPlan    string `bson:"subscriptionPlan"`
		SubscriptionEndDate string `bson:"subscriptionEndDate"`
	} `bson:"systemInfo"`
	Modules   []string  `bson:"modules"`
	CreatedAt time.Time `bson:"createdAt"`
	UpdatedAt time.Time `bson:"updatedAt"`
}

func toDoc(s *domain.School) *mongoDoc {
	d := &mongoDoc{}
	if s.ID != "" {
		oid, _ := primitive.ObjectIDFromHex(s.ID)
		d.ID = oid
	} else {
		d.ID = primitive.NewObjectID()
	}
	d.SchoolInfo.Name = s.SchoolInfo.Name
	d.SchoolInfo.Email = s.SchoolInfo.Email
	d.SchoolInfo.Phone = s.SchoolInfo.Phone
	d.SchoolInfo.Website = s.SchoolInfo.Website
	d.SchoolInfo.Address = s.SchoolInfo.Address
	d.SchoolInfo.Logo = s.SchoolInfo.Logo
	d.AdminInfo.Name = s.AdminInfo.Name
	d.AdminInfo.Email = s.AdminInfo.Email
	d.AdminInfo.Password = s.AdminInfo.Password
	d.AdminInfo.Phone = s.AdminInfo.Phone
	d.AdminInfo.Image = s.AdminInfo.Image
	d.AdminInfo.Status = s.AdminInfo.Status
	d.SystemInfo.SchoolType = s.SystemInfo.SchoolType
	d.SystemInfo.SubscriptionPlan = s.SystemInfo.SubscriptionPlan
	d.SystemInfo.SubscriptionEndDate = s.SystemInfo.SubscriptionEndDate
	d.SystemInfo.MaxStudents = s.SystemInfo.MaxStudents
	d.Modules = s.Modules
	d.CreatedAt = s.CreatedAt
	d.UpdatedAt = s.UpdatedAt
	return d
}

func fromDoc(d *mongoDoc) *domain.School {
	s := &domain.School{
		ID: d.ID.Hex(),
		SchoolInfo: domain.SchoolInfo{
			Name:    d.SchoolInfo.Name,
			Email:   d.SchoolInfo.Email,
			Phone:   d.SchoolInfo.Phone,
			Website: d.SchoolInfo.Website,
			Address: d.SchoolInfo.Address,
			Logo:    d.SchoolInfo.Logo,
		},
		AdminInfo: domain.AdminInfo{
			Name:     d.AdminInfo.Name,
			Email:    d.AdminInfo.Email,
			Password: d.AdminInfo.Password,
			Phone:    d.AdminInfo.Phone,
			Image:    d.AdminInfo.Image,
			Status:   d.AdminInfo.Status,
		},
		SystemInfo: domain.SystemInfo{
			SchoolType:          d.SystemInfo.SchoolType,
			SubscriptionPlan:    d.SystemInfo.SubscriptionPlan,
			SubscriptionEndDate: d.SystemInfo.SubscriptionEndDate,
			MaxStudents:         d.SystemInfo.MaxStudents,
		},
		Modules:   d.Modules,
		CreatedAt: d.CreatedAt,
		UpdatedAt: d.UpdatedAt,
	}
	if d.SchoolInfo.Location != nil {
		s.SchoolInfo.Location = &domain.Location{
			Latitude:  d.SchoolInfo.Location.Latitude,
			Longitude: d.SchoolInfo.Location.Longitude,
			Radius:    d.SchoolInfo.Location.Radius,
			Locked:    d.SchoolInfo.Location.Locked,
		}
	}
	return s
}

// MongoSchoolRepo implements SchoolRepository against MongoDB.
type MongoSchoolRepo struct {
	col *mongo.Collection
}

func NewMongoSchoolRepo(col *mongo.Collection) SchoolRepository {
	return &MongoSchoolRepo{col: col}
}

func (r *MongoSchoolRepo) ctx() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 10*time.Second)
}

func (r *MongoSchoolRepo) FindByID(ctx context.Context, id string) (*domain.School, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var d mongoDoc
	if err := r.col.FindOne(ctx, bson.M{"_id": oid}).Decode(&d); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return fromDoc(&d), nil
}

func (r *MongoSchoolRepo) FindByEmail(ctx context.Context, email string) (*domain.School, error) {
	filter := bson.M{"$or": bson.A{
		bson.M{"adminInfo.email": email},
		bson.M{"schoolInfo.email": email},
	}}
	var d mongoDoc
	if err := r.col.FindOne(ctx, filter).Decode(&d); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return fromDoc(&d), nil
}

func (r *MongoSchoolRepo) Create(ctx context.Context, s *domain.School) (*domain.School, error) {
	now := time.Now()
	s.CreatedAt = now
	s.UpdatedAt = now
	d := toDoc(s)
	if _, err := r.col.InsertOne(ctx, d); err != nil {
		return nil, err
	}
	s.ID = d.ID.Hex()
	return s, nil
}

func (r *MongoSchoolRepo) Update(ctx context.Context, id string, updates map[string]interface{}) (*domain.School, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	updates["updatedAt"] = time.Now()
	res := r.col.FindOneAndUpdate(
		ctx,
		bson.M{"_id": oid},
		bson.M{"$set": updates},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	)
	var d mongoDoc
	if err := res.Decode(&d); err != nil {
		return nil, err
	}
	return fromDoc(&d), nil
}

func (r *MongoSchoolRepo) Delete(ctx context.Context, id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.col.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

func (r *MongoSchoolRepo) List(ctx context.Context, skip, limit int64) ([]*domain.School, int64, error) {
	total, err := r.col.CountDocuments(ctx, bson.M{})
	if err != nil {
		return nil, 0, err
	}
	opts := options.Find().SetSkip(skip).SetLimit(limit).SetSort(bson.M{"createdAt": -1})
	cur, err := r.col.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cur.Close(ctx)
	var results []*domain.School
	for cur.Next(ctx) {
		var d mongoDoc
		if err := cur.Decode(&d); err == nil {
			results = append(results, fromDoc(&d))
		}
	}
	return results, total, cur.Err()
}
