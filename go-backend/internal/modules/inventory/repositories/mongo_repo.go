package repositories

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/erp-portal/go-backend/internal/modules/inventory/domain"
)

type InventoryRepo struct{ col *mongo.Collection }

func NewInventoryRepo(col *mongo.Collection) *InventoryRepo { return &InventoryRepo{col: col} }

func (r *InventoryRepo) FindBySchool(ctx context.Context, schoolID string, category string) ([]*domain.InventoryItem, error) {
	oid, _ := primitive.ObjectIDFromHex(schoolID)
	filter := bson.M{"schoolId": oid}
	if category != "" {
		filter["category"] = category
	}
	cur, err := r.col.Find(ctx, filter, options.Find().SetSort(bson.M{"name": 1}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	var list []*domain.InventoryItem
	for cur.Next(ctx) {
		var d bson.M
		if err := cur.Decode(&d); err == nil {
			list = append(list, fromBSON(d))
		}
	}
	return list, cur.Err()
}

func (r *InventoryRepo) FindByID(ctx context.Context, id string) (*domain.InventoryItem, error) {
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
	return fromBSON(d), nil
}

func (r *InventoryRepo) Create(ctx context.Context, item *domain.InventoryItem) (*domain.InventoryItem, error) {
	sid, _ := primitive.ObjectIDFromHex(item.SchoolID)
	now := time.Now()
	doc := bson.M{
		"_id":           primitive.NewObjectID(),
		"schoolId":      sid,
		"name":          item.Name,
		"itemCode":      item.ItemCode,
		"category":      item.Category,
		"subcategory":   item.Subcategory,
		"unitType":      item.UnitType,
		"stockCount":    item.StockCount,
		"minStockLevel": item.MinStockLevel,
		"condition":     item.Condition,
		"supplier":      item.Supplier,
		"purchaseDate":  item.PurchaseDate,
		"description":   item.Description,
		"createdAt":     now,
		"updatedAt":     now,
	}
	if _, err := r.col.InsertOne(ctx, doc); err != nil {
		return nil, err
	}
	return fromBSON(doc), nil
}

func (r *InventoryRepo) Update(ctx context.Context, id string, updates map[string]interface{}) (*domain.InventoryItem, error) {
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

func (r *InventoryRepo) Delete(ctx context.Context, id string) error {
	oid, _ := primitive.ObjectIDFromHex(id)
	_, err := r.col.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

func fromBSON(d bson.M) *domain.InventoryItem {
	item := &domain.InventoryItem{
		Name:          strVal(d, "name"),
		ItemCode:      strVal(d, "itemCode"),
		Category:      strVal(d, "category"),
		Subcategory:   strVal(d, "subcategory"),
		UnitType:      strVal(d, "unitType"),
		StockCount:    intVal(d, "stockCount"),
		MinStockLevel: intVal(d, "minStockLevel"),
		Condition:     strVal(d, "condition"),
		Supplier:      strVal(d, "supplier"),
		PurchaseDate:  strVal(d, "purchaseDate"),
		Description:   strVal(d, "description"),
	}
	if oid, ok := d["_id"].(primitive.ObjectID); ok {
		item.ID = oid.Hex()
	}
	if oid, ok := d["schoolId"].(primitive.ObjectID); ok {
		item.SchoolID = oid.Hex()
	}
	if ts, ok := d["createdAt"].(primitive.DateTime); ok {
		item.CreatedAt = ts.Time()
	}
	return item
}

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
