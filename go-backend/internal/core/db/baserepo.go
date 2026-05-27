package db

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// MongoBaseRepo provides a reusable MongoDB implementation for any
// collection that stores documents as bson.M and maps them to a
// domain type T via the supplied marshal/unmarshal funcs.
//
// Usage: embed MongoBaseRepo[MyDomain] in a concrete repo struct and
// supply ToDoc (domain→bson.M) and FromDoc (bson.M→domain) funcs.
type MongoBaseRepo[T any] struct {
	Col     *mongo.Collection
	ToDoc   func(*T) bson.M
	FromDoc func(bson.M) (*T, error)
}

func (r *MongoBaseRepo[T]) ctx() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 10*time.Second)
}

func (r *MongoBaseRepo[T]) FindByID(ctx context.Context, id string) (*T, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	var doc bson.M
	err = r.Col.FindOne(ctx, bson.M{"_id": oid}).Decode(&doc)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return r.FromDoc(doc)
}

func (r *MongoBaseRepo[T]) FindOne(ctx context.Context, filter Filter) (*T, error) {
	var doc bson.M
	err := r.Col.FindOne(ctx, toBSONFilter(filter)).Decode(&doc)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return r.FromDoc(doc)
}

func (r *MongoBaseRepo[T]) Find(ctx context.Context, filter Filter, opts *QueryOpts) ([]*T, error) {
	findOpts := options.Find()
	if opts != nil {
		if opts.Limit > 0 {
			findOpts.SetLimit(opts.Limit)
		}
		if opts.Skip > 0 {
			findOpts.SetSkip(opts.Skip)
		}
		if len(opts.Sort) > 0 {
			sortDoc := bson.D{}
			for k, v := range opts.Sort {
				sortDoc = append(sortDoc, bson.E{Key: k, Value: v})
			}
			findOpts.SetSort(sortDoc)
		}
	}

	cur, err := r.Col.Find(ctx, toBSONFilter(filter), findOpts)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)

	var results []*T
	for cur.Next(ctx) {
		var doc bson.M
		if err := cur.Decode(&doc); err != nil {
			continue
		}
		t, err := r.FromDoc(doc)
		if err != nil {
			continue
		}
		results = append(results, t)
	}
	return results, cur.Err()
}

func (r *MongoBaseRepo[T]) Create(ctx context.Context, entity *T) (*T, error) {
	doc := r.ToDoc(entity)
	if _, exists := doc["_id"]; !exists {
		doc["_id"] = primitive.NewObjectID()
	}
	now := time.Now()
	doc["createdAt"] = now
	doc["updatedAt"] = now

	_, err := r.Col.InsertOne(ctx, doc)
	if err != nil {
		return nil, err
	}
	return r.FromDoc(doc)
}

func (r *MongoBaseRepo[T]) UpdateByID(ctx context.Context, id string, updates Filter) (*T, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}
	updates["updatedAt"] = time.Now()
	result := r.Col.FindOneAndUpdate(
		ctx,
		bson.M{"_id": oid},
		bson.M{"$set": toBSONFilter(updates)},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	)
	var doc bson.M
	if err := result.Decode(&doc); err != nil {
		return nil, err
	}
	return r.FromDoc(doc)
}

func (r *MongoBaseRepo[T]) Delete(ctx context.Context, id string) error {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.Col.DeleteOne(ctx, bson.M{"_id": oid})
	return err
}

func (r *MongoBaseRepo[T]) Count(ctx context.Context, filter Filter) (int64, error) {
	return r.Col.CountDocuments(ctx, toBSONFilter(filter))
}

// toBSONFilter converts a Filter (map[string]interface{}) to bson.M.
// ObjectID strings in filter values are auto-converted.
func toBSONFilter(f Filter) bson.M {
	if f == nil {
		return bson.M{}
	}
	m := bson.M{}
	for k, v := range f {
		m[k] = v
	}
	return m
}
