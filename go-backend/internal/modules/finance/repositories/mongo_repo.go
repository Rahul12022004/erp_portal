package repositories

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/erp-portal/go-backend/internal/modules/finance/domain"
)

// ─── ClassFeeStructure Repo ───────────────────────────────────────────────────

type ClassFeeRepo struct{ col *mongo.Collection }

func NewClassFeeRepo(col *mongo.Collection) *ClassFeeRepo { return &ClassFeeRepo{col: col} }

func (r *ClassFeeRepo) FindBySchool(ctx context.Context, schoolID string) ([]*domain.ClassFeeStructure, error) {
	oid, _ := primitive.ObjectIDFromHex(schoolID)
	cur, err := r.col.Find(ctx, bson.M{"school_id": oid})
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var list []*domain.ClassFeeStructure
	for cur.Next(ctx) {
		var d bson.M
		if err := cur.Decode(&d); err == nil {
			list = append(list, classFeeFromBSON(d))
		}
	}
	return list, cur.Err()
}

func (r *ClassFeeRepo) FindByID(ctx context.Context, id string) (*domain.ClassFeeStructure, error) {
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
	return classFeeFromBSON(d), nil
}

func (r *ClassFeeRepo) Create(ctx context.Context, f *domain.ClassFeeStructure) (*domain.ClassFeeStructure, error) {
	sid, _ := primitive.ObjectIDFromHex(f.SchoolID)
	cid, _ := primitive.ObjectIDFromHex(f.ClassID)
	doc := bson.M{
		"_id":          primitive.NewObjectID(),
		"school_id":    sid,
		"class_id":     cid,
		"academic_year": f.AcademicYear,
		"academic_fee": f.AcademicFee,
		"default_transport_fee": f.TransportFee,
		"other_fee":    f.OtherFee,
		"due_date":     f.DueDate,
		"createdAt":    time.Now(),
		"updatedAt":    time.Now(),
	}
	if _, err := r.col.InsertOne(ctx, doc); err != nil {
		return nil, err
	}
	return classFeeFromBSON(doc), nil
}

func (r *ClassFeeRepo) Update(ctx context.Context, id string, updates map[string]interface{}) (*domain.ClassFeeStructure, error) {
	oid, _ := primitive.ObjectIDFromHex(id)
	updates["updatedAt"] = time.Now()
	res := r.col.FindOneAndUpdate(ctx, bson.M{"_id": oid}, bson.M{"$set": updates},
		options.FindOneAndUpdate().SetReturnDocument(options.After))
	var d bson.M
	if err := res.Decode(&d); err != nil {
		return nil, err
	}
	return classFeeFromBSON(d), nil
}

