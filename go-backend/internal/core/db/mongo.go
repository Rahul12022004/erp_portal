package db

import (
	"context"
	"net/url"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/erp-portal/go-backend/internal/core/logger"
)

var Client *mongo.Client
var Database *mongo.Database

const (
	connectTimeout = 30 * time.Second
	pingTimeout    = 15 * time.Second
	retryAttempts  = 3
	retryDelay     = 3 * time.Second
)

// Connect opens a MongoDB connection with retry logic for Atlas.
func Connect(uri, dbName string) error {
	var lastErr error
	for attempt := 1; attempt <= retryAttempts; attempt++ {
		if err := connect(uri, dbName); err != nil {
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
		return nil
	}
	return lastErr
}

func connect(uri, dbName string) error {
	ctx, cancel := context.WithTimeout(context.Background(), connectTimeout)
	defer cancel()

	opts := options.Client().
		ApplyURI(uri).
		SetServerSelectionTimeout(connectTimeout).
		SetConnectTimeout(connectTimeout).
		SetMaxPoolSize(20).
		SetMinPoolSize(2)

	client, err := mongo.Connect(ctx, opts)
	if err != nil {
		return err
	}

	pingCtx, pingCancel := context.WithTimeout(context.Background(), pingTimeout)
	defer pingCancel()
	if err = client.Ping(pingCtx, nil); err != nil {
		_ = client.Disconnect(context.Background())
		return err
	}

	Client = client
	Database = client.Database(dbName)
	logger.Info().
		Str("db", dbName).
		Str("uri", maskURI(uri)).
		Msg("MongoDB connected")
	return nil
}

// Disconnect closes the MongoDB connection gracefully.
func Disconnect() {
	if Client == nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = Client.Disconnect(ctx)
	logger.Info().Msg("MongoDB disconnected")
}

// Col returns a collection handle by name.
func Col(name string) *mongo.Collection {
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
