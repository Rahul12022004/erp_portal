package repositories

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/erp-portal/go-backend/internal/modules/library/domain"
)

// ─── Book Repo ────────────────────────────────────────────────────────────────

type BookRepo struct{ col *mongo.Collection }

func NewBookRepo(col *mongo.Collection) *BookRepo { return &BookRepo{col: col} }

func (r *BookRepo) FindBySchool(ctx context.Context, schoolID, category string) ([]*domain.LibraryBook, error) {
	oid, _ := primitive.ObjectIDFromHex(schoolID)
	filter := bson.M{"schoolId": oid}
	if category != "" {
		filter["category"] = category
	}
	cur, err := r.col.Find(ctx, filter, options.Find().SetSort(bson.M{"title": 1}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var list []*domain.LibraryBook
	for cur.Next(ctx) {
		var d bson.M
		if err := cur.Decode(&d); err == nil {
			list = append(list, bookFromBSON(d))
		}
	}
	return list, cur.Err()
}

func (r *BookRepo) FindByID(ctx context.Context, id string) (*domain.LibraryBook, error) {
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
	return bookFromBSON(d), nil
}

func (r *BookRepo) Create(ctx context.Context, b *domain.LibraryBook) (*domain.LibraryBook, error) {
	sid, _ := primitive.ObjectIDFromHex(b.SchoolID)
	now := time.Now()
	doc := bson.M{
		"_id":             primitive.NewObjectID(),
		"schoolId":        sid,
		"title":           b.Title,
		"author":          b.Author,
		"category":        b.Category,
		"accessionNumber": b.AccessionNumber,
		"isbn":            b.ISBN,
		"publisher":       b.Publisher,
		"edition":         b.Edition,
		"quantity":        b.Quantity,
		"availableCopies": b.Quantity,
		"rack":            b.Rack,
		"shelf":           b.Shelf,
		"status":          "active",
		"createdAt":       now,
		"updatedAt":       now,
	}
	if _, err := r.col.InsertOne(ctx, doc); err != nil {
		return nil, err
	}
	return bookFromBSON(doc), nil
}

func (r *BookRepo) Update(ctx context.Context, id string, updates map[string]interface{}) (*domain.LibraryBook, error) {
	oid, _ := primitive.ObjectIDFromHex(id)
	updates["updatedAt"] = time.Now()
	res := r.col.FindOneAndUpdate(ctx, bson.M{"_id": oid}, bson.M{"$set": updates},
		options.FindOneAndUpdate().SetReturnDocument(options.After))
	var d bson.M
	if err := res.Decode(&d); err != nil {
		return nil, err
	}
	return bookFromBSON(d), nil
}

func (r *BookRepo) Delete(ctx context.Context, id string) error {
	oid, _ := primitive.ObjectIDFromHex(id)
	_, err := r.col.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

func bookFromBSON(d bson.M) *domain.LibraryBook {
	b := &domain.LibraryBook{
		Title:           strVal(d, "title"),
		Author:          strVal(d, "author"),
		Category:        strVal(d, "category"),
		AccessionNumber: strVal(d, "accessionNumber"),
		ISBN:            strVal(d, "isbn"),
		Publisher:       strVal(d, "publisher"),
		Edition:         strVal(d, "edition"),
		Quantity:        intVal(d, "quantity"),
		AvailableCopies: intVal(d, "availableCopies"),
		Rack:            strVal(d, "rack"),
		Shelf:           strVal(d, "shelf"),
		Status:          strVal(d, "status"),
	}
	if oid, ok := d["_id"].(primitive.ObjectID); ok {
		b.ID = oid.Hex()
	}
	if oid, ok := d["schoolId"].(primitive.ObjectID); ok {
		b.SchoolID = oid.Hex()
	}
	return b
}

// ─── Assignment Repo ──────────────────────────────────────────────────────────

type AssignmentRepo struct{ col *mongo.Collection }

func NewAssignmentRepo(col *mongo.Collection) *AssignmentRepo { return &AssignmentRepo{col: col} }

func (r *AssignmentRepo) FindBySchool(ctx context.Context, schoolID, status string) ([]*domain.LibraryAssignment, error) {
	oid, _ := primitive.ObjectIDFromHex(schoolID)
	filter := bson.M{"schoolId": oid}
	if status != "" {
		filter["issueStatus"] = status
	}
	cur, err := r.col.Find(ctx, filter, options.Find().SetSort(bson.M{"assignDate": -1}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var list []*domain.LibraryAssignment
	for cur.Next(ctx) {
		var d bson.M
		if err := cur.Decode(&d); err == nil {
			list = append(list, assignFromBSON(d))
		}
	}
	return list, cur.Err()
}

func (r *AssignmentRepo) Create(ctx context.Context, a *domain.LibraryAssignment) (*domain.LibraryAssignment, error) {
	sid, _ := primitive.ObjectIDFromHex(a.SchoolID)
	bid, _ := primitive.ObjectIDFromHex(a.BookID)
	stid, _ := primitive.ObjectIDFromHex(a.StudentID)
	now := time.Now()
	doc := bson.M{
		"_id":         primitive.NewObjectID(),
		"schoolId":    sid,
		"bookId":      bid,
		"studentId":   stid,
		"assignDate":  a.AssignDate,
		"dueDate":     a.DueDate,
		"returnDate":  "",
		"issueStatus": "issued",
		"createdAt":   now,
		"updatedAt":   now,
	}
	if _, err := r.col.InsertOne(ctx, doc); err != nil {
		return nil, err
	}
	return assignFromBSON(doc), nil
}

func (r *AssignmentRepo) Return(ctx context.Context, id, returnDate string) (*domain.LibraryAssignment, error) {
	oid, _ := primitive.ObjectIDFromHex(id)
	res := r.col.FindOneAndUpdate(ctx, bson.M{"_id": oid},
		bson.M{"$set": bson.M{"returnDate": returnDate, "issueStatus": "returned", "updatedAt": time.Now()}},
		options.FindOneAndUpdate().SetReturnDocument(options.After))
	var d bson.M
	if err := res.Decode(&d); err != nil {
		return nil, err
	}
	return assignFromBSON(d), nil
}

func assignFromBSON(d bson.M) *domain.LibraryAssignment {
	a := &domain.LibraryAssignment{
		AssignDate:  strVal(d, "assignDate"),
		DueDate:     strVal(d, "dueDate"),
		ReturnDate:  strVal(d, "returnDate"),
		IssueStatus: strVal(d, "issueStatus"),
	}
	if oid, ok := d["_id"].(primitive.ObjectID); ok {
		a.ID = oid.Hex()
	}
	if oid, ok := d["schoolId"].(primitive.ObjectID); ok {
		a.SchoolID = oid.Hex()
	}
	if oid, ok := d["bookId"].(primitive.ObjectID); ok {
		a.BookID = oid.Hex()
	}
	if oid, ok := d["studentId"].(primitive.ObjectID); ok {
		a.StudentID = oid.Hex()
	}
	return a
}

// ─── helpers ──────────────────────────────────────────────────────────────────

func strVal(d bson.M, k string) string {
	if v, ok := d[k].(string); ok {
		return v
	}
	return ""
}

func intVal(d bson.M, k string) int {
	switch v := d[k].(type) {
	case int32:
		return int(v)
	case int64:
		return int(v)
	case float64:
		return int(v)
	}
	return 0
}