func (r *ClassFeeRepo) Delete(ctx context.Context, id string) error {
	oid, _ := primitive.ObjectIDFromHex(id)
	_, err := r.col.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

func classFeeFromBSON(d bson.M) *domain.ClassFeeStructure {
	f := &domain.ClassFeeStructure{
		AcademicYear: strVal(d, "academic_year"),
		AcademicFee:  floatVal(d, "academic_fee"),
		TransportFee: floatVal(d, "default_transport_fee"),
		OtherFee:     floatVal(d, "other_fee"),
		DueDate:      strVal(d, "due_date"),
	}
	if oid, ok := d["_id"].(primitive.ObjectID); ok {
		f.ID = oid.Hex()
	}
	if oid, ok := d["school_id"].(primitive.ObjectID); ok {
		f.SchoolID = oid.Hex()
	}
	if oid, ok := d["class_id"].(primitive.ObjectID); ok {
		f.ClassID = oid.Hex()
	}
	return f
}

// ─── StudentFeeAssignment Repo ────────────────────────────────────────────────

type AssignmentRepo struct{ col *mongo.Collection }

func NewAssignmentRepo(col *mongo.Collection) *AssignmentRepo { return &AssignmentRepo{col: col} }

func (r *AssignmentRepo) Col() *mongo.Collection { return r.col }

type AssignmentFilter struct {
	SchoolID     string
	ClassID      string
	AcademicYear string
	Search       string
	Skip         int64
	Limit        int64
}

func (r *AssignmentRepo) Find(ctx context.Context, f AssignmentFilter) ([]*domain.StudentFeeAssignment, int64, error) {
	filter := bson.M{}
	if f.SchoolID != "" {
		oid, _ := primitive.ObjectIDFromHex(f.SchoolID)
		filter["school_id"] = oid
	}
	if f.AcademicYear != "" {
		filter["academic_year"] = f.AcademicYear
	}
	total, _ := r.col.CountDocuments(ctx, filter)
	limit := f.Limit
	if limit == 0 {
		limit = 50
	}
	opts := options.Find().SetSkip(f.Skip).SetLimit(limit)
	cur, err := r.col.Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cur.Close(ctx)
	var list []*domain.StudentFeeAssignment
	for cur.Next(ctx) {
		var d bson.M
		if err := cur.Decode(&d); err == nil {
			list = append(list, assignmentFromBSON(d))
		}
	}
	return list, total, cur.Err()
}

func (r *AssignmentRepo) FindByID(ctx context.Context, id string) (*domain.StudentFeeAssignment, error) {
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
	return assignmentFromBSON(d), nil
}

func (r *AssignmentRepo) FindByStudent(ctx context.Context, schoolID, studentID, year string) (*domain.StudentFeeAssignment, error) {
	sid, _ := primitive.ObjectIDFromHex(schoolID)
	stid, _ := primitive.ObjectIDFromHex(studentID)
	filter := bson.M{"school_id": sid, "student_id": stid}
	if year != "" {
		filter["academic_year"] = year
	}
	var d bson.M
	if err := r.col.FindOne(ctx, filter).Decode(&d); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return assignmentFromBSON(d), nil
}

func (r *AssignmentRepo) Create(ctx context.Context, a *domain.StudentFeeAssignment) (*domain.StudentFeeAssignment, error) {
	sid, _ := primitive.ObjectIDFromHex(a.SchoolID)
	stid, _ := primitive.ObjectIDFromHex(a.StudentID)
	total := a.AcademicFee + a.TransportFee + a.OtherFee - a.DiscountAmount
	doc := bson.M{
		"_id":                    primitive.NewObjectID(),
		"school_id":              sid,
		"student_id":             stid,
		"academic_year":          a.AcademicYear,
		"academic_fee":           a.AcademicFee,
		"transport_fee":          a.TransportFee,
		"other_fee":              a.OtherFee,
		"discount_amount":        a.DiscountAmount,
		"total_fee":              total,
		"paid_amount":            0,
		"due_amount":             total,
		"fee_status":             "UNPAID",
		"due_date":               a.DueDate,
		"createdAt":              time.Now(),
		"updatedAt":              time.Now(),
	}
	if a.ClassFeeStructureID != "" {
		cfid, _ := primitive.ObjectIDFromHex(a.ClassFeeStructureID)
		doc["class_fee_structure_id"] = cfid
	}
	if _, err := r.col.InsertOne(ctx, doc); err != nil {
		return nil, err
	}
	return assignmentFromBSON(doc), nil
}

func (r *AssignmentRepo) UpdatePayment(ctx context.Context, id string, paid, due float64, status string, lastDate string) error {
	oid, _ := primitive.ObjectIDFromHex(id)
	_, err := r.col.UpdateOne(ctx, bson.M{"_id": oid}, bson.M{"$set": bson.M{
		"paid_amount":       paid,
		"due_amount":        due,
		"fee_status":        status,
		"last_payment_date": lastDate,
		"updatedAt":         time.Now(),
	}})
	return err
}

func assignmentFromBSON(d bson.M) *domain.StudentFeeAssignment {
	a := &domain.StudentFeeAssignment{
		AcademicYear:   strVal(d, "academic_year"),
		AcademicFee:    floatVal(d, "academic_fee"),
		TransportFee:   floatVal(d, "transport_fee"),
		OtherFee:       floatVal(d, "other_fee"),
		DiscountAmount: floatVal(d, "discount_amount"),
		TotalFee:       floatVal(d, "total_fee"),
		PaidAmount:     floatVal(d, "paid_amount"),
		DueAmount:      floatVal(d, "due_amount"),
		FeeStatus:      strVal(d, "fee_status"),
		DueDate:        strVal(d, "due_date"),
		LastPaymentDate: strVal(d, "last_payment_date"),
		LateFeeAmount:  floatVal(d, "late_fee_amount"),
	}
	if oid, ok := d["_id"].(primitive.ObjectID); ok {
		a.ID = oid.Hex()
	}
	if oid, ok := d["school_id"].(primitive.ObjectID); ok {
		a.SchoolID = oid.Hex()
	}
	if oid, ok := d["student_id"].(primitive.ObjectID); ok {
		a.StudentID = oid.Hex()
	}
	if oid, ok := d["class_fee_structure_id"].(primitive.ObjectID); ok {
		a.ClassFeeStructureID = oid.Hex()
	}
	return a
}

// ─── Payment Repo ─────────────────────────────────────────────────────────────

type PaymentRepo struct{ col *mongo.Collection }

func NewPaymentRepo(col *mongo.Collection) *PaymentRepo { return &PaymentRepo{col: col} }

func (r *PaymentRepo) FindByAssignment(ctx context.Context, assignmentID string) ([]*domain.StudentFeePayment, error) {
	oid, _ := primitive.ObjectIDFromHex(assignmentID)
	cur, err := r.col.Find(ctx, bson.M{"student_fee_assignment_id": oid},
		options.Find().SetSort(bson.M{"payment_date": -1}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var list []*domain.StudentFeePayment
	for cur.Next(ctx) {
		var d bson.M
		if err := cur.Decode(&d); err == nil {
			list = append(list, paymentFromBSON(d))
		}
	}
	return list, cur.Err()
}

func (r *PaymentRepo) Create(ctx context.Context, p *domain.StudentFeePayment) (*domain.StudentFeePayment, error) {
	sid, _ := primitive.ObjectIDFromHex(p.SchoolID)
	aid, _ := primitive.ObjectIDFromHex(p.StudentFeeAssignmentID)
	stid, _ := primitive.ObjectIDFromHex(p.StudentID)
	doc := bson.M{
		"_id":                       primitive.NewObjectID(),
		"school_id":                 sid,
		"student_fee_assignment_id": aid,
		"student_id":                stid,
		"payment_amount":            p.PaymentAmount,
		"payment_date":              p.PaymentDate,
		"payment_mode":              p.PaymentMode,
		"transaction_id":            p.TransactionID,
		"remarks":                   p.Remarks,
		"receipt_number":            p.ReceiptNumber,
		"createdAt":                 time.Now(),
	}
	if _, err := r.col.InsertOne(ctx, doc); err != nil {
		return nil, err
	}
	return paymentFromBSON(doc), nil
}

func paymentFromBSON(d bson.M) *domain.StudentFeePayment {
	p := &domain.StudentFeePayment{
		PaymentAmount: floatVal(d, "payment_amount"),
		PaymentDate:   strVal(d, "payment_date"),
		PaymentMode:   strVal(d, "payment_mode"),
		TransactionID: strVal(d, "transaction_id"),
		Remarks:       strVal(d, "remarks"),
		ReceiptNumber: strVal(d, "receipt_number"),
	}
	if oid, ok := d["_id"].(primitive.ObjectID); ok {
		p.ID = oid.Hex()
	}
	if oid, ok := d["school_id"].(primitive.ObjectID); ok {
		p.SchoolID = oid.Hex()
	}
	if oid, ok := d["student_fee_assignment_id"].(primitive.ObjectID); ok {
		p.StudentFeeAssignmentID = oid.Hex()
	}
	if oid, ok := d["student_id"].(primitive.ObjectID); ok {
		p.StudentID = oid.Hex()
	}
	return p
}

// ─── bson helpers ─────────────────────────────────────────────────────────────

func strVal(d bson.M, k string) string {
	if v, ok := d[k].(string); ok {
		return v
	}
	return ""
}

func floatVal(d bson.M, k string) float64 {
	switch v := d[k].(type) {
	case float64:
		return v
	case int32:
		return float64(v)
	case int64:
		return float64(v)
	}
	return 0
}
