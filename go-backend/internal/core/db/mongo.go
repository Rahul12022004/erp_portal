package db

import (
	"context"
	"net/url"
	"sync"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/erp-portal/go-backend/internal/core/logger"
)

var (
	Client   *mongo.Client
	Database *mongo.Database
	mu       sync.RWMutex
)

const (
	connectTimeout = 10 * time.Second
	pingTimeout    = 8 * time.Second
	retryAttempts  = 3
	retryDelay     = 1 * time.Second
)

// Connect opens a MongoDB connection with retry logic for Atlas.
func Connect(uri, dbName string) error {
	var lastErr error
	for attempt := 1; attempt <= retryAttempts; attempt++ {
		client, db, err := connect(uri, dbName)
		if err != nil {
			lastErr = err
			logger.Warn().
				Int("attempt", attempt).
				Int("max", retryAttempts).
				Err(err).
				Msg("MongoDB connect failed")
			if attempt < retryAttempts {
				time.Sleep(retryDelay)
			}
			continue
		}
		// Assign globals only after successful connection
		mu.Lock()
		Client = client
		Database = db
		mu.Unlock()
		return nil
	}
	return lastErr
}

func connect(uri, dbName string) (*mongo.Client, *mongo.Database, error) {
	ctx, cancel := context.WithTimeout(context.Background(), connectTimeout)
	defer cancel()

	opts := options.Client().
		ApplyURI(uri).
		SetServerSelectionTimeout(connectTimeout).
		SetConnectTimeout(connectTimeout).
		SetMaxPoolSize(20).
		SetMinPoolSize(0)

	client, err := mongo.Connect(ctx, opts)
	if err != nil {
		return nil, nil, err
	}

	pingCtx, pingCancel := context.WithTimeout(context.Background(), pingTimeout)
	defer pingCancel()
	if err = client.Ping(pingCtx, nil); err != nil {
		// Use a short timeout for disconnect on failure to avoid blocking the retry loop
		discCtx, discCancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer discCancel()
		_ = client.Disconnect(discCtx)
		return nil, nil, err
	}

	db := client.Database(dbName)
	logger.Info().
		Str("db", dbName).
		Str("uri", maskURI(uri)).
		Msg("MongoDB connected")
	return client, db, nil
}

// Disconnect closes the MongoDB connection gracefully.
func Disconnect() {
	mu.RLock()
	c := Client
	mu.RUnlock()
	if c == nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = c.Disconnect(ctx)
	logger.Info().Msg("MongoDB disconnected")
}

// Col returns a collection handle by name.
func Col(name string) *mongo.Collection {
	mu.RLock()
	defer mu.RUnlock()
	return Database.Collection(name)
}

// maskURI replaces the password in a MongoDB URI with *** for safe logging.
func maskURI(uri string) string {
	u, err := url.Parse(uri)
	if err != nil {
		return "[unparseable URI]"
	}
	if u.User != nil {
		u.User = url.UserPassword(u.User.Username(), "***")
	}
	return u.String()
}
