package repositories

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/erp-portal/go-backend/internal/modules/payroll/domain"
)

type PayrollRepo struct{ col *mongo.Collection }

func New(col *mongo.Collection) *PayrollRepo { return &PayrollRepo{col: col} }

func (r *PayrollRepo) Find(ctx context.Context, schoolID string, month, year int, status string) ([]*domain.PayrollEntry, error) {
	oid, _ := primitive.ObjectIDFromHex(schoolID)
	filter := bson.M{"schoolId": oid}
	if month > 0 {
		filter["month"] = month
	}
	if year > 0 {
		filter["year"] = year
	}
	if status != "" {
		filter["status"] = status
	}
	cur, err := r.col.Find(ctx, filter, options.Find().SetSort(bson.M{"staffName": 1}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var list []*domain.PayrollEntry
	for cur.Next(ctx) {
		var d bson.M
		if err := cur.Decode(&d); err == nil {
			list = append(list, fromBSON(d))
		}
	}
	return list, cur.Err()
}

func (r *PayrollRepo) Create(ctx context.Context, e *domain.PayrollEntry) (*domain.PayrollEntry, error) {
	sid, _ := primitive.ObjectIDFromHex(e.SchoolID)
	now := time.Now()
	doc := bson.M{
		"_id":         primitive.NewObjectID(),
		"schoolId":    sid,
		"staffId":     e.StaffID,
		"staffName":   e.StaffName,
		"month":       e.Month,
		"year":        e.Year,
		"basicSalary": e.BasicSalary,
		"allowances":  e.Allowances,
		"deductions":  e.Deductions,
		"netSalary":   e.NetSalary,
		"status":      "pending",
		"createdAt":   now,
		"updatedAt":   now,
	}
	if _, err := r.col.InsertOne(ctx, doc); err != nil {
		return nil, err
	}
	return fromBSON(doc), nil
}

func (r *PayrollRepo) Update(ctx context.Context, id string, updates map[string]interface{}) (*domain.PayrollEntry, error) {
	oid, _ := primitive.ObjectIDFromHex(id)
	updates["updatedAt"] = time.Now()
	res := r.col.FindOneAndUpdate(ctx, bson.M{"_id": oid}, bson.M{"$set": updates},
		options.FindOneAndUpdate().SetReturnDocument(options.After))
	var d bson.M
	if err := res.Decode(&d); err != nil {
		return nil, err
	}
	return fromBSON(d), nil
}

func fromBSON(d bson.M) *domain.PayrollEntry {
	e := &domain.PayrollEntry{
		StaffID:   strVal(d, "staffId"),
		StaffName: strVal(d, "staffName"),
		Status:    strVal(d, "status"),
	}
	if oid, ok := d["_id"].(primitive.ObjectID); ok {
		e.ID = oid.Hex()
	}
	if oid, ok := d["schoolId"].(primitive.ObjectID); ok {
		e.SchoolID = oid.Hex()
	}
	if v, ok := d["month"].(int32); ok {
		e.Month = int(v)
	}
	if v, ok := d["year"].(int32); ok {
		e.Year = int(v)
	}
	if v, ok := d["basicSalary"].(float64); ok {
		e.BasicSalary = v
	}
	if v, ok := d["allowances"].(float64); ok {
		e.Allowances = v
	}
	if v, ok := d["deductions"].(float64); ok {
		e.Deductions = v
	}
	if v, ok := d["netSalary"].(float64); ok {
		e.NetSalary = v
	}
	if ts, ok := d["createdAt"].(primitive.DateTime); ok {
		e.CreatedAt = ts.Time()
	}
	if ts, ok := d["updatedAt"].(primitive.DateTime); ok {
		e.UpdatedAt = ts.Time()
	}
	return e
}

func strVal(d bson.M, k string) string {
	if v, ok := d[k].(string); ok {
		return v
	}
	return ""
}

// ─── SalaryStructure Repo ─────────────────────────────────────────────────────

type SalaryStructureRepo struct{ col *mongo.Collection }

func NewSalaryStructureRepo(col *mongo.Collection) *SalaryStructureRepo {
	return &SalaryStructureRepo{col: col}
}

func (r *SalaryStructureRepo) FindBySchool(ctx context.Context, schoolID string) ([]*domain.SalaryStructure, error) {
	sid, _ := primitive.ObjectIDFromHex(schoolID)
	cur, err := r.col.Find(ctx, bson.M{"schoolId": sid}, options.Find().SetSort(bson.M{"name": 1}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var list []*domain.SalaryStructure
	for cur.Next(ctx) {
		var d bson.M
		if err := cur.Decode(&d); err == nil {
			list = append(list, salaryStructureFromBSON(d))
		}
	}
	return list, cur.Err()
}

func (r *SalaryStructureRepo) Create(ctx context.Context, s *domain.SalaryStructure) (*domain.SalaryStructure, error) {
	sid, _ := primitive.ObjectIDFromHex(s.SchoolID)
	now := time.Now()
	status := s.Status
	if status == "" {
		status = "Active"
	}
	doc := bson.M{
		"_id":        primitive.NewObjectID(),
		"schoolId":   sid,
		"name":       s.Name,
		"status":     status,
		"earnings":   earningsToBSON(s.Earnings),
		"deductions": deductionsToBSON(s.Deductions),
		"createdAt":  now,
		"updatedAt":  now,
	}
	if _, err := r.col.InsertOne(ctx, doc); err != nil {
		return nil, err
	}
	return salaryStructureFromBSON(doc), nil
}

func (r *SalaryStructureRepo) Update(ctx context.Context, id string, s *domain.SalaryStructure) (*domain.SalaryStructure, error) {
	oid, _ := primitive.ObjectIDFromHex(id)
	updates := bson.M{
		"name":       s.Name,
		"status":     s.Status,
		"earnings":   earningsToBSON(s.Earnings),
		"deductions": deductionsToBSON(s.Deductions),
		"updatedAt":  time.Now(),
	}
	res := r.col.FindOneAndUpdate(ctx, bson.M{"_id": oid}, bson.M{"$set": updates},
		options.FindOneAndUpdate().SetReturnDocument(options.After))
	var d bson.M
	if err := res.Decode(&d); err != nil {
		return nil, err
	}
	return salaryStructureFromBSON(d), nil
}

func (r *SalaryStructureRepo) Delete(ctx context.Context, id string) error {
	oid, _ := primitive.ObjectIDFromHex(id)
	_, err := r.col.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

func earningsToBSON(es []domain.Earning) bson.A {
	arr := bson.A{}
	for _, e := range es {
		arr = append(arr, bson.M{"label": e.Label, "amount": e.Amount})
	}
	return arr
}

func deductionsToBSON(ds []domain.Deduction) bson.A {
	arr := bson.A{}
	for _, d := range ds {
		arr = append(arr, bson.M{"label": d.Label, "type": d.Type, "value": d.Value})
	}
	return arr
}

func salaryStructureFromBSON(d bson.M) *domain.SalaryStructure {
	s := &domain.SalaryStructure{
		Name:   strVal(d, "name"),
		Status: strVal(d, "status"),
	}
	if oid, ok := d["_id"].(primitive.ObjectID); ok {
		s.ID = oid.Hex()
	}
	if oid, ok := d["schoolId"].(primitive.ObjectID); ok {
		s.SchoolID = oid.Hex()
	}
	if ts, ok := d["createdAt"].(primitive.DateTime); ok {
		s.CreatedAt = ts.Time()
	}
	if ts, ok := d["updatedAt"].(primitive.DateTime); ok {
		s.UpdatedAt = ts.Time()
	}
	// Decode earnings
	if arr, ok := d["earnings"].(bson.A); ok {
		for _, item := range arr {
			if m, ok := item.(bson.M); ok {
				e := domain.Earning{Label: strVal(m, "label")}
				if v, ok := m["amount"].(float64); ok {
					e.Amount = v
				}
				s.Earnings = append(s.Earnings, e)
			}
		}
	}
	// Decode deductions
	if arr, ok := d["deductions"].(bson.A); ok {
		for _, item := range arr {
			if m, ok := item.(bson.M); ok {
				dv := domain.Deduction{Label: strVal(m, "label"), Type: strVal(m, "type")}
				if v, ok := m["value"].(float64); ok {
					dv.Value = v
				}
				s.Deductions = append(s.Deductions, dv)
			}
		}
	}
	if s.Earnings == nil {
		s.Earnings = []domain.Earning{}
	}
	if s.Deductions == nil {
		s.Deductions = []domain.Deduction{}
	}
	return s
}
