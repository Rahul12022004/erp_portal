package db

import "context"

// Filter is a generic query condition map.
// Keys are field names; values are match conditions.
type Filter map[string]interface{}

// SortMap specifies sort order: 1 = ascending, -1 = descending.
type SortMap map[string]int

// QueryOpts carries pagination and sort parameters.
type QueryOpts struct {
	Sort  SortMap
	Skip  int64
	Limit int64
}

// Repository[T] defines a database-agnostic CRUD contract.
// T is the domain type (not the persistence/BSON type).
// Implementations live in each module's repositories/ package.
// This interface must remain free of MongoDB/SQL imports so that
// swapping the backing store requires only a new implementation.
type Repository[T any] interface {
	FindByID(ctx context.Context, id string) (*T, error)
	FindOne(ctx context.Context, filter Filter) (*T, error)
	Find(ctx context.Context, filter Filter, opts *QueryOpts) ([]*T, error)
	Create(ctx context.Context, entity *T) (*T, error)
	UpdateByID(ctx context.Context, id string, updates Filter) (*T, error)
	Delete(ctx context.Context, id string) error
	Count(ctx context.Context, filter Filter) (int64, error)
}
